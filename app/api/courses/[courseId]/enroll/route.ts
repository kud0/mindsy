import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    courseId: string
  }>
}

/**
 * POST /api/courses/[courseId]/enroll
 * Enroll current user in a course (optionally apply template)
 *
 * Body: {
 *   template_id?: string; // Optional: apply template immediately after enrolling
 * }
 */
export async function POST(
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

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const { template_id } = body;

    // Check if course exists
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, course_code, institution')
      .eq('id', courseId)
      .single();

    if (courseError || !course) {
      return NextResponse.json(
        { error: 'Course not found' },
        { status: 404 }
      );
    }

    // Check if already enrolled
    const { data: existing } = await supabase
      .from('course_enrollments')
      .select('id, is_active')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .single();

    if (existing) {
      // If enrollment exists but is inactive, reactivate it
      if (!existing.is_active) {
        const { error: updateError } = await supabase
          .from('course_enrollments')
          .update({ is_active: true })
          .eq('id', existing.id);

        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to re-enroll' },
            { status: 500 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'Already enrolled in this course' },
          { status: 409 }
        );
      }
    } else {
      // Create new enrollment
      const { error: enrollError } = await supabase
        .from('course_enrollments')
        .insert({
          user_id: user.id,
          course_id: courseId,
          is_active: true
        });

      if (enrollError) {
        console.error('Enrollment error:', enrollError);
        return NextResponse.json(
          { error: 'Failed to enroll' },
          { status: 500 }
        );
      }
    }

    // Apply template if provided
    let folders_created = 0;
    if (template_id) {
      // Verify template belongs to this course
      const { data: template } = await supabase
        .from('course_templates')
        .select('folder_structure')
        .eq('id', template_id)
        .eq('course_id', courseId)
        .single();

      if (template && template.folder_structure) {
        const folders = template.folder_structure.folders || [];

        // Create folders from template
        const folderInserts = folders.map((folder: any, index: number) => ({
          user_id: user.id,
          course_id: courseId,
          folder_name: folder.name,
          folder_order: index,
          created_from_template_id: template_id
        }));

        if (folderInserts.length > 0) {
          const { error: folderError } = await supabase
            .from('user_folders')
            .insert(folderInserts);

          if (!folderError) {
            folders_created = folderInserts.length;
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      enrolled: true,
      folders_created
    });
  } catch (error) {
    console.error('Unexpected error in POST /courses/[courseId]/enroll:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/courses/[courseId]/enroll
 * Unenroll current user from a course (soft delete)
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

    // Soft delete: set is_active to false
    const { error } = await supabase
      .from('course_enrollments')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('course_id', courseId);

    if (error) {
      console.error('Unenrollment error:', error);
      return NextResponse.json(
        { error: 'Failed to unenroll' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      enrolled: false
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /courses/[courseId]/enroll:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
