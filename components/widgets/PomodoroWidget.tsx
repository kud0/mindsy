"use client"

import React from 'react';
import { Clock, Play, Pause, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseWidget } from './BaseWidget';
import { usePomodoro } from '@/lib/contexts/PomodoroContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function PomodoroWidget() {
  const { 
    timeLeft, 
    isRunning, 
    isBreak,
    sessionCount,
    toggleTimer,
    settings 
  } = usePomodoro();

  // Default values in case settings is undefined
  const defaultSettings = {
    focusDuration: 1500, // 25 minutes
    breakDuration: 300,  // 5 minutes
    sessionsPerCycle: 4
  };

  const currentSettings = settings || defaultSettings;
  const safeTimeLeft = typeof timeLeft === 'number' && !isNaN(timeLeft) ? timeLeft : currentSettings.focusDuration;
  const totalTime = isBreak ? currentSettings.breakDuration : currentSettings.focusDuration;
  const progress = totalTime > 0 ? ((totalTime - safeTimeLeft) / totalTime) * 100 : 0;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) {
      return '25:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <BaseWidget
      title="Pomodoro"
      icon={Clock}
      href="/dashboard/pomodoro"
      color="text-red-600 dark:text-red-400"
      bgColor="bg-red-100 dark:bg-red-900/30"
      actions={
        <Button 
          variant="ghost"
          size="icon"
          onClick={toggleTimer}
        >
          {isRunning ? (
            <Pause className="h-3.5 w-3.5" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Timer Display */}
        <div className="text-center">
          <div className={cn(
            "text-5xl font-bold font-mono mb-2",
            isBreak ? "text-green-600 dark:text-green-400" : "text-primary"
          )}>
            {formatTime(safeTimeLeft)}
          </div>
          <p className="text-sm text-muted-foreground">
            {isBreak ? 'Break Time' : 'Focus Time'}
          </p>
        </div>

        {/* Progress */}
        <Progress value={progress} className="h-3" />

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 rounded-lg ">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Target className="h-4 w-4 text-muted-foreground" />
              <p className="text-lg font-bold">{sessionCount}</p>
            </div>
            <p className="text-xs text-muted-foreground">Sessions</p>
          </div>
          <div className="text-center p-3 rounded-lg ">
            <p className="text-lg font-bold">{currentSettings.sessionsPerCycle}</p>
            <p className="text-xs text-muted-foreground">Goal</p>
          </div>
        </div>

        {/* Status */}
        {isRunning && (
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-muted-foreground">Timer Running</span>
            </div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}