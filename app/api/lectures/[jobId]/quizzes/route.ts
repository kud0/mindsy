import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lectures/[jobId]/quizzes
 * Get all quizzes for a lecture
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // Authenticate user
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;
  const { jobId } = params;

  try {
    const supabase = await createClient();

    // Verify user owns this lecture
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      return createErrorResponse('Lecture not found', 404);
    }

    if (job.user_id !== user.id) {
      return createErrorResponse('Unauthorized', 403);
    }

    // Fetch all quizzes for this lecture
    const { data: quizzes, error: quizzesError } = await supabase
      .from('quizzes')
      .select('id, title, quiz_config, created_at, updated_at')
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (quizzesError) {
      console.error('❌ Failed to fetch quizzes:', quizzesError);
      return createErrorResponse('Failed to fetch quizzes', 500);
    }

    // Add question count to each quiz
    const quizzesWithMetadata = quizzes?.map(quiz => ({
      ...quiz,
      questionCount: quiz.quiz_config?.numQuestions || 0
    })) || [];

    return createSuccessResponse({
      quizzes: quizzesWithMetadata
    });

  } catch (error) {
    console.error('❌ Error fetching quizzes:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
