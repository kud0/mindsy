import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-server';

export const GET: APIRoute = async ({ locals }) => {
  try {
    // Get user from locals (set by middleware)
    const user = locals.user;
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all exam attempts for analytics
    const { data: attempts, error: attemptsError } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        id,
        score,
        percentage,
        correct_count,
        incorrect_count,
        time_spent,
        completed_at,
        performance_by_topic,
        exam_id,
        exams!inner(
          folder_name,
          question_count,
          questions
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .order('completed_at', { ascending: true });

    if (attemptsError) {
      throw attemptsError;
    }

    // Process performance data
    const performanceData = {
      totalExams: attempts.length,
      averageScore: attempts.length > 0 ? attempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / attempts.length : 0,
      totalTimeSpent: attempts.reduce((sum, a) => sum + (a.time_spent || 0), 0),
      
      // Score trends over time
      scoreTrends: attempts.map(a => ({
        date: a.completed_at,
        score: a.percentage,
        folderName: a.exams.folder_name
      })),
      
      // Performance by folder
      folderPerformance: {},
      
      // Performance by topic
      topicPerformance: {},
      
      // Difficulty analysis
      difficultyAnalysis: {
        easy: { correct: 0, total: 0 },
        medium: { correct: 0, total: 0 },
        hard: { correct: 0, total: 0 }
      },
      
      // Time analysis
      timeAnalysis: {
        averageTimePerQuestion: 0,
        fastestExam: null,
        slowestExam: null
      },
      
      // Weekly performance
      weeklyPerformance: [],
      
      // Improvement areas
      improvementAreas: []
    };

    // Process folder performance
    const folderStats = {};
    for (const attempt of attempts) {
      const folder = attempt.exams.folder_name;
      if (!folderStats[folder]) {
        folderStats[folder] = {
          attempts: 0,
          totalScore: 0,
          totalTime: 0,
          bestScore: 0,
          questions: 0
        };
      }
      
      folderStats[folder].attempts++;
      folderStats[folder].totalScore += attempt.percentage || 0;
      folderStats[folder].totalTime += attempt.time_spent || 0;
      folderStats[folder].bestScore = Math.max(folderStats[folder].bestScore, attempt.percentage || 0);
      folderStats[folder].questions += attempt.exams.question_count || 0;
    }
    
    // Convert to performance format
    performanceData.folderPerformance = Object.entries(folderStats).map(([folder, stats]: [string, any]) => ({
      folder,
      attempts: stats.attempts,
      averageScore: stats.totalScore / stats.attempts,
      bestScore: stats.bestScore,
      averageTimePerQuestion: (stats.totalTime / stats.questions) || 0,
      totalQuestions: stats.questions
    }));

    // Process topic performance and difficulty analysis
    const topicStats = {};
    for (const attempt of attempts) {
      // Analyze each question in the attempt
      const questions = attempt.exams.questions as any[];
      
      for (const question of questions) {
        const topic = question.topic || 'Unknown';
        const difficulty = question.difficulty || 'medium';
        const userAnswer = (attempt as any).answers?.[question.id];
        const isCorrect = userAnswer === question.correctAnswer;
        
        // Topic performance
        if (!topicStats[topic]) {
          topicStats[topic] = { correct: 0, total: 0 };
        }
        topicStats[topic].total++;
        if (isCorrect) topicStats[topic].correct++;
        
        // Difficulty analysis
        if (performanceData.difficultyAnalysis[difficulty]) {
          performanceData.difficultyAnalysis[difficulty].total++;
          if (isCorrect) performanceData.difficultyAnalysis[difficulty].correct++;
        }
      }
    }
    
    // Convert topic stats to performance format
    performanceData.topicPerformance = Object.entries(topicStats).map(([topic, stats]: [string, any]) => ({
      topic,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
      correct: stats.correct,
      total: stats.total
    }));

    // Time analysis
    if (attempts.length > 0) {
      const totalQuestions = attempts.reduce((sum, a) => sum + (a.exams.question_count || 0), 0);
      performanceData.timeAnalysis.averageTimePerQuestion = 
        totalQuestions > 0 ? performanceData.totalTimeSpent / totalQuestions : 0;
      
      const timePerExam = attempts.map(a => ({
        time: a.time_spent || 0,
        folder: a.exams.folder_name,
        date: a.completed_at
      }));
      
      performanceData.timeAnalysis.fastestExam = timePerExam.reduce((min, exam) => 
        exam.time < min.time ? exam : min
      );
      
      performanceData.timeAnalysis.slowestExam = timePerExam.reduce((max, exam) => 
        exam.time > max.time ? exam : max
      );
    }

    // Weekly performance (last 8 weeks)
    const now = new Date();
    const weeklyData = {};
    
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (i * 7));
      weekStart.setHours(0, 0, 0, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      
      const weekKey = `Week ${8 - i}`;
      weeklyData[weekKey] = {
        week: weekKey,
        exams: 0,
        averageScore: 0,
        totalScore: 0
      };
      
      const weekAttempts = attempts.filter(a => {
        const attemptDate = new Date(a.completed_at);
        return attemptDate >= weekStart && attemptDate <= weekEnd;
      });
      
      if (weekAttempts.length > 0) {
        weeklyData[weekKey].exams = weekAttempts.length;
        weeklyData[weekKey].totalScore = weekAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0);
        weeklyData[weekKey].averageScore = weeklyData[weekKey].totalScore / weekAttempts.length;
      }
    }
    
    performanceData.weeklyPerformance = Object.values(weeklyData);

    // Identify improvement areas (topics with < 70% accuracy)
    performanceData.improvementAreas = performanceData.topicPerformance
      .filter(tp => tp.accuracy < 70 && tp.total >= 3) // Only include topics with enough attempts
      .sort((a, b) => a.accuracy - b.accuracy)
      .slice(0, 5); // Top 5 improvement areas

    return new Response(JSON.stringify(performanceData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching performance data:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch performance data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};