import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../../lib/supabase-server';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { attemptId } = params;
    
    if (!attemptId) {
      return new Response(JSON.stringify({ error: 'Attempt ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user from locals (set by middleware)
    const user = locals.user;
    
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get the exam attempt with the original exam
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .select(`
        id,
        answers,
        score,
        percentage,
        correct_count,
        incorrect_count,
        time_spent,
        completed_at,
        exam_id,
        exams!inner(
          id,
          title,
          folder_name,
          questions,
          question_count
        )
      `)
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single();

    if (attemptError || !attempt) {
      return new Response(JSON.stringify({ error: 'Exam attempt not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Combine the exam questions with user's answers
    const exam = attempt.exams;
    const questions = (exam.questions as any[]).map(question => ({
      ...question,
      userAnswer: attempt.answers[question.id],
      isCorrect: attempt.answers[question.id] === question.correctAnswer
    }));

    const reviewData = {
      attemptId: attempt.id,
      examTitle: exam.title,
      folderName: exam.folder_name,
      completedAt: attempt.completed_at,
      score: attempt.score,
      percentage: attempt.percentage,
      correctCount: attempt.correct_count,
      incorrectCount: attempt.incorrect_count,
      timeSpent: attempt.time_spent,
      totalQuestions: exam.question_count,
      questions
    };

    return new Response(JSON.stringify(reviewData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching exam review:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch exam review',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};