import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase-server';
import { createSuccessResponse } from '@/lib/api-response';
import { ErrorType, createErrorResponse } from '@/lib/error-handling';

export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const { folderId } = params;
    
    if (!folderId) {
      return createErrorResponse(
        'Folder ID is required',
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

    console.log('Fetching mind map data for folder:', folderId);

    // Get all completed jobs in this folder
    let query = supabaseAdmin
      .from('jobs')
      .select('job_id, lecture_title, created_at, status, folder_id')
      .eq('user_id', user.id)
      .eq('status', 'completed');

    // If folderId is 'uncategorized', get notes without folder
    if (folderId === 'uncategorized') {
      query = query.is('folder_id', null);
    } else {
      query = query.eq('folder_id', folderId);
    }

    const { data: jobs, error: jobsError } = await query
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return createErrorResponse(
        'Failed to fetch folder notes',
        500,
        ErrorType.DATABASE
      );
    }

    // Get folder name if not uncategorized
    let folderName = 'Uncategorized';
    if (folderId !== 'uncategorized') {
      const { data: folder } = await supabaseAdmin
        .from('folders')
        .select('name')
        .eq('id', folderId)
        .eq('user_id', user.id)
        .single();
      
      if (folder) {
        folderName = folder.name;
      }
    }

    // Get notes content for each job
    const notesPromises = jobs?.map(async (job) => {
      const { data: note } = await supabaseAdmin
        .from('notes')
        .select('notes_column, summary_section')
        .eq('job_id', job.job_id)
        .single();
      
      return {
        id: job.job_id,
        title: job.lecture_title || 'Untitled',
        createdAt: job.created_at,
        content: note?.notes_column || note?.summary_section || '',
      };
    }) || [];
    
    const notes = await Promise.all(notesPromises);

    return createSuccessResponse({
      folderName,
      notes,
      totalNotes: notes.length,
    });

  } catch (error) {
    console.error('Error in GET /api/folders/[folderId]/mindmap:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      ErrorType.INTERNAL
    );
  }
};