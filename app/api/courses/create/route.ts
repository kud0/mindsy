import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

/**
 * POST /api/courses/create
 * Create a new course
 *
 * Body: {
 *   course_code: string;
 *   course_name?: string;
 *   institution: string;
 *   semester?: string;
 *   description?: string;
 *   auto_enroll?: boolean; // Auto-enroll creator (default: true)
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
    const {
      course_code,
      course_name,
      institution,
      semester,
      description,
      type_of_study,
      year,
      auto_enroll = true
    } = body;

    // Validate required fields
    if (!course_code || !institution) {
      return NextResponse.json(
        { error: 'Missing required fields: course_code, institution' },
        { status: 400 }
      );
    }

    // Normalize inputs
    const normalizedCode = course_code.trim().toUpperCase();
    const normalizedInstitution = institution.trim();
    const normalizedSemester = semester?.trim() || null;

    // Check if course already exists
    const { data: existing } = await supabase
      .from('courses')
      .select('id, created_by')
      .eq('course_code', normalizedCode)
      .eq('institution', normalizedInstitution)
      .eq('semester', normalizedSemester)
      .single();

    if (existing) {
      // Check if this is an orphaned course (user is the creator but no active enrollments)
      const { data: enrollments } = await supabase
        .from('course_enrollments')
        .select('id')
        .eq('course_id', existing.id)
        .eq('is_active', true);

      // If no active enrollments and user is creator, clean up the orphaned course
      if (existing.created_by === user.id && (!enrollments || enrollments.length === 0)) {
        console.log('🧹 Cleaning up orphaned course:', existing.id);

        const serviceSupabase = createServiceRoleClient();

        try {
          // Delete the orphaned course using service role - IN ORDER
          console.log('Deleting folders...');
          const { error: foldersErr } = await serviceSupabase
            .from('user_folders')
            .delete()
            .eq('course_id', existing.id);
          if (foldersErr) console.error('Folders delete error:', foldersErr);

          console.log('Deleting templates...');
          const { error: templatesErr } = await serviceSupabase
            .from('course_templates')
            .delete()
            .eq('course_id', existing.id);
          if (templatesErr) console.error('Templates delete error:', templatesErr);

          console.log('Deleting enrollments...');
          const { error: enrollmentsErr } = await serviceSupabase
            .from('course_enrollments')
            .delete()
            .eq('course_id', existing.id);
          if (enrollmentsErr) console.error('Enrollments delete error:', enrollmentsErr);

          console.log('Deleting course...');
          const { error: courseErr } = await serviceSupabase
            .from('courses')
            .delete()
            .eq('id', existing.id);

          if (courseErr) {
            console.error('Course delete error:', courseErr);
            return NextResponse.json(
              { error: 'Failed to clean up orphaned course: ' + courseErr.message },
              { status: 500 }
            );
          }

          console.log('✅ Orphaned course cleaned up, proceeding with creation');
          // Continue to create the new course below
        } catch (cleanupError) {
          console.error('Cleanup error:', cleanupError);
          return NextResponse.json(
            { error: 'Failed to clean up orphaned course' },
            { status: 500 }
          );
        }
      } else {
        // Course exists and has enrollments or belongs to someone else
        return NextResponse.json(
          {
            error: 'Course already exists',
            course_id: existing.id
          },
          { status: 409 }
        );
      }
    }

    // Create the course
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .insert({
        course_code: normalizedCode,
        course_name: course_name?.trim() || null,
        institution: normalizedInstitution,
        semester: normalizedSemester,
        description: description?.trim() || null,
        type_of_study: type_of_study?.trim() || null,
        year: year?.trim() || null,
        created_by: user.id
      })
      .select()
      .single();

    if (courseError || !course) {
      console.error('Course creation error:', courseError);
      return NextResponse.json(
        { error: 'Failed to create course' },
        { status: 500 }
      );
    }

    // Auto-enroll the creator if requested
    if (auto_enroll) {
      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
          is_active: true
        });

      if (enrollError) {
        console.error('Auto-enrollment error:', enrollError);

        // ROLLBACK: Delete the course we just created
        await supabase
          .from('courses')
          .delete()
          .eq('id', course.id);

        return NextResponse.json(
          { error: 'Failed to enroll in course. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        enrollment_count: auto_enroll ? 1 : 0,
        is_enrolled: auto_enroll
      },
      enrolled: auto_enroll
    });
  } catch (error) {
    console.error('Unexpected error in POST /courses/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
