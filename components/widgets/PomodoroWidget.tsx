"use client"

import React, { useState, useEffect } from 'react';
import { Play, Pause, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseWidget } from './BaseWidget';
import { usePomodoro } from '@/lib/contexts/PomodoroContext';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { PomodoroQuest } from '@/components/profile/PomodoroQuest';
import { PomodoroModal } from './PomodoroModal';

export function PomodoroWidget() {
  const {
    timeLeft,
    isRunning,
    isBreak,
    sessionCount,
    toggleTimer,
    settings
  } = usePomodoro();

  // Modal state
  const [showModal, setShowModal] = useState(false);

  // Quest state management
  const [quest, setQuest] = useState<any>(null);
  const [questLoading, setQuestLoading] = useState(false);

  // Fetch quest data
  useEffect(() => {
    const fetchQuest = async () => {
      try {
        setQuestLoading(true);
        const res = await fetch('/api/profile/daily-quests?questId=1');
        if (!res.ok) {
          throw new Error('Failed to fetch quest');
        }
        const { data } = await res.json();
        setQuest(data?.quest || null);
      } catch (error) {
        console.error('Failed to fetch pomodoro quest:', error);
      } finally {
        setQuestLoading(false);
      }
    };

    fetchQuest();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQuest, 30000);
    return () => clearInterval(interval);
  }, []);

  // Default values in case settings is undefined (in seconds for display)
  const focusDurationSeconds = (settings?.focus_duration || 25) * 60;
  const breakDurationSeconds = (settings?.short_break_duration || 5) * 60;
  const dailyGoal = settings?.daily_goal || 8;

  const safeTimeLeft = typeof timeLeft === 'number' && !isNaN(timeLeft) ? timeLeft : focusDurationSeconds;
  const totalTime = isBreak ? breakDurationSeconds : focusDurationSeconds;
  const progress = totalTime > 0 ? ((totalTime - safeTimeLeft) / totalTime) * 100 : 0;
  const safeSessionCount = typeof sessionCount === 'number' && !isNaN(sessionCount) ? sessionCount : 0;
  const goalPercentage = dailyGoal > 0
    ? Math.round((safeSessionCount / dailyGoal) * 100)
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
    <>
      <BaseWidget
        title="Pomodoro"
        iconImage="/images/pomodoro-technique.png"
        onClick={() => setShowModal(true)}
        color="text-red-600 dark:text-red-400"
        bgColor="bg-red-100 dark:bg-red-900/30"
        actions={
          <>
            {/* Timer display in header */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-muted/30 rounded-full border border-border/50">
              <span className="text-sm font-bold font-[var(--font-space-grotesk)] text-purple-600 dark:text-purple-400 tabular-nums">
                {formatTime(safeTimeLeft)}
              </span>
              <span className="text-xs text-muted-foreground">
                {isBreak ? 'Break' : 'Focus'}
              </span>
            </div>

            {/* Play/Pause button */}
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                toggleTimer();
              }}
            >
              {isRunning ? (
                <Pause className="h-3.5 w-3.5" />
              ) : (
                <Play className="h-3.5 w-3.5" />
              )}
            </Button>
          </>
        }
      >
      <div className="space-y-2">
        {/* PomodoroQuest - Daily challenge at the top */}
        {quest && (
          <div className="mb-8">
            <PomodoroQuest quest={quest} />
          </div>
        )}

        {/* Daily Progress - Progress Bar Layout */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Daily Progress</span>
            <span className="font-semibold font-[var(--font-space-grotesk)] text-foreground">
              {safeSessionCount}/{dailyGoal}
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(goalPercentage, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{Math.round(goalPercentage)}% complete</span>
            {safeSessionCount >= dailyGoal && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">🎉 Goal reached!</span>
            )}
          </div>
        </div>
      </div>
      </BaseWidget>

      <PomodoroModal
        open={showModal}
        onOpenChange={setShowModal}
      />
    </>
  );
}