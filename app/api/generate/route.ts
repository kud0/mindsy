import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';
import { createRunPodClient } from '@/lib/runpod-client';
import { generateMindsyNotes, type MindsyNotesInput } from '@/lib/openai-client';

// Configure API route for dynamic operations
export const dynamic = 'force-dynamic';

/**
 * Interface for the request body of the generate API
 */
interface GenerateRequest {
  // Audio upload processing
  audioFilePath?: string;      // Path to the uploaded audio file in Supabase Storage
  pdfFilePath?: string;       // Optional path to the uploaded PDF file in Supabase Storage
  
  // Document upload processing
  documentPaths?: string[];   // Array of paths to uploaded documents
  
  // Link upload processing
  linkData?: {
    linkType: 'youtube' | 'podcast' | 'article';
    extractedData: unknown;   // Content extracted from the URL
    originalUrl: string;      // Original URL provided by user
  };
  
  // Common fields
  lectureTitle: string;       // Title of the lecture for naming the output file
  courseSubject?: string;     // Optional subject/course name for better context in note generation
  processingMode?: 'enhance' | 'store'; // Processing mode: enhance (full Mindsy notes) or store (light formatting)
  studyNodeId?: string;       // Optional study node ID to organize the note
  uploadType: 'audio' | 'link' | 'documents'; // Type of upload being processed
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
    
    // Validate required fields based on upload type
    if (!body.uploadType) {
      return createErrorResponse('uploadType is required');
    }
    
    if (!body.lectureTitle) {
      return createErrorResponse('lectureTitle is required');
    }
    
    // Validate type-specific requirements
    if (body.uploadType === 'audio' && !body.audioFilePath) {
      return createErrorResponse('audioFilePath is required for audio uploads');
    }
    
    if (body.uploadType === 'link' && !body.linkData) {
      return createErrorResponse('linkData is required for link uploads');
    }
    
    if (body.uploadType === 'documents' && (!body.documentPaths || body.documentPaths.length === 0)) {
      return createErrorResponse('documentPaths is required for document uploads');
    }

    console.log('🚀 Generate API: Starting processing pipeline for', body.lectureTitle);

    const supabase = await createClient();

    // Step 1: Create new job record (like original generate API)
    console.log('🔨 Generate API: Creating new job for processing');
    
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .insert({
        user_id: user.id,
        lecture_title: body.lectureTitle,
        course_subject: body.courseSubject || null,
        status: 'processing',
        audio_file_path: body.audioFilePath,
        pdf_file_path: body.pdfFilePath || null,
        processing_started_at: new Date().toISOString()
      })
      .select()
      .single();

    if (jobError) {
      console.error('❌ Generate API: Error creating job', jobError);
      return createErrorResponse('Failed to create processing job', 500);
    }

    const jobId = job.job_id;

    console.log('✅ Generate API: Created new job', { jobId, title: job.lecture_title });

    try {
      // Step 2: Get signed URL for audio file
      const { data: audioSignedUrl, error: audioUrlError } = await supabase.storage
        .from('user-uploads')
        .createSignedUrl(body.audioFilePath, 3600); // 1 hour expiry

      if (audioUrlError || !audioSignedUrl) {
        throw new Error(`Failed to create signed URL for audio file: ${audioUrlError?.message}`);
      }

      console.log('🎵 Generate API: Audio URL created, starting transcription...');

      // Step 3: Import webhook configuration
      const { getWebhookConfig, logWebhookConfig } = await import('@/lib/webhook-config');
      const webhookConfig = getWebhookConfig();
      
      // Log configuration for debugging
      logWebhookConfig();
      
      // Step 3: Transcribe audio with RunPod (webhook or polling based on config)
      const runpodClient = createRunPodClient();
      let transcriptionResult: any;
      
      if (webhookConfig.isWebhookEnabled && webhookConfig.webhookUrl) {
        // Use webhook approach - submit and let webhook handle the rest
        console.log('🔄 Using webhook approach for transcription');
        const { jobId: runpodJobId } = await runpodClient.transcribeAudioWithWebhook(
          audioSignedUrl.signedUrl,
          webhookConfig.webhookUrl
        );
        
        // Store RunPod job ID and set processing mode
        const updateResult = await supabase
          .from('jobs')
          .update({ 
            runpod_job_id: runpodJobId,
            status: 'transcribing',
            processing_mode: 'async'
          })
          .eq('job_id', jobId);

        if (updateResult.error) {
          console.error('❌ Failed to update job with RunPod ID:', updateResult.error);
          throw new Error('Failed to update job status');
        }
        
        console.log('✅ Successfully updated job with RunPod ID:', {
          internalJobId: jobId,
          runpodJobId,
          updateSuccess: !updateResult.error
        });
        
        // Return early - webhook will handle the rest
        return createSuccessResponse({
          jobId,
          message: 'Audio submitted for transcription. Processing in background.',
          status: 'transcribing',
          mode: 'webhook',
          runpodJobId
        });
      } else {
        // Fall back to polling approach
        console.log('📊 Using polling approach for transcription');
        
        // Set processing mode for sync
        await supabase
          .from('jobs')
          .update({ 
            status: 'transcribing',
            processing_mode: 'sync'
          })
          .eq('job_id', jobId);
          
        transcriptionResult = await runpodClient.transcribeAudioWithLanguage(audioSignedUrl.signedUrl);
      }
      
      console.log('✅ Generate API: Transcription completed', { 
        textLength: transcriptionResult.text.length,
        language: transcriptionResult.detectedLanguage
      });

      // Use the new content processor to handle the complete pipeline
      const { handleTranscriptionCompletion } = await import('@/lib/content-processor');
      
      const result = await handleTranscriptionCompletion(jobId, {
        text: transcriptionResult.text,
        detectedLanguage: transcriptionResult.detectedLanguage || 'en',
        languageConfidence: transcriptionResult.languageConfidence
      });

      console.log('✅ Generate API: Complete pipeline finished successfully');
      
      // Get the completed job data for response
      const { data: completedJob } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      const { data: studyGuide } = await supabase
        .from('study_guides')
        .select('*')
        .eq('job_id', jobId)
        .single();
      
      // Return success with all data
      return createSuccessResponse({
        jobId,
        message: 'Processing completed successfully!',
        status: 'completed',
        studyGuide,
        files: {
          transcript: completedJob?.txt_file_path,
          json: completedJob?.json_file_path,
          pdf: completedJob?.pdf_file_path
        },
        mode: 'sync'
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