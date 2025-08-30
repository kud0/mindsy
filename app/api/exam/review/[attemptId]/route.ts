import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { attemptId: string } }
) {
  try {
    const supabase = await createClient();
    const { attemptId } = params;
    
    if (!attemptId) {
      return NextResponse.json({ error: 'Attempt ID required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get exam attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { error: 'Exam attempt not found' },
        { status: 404 }
      );
    }

    // Get original exam with questions (including answers for review)
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', attempt.exam_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'Original exam not found' }, { status: 404 });
    }

    // Add user answers and correct/incorrect status to questions
    const questionsWithUserAnswers = exam.questions.map((question: any) => ({
      ...question,
      userAnswer: attempt.answers[question.id],
      isCorrect: attempt.answers[question.id] === question.correctAnswer
    }));

    return NextResponse.json({
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
      questions: questionsWithUserAnswers
    });

  } catch (error) {
    console.error('Error fetching exam review:', error);
    return NextResponse.json({
      error: 'Failed to fetch exam review',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}