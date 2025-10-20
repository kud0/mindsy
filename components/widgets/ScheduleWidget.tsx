"use client"

import React from 'react';
import { Calendar, Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseWidget } from './BaseWidget';
import { Badge } from '@/components/ui/badge';

export function ScheduleWidget() {
  // Mock data for now - will connect to real data later
  const todaySchedule = [
    { id: 1, time: '09:00', title: 'Math Lecture', type: 'lecture' },
    { id: 2, time: '14:00', title: 'Physics Exam', type: 'exam' },
    { id: 3, time: '16:00', title: 'Study Session', type: 'study' },
  ];

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'lecture':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
      case 'exam':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'study':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  return (
    <BaseWidget
      title="Today's Schedule"
      iconImage="/images/calendar.png"
      href="/dashboard/schedule"
      color="text-orange-600 dark:text-orange-400"
      bgColor="bg-orange-100 dark:bg-orange-900/30"
      actions={
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => window.location.href = '/dashboard/schedule'}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {todaySchedule.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <img
            src="/images/calendar.png"
            alt="Calendar"
            className="w-12 h-12 opacity-50 mb-3 object-contain"
          />
          <p className="text-sm text-muted-foreground">No events today</p>
          <p className="text-xs text-muted-foreground mt-1">Your schedule is clear!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {todaySchedule.map((event) => (
            <div 
              key={event.id}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span className="font-mono">{event.time}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{event.title}</p>
              </div>
              <Badge 
                variant="secondary" 
                className={getTypeColor(event.type)}
              >
                {event.type}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </BaseWidget>
  );
}