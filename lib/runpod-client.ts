/**
 * RunPod Whisper API Client
 * Handles audio transcription using RunPod's Whisper service
 */
import { config } from './config';
import { Logger } from './monitoring';

/**
 * Request interface for RunPod API
 */
interface RunPodRequest {
  input: {
    audio: string;
    /**
     * Optional parameters that can be passed to the Whisper model
     */
    model?: 'distil-large-v3';  // e.g., 'large-v3' for a larger model

    options?: {
      language?: string;
      temperature?: number;
      [key: string]: any;
      max_speakers?: 4;
      detect_language?: boolean; // Enable language detection
    };
  };
}

/**
 * Base interface for all RunPod responses
 * Contains common fields that are present in all response formats
 */
interface RunPodResponseBase {
  /**
   * Status of the request: 'completed', 'failed', 'processing'
   */
  status: string;
  
  /**
   * ID of the request
   */
  id?: string;
  
  /**
   * Timestamp when the request was created
   */
  created_at?: string;
  
  /**
   * Timestamp when the request was completed
   */
  completed_at?: string;
}

/**
 * Original expected response format (V1)
 * Output contains a direct text field
 */
export interface RunPodResponseV1 extends RunPodResponseBase {
  output: {
    text: string;
    /**
     * Detected language information
     */
    language?: string;
    language_probability?: number;
    /**
     * Optional additional fields that might be present
     */
    [key: string]: any;
  };
}

/**
 * Alternative response format (V2)
 * Output contains a transcription field instead of text
 */
export interface RunPodResponseV2 extends RunPodResponseBase {
  output: {
    transcription: string;
    /**
     * Optional additional fields that might be present
     */
    [key: string]: any;
  };
}

/**
 * Alternative response format (V3)
 * Output contains a nested result object with transcription
 */
export interface RunPodResponseV3 extends RunPodResponseBase {
  output: {
    result: {
      transcription: string;
      /**
       * Optional additional fields that might be present in the result
       */
      [key: string]: any;
    };
    /**
     * Optional additional fields that might be present in the output
     */
    [key: string]: any;
  };
}

/**
 * Alternative response format (V4)
 * Output contains a transcript field instead of text or transcription
 */
export interface RunPodResponseV4 extends RunPodResponseBase {
  output: {
    transcript: string;
    /**
     * Optional additional fields that might be present
     */
    [key: string]: any;
  };
}

/**
 * Alternative response format (V5)
 * Output contains a nested data structure with transcript or transcription
 */
export interface RunPodResponseV5 extends RunPodResponseBase {
  output: {
    data: {
      transcript?: string;
      transcription?: string;
      text?: string;
      /**
       * Optional additional fields that might be present
       */
      [key: string]: any;
    };
    /**
     * Optional additional fields that might be present
     */
    [key: string]: any;
  };
}

/**
 * Union type of all known response formats
 * This allows TypeScript to handle any of the known formats
 */
export type RunPodResponse = 
  | RunPodResponseV1 
  | RunPodResponseV2 
  | RunPodResponseV3 
  | RunPodResponseV4 
  | RunPodResponseV5;

/**
 * Transcript segment with timestamp
 */
export interface TranscriptSegment {
  id: number;
  start: number;  // Start time in seconds
  end: number;    // End time in seconds
  text: string;   // Segment text
}

/**
 * Transcription result with language information and segments
 */
export interface TranscriptionResult {
  text: string;
  segments?: TranscriptSegment[];  // Timestamped segments for clickable transcript
  detectedLanguage?: string;
  languageConfidence?: number;
}

/**
 * Error response format from RunPod API
 */
export interface RunPodError {
  error: string;
  message?: string;
  /**
   * Additional error details that might be present
   */
  details?: any;
  /**
   * HTTP status code
   */
  status_code?: number;
  /**
   * Request ID for tracking
   */
  request_id?: string;
}

/**
 * Generic response type that can handle any response format
 * Used for initial parsing before determining the specific format
 * This allows for flexible handling of unexpected response structures
 */
export interface RunPodResponseAny extends RunPodResponseBase {
  /**
   * Output can be any structure
   */
  output: any;
  
  /**
   * Allow any additional fields
   */
  [key: string]: any;
}

/**
 * Error types for RunPod client
 * Used to categorize errors for better diagnostics and handling
 */
export enum RunPodErrorType {
  NETWORK = 'Network',
  API_ERROR = 'APIError',
  RESPONSE_FORMAT = 'ResponseFormat',
  IN_PROGRESS = 'InProgress',
  TIMEOUT = 'Timeout',
  AUTHENTICATION = 'Authentication',
  EMPTY_RESPONSE = 'EmptyResponse',
  UNKNOWN = 'Unknown'
}

/**
 * Custom error class for RunPod client errors
 * Provides structured error information for better error handling
 */
export class RunPodClientError extends Error {
  readonly type: RunPodErrorType;
  readonly originalError?: Error;
  readonly responseData?: any;
  readonly retryAttempt?: number;
  readonly maxRetries?: number;
  
  constructor(
    message: string, 
    type: RunPodErrorType = RunPodErrorType.UNKNOWN,
    options?: {
      originalError?: Error;
      responseData?: any;
      retryAttempt?: number;
      maxRetries?: number;
    }
  ) {
    super(message);
    this.name = 'RunPodClientError';
    this.type = type;
    
    if (options) {
      this.originalError = options.originalError;
      this.responseData = options.responseData;
      this.retryAttempt = options.retryAttempt;
      this.maxRetries = options.maxRetries;
      
      // Preserve the original stack trace if available
      if (options.originalError && options.originalError.stack) {
        this.stack = options.originalError.stack;
      }
    }
    
    // This is needed for instanceof checks to work properly with custom Error classes
    Object.setPrototypeOf(this, RunPodClientError.prototype);
  }
  
  /**
   * Get a formatted error message with type information
   */
  get formattedMessage(): string {
    return `RunPod transcription failed (${this.type}): ${this.message}`;
  }
}

export class RunPodClient {
  private apiKey: string;
  private baseUrl: string;
  private logger: Logger;
  private debugMode: boolean;

  constructor(apiKey: string, baseUrl?: string, debugMode?: boolean) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl || 'https://api.runpod.ai/v2/ojwmcpij9mwq9w';
    this.logger = new Logger('RunPodClient');
    this.debugMode = debugMode ?? config.runpodDebugMode;
  }
  
  /**
   * Categorize an error based on its message and type
   * @param error - The error to categorize
   * @returns The error type as a string
   */
  private categorizeError(error: unknown): RunPodErrorType {
    if (!(error instanceof Error)) {
      return RunPodErrorType.UNKNOWN;
    }
    
    const errorMessage = error.message.toLowerCase();
    
    if (errorMessage.includes('job is still in progress')) {
      return RunPodErrorType.IN_PROGRESS;
    }
    
    if (errorMessage.includes('invalid response format')) {
      return RunPodErrorType.RESPONSE_FORMAT;
    }
    
    if (errorMessage.includes('fetch') || 
        errorMessage.includes('network') || 
        errorMessage.includes('connection') ||
        errorMessage.includes('socket') ||
        errorMessage.includes('und_err_socket') ||
        errorMessage.includes('other side closed')) {
      return RunPodErrorType.NETWORK;
    }
    
    if (errorMessage.includes('runpod api error')) {
      return RunPodErrorType.API_ERROR;
    }
    
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('timed out')) {
      return RunPodErrorType.TIMEOUT;
    }
    
    if (errorMessage.includes('unauthorized') || 
        errorMessage.includes('authentication') || 
        errorMessage.includes('api key')) {
      return RunPodErrorType.AUTHENTICATION;
    }
    
    return RunPodErrorType.UNKNOWN;
  }
  
  /**
   * Extract segments from response
   * Groups small segments into paragraph-sized chunks (like Mindgrasp)
   * @param response - The raw response data from RunPod API
   * @returns Array of transcript segments with timestamps
   */
  private extractSegments(response: RunPodResponseAny): TranscriptSegment[] {
    // Try to find segments in various response structures
    const rawSegments = response.output?.segments ||
                        response.output?.result?.segments ||
                        response.output?.data?.segments ||
                        [];

    if (!Array.isArray(rawSegments)) {
      this.logger.info('No segments found in response');
      return [];
    }

    // Map raw segments to our format
    const mappedSegments = rawSegments.map((seg: any, index: number) => ({
      id: seg.id ?? index,
      start: typeof seg.start === 'number' ? seg.start : 0,
      end: typeof seg.end === 'number' ? seg.end : 0,
      text: (seg.text || '').trim()
    })).filter((seg: TranscriptSegment) => seg.text.length > 0);

    this.logger.info(`Processing ${mappedSegments.length} raw segments into paragraphs`);

    // Merge into paragraph-sized chunks
    const mergedSegments = this.mergeSegmentsIntoParagraphs(mappedSegments);

    this.logger.info(`Created ${mergedSegments.length} paragraph segments from ${mappedSegments.length} raw segments`);
    return mergedSegments;
  }

  /**
   * Merge small segments into larger paragraph-sized chunks
   * Similar to Mindgrasp's approach: 20-60 second chunks with natural pauses
   */
  private mergeSegmentsIntoParagraphs(segments: TranscriptSegment[]): TranscriptSegment[] {
    if (segments.length === 0) return [];

    const merged: TranscriptSegment[] = [];
    let currentChunk: TranscriptSegment | null = null;
    const MIN_CHUNK_DURATION = 20; // Minimum 20 seconds per chunk
    const MAX_CHUNK_DURATION = 60; // Maximum 60 seconds per chunk
    const PAUSE_THRESHOLD = 2.0;   // Consider pauses > 2 seconds as paragraph breaks

    for (let i = 0; i < segments.length; i++) {
      const segment = segments[i];
      const nextSegment = segments[i + 1];

      if (!currentChunk) {
        // Start a new chunk
        currentChunk = { ...segment };
        continue;
      }

      const chunkDuration = segment.end - currentChunk.start;
      const pauseToNext = nextSegment ? nextSegment.start - segment.end : 0;

      // Decide whether to merge or split
      const shouldSplit =
        chunkDuration >= MAX_CHUNK_DURATION || // Chunk is too long
        (chunkDuration >= MIN_CHUNK_DURATION && pauseToNext > PAUSE_THRESHOLD) || // Natural pause
        !nextSegment; // Last segment

      if (shouldSplit) {
        // Finalize current chunk
        currentChunk.text += ' ' + segment.text;
        currentChunk.end = segment.end;
        merged.push({ ...currentChunk, id: merged.length });
        currentChunk = null;
      } else {
        // Continue building current chunk
        currentChunk.text += ' ' + segment.text;
        currentChunk.end = segment.end;
      }
    }

    // Add any remaining chunk
    if (currentChunk) {
      merged.push({ ...currentChunk, id: merged.length });
    }

    return merged;
  }

  /**
   * Extract transcription text from various response formats
   * @param response - The raw response data from RunPod API
   * @returns The extracted transcription text
   * @throws Error if no transcription text can be found or if the job is still in progress
   */
  private extractTranscriptionText(response: RunPodResponseAny): string {
    // Log the response structure in debug mode
    if (this.debugMode) {
      this.logger.debug('Extracting transcription from response', {
        responseStructure: JSON.stringify(response, null, 2)
      });
    }
    
    // Always log the response keys for debugging
    this.logger.info('Extracting transcription from response', {
      hasOutput: !!response.output,
      outputKeys: response.output ? Object.keys(response.output) : [],
      topLevelKeys: Object.keys(response)
    });
    
    // Check if the job is still in progress or queued
    if (response.status === 'IN_PROGRESS' || response.status === 'IN_QUEUE') {
      this.logger.info('Job is still processing, cannot extract transcription yet', {
        status: response.status,
        id: response.id
      });
      throw new RunPodClientError(
        'Job is still in progress, try again later',
        RunPodErrorType.IN_PROGRESS,
        { responseData: response }
      );
    }
    
    // Check for completed job with no output (empty audio or processing failure)
    if (response.status === 'COMPLETED' && !response.output) {
      this.logger.warn('Job completed successfully but returned no output', {
        status: response.status,
        id: response.id,
        executionTime: response.executionTime,
        delayTime: response.delayTime
      });
      throw new RunPodClientError(
        'Job completed but returned no transcription output. This usually indicates empty audio, corrupted file, or no speech detected.',
        RunPodErrorType.EMPTY_RESPONSE,
        { responseData: response }
      );
    }
    
    // Check for format V1: output.text
    if (response.output && typeof response.output.text === 'string') {
      this.logger.info('Found transcription in output.text format');
      return response.output.text;
    }
    
    // Check for format V2: output.transcription
    if (response.output && typeof response.output.transcription === 'string') {
      this.logger.info('Found transcription in output.transcription format');
      return response.output.transcription;
    }
    
    // Check for format V3: output.result.transcription
    if (
      response.output && 
      response.output.result && 
      typeof response.output.result.transcription === 'string'
    ) {
      this.logger.info('Found transcription in output.result.transcription format');
      return response.output.result.transcription;
    }
    
    // Check for any string field that might contain the transcription
    // This is a fallback mechanism for unknown formats
    if (response.output) {
      // Check for any field named 'transcript' or similar
      const possibleFields = ['transcript', 'transcription', 'text', 'content', 'speech', 'audio_text'];
      
      for (const field of possibleFields) {
        if (typeof response.output[field] === 'string') {
          this.logger.info(`Found transcription in output.${field} format`);
          return response.output[field];
        }
      }
      
      // Check for nested objects that might contain the transcription
      for (const key in response.output) {
        const value = response.output[key];
        
        if (typeof value === 'object' && value !== null) {
          for (const field of possibleFields) {
            if (typeof value[field] === 'string') {
              this.logger.info(`Found transcription in output.${key}.${field} format`);
              return value[field];
            }
          }
        }
      }
    }
    
    // If we reach here, we couldn't find the transcription text
    this.logger.error('Failed to extract transcription from response', null, {
      actualResponse: JSON.stringify(response, null, 2)
    });
    
    throw new RunPodClientError(
      'Could not extract transcription text from response',
      RunPodErrorType.RESPONSE_FORMAT,
      { responseData: response }
    );
  }

  /**
   * Transcribe audio with webhook (recommended for production)
   * @param audioUrl - Signed URL to the audio file
   * @param webhookUrl - URL where RunPod will POST the results
   * @returns Promise<{jobId: string}> - Job ID for tracking
   */
  async transcribeAudioWithWebhook(
    audioUrl: string,
    webhookUrl: string
  ): Promise<{ jobId: string }> {
    if (!audioUrl || !webhookUrl) {
      throw new Error('Audio URL and webhook URL are required');
    }

    if (!this.apiKey) {
      throw new Error('RunPod API key is not configured');
    }

    const requestBody: any = {
      input: {
        audio: audioUrl
      },
      webhook: webhookUrl // RunPod will POST to this URL when complete
    };

    this.logger.info('Starting ASYNC transcription with webhook', {
      baseUrl: this.baseUrl,
      webhookUrl,
      audioUrl: audioUrl.substring(0, 50) + '...'
    });

    try {
      const submitResponse = await fetch(`${this.baseUrl}/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(requestBody)
      });

      if (!submitResponse.ok) {
        const errorText = await submitResponse.text();
        throw new Error(`Failed to submit RunPod job: ${submitResponse.status} - ${errorText}`);
      }

      const submitResult = await submitResponse.json();
      const jobId = submitResult.id;

      if (!jobId) {
        throw new Error('No job ID returned from RunPod');
      }

      this.logger.info('Job submitted with webhook successfully', { jobId, webhookUrl });
      
      return { jobId };

    } catch (error) {
      this.logger.error('Failed to submit webhook job', error);
      throw new RunPodClientError(
        error instanceof Error ? error.message : 'Failed to submit job',
        RunPodErrorType.API_ERROR,
        { originalError: error instanceof Error ? error : undefined }
      );
    }
  }

  /**
   * Transcribe audio with language detection using polling (fallback)
   * @param audioUrl - Signed URL to the audio file
   * @param maxRetries - Maximum number of retries for IN_PROGRESS status (default: 3)
   * @param retryDelayMs - Delay between retries in milliseconds (default: 5000)
   * @returns Promise<TranscriptionResult> - Transcribed text with language info
   */
  async transcribeAudioWithLanguage(
    audioUrl: string, 
    maxRetries: number = 3, 
    retryDelayMs: number = 5000
  ): Promise<TranscriptionResult> {
    if (!audioUrl) {
      throw new Error('Audio URL is required');
    }

    if (!this.apiKey) {
      throw new Error('RunPod API key is not configured');
    }

    const requestBody: RunPodRequest = {
      input: {
        audio: audioUrl
        // Note: Language detection is handled by Whisper automatically
        // Removed explicit detect_language option as it's not supported by all endpoints
      }
    };

    this.logger.info('Starting ASYNC transcription with RunPod API', {
      baseUrl: this.baseUrl,
      audioUrl: audioUrl.substring(0, 50) + '...' // Truncate URL for logging
    });

    let retries = 0;
    let lastError: Error | null = null;

    while (retries <= maxRetries) {
      try {
        // Step 1: Submit job to async endpoint
        this.logger.info('Submitting async job to RunPod');
        const submitResponse = await fetch(`${this.baseUrl}/run`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!submitResponse.ok) {
          const errorText = await submitResponse.text();
          throw new Error(`Failed to submit RunPod job: ${submitResponse.status} - ${errorText}`);
        }

        const submitResult = await submitResponse.json();
        const jobId = submitResult.id;

        if (!jobId) {
          throw new Error('No job ID returned from RunPod');
        }

        this.logger.info('Job submitted successfully, starting polling', { jobId });

        // Step 2: Poll for completion
        return await this.pollJobStatus(jobId, maxRetries);

      } catch (error) {
        if (error instanceof RunPodClientError) {
          throw error;
        }
        
        const errorType = this.categorizeError(error);
        const isRetryableError = errorType === RunPodErrorType.NETWORK;
        
        if (retries >= maxRetries || !isRetryableError) {
          throw new RunPodClientError(
            error instanceof Error ? error.message : 'Unknown error during async job submission',
            errorType,
            {
              originalError: error instanceof Error ? error : undefined,
              retryAttempt: retries,
              maxRetries
            }
          );
        }

        this.logger.warn(`Retrying RunPod request due to ${errorType} (attempt ${retries + 1}/${maxRetries})`, { error: error instanceof Error ? error.message : String(error), retryDelay: retryDelayMs });
        retries++;
        lastError = error instanceof Error ? error : new Error(String(error));
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }

    // This shouldn't be reached, but just in case
    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Poll RunPod job status until completion with exponential backoff
   */
  private async pollJobStatus(jobId: string, maxRetries: number = 10): Promise<TranscriptionResult> {
    let attempts = 0;
    const maxPollingTime = 600000; // 10 minutes total timeout
    const startTime = Date.now();
    
    // Exponential backoff: starts at 2s, doubles up to 30s max
    const getBackoffDelay = (attempt: number): number => {
      const baseDelay = 2000; // 2 seconds
      const maxDelay = 30000; // 30 seconds max
      const exponentialDelay = baseDelay * Math.pow(2, Math.min(attempt, 4));
      return Math.min(exponentialDelay, maxDelay);
    };

    while (Date.now() - startTime < maxPollingTime) {
      try {
        const currentDelay = getBackoffDelay(attempts);
        const elapsedTime = Math.round((Date.now() - startTime) / 1000);
        
        this.logger.info(`Polling job status (attempt ${attempts + 1}, ${elapsedTime}s elapsed, next check in ${currentDelay/1000}s)`, { jobId });
        
        const statusResponse = await fetch(`${this.baseUrl}/status/${jobId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        });

        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          throw new Error(`Failed to check job status: ${statusResponse.status} - ${errorText}`);
        }

        const statusData = await statusResponse.json();
        
        this.logger.info('Job status check', { 
          jobId, 
          status: statusData.status,
          hasOutput: !!statusData.output,
          elapsedSeconds: elapsedTime
        });

        // Check if job is completed
        if (statusData.status === 'COMPLETED' && statusData.output) {
          // Process the completed result
          const text = this.extractTranscriptionText(statusData);
          const segments = this.extractSegments(statusData);

          const result: TranscriptionResult = {
            text,
            segments,  // Include timestamped segments
            detectedLanguage: statusData.output?.detected_language || statusData.output?.language,
            languageConfidence: statusData.output?.language_probability
          };

          this.logger.info('Async transcription completed successfully', {
            jobId,
            textLength: text.length,
            segmentsCount: segments.length,
            detectedLanguage: result.detectedLanguage,
            totalTime: `${elapsedTime}s`,
            totalAttempts: attempts + 1
          });

          return result;
        }

        // Check if job failed
        if (statusData.status === 'FAILED' || statusData.status === 'CANCELLED') {
          throw new Error(`RunPod job ${statusData.status.toLowerCase()}: ${statusData.error || 'Unknown error'}`);
        }

        // Job is still processing, wait with exponential backoff
        if (statusData.status === 'IN_PROGRESS' || statusData.status === 'IN_QUEUE') {
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          attempts++;
          continue;
        }

        // Unknown status
        throw new Error(`Unknown job status: ${statusData.status}`);

      } catch (error) {
        // If we're close to timeout, throw the error
        if (Date.now() - startTime >= maxPollingTime - 5000) {
          const totalSeconds = Math.round((Date.now() - startTime) / 1000);
          throw new Error(`Polling timeout after ${totalSeconds} seconds: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        const currentDelay = getBackoffDelay(attempts);
        this.logger.warn(`Polling error, retrying in ${currentDelay/1000}s`, { 
          jobId, 
          attempt: attempts + 1, 
          error: error instanceof Error ? error.message : String(error) 
        });
        
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        attempts++;
      }
    }

    const totalSeconds = Math.round((Date.now() - startTime) / 1000);
    throw new Error(`Polling timeout: Job did not complete within ${totalSeconds} seconds`);
  }

  /**
   * Transcribe audio using RunPod Whisper API /runsync endpoint
   * @param audioUrl - Signed URL to the audio file
   * @param maxRetries - Maximum number of retries for IN_PROGRESS status (default: 3)
   * @param retryDelayMs - Delay between retries in milliseconds (default: 5000)
   * @returns Promise<string> - Transcribed text
   */
  async transcribeAudio(
    audioUrl: string, 
    maxRetries: number = 3, 
    retryDelayMs: number = 5000
  ): Promise<string> {
    if (!audioUrl) {
      throw new Error('Audio URL is required');
    }

    if (!this.apiKey) {
      throw new Error('RunPod API key is not configured');
    }

    const requestBody: RunPodRequest = {
      input: {
        audio: audioUrl
      }
    };

    this.logger.info('Sending transcription request to RunPod API', {
      baseUrl: this.baseUrl,
      audioUrl: audioUrl.substring(0, 50) + '...' // Truncate URL for logging
    });

    let retries = 0;
    let lastError: Error | null = null;

    while (retries <= maxRetries) {
      try {
        const response = await fetch(`${this.baseUrl}/runsync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = `RunPod API error: ${response.status} ${response.statusText}`;
          let errorData: RunPodError | null = null;

          try {
            errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
            
            // Log the error response structure
            this.logger.error('RunPod API error response', null, {
              status: response.status,
              statusText: response.statusText,
              errorData
            });
          } catch {
            // If error response is not JSON, use the raw text
            errorMessage = errorText || errorMessage;
            this.logger.error('RunPod API non-JSON error response', null, {
              status: response.status,
              statusText: response.statusText,
              errorText
            });
          }

          throw new RunPodClientError(
            errorMessage,
            RunPodErrorType.API_ERROR,
            {
              responseData: errorData || errorText,
              retryAttempt: retries,
              maxRetries
            }
          );
        }

        // Parse response as any to inspect its structure
        const rawData: RunPodResponseAny = await response.json();
        
        // Log the actual response structure in debug mode
        if (this.debugMode) {
          this.logger.debug('RunPod API raw response structure', {
            responseStructure: JSON.stringify(rawData, null, 2)
          });
        }

        // Always log the response structure keys for debugging
        this.logger.info('RunPod API response received', {
          status: rawData.status,
          hasOutput: !!rawData.output,
          outputKeys: rawData.output ? Object.keys(rawData.output) : [],
          topLevelKeys: Object.keys(rawData)
        });

        // Use the extractTranscriptionText helper to get the transcription text
        try {
          return this.extractTranscriptionText(rawData);
        } catch (extractError) {
          // Check if the error is due to IN_PROGRESS status
          if (extractError instanceof Error && extractError.message.includes('Job is still in progress')) {
            // If we haven't reached max retries, wait and try again
            if (retries < maxRetries) {
              this.logger.info(`Job is still in progress, retrying in ${retryDelayMs}ms (retry ${retries + 1}/${maxRetries})`, {
                status: rawData.status,
                id: rawData.id
              });
              
              retries++;
              lastError = extractError;
              
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, retryDelayMs));
              continue;
            }
          }
          
          // Log the full response structure when extraction fails
          this.logger.error('Failed to extract transcription from RunPod API response', null, {
            error: extractError instanceof Error ? extractError.message : 'Unknown error',
            actualResponse: JSON.stringify(rawData, null, 2)
          });
          
          // Throw a structured error with the response data
          throw new RunPodClientError(
            extractError instanceof Error ? extractError.message : 'could not extract transcription',
            RunPodErrorType.RESPONSE_FORMAT,
            {
              originalError: extractError instanceof Error ? extractError : undefined,
              responseData: rawData,
              retryAttempt: retries,
              maxRetries
            }
          );
        }
      } catch (error) {
        // Categorize the error
        const errorType = this.categorizeError(error);
        
        // If this is the last retry or the error is not related to IN_PROGRESS status, enhance and rethrow it
        if (retries >= maxRetries || errorType !== RunPodErrorType.IN_PROGRESS) {
          // Enhance error with additional context
          if (error instanceof RunPodClientError) {
            // If it's already a RunPodClientError, just update the retry information and rethrow
            error.retryAttempt = retries;
            error.maxRetries = maxRetries;
            
            this.logger.error(`RunPod transcription failed (${error.type})`, error, {
              errorType: error.type,
              retryAttempt: retries,
              maxRetries,
              audioUrl: audioUrl.substring(0, 50) + '...' // Truncate URL for logging
            });
            
            throw error;
          } else if (error instanceof Error) {
            // Log detailed error information
            this.logger.error(`RunPod transcription failed (${errorType})`, error, {
              errorType,
              retryAttempt: retries,
              maxRetries,
              audioUrl: audioUrl.substring(0, 50) + '...' // Truncate URL for logging
            });
            
            // Create a structured error with the original error
            throw new RunPodClientError(
              error.message,
              errorType,
              {
                originalError: error,
                retryAttempt: retries,
                maxRetries
              }
            );
          } else {
            // For non-Error objects
            this.logger.error(`RunPod transcription failed with non-Error object (${errorType})`, null, {
              errorType,
              error: String(error),
              retryAttempt: retries,
              maxRetries
            });
            
            throw new RunPodClientError(
              String(error),
              errorType,
              {
                retryAttempt: retries,
                maxRetries
              }
            );
          }
        }
        
        // For IN_PROGRESS errors that can be retried
        this.logger.info(`Job is still in progress, will retry (${retries + 1}/${maxRetries})`, {
          errorType,
          retryAttempt: retries + 1,
          maxRetries,
          retryDelayMs
        });
        
        // Store the error and continue with the next retry
        lastError = error instanceof Error ? error : new Error(String(error));
        retries++;
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelayMs));
      }
    }
    
    // If we've exhausted all retries, throw the last error
    if (lastError) {
      throw lastError;
    }
    
    // This should never happen, but TypeScript requires a return statement
    throw new Error('Unexpected error: No result after all retries');
  }
}

/**
 * Factory function to create RunPod client with configuration
 */
export function createRunPodClient(): RunPodClient {
  // Use the config imported at the top of the file
  const apiKey = config.runpodApiKey;

  if (!apiKey) {
    throw new Error('RunPod API key is not configured');
  }

  return new RunPodClient(apiKey, undefined, config.runpodDebugMode);
}