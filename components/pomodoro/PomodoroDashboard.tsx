"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  BarChart3, 
  Calendar, 
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  SkipForward
} from 'lucide-react';
import { usePomodoro } from '@/lib/contexts/PomodoroContext';
import type { PomodoroSession } from '@/types/database';

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

export function PomodoroDashboard() {
  const { 
    state, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    skipSession,
    updateSettings, 
    updateSessionNote,
    loadTodaySessions 
  } = usePomodoro();

  const [settingsValues, setSettingsValues] = useState({
    focus_duration: state.settings.focus_duration,
    short_break_duration: state.settings.short_break_duration,
    long_break_duration: state.settings.long_break_duration,
    auto_start_breaks: state.settings.auto_start_breaks,
    auto_start_focus: state.settings.auto_start_focus,
    sound_enabled: state.settings.sound_enabled,
    daily_goal: state.settings.daily_goal
  });

  // Update local settings when context changes
  useEffect(() => {
    setSettingsValues({
      focus_duration: state.settings.focus_duration,
      short_break_duration: state.settings.short_break_duration,
      long_break_duration: state.settings.long_break_duration,
      auto_start_breaks: state.settings.auto_start_breaks,
      auto_start_focus: state.settings.auto_start_focus,
      sound_enabled: state.settings.sound_enabled,
      daily_goal: state.settings.daily_goal
    });
  }, [state.settings]);

  // Reload today's sessions on component mount
  useEffect(() => {
    loadTodaySessions();
  }, [loadTodaySessions]);

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate timer progress
  const totalDuration = state.sessionType === 'focus' 
    ? state.settings.focus_duration * 60
    : state.sessionType === 'shortBreak'
    ? state.settings.short_break_duration * 60
    : state.settings.long_break_duration * 60;

  const progress = ((totalDuration - state.timeRemaining) / totalDuration) * 100;

  // Handle settings update
  const handleSettingsUpdate = () => {
    updateSettings(settingsValues);
  };

  // Toggle timer
  const toggleTimer = () => {
    if (state.isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
  };

  // Calculate today's progress toward goal
  const focusSessionsToday = state.todaySessions.filter(s => s.type === 'focus' && s.was_completed).length;
  const goalProgress = (focusSessionsToday / state.settings.daily_goal) * 100;

  // Get recent sessions (last 10)
  const recentSessions = state.todaySessions.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Main Timer Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Timer Display */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  "px-3 py-1 rounded-full text-white text-sm font-medium",
                  SESSION_COLORS[state.sessionType]
                )}>
                  {SESSION_LABELS[state.sessionType]}
                </div>
                {state.sessionsCompleted > 0 && (
                  <Badge variant="secondary">
                    Session {state.sessionsCompleted + 1}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Large Time Display */}
              <div className="text-center">
                <div className="text-8xl font-bold font-mono tabular-nums mb-4">
                  {formatTime(state.timeRemaining)}
                </div>
                <Progress value={progress} className="h-3 mb-6" />
              </div>

              {/* Timer Controls */}
              <div className="flex justify-center gap-4">
                <Button
                  size="lg"
                  onClick={toggleTimer}
                  className="h-14 px-8"
                >
                  {state.isRunning ? (
                    <>
                      <Pause className="h-5 w-5 mr-2" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5 mr-2" />
                      Start
                    </>
                  )}
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={resetTimer}
                  className="h-14 px-8"
                >
                  <RotateCcw className="h-5 w-5 mr-2" />
                  Reset
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={skipSession}
                  className="h-14 px-8"
                >
                  <SkipForward className="h-5 w-5 mr-2" />
                  Skip
                </Button>
              </div>

              {/* Session Notes */}
              <div className="space-y-2">
                <Label htmlFor="session-notes">Session Notes</Label>
                <Textarea
                  id="session-notes"
                  placeholder="Jot down what you're working on..."
                  value={state.currentSessionNote}
                  onChange={(e) => updateSessionNote(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-4">
          {/* Daily Progress */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                Daily Goal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{focusSessionsToday} / {state.settings.daily_goal} sessions</span>
                  <span>{Math.min(goalProgress, 100).toFixed(0)}%</span>
                </div>
                <Progress value={goalProgress} className="h-2" />
              </div>
            </CardContent>
          </Card>

          {/* Today's Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Today
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Sessions</span>
                <span className="font-medium">{state.totalSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="font-medium">{focusSessionsToday}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Focus Time</span>
                <span className="font-medium">
                  {Math.floor(state.todaySessions.filter(s => s.type === 'focus').reduce((acc, s) => acc + s.duration, 0) / 60)}h
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Weekly Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                This Week
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Minutes</span>
                <span className="font-medium">{state.weeklyStats.totalMinutes}m</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Sessions</span>
                <span className="font-medium">{state.weeklyStats.totalSessions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Completion Rate</span>
                <span className="font-medium">{state.weeklyStats.completionRate.toFixed(0)}%</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs defaultValue="history" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="history" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>
                Your recent Pomodoro sessions from today
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No sessions yet today. Start your first Pomodoro!</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentSessions.map((session, index) => (
                    <div
                      key={session.id || index}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        {session.was_completed ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "px-2 py-1 rounded text-xs font-medium text-white",
                              SESSION_COLORS[session.type]
                            )}>
                              {SESSION_LABELS[session.type]}
                            </span>
                            <span className="text-sm font-medium">
                              {session.duration}m
                            </span>
                          </div>
                          {session.note && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {session.note}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {formatDate(session.started_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Timer Settings</CardTitle>
              <CardDescription>
                Customize your Pomodoro timer preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="focus-duration">Focus Duration (minutes)</Label>
                  <Input
                    id="focus-duration"
                    type="number"
                    min="1"
                    max="120"
                    value={settingsValues.focus_duration}
                    onChange={(e) => setSettingsValues(prev => ({ 
                      ...prev, 
                      focus_duration: parseInt(e.target.value) || 25 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="short-break">Short Break (minutes)</Label>
                  <Input
                    id="short-break"
                    type="number"
                    min="1"
                    max="60"
                    value={settingsValues.short_break_duration}
                    onChange={(e) => setSettingsValues(prev => ({ 
                      ...prev, 
                      short_break_duration: parseInt(e.target.value) || 5 
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="long-break">Long Break (minutes)</Label>
                  <Input
                    id="long-break"
                    type="number"
                    min="1"
                    max="120"
                    value={settingsValues.long_break_duration}
                    onChange={(e) => setSettingsValues(prev => ({ 
                      ...prev, 
                      long_break_duration: parseInt(e.target.value) || 15 
                    }))}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="daily-goal">Daily Goal (sessions)</Label>
                  <Input
                    id="daily-goal"
                    type="number"
                    min="1"
                    max="20"
                    value={settingsValues.daily_goal}
                    onChange={(e) => setSettingsValues(prev => ({ 
                      ...prev, 
                      daily_goal: parseInt(e.target.value) || 8 
                    }))}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-start breaks</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically start break sessions
                      </p>
                    </div>
                    <Switch
                      checked={settingsValues.auto_start_breaks}
                      onCheckedChange={(checked) => 
                        setSettingsValues(prev => ({ ...prev, auto_start_breaks: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-start focus</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically start focus sessions after breaks
                      </p>
                    </div>
                    <Switch
                      checked={settingsValues.auto_start_focus}
                      onCheckedChange={(checked) => 
                        setSettingsValues(prev => ({ ...prev, auto_start_focus: checked }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sound notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Play sound when sessions complete
                      </p>
                    </div>
                    <Switch
                      checked={settingsValues.sound_enabled}
                      onCheckedChange={(checked) => 
                        setSettingsValues(prev => ({ ...prev, sound_enabled: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Button onClick={handleSettingsUpdate} className="w-full">
                Save Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}