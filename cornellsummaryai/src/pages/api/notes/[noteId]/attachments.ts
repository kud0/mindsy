import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '../../../../lib/supabase-server';
import { v4 as uuidv4 } from 'uuid';

// Supported file types
const SUPPORTED_TYPES = {
  'application/pdf': { ext: 'pdf', type: 'slides' },
  'application/vnd.ms-powerpoint': { ext: 'ppt', type: 'slides' },
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': { ext: 'pptx', type: 'slides' },
  'application/msword': { ext: 'doc', type: 'notes' },
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { ext: 'docx', type: 'notes' },
  'application/onenote': { ext: 'one', type: 'notes' },
  'application/vnd.oasis.opendocument.text': { ext: 'odt', type: 'notes' },
  'application/vnd.oasis.opendocument.presentation': { ext: 'odp', type: 'slides' },
  'image/png': { ext: 'png', type: 'reference' },
  'image/jpeg': { ext: 'jpg', type: 'reference' },
  'image/webp': { ext: 'webp', type: 'reference' },
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB max

export const POST: APIRoute = async ({ params, request, cookies }) => {
  try {
    // Check authentication
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

    // First check if noteId is actually a job_id (for backward compatibility)
    // Try to find the note by job_id first
    let note;
    let noteError;
    
    // Check in jobs table first (noteId might be a job_id)
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('job_id, user_id')
      .eq('job_id', noteId)
      .eq('user_id', user.id)
      .single();

    if (job && !jobError) {
      // If found in jobs, try to get the associated note
      const { data: noteData, error: noteErr } = await supabase
        .from('notes')
        .select('id, job_id, user_id')
        .eq('job_id', noteId)
        .eq('user_id', user.id)
        .single();
      
      note = noteData;
      noteError = noteErr;
      
      // If no note exists yet, create one
      if (!note && job) {
        const { data: newNote, error: createError } = await supabase
          .from('notes')
          .insert({
            job_id: job.job_id,
            user_id: user.id,
            title: 'Note',
            attachment_count: 0
          })
          .select()
          .single();
        
        if (!createError) {
          note = newNote;
          noteError = null;
        }
      }
    } else {
      // Try to find by note id directly
      const { data: noteData, error: noteErr } = await supabase
        .from('notes')
        .select('id, job_id, user_id')
        .eq('id', noteId)
        .eq('user_id', user.id)
        .single();
      
      note = noteData;
      noteError = noteErr;
    }

    if (noteError || !note) {
      return new Response(JSON.stringify({ error: 'Note not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const attachmentType = formData.get('type') as string || 'supplementary';
    const description = formData.get('description') as string || null;

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    const fileType = SUPPORTED_TYPES[file.type];
    if (!fileType) {
      return new Response(JSON.stringify({ 
        error: 'Unsupported file type', 
        supportedTypes: Object.keys(SUPPORTED_TYPES) 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ 
        error: 'File too large', 
        maxSize: `${MAX_FILE_SIZE / 1024 / 1024}MB` 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique file path
    const fileId = uuidv4();
    const fileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    let filePath = `${user.id}/${noteId}/${fileId}_${fileName}`;

    // Upload to storage - try note-attachments first, fallback to user-uploads
    let uploadError;
    let bucketName = 'note-attachments';
    
    // Try the dedicated attachments bucket first
    const uploadResult = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });
    
    uploadError = uploadResult.error;
    
    // If bucket doesn't exist, fallback to user-uploads bucket
    if (uploadError && uploadError.message?.includes('Bucket not found')) {
      bucketName = 'user-uploads';
      const fallbackPath = `attachments/${user.id}/${noteId}/${fileId}_${fileName}`;
      const fallbackResult = await supabase.storage
        .from(bucketName)
        .upload(fallbackPath, file, {
          contentType: file.type,
          cacheControl: '3600',
          upsert: false
        });
      
      uploadError = fallbackResult.error;
      // Update the file path if using fallback
      if (!uploadError) {
        filePath = fallbackPath;
      }
    }

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create attachment record - use the actual note.id for the foreign key
    const { data: attachment, error: attachmentError } = await supabase
      .from('note_attachments')
      .insert({
        note_id: note.id,  // Use the actual note.id from the notes table
        job_id: note.job_id || noteId,  // Store job_id for reference
        user_id: user.id,
        file_name: fileName,
        file_type: file.type,
        file_size_mb: (file.size / 1024 / 1024).toFixed(2),
        file_path: filePath,
        attachment_type: attachmentType || fileType.type,
        description: description,
        processing_status: 'uploaded',
        bucket_name: bucketName  // Track which bucket was used
      })
      .select()
      .single();

    if (attachmentError) {
      // Clean up uploaded file on error
      await supabase.storage
        .from(bucketName)  // Use the same bucket that was used for upload
        .remove([filePath]);
      
      console.error('Database error:', attachmentError);
      return new Response(JSON.stringify({ error: 'Failed to save attachment record' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      attachment: attachment,
      message: 'Attachment uploaded successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Attachment upload error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET endpoint to retrieve attachments for a note
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

    // Get attachments for the note - try both note_id and job_id
    let { data: attachments, error } = await supabase
      .from('note_attachments')
      .select('*')
      .or(`note_id.eq.${noteId},job_id.eq.${noteId}`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching attachments:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch attachments' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate signed URLs for each attachment
    const attachmentsWithUrls = await Promise.all(
      attachments.map(async (attachment) => {
        const { data } = await supabase.storage
          .from('note-attachments')
          .createSignedUrl(attachment.file_path, 3600); // 1 hour expiry
        
        return {
          ...attachment,
          download_url: data?.signedUrl || null
        };
      })
    );

    return new Response(JSON.stringify({ 
      attachments: attachmentsWithUrls 
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

// DELETE endpoint to remove an attachment
export const DELETE: APIRoute = async ({ params, url, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const { noteId } = params;
    const attachmentId = url.searchParams.get('attachmentId');

    if (!noteId || !attachmentId) {
      return new Response(JSON.stringify({ error: 'Note ID and Attachment ID are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);

    // Get attachment details
    const { data: attachment, error: fetchError } = await supabase
      .from('note_attachments')
      .select('*')
      .eq('id', attachmentId)
      .eq('note_id', noteId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !attachment) {
      return new Response(JSON.stringify({ error: 'Attachment not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('note-attachments')
      .remove([attachment.file_path]);

    if (storageError) {
      console.error('Storage deletion error:', storageError);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from('note_attachments')
      .delete()
      .eq('id', attachmentId);

    if (deleteError) {
      console.error('Database deletion error:', deleteError);
      return new Response(JSON.stringify({ error: 'Failed to delete attachment' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Attachment deleted successfully'
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