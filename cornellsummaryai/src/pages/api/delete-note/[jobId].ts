import type { APIRoute } from 'astro';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;
import { supabaseAdmin } from '../../../lib/supabase-server';

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const jobId = params.jobId;
  
  if (!jobId) {
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Job ID is required' 
    }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log(`[API Delete Note] Deleting note for job: ${jobId}`);
  
  try {
    // Create server-side Supabase client with cookies for authentication
    const supabase = createServerClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(key) {
            return cookies.get(key)?.value;
          },
          set(key, value, options) {
            cookies.set(key, value, options);
          },
          remove(key, options) {
            cookies.delete(key, options);
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[API Delete Note] Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Unauthorized' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API Delete Note] Authenticated user: ${user.email} (${user.id})`);

    // First, verify the job belongs to the authenticated user
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('user_id, audio_file_path, pdf_file_path, output_pdf_path, txt_file_path, md_file_path, file_size_mb')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      console.error('[API Delete Note] Job not found:', jobError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Note not found' 
      }), { 
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify ownership
    if (job.user_id !== user.id) {
      console.error('[API Delete Note] User does not own this job');
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Unauthorized - you can only delete your own notes' 
      }), { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API Delete Note] Verified job ownership for job: ${jobId}`);

    // Delete related files from Supabase Storage
    const filesToDelete = [];
    
    // Add files to deletion list (remove bucket prefix if present)
    if (job.audio_file_path) {
      const audioPath = job.audio_file_path.replace('user-uploads/', '');
      filesToDelete.push({ bucket: 'user-uploads', path: audioPath });
    }
    
    if (job.pdf_file_path) {
      const pdfPath = job.pdf_file_path.replace('user-uploads/', '');
      filesToDelete.push({ bucket: 'user-uploads', path: pdfPath });
    }
    
    if (job.output_pdf_path) {
      const outputPath = job.output_pdf_path.replace('generated-notes/', '');
      filesToDelete.push({ bucket: 'generated-notes', path: outputPath });
    }

    if (job.txt_file_path) {
      const txtPath = job.txt_file_path.replace('generated-notes/', '');
      filesToDelete.push({ bucket: 'generated-notes', path: txtPath });
    }

    if (job.md_file_path) {
      const mdPath = job.md_file_path.replace('generated-notes/', '');
      filesToDelete.push({ bucket: 'generated-notes', path: mdPath });
    }

    console.log(`[API Delete Note] Files to delete:`, filesToDelete);

    // Delete files from storage
    for (const fileToDelete of filesToDelete) {
      try {
        const { error: storageError } = await supabaseAdmin.storage
          .from(fileToDelete.bucket)
          .remove([fileToDelete.path]);

        if (storageError) {
          console.warn(`[API Delete Note] Warning: Could not delete file ${fileToDelete.path}:`, storageError);
          // Continue with deletion even if some files fail to delete
        } else {
          console.log(`[API Delete Note] Successfully deleted file: ${fileToDelete.path}`);
        }
      } catch (error) {
        console.warn(`[API Delete Note] Warning: Error deleting file ${fileToDelete.path}:`, error);
        // Continue with deletion
      }
    }

    // Delete the notes record
    const { error: notesDeleteError } = await supabaseAdmin
      .from('notes')
      .delete()
      .eq('job_id', jobId);

    if (notesDeleteError) {
      console.warn(`[API Delete Note] Warning: Could not delete notes record:`, notesDeleteError);
      // Continue with job deletion even if notes deletion fails
    } else {
      console.log(`[API Delete Note] Successfully deleted notes for job: ${jobId}`);
    }

    // Delete the job record
    const { error: jobDeleteError } = await supabaseAdmin
      .from('jobs')
      .delete()
      .eq('job_id', jobId);

    if (jobDeleteError) {
      console.error('[API Delete Note] Failed to delete job:', jobDeleteError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Failed to delete note from database' 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API Delete Note] Successfully deleted job: ${jobId}`);

    // Update usage tracking - subtract the file size from user's usage
    if (job.file_size_mb && job.file_size_mb > 0) {
      try {
        const monthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
        
        // Get current usage
        const { data: currentUsage, error: usageError } = await supabaseAdmin
          .from('usage')
          .select('total_mb_used, files_processed')
          .eq('user_id', user.id)
          .eq('month_year', monthYear)
          .single();

        if (!usageError && currentUsage) {
          // Update usage by subtracting the deleted file size
          const newTotalMB = Math.max(0, (currentUsage.total_mb_used || 0) - job.file_size_mb);
          const newFilesProcessed = Math.max(0, (currentUsage.files_processed || 0) - 1);

          const { error: updateError } = await supabaseAdmin
            .from('usage')
            .update({
              total_mb_used: newTotalMB,
              files_processed: newFilesProcessed,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('month_year', monthYear);

          if (updateError) {
            console.warn('[API Delete Note] Warning: Could not update usage tracking:', updateError);
          } else {
            console.log(`[API Delete Note] Updated usage: ${newTotalMB}MB, ${newFilesProcessed} files`);
          }
        }
      } catch (error) {
        console.warn('[API Delete Note] Warning: Error updating usage tracking:', error);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Note deleted successfully' 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API Delete Note] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: 'Internal server error' 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};