'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, Plus, Users, FolderOpen, Star, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { YearSelectorDialog } from '@/components/courses/YearSelectorDialog';
import { toast } from 'sonner';
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

export default function CoursesPage() {
  const router = useRouter();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [yearSelectorOpen, setYearSelectorOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<EnrolledCourse | null>(null);

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

  const handleToggleActive = async (course: EnrolledCourse, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent navigation

    // If already active, just deactivate
    if (course.is_active_course) {
      await updateCourseActive(course.enrollment_id, false, null);
      return;
    }

    // Count current active courses
    const activeCourses = courses.filter(c => c.is_active_course);

    // If already 2 active, show error
    if (activeCourses.length >= 2) {
      toast.error('Maximum 2 active courses', {
        description: `You already have 2 active courses: ${activeCourses.map(c => c.course_code).join(', ')}. Deactivate one first.`
      });
      return;
    }

    // Always show folder selector to choose which year/semester
    setSelectedCourse(course);
    setYearSelectorOpen(true);
  };

  const updateCourseActive = async (enrollmentId: string, isActive: boolean, folderId: string | null) => {
    try {
      const body: any = { is_active_course: isActive };
      if (folderId) {
        body.active_folder_id = folderId;
      }

      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update course');
      }

      toast.success(isActive ? 'Course set as active' : 'Course deactivated');
      await loadCourses(); // Reload courses

    } catch (error) {
      console.error('Error updating course:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to update course');
    }
  };

  const handleYearSelected = async () => {
    await loadCourses();
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
                className={cn(
                  "hover:border-primary/50 transition-all cursor-pointer group relative",
                  course.is_active_course && "border-purple-500 dark:border-purple-700 shadow-lg"
                )}
                onClick={() => router.push(`/dashboard/courses/${course.id}`)}
              >
                {/* Active Badge */}
                {course.is_active_course && (
                  <div className="absolute -top-2 -right-2 z-10">
                    <div className="bg-purple-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 shadow-md">
                      <Star className="w-3 h-3 fill-white" />
                      Active
                    </div>
                  </div>
                )}

                <CardContent className="p-6">
                  <div className="flex items-start gap-3 mb-4">
                    <div className={cn(
                      "p-2.5 rounded-lg transition-colors",
                      course.is_active_course
                        ? "bg-purple-500 text-white"
                        : "bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground"
                    )}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground truncate">
                          {course.course_code}
                        </h3>
                        {course.is_active_course && course.active_folder_name && (
                          <span className="text-xs text-purple-600 dark:text-purple-400 font-medium shrink-0">
                            {course.active_folder_name}
                          </span>
                        )}
                      </div>
                      {course.course_name && (
                        <p className="text-sm text-muted-foreground truncate">
                          {course.course_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
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

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant={course.is_active_course ? "outline" : "default"}
                      size="sm"
                      className={cn(
                        "flex-1",
                        course.is_active_course && "border-purple-500 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                      )}
                      onClick={(e) => handleToggleActive(course, e)}
                    >
                      {course.is_active_course ? (
                        <>
                          <Star className="w-3.5 h-3.5 mr-1.5 fill-current" />
                          Active
                        </>
                      ) : (
                        <>
                          <Star className="w-3.5 h-3.5 mr-1.5" />
                          Set Active
                        </>
                      )}
                    </Button>

                    {/* Change Folder (only for active courses) */}
                    {course.is_active_course && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedCourse(course);
                          setYearSelectorOpen(true);
                        }}
                        title="Change active folder"
                      >
                        <Settings className="w-3.5 h-3.5" />
                      </Button>
                    )}
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

      {/* Folder Selector Dialog */}
      {selectedCourse && (
        <YearSelectorDialog
          open={yearSelectorOpen}
          onOpenChange={setYearSelectorOpen}
          courseCode={selectedCourse.course_code}
          courseName={selectedCourse.course_name || ''}
          courseId={selectedCourse.id}
          enrollmentId={selectedCourse.enrollment_id}
          currentActiveFolderId={selectedCourse.active_folder_id}
          onYearSelected={handleYearSelected}
        />
      )}
    </div>
  );
}
