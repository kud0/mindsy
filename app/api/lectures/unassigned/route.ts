import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/lectures/unassigned
 * Get all lectures not assigned to any folder
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

    // Get lectures without folder assignment
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
      .is('user_folder_id', null)
      .in('status', ['processing', 'completed', 'failed'])
      .order('created_at', { ascending: false });

    if (lecturesError) {
      console.error('Error fetching unassigned lectures:', lecturesError);
      return NextResponse.json(
        { error: 'Failed to fetch unassigned lectures' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      lectures: lectures || [],
      count: lectures?.length || 0
    });

  } catch (error) {
    console.error('Unexpected error in GET /lectures/unassigned:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
