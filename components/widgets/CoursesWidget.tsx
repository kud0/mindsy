'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Users, FolderOpen, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseWidget } from './BaseWidget';

interface EnrolledCourse {
  id: string;
  course_code: string;
  course_name?: string;
  institution: string;
  semester?: string;
  enrollment_count: number;
}

// Tinted glassmorphism colors
const courseColors = [
  {
    glass: 'bg-purple-50/80 backdrop-blur-xl border border-purple-200/50',
    text: 'text-purple-900',
    icon: 'text-purple-600',
    accent: 'bg-purple-500',
    shadow: 'shadow-purple-100/50'
  },
  {
    glass: 'bg-blue-50/80 backdrop-blur-xl border border-blue-200/50',
    text: 'text-blue-900',
    icon: 'text-blue-600',
    accent: 'bg-blue-500',
    shadow: 'shadow-blue-100/50'
  },
  {
    glass: 'bg-orange-50/80 backdrop-blur-xl border border-orange-200/50',
    text: 'text-orange-900',
    icon: 'text-orange-600',
    accent: 'bg-orange-500',
    shadow: 'shadow-orange-100/50'
  },
  {
    glass: 'bg-emerald-50/80 backdrop-blur-xl border border-emerald-200/50',
    text: 'text-emerald-900',
    icon: 'text-emerald-600',
    accent: 'bg-emerald-500',
    shadow: 'shadow-emerald-100/50'
  },
  {
    glass: 'bg-indigo-50/80 backdrop-blur-xl border border-indigo-200/50',
    text: 'text-indigo-900',
    icon: 'text-indigo-600',
    accent: 'bg-indigo-500',
    shadow: 'shadow-indigo-100/50'
  },
  {
    glass: 'bg-pink-50/80 backdrop-blur-xl border border-pink-200/50',
    text: 'text-pink-900',
    icon: 'text-pink-600',
    accent: 'bg-pink-500',
    shadow: 'shadow-pink-100/50'
  },
];

export function CoursesWidget() {
  const router = useRouter();
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadEnrolledCourses();
  }, []);

  const loadEnrolledCourses = async () => {
    try {
      const response = await fetch('/api/enrollments/my-courses');
      const data = await response.json();

      if (data.success) {
        setEnrolledCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseWidget
      title="My Courses"
      iconImage="/images/science-book.gif"
      iconSize="large"
      href="/dashboard/courses"
      color="text-blue-600"
      bgColor="bg-blue-100"
      loading={isLoading}
      actions={
        <button
          onClick={(e) => {
            e.stopPropagation();
            router.push('/dashboard/courses/create');
          }}
          className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all hover:scale-110 active:scale-95"
          aria-label="Join a course"
        >
          <Plus className="w-4 h-4 text-primary" />
        </button>
      }
    >
      {enrolledCourses.length > 0 ? (
        <div className="space-y-2">
          {enrolledCourses.slice(0, 2).map((course, index) => {
            const colorScheme = courseColors[index % courseColors.length];
            return (
              <button
                key={course.id}
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/dashboard/courses/${course.id}`);
                }}
                className={`group w-full text-left relative overflow-hidden rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] ${colorScheme.glass} shadow-lg hover:shadow-xl ${colorScheme.shadow}`}
              >
                <div className="p-3 relative">
                  {/* Colored accent bar */}
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${colorScheme.accent} rounded-l-xl`} />

                  {/* Course code */}
                  <div className="flex items-start justify-between mb-1 pl-2">
                    <h3 className={`font-bold text-sm ${colorScheme.text} truncate flex-1 pr-2`}>
                      {course.course_code}
                    </h3>
                    <div className={`p-1.5 rounded-lg ${colorScheme.accent}/10`}>
                      <BookOpen className={`w-3.5 h-3.5 ${colorScheme.icon}`} />
                    </div>
                  </div>

                  {/* Course name (if exists) */}
                  {course.course_name && (
                    <p className={`text-[11px] ${colorScheme.text} opacity-70 mb-2 pl-2 line-clamp-1`}>
                      {course.course_name}
                    </p>
                  )}

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-[11px] pl-2">
                    <div className={`flex items-center gap-1 ${colorScheme.text} opacity-80`}>
                      <Users className="w-3 h-3" />
                      <span className="font-medium">{course.enrollment_count}</span>
                    </div>
                    <div className={`flex items-center gap-1 ${colorScheme.icon}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${colorScheme.accent} animate-pulse`} />
                      <span className="font-medium">Active</span>
                    </div>
                  </div>
                </div>

                {/* Subtle shimmer on hover */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center py-8">
          <div className="relative mb-4">
            {/* Animated gradient circle */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative p-4 rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
              <BookOpen className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-sm font-bold text-foreground mb-1">
            No courses yet
          </p>
          <p className="text-xs text-muted-foreground mb-4 max-w-[200px]">
            Join your first course to start organizing lectures
          </p>
          <Button
            size="sm"
            onClick={() => router.push('/dashboard/courses/create')}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white border-0 shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Join Course
          </Button>
        </div>
      )}
    </BaseWidget>
  );
}
