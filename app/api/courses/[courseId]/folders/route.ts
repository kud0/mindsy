import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    courseId: string
  }>
}

/**
 * GET /api/courses/[courseId]/folders
 * Get user's folders for a specific course
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

    // Check if user is enrolled
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Get user's folders for this course
    const { data: folders, error } = await supabase
      .from('user_folders')
      .select('*')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .order('folder_order', { ascending: true });

    if (error) {
      console.error('Error fetching folders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch folders' },
        { status: 500 }
      );
    }

    // Get lecture counts for each folder
    const foldersWithCounts = await Promise.all(
      (folders || []).map(async (folder) => {
        const { count } = await supabase
          .from('jobs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('user_folder_id', folder.id)
          .in('status', ['processing', 'completed', 'failed']);

        return {
          ...folder,
          lecture_count: count || 0
        };
      })
    );

    return NextResponse.json({
      success: true,
      folders: foldersWithCounts
    });

  } catch (error) {
    console.error('Unexpected error in GET /courses/[courseId]/folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/courses/[courseId]/folders
 * Create a new folder manually
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

    // Check if user is enrolled
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', courseId)
      .eq('is_active', true)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'Not enrolled in this course' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { folder_name, parent_folder_id, folder_order } = body;

    // Validate folder name
    if (!folder_name || folder_name.trim().length === 0) {
      return NextResponse.json(
        { error: 'Folder name is required' },
        { status: 400 }
      );
    }

    // If parent_folder_id is provided, verify it exists and belongs to user
    if (parent_folder_id) {
      const { data: parentFolder } = await supabase
        .from('user_folders')
        .select('id')
        .eq('id', parent_folder_id)
        .eq('user_id', user.id)
        .eq('course_id', courseId)
        .single();

      if (!parentFolder) {
        return NextResponse.json(
          { error: 'Parent folder not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Calculate folder_order if not provided
    let calculatedOrder = folder_order || 0;
    if (folder_order === undefined) {
      // Get max order for siblings
      const query = supabase
        .from('user_folders')
        .select('folder_order')
        .eq('user_id', user.id)
        .eq('course_id', courseId);

      // Filter by parent
      if (parent_folder_id) {
        query.eq('parent_folder_id', parent_folder_id);
      } else {
        query.is('parent_folder_id', null);
      }

      const { data: siblings } = await query;

      if (siblings && siblings.length > 0) {
        const maxOrder = Math.max(...siblings.map(s => s.folder_order || 0));
        calculatedOrder = maxOrder + 1;
      }
    }

    // Create folder
    const { data: newFolder, error } = await supabase
      .from('user_folders')
      .insert({
        user_id: user.id,
        course_id: courseId,
        folder_name: folder_name.trim(),
        parent_folder_id: parent_folder_id || null,
        folder_order: calculatedOrder,
        created_from_template_id: null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      return NextResponse.json(
        { error: 'Failed to create folder' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folder: newFolder
    });

  } catch (error) {
    console.error('Unexpected error in POST /courses/[courseId]/folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
