import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/folders
 * Get all user folders with lecture counts
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

    // Fetch all user folders
    const { data: folders, error: foldersError } = await supabase
      .from('user_folders')
      .select('id, folder_name, created_at')
      .eq('user_id', user.id)
      .order('folder_name', { ascending: true });

    if (foldersError) {
      console.error('Error fetching folders:', foldersError);
      return NextResponse.json(
        { error: 'Failed to fetch folders' },
        { status: 500 }
      );
    }

    // For each folder, count completed lectures
    const foldersWithCounts = await Promise.all(
      (folders || []).map(async (folder) => {
        const { count, error: countError } = await supabase
          .from('jobs')
          .select('job_id', { count: 'exact', head: true })
          .eq('user_folder_id', folder.id)
          .eq('status', 'completed');

        if (countError) {
          console.error(`Error counting lectures for folder ${folder.id}:`, countError);
        }

        return {
          ...folder,
          lecture_count: count || 0
        };
      })
    );

    // Filter out folders with no completed lectures (optional - for battles we need lectures)
    const foldersWithLectures = foldersWithCounts.filter(f => f.lecture_count > 0);

    return NextResponse.json({
      success: true,
      folders: foldersWithLectures,
      total: foldersWithLectures.length
    });
  } catch (error) {
    console.error('Unexpected error in GET /folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
