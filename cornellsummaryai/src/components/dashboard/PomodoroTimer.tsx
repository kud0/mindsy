import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { Play, Pause, RotateCcw, ChevronRight, Timer, StickyNote, Save } from 'lucide-react';
import { useGlobalPomodoro } from '@/hooks/useGlobalPomodoro';

interface PomodoroTimerProps {
  onExpand?: () => void;
  className?: string;
}

const SESSION_COLORS = {
  focus: 'bg-red-500',
  shortBreak: 'bg-green-500',
  longBreak: 'bg-blue-500',
};

const SESSION_LABELS = {
  focus: 'Focus Session',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

export function PomodoroTimer({ onExpand, className }: PomodoroTimerProps) {
  const { state, startTimer, pauseTimer, resetTimer, updateSessionNote } = useGlobalPomodoro();
  
  // Hydration state to prevent SSR mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  
  // Notepad state
  const [notepadText, setNotepadText] = useState('');
  const [isNotepadOpen, setIsNotepadOpen] = useState(false);
  const [hasUnsavedNotes, setHasUnsavedNotes] = useState(false);

  // Handle hydration
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Load saved notes on component mount
  React.useEffect(() => {
    const savedNotes = localStorage.getItem('pomodoroNotepad');
    if (savedNotes) {
      setNotepadText(savedNotes);
      // Also sync to session note for notifications
      updateSessionNote(savedNotes);
    }
  }, [updateSessionNote]);

  // Handle notepad text changes
  const handleNotepadChange = (value: string) => {
    setNotepadText(value);
    setHasUnsavedNotes(true);
    
    // Also update the session note for notifications
    updateSessionNote(value);
  };

  // Auto-save notes after 2 seconds of no typing
  React.useEffect(() => {
    if (hasUnsavedNotes) {
      const timer = setTimeout(() => {
        saveNotes();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notepadText, hasUnsavedNotes]);

  // Save notes to localStorage
  const saveNotes = () => {
    localStorage.setItem('pomodoroNotepad', notepadText);
    setHasUnsavedNotes(false);
  };

  // Clear all notes
  const clearNotes = () => {
    setNotepadText('');
    localStorage.removeItem('pomodoroNotepad');
    setHasUnsavedNotes(false);
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const toggleTimer = () => {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  // Calculate progress percentage
  const totalDuration = isHydrated 
    ? (state.sessionType === 'focus' 
        ? state.settings.focusDuration * 60
        : state.sessionType === 'shortBreak'
        ? state.settings.shortBreakDuration * 60
        : state.settings.longBreakDuration * 60)
    : 25 * 60; // Default focus duration

  const currentTimeRemaining = isHydrated ? state.timeRemaining : 25 * 60;
  const progress = ((totalDuration - currentTimeRemaining) / totalDuration) * 100;

  return (
    <div className={cn("bg-card rounded-lg p-3 space-y-2", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Timer className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium">Pomodoro</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn(
            "text-xs font-medium px-2 py-0.5 rounded-full",
            isHydrated ? SESSION_COLORS[state.sessionType] : SESSION_COLORS.focus,
            "text-white"
          )}>
            {isHydrated ? SESSION_LABELS[state.sessionType] : SESSION_LABELS.focus}
          </div>
        </div>
      </div>

      {/* Time display and expand button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold font-mono tabular-nums">
            {formatTime(isHydrated ? state.timeRemaining : 25 * 60)}
          </span>
          {isHydrated && state.isRunning && (
            <div className="flex gap-0.5">
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse" />
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-75" />
              <div className="w-1 h-1 bg-primary rounded-full animate-pulse delay-150" />
            </div>
          )}
        </div>
        <button
          onClick={onExpand}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 whitespace-nowrap"
        >
          <span className="whitespace-nowrap">View Full</span>
          <ChevronRight className="h-3 w-3 flex-shrink-0" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="relative mb-2">
        <Progress 
          value={progress} 
          className="h-2"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white drop-shadow-sm">
            {formatTime(currentTimeRemaining)}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={toggleTimer}
          >
            {isHydrated && state.isRunning ? (
              <Pause className="h-3 w-3" />
            ) : (
              <Play className="h-3 w-3" />
            )}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0"
            onClick={resetTimer}
          >
            <RotateCcw className="h-3 w-3" />
          </Button>
          
          {/* Notepad Popover */}
          <Popover open={isNotepadOpen} onOpenChange={setIsNotepadOpen}>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className={cn(
                  "h-7 w-7 p-0 relative",
                  hasUnsavedNotes && "text-orange-500"
                )}
              >
                <StickyNote className="h-3 w-3" />
                {hasUnsavedNotes && (
                  <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-orange-500 rounded-full" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4" align="end">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Quick Notes
                  </h4>
                  <div className="flex items-center gap-1">
                    {hasUnsavedNotes && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={saveNotes}
                        className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={clearNotes}
                      className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                <Textarea
                  placeholder="Jot down your thoughts, ideas, or reminders..."
                  value={notepadText}
                  onChange={(e) => handleNotepadChange(e.target.value)}
                  className="min-h-[120px] resize-none text-sm"
                  autoFocus
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {notepadText.length} characters
                  </span>
                  {hasUnsavedNotes && (
                    <span className="text-orange-600">Unsaved changes</span>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          Today: <span className="font-medium text-foreground">{isHydrated ? state.sessionsCompleted : 0}</span> sessions
        </div>
      </div>
    </div>
  );
}