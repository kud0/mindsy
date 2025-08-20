import type { APIRoute } from 'astro';
import { requireAuth, supabaseAdmin } from '../../../lib/supabase-server';

export const GET: APIRoute = async ({ params, request }) => {
  try {
    const { examId } = params;
    
    if (!examId) {
      return new Response(JSON.stringify({ error: 'Exam ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Use the same auth pattern as other API endpoints
    const { user } = await requireAuth(request);

    // Get exam
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

    // Remove correct answers before sending to client (for security)
    const questionsWithoutAnswers = exam.questions.map((q: any) => ({
      ...q,
      correctAnswer: undefined,
      explanation: undefined
    }));

    return new Response(JSON.stringify({
      id: exam.id,
      title: exam.title,
      questions: questionsWithoutAnswers,
      questionCount: exam.question_count,
      difficulty: exam.difficulty,
      folderName: exam.folder_name
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error fetching exam:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch exam',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};