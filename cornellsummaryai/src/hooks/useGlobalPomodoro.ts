import { useEffect } from 'react';
import { useStore } from '@nanostores/react';
import { 
  pomodoroStore,
  timeRemaining,
  startTimer, 
  pauseTimer, 
  resetTimer, 
  skipSession,
  updateSettings,
  updateSessionNote,
  getTodaySessions,
  type PomodoroSettings 
} from '@/stores/globalPomodoro';

export function useGlobalPomodoro() {
  const state = useStore(pomodoroStore);
  const currentTimeRemaining = useStore(timeRemaining);

  // Ensure timer is running on component mount if it should be
  useEffect(() => {
    if (state.isRunning && state.sessionStartTimestamp) {
      // Just restart the UI update interval if needed
      startTimer();
    }
  }, []);

  return {
    state: {
      ...state,
      timeRemaining: currentTimeRemaining
    },
    startTimer,
    pauseTimer,
    resetTimer,
    skipSession,
    updateSettings,
    updateSessionNote,
    getTodaySessions
  };
}