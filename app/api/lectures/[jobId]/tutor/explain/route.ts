import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';
import { explainConcept, type ExplainConceptInput } from '@/lib/grok-client';

export const dynamic = 'force-dynamic';

/**
 * Interface for explanation request
 */
interface ExplainRequest {
  selectedText: string;
  tabName: 'overview' | 'explanations' | 'summary' | 'transcript';
  sectionContext: string;
}

/**
 * POST /api/lectures/[jobId]/tutor/explain
 * Generate AI explanation for selected text ("Raise Your Hand" feature)
 */
export async function POST(
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
    // Parse request body
    const body: ExplainRequest = await request.json();

    // Validate request body
    if (!body.selectedText || body.selectedText.trim().length === 0) {
      return createErrorResponse('Selected text is required');
    }

    if (!body.tabName) {
      return createErrorResponse('Tab name is required');
    }

    if (!body.sectionContext || body.sectionContext.trim().length === 0) {
      return createErrorResponse('Section context is required');
    }

    console.log('🙋 Tutor explanation request:', {
      jobId,
      userId: user.id,
      tabName: body.tabName,
      selectedTextLength: body.selectedText.length,
      contextLength: body.sectionContext.length
    });

    const supabase = await createClient();

    // Fetch job to verify ownership and get lecture info
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id, lecture_title, detected_language')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      return createErrorResponse('Lecture not found', 404);
    }

    // Verify user owns this lecture
    if (job.user_id !== user.id) {
      return createErrorResponse('Unauthorized', 403);
    }

    // Prepare input for AI explanation
    const explainInput: ExplainConceptInput = {
      selectedText: body.selectedText,
      lectureTitle: job.lecture_title,
      tabName: body.tabName,
      sectionContext: body.sectionContext,
      detectedLanguage: job.detected_language || undefined
    };

    console.log('🤖 Calling Grok to explain concept...');

    // Generate explanation using Grok
    const result = await explainConcept(explainInput);

    if (!result.success || !result.explanation) {
      console.error('❌ Explanation generation failed:', result.error);
      return createErrorResponse(
        result.error || 'Failed to generate explanation',
        500
      );
    }

    console.log('✅ Explanation generated successfully');

    // Save to database for persistence
    const { data: savedQuestion, error: saveError } = await supabase
      .from('tutor_questions')
      .insert({
        job_id: jobId,
        user_id: user.id,
        tab_name: body.tabName,
        selected_text: body.selectedText,
        section_context: body.sectionContext.substring(0, 1000), // Truncate for storage
        ai_explanation: result.explanation,
        position_hint: null // Can be implemented later for highlighting
      })
      .select()
      .single();

    if (saveError) {
      console.error('⚠️ Failed to save tutor question:', saveError);
      // Don't fail the request - explanation was still generated
      // Just log the error and continue
    } else {
      console.log('💾 Tutor question saved to database:', savedQuestion?.id);
    }

    // Return success with explanation
    return createSuccessResponse({
      id: savedQuestion?.id || null,
      explanation: result.explanation,
      createdAt: savedQuestion?.created_at || new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Tutor explanation error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
