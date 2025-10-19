import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

// GET /api/debug/check-job-detailed/[jobId] - Detailed job inspection
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params;

  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;

  try {
    const supabase = await createClient();

    // Get job details
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return createErrorResponse('Job not found', 404);
    }

    // Check study_guides
    const { data: studyGuide, error: sgError } = await supabase
      .from('study_guides')
      .select('*')
      .eq('job_id', jobId)
      .single();

    // Check if files exist in storage
    let jsonExists = false;
    let txtExists = false;

    if (job.json_file_path) {
      const { error: jsonError } = await supabase.storage
        .from('generated-notes')
        .download(job.json_file_path);
      jsonExists = !jsonError;
    }

    if (job.txt_file_path) {
      const { error: txtError } = await supabase.storage
        .from('generated-notes')
        .download(job.txt_file_path);
      txtExists = !txtError;
    }

    return createSuccessResponse({
      job: {
        id: job.job_id,
        status: job.status,
        title: job.lecture_title,
        created: job.created_at,
        updated: job.updated_at,
        runpod_job_id: job.runpod_job_id,
        error_message: job.error_message,
        paths: {
          audio: job.audio_file_path,
          txt: job.txt_file_path,
          json: job.json_file_path,
          pdf: job.pdf_file_path
        }
      },
      studyGuide: {
        exists: !!studyGuide,
        error: sgError?.message,
        data: studyGuide ? {
          id: studyGuide.id,
          questionsCount: studyGuide.questions?.length || 0,
          explanationsCount: studyGuide.explanations?.length || 0,
          hasSummary: !!studyGuide.summary
        } : null
      },
      files: {
        jsonExists,
        txtExists
      },
      diagnosis: diagnose(job, studyGuide, jsonExists, txtExists)
    });

  } catch (error) {
    console.error('❌ Detailed check error:', error);
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500);
  }
}

function diagnose(job: any, studyGuide: any, jsonExists: boolean, txtExists: boolean): string {
  if (job.status === 'completed' && studyGuide) {
    return '✅ Everything looks good! Job completed with study guide.';
  }

  if (job.status === 'failed') {
    return `❌ Job failed: ${job.error_message || 'Unknown error'}`;
  }

  if (job.status === 'transcribing') {
    return '⏳ Still transcribing with RunPod. Waiting for webhook...';
  }

  if (job.status === 'generating') {
    return '🤖 OpenAI is generating content right now...';
  }

  if (job.status === 'completed' && !studyGuide) {
    return '⚠️ Job marked complete but no study_guide found! This is the bug.';
  }

  return '❓ Unknown state';
}