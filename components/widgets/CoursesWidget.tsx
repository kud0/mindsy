'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { BaseWidget } from './BaseWidget';
import { ActiveCourseCard } from './ActiveCourseCard';
import { cn } from '@/lib/utils';

interface EnrolledCourse {
  id: string;
  course_code: string;
  course_name?: string;
  institution: string;
  semester?: string;
  enrollment_count: number;
  enrollment_id: string;
  is_active_course: boolean;
  active_folder_id?: string | null;
  active_folder_name?: string | null;
  total_years: number;
}

interface ProgressData {
  progress: number;
  completed: number;
  total: number;
}

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

export function CoursesWidget() {
  const router = useRouter();
  const [activeCourses, setActiveCourses] = useState<EnrolledCourse[]>([]);
  const [deadlinesData, setDeadlinesData] = useState<Record<string, {
    nextDeadline: Deadline | null;
    nextExam: Deadline | null;
  }>>({});
  const [progressData, setProgressData] = useState<Record<string, ProgressData>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    loadActiveCourses();
  }, []);

  const loadActiveCourses = async () => {
    try {
      // Load active courses only (max 2)
      const response = await fetch('/api/enrollments/my-courses?active=true');
      const data = await response.json();

      if (data.success && data.courses) {
        const courses = data.courses as EnrolledCourse[];
        setActiveCourses(courses);

        // Load deadlines for each active course
        await loadDeadlinesForCourses(courses);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeadlinesForCourses = async (courses: EnrolledCourse[]) => {
    const deadlines: Record<string, { nextDeadline: Deadline | null; nextExam: Deadline | null }> = {};
    const progress: Record<string, ProgressData> = {};

    await Promise.all(
      courses.map(async (course) => {
        try {
          // Load deadlines
          const deadlineResponse = await fetch(`/api/schedule/upcoming-deadlines?course_id=${course.id}`);
          const deadlineData = await deadlineResponse.json();

          if (deadlineData.success) {
            deadlines[course.id] = {
              nextDeadline: deadlineData.data.nextClosestDeadline,
              nextExam: deadlineData.data.nextExam
            };
          }

          // Load progress (only if active_folder_id exists)
          if (course.active_folder_id) {
            const progressResponse = await fetch(
              `/api/courses/${course.id}/progress?folderId=${course.active_folder_id}`
            );
            const progressData = await progressResponse.json();

            if (progressData.success) {
              progress[course.id] = {
                progress: progressData.progress,
                completed: progressData.completed,
                total: progressData.total
              };
            } else {
              // Default to 0 if error
              progress[course.id] = { progress: 0, completed: 0, total: 0 };
            }
          } else {
            // No active folder, default to 0
            progress[course.id] = { progress: 0, completed: 0, total: 0 };
          }
        } catch (error) {
          console.error(`Error loading data for course ${course.id}:`, error);
          // Set defaults on error
          progress[course.id] = { progress: 0, completed: 0, total: 0 };
        }
      })
    );

    setDeadlinesData(deadlines);
    setProgressData(progress);
  };

  const handleSwipeLeft = () => {
    if (currentIndex < activeCourses.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSwipeRight = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipeThreshold = 50;
    if (info.offset.x > swipeThreshold) {
      handleSwipeRight();
    } else if (info.offset.x < -swipeThreshold) {
      handleSwipeLeft();
    }
  };

  // Show empty state if no active courses
  if (!isLoading && activeCourses.length === 0) {
    return (
      <BaseWidget
        title="Active Courses"
        iconImage="/images/science-book.gif"
        iconSize="large"
        href="/dashboard/courses"
        color="text-blue-600"
        bgColor="bg-blue-100"
        loading={isLoading}
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              router.push('/dashboard/courses');
            }}
            aria-label="Manage courses"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        }
      >
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center mb-3 border border-purple-200/50 dark:border-purple-800/50">
            <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">
            No active courses
          </p>
          <p className="text-xs text-muted-foreground max-w-[200px]">
            Set 1-2 courses as active to track upcoming deadlines
          </p>
        </div>
      </BaseWidget>
    );
  }

  const currentCourse = activeCourses[currentIndex];
  const showSwipeControls = activeCourses.length > 1;

  return (
    <BaseWidget
      title={showSwipeControls ? `Active Courses (${currentIndex + 1}/${activeCourses.length})` : "Active Course"}
      iconImage="/images/science-book.gif"
      iconSize="large"
      href="/dashboard/courses"
      color="text-blue-600"
      bgColor="bg-blue-100"
      loading={isLoading}
      actions={
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            router.push('/dashboard/courses');
          }}
          aria-label="Manage courses"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      }
    >
      <div className="relative overflow-hidden">
        {/* Swipe Arrows (only show if 2 courses) */}
        {showSwipeControls && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSwipeRight();
              }}
              disabled={currentIndex === 0}
              className={cn(
                "absolute left-0 top-1/2 -translate-y-1/2 z-10",
                "w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm",
                "border border-border/50 shadow-sm",
                "flex items-center justify-center transition-all",
                "hover:bg-background hover:scale-110",
                currentIndex === 0 && "opacity-30 cursor-not-allowed"
              )}
              aria-label="Previous course"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSwipeLeft();
              }}
              disabled={currentIndex === activeCourses.length - 1}
              className={cn(
                "absolute right-0 top-1/2 -translate-y-1/2 z-10",
                "w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm",
                "border border-border/50 shadow-sm",
                "flex items-center justify-center transition-all",
                "hover:bg-background hover:scale-110",
                currentIndex === activeCourses.length - 1 && "opacity-30 cursor-not-allowed"
              )}
              aria-label="Next course"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}

        {/* Swipeable Cards */}
        <AnimatePresence mode="wait" initial={false}>
          {currentCourse && (
            <motion.div
              key={currentCourse.id}
              drag={showSwipeControls ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -100 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className={cn(
                "px-1",
                showSwipeControls && "cursor-grab active:cursor-grabbing"
              )}
            >
              <ActiveCourseCard
                course={currentCourse}
                nextDeadline={deadlinesData[currentCourse.id]?.nextDeadline}
                nextExam={deadlinesData[currentCourse.id]?.nextExam}
                progress={progressData[currentCourse.id]?.progress ?? 0}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Dot Indicators */}
        {showSwipeControls && (
          <div className="flex justify-center gap-1.5 mt-4">
            {activeCourses.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  index === currentIndex
                    ? "bg-purple-600 w-6"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
                aria-label={`Go to course ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </BaseWidget>
  );
}
