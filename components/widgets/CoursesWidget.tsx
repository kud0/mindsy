'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Users } from 'lucide-react';
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
      icon={BookOpen}
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
          className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5 text-gray-400 hover:text-gray-600" />
        </button>
      }
    >
      {enrolledCourses.length > 0 ? (
        <div className="space-y-2">
          {enrolledCourses.slice(0, 3).map((course) => (
            <button
              key={course.id}
              onClick={() => router.push(`/dashboard/courses/${course.id}`)}
              className="w-full text-left p-3 hover:bg-gray-100/50 rounded-lg transition-colors"
            >
              <div className="font-medium text-sm text-gray-900">
                {course.course_code}
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                <Users className="w-3 h-3" />
                {course.enrollment_count} students
              </div>
            </button>
          ))}

          {enrolledCourses.length > 3 && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-2"
              onClick={() => router.push('/dashboard/courses')}
            >
              View All ({enrolledCourses.length})
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center py-6">
          <BookOpen className="w-12 h-12 text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-900 mb-1">
            No courses yet
          </p>
          <p className="text-xs text-gray-500 mb-3">
            Join a course to get started
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/dashboard/courses/create')}
          >
            <Plus className="w-4 h-4 mr-1" />
            Join a Course
          </Button>
        </div>
      )}
    </BaseWidget>
  );
}
