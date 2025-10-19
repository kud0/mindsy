import { NextRequest, NextResponse } from 'next/server';
import { createClient, createServiceRoleClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    courseId: string
  }>
}

/**
 * GET /api/courses/[courseId]
 * Get course details including templates and enrolled students
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

    // Get course details
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('*')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Get enrollment count and check if current user is enrolled
    const { data: enrollments } = await supabase
      .from('course_enrollments')
      .select('user_id, enrolled_at')
      .eq('course_id', courseId)
      .eq('is_active', true);

    const enrollment_count = enrollments?.length || 0;
    const is_enrolled = enrollments?.some(e => e.user_id === user.id) || false;

    // Get templates for this course (with vote counts)
    const { data: templates } = await supabase
      .from('course_templates')
      .select(`
        *,
        creator:profiles!course_templates_created_by_fkey(full_name, avatar_url),
        user_voted:template_votes(user_id)
      `)
      .eq('course_id', courseId)
      .order('vote_count', { ascending: false });

    // Transform templates to include user vote status
    const transformedTemplates = templates?.map((template: any) => ({
      ...template,
      has_voted: template.user_voted?.some((v: any) => v.user_id === user.id) || false,
      creator_name: template.creator?.full_name || 'Unknown'
    })) || [];

    // Get enrolled students (only if user is enrolled)
    let students = [];
    if (is_enrolled) {
      const { data: studentData } = await supabase
        .from('course_enrollments')
        .select(`
          enrolled_at,
          student:profiles!course_enrollments_user_id_fkey(id, full_name, email, avatar_url)
        `)
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('enrolled_at', { ascending: true });

      students = studentData?.map((e: any) => e.student) || [];
    }

    return NextResponse.json({
      success: true,
      course: {
        ...course,
        enrollment_count,
        is_enrolled,
        is_creator: course.created_by === user.id,
        template_count: templates?.length || 0
      },
      templates: transformedTemplates,
      students: students.filter(Boolean) // Remove any null students
    });
  } catch (error) {
    console.error('Unexpected error in GET /courses/[courseId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/[courseId]
 * Delete a course (only creator can delete)
 */
export async function DELETE(
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

    // Get course details to check ownership
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('created_by')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if user is the creator
    if (course.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only the course creator can delete this course' },
        { status: 403 }
      );
    }

    console.log('🗑️ Deleting course:', courseId);

    // Use service role client to bypass RLS for deletion
    // (User is verified as course creator above)
    const serviceSupabase = createServiceRoleClient();

    // Manually delete all related data in correct order
    // 1. Delete all user folders for this course
    const { error: foldersError } = await serviceSupabase
      .from('user_folders')
      .delete()
      .eq('course_id', courseId);

    if (foldersError) {
      console.error('Error deleting folders:', foldersError);
    } else {
      console.log('✅ Deleted folders for course');
    }

    // 2. Delete all template votes for templates in this course
    const { data: courseTemplates } = await serviceSupabase
      .from('course_templates')
      .select('id')
      .eq('course_id', courseId);

    if (courseTemplates && courseTemplates.length > 0) {
      const templateIds = courseTemplates.map(t => t.id);
      const { error: votesError } = await serviceSupabase
        .from('template_votes')
        .delete()
        .in('template_id', templateIds);

      if (votesError) {
        console.error('Error deleting template votes:', votesError);
      } else {
        console.log('✅ Deleted template votes');
      }
    }

    // 3. Delete all templates for this course
    const { error: templatesError } = await serviceSupabase
      .from('course_templates')
      .delete()
      .eq('course_id', courseId);

    if (templatesError) {
      console.error('Error deleting templates:', templatesError);
    } else {
      console.log('✅ Deleted templates for course');
    }

    // 4. Delete all enrollments for this course
    const { error: enrollmentsError } = await serviceSupabase
      .from('course_enrollments')
      .delete()
      .eq('course_id', courseId);

    if (enrollmentsError) {
      console.error('Error deleting enrollments:', enrollmentsError);
      return NextResponse.json(
        { error: 'Failed to delete course enrollments' },
        { status: 500 }
      );
    } else {
      console.log('✅ Deleted enrollments for course');
    }

    // 5. Finally, delete the course itself
    const { error: deleteError } = await serviceSupabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (deleteError) {
      console.error('Course deletion error:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete course' },
        { status: 500 }
      );
    }

    console.log('✅ Course deleted successfully');

    return NextResponse.json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /courses/[courseId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
