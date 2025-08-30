"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { useNotifications } from './NotificationContext';
import type { SessionType, PomodoroSettings, PomodoroSession } from '@/types/database';

export interface PomodoroState {
  isRunning: boolean;
  timeRemaining: number;
  sessionType: SessionType;
  sessionsCompleted: number;
  totalSessions: number;
  currentSessionStartTime: Date | null;
  settings: PomodoroSettings;
  todaySessions: PomodoroSession[];
  currentLectureId: string | null; // Track active lecture for study time
  currentLectureStudyStart: Date | null; // Track when we started studying current lecture
  currentSessionNote: string;
  weeklyStats: {
    totalMinutes: number;
    totalSessions: number;
    completionRate: number;
    averageSessionLength: number;
  };
}

const DEFAULT_SETTINGS: Omit<PomodoroSettings, 'user_id' | 'created_at' | 'updated_at'> = {
  focus_duration: 25,
  short_break_duration: 5,
  long_break_duration: 15,
  auto_start_breaks: false,
  auto_start_focus: false,
  sound_enabled: true,
  daily_goal: 8
};

interface PomodoroContextType {
  state: PomodoroState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipSession: () => void;
  updateSettings: (settings: Partial<Omit<PomodoroSettings, 'user_id' | 'created_at' | 'updated_at'>>) => void;
  updateSessionNote: (note: string) => void;
  setCurrentLecture: (lectureId: string | null) => void; // NEW: Set active lecture
  loadTodaySessions: () => Promise<void>;
  saveCurrentSession: (note?: string) => Promise<void>;
  // Legacy aliases for backwards compatibility
  timeLeft: number;
  isRunning: boolean;
  isBreak: boolean;
  sessionCount: number;
  toggleTimer: () => void;
  settings?: any;
}

export const PomodoroContext = createContext<PomodoroContextType | undefined>(undefined);

export function PomodoroProvider({ children }: { children: React.ReactNode }) {
  const { addNotification } = useNotifications();
  const [state, setState] = useState<PomodoroState>({
    isRunning: false,
    timeRemaining: DEFAULT_SETTINGS.focus_duration * 60,
    sessionType: 'focus',
    sessionsCompleted: 0,
    totalSessions: 0,
    currentSessionStartTime: null,
    currentLectureId: null,
    currentLectureStudyStart: null,
    currentSessionNote: '',
    settings: {
      ...DEFAULT_SETTINGS,
      user_id: '',
      created_at: '',
      updated_at: ''
    },
    todaySessions: [],
    weeklyStats: {
      totalMinutes: 0,
      totalSessions: 0,
      completionRate: 0,
      averageSessionLength: 0
    }
  });

  // Track current lecture study time

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load user settings and data on mount
  useEffect(() => {
    loadUserSettings();
    loadTodaySessions();
    loadWeeklyStats();
    setupRealtimeSubscriptions();
    restoreTimerState();
  }, []);

  // Set up real-time subscriptions for cross-tab synchronization
  const setupRealtimeSubscriptions = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Subscribe to pomodoro_sessions changes
    const sessionsSubscription = supabase
      .channel('pomodoro-sessions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pomodoro_sessions',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Reload sessions when changes occur
          loadTodaySessions();
          loadWeeklyStats();
        }
      )
      .subscribe();

    // Subscribe to settings changes
    const settingsSubscription = supabase
      .channel('pomodoro-settings')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pomodoro_settings',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUserSettings();
        }
      )
      .subscribe();

    // Cross-tab timer synchronization disabled to prevent timing conflicts
    // const handleStorageChange = (e: StorageEvent) => {
    //   if (e.key === 'pomodoro-timer-sync') {
    //     const data = JSON.parse(e.newValue || '{}');
    //     if (data.userId === user.id) {
    //       setState(prev => ({
    //         ...prev,
    //         isRunning: data.isRunning,
    //         timeRemaining: data.timeRemaining,
    //         sessionType: data.sessionType,
    //         currentSessionStartTime: data.currentSessionStartTime ? new Date(data.currentSessionStartTime) : null,
    //         currentSessionNote: data.currentSessionNote
    //       }));
    //     }
    //   }
    // };

    // window.addEventListener('storage', handleStorageChange);

    // Cleanup function
    return () => {
      sessionsSubscription.unsubscribe();
      settingsSubscription.unsubscribe();
      // window.removeEventListener('storage', handleStorageChange);
    };
  };

  // Save timer state to localStorage (single-tab persistence)
  useEffect(() => {
    const timerState = {
      isRunning: state.isRunning,
      timeRemaining: state.timeRemaining,
      sessionType: state.sessionType,
      currentSessionStartTime: state.currentSessionStartTime?.toISOString(),
      currentSessionNote: state.currentSessionNote,
      sessionsCompleted: state.sessionsCompleted,
      currentLectureId: state.currentLectureId,
      currentLectureStudyStart: state.currentLectureStudyStart?.toISOString()
    };
    localStorage.setItem('pomodoro-timer-state', JSON.stringify(timerState));
  }, [state.isRunning, state.timeRemaining, state.sessionType, state.currentSessionStartTime, state.currentSessionNote, state.sessionsCompleted, state.currentLectureId, state.currentLectureStudyStart]);

  // Timer logic
  useEffect(() => {
    // Clear any existing interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

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
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [state.isRunning]);

  const loadUserSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('pomodoro_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (data && !error) {
        setState(prev => ({
          ...prev,
          settings: data
        }));
      } else {
        // Create default settings for new user
        const defaultSettings = {
          ...DEFAULT_SETTINGS,
          user_id: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        await supabase.from('pomodoro_settings').insert(defaultSettings);
        setState(prev => ({
          ...prev,
          settings: defaultSettings
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadTodaySessions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('started_at', today.toISOString())
        .order('started_at', { ascending: false });

      if (data && !error) {
        setState(prev => ({
          ...prev,
          todaySessions: data,
          totalSessions: data.length,
          sessionsCompleted: data.filter(s => s.was_completed && s.type === 'focus').length
        }));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const restoreTimerState = () => {
    try {
      const saved = localStorage.getItem('pomodoro-timer-state');
      if (!saved) return;

      const timerState = JSON.parse(saved);
      
      setState(prev => ({
        ...prev,
        isRunning: false, // Never auto-start on restore for safety
        timeRemaining: timerState.timeRemaining || prev.settings.focus_duration * 60,
        sessionType: timerState.sessionType || 'focus',
        currentSessionStartTime: timerState.currentSessionStartTime ? new Date(timerState.currentSessionStartTime) : null,
        currentSessionNote: timerState.currentSessionNote || '',
        sessionsCompleted: timerState.sessionsCompleted || 0,
        currentLectureId: timerState.currentLectureId || null,
        currentLectureStudyStart: timerState.currentLectureStudyStart ? new Date(timerState.currentLectureStudyStart) : null
      }));
    } catch (error) {
      console.error('Error restoring timer state:', error);
      // Clear corrupted data
      localStorage.removeItem('pomodoro-timer-state');
    }
  };

  const loadWeeklyStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', user.id)
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
    const now = new Date();

    // Save current lecture study time before completing session
    if (state.sessionType === 'focus' && state.currentLectureId && state.currentLectureStudyStart) {
      const studyTimeMinutes = Math.floor((now.getTime() - state.currentLectureStudyStart.getTime()) / 1000 / 60);
      
      if (studyTimeMinutes > 0) {
        console.log(`📚 Session complete - saving ${studyTimeMinutes}m study time for lecture:`, state.currentLectureId);
        await saveLectureStudyTime(state.currentLectureId, studyTimeMinutes, state.currentLectureStudyStart, now);
      }
    }

    // Play sound if enabled
    if (state.settings.sound_enabled && audioRef.current) {
      audioRef.current.play().catch(() => {
        // Ignore audio errors (user might not have interacted with page)
      });
    }

    // Save session to database
    await saveCurrentSession(state.currentSessionNote);

    // Auto-start next session if enabled
    setState(prev => {
      let nextType: SessionType = 'focus';
      let nextDuration = prev.settings.focus_duration;

      if (prev.sessionType === 'focus') {
        // After 4 focus sessions, take a long break
        if ((prev.sessionsCompleted + 1) % 4 === 0) {
          nextType = 'longBreak';
          nextDuration = prev.settings.long_break_duration;
        } else {
          nextType = 'shortBreak';
          nextDuration = prev.settings.short_break_duration;
        }
      } else {
        nextType = 'focus';
        nextDuration = prev.settings.focus_duration;
      }

      const shouldAutoStart = 
        (nextType === 'focus' && prev.settings.auto_start_focus) ||
        (nextType !== 'focus' && prev.settings.auto_start_breaks);

      return {
        ...prev,
        sessionType: nextType,
        timeRemaining: nextDuration * 60,
        isRunning: shouldAutoStart,
        sessionsCompleted: prev.sessionType === 'focus' ? prev.sessionsCompleted + 1 : prev.sessionsCompleted,
        currentSessionStartTime: shouldAutoStart ? new Date() : null,
        currentSessionNote: ''
      };
    });

    // Reset lecture study tracking - will restart when next focus session begins
    setState(prev => ({
      ...prev,
      currentLectureStudyStart: null
    }));

    const sessionTypeText = state.sessionType === 'focus' ? 'Focus' : 'Break';
    const message = `${sessionTypeText} session completed!`;
    
    toast.success(message);
    addNotification({
      type: 'success',
      title: `${sessionTypeText} Complete!`,
      message: state.currentSessionNote ? `Your notes: "${state.currentSessionNote}"` : 'Well done on completing your session!',
      icon: state.sessionType === 'focus' ? '🎯' : '☕'
    });
  };

  // Save individual lecture study time (called when switching lectures or stopping timer)
  const saveLectureStudyTime = async (lectureId: string, durationMinutes: number, startTime: Date, endTime: Date) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('pomodoro_sessions')
        .insert({
          user_id: user.id,
          type: 'focus',
          started_at: startTime.toISOString(),
          completed_at: endTime.toISOString(),
          duration: durationMinutes,
          note: `Study time for lecture (auto-tracked)`,
          was_completed: true, // Individual study segments are always "completed"
          lecture_id: lectureId,
          created_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error saving lecture study time:', error);
      } else {
        console.log(`✅ Saved ${durationMinutes}m study time for lecture ${lectureId}`);
        await loadTodaySessions(); // Refresh sessions to update UI
      }
    } catch (error) {
      console.error('Error saving lecture study time:', error);
    }
  };

  const saveCurrentSession = async (note?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !state.currentSessionStartTime) return;

      const duration = Math.floor((Date.now() - state.currentSessionStartTime.getTime()) / 1000 / 60);

      // Save the overall Pomodoro session
      const { error } = await supabase
        .from('pomodoro_sessions')
        .insert({
          user_id: user.id,
          type: state.sessionType,
          started_at: state.currentSessionStartTime.toISOString(),
          completed_at: new Date().toISOString(),
          duration,
          note,
          was_completed: state.timeRemaining === 0,
          lecture_id: null, // Overall session not tied to specific lecture
          created_at: new Date().toISOString()
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
    const now = new Date();
    setState(prev => {
      const newState = {
        ...prev,
        isRunning: true,
        currentSessionStartTime: prev.currentSessionStartTime || now,
        // Start tracking lecture study time if we have a current lecture and it's a focus session
        currentLectureStudyStart: (prev.sessionType === 'focus' && prev.currentLectureId) ? now : prev.currentLectureStudyStart
      };

      if (newState.sessionType === 'focus' && newState.currentLectureId) {
        console.log('📚 Timer started - beginning lecture study time tracking for:', newState.currentLectureId);
      }

      return newState;
    });
  }, []);

  const pauseTimer = useCallback(async () => {
    const now = new Date();

    setState(prev => {
      // Save current lecture study time if we were tracking
      if (prev.sessionType === 'focus' && prev.currentLectureId && prev.currentLectureStudyStart) {
        const studyTimeMinutes = Math.floor((now.getTime() - prev.currentLectureStudyStart.getTime()) / 1000 / 60);
        
        if (studyTimeMinutes > 0) {
          console.log(`📚 Pausing - saving ${studyTimeMinutes}m study time for lecture:`, prev.currentLectureId);
          saveLectureStudyTime(prev.currentLectureId, studyTimeMinutes, prev.currentLectureStudyStart, now).catch(console.error);
        }
      }

      return {
        ...prev,
        isRunning: false,
        currentLectureStudyStart: null
      };
    });
  }, []);

  const clearPersistedState = () => {
    localStorage.removeItem('pomodoro-timer-state');
  };

  const resetTimer = useCallback(async () => {
    const now = new Date();

    setState(prev => {
      // Save current lecture study time if we were tracking
      if (prev.sessionType === 'focus' && prev.currentLectureId && prev.currentLectureStudyStart) {
        const studyTimeMinutes = Math.floor((now.getTime() - prev.currentLectureStudyStart.getTime()) / 1000 / 60);
        
        if (studyTimeMinutes > 0) {
          console.log(`📚 Resetting - saving ${studyTimeMinutes}m study time for lecture:`, prev.currentLectureId);
          saveLectureStudyTime(prev.currentLectureId, studyTimeMinutes, prev.currentLectureStudyStart, now).catch(console.error);
        }
      }

      return {
        ...prev,
        isRunning: false,
        timeRemaining: prev.settings.focus_duration * 60,
        sessionType: 'focus',
        currentSessionStartTime: null,
        currentSessionNote: '',
        currentLectureStudyStart: null
      };
    });
    
    // Clear persisted state on manual reset
    clearPersistedState();
  }, []);

  const skipSession = useCallback(() => {
    handleSessionComplete();
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<Omit<PomodoroSettings, 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const updatedSettings = { 
        ...state.settings, 
        ...newSettings,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('pomodoro_settings')
        .update(updatedSettings)
        .eq('user_id', user.id);

      if (!error) {
        setState(prev => ({
          ...prev,
          settings: updatedSettings
        }));
        toast.success('Settings updated');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Failed to update settings');
    }
  }, [state.settings]);

  const updateSessionNote = useCallback((note: string) => {
    setState(prev => ({
      ...prev,
      currentSessionNote: note
    }));
  }, []);

  const setCurrentLecture = useCallback((lectureId: string | null) => {
    setState(prev => {
      const previousLectureId = prev.currentLectureId;
      
      // Only update if the lecture actually changed
      if (previousLectureId === lectureId) {
        return prev; // No change needed
      }

      const now = new Date();

      // If timer is running and we had a previous lecture being tracked, save its time
      // This handles both: switching between lectures AND navigating away from a lecture
      if (prev.isRunning && prev.sessionType === 'focus' && previousLectureId) {
        if (prev.currentLectureStudyStart) {
          const studyTimeMinutes = Math.floor((now.getTime() - prev.currentLectureStudyStart.getTime()) / 1000 / 60);
          
          if (studyTimeMinutes > 0) {
            if (lectureId) {
              console.log(`💾 Switching lectures: Saving ${studyTimeMinutes}m for lecture ${previousLectureId}, starting ${lectureId}`);
            } else {
              console.log(`💾 Leaving lecture: Saving ${studyTimeMinutes}m for lecture ${previousLectureId}`);
            }
            // Save study time asynchronously without blocking state update
            saveLectureStudyTime(previousLectureId, studyTimeMinutes, prev.currentLectureStudyStart, now).catch(console.error);
          } else {
            console.log(`⏱️ No time to save for lecture ${previousLectureId} (${studyTimeMinutes}m)`);
          }
        } else {
          console.log(`❌ Cannot save time for lecture ${previousLectureId}: currentLectureStudyStart is null`);
        }
      }
      
      // Handle lecture study time tracking in the same setState call
      let newLectureStudyStart: Date | null = null;
      
      if (lectureId) {
        if (prev.isRunning && prev.sessionType === 'focus') {
          console.log('📚 ✅ Starting time tracking for lecture:', lectureId, 'at', now.toLocaleTimeString());
          newLectureStudyStart = now;
        } else {
          console.log('📚 ❌ Timer not running or not focus session, no tracking for:', lectureId);
          newLectureStudyStart = null;
        }
      } else {
        console.log('📚 ⏹️ No lecture selected, stopping time tracking');
        newLectureStudyStart = null;
      }

      return {
        ...prev,
        currentLectureId: lectureId,
        currentLectureStudyStart: newLectureStudyStart
      };
    });
  }, []); // Remove all dependencies to prevent circular updates

  const toggleTimer = useCallback(() => {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  }, [state.isRunning, startTimer, pauseTimer]);

  return (
    <PomodoroContext.Provider value={{
      state,
      startTimer,
      pauseTimer,
      resetTimer,
      skipSession,
      updateSettings,
      updateSessionNote,
      setCurrentLecture,
      loadTodaySessions,
      saveCurrentSession,
      // Legacy aliases
      timeLeft: state.timeRemaining,
      isRunning: state.isRunning,
      isBreak: state.sessionType !== 'focus',
      sessionCount: state.sessionsCompleted,
      toggleTimer,
      settings: state.settings
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