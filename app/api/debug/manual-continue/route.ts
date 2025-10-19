import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';
import { handleTranscriptionCompletion } from '@/lib/content-processor';
import { config } from '@/lib/config';

// POST /api/debug/manual-continue?jobId=xxx - Manually continue pipeline from RunPod transcript
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;
  const searchParams = request.nextUrl.searchParams;
  const jobId = searchParams.get('jobId') || '964e491e-2bd0-41b0-9d5b-f727f0eea16a';

  console.log('🔧 Manual continue for job:', jobId);

  try {
    const supabase = await createClient();

    // Get the job
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return createErrorResponse('Job not found', 404);
    }

    if (!job.runpod_job_id) {
      return createErrorResponse('No RunPod job ID found', 400);
    }

    console.log('📥 Fetching transcript from RunPod:', job.runpod_job_id);

    // Get transcript from RunPod
    const runpodResponse = await fetch(`https://api.runpod.ai/v2/ojwmcpij9mwq9w/status/${job.runpod_job_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.runpodApiKey}`
      }
    });

    if (!runpodResponse.ok) {
      return createErrorResponse('Failed to fetch from RunPod', 500);
    }

    const runpodData = await runpodResponse.json();

    if (runpodData.status !== 'COMPLETED') {
      return createErrorResponse(`RunPod job not completed: ${runpodData.status}`, 400);
    }

    if (!runpodData.output) {
      return createErrorResponse('No output from RunPod', 400);
    }

    // Extract transcript
    const transcript = runpodData.output.text ||
                      runpodData.output.transcription ||
                      runpodData.output.transcript;

    const detectedLanguage = runpodData.output.detected_language ||
                             runpodData.output.language || 'en';

    if (!transcript) {
      return createErrorResponse('No transcript found in RunPod output', 400);
    }

    console.log('✅ Got transcript from RunPod:', {
      length: transcript.length,
      language: detectedLanguage
    });

    // Continue the pipeline
    console.log('🚀 Continuing pipeline with OpenAI generation...');

    await handleTranscriptionCompletion(jobId, {
      text: transcript,
      detectedLanguage,
      languageConfidence: runpodData.output.language_probability
    });

    return createSuccessResponse({
      message: 'Pipeline continued successfully!',
      jobId,
      transcriptLength: transcript.length,
      language: detectedLanguage
    });

  } catch (error) {
    console.error('❌ Manual continue error:', error);
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500);
  }
}