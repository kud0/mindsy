/**
 * Test: Pomodoro Timer Settings Update Bug
 *
 * Issue: Timer doesn't update when settings change while idle
 *
 * Expected: When timer is idle and user changes focus duration from 25→30,
 *           timer should immediately show 30:00
 *
 * Actual: Timer still shows 25:00
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { PomodoroProvider, usePomodoro } from '@/lib/contexts/PomodoroContext';

// Mock Supabase
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(() => Promise.resolve({
        data: { user: { id: 'test-user' } }
      }))
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({
            data: {
              user_id: 'test-user',
              focus_duration: 25,
              short_break_duration: 5,
              long_break_duration: 15,
              auto_start_breaks: false,
              auto_start_focus: false,
              sound_enabled: true,
              daily_goal: 8,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            },
            error: null
          }))
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null }))
    })),
    channel: vi.fn(() => ({
      on: vi.fn(function(this: any) { return this; }),
      subscribe: vi.fn(() => Promise.resolve())
    }))
  }
}));

// Mock NotificationContext
vi.mock('@/lib/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    addNotification: vi.fn()
  })
}));

describe('Pomodoro Settings Update Bug', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should update timeRemaining immediately when settings change while idle', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PomodoroProvider>{children}</PomodoroProvider>
    );

    const { result } = renderHook(() => usePomodoro(), { wrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(25);
    });

    // Verify initial state: Timer is IDLE (not running, not started)
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.currentSessionStartTime).toBe(null);
    expect(result.current.state.timeRemaining).toBe(25 * 60); // 1500 seconds

    // Change settings: 25 → 30 minutes
    act(() => {
      result.current.updateSettings({ focus_duration: 30 });
    });

    // BUG: Timer should IMMEDIATELY show 30:00 (1800 seconds)
    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(30);
      expect(result.current.state.timeRemaining).toBe(30 * 60); // Should be 1800 seconds
    });
  });

  it('should NOT update timeRemaining when timer is running', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PomodoroProvider>{children}</PomodoroProvider>
    );

    const { result } = renderHook(() => usePomodoro(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(25);
    });

    // Start the timer
    act(() => {
      result.current.startTimer();
    });

    expect(result.current.state.isRunning).toBe(true);
    const runningTime = result.current.state.timeRemaining;

    // Change settings while running
    act(() => {
      result.current.updateSettings({ focus_duration: 30 });
    });

    // Timer should NOT update (preserve running session)
    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(30);
      expect(result.current.state.timeRemaining).toBe(runningTime); // Should stay the same
    });
  });

  it('should NOT update timeRemaining when timer is paused mid-session', async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PomodoroProvider>{children}</PomodoroProvider>
    );

    const { result } = renderHook(() => usePomodoro(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(25);
    });

    // Start and then pause the timer
    act(() => {
      result.current.startTimer();
    });

    act(() => {
      result.current.pauseTimer();
    });

    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.currentSessionStartTime).not.toBe(null); // Session started
    const pausedTime = result.current.state.timeRemaining;

    // Change settings while paused
    act(() => {
      result.current.updateSettings({ focus_duration: 30 });
    });

    // Timer should NOT update (preserve paused session)
    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(30);
      expect(result.current.state.timeRemaining).toBe(pausedTime); // Should stay the same
    });
  });

  it('should log to console when auto-applying settings', async () => {
    const consoleSpy = vi.spyOn(console, 'log');

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <PomodoroProvider>{children}</PomodoroProvider>
    );

    const { result } = renderHook(() => usePomodoro(), { wrapper });

    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(25);
    });

    // Change settings while idle
    act(() => {
      result.current.updateSettings({ focus_duration: 30 });
    });

    // Verify console log fired (from line 597-602)
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Settings changed while idle - auto-applying'),
        expect.any(Object)
      );
    });

    consoleSpy.mockRestore();
  });
});
