"use client"

import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ActivityDay {
  date: string; // ISO format (YYYY-MM-DD)
  pomodoros: number;
  questions: number;
  battles: number;
  exams: number;
  score: number;
  intensity: 'none' | 'low' | 'medium' | 'high';
}

interface ActivityHeatmapProps {
  data: ActivityDay[];
  onDayClick?: (date: string) => void;
}

const DAYS_OF_WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const TOTAL_DAYS = 7; // 1 week

// Color intensity mapping following Mindsy design system
const INTENSITY_COLORS = {
  none: {
    bg: 'bg-gray-200 dark:bg-gray-700',
    hover: 'hover:bg-gray-300 dark:hover:bg-gray-600',
    border: 'border-gray-300 dark:border-gray-600'
  },
  low: {
    bg: 'bg-blue-200 dark:bg-blue-900/50',
    hover: 'hover:bg-blue-300 dark:hover:bg-blue-800/70',
    border: 'border-blue-300 dark:border-blue-800'
  },
  medium: {
    bg: 'bg-green-300 dark:bg-green-700/60',
    hover: 'hover:bg-green-400 dark:hover:bg-green-600/80',
    border: 'border-green-400 dark:border-green-600'
  },
  high: {
    bg: 'bg-green-500 dark:bg-green-500',
    hover: 'hover:bg-green-600 dark:hover:bg-green-400',
    border: 'border-green-600 dark:border-green-400'
  }
} as const;

export function ActivityHeatmap({ data, onDayClick }: ActivityHeatmapProps) {
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);

  // Generate last 7 days
  const generateLast7Days = (): ActivityDay[] => {
    const days: ActivityDay[] = [];
    const today = new Date();

    for (let i = TOTAL_DAYS - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateString = date.toISOString().split('T')[0];

      // Find existing data or create empty day
      const existingDay = data.find(d => d.date === dateString);
      days.push(existingDay || {
        date: dateString,
        pomodoros: 0,
        questions: 0,
        battles: 0,
        exams: 0,
        score: 0,
        intensity: 'none'
      });
    }

    return days;
  };

  const days = generateLast7Days();

  // Format date for tooltip
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Get total activities count
  const getTotalActivities = (day: ActivityDay): number => {
    return day.pomodoros + day.questions + day.battles + day.exams;
  };

  // Render tooltip content
  const renderTooltipContent = (day: ActivityDay) => {
    const total = getTotalActivities(day);

    if (total === 0) {
      return (
        <div className="text-xs">
          <div className="font-semibold mb-1">{formatDate(day.date)}</div>
          <div className="text-muted-foreground">No activity</div>
        </div>
      );
    }

    return (
      <div className="text-xs space-y-1">
        <div className="font-semibold mb-1.5">{formatDate(day.date)}</div>
        <div className="text-purple-400 font-medium mb-1">🎯 {total} activities</div>
        {day.pomodoros > 0 && (
          <div className="flex items-center gap-1.5">
            <span>•</span>
            <span>{day.pomodoros} Pomodoro{day.pomodoros > 1 ? 's' : ''}</span>
          </div>
        )}
        {day.questions > 0 && (
          <div className="flex items-center gap-1.5">
            <span>•</span>
            <span>{day.questions} Question{day.questions > 1 ? 's' : ''}</span>
          </div>
        )}
        {day.battles > 0 && (
          <div className="flex items-center gap-1.5">
            <span>•</span>
            <span>{day.battles} Battle{day.battles > 1 ? 's' : ''}</span>
          </div>
        )}
        {day.exams > 0 && (
          <div className="flex items-center gap-1.5">
            <span>•</span>
            <span>{day.exams} Exam{day.exams > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    );
  };

  // Handle day click
  const handleDayClick = (date: string) => {
    if (onDayClick) {
      onDayClick(date);
    }
  };

  return (
    <TooltipProvider delayDuration={100}>
      <div className="w-full">
        {/* Heatmap - Single Week */}
        <div className="space-y-2">
          {/* Day labels (top row) */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {DAYS_OF_WEEK.map((day, index) => (
              <div
                key={index}
                className="text-xs font-medium text-muted-foreground text-center"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Activity cells */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {days.map((day, dayIndex) => {
              const colors = INTENSITY_COLORS[day.intensity];
              const isHovered = hoveredDay === day.date;

              return (
                <Tooltip key={dayIndex}>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "relative aspect-square w-full rounded-md transition-all duration-200",
                        "border min-h-[28px] sm:min-h-[32px]",
                        colors.bg,
                        colors.hover,
                        colors.border,
                        "focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2",
                        isHovered && "scale-110 z-10",
                        onDayClick && "cursor-pointer"
                      )}
                      onClick={() => handleDayClick(day.date)}
                      onMouseEnter={() => setHoveredDay(day.date)}
                      onMouseLeave={() => setHoveredDay(null)}
                      aria-label={`Activity for ${formatDate(day.date)}: ${getTotalActivities(day)} activities`}
                    >
                      {/* Optional: Show score indicator for high activity */}
                      {day.intensity === 'high' && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 rounded-full bg-white/60" />
                        </div>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-[200px]">
                    {renderTooltipContent(day)}
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </div>
        </div>

        {/* Legend - Centered below */}
        <div className="flex items-center justify-center gap-2 mt-2.5">
          <span className="text-xs text-muted-foreground">Less</span>
          <div className="flex items-center gap-1">
            <div className={cn(
              "w-3 h-3 rounded-sm",
              INTENSITY_COLORS.none.bg
            )} />
            <div className={cn(
              "w-3 h-3 rounded-sm",
              INTENSITY_COLORS.low.bg
            )} />
            <div className={cn(
              "w-3 h-3 rounded-sm",
              INTENSITY_COLORS.medium.bg
            )} />
            <div className={cn(
              "w-3 h-3 rounded-sm",
              INTENSITY_COLORS.high.bg
            )} />
          </div>
          <span className="text-xs text-muted-foreground">More</span>
        </div>
      </div>
    </TooltipProvider>
  );
}
