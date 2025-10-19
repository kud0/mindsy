import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/courses
 * Get user's enrolled courses
 * This endpoint exists for backwards compatibility
 */
export async function GET() {
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

    // Get user's enrolled courses
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
        { error: 'Failed to fetch courses' },
        { status: 500 }
      );
    }

    // Transform to match expected format
    const courses = (enrollments || [])
      .map((enrollment: any) => enrollment.course)
      .filter(Boolean);

    return NextResponse.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Unexpected error in GET /courses:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses/search
 * Search for existing courses by code and institution
 *
 * Body: {
 *   course_code: string;
 *   institution: string;
 *   semester?: string;
 * }
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const { course_code, institution, semester } = body;

    // Validate required fields
    if (!course_code || !institution) {
      return NextResponse.json(
        { error: 'Missing required fields: course_code, institution' },
        { status: 400 }
      );
    }

    // Normalize inputs for better matching
    const normalizedCode = course_code.trim().toUpperCase();
    const normalizedInstitution = institution.trim();

    // Build query - search for ALL courses matching criteria
    let query = supabase
      .from('courses')
      .select('*')
      .ilike('course_code', normalizedCode)
      .ilike('institution', `%${normalizedInstitution}%`);

    // Add semester filter if provided
    if (semester) {
      query = query.eq('semester', semester.trim());
    }

    const { data: courses, error } = await query;

    if (error) {
      console.error('Course search error:', error);
      return NextResponse.json(
        { error: 'Failed to search courses' },
        { status: 500 }
      );
    }

    // Get enrollment and template counts for each course
    const transformedCourses = await Promise.all(
      (courses || []).map(async (course: any) => {
        // Count enrollments
        const { count: enrollmentCount } = await supabase
          .from('course_enrollments')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id)
          .eq('is_active', true);

        // Count templates
        const { count: templateCount } = await supabase
          .from('course_templates')
          .select('*', { count: 'exact', head: true })
          .eq('course_id', course.id);

        // Check if current user is enrolled
        const { data: userEnrollment } = await supabase
          .from('course_enrollments')
          .select('id')
          .eq('course_id', course.id)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .single();

        return {
          ...course,
          enrollment_count: enrollmentCount || 0,
          template_count: templateCount || 0,
          is_enrolled: !!userEnrollment,
        };
      })
    );

    return NextResponse.json({
      success: true,
      courses: transformedCourses,
      found: transformedCourses.length > 0
    });
  } catch (error) {
    console.error('Unexpected error in POST /courses/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
