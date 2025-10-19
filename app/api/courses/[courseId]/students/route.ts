import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    courseId: string
  }>
}

/**
 * GET /api/courses/[courseId]/students
 * Get list of enrolled students (classmates) in a course
 * Only accessible if current user is enrolled in the course
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { courseId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if user is enrolled in this course
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You must be enrolled in this course to view classmates' },
        { status: 403 }
      );
    }

    // Get all enrolled students with their profile info and friendship status
    const { data: enrollments, error } = await supabase
      .from('course_enrollments')
      .select(`
        enrolled_at,
        student:profiles!course_enrollments_user_id_fkey(
          id,
          full_name,
          email,
          avatar_url,
          bio,
          institution
        )
      `)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('enrolled_at', { ascending: true });

    if (error) {
      console.error('Error fetching students:', error);
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      );
    }

    // Get friendship status for each student
    const { data: friendships } = await supabase
      .from('user_connections')
      .select('user_id, friend_id, status')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .eq('status', 'accepted');

    // Create a Set of friend IDs for quick lookup
    const friendIds = new Set(
      friendships?.map(conn =>
        conn.user_id === user.id ? conn.friend_id : conn.user_id
      ) || []
    );

    // Transform students to include friendship status
    const students = enrollments
      ?.map((e: any) => {
        if (!e.student) return null;
        return {
          ...e.student,
          enrolled_at: e.enrolled_at,
          is_current_user: e.student.id === user.id,
          is_friend: friendIds.has(e.student.id)
        };
      })
      .filter(Boolean) // Remove null entries
      || [];

    return NextResponse.json({
      success: true,
      students,
      total: students.length
    });
  } catch (error) {
    console.error('Unexpected error in GET /courses/[courseId]/students:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
