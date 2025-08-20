import type { APIRoute } from 'astro';
import { requireAuth } from '../../lib/supabase-server';
import {
  generateSignedUrl,
  STORAGE_BUCKETS,
  EXPIRATION_TIMES,
  uploadFile,
  generateSecureFilePath
} from '../../lib/file-processing';
// Import only the types we need for our implementation
import type { } from '../../lib/file-processing';
import { createRunPodClient } from '../../lib/runpod-client';
import { createTikaClient } from '../../lib/tika-client';
import { createGoogleVisionClient, GoogleVisionClient } from '../../lib/google-vision-client';
import { generateMindsyNotes, generateTitleSuggestions, generateMindsyNotesWithTitleSuggestions, type MindsyNotesInput, convertMarkdownToHtml, applyLightFormatting, type LightFormattingInput } from '../../lib/openai-client';
import { createGotenbergClient } from '../../lib/gotenberg-client';
import { NotificationService } from '../../lib/notification-service';

/**
 * Interface for the request body of the generate API
 * This defines the expected structure of incoming requests
 */
interface GenerateRequest {
  audioFilePath: string;      // Path to the uploaded audio file in Supabase Storage
  pdfFilePath?: string;       // Optional path to the uploaded PDF file in Supabase Storage
  lectureTitle: string;       // Title of the lecture for naming the output file
  courseSubject?: string;     // Optional subject/course name for better context in note generation
  fileSizeMB?: number;        // Actual file size in MB from client
  clientDurationMinutes?: number; // Client-side audio duration in minutes (more accurate than server estimation)
  processingMode?: 'enhance' | 'store'; // Processing mode: enhance (full Mindsy notes) or store (light formatting)
  studyNodeId?: string;       // Optional study node ID to organize the note
}

/**
 * Interface for file processing results
 * Contains signed URLs and metadata for processing
 */
interface FileProcessingResults {
  audioUrl: string;
  pdfUrl?: string;
  audioExpiresAt: Date;
  pdfExpiresAt?: Date;
}

/**
 * Interface for the response of the generate API
 * This defines the structure of the API response
 * Used for documentation purposes and type safety
 */
type GenerateSuccessResponse = {
  success: true;
  message: string;
  jobId: string;
  downloadUrl: string;        // Temporary signed URL (expires in 6 hours)
  apiDownloadUrl: string;     // Permanent API endpoint URL
  processingStatus: {
    transcription: string;
    pdfExtraction: string;
    notesGeneration: string;
    pdfGeneration: string;
  };
};

type GenerateErrorResponse = {
  success: false;
  error: string;
  errorCode: string;
  details?: any;
};

/**
 * Error codes for the generate API
 * These are used to categorize errors for better client-side handling
 */
enum ErrorCodes {
  UNAUTHORIZED = 'UNAUTHORIZED',           // Authentication/authorization errors
  INVALID_REQUEST = 'INVALID_REQUEST',     // Malformed or invalid request data
  PROCESSING_FAILED = 'PROCESSING_FAILED', // General processing failures
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR', // Errors from external services
  STORAGE_ERROR = 'STORAGE_ERROR',         // File storage related errors
  DATABASE_ERROR = 'DATABASE_ERROR',       // Database operation errors
  TRANSCRIPTION_ERROR = 'TRANSCRIPTION_ERROR', // Audio transcription errors
  PDF_EXTRACTION_ERROR = 'PDF_EXTRACTION_ERROR', // PDF text extraction errors
  NOTES_GENERATION_ERROR = 'NOTES_GENERATION_ERROR', // Mindsy Notes generation errors
  PDF_GENERATION_ERROR = 'PDF_GENERATION_ERROR', // PDF generation errors
  ENVIRONMENT_ERROR = 'ENVIRONMENT_ERROR'  // Missing environment variables or configuration
}

/**
 * Validates the request body against the GenerateRequest interface
 * Performs thorough validation and sanitization of all input fields
 * 
 * @param body - The request body to validate
 * @returns Object with validation result and error message if invalid
 */
export function validateRequestBody(body: any): {
  isValid: boolean;
  error?: string;
  sanitizedBody?: GenerateRequest;
} {
  // Check if body exists
  if (!body) {
    return { isValid: false, error: 'Request body is required' };
  }

  // Check required fields - need at least audioFilePath OR pdfFilePath
  if (!body.audioFilePath && !body.pdfFilePath) {
    return { isValid: false, error: 'Either audioFilePath or pdfFilePath is required' };
  }

  if (!body.lectureTitle) {
    return { isValid: false, error: 'lectureTitle is required' };
  }

  // Sanitize and validate audioFilePath (if provided)
  let audioFilePath: string | undefined;
  if (body.audioFilePath) {
    audioFilePath = String(body.audioFilePath).trim();
    if (audioFilePath.length === 0) {
      return { isValid: false, error: 'audioFilePath cannot be empty' };
    }

    // Validate file path format to prevent path traversal
    if (audioFilePath.includes('..') || !audioFilePath.match(/^[a-zA-Z0-9_\-\/\.]+$/)) {
      return { isValid: false, error: 'Invalid audioFilePath format' };
    }
  }

  // Sanitize and validate lectureTitle
  const lectureTitle = String(body.lectureTitle).trim();
  if (lectureTitle.length === 0) {
    return { isValid: false, error: 'lectureTitle cannot be empty' };
  }

  // Validate lecture title length
  if (lectureTitle.length > 200) {
    return { isValid: false, error: 'lectureTitle must be less than 200 characters' };
  }

  // Create sanitized body
  const sanitizedBody: Partial<GenerateRequest> & { lectureTitle: string } = {
    lectureTitle
  };
  
  // Add audioFilePath if provided
  if (audioFilePath) {
    sanitizedBody.audioFilePath = audioFilePath;
  }
  
  // Add fileSizeMB if provided
  if (body.fileSizeMB !== undefined) {
    const fileSizeMB = parseFloat(body.fileSizeMB);
    if (!isNaN(fileSizeMB) && fileSizeMB > 0) {
      sanitizedBody.fileSizeMB = fileSizeMB;
    }
  }

  // Add clientDurationMinutes if provided (more accurate than server estimation)
  if (body.clientDurationMinutes !== undefined) {
    const clientDurationMinutes = parseFloat(body.clientDurationMinutes);
    if (!isNaN(clientDurationMinutes) && clientDurationMinutes > 0) {
      sanitizedBody.clientDurationMinutes = clientDurationMinutes;
    }
  }

  // Optional fields
  if (body.pdfFilePath !== undefined) {
    const pdfFilePath = String(body.pdfFilePath).trim();

    // Validate PDF file path if provided
    if (pdfFilePath.length > 0) {
      if (pdfFilePath.includes('..') || !pdfFilePath.match(/^[a-zA-Z0-9_\-\/\.]+$/)) {
        return { isValid: false, error: 'Invalid pdfFilePath format' };
      }
      sanitizedBody.pdfFilePath = pdfFilePath;
    }
  }

  if (body.courseSubject !== undefined) {
    const courseSubject = String(body.courseSubject).trim();
    if (courseSubject.length > 0) {
      // Validate course subject length
      if (courseSubject.length > 100) {
        return { isValid: false, error: 'courseSubject must be less than 100 characters' };
      }
      sanitizedBody.courseSubject = courseSubject;
    }
  }

  // Add processing mode validation
  if (body.processingMode !== undefined) {
    const processingMode = String(body.processingMode).trim();
    if (processingMode === 'enhance' || processingMode === 'store') {
      sanitizedBody.processingMode = processingMode as 'enhance' | 'store';
    } else if (processingMode.length > 0) {
      return { isValid: false, error: 'processingMode must be either "enhance" or "store"' };
    }
  }

  return { isValid: true, sanitizedBody };
}

/**
 * Creates a standardized error response
 * 
 * @param status - HTTP status code
 * @param message - Error message
 * @param code - Error code from ErrorCodes enum
 * @param details - Optional additional error details
 * @returns Response object with JSON error payload
 */
function createErrorResponse(
  status: number,
  message: string,
  code: ErrorCodes,
  details?: any
): Response {
  return new Response(JSON.stringify({
    success: false,
    error: message,
    errorCode: code,
    details: details
  }), {
    status,
    headers: {
      'Content-Type': 'application/json'
    }
  });
}

/**
 * POST handler for the generate API
 * This endpoint handles the generation of Mindsy Notes from audio and optional PDF files
 * 
 * The complete implementation will:
 * 1. Validate the request body
 * 2. Authenticate the user (task 4.2) ✓
 * 3. Create a job record (task 4.3) ✓
 * 4. Process files (task 4.4)
 * 5. Generate notes (task 4.5)
 * 6. Create and store PDF (task 4.6)
 * 7. Return the result (task 4.8)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Validate required environment variables before processing
    const { validateEnvVars } = await import('../../lib/config');
    const { valid, missingVars } = validateEnvVars();

    if (!valid) {
      console.error('Missing required environment variables:', missingVars.join(', '));
      return createErrorResponse(
        500,
        `Server configuration error: Missing required environment variables: ${missingVars.join(', ')}`,
        ErrorCodes.ENVIRONMENT_ERROR
      );
    }
    // Parse request body as JSON
    let requestBody;
    try {
      requestBody = await request.json();
    } catch (error) {
      if (error instanceof SyntaxError || (error instanceof Error && error.message?.includes('JSON'))) {
        return createErrorResponse(
          400,
          'Invalid JSON in request body',
          ErrorCodes.INVALID_REQUEST
        );
      } else {
        console.error('Unexpected error during request parsing:', error);
        return createErrorResponse(
          500,
          'Internal server error',
          ErrorCodes.PROCESSING_FAILED,
          error instanceof Error ? error.message : 'Unknown error'
        );
      }
    }

    // Validate request body
    const { isValid, error, sanitizedBody } = validateRequestBody(requestBody);
    if (!isValid || !sanitizedBody) {
      return createErrorResponse(
        400,
        error || 'Invalid request body',
        ErrorCodes.INVALID_REQUEST
      );
    }

    // Authenticate the user and extract user information
    let user;
    let userClient;
    try {
      // Extract cookies from the request for server-side auth
      const cookiesFromRequest = {
        get: (name: string) => {
          const cookieHeader = request.headers.get('cookie');
          if (!cookieHeader) return undefined;
          
          const cookies = cookieHeader.split(';').reduce((acc: Record<string, string>, cookie) => {
            const [key, value] = cookie.trim().split('=');
            if (key && value) {
              acc[key] = decodeURIComponent(value);
            }
            return acc;
          }, {});
          
          return cookies[name] ? { value: cookies[name] } : undefined;
        }
      };
      
      // Use requireAuth to validate the session and get user information
      const authResult = await requireAuth(cookiesFromRequest);
      if (!authResult.user) {
        return createErrorResponse(
          401,
          'Authentication required',
          ErrorCodes.UNAUTHORIZED
        );
      }
      user = authResult.user;
      userClient = authResult.client;
    } catch (authError) {
      console.error('Authentication failed:', authError);
      return createErrorResponse(
        401,
        'Authentication failed',
        ErrorCodes.UNAUTHORIZED,
        authError instanceof Error ? authError.message : 'Unknown authentication error'
      );
    }

    // At this point, we have a valid authenticated user
    console.log(`Processing request for user: ${user.id}`);

    // STEP: Validate usage limits before processing (ONLY for audio uploads)
    // Use actual file size from client or fallback to 10MB (ensure it's a number)
    const actualFileSizeMB = Number(sanitizedBody.fileSizeMB) || 10;
    
    // Store duration for later use in tracking (declare outside try block)
    let validatedDurationMinutes = 0;
    
    // Skip usage validation for document-only uploads (unlimited for now)
    if (sanitizedBody.audioFilePath) {
      console.log('🎵 Audio upload detected - validating usage limits...');
      try {
        // Import the new minute-based validation function
        const { checkMinuteBasedUsageLimits } = await import('../../lib/minute-validation');
        
        // Get the audio file buffer for objective duration extraction
        let audioBuffer: Buffer | undefined;
        try {
          // Download the audio file to get its buffer for FFprobe analysis
          const audioUrlResult = await generateSignedUrl(STORAGE_BUCKETS.USER_UPLOADS, sanitizedBody.audioFilePath, EXPIRATION_TIMES.DOWNLOAD);
          if (audioUrlResult.success && audioUrlResult.data) {
            const response = await fetch(audioUrlResult.data.signedUrl);
            if (response.ok) {
              const arrayBuffer = await response.arrayBuffer();
              audioBuffer = Buffer.from(arrayBuffer);
              console.log(`📁 Downloaded audio buffer: ${audioBuffer.length} bytes`);
            } else {
              console.warn('⚠️ Could not download audio file for objective duration analysis');
            }
          } else {
            console.warn('⚠️ Could not generate signed URL for audio buffer:', audioUrlResult.error);
          }
        } catch (bufferError) {
          console.warn('⚠️ Failed to get audio buffer for objective analysis:', bufferError);
        }
        
        // Use new minute-based validation system with CLIENT-SIDE duration (most accurate)
        const usage = await checkMinuteBasedUsageLimits(
          user.id,
          actualFileSizeMB,
          audioBuffer,  // Pass buffer for FFprobe analysis (fallback)
          sanitizedBody.clientDurationMinutes  // Pass client-side duration (preferred)
        );
        
        if (!usage.can_process) {
          return createErrorResponse(
            429,
            usage.message,
            ErrorCodes.PROCESSING_FAILED,
            {
              currentUsageMinutes: usage.current_usage_minutes,
              monthlyLimitMinutes: usage.monthly_limit_minutes,
              estimatedDurationMinutes: usage.estimated_duration_minutes,
              filesThisMonth: usage.files_this_month,
              userTier: usage.user_tier,
              upgradeUrl: '/dashboard/account#subscription'
            }
          );
        }

        console.log(`✅ Audio usage validation passed for user ${user.id}: ${usage.message}`);
        console.log(`📊 User tier: ${usage.user_tier}, Estimated duration: ${usage.estimated_duration_minutes}m`);
        
        // Store duration for later use in tracking (ensure it's a number)
        validatedDurationMinutes = Number(usage.estimated_duration_minutes) || 0;
        
      } catch (usageValidationError) {
        console.error('❌ Audio usage validation error:', usageValidationError);
        return createErrorResponse(
          500,
          'Failed to validate audio usage limits',
          ErrorCodes.DATABASE_ERROR,
          usageValidationError instanceof Error ? usageValidationError.message : 'Unknown error'
        );
      }
    } else if (sanitizedBody.pdfFilePath) {
      console.log('📄 Document-only upload detected - UNLIMITED processing (no usage limits applied)');
    }

    // Task 4.3: Create job initialization logic
    // Insert new job record in jobs table with 'processing' status
    let jobId: string;
    try {
      // Create a new job record with 'processing' status
      const { data: jobData, error: jobError } = await userClient.from('jobs').insert({
        user_id: user.id,
        lecture_title: sanitizedBody.lectureTitle,
        course_subject: sanitizedBody.courseSubject || null,
        audio_file_path: sanitizedBody.audioFilePath || null,
        pdf_file_path: sanitizedBody.pdfFilePath || null,
        study_node_id: sanitizedBody.studyNodeId || null,
        status: 'processing',
        processing_started_at: new Date().toISOString()
      }).select('job_id').single();

      if (jobError) {
        console.error('Error creating job record:', jobError);
        return createErrorResponse(
          500,
          'Failed to initialize job',
          ErrorCodes.PROCESSING_FAILED,
          jobError.message
        );
      }

      if (!jobData) {
        return createErrorResponse(
          500,
          'Failed to initialize job: No job ID returned',
          ErrorCodes.PROCESSING_FAILED
        );
      }

      jobId = jobData.job_id;
      console.log(`Created job with ID: ${jobId}`);
    } catch (jobCreationError) {
      console.error('Unexpected error creating job:', jobCreationError);
      return createErrorResponse(
        500,
        'Failed to initialize job',
        ErrorCodes.PROCESSING_FAILED,
        jobCreationError instanceof Error ? jobCreationError.message : 'Unknown error'
      );
    }

    // Task 4.4: Implement file processing pipeline
    // Generate signed URLs for audio and optional PDF files
    let fileProcessingResults: FileProcessingResults;
    try {
      // Generate signed URL for audio file with 1-hour expiration
      // Initialize file processing results
      fileProcessingResults = {} as FileProcessingResults;
      
      // Generate audio URL only if audio file exists
      if (sanitizedBody.audioFilePath) {
        const audioResult = await generateSignedUrl(
          STORAGE_BUCKETS.USER_UPLOADS,
          sanitizedBody.audioFilePath,
          EXPIRATION_TIMES.MEDIUM, // 1 hour
          user.id
        );

        if (!audioResult.success || !audioResult.data) {
          console.error('Error generating signed URL for audio:', audioResult.error);
          return createErrorResponse(
            500,
            'Failed to generate signed URL for audio file',
            ErrorCodes.STORAGE_ERROR,
            audioResult.error
          );
        }

        fileProcessingResults.audioUrl = audioResult.data.signedUrl;
        fileProcessingResults.audioExpiresAt = audioResult.data.expiresAt;
      }

      // If PDF file path is provided, generate signed URL for it as well
      if (sanitizedBody.pdfFilePath) {
        const pdfResult = await generateSignedUrl(
          STORAGE_BUCKETS.USER_UPLOADS,
          sanitizedBody.pdfFilePath,
          EXPIRATION_TIMES.MEDIUM, // 1 hour
          user.id
        );

        if (!pdfResult.success || !pdfResult.data) {
          console.error('Error generating signed URL for PDF:', pdfResult.error);
          return createErrorResponse(
            500,
            'Failed to generate signed URL for PDF file',
            ErrorCodes.STORAGE_ERROR,
            pdfResult.error
          );
        }

        // Add PDF URL to file processing results
        fileProcessingResults.pdfUrl = pdfResult.data.signedUrl;
        fileProcessingResults.pdfExpiresAt = pdfResult.data.expiresAt;
      }

      console.log('Generated signed URLs for processing:', {
        audioUrl: fileProcessingResults.audioUrl ? 'Generated' : 'Not provided (document-only upload)',
        pdfUrl: fileProcessingResults.pdfUrl ? 'Generated' : 'Not requested',
        audioExpiresAt: fileProcessingResults.audioExpiresAt,
        pdfExpiresAt: fileProcessingResults.pdfExpiresAt
      });

      // Update job record with file processing information
      await userClient.from('jobs').update({
        updated_at: new Date().toISOString()
      }).eq('job_id', jobId);

    } catch (fileProcessingError) {
      console.error('Error during file processing:', fileProcessingError);

      // Update job record with error status
      try {
        await userClient.from('jobs').update({
          status: 'failed',
          error_message: fileProcessingError instanceof Error
            ? fileProcessingError.message
            : 'Unknown file processing error',
          updated_at: new Date().toISOString()
        }).eq('job_id', jobId);
      } catch (updateError) {
        console.error('Failed to update job status after error:', updateError);
      }

      return createErrorResponse(
        500,
        'File processing failed',
        ErrorCodes.STORAGE_ERROR,
        fileProcessingError instanceof Error ? fileProcessingError.message : 'Unknown error'
      );
    }

    // Task 4.5: Orchestrate AI processing pipeline
    // Call audio transcription service with signed URL
    // Conditionally process PDF if provided
    // Combine transcript and PDF text for note generation
    // Generate Mindsy Notes using OpenAI
    let transcript: string;
    let pdfText: string | undefined;
    let mindsyNotes: string;
    // Declare outputPdfPath at a higher scope so it can be accessed when finalizing the job
    let outputPdfPath: string;

    try {
      const processingStartTime = Date.now();
      console.log('🚀 Starting AI processing pipeline...');
      console.log(`⏱️  Pipeline start time: ${new Date().toISOString()}`);

      // Determine which pipeline to use
      const isAudioPipeline = !!fileProcessingResults.audioUrl;
      const isDocumentPipeline = !!fileProcessingResults.pdfUrl && !fileProcessingResults.audioUrl;

      console.log(`Pipeline type: ${isAudioPipeline ? 'AUDIO' : 'DOCUMENT'}`);

      let detectedLanguage: string | undefined;

      // ===== AUDIO PIPELINE =====
      if (isAudioPipeline) {
        console.log('🎵 AUDIO PIPELINE - Starting transcription...');
        const transcriptionStartTime = Date.now();
        
        try {
          const runpodClient = createRunPodClient();
          
          // Try with language detection first, fallback to regular transcription if it fails
          try {
            console.log('Attempting transcription with language detection...');
            const transcriptionResult = await runpodClient.transcribeAudioWithLanguage(fileProcessingResults.audioUrl);
            transcript = transcriptionResult.text;
            detectedLanguage = transcriptionResult.detectedLanguage;
            console.log(`🕒 Audio transcription took: ${Date.now() - transcriptionStartTime}ms`);
            console.log('Audio transcription with language detection successful:', {
              textLength: transcript.length,
              detectedLanguage: detectedLanguage,
              languageConfidence: transcriptionResult.languageConfidence
            });
          } catch (languageDetectionError) {
            console.warn('Language detection transcription failed, falling back to regular transcription:', languageDetectionError);
            // Fallback to regular transcription without language detection
            transcript = await runpodClient.transcribeAudio(fileProcessingResults.audioUrl);
            console.log(`🕒 Regular transcription took: ${Date.now() - transcriptionStartTime}ms`);
            console.log('Regular audio transcription successful, length:', transcript.length);
          }

          if (!transcript || transcript.trim().length === 0) {
            throw new Error('Audio transcription returned empty result');
          }

          // Update job status
          await userClient.from('jobs').update({
            updated_at: new Date().toISOString()
          }).eq('job_id', jobId);

          // Process optional PDF supplement for audio pipeline
          if (fileProcessingResults.pdfUrl) {
            const pdfStartTime = Date.now();
            console.log('🎵 AUDIO PIPELINE - Processing supplementary PDF...');
            try {
              const tikaClient = createTikaClient();
              pdfText = await tikaClient.extractDocumentText(fileProcessingResults.pdfUrl);
              console.log(`🕒 Supplementary PDF extraction took: ${Date.now() - pdfStartTime}ms`);
              console.log('Supplementary PDF extraction successful, length:', pdfText?.length || 0);
            } catch (pdfError) {
              console.warn('Supplementary PDF extraction failed, continuing with audio only:', pdfError);
              pdfText = undefined;
            }
          }

        } catch (transcriptionError) {
          console.error('Audio transcription error:', transcriptionError);
          await userClient.from('jobs').update({
            status: 'failed',
            error_message: transcriptionError instanceof Error
              ? `Transcription failed: ${transcriptionError.message}`
              : 'Unknown transcription error',
            error_step: 'transcription',
            updated_at: new Date().toISOString()
          }).eq('job_id', jobId);
          throw new Error(`Transcription failed: ${transcriptionError instanceof Error ? transcriptionError.message : 'Unknown error'}`);
        }
      } 
      // ===== DOCUMENT PIPELINE =====
      else if (isDocumentPipeline) {
        console.log('📄 DOCUMENT PIPELINE - Starting text extraction...');
        const documentStartTime = Date.now();
        
        // Determine if this is an image (use Vision API) or document (use Tika)
        const isImageFile = GoogleVisionClient.isImageFile(sanitizedBody.pdfFilePath || '');
        const extractionMethod = isImageFile ? 'Google Vision OCR' : 'Tika';
        console.log(`📋 File type detection: Using ${extractionMethod} for ${sanitizedBody.pdfFilePath}`);
        
        try {
          if (isImageFile) {
            // Use Google Vision API for images (handwritten notes)
            console.log('🖼️ Processing image with Google Vision OCR...');
            const visionClient = createGoogleVisionClient();
            const ocrResult = await visionClient.extractTextFromImage(fileProcessingResults.pdfUrl);
            
            if (!ocrResult.success || !ocrResult.text) {
              throw new Error(ocrResult.error || 'Google Vision OCR failed to extract text');
            }
            
            pdfText = ocrResult.text;
            console.log(`✅ Google Vision OCR successful, extracted ${pdfText.length} characters`);
            
            if (ocrResult.confidence) {
              console.log(`OCR Confidence: ${(ocrResult.confidence * 100).toFixed(1)}%`);
            }
          } else {
            // Use Tika for regular documents
            console.log('📄 Processing document with Tika...');
            const tikaClient = createTikaClient();
            pdfText = await tikaClient.extractDocumentText(fileProcessingResults.pdfUrl);
            console.log(`✅ Tika extraction successful, extracted ${pdfText.length} characters`);
          }
          
          console.log(`🕒 Document text extraction took: ${Date.now() - documentStartTime}ms`);

          if (!pdfText || pdfText.trim().length === 0) {
            throw new Error('Document text extraction returned empty result');
          }

          transcript = ''; // No transcript for document-only pipeline

          // Update job status
          await userClient.from('jobs').update({
            updated_at: new Date().toISOString(),
            // Store extraction method in metadata for analytics
            metadata: { extractionMethod }
          }).eq('job_id', jobId);

        } catch (documentError) {
          console.error('Document text extraction error:', documentError);
          await userClient.from('jobs').update({
            status: 'failed',
            error_message: documentError instanceof Error
              ? `Document extraction failed: ${documentError.message}`
              : 'Unknown document extraction error',
            error_step: 'document_extraction',
            updated_at: new Date().toISOString()
          }).eq('job_id', jobId);
          throw new Error(`Document extraction failed: ${documentError instanceof Error ? documentError.message : 'Unknown error'}`);
        }
      } else {
        throw new Error('Invalid pipeline: No audio or document file provided');
      }

      // Use the lectureTitle directly (it contains the original filename from the frontend)
      // Just clean it up to remove common noise patterns
      let cleanTitle = sanitizedBody.lectureTitle
        .replace(/\.[^/.]+$/, '') // Remove file extension if present
        .replace(/[_-]+/g, ' ') // Replace underscores and dashes with spaces  
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .trim();

      // If the cleaning resulted in an empty title, use a fallback
      if (!cleanTitle || cleanTitle.length === 0) {
        cleanTitle = 'Mindsy Notes';
      }

      console.log(`Using title from frontend: "${cleanTitle}" (original: "${sanitizedBody.lectureTitle}")`);
      
      // Update the lecture title BEFORE OpenAI generation
      sanitizedBody.lectureTitle = cleanTitle;

      // Step 3: Generate Mindsy Notes using OpenAI with the cleaned title and detected language
      console.log('Generating Mindsy Notes with language-aware headings...');
      try {
        const notesInput: MindsyNotesInput = {
          transcript,
          pdfText,
          lectureTitle: sanitizedBody.lectureTitle,
          courseSubject: sanitizedBody.courseSubject,
          detectedLanguage: detectedLanguage
        };

        // Generate notes based on processing mode
        const mindsyNotesStartTime = Date.now();
        const processingMode = sanitizedBody.processingMode || 'enhance';
        
        if (processingMode === 'store') {
          console.log('📝 STORE MODE: Applying light formatting only (verbatim content preservation)...');
          
          // For store mode, just format the raw extracted text
          // Use the raw document/audio text without Mindsy Notes structure
          let rawContent = '';
          
          if (transcript && pdfText) {
            rawContent = `# ${cleanedTitle}\n\n## Audio Transcript\n\n${transcript}\n\n## Document Content\n\n${pdfText}`;
          } else if (transcript) {
            rawContent = `# ${cleanedTitle}\n\n${transcript}`;
          } else if (pdfText) {
            rawContent = `# ${cleanedTitle}\n\n${pdfText}`;
          } else {
            throw new Error('No content available for formatting');
          }
          
          const lightFormattingInput: LightFormattingInput = {
            content: rawContent,
            title: cleanedTitle,
            preservationLevel: 'verbatim' // Preserve content exactly as-is
          };
          
          const notesResult = await applyLightFormatting(lightFormattingInput);
          console.log(`🕒 Light formatting took: ${Date.now() - mindsyNotesStartTime}ms`);

          if (!notesResult.success || !notesResult.notes) {
            throw new Error(`Light formatting failed: ${notesResult.error || 'Unknown error'}`);
          }

          mindsyNotes = notesResult.notes;
          
        } else {
          console.log('🎓 ENHANCE MODE: Generating Mindsy Notes with cleaned title...');
          const notesResult = await generateMindsyNotes(notesInput);
          console.log(`🕒 Mindsy Notes generation took: ${Date.now() - mindsyNotesStartTime}ms`);

          if (!notesResult.success || !notesResult.notes) {
            throw new Error(`Mindsy Notes generation failed: ${notesResult.error || 'Unknown error'}`);
          }

          mindsyNotes = notesResult.notes;
        }

        console.log('Mindsy Notes generation successful, length:', mindsyNotes.length);
        console.log(`🕒 Total AI processing pipeline took: ${Date.now() - processingStartTime}ms`);

        // Update job status (no notes_generation_completed_at column in schema)
        await userClient.from('jobs').update({
          updated_at: new Date().toISOString()
        }).eq('job_id', jobId);

        // Store the generated notes in the database for reference
        try {
          await userClient.from('notes').insert({
            job_id: jobId,
            user_id: user.id,
            content: mindsyNotes,
            created_at: new Date().toISOString()
          });
        } catch (dbError) {
          // Non-fatal error - log but continue since we still have the notes in memory
          console.error('Failed to store notes in database:', dbError);
          // We don't throw here because we can still generate the PDF
        }
      } catch (notesGenerationError) {
        console.error('Mindsy Notes generation error:', notesGenerationError);

        // Update job with error information
        await userClient.from('jobs').update({
          status: 'failed',
          error_message: notesGenerationError instanceof Error
            ? `Notes generation failed: ${notesGenerationError.message}`
            : 'Unknown notes generation error',
          error_step: 'notes_generation',
          updated_at: new Date().toISOString()
        }).eq('job_id', jobId);

        return createErrorResponse(
          500,
          'Failed to generate Mindsy Notes',
          ErrorCodes.NOTES_GENERATION_ERROR,
          notesGenerationError instanceof Error ? notesGenerationError.message : 'Unknown error'
        );
      }

      console.log('AI processing pipeline completed successfully');

      // Check effective user tier for multi-format generation
      // This ensures users who downgraded still get Student features during paid period
      const { data: effectiveTierResult, error: tierError } = await userClient.admin
        .rpc('get_effective_subscription_tier', { p_user_id: user.id });
        
      if (tierError) {
        console.error('Error getting effective tier:', tierError);
      }
      
      const effectiveTier = effectiveTierResult || 'free';
      console.log(`Effective tier for format generation: ${effectiveTier}`);

      // Generate additional formats for ALL tiers (removed tier restriction)
      let txtFilePath: string | undefined;
      let mdFilePath: string | undefined;
      
      // Generate formats for all users, not just student tier
      console.log('Generating additional formats (TXT and MD) for all users...');
      
      try {
        // Generate TXT file only if we have transcript content (don't create empty files)
        if (transcript && transcript.trim().length > 0) {
          console.log('📝 Generating TXT file...');
          const txtGenerationStartTime = Date.now();
          const txtFileName = `${sanitizedBody.lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}_transcription.txt`;
          txtFilePath = generateSecureFilePath(user.id, txtFileName, 'transcriptions');
          
          const txtUploadResult = await uploadFile(
            STORAGE_BUCKETS.GENERATED_NOTES,
            txtFilePath,
            new TextEncoder().encode(transcript),
            {
              contentType: 'text/plain',
              upsert: true,
              userId: user.id
            }
          );
          
          console.log(`🕒 TXT file generation took: ${Date.now() - txtGenerationStartTime}ms`);
          
          if (txtUploadResult.success) {
            console.log('TXT file generated successfully:', txtFilePath);
          } else {
            console.error('TXT file generation failed:', txtUploadResult.error);
            // Don't set the path if upload failed
            txtFilePath = undefined;
          }
        } else {
          console.log('📄 Document-only upload - skipping TXT file generation (no transcript)');
          txtFilePath = undefined;
        }
        
        // Generate MD file (Mindsy notes in Markdown) - Available for ALL users
        console.log('📝 Generating MD file for all users...');
        const mdGenerationStartTime = Date.now();
        const mdFileName = `${sanitizedBody.lectureTitle.replace(/[^a-zA-Z0-9]/g, '_')}_notes.md`;
        mdFilePath = generateSecureFilePath(user.id, mdFileName, 'summaries');
        
        const mdUploadResult = await uploadFile(
          STORAGE_BUCKETS.GENERATED_NOTES,
          mdFilePath,
          new TextEncoder().encode(mindsyNotes),
          {
            contentType: 'text/markdown',
            upsert: true,
            userId: user.id
          }
        );
        
        console.log(`🕒 MD file generation took: ${Date.now() - mdGenerationStartTime}ms`);
        
        if (mdUploadResult.success) {
          console.log('MD file generated successfully:', mdFilePath);
        } else {
          console.error('MD file generation failed:', mdUploadResult.error);
          // Don't set the path if upload failed
          mdFilePath = undefined;
        }
        
      } catch (formatError) {
        console.error('Error generating additional formats:', formatError);
        // Non-fatal error - continue with PDF generation
      }

      // Task 4.6: Implement PDF generation and storage
      // Convert generated notes to PDF format
      // Upload PDF to Supabase Storage generated-notes bucket
      // Update job record with output PDF path
      console.log('Starting PDF generation and storage...');

      // Variable to store the download URL for the response
      let downloadUrl: string | undefined;

      // Step 1: Generate PDF from Mindsy Notes
      try {
        const gotenbergClient = createGotenbergClient();
        let pdfResult;

        // Check if we have processing mode (document pipeline) or default to Mindsy Notes (audio pipeline)
        const currentProcessingMode = sanitizedBody.processingMode || 'enhance';

        if (currentProcessingMode === 'store') {
          // For store mode, use simple PDF generation without Mindsy Notes template
          console.log('📄 Generating simple PDF from Markdown...');
          pdfResult = await gotenbergClient.generatePdfFromMarkdown(mindsyNotes, sanitizedBody.lectureTitle);
        } else {
          // For enhance mode or audio pipeline, use Mindsy Notes PDF template
          console.log('🎓 Converting Markdown to HTML for Mindsy Notes PDF...');
          const htmlContent = await convertMarkdownToHtml(mindsyNotes);
          
          pdfResult = await gotenbergClient.generateMindsyNotesPdf(
            htmlContent,
            sanitizedBody.lectureTitle,
            true  // Indicate that we're passing HTML content
          );
        }

        if (!pdfResult.success || !pdfResult.pdfBuffer) {
          throw new Error(`PDF generation failed: ${pdfResult.error || 'Unknown error'}`);
        }

        console.log('PDF generation successful, size:', pdfResult.pdfBuffer.byteLength);

        // Step 2: Create a secure file path for the generated PDF
        const pdfFileName = sanitizedBody.lectureTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');

        // Assign to the variable declared in the higher scope
        outputPdfPath = generateSecureFilePath(
          user.id,
          `${pdfFileName}.pdf`,
          'cornell-notes'
        );

        // Step 3: Upload the generated PDF to Supabase Storage
        try {
          const uploadResult = await uploadFile(
            STORAGE_BUCKETS.GENERATED_NOTES,
            outputPdfPath,
            pdfResult.pdfBuffer,
            {
              contentType: 'application/pdf',
              upsert: true,
              userId: user.id
            }
          );

          if (!uploadResult.success || !uploadResult.data) {
            throw new Error(`PDF upload failed: ${uploadResult.error || 'Unknown error'}`);
          }

          console.log('PDF uploaded successfully:', outputPdfPath);

          // Step 4: Generate a signed URL for the uploaded PDF with longer expiration
          const pdfSignedUrlResult = await generateSignedUrl(
            STORAGE_BUCKETS.GENERATED_NOTES,
            outputPdfPath,
            EXPIRATION_TIMES.LONG, // 6 hours
            user.id
          );

          if (!pdfSignedUrlResult.success || !pdfSignedUrlResult.data) {
            throw new Error(`Failed to generate download URL: ${pdfSignedUrlResult.error || 'Unknown error'}`);
          }

          // Store the download URL for the response
          downloadUrl = pdfSignedUrlResult.data.signedUrl;
          console.log('Generated download URL with expiration:', pdfSignedUrlResult.data.expiresAt);

          // Step 5: Update job record with output PDF path and PDF generation timestamp
          try {
            console.log('Updating job record with output PDF path:', outputPdfPath);
            const { data, error } = await userClient.from('jobs').update({
              output_pdf_path: outputPdfPath,
              updated_at: new Date().toISOString()
            }).eq('job_id', jobId);

            if (error) {
              console.error('Error updating job record:', error);
              throw error;
            }

            console.log('Job record updated successfully:', data);

            // Verify the update by fetching the job record
            const { data: jobData, error: jobError } = await userClient.from('jobs')
              .select('output_pdf_path')
              .eq('job_id', jobId)
              .single();

            if (jobError) {
              console.error('Error fetching job record:', jobError);
            } else {
              console.log('Job record after update:', jobData);
            }
          } catch (dbUpdateError) {
            console.error('Failed to update job record after PDF generation:', dbUpdateError);
            // This is a non-fatal error since we already have the PDF and download URL
            // We can still return success to the client
          }
        } catch (storageError) {
          console.error('PDF storage error:', storageError);

          // Update job with error information
          await userClient.from('jobs').update({
            status: 'failed',
            error_message: storageError instanceof Error
              ? `PDF storage failed: ${storageError.message}`
              : 'Unknown PDF storage error',
            error_step: 'pdf_storage',
            updated_at: new Date().toISOString()
          }).eq('job_id', jobId);

          return createErrorResponse(
            500,
            'Failed to store generated PDF',
            ErrorCodes.STORAGE_ERROR,
            storageError instanceof Error ? storageError.message : 'Unknown error'
          );
        }
      } catch (pdfGenerationError) {
        console.error('PDF generation error:', pdfGenerationError);

        // Update job with error information
        await userClient.from('jobs').update({
          status: 'failed',
          error_message: pdfGenerationError instanceof Error
            ? `PDF generation failed: ${pdfGenerationError.message}`
            : 'Unknown PDF generation error',
          error_step: 'pdf_generation',
          updated_at: new Date().toISOString()
        }).eq('job_id', jobId);

        return createErrorResponse(
          500,
          'Failed to generate PDF from Mindsy Notes',
          ErrorCodes.PDF_GENERATION_ERROR,
          pdfGenerationError instanceof Error ? pdfGenerationError.message : 'Unknown error'
        );
      }

      console.log('PDF generation and storage completed successfully');

      // Task 4.8: Finalize response handling
      // Step 1: Update job status to 'completed' on success
      try {
        console.log('Finalizing job with ID:', jobId);
        console.log('Setting output_pdf_path to:', outputPdfPath);
        console.log('Setting txt_file_path to:', txtFilePath || 'null');
        console.log('Setting md_file_path to:', mdFilePath || 'null');

        // Update job status to completed and include all generated file paths
        const updateData = {
          status: 'completed',
          output_pdf_path: outputPdfPath,
          txt_file_path: txtFilePath || null,
          md_file_path: mdFilePath || null,
          processing_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        console.log('Database update payload:', JSON.stringify(updateData, null, 2));
        
        const { data, error } = await userClient.from('jobs').update(updateData).eq('job_id', jobId);

        if (error) {
          console.error('Error updating job status to completed:', error);
        } else {
          console.log('Job updated successfully');
          
          // Create success notification
          try {
            const notificationService = new NotificationService();
            await notificationService.notifyLectureCompleted(user.id, jobId, lectureTitle);
            console.log('Success notification created');
          } catch (notificationError) {
            console.error('Error creating success notification:', notificationError);
            // Non-fatal error - don't fail the entire request
          }
        }

        // Verify the update by fetching the job record
        const { data: jobData, error: jobError } = await userClient.from('jobs')
          .select('status, output_pdf_path')
          .eq('job_id', jobId)
          .single();

        if (jobError) {
          console.error('Error fetching job record after update:', jobError);
        } else {
          console.log('Job record after update:', jobData);
        }

        console.log(`Job ${jobId} marked as completed`);
        
        // Track usage after successful completion (ONLY for audio uploads)
        if (isAudioPipeline) {
          try {
            const { updateJobWithDuration } = await import('../../lib/minute-validation');
            const { extractDurationWithFFprobe } = await import('../../lib/ffprobe-duration');
            
            console.log('🎵 AUDIO PIPELINE - Tracking minute usage...');
            
            // Get OBJECTIVE duration from the processed audio file using FFprobe
            let actualDurationMinutes = validatedDurationMinutes; // Use the duration we already extracted during validation
            
            // If we didn't have it from validation, extract it now
            if (!actualDurationMinutes || actualDurationMinutes <= 0) {
              try {
                const response = await fetch(fileProcessingResults.audioUrl);
                if (response.ok) {
                  const arrayBuffer = await response.arrayBuffer();
                  const buffer = Buffer.from(arrayBuffer);
                  actualDurationMinutes = await extractDurationWithFFprobe(buffer, 0);
                  console.log(`🎯 Extracted objective duration for tracking: ${actualDurationMinutes} minutes`);
                }
              } catch (durationError) {
                console.warn('Could not extract objective duration for tracking:', durationError);
                actualDurationMinutes = validatedDurationMinutes || 5; // Use validation result as fallback
              }
            }
            
            const tracked = await updateJobWithDuration(
              jobId,
              Number(actualDurationMinutes),
              Number(actualFileSizeMB)
            );

            if (tracked) {
              console.log(`✅ Audio job updated with duration: ${actualDurationMinutes} minutes (${actualFileSizeMB}MB) for user ${user.id}`);
            } else {
              console.error('❌ Error updating audio job with duration');
              // Non-fatal error - job is still completed successfully
            }
            
          } catch (usageTrackingError) {
            console.error('❌ Audio usage tracking error:', usageTrackingError);
            // Non-fatal error - job is still completed successfully
          }
        } else if (isDocumentPipeline) {
          console.log('📄 DOCUMENT PIPELINE - No minute usage tracking (unlimited documents for now)');
        }
        
      } catch (finalizeError) {
        console.error('Error updating job status to completed:', finalizeError);
        // Non-fatal error - we can still return success to the client
      }

      // Step 2: Generate download URL for the PDF
      // We can use either a signed URL (temporary) or a public URL via the download API

      // Create a URL to the download API endpoint for permanent access
      const apiDownloadUrl = new URL(`/api/download/${jobId}`, request.url).toString();

      // Return success response with job ID and download links
      return new Response(JSON.stringify({
        success: true,
        message: 'Processing completed successfully',
        jobId,
        downloadUrl, // Temporary signed URL (expires in 6 hours)
        apiDownloadUrl, // Permanent API endpoint URL
        processingStatus: {
          transcription: 'completed',
          pdfExtraction: fileProcessingResults.pdfUrl ? 'completed' : 'not_required',
          notesGeneration: 'completed',
          pdfGeneration: 'completed'
        }
      }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    } catch (aiProcessingError) {
      console.error('AI processing pipeline error:', aiProcessingError);

      // Update job record with error status
      try {
        const errorMessage = aiProcessingError instanceof Error
          ? aiProcessingError.message
          : 'Unknown AI processing error';
          
        await userClient.from('jobs').update({
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString()
        }).eq('job_id', jobId);
        
        // Create failure notification
        try {
          const notificationService = new NotificationService();
          await notificationService.notifyLectureFailed(user.id, jobId, lectureTitle, errorMessage);
          console.log('Failure notification created');
        } catch (notificationError) {
          console.error('Error creating failure notification:', notificationError);
          // Non-fatal error - don't fail the entire request
        }
      } catch (updateError) {
        console.error('Failed to update job status after AI processing error:', updateError);
      }

      return createErrorResponse(
        500,
        'AI processing failed',
        ErrorCodes.EXTERNAL_API_ERROR,
        aiProcessingError instanceof Error ? aiProcessingError.message : 'Unknown error'
      );
    }
  } catch (error) {
    console.error('Generate API error:', error);

    // Handle unexpected errors with 500 status code
    return createErrorResponse(
      500,
      'Internal server error',
      ErrorCodes.PROCESSING_FAILED,
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
};