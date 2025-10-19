import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/runpod-webhook
 * Receives webhook callbacks from RunPod when transcription jobs complete
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('📨 RunPod webhook received:', {
      id: body.id,
      status: body.status,
      hasOutput: !!body.output
    });

    // Validate webhook payload
    if (!body.id || !body.status) {
      return NextResponse.json(
        { error: 'Invalid webhook payload' },
        { status: 400 }
      );
    }

    // Use service role client for admin access (webhooks don't have user context)
    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
    const supabase = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const jobId = body.id;

    // Handle different job statuses
    switch (body.status) {
      case 'COMPLETED':
        if (!body.output) {
          console.error('❌ Job completed but no output provided');
          await updateJobStatus(supabase, jobId, 'failed', 'No output from RunPod');
          break;
        }

        // Extract transcription text and segments
        const text = extractTranscriptionText(body);
        const segments = extractSegments(body);
        const detectedLanguage = body.output?.detected_language || body.output?.language || 'en';

        console.log('✅ Transcription completed via webhook', {
          jobId,
          textLength: text.length,
          language: detectedLanguage,
          segmentsCount: segments?.length || 0
        });

        // Look up our internal job ID using RunPod's job ID with retry logic
        console.log('🔍 Webhook: Looking for RunPod job ID:', jobId);

        let job = null;
        let jobLookupError = null;
        let attempts = 0;
        const maxAttempts = 5;

        // Retry logic for read-after-write consistency
        while (attempts < maxAttempts && !job) {
          const { data, error } = await supabase
            .from('jobs')
            .select('job_id')
            .eq('runpod_job_id', jobId)
            .single();

          job = data;
          jobLookupError = error;

          if (!job && attempts < maxAttempts - 1) {
            console.log(`🔄 Webhook: Job not found, retrying ${attempts + 1}/${maxAttempts} in 500ms...`);
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          attempts++;
        }

        console.log('🔍 Webhook: Final query result after', attempts, 'attempts:', { job, error: jobLookupError });

        if (jobLookupError || !job) {
          console.error('❌ Could not find job with RunPod ID:', jobId, jobLookupError);
          await updateJobStatus(supabase, jobId, 'failed', 'Job not found in database');
          break;
        }

        // Process in background - don't await so we can return 200 immediately
        const { handleTranscriptionCompletion } = await import('@/lib/content-processor');

        // Start processing but don't wait for it
        handleTranscriptionCompletion(job.job_id, {
          text,
          segments,
          detectedLanguage,
          languageConfidence: body.output?.language_probability
        }).catch(error => {
          console.error('❌ Background processing error:', error);
        });

        console.log('✅ Webhook: Processing started in background');
        break;

      case 'FAILED':
        console.error('❌ RunPod job failed:', body.error);
        await updateJobStatus(supabase, jobId, 'failed', body.error || 'Transcription failed');
        break;

      case 'CANCELLED':
        console.warn('⚠️ RunPod job cancelled');
        await updateJobStatus(supabase, jobId, 'cancelled', 'Job was cancelled');
        break;

      default:
        console.log(`Job ${jobId} status: ${body.status}`);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json({ received: true }, { status: 200 });

  } catch (error) {
    console.error('❌ Webhook processing error:', error);
    
    // Still return 200 to prevent RunPod from retrying
    return NextResponse.json(
      { received: true, error: 'Internal processing error' },
      { status: 200 }
    );
  }
}

/**
 * Extract transcription text from RunPod response
 */
function extractTranscriptionText(data: any): string {
  // Handle different response structures
  if (data.output?.transcription) return data.output.transcription;
  if (data.output?.text) return data.output.text;
  if (data.output?.segments) {
    return data.output.segments.map((s: any) => s.text).join(' ');
  }
  if (typeof data.output === 'string') return data.output;

  throw new Error('Could not extract transcription from webhook data');
}

/**
 * Extract timestamped segments from RunPod faster-whisper response
 * Groups small segments into larger paragraph-sized chunks (like Mindgrasp)
 */
function extractSegments(data: any): Array<{ id: number; start: number; end: number; text: string }> | undefined {
  // Check if segments exist in the output
  if (!data.output?.segments || !Array.isArray(data.output.segments)) {
    console.log('⚠️ No segments found in RunPod response');
    return undefined;
  }

  // Map raw segments to our format
  const rawSegments = data.output.segments.map((segment: any, index: number) => ({
    id: segment.id ?? index,
    start: segment.start ?? 0,
    end: segment.end ?? 0,
    text: (segment.text ?? '').trim()
  })).filter((seg: any) => seg.text.length > 0);

  console.log(`📝 Processing ${rawSegments.length} raw segments into paragraphs...`);

  // Group segments into larger paragraphs (30-60 second chunks or natural breaks)
  const mergedSegments = mergeSegmentsIntoParagraphs(rawSegments);

  console.log('✅ Created', mergedSegments.length, 'paragraph-sized segments from', rawSegments.length, 'raw segments');
  return mergedSegments;
}

/**
 * Merge small segments into larger paragraph-sized chunks
 * Similar to Mindgrasp's approach
 */
function mergeSegmentsIntoParagraphs(
  segments: Array<{ id: number; start: number; end: number; text: string }>
): Array<{ id: number; start: number; end: number; text: string }> {
  if (segments.length === 0) return [];

  const merged: Array<{ id: number; start: number; end: number; text: string }> = [];
  let currentChunk: typeof segments[0] | null = null;
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
 * Update job status in database
 */
async function updateJobStatus(
  supabase: any,
  jobId: string,
  status: string,
  errorMessage?: string
) {
  const updateData: any = {
    status,
    updated_at: new Date().toISOString()
  };

  if (errorMessage) {
    updateData.error_message = errorMessage;
  }

  if (status === 'failed' || status === 'cancelled') {
    updateData.processing_completed_at = new Date().toISOString();
  }

  await supabase
    .from('jobs')
    .update(updateData)
    .eq('job_id', jobId);
}