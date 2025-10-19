import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

// GET /api/debug/check-job/[jobId] - Check if job has data
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params

  // Allow without auth for debugging (only in development)
  if (process.env.NODE_ENV !== 'development') {
    return createErrorResponse('Not available in production', 403)
  }

  try {
    const supabase = await createClient()

    console.log('🔍 Checking job:', jobId)

    // Check jobs table
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .single()

    if (jobError || !job) {
      return createSuccessResponse({
        found: false,
        error: jobError?.message || 'Job not found',
        jobId
      })
    }

    // Check study_guides table
    const { data: studyGuide, error: sgError } = await supabase
      .from('study_guides')
      .select('*')
      .eq('job_id', jobId)
      .single()

    // Check if JSON file exists
    let jsonFileExists = false
    let jsonFileContent = null
    if (job.json_file_path) {
      const { data: file, error: fileError } = await supabase.storage
        .from('generated-notes')
        .download(job.json_file_path)

      if (!fileError && file) {
        jsonFileExists = true
        const content = await file.text()
        jsonFileContent = JSON.parse(content)
      }
    }

    return createSuccessResponse({
      found: true,
      job: {
        id: job.job_id,
        title: job.lecture_title,
        status: job.status,
        userId: job.user_id,
        hasJsonPath: !!job.json_file_path,
        hasPdfPath: !!job.pdf_file_path,
        created: job.created_at
      },
      studyGuide: studyGuide ? {
        exists: true,
        title: studyGuide.title,
        questionsCount: studyGuide.questions?.length || 0,
        explanationsCount: studyGuide.explanations?.length || 0,
        hasSummary: !!studyGuide.summary
      } : {
        exists: false,
        error: sgError?.message
      },
      jsonFile: {
        exists: jsonFileExists,
        path: job.json_file_path,
        hasContent: !!jsonFileContent,
        contentKeys: jsonFileContent ? Object.keys(jsonFileContent) : null
      },
      summary: {
        hasData: !!(studyGuide || jsonFileExists),
        shouldShowRealContent: !!(studyGuide || jsonFileExists),
        fallbackReason: !studyGuide && !jsonFileExists ? 'No content found' : null
      }
    })

  } catch (error) {
    console.error('❌ Check job error:', error)
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500)
  }
}