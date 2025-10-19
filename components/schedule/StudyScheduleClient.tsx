"use client";

import React, { useState, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek, endOfWeek, addWeeks, subWeeks } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { HorizontalTimeline, TimelineSession } from '@/components/schedule/HorizontalTimeline';
import { SessionDialog, SessionDialogData } from '@/components/schedule/SessionDialog';
import { AIScheduleGenerator } from '@/components/schedule/AIScheduleGenerator';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Clock, 
  BookOpen,
  Target,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  WandSparkles,
  CalendarDays,
  ChevronDown
} from 'lucide-react';

// Study session types
export type StudySessionType = 'lecture' | 'study' | 'review' | 'exam-prep' | 'break';

export interface StudySession {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: StudySessionType;
  subject?: string;
  description?: string;
  completed?: boolean;
  lectureId?: string;
}

// Clean, minimal session colors - consistent with timeline
const sessionColors = {
  lecture: 'bg-blue-50 border-l-4 border-blue-500 text-blue-900',
  study: 'bg-green-50 border-l-4 border-green-500 text-green-900', 
  review: 'bg-orange-50 border-l-4 border-orange-500 text-orange-900',
  'exam-prep': 'bg-purple-50 border-l-4 border-purple-500 text-purple-900',
  break: 'bg-gray-50 border-l-4 border-gray-400 text-gray-700',
};

const sessionTypeLabels = {
  lecture: 'Lecture',
  study: 'Study Session',
  review: 'Review',
  'exam-prep': 'Exam Prep',
  break: 'Break',
};

export function StudyScheduleClient() {
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [selectedSession, setSelectedSession] = useState<StudySession | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [showSessionDialog, setShowSessionDialog] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [dialogInitialData, setDialogInitialData] = useState<Partial<SessionDialogData> | undefined>();
  const [selectedTime, setSelectedTime] = useState<Date | undefined>();
  const supabase = createClient();

  // Load study sessions from database
  const loadSessions = async () => {
    console.log('📋 LoadSessions called - fetching from API...');
    try {
      setLoading(true);
      const response = await fetch('/api/study-sessions');
      const data = await response.json();
      console.log('📋 LoadSessions API response:', { success: data.success, count: data.sessions?.length });

      if (data.success) {
        // Convert database format to component format
        const formattedSessions = data.sessions.map((session: any) => ({
          id: session.id,
          title: session.title,
          start: new Date(session.start_time),
          end: new Date(session.end_time),
          type: session.session_type,
          subject: session.subject,
          description: session.description,
          completed: session.completed,
          lectureId: session.lecture_id
        }));
        console.log('📋 LoadSessions setting sessions:', formattedSessions.length, 'sessions');
        setSessions(formattedSessions);
      } else {
        // Fallback to sample data if no sessions in database
        loadSampleData();
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      toast.error('Failed to load study sessions');
      // Fallback to sample data on error
      loadSampleData();
    } finally {
      setLoading(false);
    }
  };

  // Sample data fallback
  const loadSampleData = () => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const sampleSessions: StudySession[] = [
      {
        id: 'sample-1',
        title: 'CPE Protein Metabolism',
        start: new Date(today.getTime() + (1 * 24 * 60 * 60 * 1000) + (9 * 60 * 60 * 1000)), // Tomorrow 9:00 AM
        end: new Date(today.getTime() + (1 * 24 * 60 * 60 * 1000) + (11 * 60 * 60 * 1000)),   // Tomorrow 11:00 AM
        type: 'study',
        subject: 'Biochemistry',
        description: 'Deep dive into protein synthesis pathways'
      },
      {
        id: 'sample-2',
        title: 'Chemistry Lecture Review',
        start: new Date(today.getTime() + (1 * 24 * 60 * 60 * 1000) + (14 * 60 * 60 * 1000)), // Tomorrow 2:00 PM
        end: new Date(today.getTime() + (1 * 24 * 60 * 60 * 1000) + (16 * 60 * 60 * 1000)),   // Tomorrow 4:00 PM
        type: 'review',
        subject: 'Chemistry',
        description: 'Review enzyme kinetics concepts'
      },
      {
        id: 'sample-3',
        title: 'Nutrition Study Session',
        start: new Date(today.getTime() + (2 * 24 * 60 * 60 * 1000) + (10 * 60 * 60 * 1000)), // Day after tomorrow 10:00 AM
        end: new Date(today.getTime() + (2 * 24 * 60 * 60 * 1000) + (12 * 60 * 60 * 1000)),   // Day after tomorrow 12:00 PM
        type: 'study',
        subject: 'Nutrition',
        description: 'Micronutrients and metabolism'
      },
      {
        id: 'sample-4',
        title: 'Exam Preparation',
        start: new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000) + (15 * 60 * 60 * 1000)), // 3 days from now 3:00 PM
        end: new Date(today.getTime() + (3 * 24 * 60 * 60 * 1000) + (18 * 60 * 60 * 1000)),   // 3 days from now 6:00 PM
        type: 'exam-prep',
        subject: 'Biology',
        description: 'Final review for upcoming exam'
      }
    ];
    setSessions(sampleSessions);
  };

  useEffect(() => {
    loadSessions();
    
    // Listen for calendar refresh events from CommandBar
    const handleRefresh = () => {
      loadSessions();
    };
    
    window.addEventListener('calendar-refresh', handleRefresh);
    return () => window.removeEventListener('calendar-refresh', handleRefresh);
  }, []);

  // Add keyboard shortcuts for week navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts if not typing in an input
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (event.altKey && event.key === 'ArrowLeft') {
        event.preventDefault();
        setSelectedDate(subWeeks(selectedDate, 1));
      } else if (event.altKey && event.key === 'ArrowRight') {
        event.preventDefault();
        setSelectedDate(addWeeks(selectedDate, 1));
      } else if (event.altKey && (event.key === 't' || event.key === 'T')) {
        event.preventDefault();
        setSelectedDate(new Date());
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedDate]);

  // Handle event selection
  const handleSelectEvent = (event: StudySession) => {
    setSelectedSession(event);
  };

  // Handle session drop on timeline
  const handleSessionDrop = async (sessionId: string, newStart: Date, newEnd: Date) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    // Update UI immediately for responsive feel
    const updatedSessions = sessions.map(s => 
      s.id === sessionId 
        ? { ...s, start: newStart, end: newEnd }
        : s
    );
    setSessions(updatedSessions);

    // Only save to database if it's not a sample session
    if (!sessionId.startsWith('sample-')) {
      try {
        const response = await fetch('/api/study-sessions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sessionId,
            start_time: newStart.toISOString(),
            end_time: newEnd.toISOString()
          })
        });

        if (!response.ok) {
          throw new Error('Failed to update session');
        }

        toast.success('Session moved successfully');
      } catch (error) {
        console.error('Error updating session:', error);
        toast.error('Failed to update session');
        // Revert the change on error
        setSessions(sessions);
      }
    }
  };

  // Handle clicking on timeline to create new session
  const handleTimeSlotClick = (time: Date) => {
    setSelectedTime(time);
    setDialogInitialData(undefined);
    setShowSessionDialog(true);
  };

  // Handle saving session from dialog
  const handleSaveSession = async (sessionData: SessionDialogData) => {
    console.log('💾 Saving session data:', { id: sessionData.id, title: sessionData.title, hasId: !!sessionData.id });
    try {
      if (sessionData.id) {
        // Update existing session
        console.log('🔄 Making PUT request to update session:', sessionData.id);
        const response = await fetch('/api/study-sessions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: sessionData.id,
            title: sessionData.title,
            start_time: sessionData.start.toISOString(),
            end_time: sessionData.end.toISOString(),
            session_type: sessionData.type,
            subject: sessionData.subject,
            description: sessionData.description,
            lecture_id: sessionData.lectureId,
            user_folder_id: sessionData.userFolderId
          })
        });

        console.log('📡 PUT response status:', response.status, response.ok);
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ PUT request failed:', errorText);
          throw new Error('Failed to update session');
        }
        toast.success('Session updated successfully');
      } else {
        // Create new session
        const response = await fetch('/api/study-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: sessionData.title,
            start_time: sessionData.start.toISOString(),
            end_time: sessionData.end.toISOString(),
            session_type: sessionData.type,
            subject: sessionData.subject,
            description: sessionData.description,
            lecture_id: sessionData.lectureId,
            user_folder_id: sessionData.userFolderId
          })
        });

        if (!response.ok) throw new Error('Failed to create session');
        toast.success('Session created successfully');
      }

      // Reload sessions to reflect changes
      console.log('🔄 Reloading sessions after successful save...');
      await loadSessions();
      
    } catch (error) {
      console.error('Error saving session:', error);
      toast.error('Failed to save session');
      throw error; // Re-throw so dialog can handle it
    }
  };

  // Handle editing session from context menu
  const handleEditSession = (session: TimelineSession) => {
    console.log('🔧 Editing session:', { id: session.id, title: session.title });
    setDialogInitialData({
      id: session.id,
      title: session.title,
      start: session.start,
      end: session.end,
      type: session.type,
      subject: session.subject,
      description: session.description,
      lectureId: session.lectureId
    });
    setShowSessionDialog(true);
  };

  // Handle applying AI-generated schedule
  const handleApplyAISchedule = async (generatedSessions: any[]) => {
    try {
      // Create all sessions in batch
      for (const session of generatedSessions) {
        await fetch('/api/study-sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: session.title,
            start_time: new Date(session.start).toISOString(),
            end_time: new Date(session.end).toISOString(),
            session_type: session.type,
            subject: session.subject,
            description: session.description
          })
        });
      }
      
      // Reload sessions to show new schedule
      await loadSessions();
      setShowAIGenerator(false);
    } catch (error) {
      console.error('Error applying AI schedule:', error);
      toast.error('Failed to apply schedule');
    }
  };

  // Handle deleting session
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Are you sure you want to delete this session?')) return;
    
    try {
      const response = await fetch(`/api/study-sessions?id=${encodeURIComponent(sessionId)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      });

      if (!response.ok) throw new Error('Failed to delete session');
      
      toast.success('Session deleted successfully');
      await loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast.error('Failed to delete session');
    }
  };

  // Handle duplicating session
  const handleDuplicateSession = (session: TimelineSession) => {
    const newStart = new Date(session.start.getTime() + 24 * 60 * 60 * 1000); // Next day
    const newEnd = new Date(session.end.getTime() + 24 * 60 * 60 * 1000);
    
    setDialogInitialData({
      title: `${session.title} (Copy)`,
      start: newStart,
      end: newEnd,
      type: session.type,
      subject: session.subject,
      description: session.description,
      lectureId: session.lectureId
    });
    setShowSessionDialog(true);
  };

  // Calculate weekly stats
  const weeklyStats = {
    totalHours: sessions.reduce((total, session) => {
      const duration = (session.end.getTime() - session.start.getTime()) / (1000 * 60 * 60);
      return total + duration;
    }, 0),
    sessionsCount: sessions.length,
    completedSessions: sessions.filter(s => s.completed).length
  };

  return (
    <div className="container mx-auto p-6 flex flex-col h-full min-h-[80vh]">
      {/* Compact Header with Integrated Stats */}
      <div className="mb-6">
        {/* Main Header Row */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-primary" />
              Study Schedule
            </h1>
            
            {/* Inline Stats */}
            <div className="hidden md:flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span className="text-muted-foreground">
                  {Math.round(weeklyStats.totalHours)}h total
                </span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-secondary-foreground" />
                <span className="text-muted-foreground">
                  {weeklyStats.sessionsCount} sessions
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-purple-500" />
                <span className="text-muted-foreground">
                  {weeklyStats.sessionsCount > 0 
                    ? Math.round((weeklyStats.completedSessions / weeklyStats.sessionsCount) * 100)
                    : 0}% complete
                </span>
              </div>
            </div>
          </div>
        
          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            {loading && (
              <Button variant="outline" size="sm" disabled>
                Loading...
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0 hover:from-purple-600 hover:to-pink-600"
              onClick={() => setShowAIGenerator(true)}
            >
              <WandSparkles className="w-4 h-4" />
              AI Schedule
            </Button>
            <Button 
              size="sm"
              className="gap-2"
              onClick={() => {
                setSelectedTime(new Date());
                setDialogInitialData(undefined);
                setShowSessionDialog(true);
              }}
            >
              <Plus className="w-4 h-4" />
              Add Session
            </Button>
          </div>
        </div>

        {/* Modern Week Navigation Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Navigation button group with modern styling */}
            <div className="flex items-center bg-muted rounded-xl p-1 shadow-sm">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDate(subWeeks(selectedDate, 1))}
                title="Previous week"
                className="h-8 w-8 p-0 hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                className="h-8 px-4 text-xs font-medium hover:bg-accent rounded-lg transition-colors mx-1"
              >
                Today
              </Button>
              
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}
                title="Next week"
                className="h-8 w-8 p-0 hover:bg-accent rounded-lg transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
            
            {/* Modern week display */}
            <div className="text-left">
              <div className="text-lg font-semibold text-foreground leading-tight">
                {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM dd')} - {format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMM dd, yyyy')}
              </div>
              <div className="text-xs text-muted-foreground">
                Week of {format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'MMMM dd')}
              </div>
            </div>
            
            {/* Modern date picker */}
            <div className="relative ml-4">
              <CalendarDays className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={format(selectedDate, 'yyyy-MM-dd')}
                onChange={(e) => setSelectedDate(new Date(e.target.value))}
                className="pl-10 pr-4 py-2.5 text-sm border border-gray-200 dark:border-gray-600 rounded-xl bg-card text-foreground focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
                title="Jump to specific date"
              />
            </div>
          </div>

          {/* Modern keyboard shortcuts hint */}
          <div className="text-xs text-muted-foreground hidden lg:flex items-center gap-2 bg-muted px-4 py-2 rounded-xl shadow-sm">
            <span className="text-sm">💡</span>
            <span>Alt + ← → for weeks, Alt + T for today</span>
          </div>
        </div>
      </div>

      {/* Main Calendar - Now takes up most of the screen */}
      <div className="flex-1">
        {loading ? (
          /* Calendar skeleton loading state */
          <div className="w-full bg-background border border-border rounded-lg overflow-hidden">
            <div className="p-4 border-b border-border">
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48" />
            </div>
            
            <div className="p-4 space-y-4">
              {/* Day headers skeleton */}
              <div className="grid grid-cols-8 gap-2">
                <Skeleton className="h-8 w-16" />
                {Array.from({ length: 7 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
              
              {/* Time slots skeleton */}
              {Array.from({ length: 8 }).map((_, hour) => (
                <div key={hour} className="grid grid-cols-8 gap-2">
                  <Skeleton className="h-16 w-16" />
                  {Array.from({ length: 7 }).map((_, day) => (
                    <div key={day} className="relative h-16">
                      {(hour + day) % 3 === 0 && (
                        <Skeleton className="absolute inset-1 h-12 rounded" />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <HorizontalTimeline
            sessions={sessions.map(session => ({
              ...session,
              type: session.type as TimelineSession['type']
            }))}
            selectedDate={selectedDate}
            onSessionDrop={handleSessionDrop}
            onSessionClick={handleSelectEvent}
            onSessionEdit={handleEditSession}
            onSessionDelete={handleDeleteSession}
            onSessionDuplicate={handleDuplicateSession}
            onTimeSlotClick={handleTimeSlotClick}
          />
        )}
      </div>

      {/* Session Details Modal/Panel */}
      {selectedSession && (
        <Card className="fixed inset-x-4 bottom-4 z-50 md:relative md:inset-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Badge variant="outline" className={sessionColors[selectedSession.type]}>
                  {sessionTypeLabels[selectedSession.type]}
                </Badge>
                {selectedSession.title}
              </span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedSession(null)}
              >
                ×
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Time</p>
                <p className="font-medium">
                  {format(selectedSession.start, 'MMM dd, h:mm a')} - {format(selectedSession.end, 'h:mm a')}
                </p>
              </div>
              
              {selectedSession.subject && (
                <div>
                  <p className="text-sm text-muted-foreground">Subject</p>
                  <p className="font-medium">{selectedSession.subject}</p>
                </div>
              )}
              
              {selectedSession.description && (
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p className="font-medium">{selectedSession.description}</p>
                </div>
              )}

              <div className="flex gap-2 pt-3">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {
                    setDialogInitialData({
                      id: selectedSession.id,
                      title: selectedSession.title,
                      start: selectedSession.start,
                      end: selectedSession.end,
                      type: selectedSession.type,
                      subject: selectedSession.subject,
                      description: selectedSession.description,
                      lectureId: selectedSession.lectureId,
                      userFolderId: (selectedSession as any).userFolderId
                    });
                    setSelectedTime(undefined);
                    setShowSessionDialog(true);
                  }}
                >
                  Edit Session
                </Button>
                <Button size="sm" variant="outline">
                  Start Study
                </Button>
                {!selectedSession.completed && (
                  <Button size="sm">
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Creation/Edit Dialog */}
      <SessionDialog
        isOpen={showSessionDialog}
        onClose={() => setShowSessionDialog(false)}
        onSave={handleSaveSession}
        initialData={dialogInitialData}
        selectedTime={selectedTime}
      />

      {/* AI Schedule Generator Dialog */}
      <AIScheduleGenerator
        isOpen={showAIGenerator}
        onClose={() => setShowAIGenerator(false)}
        onApplySchedule={handleApplyAISchedule}
      />
    </div>
  );
}