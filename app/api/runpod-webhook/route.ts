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

        // Extract transcription text
        const text = extractTranscriptionText(body);
        const detectedLanguage = body.output?.detected_language || body.output?.language || 'en';

        console.log('✅ Transcription completed via webhook', {
          jobId,
          textLength: text.length,
          language: detectedLanguage
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

        // Use the new content processor to handle transcription completion
        const { handleTranscriptionCompletion } = await import('@/lib/content-processor');
        await handleTranscriptionCompletion(job.job_id, {
          text,
          detectedLanguage,
          languageConfidence: body.output?.language_probability
        });
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