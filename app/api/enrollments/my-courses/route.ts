import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/enrollments/my-courses
 * Get all courses the current user is enrolled in
 * Query params:
 *   - active=true: Filter to only active courses (max 2)
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

    // Check for active filter
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';

    // Build query - try with active_folder first (if migration 025 applied)
    let query = supabase
      .from('course_enrollments')
      .select(`
        id,
        enrolled_at,
        is_active_course,
        active_folder_id,
        course:courses(
          id,
          course_code,
          course_name,
          institution,
          semester,
          description,
          total_years
        ),
        active_folder:user_folders!course_enrollments_active_folder_id_fkey(
          id,
          folder_name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    // Apply active course filter if requested
    if (activeOnly) {
      query = query.eq('is_active_course', true);
    }

    let { data: enrollments, error } = await query.order('enrolled_at', { ascending: false });

    // If error (likely column doesn't exist), fallback to basic query
    if (error) {
      console.error('Error fetching enrollments with active_folder, trying fallback:', error);

      // Fallback query without active_folder fields
      const fallbackQuery = supabase
        .from('course_enrollments')
        .select(`
          id,
          enrolled_at,
          course:courses(
            id,
            course_code,
            course_name,
            institution,
            semester,
            description,
            total_years
          )
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('enrolled_at', { ascending: false });

      const fallbackResult = await fallbackQuery;
      enrollments = fallbackResult.data;
      error = fallbackResult.error;

      if (error) {
        console.error('Error with fallback query:', error);
        return NextResponse.json(
          { error: 'Failed to fetch enrollments', details: error.message },
          { status: 500 }
        );
      }
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
          enrollment_id: enrollment.id,
          enrollment_count: count || 0,
          enrolled_at: enrollment.enrolled_at,
          is_active_course: enrollment.is_active_course ?? false,
          active_folder_id: enrollment.active_folder_id ?? null,
          active_folder_name: enrollment.active_folder?.folder_name ?? null,
          total_years: enrollment.course.total_years ?? 1,
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
