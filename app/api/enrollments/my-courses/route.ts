import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/enrollments/my-courses
 * Get all courses the current user is enrolled in
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get user's active enrollments with course details
    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        enrolled_at,
        course:courses(
          id,
          course_code,
          course_name,
          institution,
          semester,
          description
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: false });

    if (error) {
      console.error('Error fetching enrollments:', error);
      return NextResponse.json(
        { error: 'Failed to fetch enrollments' },
        { status: 500 }
      );
    }

    // Get enrollment count for each course
    const coursesWithCounts = await Promise.all(
      (enrollments || []).map(async (enrollment: any) => {
        if (!enrollment.course) return null;

        // Count students in this course
        const { count } = await supabase
          .from('course_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', enrollment.course.id)
          .eq('is_active', true);

        return {
          ...enrollment.course,
          enrollment_count: count || 0,
          enrolled_at: enrollment.enrolled_at,
          is_enrolled: true  // User is enrolled (this is their enrolled courses list)
        };
      })
    );

    // Filter out null entries
    const courses = coursesWithCounts.filter(Boolean);

    return NextResponse.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Unexpected error in GET /enrollments/my-courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
