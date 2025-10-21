import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/schedule/upcoming-deadlines
 * Get upcoming deadlines for a specific course or all courses
 * Query params:
 *   - course_id: Filter by specific course (optional)
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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get('course_id');

    // Helper function to calculate days until
    const calculateDaysUntil = (date: string): number => {
      const targetDate = new Date(date);
      const now = new Date();
      const diffTime = targetDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    // Query 1: Get next closest deadline (any type, within 14 days)
    let closestQuery = supabase
      .from('study_sessions')
      .select(`
        id,
        title,
        start_time,
        end_time,
        deadline_type,
        priority,
        completion_percentage,
        completed,
        user_folder_id,
        user_folders (
          id,
          folder_name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_deadline', true)
      .gte('start_time', new Date().toISOString())
      .lte('start_time', new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString())
      .order('start_time', { ascending: true })
      .limit(1);

    if (courseId) {
      closestQuery = closestQuery.eq('course_id', courseId);
    }

    const { data: closestDeadlines, error: closestError } = await closestQuery;

    if (closestError) {
      console.error('Error fetching closest deadline:', closestError);
    }

    const nextClosestDeadline = closestDeadlines?.[0]
      ? {
          id: closestDeadlines[0].id,
          title: closestDeadlines[0].title,
          deadline_type: closestDeadlines[0].deadline_type,
          start_time: closestDeadlines[0].start_time,
          daysUntil: calculateDaysUntil(closestDeadlines[0].start_time),
          priority: closestDeadlines[0].priority || 'medium',
          subject: closestDeadlines[0].user_folders?.folder_name || 'General',
          completion_percentage: closestDeadlines[0].completion_percentage || 0,
          completed: closestDeadlines[0].completed || false
        }
      : null;

    // Query 2: Get next exam (no date limit, always show)
    let examQuery = supabase
      .from('study_sessions')
      .select(`
        id,
        title,
        start_time,
        end_time,
        deadline_type,
        priority,
        completion_percentage,
        completed,
        user_folder_id,
        user_folders (
          id,
          folder_name
        )
      `)
      .eq('user_id', user.id)
      .eq('is_deadline', true)
      .eq('deadline_type', 'exam')
      .gte('start_time', new Date().toISOString())
      .order('start_time', { ascending: true })
      .limit(1);

    if (courseId) {
      examQuery = examQuery.eq('course_id', courseId);
    }

    const { data: exams, error: examError } = await examQuery;

    if (examError) {
      console.error('Error fetching next exam:', examError);
    }

    const nextExam = exams?.[0]
      ? {
          id: exams[0].id,
          title: exams[0].title,
          deadline_type: exams[0].deadline_type,
          start_time: exams[0].start_time,
          daysUntil: calculateDaysUntil(exams[0].start_time),
          priority: exams[0].priority || 'high',
          subject: exams[0].user_folders?.folder_name || 'General',
          completion_percentage: exams[0].completion_percentage || 0,
          completed: exams[0].completed || false
        }
      : null;

    return NextResponse.json({
      success: true,
      data: {
        nextClosestDeadline,
        nextExam
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /schedule/upcoming-deadlines:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
