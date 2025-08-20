import type { APIRoute } from 'astro';
import { supabase } from '../../../lib/supabase';
import { supabaseAdmin } from '../../../lib/supabase-server';
import { 
  AppError, 
  ErrorType, 
  PerformanceMonitor 
} from '../../../lib/error-handling';
import { createPdfDownloadResponse, createFileDownloadResponse } from '../../../lib/api-response';
import { createApiHandler, Logger } from '../../../lib/monitoring';
import { STORAGE_BUCKETS } from '../../../lib/config';

export const GET: APIRoute = async (context) => {
  return createApiHandler(async ({ params, request }) => {
    const requestId = request.headers.get('x-request-id') || undefined;
    const logger = new Logger('download-api', requestId);
    const performance = new PerformanceMonitor('download-job');
    
    logger.info('Processing download request');
    
    const jobId = params.jobId;
    
    // Extract format parameter from URL query string
    const url = new URL(request.url);
    const format = url.searchParams.get('format') || 'pdf';
    
    if (!jobId) {
      logger.warn('Missing job ID in request');
      throw new AppError('Job ID is required', ErrorType.VALIDATION, 400);
    }

    // Validate format parameter
    const validFormats = ['pdf', 'txt', 'md', 'original'];
    if (!validFormats.includes(format)) {
      logger.warn(`Invalid format requested: ${format}`);
      throw new AppError(`Invalid format. Supported formats: ${validFormats.join(', ')}`, ErrorType.VALIDATION, 400);
    }

    logger.info(`Download request for format: ${format}`);

    logger.info(`Retrieving job details for job ID: ${jobId}`);
    performance.mark('db-query-start');
    
    // Try to get job details with single() using the server client for admin access
    let { data: job, error: jobError } = await supabaseAdmin
      .from('jobs')
      .select('output_pdf_path, txt_file_path, md_file_path, pdf_file_path, lecture_title, status, user_id')
      .eq('job_id', jobId)
      .single();
    
    // If that fails with a "multiple rows" error, get the most recent job
    if (jobError && jobError.code === 'PGRST116') {
      logger.warn(`Multiple or no jobs found for ID ${jobId}, attempting to retrieve the most recent one`);
      
      // First, check if the job exists at all (regardless of user)
      const { data: allJobs, error: allJobsError } = await supabaseAdmin
        .from('jobs')
        .select('job_id, user_id, status, created_at')
        .eq('job_id', jobId);
        
      if (allJobsError) {
        logger.error('Database error when checking if job exists', allJobsError);
      } else if (allJobs && allJobs.length > 0) {
        logger.info(`Found ${allJobs.length} total jobs with ID ${jobId} in the database`);
        logger.info(`Job details: ${JSON.stringify(allJobs.map(j => ({ user_id: j.user_id, status: j.status, created_at: j.created_at })))}`);
      } else {
        logger.warn(`No jobs found with ID ${jobId} in the entire database`);
      }
      
      // Now try to get the job using the server client for admin access
      const { data: jobs, error: jobsError } = await supabaseAdmin
        .from('jobs')
        .select('output_pdf_path, txt_file_path, md_file_path, pdf_file_path, lecture_title, status, created_at, user_id')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (jobsError) {
        logger.error('Database error when retrieving jobs', jobsError);
        throw new AppError(
          'Failed to retrieve job details', 
          ErrorType.DATABASE, 
          500, 
          { supabaseError: jobsError }
        );
      }
      
      if (jobs && jobs.length > 0) {
        logger.info(`Found ${jobs.length} jobs, using the most recent one (user_id: ${jobs[0].user_id})`);
        job = jobs[0];
        jobError = null;
      } else {
        // No jobs found with this ID
        logger.warn(`No jobs found with ID: ${jobId}`);
        throw new AppError(
          `Job with ID ${jobId} not found. Please check if the job exists or try again later.`, 
          ErrorType.NOT_FOUND, 
          404
        );
      }
    }
    
    performance.mark('db-query-end');

    if (jobError) {
      logger.error('Database error when retrieving job details', jobError);
      throw new AppError(
        'Failed to retrieve job details', 
        ErrorType.DATABASE, 
        500, 
        { supabaseError: jobError }
      );
    }

    if (!job) {
      logger.warn(`Job not found: ${jobId}`);
      throw new AppError(
        `Job with ID ${jobId} not found. Please check if the job exists or try again later.`, 
        ErrorType.NOT_FOUND, 
        404
      );
    }

    logger.info(`Job found with status: ${job.status}`);
    
    if (job.status !== 'completed' && job.status !== 'cached') {
      logger.warn(`Job not ready for download: ${job.status}`);
      
      // Provide a more user-friendly error message based on status
      let errorMessage = 'Your document is not ready for download yet.';
      if (job.status === 'processing') {
        errorMessage = 'Your document is still being processed. Please try again in a few moments.';
      } else if (job.status === 'failed') {
        errorMessage = 'We encountered an issue processing your document. Please try uploading it again.';
      }
      
      throw new AppError(
        errorMessage, 
        ErrorType.VALIDATION, 
        400, 
        { jobStatus: job.status }
      );
    }

    // Determine the file path based on the requested format
    let filePath: string;
    let fileName: string;
    let fileExtension: string;
    let contentType: string;

    switch (format) {
      case 'pdf':
        if (!job.output_pdf_path) {
          logger.warn('Job has no output PDF path');
          throw new AppError(
            'The PDF file is not available. This may be due to an issue during processing. Please try generating the document again.', 
            ErrorType.NOT_FOUND, 
            404
          );
        }
        filePath = job.output_pdf_path;
        fileExtension = 'pdf';
        contentType = 'application/pdf';
        break;
      case 'txt':
        if (!job.txt_file_path) {
          // Generate TXT on-demand from database for Student tier users
          logger.info('Generating TXT on-demand from database notes');
          return await generateTextFromNotes(jobId, 'txt', logger);
        }
        filePath = job.txt_file_path;
        fileExtension = 'txt';
        contentType = 'text/plain';
        break;
      case 'md':
        if (!job.md_file_path) {
          // Generate MD on-demand from database for Student tier users
          logger.info('Generating MD on-demand from database notes');
          return await generateTextFromNotes(jobId, 'md', logger);
        }
        filePath = job.md_file_path;
        fileExtension = 'md';
        contentType = 'text/markdown';
        break;
      case 'original':
        // For document processing pipeline, original document is stored in txt_file_path
        // For audio pipeline, original document is in pdf_file_path
        const originalPath = job.txt_file_path || job.pdf_file_path;
        if (!originalPath) {
          logger.warn('Job has no original document path');
          throw new AppError(
            'The original document is not available for this job.',
            ErrorType.NOT_FOUND,
            404
          );
        }
        filePath = originalPath;
        // Determine file extension from the path
        const pathExtension = originalPath.split('.').pop()?.toLowerCase() || 'pdf';
        fileExtension = pathExtension;
        contentType = pathExtension === 'pdf' ? 'application/pdf' : 
                     pathExtension === 'doc' ? 'application/msword' :
                     pathExtension === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                     'application/octet-stream';
        break;
      default:
        throw new AppError(`Unsupported format: ${format}`, ErrorType.VALIDATION, 400);
    }

    // Generate safe filename with fallback
    const safeTitle = (job.lecture_title || `job_${jobId}`).replace(/[^a-z0-9]/gi, '_');
    fileName = safeTitle + '_' + (
      format === 'pdf' ? 'notes' : 
      format === 'txt' ? 'transcription' : 
      format === 'original' ? 'original' :
      'notes'
    );

    logger.info(`Downloading ${format.toUpperCase()} file from storage: ${filePath}`);
    performance.mark('storage-download-start');
    
    // Determine which bucket to use based on the path and format
    // New document processing pipeline uses 'generated-notes' bucket for all files
    // Legacy audio pipeline uses 'user-uploads' for PDFs, 'generated-notes' for TXT/MD
    let bucket: string;
    if (format === 'original') {
      // Original documents: Check if stored in generated-notes (document pipeline) or user-uploads (audio pipeline)
      const isNewDocumentPipeline = filePath.includes('summaries/');
      bucket = isNewDocumentPipeline ? STORAGE_BUCKETS.GENERATED_NOTES : 'user-uploads';
    } else if (format === 'pdf') {
      // Check if this is from the new document processing pipeline (summaries/ path) or legacy (cornell-notes/ path)
      const isNewDocumentPipeline = filePath.includes('summaries/');
      const isLegacyCornellNotes = filePath.includes('cornell-notes/');
      
      if (isNewDocumentPipeline || isLegacyCornellNotes) {
        bucket = STORAGE_BUCKETS.GENERATED_NOTES;
      } else {
        // Legacy audio pipeline PDFs in user-uploads
        bucket = 'user-uploads';
      }
    } else {
      // TXT and MD files are always in generated-notes bucket
      bucket = STORAGE_BUCKETS.GENERATED_NOTES;
    }
    
    logger.info(`Using storage bucket: ${bucket} for path: ${filePath}`);
    
    // Download the file from Supabase Storage using the server client for admin access
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(filePath);
    
    performance.mark('storage-download-end');

    if (error || !data) {
      logger.error('Storage error when downloading file', error);
      
      // If file not found in the primary bucket, try the fallback bucket (for PDFs and original documents)
      if (error.message?.includes('not found') && (format === 'pdf' || format === 'original')) {
        logger.info(`File not found in ${bucket}, trying fallback bucket`);
        
        const isNewDocumentPipeline = filePath.includes('summaries/');
        const isLegacyCornellNotes = filePath.includes('cornell-notes/');
        
        // Fallback logic: if we tried generated-notes, try user-uploads and vice versa
        const fallbackBucket = (isNewDocumentPipeline || isLegacyCornellNotes) 
          ? 'user-uploads' 
          : STORAGE_BUCKETS.GENERATED_NOTES;
        
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin.storage
          .from(fallbackBucket)
          .download(filePath);
          
        if (fallbackError || !fallbackData) {
          logger.error('Storage error when downloading file from fallback bucket', fallbackError);
          throw new AppError(
            'We couldn\'t retrieve your document file. This might be a temporary issue. Please try again in a few moments or contact support if the problem persists.', 
            ErrorType.STORAGE, 
            500, 
            { 
              primaryBucketError: error,
              fallbackBucketError: fallbackError 
            }
          );
        }
        
        logger.info(`Successfully retrieved file from fallback bucket: ${fallbackBucket}`);
        
        // Process the fallback data the same way we process the primary data
        const arrayBuffer = await fallbackData.arrayBuffer();
        
        performance.mark('processing-end');
        
        // Log performance metrics
        const metrics = performance.end();
        logger.info('Performance metrics', { metrics });
        
        // Return the file with appropriate headers
        logger.info(`Sending ${format.toUpperCase()} response with filename: ${fileName}.${fileExtension} from fallback bucket`);
        
        // Check if we want inline display (for PDF viewer)
        const inline = url.searchParams.get('inline') === 'true' || format === 'pdf';
        
        return createFileDownloadResponse(arrayBuffer, `${fileName}.${fileExtension}`, contentType, inline);
      }
      
      // If the error is not a "not found" error, log more details to help diagnose the issue
      logger.error('Storage error details:', {
        errorName: error.name,
        errorMessage: error.message,
        errorDetails: error.details,
        bucket,
        path: filePath
      });
      
      throw new AppError(
        'Failed to download file from storage', 
        ErrorType.STORAGE, 
        500, 
        { storageError: error }
      );
    }

    logger.info('File downloaded successfully, preparing response');
    performance.mark('processing-start');
    
    // Convert blob to array buffer
    const arrayBuffer = await data.arrayBuffer();
    
    performance.mark('processing-end');

    // Log performance metrics
    const metrics = performance.end();
    logger.info('Performance metrics', { metrics });

    // Return the file with appropriate headers
    logger.info(`Sending ${format.toUpperCase()} response with filename: ${fileName}.${fileExtension}`);
    
    // Check if we want inline display (for PDF viewer)
    const inline = url.searchParams.get('inline') === 'true' || format === 'pdf';
    
    return createFileDownloadResponse(arrayBuffer, `${fileName}.${fileExtension}`, contentType, inline);
  })(context);
};

/**
 * Generate TXT or MD content on-demand from database notes
 * For Student tier users who want to download formats that weren't created during free tier
 */
async function generateTextFromNotes(jobId: string, format: 'txt' | 'md', logger: Logger) {
  logger.info(`Generating ${format.toUpperCase()} from database notes for job ${jobId}`);
  
  // Get notes data from database
  const { data: notes, error: notesError } = await supabaseAdmin
    .from('notes')
    .select('title, transcript_text, cue_column, notes_column, summary_section, course_subject')
    .eq('job_id', jobId)
    .single();

  if (notesError || !notes) {
    logger.warn(`No notes found for job ${jobId}:`, notesError);
    throw new AppError(
      'Notes data not found. Cannot generate format.', 
      ErrorType.NOT_FOUND, 
      404
    );
  }

  let content: string;
  let filename: string;
  let contentType: string;

  if (format === 'txt') {
    // Generate plain text transcript
    content = notes.transcript_text || 'Transcript not available.';
    filename = `${notes.title || jobId}_transcription.txt`;
    contentType = 'text/plain';
  } else {
    // Generate markdown format
    content = `# ${notes.title || 'Mindsy Notes'}

${notes.course_subject ? `**Course:** ${notes.course_subject}` : ''}

## Cue Column
${notes.cue_column || 'No cues available.'}

## Notes
${notes.notes_column || 'No notes available.'}

## Summary
${notes.summary_section || 'No summary available.'}

---

## Full Transcript
${notes.transcript_text || 'Transcript not available.'}
`;
    filename = `${notes.title || jobId}_notes.md`;
    contentType = 'text/markdown';
  }

  logger.info(`Generated ${format.toUpperCase()} content (${content.length} characters)`);

  // Return as downloadable response
  return createFileDownloadResponse(
    new TextEncoder().encode(content), 
    filename, 
    contentType
  );
}