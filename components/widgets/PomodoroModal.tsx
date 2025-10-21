"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Timer, Settings, TrendingUp, Target, Play, Pause, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePomodoro } from '@/lib/contexts/PomodoroContext';
import { PomodoroQuest } from '@/components/profile/PomodoroQuest';

interface PomodoroModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PomodoroModal({ open, onOpenChange }: PomodoroModalProps) {
  const [activeTab, setActiveTab] = useState('timer');
  const {
    timeLeft,
    isRunning,
    isBreak,
    sessionCount,
    toggleTimer,
    resetTimer,
    settings,
    updateSettings
  } = usePomodoro();

  // Quest state management
  const [quest, setQuest] = useState<any>(null);
  const [questLoading, setQuestLoading] = useState(false);

  // Local state for settings (to prevent DB spam while dragging)
  const [localFocusDuration, setLocalFocusDuration] = useState(settings?.focus_duration || 25);
  const [localShortBreak, setLocalShortBreak] = useState(settings?.short_break_duration || 5);
  const [localLongBreak, setLocalLongBreak] = useState(settings?.long_break_duration || 15);
  const [localDailyGoal, setLocalDailyGoal] = useState(settings?.daily_goal || 8);

  // Sync local state when settings change from external source
  useEffect(() => {
    if (settings) {
      setLocalFocusDuration(settings.focus_duration);
      setLocalShortBreak(settings.short_break_duration);
      setLocalLongBreak(settings.long_break_duration);
      setLocalDailyGoal(settings.daily_goal);
    }
  }, [settings]);

  // Fetch quest data when modal opens
  useEffect(() => {
    if (open) {
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
    }
  }, [open]);

  // Default values in case settings is undefined (in seconds for display)
  const focusDurationSeconds = (settings?.focus_duration || 25) * 60;
  const breakDurationSeconds = (settings?.short_break_duration || 5) * 60;
  const dailyGoal = settings?.daily_goal || 8;

  const safeTimeLeft = typeof timeLeft === 'number' && !isNaN(timeLeft) ? timeLeft : focusDurationSeconds;
  const totalTime = isBreak ? breakDurationSeconds : focusDurationSeconds;
  const progress = totalTime > 0 ? ((totalTime - safeTimeLeft) / totalTime) * 100 : 0;
  const safeSessionCount = typeof sessionCount === 'number' && !isNaN(sessionCount) ? sessionCount : 0;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) {
      return '25:00';
    }
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "w-[95vw] max-w-2xl h-[85vh] overflow-hidden p-0 flex flex-col",
          "bg-white/95 dark:bg-background/90 backdrop-blur-xl dark:backdrop-blur-2xl",
          "border border-gray-200/50 dark:border-border",
          "shadow-xl dark:shadow-2xl dark:shadow-black/50"
        )}
      >
        <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 p-4 flex-shrink-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Timer className="w-5 h-5" />
            Pomodoro Timer
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col p-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/50 p-0.5 rounded-lg flex-shrink-0 mb-3">
              <TabsTrigger
                value="timer"
                className="data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm rounded-md transition-all text-xs py-2"
              >
                <Timer className="w-3.5 h-3.5 mr-1.5" />
                Timer
              </TabsTrigger>
              <TabsTrigger
                value="stats"
                className="data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm rounded-md transition-all text-xs py-2"
              >
                <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                Stats
              </TabsTrigger>
              <TabsTrigger
                value="settings"
                className="data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 data-[state=active]:backdrop-blur-xl data-[state=active]:shadow-sm rounded-md transition-all text-xs py-2"
              >
                <Settings className="w-3.5 h-3.5 mr-1.5" />
                Settings
              </TabsTrigger>
            </TabsList>

            {/* TIMER TAB */}
            <TabsContent value="timer" className="flex-1 overflow-y-auto space-y-8 pr-1 pb-6">
              {/* Quest Section */}
              {quest && !questLoading && (
                <div className="space-y-2 mb-8">
                  <h3 className="text-sm font-semibold text-foreground">Daily Quest</h3>
                  <PomodoroQuest quest={quest} />
                </div>
              )}

              {/* Main Timer Display */}
              <div className="flex flex-col items-center justify-center py-8 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl">
                {/* Circular Timer */}
                <div className="relative mb-6">
                  {/* SVG Circular Progress */}
                  <svg width="200" height="200" className="transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      className="text-muted/30"
                    />
                    {/* Progress circle */}
                    <circle
                      cx="100"
                      cy="100"
                      r="90"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 90}`}
                      strokeDashoffset={`${2 * Math.PI * 90 * (1 - progress / 100)}`}
                      strokeLinecap="round"
                      className={cn(
                        "transition-all duration-300",
                        isBreak ? "text-purple-400" : "text-purple-600"
                      )}
                    />
                  </svg>

                  {/* Timer in center */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className={cn(
                      "text-6xl font-bold font-[var(--font-space-grotesk)]",
                      isBreak ? "text-purple-400 dark:text-purple-300" : "text-purple-600 dark:text-purple-400"
                    )}>
                      {formatTime(safeTimeLeft)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-2 font-medium">
                      {isBreak ? 'Break Time' : 'Focus Session'}
                    </p>
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    onClick={toggleTimer}
                    className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 px-8"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-5 h-5 mr-2" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2" />
                        Start
                      </>
                    )}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={resetTimer}
                    className="border-gray-200/50 dark:border-gray-700/50"
                  >
                    <RotateCcw className="w-5 h-5 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>

              {/* Session Progress */}
              <div className="space-y-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Today's Progress
                  </h3>
                  <span className="text-sm font-semibold font-[var(--font-space-grotesk)] text-foreground">
                    {safeSessionCount}/{dailyGoal}
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min((safeSessionCount / dailyGoal) * 100, 100)}%`
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">
                    {Math.round((safeSessionCount / dailyGoal) * 100)}% complete
                  </span>
                  {safeSessionCount >= dailyGoal && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      Goal reached!
                    </span>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* STATS TAB */}
            <TabsContent value="stats" className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="space-y-4">
                {/* Today's Stats */}
                <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Today's Session</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Completed</p>
                      <p className="text-2xl font-bold font-[var(--font-space-grotesk)] text-purple-600 dark:text-purple-400">
                        {safeSessionCount}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Goal</p>
                      <p className="text-2xl font-bold font-[var(--font-space-grotesk)] text-foreground">
                        {dailyGoal}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Weekly Overview */}
                <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl p-4">
                  <h3 className="text-sm font-semibold text-foreground mb-3">This Week</h3>
                  <div className="text-center py-8">
                    <TrendingUp className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      Detailed statistics coming soon
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings" className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-5">Timer Settings</h3>
                <div className="space-y-6">
                  {/* Focus Duration Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="focus-duration" className="text-sm font-medium">
                        Focus Duration
                      </Label>
                      <span className="text-sm font-semibold font-[var(--font-space-grotesk)] text-purple-600 dark:text-purple-400">
                        {localFocusDuration} min
                      </span>
                    </div>
                    <Slider
                      id="focus-duration"
                      min={10}
                      max={60}
                      step={5}
                      value={[localFocusDuration]}
                      onValueChange={([value]) => setLocalFocusDuration(value)}
                      onValueCommit={([value]) => updateSettings({ focus_duration: value })}
                      className="w-full"
                    />
                  </div>

                  {/* Short Break Duration Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="short-break-duration" className="text-sm font-medium">
                        Short Break Duration
                      </Label>
                      <span className="text-sm font-semibold font-[var(--font-space-grotesk)] text-purple-600 dark:text-purple-400">
                        {localShortBreak} min
                      </span>
                    </div>
                    <Slider
                      id="short-break-duration"
                      min={3}
                      max={15}
                      step={1}
                      value={[localShortBreak]}
                      onValueChange={([value]) => setLocalShortBreak(value)}
                      onValueCommit={([value]) => updateSettings({ short_break_duration: value })}
                      className="w-full"
                    />
                  </div>

                  {/* Long Break Duration Slider */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="long-break-duration" className="text-sm font-medium">
                        Long Break Duration
                      </Label>
                      <span className="text-sm font-semibold font-[var(--font-space-grotesk)] text-purple-600 dark:text-purple-400">
                        {localLongBreak} min
                      </span>
                    </div>
                    <Slider
                      id="long-break-duration"
                      min={10}
                      max={30}
                      step={5}
                      value={[localLongBreak]}
                      onValueChange={([value]) => setLocalLongBreak(value)}
                      onValueCommit={([value]) => updateSettings({ long_break_duration: value })}
                      className="w-full"
                    />
                  </div>

                  {/* Daily Goal */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="daily-goal" className="text-sm font-medium">
                        Daily Goal (Sessions)
                      </Label>
                      <span className="text-sm font-semibold font-[var(--font-space-grotesk)] text-purple-600 dark:text-purple-400">
                        {localDailyGoal}
                      </span>
                    </div>
                    <Slider
                      id="daily-goal"
                      min={1}
                      max={12}
                      step={1}
                      value={[localDailyGoal]}
                      onValueChange={([value]) => setLocalDailyGoal(value)}
                      onValueCommit={([value]) => updateSettings({ daily_goal: value })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Automation Settings */}
              <div className="rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl p-5">
                <h3 className="text-sm font-semibold text-foreground mb-4">Automation</h3>
                <div className="space-y-4">
                  {/* Auto-start Focus Sessions */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-start-focus" className="text-sm font-medium">
                        Auto-start Focus Sessions
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically start after breaks
                      </p>
                    </div>
                    <Switch
                      id="auto-start-focus"
                      checked={settings?.auto_start_focus || false}
                      onCheckedChange={(checked) => updateSettings({ auto_start_focus: checked })}
                    />
                  </div>

                  {/* Auto-start Breaks */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="auto-start-breaks" className="text-sm font-medium">
                        Auto-start Breaks
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically start after focus sessions
                      </p>
                    </div>
                    <Switch
                      id="auto-start-breaks"
                      checked={settings?.auto_start_breaks || false}
                      onCheckedChange={(checked) => updateSettings({ auto_start_breaks: checked })}
                    />
                  </div>

                  {/* Sound Notifications */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="sound-enabled" className="text-sm font-medium">
                        Sound Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Play sound when sessions complete
                      </p>
                    </div>
                    <Switch
                      id="sound-enabled"
                      checked={settings?.sound_enabled !== false}
                      onCheckedChange={(checked) => updateSettings({ sound_enabled: checked })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
