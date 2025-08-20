import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase-server';
import { createSuccessResponse } from '@/lib/api-response';
import { ErrorType, createErrorResponse } from '@/lib/error-handling';

export const PUT: APIRoute = async ({ request, params, cookies }) => {
  try {
    const { jobId } = params;
    
    if (!jobId) {
      return createErrorResponse(
        'Job ID is required',
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

    // Parse request body
    const body = await request.json();
    const { content, format = 'md' } = body;

    if (!content) {
      return createErrorResponse(
        'Content is required',
        400,
        ErrorType.VALIDATION
      );
    }

    // First, verify the user owns this job using admin client to bypass RLS
    console.log('Looking for job:', jobId);
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('job_id, user_id')
      .eq('job_id', jobId)
      .single();

    console.log('Job query result:', { job, jobError });

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return createErrorResponse(
        'Job not found',
        404,
        ErrorType.NOT_FOUND
      );
    }

    if (job.user_id !== user.id) {
      return createErrorResponse(
        'Unauthorized to modify this content',
        403,
        ErrorType.AUTHORIZATION
      );
    }

    // Check if a note record exists for this job using admin client
    const { data: existingNote } = await supabaseAdmin
      .from('notes')
      .select('id')
      .eq('job_id', jobId)
      .single();

    if (existingNote) {
      // Update existing note - store markdown in notes_column using admin client
      const { error: updateError } = await supabaseAdmin
        .from('notes')
        .update({
          notes_column: content,
          updated_at: new Date().toISOString(),
        })
        .eq('job_id', jobId);

      if (updateError) {
        console.error('Error updating note:', updateError);
        return createErrorResponse(
          'Failed to save content',
          500,
          ErrorType.DATABASE
        );
      }
    } else {
      // Create a new note entry if it doesn't exist using admin client
      const { error: insertError } = await supabaseAdmin
        .from('notes')
        .insert({
          job_id: jobId,
          user_id: user.id,
          title: 'Edited Notes',
          notes_column: content,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (insertError) {
        console.error('Error creating note:', insertError);
        return createErrorResponse(
          'Failed to save content',
          500,
          ErrorType.DATABASE
        );
      }
    }

    return createSuccessResponse({
      message: 'Content updated successfully',
      jobId,
    });

  } catch (error) {
    console.error('Error in PUT /api/notes/[jobId]/content:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      ErrorType.INTERNAL
    );
  }
};

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const { jobId } = params;
    
    if (!jobId) {
      return createErrorResponse(
        'Job ID is required',
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

    // Get the note content from notes_column using admin client
    const { data: note, error: noteError } = await supabaseAdmin
      .from('notes')
      .select('notes_column, updated_at')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single();

    if (noteError || !note) {
      return createErrorResponse(
        'Note not found',
        404,
        ErrorType.NOT_FOUND
      );
    }

    return createSuccessResponse({
      content: note.notes_column,
      format: 'md',
      updatedAt: note.updated_at,
    });

  } catch (error) {
    console.error('Error in GET /api/notes/[jobId]/content:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      ErrorType.INTERNAL
    );
  }
};