import type { APIRoute } from 'astro';
import { requireAuth, supabaseAdmin } from '../../../lib/supabase-server';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Use the same auth pattern as other API endpoints
    const { user } = await requireAuth(request);

    // Get request body
    const body = await request.json();
    const { examId, answers, timeSpent } = body;

    if (!examId || !answers) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get exam with questions
    const { data: exam, error: examError } = await supabaseAdmin
      .from('exams')
      .select('*')
      .eq('id', examId)
      .eq('user_id', user.id)
      .single();

    if (examError || !exam) {
      return new Response(JSON.stringify({ error: 'Exam not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if exam already attempted
    const { data: existingAttempt } = await supabaseAdmin
      .from('exam_attempts')
      .select('id')
      .eq('exam_id', examId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single();

    if (existingAttempt) {
      return new Response(JSON.stringify({ error: 'Exam already completed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Grade the exam
    const questions = exam.questions as any[];
    let correctCount = 0;
    let incorrectCount = 0;
    const performanceByTopic: Record<string, { correct: number; total: number }> = {};
    const gradedQuestions = [];

    for (const question of questions) {
      const userAnswer = answers[question.id];
      const isCorrect = userAnswer === question.correctAnswer;

      if (isCorrect) {
        correctCount++;
      } else {
        incorrectCount++;
      }

      // Track performance by topic
      if (!performanceByTopic[question.topic]) {
        performanceByTopic[question.topic] = { correct: 0, total: 0 };
      }
      performanceByTopic[question.topic].total++;
      if (isCorrect) {
        performanceByTopic[question.topic].correct++;
      }

      // Add graded question for response
      gradedQuestions.push({
        ...question,
        userAnswer,
        isCorrect
      });
    }

    const totalQuestions = questions.length;
    const score = correctCount * 5; // 5 points per question
    const percentage = (correctCount / totalQuestions) * 100;

    // Create or update exam attempt
    const { data: attempt, error: attemptError } = await supabaseAdmin
      .from('exam_attempts')
      .insert({
        exam_id: examId,
        user_id: user.id,
        answers,
        score,
        percentage,
        correct_count: correctCount,
        incorrect_count: incorrectCount,
        time_spent: timeSpent,
        performance_by_topic: performanceByTopic,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .select()
      .single();

    if (attemptError) {
      console.error('Error saving attempt:', attemptError);
      return new Response(JSON.stringify({ 
        error: 'Failed to save exam attempt',
        details: attemptError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check for achievements
    const achievements = [];
    
    // Perfect score achievement
    if (percentage === 100) {
      achievements.push({
        type: 'perfect_score',
        name: 'Perfect Score!',
        description: 'Scored 100% on an exam'
      });
    }

    // First exam achievement
    const { count: examCount } = await supabaseAdmin
      .from('exam_attempts')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .eq('status', 'completed');

    if (examCount === 1) {
      achievements.push({
        type: 'first_exam',
        name: 'First Steps',
        description: 'Completed your first exam'
      });
    }

    // Speed demon achievement (< 1 min per question)
    if (timeSpent < totalQuestions * 60) {
      achievements.push({
        type: 'speed_demon',
        name: 'Speed Demon',
        description: 'Completed an exam in under 1 minute per question'
      });
    }

    // Save achievements
    for (const achievement of achievements) {
      await supabaseAdmin
        .from('user_achievements')
        .upsert({
          user_id: user.id,
          achievement_type: achievement.type,
          achievement_name: achievement.name,
          achievement_description: achievement.description,
          exam_id: examId
        }, {
          onConflict: 'user_id,achievement_type'
        });
    }

    // Return results
    return new Response(JSON.stringify({
      success: true,
      results: {
        score,
        percentage,
        correct: correctCount,
        incorrect: incorrectCount,
        answers,
        timeSpent,
        questions: gradedQuestions,
        performanceByTopic,
        achievements
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error submitting exam:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to submit exam',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};