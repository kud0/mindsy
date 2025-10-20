'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Users, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface EnrolledCourse {
  id: string;
  course_code: string;
  course_name?: string;
  institution: string;
  semester?: string;
  enrollment_count: number;
}

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      const response = await fetch('/api/enrollments/my-courses');
      const data = await response.json();

      if (data.success) {
        setCourses(data.courses || []);
      }
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              My Courses
            </h1>
            <p className="text-sm text-muted-foreground">
              {courses.length} {courses.length === 1 ? 'course' : 'courses'} enrolled
            </p>
          </div>
          <Button
            onClick={() => router.push('/dashboard/courses/create')}
            className="w-full md:w-auto h-12 md:h-10"
          >
            <Plus className="w-5 h-5 mr-2" />
            Join Course
          </Button>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-3" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : courses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <Card
                key={course.id}
                className="hover:border-primary/50 transition-all cursor-pointer group"
                onClick={() => router.push(`/dashboard/courses/${course.id}`)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="p-2.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground mb-1 truncate">
                        {course.course_code}
                      </h3>
                      {course.course_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {course.course_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FolderOpen className="w-4 h-4 shrink-0" />
                      <span className="truncate">{course.institution}</span>
                    </div>
                    {course.semester && (
                      <div className="text-muted-foreground">
                        {course.semester}
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-muted-foreground pt-2 border-t border-border">
                      <Users className="w-4 h-4 shrink-0" />
                      <span>{course.enrollment_count} students</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-muted mb-4">
                <BookOpen className="w-12 h-12 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No courses yet
              </h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                Join your first course to start organizing your study materials
              </p>
              <Button onClick={() => router.push('/dashboard/courses/create')}>
                <Plus className="w-5 h-5 mr-2" />
                Join a Course
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
