import { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, createSuccessResponse, createErrorResponse } from '@/lib/auth/require-auth';

// POST /api/debug/cleanup-old-stuck-jobs - Mark old stuck jobs as failed
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Find jobs stuck in transcribing for more than 1 hour (definitely dead)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: stuckJobs, error } = await supabase
      .from('jobs')
      .select('job_id, lecture_title, created_at')
      .eq('status', 'transcribing')
      .lt('updated_at', oneHourAgo);

    if (error) {
      return createErrorResponse('Database error', 500);
    }

    if (!stuckJobs || stuckJobs.length === 0) {
      return createSuccessResponse({ message: 'No old stuck jobs', count: 0 });
    }

    console.log(`🧹 Cleaning up ${stuckJobs.length} old stuck jobs`);

    // Mark them all as failed
    const { error: updateError } = await supabase
      .from('jobs')
      .update({
        status: 'failed',
        error_message: 'Webhook timeout - please re-upload',
        updated_at: new Date().toISOString()
      })
      .eq('status', 'transcribing')
      .lt('updated_at', oneHourAgo);

    if (updateError) {
      return createErrorResponse('Failed to update jobs', 500);
    }

    return createSuccessResponse({
      message: 'Old stuck jobs cleaned up',
      count: stuckJobs.length,
      jobs: stuckJobs.map(j => ({ id: j.job_id, title: j.lecture_title }))
    });

  } catch (error) {
    console.error('❌ Cleanup error:', error);
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500);
  }
}