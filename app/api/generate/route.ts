import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';
import { createRunPodClient } from '@/lib/runpod-client';
import { createGotenbergClient } from '@/lib/gotenberg-client';
import { generateMindsyNotes, convertMarkdownToHtml, type MindsyNotesInput } from '@/lib/openai-client';

/**
 * Interface for the request body of the generate API
 */
interface GenerateRequest {
  audioFilePath: string;      // Path to the uploaded audio file in Supabase Storage
  pdfFilePath?: string;       // Optional path to the uploaded PDF file in Supabase Storage
  lectureTitle: string;       // Title of the lecture for naming the output file
  courseSubject?: string;     // Optional subject/course name for better context in note generation
  processingMode?: 'enhance' | 'store'; // Processing mode: enhance (full Mindsy notes) or store (light formatting)
  studyNodeId?: string;       // Optional study node ID to organize the note
}

/**
 * POST /api/generate - Main note processing endpoint
 * Your original pipeline: Upload → RunPod → OpenAI → HTML → Gotenberg → PDF
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;

  try {
    const body: GenerateRequest = await request.json();
    
    // Validate required fields
    if (!body.audioFilePath) {
      return createErrorResponse('audioFilePath is required');
    }
    
    if (!body.lectureTitle) {
      return createErrorResponse('lectureTitle is required');
    }

    console.log('🚀 Generate API: Starting processing pipeline for', body.lectureTitle);

    const supabase = await createClient();

    // Step 1: Get existing job or find by audioFilePath
    console.log('🔍 Generate API: Looking for existing job with audio path:', body.audioFilePath);
    
    const { data: existingJobs, error: findError } = await supabase
      .from('jobs')
      .select('*')
      .eq('audio_file_path', body.audioFilePath)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (findError) {
      console.error('❌ Generate API: Error finding job', findError);
      return createErrorResponse('Failed to find processing job', 500);
    }

    if (!existingJobs || existingJobs.length === 0) {
      console.error('❌ Generate API: No job found for audio file path:', body.audioFilePath);
      return createErrorResponse('No processing job found for this file', 404);
    }

    const job = existingJobs[0];
    const jobId = job.job_id;

    console.log('✅ Generate API: Found existing job', { jobId, title: job.lecture_title });

    try {
      // Step 2: Get signed URL for audio file
      const { data: audioSignedUrl, error: audioUrlError } = await supabase.storage
        .from('user-uploads')
        .createSignedUrl(body.audioFilePath, 3600); // 1 hour expiry

      if (audioUrlError || !audioSignedUrl) {
        throw new Error(`Failed to create signed URL for audio file: ${audioUrlError?.message}`);
      }

      console.log('🎵 Generate API: Audio URL created, starting transcription...');

      // Step 3: Transcribe audio with RunPod
      const runpodClient = createRunPodClient();
      const transcriptionResult = await runpodClient.transcribeAudioWithLanguage(audioSignedUrl.signedUrl);
      
      // Use browser-provided duration if available, otherwise estimate from transcript
      const actualDurationMinutes = job.duration_minutes && job.duration_minutes > 0
        ? job.duration_minutes
        : Math.max(1, Math.ceil(transcriptionResult.text.split(' ').length / 150)); // Fallback: ~150 words per minute
      
      console.log('✅ Generate API: Transcription completed', { 
        textLength: transcriptionResult.text.length,
        language: transcriptionResult.detectedLanguage,
        actualMinutes: actualDurationMinutes,
        source: job.duration_minutes && job.duration_minutes > 0 ? 'browser' : 'estimated'
      });

      // Step 4: Generate Cornell notes with OpenAI
      console.log('🤖 Generate API: Starting AI note generation...');
      
      const mindsyInput: MindsyNotesInput = {
        transcript: transcriptionResult.text,
        lectureTitle: body.lectureTitle,
        courseSubject: body.courseSubject,
        detectedLanguage: transcriptionResult.detectedLanguage,
        formatMode: 'cornell-notes'
      };

      const notesResult = await generateMindsyNotes(mindsyInput);
      
      if (!notesResult.success || !notesResult.notes) {
        throw new Error(`AI note generation failed: ${notesResult.error}`);
      }

      console.log('✅ Generate API: AI notes generated', { 
        notesLength: notesResult.notes.length 
      });

      // Step 5: Convert markdown to HTML
      console.log('📄 Generate API: Converting to HTML...');
      const htmlContent = await convertMarkdownToHtml(notesResult.notes);

      // Step 6: Generate PDF with Gotenberg
      console.log('📋 Generate API: Generating PDF...');
      const gotenbergClient = createGotenbergClient();
      const pdfResult = await gotenbergClient.generatePdfFromHtml(htmlContent, {
        title: body.lectureTitle,
        generateBookmarks: true
      });

      if (!pdfResult.success || !pdfResult.pdfBuffer) {
        throw new Error(`PDF generation failed: ${pdfResult.error}`);
      }

      // Step 7: Upload generated files to Supabase Storage
      console.log('💾 Generate API: Uploading generated files...');
      
      const timestamp = Date.now();
      const pdfPath = `${user.id}/${timestamp}_${body.lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
      const markdownPath = `${user.id}/${timestamp}_${body.lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}.md`;
      const txtPath = `${user.id}/${timestamp}_${body.lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}.txt`;

      // Upload PDF
      const { error: pdfUploadError } = await supabase.storage
        .from('generated-notes')
        .upload(pdfPath, pdfResult.pdfBuffer, {
          contentType: 'application/pdf',
          cacheControl: '3600'
        });

      if (pdfUploadError) {
        throw new Error(`PDF upload failed: ${pdfUploadError.message}`);
      }

      // Upload markdown and text versions
      const { error: mdUploadError } = await supabase.storage
        .from('generated-notes')
        .upload(markdownPath, notesResult.notes, {
          contentType: 'text/markdown',
          cacheControl: '3600'
        });

      const { error: txtUploadError } = await supabase.storage
        .from('generated-notes')
        .upload(txtPath, transcriptionResult.text, {
          contentType: 'text/plain',
          cacheControl: '3600'
        });

      console.log('✅ Generate API: Files uploaded to storage');

      // Step 8: Create notes record (match original schema)
      const { error: notesError } = await supabase
        .from('notes')
        .insert({
          job_id: jobId,
          user_id: user.id,
          title: body.lectureTitle,
          course_subject: body.courseSubject || null,
          notes_column: notesResult.notes,
          transcript_text: transcriptionResult.text,
          cue_column: '', // Extract from notes if needed
          summary_section: '', // Extract from notes if needed
          created_at: new Date().toISOString()
        });

      if (notesError) {
        console.warn('⚠️ Generate API: Notes record creation failed', notesError);
      }

      // Update job status to completed with duration tracking
      const { error: jobUpdateError } = await supabase
        .from('jobs')
        .update({
          status: 'completed',
          output_pdf_path: pdfPath,
          md_file_path: markdownPath,
          txt_file_path: txtPath,
          duration_minutes: actualDurationMinutes, // Use actual duration for usage tracking
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId);

      if (jobUpdateError) {
        console.warn('⚠️ Generate API: Job status update failed', jobUpdateError);
      }

      console.log('🎉 Generate API: Processing completed successfully!');

      return createSuccessResponse({
        jobId,
        message: 'Cornell notes generated successfully',
        status: 'completed',
        files: {
          pdf: pdfPath,
          markdown: markdownPath,
          transcript: txtPath
        },
        processingTime: Math.round((Date.now() - timestamp) / 1000)
      });

    } catch (processingError) {
      console.error('❌ Generate API: Processing failed', processingError);
      
      // Update job status to failed
      await supabase
        .from('jobs')
        .update({
          status: 'failed',
          processing_completed_at: new Date().toISOString(),
          error_message: processingError instanceof Error ? processingError.message : 'Unknown error',
          updated_at: new Date().toISOString()
        })
        .eq('job_id', jobId);

      return createErrorResponse(
        processingError instanceof Error ? processingError.message : 'Processing failed',
        500
      );
    }

  } catch (error) {
    console.error('❌ Generate API: Request failed', error);
    return createErrorResponse('Invalid request or internal server error', 400);
  }
}