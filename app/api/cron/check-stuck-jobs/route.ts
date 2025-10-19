import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createSuccessResponse, createErrorResponse } from '@/lib/auth/require-auth';
import { handleTranscriptionCompletion } from '@/lib/content-processor';
import { config } from '@/lib/config';

/**
 * GET /api/cron/check-stuck-jobs
 * Checks for jobs stuck in "transcribing" and completes them if RunPod finished
 * This handles cases where webhooks fail or don't trigger
 */
export async function GET(request: NextRequest) {
  console.log('🔧 Checking for stuck jobs...');

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find jobs stuck in transcribing status for more than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: stuckJobs, error } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'transcribing')
      .not('runpod_job_id', 'is', null)
      .lt('updated_at', fiveMinutesAgo);

    if (error) {
      console.error('❌ Error fetching stuck jobs:', error);
      return createErrorResponse('Database error', 500);
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      console.log('✅ No stuck jobs found');
      return createSuccessResponse({ message: 'No stuck jobs', count: 0 });
    }

    console.log(`🔍 Found ${stuckJobs.length} potentially stuck jobs`);

    const results = [];

    for (const job of stuckJobs) {
      try {
        console.log(`📥 Checking RunPod status for job ${job.job_id}...`);

        // Check RunPod status
        const response = await fetch(
          `https://api.runpod.ai/v2/ojwmcpij9mwq9w/status/${job.runpod_job_id}`,
          {
            headers: {
              Authorization: `Bearer ${config.runpodApiKey}`,
            },
          }
        );

        if (!response.ok) {
          console.error(`❌ RunPod API error for ${job.job_id}`);
          continue;
        }

        const runpodData = await response.json();

        if (runpodData.status === 'COMPLETED' && runpodData.output) {
          console.log(`✅ RunPod completed for ${job.job_id}, continuing pipeline...`);

          // Extract transcript
          const transcript =
            runpodData.output.text ||
            runpodData.output.transcription ||
            runpodData.output.transcript;

          if (!transcript) {
            console.error(`❌ No transcript in RunPod output for ${job.job_id}`);
            continue;
          }

          const detectedLanguage =
            runpodData.output.detected_language ||
            runpodData.output.language ||
            'en';

          // Continue the pipeline
          await handleTranscriptionCompletion(job.job_id, {
            text: transcript,
            detectedLanguage,
            languageConfidence: runpodData.output.language_probability,
          });

          results.push({
            jobId: job.job_id,
            status: 'completed',
            message: 'Pipeline continued successfully',
          });
        } else {
          console.log(`⏳ Job ${job.job_id} still processing: ${runpodData.status}`);
          results.push({
            jobId: job.job_id,
            status: runpodData.status,
            message: 'Still processing',
          });
        }
      } catch (error) {
        console.error(`❌ Error processing job ${job.job_id}:`, error);
        results.push({
          jobId: job.job_id,
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return createSuccessResponse({
      message: 'Checked stuck jobs',
      totalChecked: stuckJobs.length,
      results,
    });
  } catch (error) {
    console.error('❌ Cron job error:', error);
    return createErrorResponse(
      `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
      500
    );
  }
}