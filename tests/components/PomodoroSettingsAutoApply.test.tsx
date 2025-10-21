/**
 * Test: Pomodoro Settings Auto-Apply
 *
 * Verifies that when user changes settings while timer is IDLE,
 * the timer display immediately reflects the new duration without needing manual reset.
 *
 * Bug Description:
 * - User changes focus time 25 → 30 minutes in Settings tab
 * - User switches to Timer tab
 * - Timer still shows 25:00 instead of 30:00
 * - User must click "Reset" to see 30:00
 *
 * Expected: Timer should show 30:00 immediately after settings change
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { PomodoroProvider, usePomodoro } from '@/lib/contexts/PomodoroContext';
import React from 'react';

// Mock Supabase
jest.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null
      })
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: null, // No existing settings
            error: { code: 'PGRST116' } // Not found
          })
        })),
        gte: jest.fn(() => ({
          order: jest.fn().mockResolvedValue({ data: [], error: null })
        }))
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({
            data: {
              user_id: 'test-user-id',
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
          })
        }))
      })),
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn().mockResolvedValue({
            data: [{
              user_id: 'test-user-id',
              focus_duration: 30,
              short_break_duration: 5,
              long_break_duration: 15,
              auto_start_breaks: false,
              auto_start_focus: false,
              sound_enabled: true,
              daily_goal: 8,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }],
            error: null
          })
        }))
      }))
    })),
    channel: jest.fn(() => ({
      on: jest.fn(() => ({
        subscribe: jest.fn()
      }))
    }))
  }
}));

// Mock NotificationContext
jest.mock('@/lib/contexts/NotificationContext', () => ({
  useNotifications: () => ({
    addNotification: jest.fn()
  })
}));

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}));

describe('Pomodoro Settings Auto-Apply', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    jest.clearAllMocks();
  });

  it('should automatically update timer when settings change while IDLE', async () => {
    // Render the hook
    const { result } = renderHook(() => usePomodoro(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PomodoroProvider>{children}</PomodoroProvider>
      )
    });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.state.settings).toBeDefined();
    });

    // Initial state: Timer is IDLE at 25 minutes
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.currentSessionStartTime).toBe(null);
    expect(result.current.state.timeRemaining).toBe(25 * 60); // 1500 seconds
    expect(result.current.state.settings.focus_duration).toBe(25);

    // User changes settings: 25 → 30 minutes
    await act(async () => {
      await result.current.updateSettings({ focus_duration: 30 });
    });

    // Wait for state to update
    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(30);
    });

    // BUG CHECK: Timer should now show 30 minutes WITHOUT needing manual reset
    expect(result.current.state.timeRemaining).toBe(30 * 60); // 1800 seconds
    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.currentSessionStartTime).toBe(null);
  });

  it('should NOT auto-apply when timer is running', async () => {
    const { result } = renderHook(() => usePomodoro(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PomodoroProvider>{children}</PomodoroProvider>
      )
    });

    await waitFor(() => {
      expect(result.current.state.settings).toBeDefined();
    });

    // Start the timer
    act(() => {
      result.current.startTimer();
    });

    expect(result.current.state.isRunning).toBe(true);
    const timeBeforeUpdate = result.current.state.timeRemaining;

    // Change settings while timer is running
    await act(async () => {
      await result.current.updateSettings({ focus_duration: 30 });
    });

    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(30);
    });

    // Time should NOT change because timer is running
    expect(result.current.state.timeRemaining).toBe(timeBeforeUpdate);
  });

  it('should NOT auto-apply when timer is paused mid-session', async () => {
    const { result } = renderHook(() => usePomodoro(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PomodoroProvider>{children}</PomodoroProvider>
      )
    });

    await waitFor(() => {
      expect(result.current.state.settings).toBeDefined();
    });

    // Start timer
    act(() => {
      result.current.startTimer();
    });

    // Pause timer (mid-session)
    act(() => {
      result.current.pauseTimer();
    });

    expect(result.current.state.isRunning).toBe(false);
    expect(result.current.state.currentSessionStartTime).not.toBe(null); // Still has session start time
    const timeBeforeUpdate = result.current.state.timeRemaining;

    // Change settings while paused
    await act(async () => {
      await result.current.updateSettings({ focus_duration: 30 });
    });

    await waitFor(() => {
      expect(result.current.state.settings.focus_duration).toBe(30);
    });

    // Time should NOT change because timer is paused mid-session
    expect(result.current.state.timeRemaining).toBe(timeBeforeUpdate);
  });

  it('should detect IDLE state correctly', async () => {
    const { result } = renderHook(() => usePomodoro(), {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <PomodoroProvider>{children}</PomodoroProvider>
      )
    });

    await waitFor(() => {
      expect(result.current.state.settings).toBeDefined();
    });

    // Test 1: Fresh timer (IDLE)
    const isIdleFresh = !result.current.state.isRunning && !result.current.state.currentSessionStartTime;
    expect(isIdleFresh).toBe(true);

    // Test 2: After reset (IDLE)
    act(() => {
      result.current.resetTimer();
    });
    const isIdleAfterReset = !result.current.state.isRunning && !result.current.state.currentSessionStartTime;
    expect(isIdleAfterReset).toBe(true);

    // Test 3: While running (NOT IDLE)
    act(() => {
      result.current.startTimer();
    });
    const isIdleWhileRunning = !result.current.state.isRunning && !result.current.state.currentSessionStartTime;
    expect(isIdleWhileRunning).toBe(false);

    // Test 4: Paused mid-session (NOT IDLE)
    act(() => {
      result.current.pauseTimer();
    });
    const isIdleWhilePaused = !result.current.state.isRunning && !result.current.state.currentSessionStartTime;
    expect(isIdleWhilePaused).toBe(false); // currentSessionStartTime persists
  });
});
