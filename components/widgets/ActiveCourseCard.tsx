'use client';

import { useRouter } from 'next/navigation';
import { Calendar, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Deadline {
  id: string;
  title: string;
  deadline_type: string;
  start_time: string;
  daysUntil: number;
  priority: string;
  subject: string;
  completion_percentage: number;
}

interface ActiveCourseCardProps {
  course: {
    id: string;
    course_code: string;
    course_name?: string;
    institution: string;
    active_folder_id?: string | null;
    active_folder_name?: string | null;
    enrollment_id: string;
  };
  nextDeadline?: Deadline | null;
  nextExam?: Deadline | null;
  progress?: number;  // 0-100 percentage
}

export function ActiveCourseCard({
  course,
  nextDeadline,
  nextExam,
  progress = 0
}: ActiveCourseCardProps) {
  const router = useRouter();

  // Get urgency color based on days until
  const getUrgencyColor = (daysUntil: number): string => {
    if (daysUntil < 0) return 'text-gray-400'; // Past
    if (daysUntil <= 2) return 'text-red-600 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800';
    if (daysUntil <= 5) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800';
    if (daysUntil <= 7) return 'text-purple-600 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800';
    return 'text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800';
  };

  // Get deadline icon based on type
  const getDeadlineIcon = (type: string): string => {
    switch (type) {
      case 'exam': return '📅';
      case 'essay': return '📝';
      case 'assignment': return '📚';
      case 'quiz': return '❓';
      case 'project': return '🔨';
      case 'presentation': return '🎤';
      case 'lab': return '🧪';
      default: return '📌';
    }
  };

  // Format deadline text
  const formatDeadlineText = (daysUntil: number): string => {
    if (daysUntil < 0) return 'Overdue';
    if (daysUntil === 0) return 'Today';
    if (daysUntil === 1) return 'Tomorrow';
    if (daysUntil <= 7) return `in ${daysUntil} days`;
    if (daysUntil <= 30) return `in ${daysUntil} days`;
    // Show absolute date for far away deadlines
    const date = new Date();
    date.setDate(date.getDate() + daysUntil);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Course Header */}
      <div
        className="mb-3 cursor-pointer"
        onClick={() => router.push(`/dashboard/courses/${course.id}`)}
      >
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-lg font-bold text-foreground font-[var(--font-space-grotesk)]">
            {course.course_code}
          </h3>
          {course.active_folder_name && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 font-medium">
              {course.active_folder_name}
            </span>
          )}
        </div>
        {course.course_name && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {course.course_name}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-0.5">
          {course.institution}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs text-muted-foreground">Year Progress</span>
          <span className="text-xs font-medium text-foreground">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-green-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Next Deadline Card (if exists) */}
      {nextDeadline && (
        <div
          className={cn(
            "rounded-xl p-3 mb-2 transition-all duration-200 border",
            "hover:scale-[1.01] active:scale-[0.99] cursor-pointer",
            getUrgencyColor(nextDeadline.daysUntil)
          )}
          onClick={() => router.push('/dashboard/schedule')}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className="text-base">{getDeadlineIcon(nextDeadline.deadline_type)}</span>
                <span className="text-xs font-semibold capitalize">
                  {nextDeadline.deadline_type} {formatDeadlineText(nextDeadline.daysUntil)}
                </span>
              </div>
              <p className="text-sm font-medium line-clamp-1 mb-0.5">
                {nextDeadline.title}
              </p>
              <p className="text-xs opacity-75 line-clamp-1">
                {nextDeadline.subject}
              </p>
            </div>
            {nextDeadline.completion_percentage > 0 && (
              <div className="text-xs font-medium shrink-0">
                {nextDeadline.completion_percentage}%
              </div>
            )}
          </div>
        </div>
      )}

      {/* Next Exam Card (always show if exists) */}
      {nextExam && (
        <div
          className={cn(
            "rounded-xl p-3 transition-all duration-200 border",
            "hover:scale-[1.01] active:scale-[0.99] cursor-pointer",
            "text-blue-600 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
          )}
          onClick={() => router.push('/dashboard/schedule')}
        >
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <span className="text-xs font-semibold">
                  Next Exam {formatDeadlineText(nextExam.daysUntil)}
                </span>
              </div>
              <p className="text-sm font-medium line-clamp-1 mb-0.5">
                {nextExam.title}
              </p>
              <p className="text-xs opacity-75 line-clamp-1">
                {nextExam.subject}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!nextDeadline && !nextExam && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center mb-2">
            <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            No upcoming deadlines
          </p>
          <p className="text-xs text-muted-foreground">
            Add deadlines in your calendar
          </p>
        </div>
      )}
    </div>
  );
}
