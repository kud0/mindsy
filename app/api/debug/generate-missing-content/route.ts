import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { handleGenerationStage } from '@/lib/content-processor'

// POST /api/debug/generate-missing-content - Generate content for jobs missing study guides
export async function POST(request: NextRequest) {
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

    // Get the specific job ID from request body if provided
    const body = await request.json().catch(() => ({}))
    const specificJobId = body.jobId

    // Find jobs that are completed but missing study guides
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    if (specificJobId) {
      query = query.eq('job_id', specificJobId)
    }

    const { data: jobs, error: jobsError } = await query

    if (jobsError) {
      return createErrorResponse(`Failed to fetch jobs: ${jobsError.message}`, 500)
    }

    if (!jobs || jobs.length === 0) {
      return createSuccessResponse({
        message: 'No completed jobs found',
        processed: 0
      })
    }

    // Check which jobs are missing study guides
    const jobsToProcess = []
    for (const job of jobs) {
      const { data: studyGuide } = await supabase
        .from('study_guides')
        .select('id')
        .eq('job_id', job.job_id)
        .single()

      if (!studyGuide) {
        // Check if we have transcript text
        if (job.txt_file_path) {
          // Try to download the transcript
          const { data: txtFile, error: downloadError } = await supabase.storage
            .from('generated-notes')
            .download(job.txt_file_path)

          if (!downloadError && txtFile) {
            const transcript = await txtFile.text()
            if (transcript && transcript.trim().length > 0) {
              jobsToProcess.push({
                ...job,
                transcript
              })
            }
          }
        }
      }
    }

    if (jobsToProcess.length === 0) {
      return createSuccessResponse({
        message: 'All jobs already have study guides or no transcript available',
        checked: jobs.length,
        needsProcessing: 0
      })
    }

    // Process each job that needs content
    const results = []
    for (const job of jobsToProcess) {
      try {
        console.log(`🔄 Generating content for job: ${job.job_id} - ${job.lecture_title}`)

        // Call the generation stage directly
        await handleGenerationStage(
          job.job_id,
          {
            text: job.transcript,
            detectedLanguage: job.detected_language || 'en',
            languageConfidence: job.language_confidence
          },
          {
            jobId: job.job_id,
            userId: job.user_id,
            lectureTitle: job.lecture_title,
            courseSubject: job.course_subject,
            mode: 'sync'
          }
        )

        results.push({
          jobId: job.job_id,
          title: job.lecture_title,
          status: 'success',
          message: 'Content generated successfully'
        })
      } catch (error) {
        console.error(`❌ Failed to generate content for job ${job.job_id}:`, error)
        results.push({
          jobId: job.job_id,
          title: job.lecture_title,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    return createSuccessResponse({
      message: `Processed ${results.length} jobs`,
      results,
      successful: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length
    })

  } catch (error) {
    console.error('❌ Generate missing content error:', error)
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500)
  }
}