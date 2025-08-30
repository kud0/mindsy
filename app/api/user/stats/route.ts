import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch user statistics from various tables
    
    // Total lectures count
    const { count: lecturesCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .in('status', ['completed', 'reviewing']);

    // Total exams count
    const { count: examsCount } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    // Calculate average exam score
    const { data: examScores } = await supabase
      .from('exam_results')
      .select('score')
      .eq('user_id', user.id);

    const avgScore = examScores && examScores.length > 0
      ? Math.round(examScores.reduce((acc, curr) => acc + (curr.score || 0), 0) / examScores.length)
      : 0;

    // Get study sessions for study hours
    const { data: studySessions } = await supabase
      .from('study_sessions')
      .select('duration_minutes')
      .eq('user_id', user.id);

    const totalStudyMinutes = studySessions
      ? studySessions.reduce((acc, curr) => acc + (curr.duration_minutes || 0), 0)
      : 0;

    // Calculate current streak (simplified - counts consecutive days with activity)
    const { data: recentActivity } = await supabase
      .from('study_sessions')
      .select('created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);

    let currentStreak = 0;
    if (recentActivity && recentActivity.length > 0) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const dates = recentActivity.map(a => {
        const date = new Date(a.created_at);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      });
      
      const uniqueDates = [...new Set(dates)].sort((a, b) => b - a);
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const expectedDate = today.getTime() - (i * 24 * 60 * 60 * 1000);
        if (Math.abs(uniqueDates[i] - expectedDate) < 24 * 60 * 60 * 1000) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    // Calculate completion rate (completed lectures / total lectures)
    const { count: completedCount } = await supabase
      .from('jobs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    const totalCount = lecturesCount || 1; // Avoid division by zero
    const completionRate = Math.round(((completedCount || 0) / totalCount) * 100);

    const stats = {
      totalLectures: lecturesCount || 0,
      totalExams: examsCount || 0,
      studyHours: totalStudyMinutes || 0,
      currentStreak: currentStreak,
      avgScore: avgScore,
      completionRate: completionRate
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    
    // Return default stats on error
    return NextResponse.json({
      totalLectures: 0,
      totalExams: 0,
      studyHours: 0,
      currentStreak: 0,
      avgScore: 0,
      completionRate: 0
    });
  }
}