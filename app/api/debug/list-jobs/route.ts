import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

// GET /api/debug/list-jobs - List available jobs for current user
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return createErrorResponse('Not available in production', 403)
  }

  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()

    // Get all jobs for current user
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('job_id, lecture_title, status, created_at, json_file_path, pdf_file_path')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (jobsError) {
      return createErrorResponse(`Failed to fetch jobs: ${jobsError.message}`, 500)
    }

    // For each job, check if it has a study guide
    const jobsWithContent = await Promise.all((jobs || []).map(async (job) => {
      const { data: studyGuide } = await supabase
        .from('study_guides')
        .select('id')
        .eq('job_id', job.job_id)
        .single()

      return {
        ...job,
        hasStudyGuide: !!studyGuide,
        hasJsonFile: !!job.json_file_path,
        hasPdfFile: !!job.pdf_file_path,
        studentDeskUrl: `/dashboard/lectures/${job.job_id}/student-desk`
      }
    }))

    const completed = jobsWithContent.filter(j => j.status === 'completed')
    const withContent = jobsWithContent.filter(j => j.hasStudyGuide || j.hasJsonFile)

    return createSuccessResponse({
      totalJobs: jobs?.length || 0,
      completedJobs: completed.length,
      jobsWithContent: withContent.length,
      jobs: jobsWithContent,
      message: withContent.length > 0
        ? `Found ${withContent.length} jobs with content. Click on a studentDeskUrl to test.`
        : 'No jobs with content found. Generate some content first.',
      testUrls: withContent.map(j => ({
        title: j.lecture_title,
        url: `http://localhost:3000${j.studentDeskUrl}`,
        hasData: j.hasStudyGuide || j.hasJsonFile
      }))
    })

  } catch (error) {
    console.error('❌ List jobs error:', error)
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500)
  }
}