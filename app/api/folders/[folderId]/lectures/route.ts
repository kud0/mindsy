import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    folderId: string
  }>
}

/**
 * GET /api/folders/[folderId]/lectures
 * Get all lectures assigned to this folder
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { folderId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
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

    // Get lectures assigned to this folder
    const { data: lectures, error: lecturesError } = await supabase
      .from('jobs')
      .select(`
        job_id,
        lecture_title,
        course_subject,
        created_at,
        status,
        user_folder_id
      `)
      .eq('user_id', user.id)
      .eq('user_folder_id', folderId)
      .in('status', ['processing', 'completed', 'failed'])
      .order('created_at', { ascending: false });

    if (lecturesError) {
      console.error('Error fetching lectures:', lecturesError);
      return NextResponse.json(
        { error: 'Failed to fetch lectures' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folder: folder,
      lectures: lectures || [],
      count: lectures?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in GET /folders/[folderId]/lectures:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
