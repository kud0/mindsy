"use client";

import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, isSameDay, isToday, addMinutes, startOfDay, setHours } from 'date-fns';
import { Edit, Trash2, Copy, Calendar, Clock, BookOpen, Target } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';

export interface TimelineSession {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lecture' | 'study' | 'review' | 'exam-prep' | 'break';
  subject?: string;
  description?: string;
  completed?: boolean;
  lectureId?: string;
}

interface HorizontalTimelineProps {
  sessions: TimelineSession[];
  selectedDate: Date;
  onSessionDrop?: (sessionId: string, newStart: Date, newEnd: Date) => void;
  onSessionClick?: (session: TimelineSession) => void;
  onSessionEdit?: (session: TimelineSession) => void;
  onSessionDelete?: (sessionId: string) => void;
  onSessionDuplicate?: (session: TimelineSession) => void;
  onTimeSlotClick?: (time: Date) => void;
}

// Clean, minimal session colors - simplified for readability
const sessionColors = {
  lecture: 'bg-blue-50 border-l-4 border-blue-500 text-blue-900',
  study: 'bg-green-50 border-l-4 border-green-500 text-green-900', 
  review: 'bg-orange-50 border-l-4 border-orange-500 text-orange-900',
  'exam-prep': 'bg-purple-50 border-l-4 border-purple-500 text-purple-900',
  break: 'bg-gray-50 border-l-4 border-gray-400 text-gray-700',
};

interface ContextMenuState {
  isOpen: boolean;
  x: number;
  y: number;
  session: TimelineSession | null;
}

export function HorizontalTimeline({ 
  sessions, 
  selectedDate, 
  onSessionDrop, 
  onSessionClick,
  onSessionEdit,
  onSessionDelete,
  onSessionDuplicate,
  onTimeSlotClick 
}: HorizontalTimelineProps) {
  const [draggedSession, setDraggedSession] = useState<TimelineSession | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ day: number; hour: number } | null>(null);
  const [currentTime, setCurrentTime] = useState<Date | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    isOpen: false,
    x: 0,
    y: 0,
    session: null
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  
  // Resize states
  const [resizingSession, setResizingSession] = useState<{
    session: TimelineSession;
    handle: 'top' | 'bottom';
    startY: number;
    originalStart: Date;
    originalEnd: Date;
  } | null>(null);

  // Set up client-side time tracking
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(new Date());
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Close context menu when clicking outside and handle resize events
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(prev => ({ ...prev, isOpen: false }));
        setResizingSession(null);
      }
      // Delete key to delete selected session
      if (event.key === 'Delete' && contextMenu.session && onSessionDelete) {
        onSessionDelete(contextMenu.session.id);
        setContextMenu(prev => ({ ...prev, isOpen: false }));
      }
    };

    if (contextMenu.isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [contextMenu.isOpen, contextMenu.session, onSessionDelete]);

  // Handle resize mouse events
  useEffect(() => {
    if (resizingSession) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      document.body.style.cursor = resizingSession.handle === 'top' || resizingSession.handle === 'bottom' ? 'ns-resize' : 'default';
      
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
        document.body.style.cursor = 'default';
      };
    }
  }, [resizingSession]);

  // Generate week dates starting from Monday
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  // Generate time slots from 6 AM to 11 PM
  const startHour = 6;
  const endHour = 23;
  const timeSlots = Array.from({ length: endHour - startHour + 1 }, (_, i) => startHour + i);

  // Filter sessions for the current week
  const weekSessions = sessions.filter(session => {
    const sessionDay = startOfDay(session.start);
    return weekDays.some(day => isSameDay(sessionDay, day));
  });

  // Get sessions that START in a specific day and hour (to avoid duplicates)
  const getSessionsForSlot = (day: Date, hour: number) => {
    return weekSessions.filter(session => {
      const sessionStart = session.start;
      const slotStart = setHours(startOfDay(day), hour);
      const slotEnd = setHours(startOfDay(day), hour + 1);
      
      // Only show session in the slot where it starts
      return isSameDay(sessionStart, day) && 
             sessionStart >= slotStart && 
             sessionStart < slotEnd;
    });
  };


  // Handle drag start
  const handleDragStart = (e: React.DragEvent, session: TimelineSession) => {
    setDraggedSession(session);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drop on time slot
  const handleDrop = (day: Date, hour: number) => {
    if (!draggedSession || !onSessionDrop) return;

    const newStartTime = setHours(startOfDay(day), hour);
    const duration = draggedSession.end.getTime() - draggedSession.start.getTime();
    const newEndTime = new Date(newStartTime.getTime() + duration);

    onSessionDrop(draggedSession.id, newStartTime, newEndTime);
    setDraggedSession(null);
    setDragOverSlot(null);
  };

  const handleDragOver = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ day: day.getDay(), hour });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  // Handle time slot click for creating new sessions
  const handleTimeSlotClick = (day: Date, hour: number) => {
    const clickTime = setHours(startOfDay(day), hour);
    if (onTimeSlotClick) {
      onTimeSlotClick(clickTime);
    }
  };

  // Handle resize start
  const handleResizeStart = (e: React.MouseEvent, session: TimelineSession, handle: 'top' | 'bottom') => {
    e.preventDefault();
    e.stopPropagation();
    
    setResizingSession({
      session,
      handle,
      startY: e.clientY,
      originalStart: new Date(session.start),
      originalEnd: new Date(session.end)
    });
  };

  // Handle resize during mouse move
  const handleResizeMove = (e: MouseEvent) => {
    if (!resizingSession) return;

    const deltaY = e.clientY - resizingSession.startY;
    const hourHeight = 60; // Height of each hour slot
    const fifteenMinuteHeight = hourHeight / 4; // 15 minutes = 1/4 of hour slot
    const fifteenMinutesChanged = Math.round(deltaY / fifteenMinuteHeight);
    
    let newStart = new Date(resizingSession.originalStart);
    let newEnd = new Date(resizingSession.originalEnd);

    if (resizingSession.handle === 'top') {
      // Dragging top handle - change start time in 15-minute increments
      newStart = new Date(resizingSession.originalStart.getTime() + (fifteenMinutesChanged * 15 * 60 * 1000));
      // Ensure start is before end and minimum 15 minutes duration
      if (newStart >= newEnd) {
        newStart = new Date(newEnd.getTime() - 15 * 60 * 1000);
      }
    } else {
      // Dragging bottom handle - change end time in 15-minute increments
      newEnd = new Date(resizingSession.originalEnd.getTime() + (fifteenMinutesChanged * 15 * 60 * 1000));
      // Ensure end is after start and minimum 15 minutes duration
      if (newEnd <= newStart) {
        newEnd = new Date(newStart.getTime() + 15 * 60 * 1000);
      }
    }

    // Update the session temporarily for visual feedback
    const updatedSessions = sessions.map(s => 
      s.id === resizingSession.session.id 
        ? { ...s, start: newStart, end: newEnd }
        : s
    );
    
    // Note: We'd need to lift this state up to parent or use a different approach
    // For now, we'll handle the update on mouse up
  };

  // Handle resize end
  const handleResizeEnd = (e: MouseEvent) => {
    if (!resizingSession || !onSessionDrop) {
      setResizingSession(null);
      return;
    }

    const deltaY = e.clientY - resizingSession.startY;
    const hourHeight = 60;
    const fifteenMinuteHeight = hourHeight / 4; // 15 minutes = 1/4 of hour slot
    const fifteenMinutesChanged = Math.round(deltaY / fifteenMinuteHeight);
    
    let newStart = new Date(resizingSession.originalStart);
    let newEnd = new Date(resizingSession.originalEnd);

    if (resizingSession.handle === 'top') {
      newStart = new Date(resizingSession.originalStart.getTime() + (fifteenMinutesChanged * 15 * 60 * 1000));
      if (newStart >= newEnd) {
        newStart = new Date(newEnd.getTime() - 15 * 60 * 1000);
      }
    } else {
      newEnd = new Date(resizingSession.originalEnd.getTime() + (fifteenMinutesChanged * 15 * 60 * 1000));
      if (newEnd <= newStart) {
        newEnd = new Date(newStart.getTime() + 15 * 60 * 1000);
      }
    }

    // Only update if there was a meaningful change
    if (newStart.getTime() !== resizingSession.originalStart.getTime() || 
        newEnd.getTime() !== resizingSession.originalEnd.getTime()) {
      onSessionDrop(resizingSession.session.id, newStart, newEnd);
    }

    setResizingSession(null);
  };

  // Handle right-click context menu
  const handleContextMenu = (e: React.MouseEvent, session: TimelineSession) => {
    e.preventDefault();
    e.stopPropagation();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Adjust position to keep menu on screen
    const menuWidth = 200;
    const menuHeight = 160;
    const adjustedX = x + menuWidth > window.innerWidth ? x - menuWidth : x;
    const adjustedY = y + menuHeight > window.innerHeight ? y - menuHeight : y;
    
    setContextMenu({
      isOpen: true,
      x: adjustedX,
      y: adjustedY,
      session
    });
  };

  // Context menu actions
  const handleEdit = () => {
    if (contextMenu.session && onSessionEdit) {
      onSessionEdit(contextMenu.session);
    }
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const handleDelete = () => {
    if (contextMenu.session && onSessionDelete) {
      onSessionDelete(contextMenu.session.id);
    }
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  const handleDuplicate = () => {
    if (contextMenu.session && onSessionDuplicate) {
      onSessionDuplicate(contextMenu.session);
    }
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full bg-background border border-border rounded-lg overflow-hidden">
      {/* Calendar instructions */}
      <div className="px-4 py-2 border-b border-border bg-muted">
        <p className="text-sm text-muted-foreground text-center">
          Click any time slot to add session • Drag sessions to reschedule
        </p>
      </div>

      {/* Week grid container */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Day headers - cleaner styling */}
          <div className="grid grid-cols-8 border-b border-border/50">
            <div className="p-3 bg-muted/50 border-r border-border/30">
              <span className="text-sm font-medium text-muted-foreground">Time</span>
            </div>
            {weekDays.map((day, index) => (
              <div
                key={index}
                className={`p-3 text-center border-r border-border/30 ${
                  isToday(day) 
                    ? 'bg-blue-50' 
                    : 'bg-muted/30'
                }`}
              >
                <div className={`font-medium ${isToday(day) ? 'text-primary' : 'text-foreground'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-sm ${isToday(day) ? 'text-primary' : 'text-muted-foreground'}`}>
                  {format(day, 'd')}
                </div>
              </div>
            ))}
          </div>

          {/* Time slots grid - reduced visual noise */}
          {timeSlots.map((hour) => (
            <div key={hour} className="grid grid-cols-8 border-b border-border/30">
              {/* Time label */}
              <div className="p-3 bg-muted/20 border-r border-border/30">
                <span className="text-sm text-muted-foreground font-medium">
                  {format(setHours(new Date(), hour), 'h a')}
                </span>
              </div>
              
              {/* Day slots */}
              {weekDays.map((day, dayIndex) => {
                const slotSessions = getSessionsForSlot(day, hour);
                const isDragOver = dragOverSlot?.day === day.getDay() && dragOverSlot?.hour === hour;
                const isCurrentHour = isClient && currentTime && 
                                     isToday(day) && 
                                     currentTime.getHours() === hour;
                
                return (
                  <div
                    key={dayIndex}
                    className={`relative min-h-[60px] border-r border-border/30 cursor-pointer transition-colors ${
                      isDragOver 
                        ? 'bg-blue-50' 
                        : isCurrentHour
                        ? 'bg-blue-50/50'
                        : 'hover:bg-gray-50/50'
                    }`}
                    onClick={() => handleTimeSlotClick(day, hour)}
                    onDrop={(e) => {
                      e.preventDefault();
                      handleDrop(day, hour);
                    }}
                    onDragOver={(e) => handleDragOver(e, day, hour)}
                    onDragLeave={handleDragLeave}
                  >
                    {/* Current time indicator */}
                    {isCurrentHour && (
                      <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500 z-10">
                        <div className="absolute left-2 -top-1 w-2 h-2 bg-red-500 rounded-full"></div>
                      </div>
                    )}
                    
                    {/* Sessions in this slot */}
                    {slotSessions.map((session, sessionIndex) => {
                      const sessionDuration = (session.end.getTime() - session.start.getTime()) / (1000 * 60 * 60); // in hours
                      const sessionHeightMultiplier = Math.max(1, sessionDuration);
                      const slotHeight = 60; // Height of each hour slot in pixels
                      const isBeingResized = resizingSession?.session.id === session.id;
                      
                      return (
                        <Tooltip key={session.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`absolute inset-1 rounded cursor-move transition-all hover:shadow-sm group ${sessionColors[session.type]} ${
                                session.completed ? 'opacity-60' : ''
                              } ${isBeingResized ? 'shadow-sm ring-1 ring-blue-400' : ''}`}
                              style={{
                                top: `${sessionIndex * 58 + 4}px`,
                                height: sessionDuration > 1 ? `${sessionHeightMultiplier * slotHeight - 8}px` : '54px',
                                zIndex: isBeingResized ? 20 : 10
                              }}
                              draggable={!isBeingResized}
                              onDragStart={(e) => !isBeingResized && handleDragStart(e, session)}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!isBeingResized && onSessionClick) {
                                  onSessionClick(session);
                                }
                              }}
                              onContextMenu={(e) => {
                                if (!isBeingResized) {
                                  console.log('🖱️ Right-click detected on session:', session.title);
                                  handleContextMenu(e, session);
                                }
                              }}
                            >
                          {/* Top resize handle */}
                          <div
                            className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white bg-opacity-50 transition-opacity"
                            onMouseDown={(e) => handleResizeStart(e, session, 'top')}
                            style={{ zIndex: 25 }}
                          />
                          
                              {/* Session content - improved readability */}
                              <div className="p-2 h-full flex flex-col justify-center pointer-events-none overflow-hidden">
                                <div className="font-medium text-xs leading-tight break-words line-clamp-2 mb-1">
                                  {/* Smart truncation for long titles */}
                                  {session.title.length > 30 
                                    ? session.title.substring(0, 27) + '...'
                                    : session.title
                                  }
                                </div>
                                <div className="text-xs opacity-70 whitespace-nowrap flex-shrink-0 mb-1">
                                  {format(session.start, 'h:mm')} - {format(session.end, 'h:mm')}
                                </div>
                                
                                {/* Progress indicator for completed sessions */}
                                {session.completed && (
                                  <div className="w-full">
                                    <Progress value={100} className="h-1" />
                                  </div>
                                )}
                              </div>

                              {/* Top resize handle */}
                              <div
                                className="absolute top-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white bg-opacity-50 transition-opacity"
                                onMouseDown={(e) => handleResizeStart(e, session, 'top')}
                                style={{ zIndex: 25 }}
                              />

                              {/* Bottom resize handle */}
                              <div
                                className="absolute bottom-0 left-0 right-0 h-1 cursor-ns-resize opacity-0 group-hover:opacity-100 bg-white bg-opacity-50 transition-opacity"
                                onMouseDown={(e) => handleResizeStart(e, session, 'bottom')}
                                style={{ zIndex: 25 }}
                              />

                              {/* Visual resize indicator */}
                              {isBeingResized && (
                                <div className="absolute inset-0 border-2 border-dashed border-primary/60 pointer-events-none rounded-md" />
                              )}
                            </div>
                          </TooltipTrigger>
                          
                          {/* Clean, readable tooltip */}
                          <TooltipContent 
                            side="top" 
                            className="max-w-xs bg-white border border-gray-200 text-gray-900 shadow-lg"
                          >
                            <div className="space-y-3 p-1">
                              <div className="font-semibold text-sm text-gray-900">{session.title}</div>
                              
                              <div className="flex items-center gap-4 text-xs text-gray-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-gray-500" />
                                  {format(session.start, 'h:mm')} - {format(session.end, 'h:mm')}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-gray-500" />
                                  {format(session.start, 'MMM dd')}
                                </div>
                              </div>
                              
                              {session.subject && (
                                <div className="flex items-center gap-1 text-xs text-gray-700">
                                  <BookOpen className="w-3 h-3 text-gray-500" />
                                  {session.subject}
                                </div>
                              )}
                              
                              {session.description && (
                                <div className="text-xs text-gray-600 leading-relaxed">
                                  {session.description}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-between text-xs pt-2 border-t border-gray-100">
                                <span className="capitalize text-gray-600 font-medium">{session.type.replace('-', ' ')}</span>
                                {session.completed && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <Target className="w-3 h-3" />
                                    Completed
                                  </div>
                                )}
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                    
                    {/* Empty slot indicator */}
                    {slotSessions.length === 0 && (
                      <div className="absolute inset-2 flex items-center justify-center opacity-0 hover:opacity-30 transition-opacity">
                        <span className="text-xs text-muted-foreground">+</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Session count */}
      <div className="p-4 text-sm text-muted-foreground border-t border-border">
        {weekSessions.length} session{weekSessions.length !== 1 ? 's' : ''} scheduled this week
        <span className="ml-4 text-xs opacity-75">
          Right-click sessions for options • Press Del to delete
        </span>
      </div>

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <div
          ref={contextMenuRef}
          className="fixed z-50 bg-card border border-border rounded-lg shadow-lg py-1 min-w-[180px]"
          style={{
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
          }}
        >
          <div className="px-3 py-2 text-xs font-medium text-muted-foreground border-b border-border">
            {contextMenu.session?.title}
          </div>
          
          <button
            onClick={handleEdit}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-foreground"
          >
            <Edit className="w-4 h-4" />
            Edit Session
          </button>
          
          <button
            onClick={handleDuplicate}
            className="w-full px-3 py-2 text-left text-sm hover:bg-accent flex items-center gap-2 text-foreground"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          
          <div className="border-t border-border mt-1 pt-1">
            <button
              onClick={handleDelete}
              className="w-full px-3 py-2 text-left text-sm hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 text-red-600 dark:text-red-400"
            >
              <Trash2 className="w-4 h-4" />
              Delete Session
            </button>
          </div>
        </div>
      )}
      </div>
    </TooltipProvider>
  );
}