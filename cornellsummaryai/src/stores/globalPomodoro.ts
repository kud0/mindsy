import { atom, computed, map } from 'nanostores';
import { ClientNotificationService } from '@/lib/client-notifications';

export type SessionType = 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroSession {
  id: string;
  type: SessionType;
  started_at: string;
  completed_at?: string;
  duration: number; // in minutes
  was_completed: boolean;
  note?: string;
}

export interface PomodoroSettings {
  focusDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  soundEnabled: boolean;
  dailyGoal: number;
}

export interface PomodoroState {
  isRunning: boolean;
  sessionType: SessionType;
  sessionsCompleted: number;
  // New timestamp-based approach
  sessionStartTimestamp: number | null; // When the current session started
  sessionDuration: number; // Total duration of current session in seconds
  settings: PomodoroSettings;
  // Current session tracking
  currentSessionId: string | null;
  currentSessionNote: string;
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

// Load state from localStorage
const loadState = (): PomodoroState => {
  if (typeof window === 'undefined') {
    return {
      isRunning: false,
      sessionType: 'focus',
      sessionsCompleted: 0,
      sessionStartTimestamp: null,
      sessionDuration: DEFAULT_SETTINGS.focusDuration * 60,
      settings: DEFAULT_SETTINGS,
      currentSessionId: null,
      currentSessionNote: ''
    };
  }

  const saved = localStorage.getItem('pomodoroState');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      // Migration: if old format, convert to new format
      if (parsed.timeRemaining !== undefined || parsed.currentSessionStartTime !== undefined) {
        const newState = {
          isRunning: parsed.isRunning || false,
          sessionType: parsed.sessionType || 'focus',
          sessionsCompleted: parsed.sessionsCompleted || 0,
          sessionStartTimestamp: null,
          sessionDuration: getDurationForSessionType(parsed.sessionType || 'focus', { ...DEFAULT_SETTINGS, ...parsed.settings }),
          settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
          currentSessionId: null,
          currentSessionNote: ''
        };
        // Save migrated state
        localStorage.setItem('pomodoroState', JSON.stringify(newState));
        return newState;
      }
      return { 
        ...parsed, 
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        currentSessionId: parsed.currentSessionId || null,
        currentSessionNote: parsed.currentSessionNote || ''
      };
    } catch (e) {
      console.error('Failed to load pomodoro state:', e);
    }
  }

  return {
    isRunning: false,
    sessionType: 'focus',
    sessionsCompleted: 0,
    sessionStartTimestamp: null,
    sessionDuration: DEFAULT_SETTINGS.focusDuration * 60,
    settings: DEFAULT_SETTINGS,
    currentSessionId: null,
    currentSessionNote: ''
  };
};

// Helper to get duration for session type
const getDurationForSessionType = (sessionType: SessionType, settings: PomodoroSettings): number => {
  switch (sessionType) {
    case 'focus': return settings.focusDuration * 60;
    case 'shortBreak': return settings.shortBreakDuration * 60;
    case 'longBreak': return settings.longBreakDuration * 60;
  }
};

// Helper to generate unique session ID
const generateSessionId = (): string => {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
};

// Session management functions
const getSessions = (): PomodoroSession[] => {
  if (typeof window === 'undefined') return [];
  const saved = localStorage.getItem('pomodoroSessions');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to load sessions:', e);
      return [];
    }
  }
  return [];
};

const saveSessions = (sessions: PomodoroSession[]): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('pomodoroSessions', JSON.stringify(sessions));
};

export const saveSession = (session: PomodoroSession): void => {
  const sessions = getSessions();
  sessions.push(session);
  saveSessions(sessions);
};

export const getTodaySessions = (): PomodoroSession[] => {
  const sessions = getSessions();
  const today = new Date().toDateString();
  return sessions.filter(session => 
    new Date(session.started_at).toDateString() === today
  );
};

export const updateSessionNote = (note: string): void => {
  pomodoroStore.setKey('currentSessionNote', note);
};

const updateSessionInHistory = (sessionId: string, updates: Partial<PomodoroSession>): void => {
  const sessions = getSessions();
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex !== -1) {
    sessions[sessionIndex] = { ...sessions[sessionIndex], ...updates };
    saveSessions(sessions);
  }
};

// Create the global store
export const pomodoroStore = map<PomodoroState>(loadState());

// Save to localStorage whenever state changes
pomodoroStore.subscribe((state) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('pomodoroState', JSON.stringify(state));
  }
});

// Atom for triggering UI updates
const uiTick = atom(0);

// Computed property for time remaining
export const timeRemaining = computed([pomodoroStore, uiTick], (state, tick) => {
  if (!state.isRunning || !state.sessionStartTimestamp) {
    return state.sessionDuration;
  }
  
  const elapsed = Math.floor((Date.now() - state.sessionStartTimestamp) / 1000);
  return Math.max(0, state.sessionDuration - elapsed);
});

// Timer interval management - use a global reference (only for UI updates)
let uiUpdateInterval: NodeJS.Timeout | null = null;

// Check if an interval is already running
const isIntervalRunning = () => {
  return uiUpdateInterval !== null;
};

// Start the timer
export const startTimer = () => {
  const state = pomodoroStore.get();
  
  // If already running with an active interval, don't start another
  if (state.isRunning && isIntervalRunning()) return;

  pomodoroStore.setKey('isRunning', true);
  
  // Set start timestamp and create session ID if not already set
  if (!state.sessionStartTimestamp) {
    const now = Date.now();
    const sessionId = generateSessionId();
    
    pomodoroStore.setKey('sessionStartTimestamp', now);
    pomodoroStore.setKey('currentSessionId', sessionId);
    
    // Don't save to history yet - only save when session completes or is skipped
  }

  // Clear any existing interval
  if (uiUpdateInterval) {
    clearInterval(uiUpdateInterval);
    uiUpdateInterval = null;
  }

  // Start UI update interval (only for checking completion and triggering UI updates)
  uiUpdateInterval = setInterval(() => {
    // Trigger UI update by incrementing the tick
    uiTick.set(uiTick.get() + 1);
    
    const currentTimeRemaining = timeRemaining.get();
    if (currentTimeRemaining <= 0) {
      // Session complete
      completeSession();
    }
  }, 1000);
};

// Pause the timer
export const pauseTimer = () => {
  const state = pomodoroStore.get();
  
  if (state.isRunning && state.sessionStartTimestamp) {
    // Calculate elapsed time and store it in sessionDuration
    const elapsed = Math.floor((Date.now() - state.sessionStartTimestamp) / 1000);
    const remaining = Math.max(0, state.sessionDuration - elapsed);
    pomodoroStore.setKey('sessionDuration', remaining);
    
    // Update session note in history if there's a current session
    if (state.currentSessionId && state.currentSessionNote) {
      updateSessionInHistory(state.currentSessionId, {
        note: state.currentSessionNote
      });
    }
  }
  
  pomodoroStore.setKey('isRunning', false);
  pomodoroStore.setKey('sessionStartTimestamp', null);
  
  if (uiUpdateInterval) {
    clearInterval(uiUpdateInterval);
    uiUpdateInterval = null;
  }
};

// Reset the timer
export const resetTimer = () => {
  pauseTimer();
  const state = pomodoroStore.get();
  const duration = getDurationForSessionType(state.sessionType, state.settings);
  
  pomodoroStore.setKey('sessionDuration', duration);
};

// Skip to next session
export const skipSession = () => {
  const state = pomodoroStore.get();
  
  // Create skipped session in history
  if (state.currentSessionId && state.sessionStartTimestamp) {
    const skippedSession: PomodoroSession = {
      id: state.currentSessionId,
      type: state.sessionType,
      started_at: new Date(state.sessionStartTimestamp).toISOString(),
      completed_at: new Date().toISOString(),
      duration: Math.round((getDurationForSessionType(state.sessionType, state.settings) - state.sessionDuration) / 60), // Actual time spent
      was_completed: false,
      note: state.currentSessionNote || undefined
    };
    saveSession(skippedSession);
  }
  
  pauseTimer();
  
  // Clear current session
  pomodoroStore.setKey('currentSessionId', null);
  pomodoroStore.setKey('currentSessionNote', '');
  
  switchToNextSession();
};

// Complete current session
const completeSession = () => {
  const state = pomodoroStore.get();
  
  // Create completed session in history
  if (state.currentSessionId && state.sessionStartTimestamp) {
    const completedSession: PomodoroSession = {
      id: state.currentSessionId,
      type: state.sessionType,
      started_at: new Date(state.sessionStartTimestamp).toISOString(),
      completed_at: new Date().toISOString(),
      duration: Math.round(getDurationForSessionType(state.sessionType, state.settings) / 60), // Full session duration in minutes
      was_completed: true,
      note: state.currentSessionNote || undefined
    };
    saveSession(completedSession);
    
    // Create notification for focus sessions with notes
    console.log('🍅 Session completed:', {
      sessionType: state.sessionType,
      currentSessionNote: state.currentSessionNote,
      noteLength: state.currentSessionNote?.length || 0
    });
    
    if (state.sessionType === 'focus' && state.currentSessionNote && state.currentSessionNote.trim().length > 0) {
      console.log('🔔 Creating focus complete notification...');
      ClientNotificationService.notifyPomodoroFocusComplete({
        sessionNote: state.currentSessionNote,
        sessionDuration: completedSession.duration
      });
    } else {
      console.log('❌ Not creating notification - either not focus session or no notes');
    }
  }
  
  pauseTimer();
  
  // Play sound if enabled
  if (state.settings.soundEnabled && typeof window !== 'undefined') {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(e => console.log('Could not play sound:', e));
  }

  // Update sessions completed
  if (state.sessionType === 'focus') {
    pomodoroStore.setKey('sessionsCompleted', state.sessionsCompleted + 1);
  }

  // Clear current session
  pomodoroStore.setKey('currentSessionId', null);
  pomodoroStore.setKey('currentSessionNote', '');

  // Switch to next session
  switchToNextSession();

  // Auto-start if enabled
  const newState = pomodoroStore.get();
  if (
    (newState.sessionType !== 'focus' && state.settings.autoStartBreaks) ||
    (newState.sessionType === 'focus' && state.settings.autoStartFocus)
  ) {
    startTimer();
  }
};

// Switch to next session type
const switchToNextSession = () => {
  const state = pomodoroStore.get();
  let nextType: SessionType;
  
  if (state.sessionType === 'focus') {
    // After 4 focus sessions, take a long break
    nextType = state.sessionsCompleted % 4 === 0 ? 'longBreak' : 'shortBreak';
  } else {
    nextType = 'focus';
  }

  pomodoroStore.setKey('sessionType', nextType);
  
  const duration = getDurationForSessionType(nextType, state.settings);
  pomodoroStore.setKey('sessionDuration', duration);
};

// Update settings
export const updateSettings = (newSettings: Partial<PomodoroSettings>) => {
  const state = pomodoroStore.get();
  pomodoroStore.setKey('settings', { ...state.settings, ...newSettings });
  
  // If timer is not running and duration changed, update session duration
  if (!state.isRunning) {
    const newDuration = getDurationForSessionType(state.sessionType, { ...state.settings, ...newSettings });
    pomodoroStore.setKey('sessionDuration', newDuration);
  }
};

// Initialize timer on page load if it was running
if (typeof window !== 'undefined') {
  // Small delay to ensure store is initialized
  setTimeout(() => {
    const state = pomodoroStore.get();
    if (state.isRunning && state.sessionStartTimestamp) {
      // Check if session should have completed while we were away
      const currentTimeRemaining = timeRemaining.get();
      if (currentTimeRemaining <= 0) {
        completeSession();
      } else {
        // Just restart the UI update interval
        startTimer();
      }
    }
  }, 100);
}

// Cleanup on page unload - state is automatically saved via subscription