import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '../../../../lib/supabase-server';

// GET endpoint to retrieve note details
export const GET: APIRoute = async ({ params, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const { noteId } = params;
    if (!noteId) {
      return new Response(JSON.stringify({ error: 'Note ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);

    // Get note details with related information
    const { data: note, error } = await supabase
      .from('notes')
      .select(`
        *,
        jobs!inner (
          job_id,
          lecture_title,
          course_subject,
          status,
          file_size_mb,
          generated_pdf_path,
          audio_file_path,
          pdf_file_path,
          study_node_id,
          study_nodes (
            id,
            name,
            type,
            parent_id
          )
        )
      `)
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (error || !note) {
      console.error('Note fetch error:', error);
      return new Response(JSON.stringify({ error: 'Note not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Format the response
    const formattedNote = {
      id: note.id,
      job_id: note.job_id,
      title: note.title || note.jobs.lecture_title || 'Untitled Note',
      course_subject: note.course_subject || note.jobs.course_subject,
      summary_section: note.summary_section,
      notes_column: note.notes_column,
      cue_column: note.cue_column,
      created_at: note.created_at,
      updated_at: note.updated_at,
      attachment_count: note.attachment_count || 0,
      study_node: note.jobs.study_nodes || null,
      generated_pdf_path: note.jobs.generated_pdf_path,
      audio_file_path: note.jobs.audio_file_path,
      pdf_file_path: note.jobs.pdf_file_path
    };

    return new Response(JSON.stringify({ 
      note: formattedNote 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE endpoint to remove a note
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const { noteId } = params;
    if (!noteId) {
      return new Response(JSON.stringify({ error: 'Note ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);

    // Verify ownership and get job_id
    const { data: note, error: fetchError } = await supabase
      .from('notes')
      .select('id, job_id, user_id')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !note) {
      return new Response(JSON.stringify({ error: 'Note not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete the job (which will cascade delete the note and attachments)
    const { error: deleteError } = await supabase
      .from('jobs')
      .delete()
      .eq('job_id', note.job_id)
      .eq('user_id', user.id);

    if (deleteError) {
      console.error('Delete error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete note' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Note deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PATCH endpoint to update a note
export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const { noteId } = params;
    if (!noteId) {
      return new Response(JSON.stringify({ error: 'Note ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const supabase = createClient(cookies);

    // Verify ownership
    const { data: existingNote, error: fetchError } = await supabase
      .from('notes')
      .select('id, user_id')
      .eq('id', noteId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !existingNote) {
      return new Response(JSON.stringify({ error: 'Note not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update the note
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.course_subject !== undefined) updateData.course_subject = body.course_subject;
    if (body.summary_section !== undefined) updateData.summary_section = body.summary_section;
    if (body.notes_column !== undefined) updateData.notes_column = body.notes_column;
    if (body.cue_column !== undefined) updateData.cue_column = body.cue_column;

    const { data: updatedNote, error: updateError } = await supabase
      .from('notes')
      .update(updateData)
      .eq('id', noteId)
      .select()
      .single();

    if (updateError) {
      console.error('Update error:', updateError);
      return new Response(JSON.stringify({ error: 'Failed to update note' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      note: updatedNote
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};