import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

// GET /api/debug/check-actual-content?jobId=xxx - Check what content actually exists for a job
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
  const searchParams = request.nextUrl.searchParams
  const jobId = searchParams.get('jobId') || 'cf5e3ddb-b31f-420a-8b93-4e985381ca4b'

  try {
    const supabase = await createClient()

    // Check what actually exists for this job
    const checks = {
      jobId,
      job: null as any,
      studyGuide: null as any,
      jsonFile: null as any,
      notes: null as any,
      apiWouldReturn: 'unknown'
    }

    // 1. Check if job exists
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (job) {
      checks.job = {
        exists: true,
        status: job.status,
        hasJsonPath: !!job.json_file_path,
        hasPdfPath: !!job.pdf_file_path,
        hasTxtPath: !!job.txt_file_path,
        title: job.lecture_title
      }
    } else {
      checks.job = { exists: false, error: jobError?.message }
      checks.apiWouldReturn = 'mock data (no job found)'
    }

    // 2. Check study_guides table
    const { data: studyGuide, error: sgError } = await supabase
      .from('study_guides')
      .select('*')
      .eq('job_id', jobId)
      .single()

    if (studyGuide) {
      checks.studyGuide = {
        exists: true,
        hasQuestions: studyGuide.questions?.length > 0,
        questionsCount: studyGuide.questions?.length || 0,
        hasExplanations: studyGuide.explanations?.length > 0,
        explanationsCount: studyGuide.explanations?.length || 0,
        hasSummary: !!studyGuide.summary,
        title: studyGuide.title
      }
      checks.apiWouldReturn = 'real data from study_guides'
    } else {
      checks.studyGuide = { exists: false, error: sgError?.message }
    }

    // 3. Check if JSON file exists and can be loaded
    if (job?.json_file_path) {
      const { data: file, error: fileError } = await supabase.storage
        .from('generated-notes')
        .download(job.json_file_path)

      if (file) {
        const content = await file.text()
        const json = JSON.parse(content)
        checks.jsonFile = {
          exists: true,
          canDownload: true,
          hasContent: true,
          contentKeys: Object.keys(json),
          questionsCount: json.questions?.length || 0,
          explanationsCount: json.explanations?.length || 0
        }
        if (!checks.studyGuide.exists) {
          checks.apiWouldReturn = 'real data from JSON file'
        }
      } else {
        checks.jsonFile = { exists: false, error: fileError?.message }
      }
    }

    // 4. Check notes table (legacy)
    const { data: notes } = await supabase
      .from('notes')
      .select('id, content')
      .eq('job_id', jobId)

    if (notes && notes.length > 0) {
      checks.notes = {
        exists: true,
        count: notes.length,
        hasContent: notes.some(n => n.content && n.content.length > 0)
      }
    } else {
      checks.notes = { exists: false }
    }

    // Final determination
    if (!job) {
      checks.apiWouldReturn = '❌ Mock data - job not found'
    } else if (checks.studyGuide?.exists) {
      checks.apiWouldReturn = '✅ Real data from study_guides table'
    } else if (checks.jsonFile?.exists) {
      checks.apiWouldReturn = '✅ Real data from JSON file'
    } else {
      checks.apiWouldReturn = '❌ Mock data - no content found'
    }

    return createSuccessResponse({
      ...checks,
      summary: {
        hasRealContent: checks.studyGuide?.exists || checks.jsonFile?.exists,
        message: checks.apiWouldReturn.includes('Real data')
          ? 'This lecture HAS real content and should display it!'
          : 'This lecture has NO content, showing dummy data is correct'
      }
    })

  } catch (error) {
    console.error('❌ Check content error:', error)
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500)
  }
}