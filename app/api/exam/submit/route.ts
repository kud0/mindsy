import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { examId, answers, timeSpent } = body;

    if (!examId || !answers) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get exam with questions
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .eq('user_id', user.id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Check if exam already attempted
    const { data: existingAttempt } = await supabase
      .from('exam_attempts')
      .select('id')
      .eq('exam_id', examId)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .single();

    if (existingAttempt) {
      return NextResponse.json(
        { error: 'Exam already completed' },
        { status: 400 }
      );
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

    // Create exam attempt
    const { data: attempt, error: attemptError } = await supabase
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
      return NextResponse.json({
        error: 'Failed to save exam attempt',
        details: attemptError.message
      }, { status: 500 });
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
    const { count: examCount } = await supabase
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
      await supabase
        .from('user_achievements')
        .upsert({
          user_id: user.id,
          achievement_type: achievement.type,
          achievement_name: achievement.name,
          achievement_description: achievement.description,
          exam_id: examId,
          earned_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,achievement_type'
        });
    }

    // Return results
    return NextResponse.json({
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
    });

  } catch (error) {
    console.error('Error submitting exam:', error);
    return NextResponse.json({
      error: 'Failed to submit exam',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}