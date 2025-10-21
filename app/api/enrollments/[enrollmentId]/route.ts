import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * PATCH /api/enrollments/[enrollmentId]
 * Update enrollment settings (active status, active year)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { enrollmentId: string } }
) {
  try {
    const supabase = await createClient();
    const { enrollmentId } = params;

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
    const { is_active_course, active_folder_id } = body;

    // Verify enrollment exists and belongs to user
    const { data: enrollment, error: fetchError } = await supabase
      .from('course_enrollments')
      .select('id, user_id, course_id, is_active_course, active_folder_id')
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    // If trying to activate, use helper function to check limit
    if (is_active_course === true && !enrollment.is_active_course) {
      // Require active_folder_id when activating
      if (!active_folder_id) {
        return NextResponse.json(
          { error: 'active_folder_id required when activating course' },
          { status: 400 }
        );
      }

      // Use the database function to safely toggle active status
      const { data: toggleResult, error: toggleError } = await supabase
        .rpc('toggle_active_course', {
          p_user_id: user.id,
          p_course_id: enrollment.course_id,
          p_set_active: true,
          p_active_folder_id: active_folder_id
        });

      if (toggleError) {
        console.error('Error toggling active course:', toggleError);
        return NextResponse.json(
          { error: 'Failed to activate course' },
          { status: 500 }
        );
      }

      if (!toggleResult?.success) {
        // Get current active courses to show in error message
        const { data: activeCourses } = await supabase
          .from('course_enrollments')
          .select('course:courses(course_code, course_name)')
          .eq('user_id', user.id)
          .eq('is_active_course', true)
          .limit(2);

        const courseNames = activeCourses?.map((e: any) =>
          e.course?.course_code || e.course?.course_name
        ).filter(Boolean).join(', ');

        return NextResponse.json(
          {
            error: 'Maximum 2 active courses allowed',
            message: `You already have 2 active courses: ${courseNames}. Please deactivate one first.`,
            currentActiveCourses: activeCourses
          },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updates: any = {};
    if (typeof is_active_course === 'boolean') {
      updates.is_active_course = is_active_course;
    }
    if (active_folder_id) {
      updates.active_folder_id = active_folder_id;
    } else if (is_active_course === false) {
      // When deactivating, clear the active folder
      updates.active_folder_id = null;
    }

    // If deactivating, we can just update directly
    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Perform the update
    const { data: updatedEnrollment, error: updateError } = await supabase
      .from('course_enrollments')
      .update(updates)
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
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
          total_years
        ),
        active_folder:user_folders!active_folder_id(
          id,
          folder_name
        )
      `)
      .single();

    if (updateError) {
      console.error('Error updating enrollment:', updateError);
      return NextResponse.json(
        { error: 'Failed to update enrollment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      enrollment: updatedEnrollment
    });

  } catch (error) {
    console.error('Unexpected error in PATCH /enrollments/[enrollmentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/enrollments/[enrollmentId]
 * Get specific enrollment details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { enrollmentId: string } }
) {
  try {
    const supabase = await createClient();
    const { enrollmentId } = params;

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get enrollment details
    const { data: enrollment, error } = await supabase
      .from('course_enrollments')
      .select(`
        id,
        enrolled_at,
        is_active_course,
        active_year,
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
      .eq('id', enrollmentId)
      .eq('user_id', user.id)
      .single();

    if (error || !enrollment) {
      return NextResponse.json(
        { error: 'Enrollment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      enrollment
    });

  } catch (error) {
    console.error('Unexpected error in GET /enrollments/[enrollmentId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
