import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-server';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;

export const GET: APIRoute = async ({ cookies, locals }) => {
  try {
    // Get user from locals (set by middleware)
    const user = locals.user;
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get overall performance stats - initialize if doesn't exist
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
        exam_id
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    // Get exam details for recent attempts
    const examDetails = await Promise.all((recentExams || []).map(async (attempt) => {
      const { data: exam } = await supabaseAdmin
        .from('exams')
        .select('folder_name, question_count')
        .eq('id', attempt.exam_id)
        .single();
      
      return {
        id: attempt.id,
        folderName: exam?.folder_name || 'Unknown',
        score: attempt.score,
        percentage: attempt.percentage,
        completedAt: attempt.completed_at,
        timeSpent: attempt.time_spent,
        questionCount: exam?.question_count || 0
      };
    }));

    // Get achievements
    const { data: achievements } = await supabaseAdmin
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    // Calculate stats
    const totalExams = recentExams?.length || 0;
    const averageScore = totalExams > 0
      ? recentExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / totalExams
      : 0;

    // Calculate streak (simplified - just check if exams were taken on consecutive days)
    let currentStreak = 0;
    let longestStreak = 0;
    
    if (recentExams && recentExams.length > 0) {
      // Sort by date
      const sortedExams = [...recentExams].sort((a, b) => 
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      );
      
      // Check if exam was taken today
      const today = new Date().toDateString();
      const lastExamDate = new Date(sortedExams[0].completed_at).toDateString();
      
      if (today === lastExamDate) {
        currentStreak = 1;
        // Check previous days
        let prevDate = new Date();
        prevDate.setDate(prevDate.getDate() - 1);
        
        for (let i = 1; i < sortedExams.length; i++) {
          const examDate = new Date(sortedExams[i].completed_at).toDateString();
          if (examDate === prevDate.toDateString()) {
            currentStreak++;
            prevDate.setDate(prevDate.getDate() - 1);
          } else {
            break;
          }
        }
      }
      
      longestStreak = Math.max(currentStreak, performance?.[0]?.longest_streak || 0);
    }

    // Calculate XP (simple formula: 10 XP per correct answer)
    const xpPoints = recentExams?.reduce((sum, exam) => {
      const correctAnswers = Math.round((exam.percentage / 100) * (exam.score / 5));
      return sum + (correctAnswers * 10);
    }, 0) || 0;

    const level = Math.floor(xpPoints / 1000) + 1;

    return new Response(JSON.stringify({
      totalExams,
      averageScore,
      currentStreak,
      longestStreak,
      xpPoints,
      level,
      recentExams: examDetails
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching exam stats:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};