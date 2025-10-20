"use client"

import React from 'react';
import { Play, Pause, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseWidget } from './BaseWidget';
import { usePomodoro } from '@/lib/contexts/PomodoroContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Orbitron } from 'next/font/google';

// Retro digital clock font
const orbitron = Orbitron({
  subsets: ['latin'],
  weight: ['700', '900'],
  display: 'swap',
});

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
  const safeSessionCount = typeof sessionCount === 'number' && !isNaN(sessionCount) ? sessionCount : 0;
  const goalPercentage = currentSettings.sessionsPerCycle > 0
    ? Math.round((safeSessionCount / currentSettings.sessionsPerCycle) * 100)
    : 0;

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
      iconImage="/images/pomodoro-technique.png"
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
      <div className="space-y-3">
        {/* Circular Timer Display with SVG Progress Ring */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative">
            {/* SVG Circular Progress */}
            <svg width="120" height="120" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                className="text-muted/30"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="52"
                stroke="currentColor"
                strokeWidth="6"
                fill="transparent"
                strokeDasharray={`${2 * Math.PI * 52}`}
                strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
                strokeLinecap="round"
                className={cn(
                  "transition-all duration-300",
                  isBreak ? "text-green-500" : "text-purple-500"
                )}
              />
            </svg>

            {/* Timer in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className={cn(
                "text-4xl font-black tracking-wider",
                orbitron.className,
                isBreak ? "text-green-600 dark:text-green-400" : "text-purple-600 dark:text-purple-400"
              )} style={{ fontWeight: 900 }}>
                {formatTime(safeTimeLeft)}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {isBreak ? 'Break' : 'Focus'}
              </p>
            </div>
          </div>
        </div>

        {/* Session Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col items-center p-2.5 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-1 mb-0.5">
              <Target className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <p className={cn("text-2xl font-black", orbitron.className)} style={{ fontWeight: 900 }}>{safeSessionCount}</p>
            </div>
            <p className="text-[10px] text-muted-foreground">Sessions</p>
            <p className="text-[9px] text-muted-foreground">Today</p>
          </div>
          <div className="flex flex-col items-center p-2.5 rounded-lg bg-muted/30 border border-border">
            <p className={cn("text-2xl font-black mb-0.5", orbitron.className)} style={{ fontWeight: 900 }}>{currentSettings.sessionsPerCycle}</p>
            <p className="text-[10px] text-muted-foreground">Daily Goal</p>
            <p className={cn("text-sm font-bold", orbitron.className, "text-purple-600 dark:text-purple-400")}>
              {goalPercentage}%
            </p>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}