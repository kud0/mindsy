import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase-server';
import { createSuccessResponse } from '@/lib/api-response';
import { ErrorType, createErrorResponse } from '@/lib/error-handling';

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const { jobId } = params;
    
    if (!jobId) {
      return createErrorResponse(
        'Note ID is required',
        400,
        ErrorType.VALIDATION
      );
    }

    // Check authentication
    const supabase = createSupabaseServerClient(cookies);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return createErrorResponse(
        'Authentication required',
        401,
        ErrorType.AUTHENTICATION
      );
    }

    console.log('Fetching mind map data for note:', jobId);

    // First get the job details
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('job_id, lecture_title, created_at, user_id')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return createErrorResponse(
        'Note not found',
        404,
        ErrorType.NOT_FOUND
      );
    }

    // Verify ownership
    if (job.user_id !== user.id) {
      return createErrorResponse(
        'Unauthorized to view this note',
        403,
        ErrorType.AUTHORIZATION
      );
    }

    // Now get the note content directly from notes table
    const { data: note, error: noteError } = await supabaseAdmin
      .from('notes')
      .select('notes_column, cue_column, summary_section')
      .eq('job_id', jobId)
      .single();

    console.log('Note data:', note);
    
    // Get the markdown content (prefer notes_column, fallback to summary)
    const content = note?.notes_column || 
                   note?.summary_section || 
                   '';
    
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 200));

    return createSuccessResponse({
      id: job.job_id,
      title: job.lecture_title || 'Untitled',
      createdAt: job.created_at,
      content,
    });

  } catch (error) {
    console.error('Error in GET /api/notes/[jobId]/mindmap:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      ErrorType.INTERNAL
    );
  }
};