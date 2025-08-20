import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '@/lib/supabase-server';
import { createSuccessResponse } from '@/lib/api-response';
import { ErrorType, createErrorResponse } from '@/lib/error-handling';
import { createGotenbergClient } from '@/lib/gotenberg-client';
import { STORAGE_BUCKETS } from '@/lib/config';

export const POST: APIRoute = async ({ request, params, cookies }) => {
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
    const { markdown } = body;

    if (!markdown) {
      return createErrorResponse(
        'Markdown content is required',
        400,
        ErrorType.VALIDATION
      );
    }

    console.log('Regenerating PDF for job:', jobId);

    // Get job details to verify ownership and get title
    const { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('job_id, user_id, lecture_title, output_pdf_path')
      .eq('job_id', jobId)
      .single();

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

    console.log('Converting markdown to PDF with beautiful Mindsy Notes styling...');

    // Create Gotenberg client and generate PDF from markdown
    const gotenbergClient = createGotenbergClient();
    
    // Generate beautiful PDF from markdown (uses the same styling pipeline)
    const pdfResult = await gotenbergClient.generateMindsyNotesPdf(
      markdown,
      job.lecture_title || 'Mindsy Notes',
      false // markdown format, not HTML
    );

    if (!pdfResult.success || !pdfResult.pdfBuffer) {
      console.error('PDF generation failed:', pdfResult.error);
      return createErrorResponse(
        'Failed to generate PDF',
        500,
        ErrorType.INTERNAL
      );
    }

    console.log('PDF generated successfully, uploading to storage...');

    // Determine the storage path
    const pdfPath = job.output_pdf_path || `${user.id}/summaries/${jobId}_notes.pdf`;
    
    // Determine which bucket to use
    const isNewStructure = pdfPath.includes('cornell-notes/');
    const bucket = isNewStructure ? STORAGE_BUCKETS.GENERATED_NOTES : 'user-uploads';

    // Upload the new PDF to storage (overwrites existing)
    const { error: uploadError } = await supabaseAdmin.storage
      .from(bucket)
      .update(pdfPath, pdfResult.pdfBuffer, {
        contentType: 'application/pdf',
        upsert: true
      });

    if (uploadError) {
      console.error('Failed to upload PDF:', uploadError);
      return createErrorResponse(
        'Failed to save PDF',
        500,
        ErrorType.STORAGE
      );
    }

    console.log('PDF updated successfully in storage');

    // Update the notes record with the new content
    const { error: updateError } = await supabaseAdmin
      .from('notes')
      .update({
        notes_column: markdown,
        updated_at: new Date().toISOString(),
      })
      .eq('job_id', jobId);

    if (updateError) {
      console.log('Note record update warning:', updateError);
      // Not critical if this fails, PDF is already updated
    }

    return createSuccessResponse({
      message: 'PDF regenerated successfully',
      jobId,
      pdfPath,
      bucket,
    });

  } catch (error) {
    console.error('Error in POST /api/notes/[jobId]/regenerate-pdf:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      ErrorType.INTERNAL
    );
  }
};