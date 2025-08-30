import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const supabase = await createClient();
    const { examId } = params;
    
    if (!examId) {
      return NextResponse.json({ error: 'Exam ID required' }, { status: 400 });
    }

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get exam
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('id', examId)
      .eq('user_id', user.id)
      .single();

    if (examError || !exam) {
      return NextResponse.json({ error: 'Exam not found' }, { status: 404 });
    }

    // Remove correct answers before sending to client (for security)
    const questionsWithoutAnswers = exam.questions.map((q: any) => ({
      ...q,
      correctAnswer: undefined,
      explanation: undefined
    }));

    return NextResponse.json({
      id: exam.id,
      title: exam.title,
      questions: questionsWithoutAnswers,
      questionCount: exam.question_count,
      difficulty: exam.difficulty,
      folderName: exam.folder_name
    });

  } catch (error) {
    console.error('Error fetching exam:', error);
    return NextResponse.json({
      error: 'Failed to fetch exam',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}