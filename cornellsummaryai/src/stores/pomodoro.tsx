import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    supabase: SupabaseClient;
  }
}

export type SessionType = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  dailyGoal: number;
}

export interface PomodoroSession {
  id?: string;
  user_id: string;
  type: SessionType;
  started_at: string;
  completed_at?: string;
  duration: number;
  note?: string;
  was_completed: boolean;
}

export interface PomodoroState {
  isRunning: boolean;
  timeRemaining: number;
  sessionType: SessionType;
  sessionsCompleted: number;
  totalSessions: number;
  currentSessionStartTime: Date | null;
  settings: PomodoroSettings;
  todaySessions: PomodoroSession[];
  weeklyStats: {
    totalMinutes: number;
    totalSessions: number;
    completionRate: number;
    averageSessionLength: number;
  };
}

const DEFAULT_SETTINGS: PomodoroSettings = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  autoStartBreaks: false,
  autoStartFocus: false,
  soundEnabled: true,
  dailyGoal: 8
};

interface PomodoroContextType {
  state: PomodoroState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  updateSettings: (settings: Partial<PomodoroSettings>) => void;
  loadTodaySessions: () => Promise<void>;
  saveCurrentSession: (note?: string) => Promise<void>;
}

export const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PomodoroState>({
    isRunning: false,
    timeRemaining: DEFAULT_SETTINGS.focusDuration * 60,
    sessionType: 'focus',
    sessionsCompleted: 0,
    totalSessions: 0,
    currentSessionStartTime: null,
    settings: DEFAULT_SETTINGS,
    todaySessions: [],
    weeklyStats: {
      totalMinutes: 0,
      totalSessions: 0,
      completionRate: 0,
      averageSessionLength: 0
    }
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load user settings from database
  useEffect(() => {
    if (typeof window !== 'undefined') {
      loadUserSettings();
      loadTodaySessions();
      loadWeeklyStats();
    }
  }, []);

  // Timer logic
  useEffect(() => {
    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          if (prev.timeRemaining <= 1) {
            handleSessionComplete();
            return {
              ...prev,
              timeRemaining: 0,
              isRunning: false
            };
          }
          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [state.isRunning]);

  const loadUserSettings = async () => {
    try {
      if (typeof window === 'undefined' || !window.supabase) return; // Skip on server-side
      const { data: session } = await window.supabase.auth.getSession();
      if (!session?.session?.user) return;

      const { data, error } = await window.supabase
        .from('pomodoro_settings')
        .select('*')
        .eq('user_id', session.session.user.id)
        .single();

      if (data && !error) {
        setState(prev => ({
          ...prev,
          settings: {
            focusDuration: data.focus_duration,
            shortBreakDuration: data.short_break_duration,
            longBreakDuration: data.long_break_duration,
            autoStartBreaks: data.auto_start_breaks,
            autoStartFocus: data.auto_start_focus,
            soundEnabled: data.sound_enabled,
            dailyGoal: data.daily_goal
          }
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadTodaySessions = async () => {
    try {
      if (typeof window === 'undefined' || !window.supabase) return; // Skip on server-side
      const { data: session } = await window.supabase.auth.getSession();
      if (!session?.session?.user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await window.supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', session.session.user.id)
        .gte('started_at', today.toISOString())
        .order('started_at', { ascending: false });

      if (data && !error) {
        setState(prev => ({
          ...prev,
          todaySessions: data,
          totalSessions: data.length,
          sessionsCompleted: data.filter(s => s.was_completed).length
        }));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const loadWeeklyStats = async () => {
    try {
      if (typeof window === 'undefined' || !window.supabase) return; // Skip on server-side
      const { data: session } = await window.supabase.auth.getSession();
      if (!session?.session?.user) return;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await window.supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', session.session.user.id)
        .gte('started_at', weekAgo.toISOString());

      if (data && !error) {
        const totalMinutes = data.reduce((acc, s) => acc + s.duration, 0);
        const completedSessions = data.filter(s => s.was_completed);
        
        setState(prev => ({
          ...prev,
          weeklyStats: {
            totalMinutes,
            totalSessions: data.length,
            completionRate: data.length > 0 ? (completedSessions.length / data.length) * 100 : 0,
            averageSessionLength: data.length > 0 ? totalMinutes / data.length : 0
          }
        }));
      }
    } catch (error) {
      console.error('Error loading weekly stats:', error);
    }
  };

  const handleSessionComplete = async () => {
    // Play sound if enabled
    if (state.settings.soundEnabled && audioRef.current) {
      audioRef.current.play();
    }

    // Save session to database
    await saveCurrentSession();

    // Auto-start next session if enabled
    setState(prev => {
      let nextType: SessionType = 'focus';
      let nextDuration = prev.settings.focusDuration;

      if (prev.sessionType === 'focus') {
        // After 4 focus sessions, take a long break
        if ((prev.sessionsCompleted + 1) % 4 === 0) {
          nextType = 'longBreak';
          nextDuration = prev.settings.longBreakDuration;
        } else {
          nextType = 'shortBreak';
          nextDuration = prev.settings.shortBreakDuration;
        }
      } else {
        nextType = 'focus';
        nextDuration = prev.settings.focusDuration;
      }

      const shouldAutoStart = 
        (nextType === 'focus' && prev.settings.autoStartFocus) ||
        (nextType !== 'focus' && prev.settings.autoStartBreaks);

      return {
        ...prev,
        sessionType: nextType,
        timeRemaining: nextDuration * 60,
        isRunning: shouldAutoStart,
        sessionsCompleted: prev.sessionType === 'focus' ? prev.sessionsCompleted + 1 : prev.sessionsCompleted,
        currentSessionStartTime: shouldAutoStart ? new Date() : null
      };
    });
  };

  const saveCurrentSession = async (note?: string) => {
    try {
      if (typeof window === 'undefined' || !window.supabase) return; // Skip on server-side
      const { data: session } = await window.supabase.auth.getSession();
      if (!session?.session?.user || !state.currentSessionStartTime) return;

      const duration = Math.floor((Date.now() - state.currentSessionStartTime.getTime()) / 1000 / 60);

      const { error } = await window.supabase
        .from('pomodoro_sessions')
        .insert({
          user_id: session.session.user.id,
          type: state.sessionType,
          started_at: state.currentSessionStartTime.toISOString(),
          completed_at: new Date().toISOString(),
          duration,
          note,
          was_completed: state.timeRemaining === 0
        });

      if (error) {
        console.error('Error saving session:', error);
      } else {
        await loadTodaySessions();
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const startTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: true,
      currentSessionStartTime: new Date()
    }));
  }, []);

  const pauseTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false
    }));
  }, []);

  const resetTimer = useCallback(() => {
    setState(prev => ({
      ...prev,
      isRunning: false,
      timeRemaining: prev.settings.focusDuration * 60,
      sessionType: 'focus',
      currentSessionStartTime: null
    }));
  }, []);

  const skipSession = useCallback(() => {
    handleSessionComplete();
  }, [state.sessionType, state.sessionsCompleted]);

  const updateSettings = useCallback(async (newSettings: Partial<PomodoroSettings>) => {
    try {
      if (typeof window === 'undefined' || !window.supabase) return; // Skip on server-side
      const { data: session } = await window.supabase.auth.getSession();
      if (!session?.session?.user) return;

      const updatedSettings = { ...state.settings, ...newSettings };

      // Save to database
      const { error } = await window.supabase
        .from('pomodoro_settings')
        .upsert({
          user_id: session.session.user.id,
          focus_duration: updatedSettings.focusDuration,
          short_break_duration: updatedSettings.shortBreakDuration,
          long_break_duration: updatedSettings.longBreakDuration,
          auto_start_breaks: updatedSettings.autoStartBreaks,
          auto_start_focus: updatedSettings.autoStartFocus,
          sound_enabled: updatedSettings.soundEnabled,
          daily_goal: updatedSettings.dailyGoal,
          updated_at: new Date().toISOString()
        });

      if (!error) {
        setState(prev => ({
          ...prev,
          settings: updatedSettings
        }));
      }
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  }, [state.settings]);

  return (
    <PomodoroContext.Provider value={{
      state,
      startTimer,
      pauseTimer,
      resetTimer,
      skipSession,
      updateSettings,
      loadTodaySessions,
      saveCurrentSession
    }}>
      {children}
      <audio 
        ref={audioRef} 
        src="/notification.mp3" 
        preload="auto"
        style={{ display: 'none' }}
      />
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const context = useContext(PomodoroContext);
  if (context === undefined) {
    throw new Error('usePomodoro must be used within a PomodoroProvider');
  }
  return context;
}