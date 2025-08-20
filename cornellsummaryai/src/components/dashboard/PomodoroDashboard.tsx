import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  SkipForward,
  Timer,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle,
  Settings,
  Volume2,
  VolumeX,
  Coffee,
  Brain,
  Zap
} from 'lucide-react';
import { useGlobalPomodoro } from '@/hooks/useGlobalPomodoro';

const SESSION_COLORS = {
  focus: { bg: 'bg-red-500', light: 'bg-red-100 dark:bg-red-950', text: 'text-red-700 dark:text-red-300' },
  shortBreak: { bg: 'bg-green-500', light: 'bg-green-100 dark:bg-green-950', text: 'text-green-700 dark:text-green-300' },
  longBreak: { bg: 'bg-blue-500', light: 'bg-blue-100 dark:bg-blue-950', text: 'text-blue-700 dark:text-blue-300' },
};

const SESSION_LABELS = {
  focus: 'Focus Session',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

const SESSION_ICONS = {
  focus: Brain,
  shortBreak: Coffee,
  longBreak: Zap,
};

interface PomodoroDashboardProps {
  onNavigate?: (path: string) => void;
  desktopSidebarOpen?: boolean;
  onDesktopSidebarToggle?: () => void;
}

export function PomodoroDashboard({ 
  onNavigate, 
  desktopSidebarOpen, 
  onDesktopSidebarToggle 
}: PomodoroDashboardProps = {}) {
  const { 
    state, 
    startTimer, 
    pauseTimer, 
    resetTimer, 
    skipSession, 
    updateSettings,
    updateSessionNote,
    getTodaySessions
  } = useGlobalPomodoro();

  // Hydration state to prevent SSR mismatch
  const [isHydrated, setIsHydrated] = useState(false);

  // Initialize session note from state
  const [sessionNote, setSessionNote] = useState(state.currentSessionNote);
  
  // Use hydration-safe today sessions data
  const todaySessions = isHydrated ? getTodaySessions() : [];

  // Handle hydration
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Sync session note with state when session changes
  React.useEffect(() => {
    setSessionNote(state.currentSessionNote);
  }, [state.currentSessionId, state.currentSessionNote]);

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

  const handleSettingChange = (key: keyof typeof state.settings, value: any) => {
    updateSettings({ [key]: value });
  };

  // Use default values during server-side rendering to prevent hydration mismatch
  const sessionType = isHydrated ? state.sessionType : 'focus';
  const SessionIcon = SESSION_ICONS[sessionType];
  const colors = SESSION_COLORS[sessionType];

  // Use hardcoded defaults for SSR to avoid localStorage mismatches
  const DEFAULT_FOCUS_MINUTES = 25;
  const DEFAULT_SHORT_BREAK_MINUTES = 5;
  const DEFAULT_LONG_BREAK_MINUTES = 15;
  
  // Calculate durations with SSR-safe defaults
  const focusDuration = isHydrated ? state.settings.focusDuration : DEFAULT_FOCUS_MINUTES;
  const shortBreakDuration = isHydrated ? state.settings.shortBreakDuration : DEFAULT_SHORT_BREAK_MINUTES;
  const longBreakDuration = isHydrated ? state.settings.longBreakDuration : DEFAULT_LONG_BREAK_MINUTES;

  // Calculate progress
  const totalDuration = sessionType === 'focus' 
    ? focusDuration * 60
    : sessionType === 'shortBreak'
    ? shortBreakDuration * 60
    : longBreakDuration * 60;
  
  const timeRemaining = isHydrated ? state.timeRemaining : DEFAULT_FOCUS_MINUTES * 60;
  const progress = ((totalDuration - timeRemaining) / totalDuration) * 100;
  
  // Use default values for localStorage-dependent data during SSR
  const sessionsCompleted = isHydrated ? state.sessionsCompleted : 0;
  const dailyGoal = isHydrated ? state.settings.dailyGoal : 8; // Default daily goal
  const dailyProgress = (sessionsCompleted / dailyGoal) * 100;

  return (
    <div className="h-full overflow-y-auto">
      <div className="container max-w-6xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pomodoro Timer</h2>
          <p className="text-muted-foreground">
            Stay focused and productive with the Pomodoro Technique
          </p>
        </div>

        {/* Main Timer Card */}
        <Card className={cn("relative overflow-hidden", colors.light)}>
          <div className={cn("absolute inset-x-0 top-0 h-1", colors.bg)} 
               style={{ width: `${progress}%` }} />
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <div className={cn("p-4 rounded-full", colors.light)}>
                <SessionIcon className={cn("h-12 w-12", colors.text)} />
              </div>
            </div>
            <CardTitle className="text-2xl">{SESSION_LABELS[sessionType]}</CardTitle>
            <CardDescription>
              Session {sessionsCompleted + 1} of {dailyGoal}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Timer Display */}
            <div className="text-center">
              <div className="text-7xl font-bold font-mono mb-2">
                {formatTime(timeRemaining)}
              </div>
              {isHydrated && state.isRunning && (
                <div className="flex justify-center gap-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-75" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-pulse delay-150" />
                </div>
              )}
            </div>

            {/* Control Buttons */}
            <div className="flex justify-center gap-3">
              <Button
                size="lg"
                onClick={toggleTimer}
                className="min-w-32"
              >
                {isHydrated && state.isRunning ? (
                  <>
                    <Pause className="mr-2 h-5 w-5" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-5 w-5" />
                    Start
                  </>
                )}
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={resetTimer}
              >
                <RotateCcw className="mr-2 h-5 w-5" />
                Reset
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={skipSession}
              >
                <SkipForward className="mr-2 h-5 w-5" />
                Skip
              </Button>
            </div>

            {/* Session Note */}
            {sessionType === 'focus' && (
              <div className="space-y-2">
                <Label htmlFor="session-note">Session Note (optional)</Label>
                <Input
                  id="session-note"
                  placeholder="What are you working on?"
                  value={sessionNote}
                  onChange={(e) => {
                    setSessionNote(e.target.value);
                    updateSessionNote(e.target.value);
                  }}
                />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Daily Progress */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Daily Goal</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {sessionsCompleted} / {dailyGoal}
              </div>
              <Progress value={dailyProgress} className="h-2 mb-2" />
              <p className="text-xs text-muted-foreground">
                {dailyGoal - sessionsCompleted} sessions remaining
              </p>
            </CardContent>
          </Card>

          {/* Today's Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Today's Focus</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                {Math.floor(todaySessions.reduce((acc: number, s) => acc + s.duration, 0) / 60)}h {todaySessions.reduce((acc: number, s) => acc + s.duration, 0) % 60}m
              </div>
              <p className="text-xs text-muted-foreground">
                {todaySessions.length} total sessions
              </p>
            </CardContent>
          </Card>

          {/* Weekly Stats */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">This Week</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-2">
                0h 0m
              </div>
              <p className="text-xs text-muted-foreground">
                0% completion rate
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Settings and History Tabs */}
        <Tabs defaultValue="history" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="history">History</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Sessions</CardTitle>
                <CardDescription>Your pomodoro sessions from today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {todaySessions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No sessions completed yet today
                    </p>
                  ) : (
                    todaySessions.slice(0, 10).map((session, index) => (
                      <div key={session.id || index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-full", SESSION_COLORS[session.type].light)}>
                            {React.createElement(SESSION_ICONS[session.type], {
                              className: cn("h-4 w-4", SESSION_COLORS[session.type].text)
                            })}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{SESSION_LABELS[session.type]}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(session.started_at).toLocaleTimeString()} - {session.duration} min
                            </p>
                            {session.note && (
                              <p className="text-xs mt-1">{session.note}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant={session.was_completed ? "default" : "secondary"}>
                          {session.was_completed ? "Completed" : "Skipped"}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Timer Settings</CardTitle>
                <CardDescription>Customize your pomodoro timer durations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label htmlFor="focus-duration">Focus Duration (minutes)</Label>
                    <Input
                      id="focus-duration"
                      type="number"
                      min="1"
                      max="60"
                      value={focusDuration}
                      onChange={(e) => handleSettingChange('focusDuration', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="short-break">Short Break (minutes)</Label>
                    <Input
                      id="short-break"
                      type="number"
                      min="1"
                      max="30"
                      value={shortBreakDuration}
                      onChange={(e) => handleSettingChange('shortBreakDuration', parseInt(e.target.value))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="long-break">Long Break (minutes)</Label>
                    <Input
                      id="long-break"
                      type="number"
                      min="1"
                      max="60"
                      value={longBreakDuration}
                      onChange={(e) => handleSettingChange('longBreakDuration', parseInt(e.target.value))}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-start Breaks</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically start break timers
                      </p>
                    </div>
                    <Switch
                      checked={isHydrated ? state.settings.autoStartBreaks : false}
                      onCheckedChange={(checked) => handleSettingChange('autoStartBreaks', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-start Focus Sessions</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically start focus after breaks
                      </p>
                    </div>
                    <Switch
                      checked={isHydrated ? state.settings.autoStartFocus : false}
                      onCheckedChange={(checked) => handleSettingChange('autoStartFocus', checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Sound Notifications</Label>
                      <p className="text-xs text-muted-foreground">
                        Play sound when sessions complete
                      </p>
                    </div>
                    <Switch
                      checked={isHydrated ? state.settings.soundEnabled : true}
                      onCheckedChange={(checked) => handleSettingChange('soundEnabled', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="daily-goal">Daily Goal (focus sessions)</Label>
                  <Input
                    id="daily-goal"
                    type="number"
                    min="1"
                    max="20"
                    value={dailyGoal}
                    onChange={(e) => handleSettingChange('dailyGoal', parseInt(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground">
                    Target number of focus sessions per day
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}