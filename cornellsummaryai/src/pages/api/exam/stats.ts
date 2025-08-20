import type { APIRoute } from 'astro';
import { requireAuth, supabaseAdmin } from '../../../lib/supabase-server';

export const GET: APIRoute = async ({ request }) => {
  try {
    // Use the same auth pattern as other API endpoints
    const { user } = await requireAuth(request);

    // Get overall performance stats
    const { data: performance } = await supabaseAdmin
      .from('user_performance')
      .select('*')
      .eq('user_id', user.id);

    // Get recent exam attempts
    const { data: recentExams } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        id,
        score,
        percentage,
        time_spent,
        completed_at,
        exam:exams(
          folder_name,
          question_count
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    // Get achievements
    const { data: achievements } = await supabaseAdmin
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id);

    // Calculate aggregated stats
    let totalExams = 0;
    let totalScore = 0;
    let currentStreak = 0;
    let longestStreak = 0;
    let totalXP = 0;

    if (performance && performance.length > 0) {
      performance.forEach(p => {
        totalExams += p.total_exams_taken || 0;
        totalScore += (p.average_score || 0) * (p.total_exams_taken || 0);
        currentStreak = Math.max(currentStreak, p.current_streak || 0);
        longestStreak = Math.max(longestStreak, p.longest_streak || 0);
        totalXP += p.xp_points || 0;
      });
    }

    const averageScore = totalExams > 0 ? totalScore / totalExams : 0;
    const level = Math.floor(totalXP / 1000) + 1;

    // Format recent exams
    const formattedExams = recentExams?.map(attempt => ({
      id: attempt.id,
      folderName: attempt.exam?.folder_name || 'Unknown',
      score: attempt.score,
      percentage: attempt.percentage,
      completedAt: attempt.completed_at,
      timeSpent: attempt.time_spent,
      questionCount: attempt.exam?.question_count || 0
    })) || [];

    return new Response(JSON.stringify({
      totalExams,
      averageScore,
      currentStreak,
      longestStreak,
      xpPoints: totalXP,
      level,
      recentExams: formattedExams,
      achievements: achievements || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching stats:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};