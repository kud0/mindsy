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

    const results: any = {
      userId: user.id,
      timestamp: new Date().toISOString(),
      checks: {}
    };

    // Check exam_attempts table
    try {
      const { data: attempts, error: attemptsError } = await supabase
        .from('exam_attempts')
        .select('*')
        .eq('user_id', user.id)
        .limit(5);

      results.checks.exam_attempts = {
        success: !attemptsError,
        count: attempts?.length || 0,
        error: attemptsError?.message,
        sampleData: attempts?.[0] || null
      };
    } catch (e) {
      results.checks.exam_attempts = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // Check exams table
    try {
      const { data: exams, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id)
        .limit(3);

      results.checks.exams = {
        success: !examsError,
        count: exams?.length || 0,
        error: examsError?.message,
        sampleData: exams?.[0] || null
      };
    } catch (e) {
      results.checks.exams = {
        success: false,
        error: e instanceof Error ? e.message : 'Unknown error'
      };
    }

    // If we have exam attempts, check the structure of answers and questions
    if (results.checks.exam_attempts.sampleData) {
      const attempt = results.checks.exam_attempts.sampleData;
      results.answerStructure = {
        hasAnswers: !!attempt.answers,
        answersType: typeof attempt.answers,
        answersKeys: attempt.answers ? Object.keys(attempt.answers) : [],
        sampleAnswer: attempt.answers ? Object.entries(attempt.answers)[0] : null
      };

      // Get the exam questions for this attempt
      if (attempt.exam_id) {
        try {
          const { data: exam, error: examError } = await supabase
            .from('exams')
            .select('questions')
            .eq('id', attempt.exam_id)
            .single();

          if (!examError && exam?.questions) {
            const questions = exam.questions;
            results.questionStructure = {
              questionsCount: questions.length,
              sampleQuestion: questions[0] || null,
              hasCorrectAnswers: questions[0]?.correctAnswer ? true : false
            };
          }
        } catch (e) {
          results.questionStructure = {
            error: e instanceof Error ? e.message : 'Failed to get questions'
          };
        }
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to check exam data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}