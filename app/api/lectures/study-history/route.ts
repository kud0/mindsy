import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    console.log('📊 Study History API: Starting request');
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('📊 Study History API: User check:', user ? `Found user: ${user.id}` : 'No user found');
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get lecture IDs from query parameters (optional - if not provided, get all)
    const { searchParams } = new URL(request.url);
    const lectureIds = searchParams.get('lectureIds')?.split(',') || [];

    // Note: lecture_id column has been added to pomodoro_sessions table
    console.log('📊 Study History API: Querying study sessions with lecture_id column');

    // Query pomodoro_sessions for study time data
    let query = supabase
      .from('pomodoro_sessions')
      .select(`
        lecture_id,
        duration,
        started_at,
        was_completed,
        type
      `)
      .eq('user_id', user.id)
      .eq('type', 'focus') // Only count focus sessions
      .eq('was_completed', true) // Only count completed sessions
      .not('lecture_id', 'is', null); // Only sessions with lecture association

    // Filter by specific lecture IDs if provided
    if (lectureIds.length > 0) {
      query = query.in('lecture_id', lectureIds);
    }

    console.log('📊 Study History API: Executing query for user:', user.id);
    const { data: sessions, error } = await query
      .order('started_at', { ascending: false });

    console.log('📊 Study History API: Query result:', {
      sessionsCount: sessions?.length || 0,
      error: error ? {
        message: error.message,
        code: error.code,
        details: error.details
      } : null
    });

    if (error) {
      console.error('📊 Study History API: Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch study history' },
        { status: 500 }
      );
    }

    // Group sessions by lecture_id and calculate statistics
    const studyStats: Record<string, {
      totalMinutes: number;
      sessionCount: number;
      lastStudied: string | null;
      firstStudied: string | null;
    }> = {};

    sessions?.forEach(session => {
      const lectureId = session.lecture_id;
      if (!lectureId) return;

      if (!studyStats[lectureId]) {
        studyStats[lectureId] = {
          totalMinutes: 0,
          sessionCount: 0,
          lastStudied: null,
          firstStudied: null,
        };
      }

      const stats = studyStats[lectureId];
      stats.totalMinutes += session.duration;
      stats.sessionCount += 1;
      
      // Track most recent study session
      if (!stats.lastStudied || new Date(session.started_at) > new Date(stats.lastStudied)) {
        stats.lastStudied = session.started_at;
      }
      
      // Track first study session
      if (!stats.firstStudied || new Date(session.started_at) < new Date(stats.firstStudied)) {
        stats.firstStudied = session.started_at;
      }
    });

    console.log('📊 Study History API: Processed stats for', Object.keys(studyStats).length, 'lectures');

    return NextResponse.json({
      success: true,
      data: studyStats
    });

  } catch (error) {
    console.error('📊 Study History API: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}