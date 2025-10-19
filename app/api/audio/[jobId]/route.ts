import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse } from '@/lib/auth/require-auth';

interface RouteParams {
  params: Promise<{
    jobId: string;
  }>;
}

/**
 * GET /api/audio/[jobId]
 * Serves the original audio file for a lecture
 * Requires authentication and ownership verification
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params;

  console.log('🎵 Audio API: Request for job:', jobId);

  // Authentication
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;

  try {
    const supabase = await createClient();

    // Fetch job and verify ownership
    console.log('📚 Audio API: Fetching job from database...');
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('job_id, user_id, audio_file_path, lecture_title')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      console.log('❌ Audio API: Job not found or access denied');
      return createErrorResponse('Lecture not found or access denied', 404);
    }

    if (!job.audio_file_path) {
      console.log('⚠️ Audio API: No audio file for this lecture');
      return createErrorResponse('No audio file available for this lecture', 404);
    }

    console.log('✅ Audio API: Found audio file:', job.audio_file_path);

    // Create a signed URL for the audio file (1 hour expiry)
    const { data: signedUrlData, error: urlError } = await supabase.storage
      .from('user-uploads')
      .createSignedUrl(job.audio_file_path, 3600); // 1 hour

    if (urlError || !signedUrlData) {
      console.error('❌ Audio API: Failed to create signed URL:', urlError);
      return createErrorResponse('Failed to access audio file', 500);
    }

    console.log('🔗 Audio API: Created signed URL, redirecting...');

    // Redirect to the signed URL
    // This allows the browser to handle streaming, seeking, etc.
    return Response.redirect(signedUrlData.signedUrl, 302);

  } catch (error) {
    console.error('❌ Audio API: Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}
