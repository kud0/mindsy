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

    // Get exam attempt with raw data
    const { data: attempt, error: attemptError } = await supabase
      .from('exam_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', user.id)
      .single();

    if (attemptError || !attempt) {
      return NextResponse.json(
        { 
          error: 'Exam attempt not found',
          attemptId,
          userId: user.id,
          attemptError: attemptError?.message
        },
        { status: 404 }
      );
    }

    // Get original exam with questions
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', attempt.exam_id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ 
        error: 'Original exam not found',
        examId: attempt.exam_id,
        examError: examError?.message
      }, { status: 404 });
    }

    // Debug information
    const debug = {
      attemptId: attempt.id,
      examId: exam.id,
      userId: user.id,
      attemptAnswersStructure: {
        type: typeof attempt.answers,
        isObject: typeof attempt.answers === 'object',
        isNull: attempt.answers === null,
        keys: attempt.answers ? Object.keys(attempt.answers) : [],
        sampleAnswer: attempt.answers ? Object.entries(attempt.answers)[0] : null,
        rawAnswers: attempt.answers
      },
      examQuestionsStructure: {
        type: typeof exam.questions,
        isArray: Array.isArray(exam.questions),
        count: Array.isArray(exam.questions) ? exam.questions.length : 0,
        sampleQuestion: Array.isArray(exam.questions) ? exam.questions[0] : null,
        hasCorrectAnswers: Array.isArray(exam.questions) && exam.questions[0]?.correctAnswer ? true : false
      },
      mapping: []
    };

    // Try to map answers to questions and see what happens
    if (Array.isArray(exam.questions) && attempt.answers) {
      for (let i = 0; i < Math.min(3, exam.questions.length); i++) {
        const question = exam.questions[i];
        const userAnswer = attempt.answers[question.id];
        const isCorrect = userAnswer === question.correctAnswer;
        
        debug.mapping.push({
          questionIndex: i,
          questionId: question.id,
          questionText: question.question?.substring(0, 50) + '...',
          correctAnswer: question.correctAnswer,
          userAnswer: userAnswer,
          isCorrect: isCorrect,
          userAnswerExists: userAnswer !== undefined,
          answersMatch: userAnswer === question.correctAnswer
        });
      }
    }

    return NextResponse.json({
      debug,
      rawAttempt: attempt,
      rawExam: {
        ...exam,
        questions: exam.questions?.slice(0, 2) // Only show first 2 questions for brevity
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to debug exam review',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}