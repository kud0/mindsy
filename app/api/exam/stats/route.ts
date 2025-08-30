import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get recent exam attempts directly
    const { data: recentExams, error: examsError } = await supabase
      .from('exam_attempts')
      .select(`
        id,
        score,
        percentage,
        time_spent,
        completed_at,
        exam_id,
        correct_count,
        incorrect_count
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(10);

    if (examsError) {
      console.error('Exam attempts query error:', examsError);
      return NextResponse.json({
        totalExams: 0,
        averageScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        xpPoints: 0,
        level: 1,
        recentExams: [],
        error: 'Could not load exam data: ' + examsError.message
      });
    }

    // Get exam details for recent attempts
    const formattedExams = await Promise.all((recentExams || []).map(async (attempt) => {
      const { data: exam } = await supabase
        .from('exams')
        .select('title, folder_name, question_count')
        .eq('id', attempt.exam_id)
        .single();
      
      return {
        id: attempt.id,
        examTitle: exam?.title || 'Unknown Exam',
        folderName: exam?.folder_name || 'Unknown Folder',
        score: attempt.score,
        percentage: attempt.percentage,
        completedAt: attempt.completed_at,
        timeSpent: attempt.time_spent,
        questionCount: exam?.question_count || 0
      };
    }));

    // Calculate aggregated stats from exam attempts
    const totalExams = recentExams?.length || 0;
    const averageScore = totalExams > 0 
      ? Math.round((recentExams.reduce((sum, e) => sum + (e.percentage || 0), 0) / totalExams) * 100) / 100
      : 0;

    // Calculate XP and level (10 XP per correct answer)
    const totalXP = (recentExams || []).reduce((sum, exam) => {
      return sum + (exam.correct_count || 0) * 10;
    }, 0);
    const level = Math.floor(totalXP / 1000) + 1;

    // Calculate current streak (simplified - consecutive days)
    let currentStreak = 0;
    let longestStreak = 0;
    
    if (recentExams && recentExams.length > 0) {
      const today = new Date();
      const lastExamDate = new Date(recentExams[0].completed_at);
      const daysDiff = Math.floor((today.getTime() - lastExamDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 1) {
        currentStreak = 1;
        // Check for consecutive days
        for (let i = 1; i < recentExams.length; i++) {
          const prevExamDate = new Date(recentExams[i].completed_at);
          const currExamDate = new Date(recentExams[i-1].completed_at);
          const diff = Math.floor((currExamDate.getTime() - prevExamDate.getTime()) / (1000 * 60 * 60 * 24));
          if (diff <= 1) {
            currentStreak++;
          } else {
            break;
          }
        }
      }
      longestStreak = currentStreak; // Simplified for now
    }

    // Try to get achievements (optional - might not exist yet)
    const { data: achievements } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)
      .order('earned_at', { ascending: false });

    return NextResponse.json({
      totalExams,
      averageScore,
      currentStreak,
      longestStreak,
      xpPoints: totalXP,
      level,
      recentExams: formattedExams,
      achievements: achievements || []
    });

  } catch (error) {
    console.error('Error fetching exam stats:', error);
    return NextResponse.json({
      error: 'Failed to fetch stats',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}