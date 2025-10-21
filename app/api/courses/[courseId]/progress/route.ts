import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { calculateFolderProgress } from '@/lib/courses/progress';

interface RouteParams {
  params: Promise<{
    courseId: string;
  }>;
}

/**
 * GET /api/courses/[courseId]/progress?folderId=xxx
 * Calculate progress for a specific folder in a course
 *
 * Query params:
 * - folderId (required): The folder ID to calculate progress for
 *
 * Returns:
 * {
 *   success: true,
 *   progress: 45,        // Percentage (0-100)
 *   completed: 12,       // Number of completed lectures
 *   total: 27,           // Total number of lectures
 *   folderIds: [...]     // All folder IDs included in calculation
 * }
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

    // Get folderId from query params
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!folderId) {
      return NextResponse.json(
        { error: 'folderId query parameter is required' },
        { status: 400 }
      );
    }

    // Verify course exists and user is enrolled
    const { data: enrollment, error: enrollmentError } = await supabase
      .from('course_enrollments')
      .select('id, course_id')
      .eq('course_id', courseId)
      .eq('user_id', user.id)
      .single();

    if (enrollmentError || !enrollment) {
      return NextResponse.json(
        { error: 'Course not found or not enrolled' },
        { status: 404 }
      );
    }

    // Verify folder exists and belongs to user
    const { data: folder, error: folderError } = await supabase
      .from('user_folders')
      .select('id, folder_name, course_id')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found or access denied' },
        { status: 404 }
      );
    }

    // Optional: Verify folder belongs to this course
    if (folder.course_id !== courseId) {
      return NextResponse.json(
        { error: 'Folder does not belong to this course' },
        { status: 400 }
      );
    }

    // Calculate progress
    const progressData = await calculateFolderProgress(user.id, folderId);

    return NextResponse.json({
      success: true,
      ...progressData
    });

  } catch (error) {
    console.error('Unexpected error in GET /courses/[courseId]/progress:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
