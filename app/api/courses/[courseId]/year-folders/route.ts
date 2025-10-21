import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/courses/[courseId]/year-folders
 * Get top-level folders for a course (year/semester selection)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { courseId: string } }
) {
  try {
    const supabase = await createClient();
    const { courseId } = params;

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Use the database function to get year folders
    const { data: folders, error } = await supabase
      .rpc('get_course_year_folders', {
        p_user_id: user.id,
        p_course_id: courseId
      });

    if (error) {
      console.error('Error fetching year folders:', error);
      return NextResponse.json(
        { error: 'Failed to fetch year folders' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      folders: folders || []
    });

  } catch (error) {
    console.error('Unexpected error in GET /courses/[courseId]/year-folders:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
