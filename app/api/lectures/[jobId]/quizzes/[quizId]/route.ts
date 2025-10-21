import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/lectures/[jobId]/quizzes/[quizId]
 * Get a specific quiz with all questions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; quizId: string }> }
) {
  // Authenticate user
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;
  const { jobId, quizId } = await params;

  try {
    const supabase = await createClient();

    // Fetch quiz and verify ownership
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select('*, jobs!inner(user_id)')
      .eq('id', quizId)
      .eq('job_id', jobId)
      .single();

    if (quizError || !quiz) {
      return createErrorResponse('Quiz not found', 404);
    }

    // Verify user owns this quiz
    if (quiz.jobs.user_id !== user.id) {
      return createErrorResponse('Unauthorized', 403);
    }

    // Return quiz with all questions
    return createSuccessResponse({
      id: quiz.id,
      title: quiz.title,
      questions: quiz.questions,
      config: quiz.quiz_config,
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at
    });

  } catch (error) {
    console.error('❌ Error fetching quiz:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

/**
 * DELETE /api/lectures/[jobId]/quizzes/[quizId]
 * Delete a specific quiz
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string; quizId: string }> }
) {
  // Authenticate user
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;
  const { jobId, quizId } = await params;

  try {
    const supabase = await createClient();

    // Verify quiz exists and user owns it
    const { data: quiz, error: fetchError } = await supabase
      .from('quizzes')
      .select('user_id')
      .eq('id', quizId)
      .eq('job_id', jobId)
      .single();

    if (fetchError || !quiz) {
      return createErrorResponse('Quiz not found', 404);
    }

    if (quiz.user_id !== user.id) {
      return createErrorResponse('Unauthorized', 403);
    }

    // Delete the quiz
    const { error: deleteError } = await supabase
      .from('quizzes')
      .delete()
      .eq('id', quizId);

    if (deleteError) {
      console.error('❌ Failed to delete quiz:', deleteError);
      return createErrorResponse('Failed to delete quiz', 500);
    }

    console.log('✅ Quiz deleted successfully:', quizId);

    return createSuccessResponse({
      success: true,
      message: 'Quiz deleted successfully'
    });

  } catch (error) {
    console.error('❌ Error deleting quiz:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
