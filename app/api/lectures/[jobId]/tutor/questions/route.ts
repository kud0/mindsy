import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lectures/[jobId]/tutor/questions
 * Fetch all tutor questions/explanations for this lecture (history)
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

    // Fetch all tutor questions for this lecture
    const { data: questions, error: questionsError } = await supabase
      .from('tutor_questions')
      .select('id, tab_name, selected_text, ai_explanation, created_at')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (questionsError) {
      console.error('❌ Failed to fetch tutor questions:', questionsError);
      return createErrorResponse('Failed to fetch questions', 500);
    }

    console.log(`✅ Fetched ${questions?.length || 0} tutor questions for job ${jobId}`);

    return createSuccessResponse({
      questions: questions || []
    });

  } catch (error) {
    console.error('❌ Error fetching tutor questions:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
