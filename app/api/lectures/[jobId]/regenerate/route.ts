import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { handleTranscriptionCompletion } from '@/lib/content-processor'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

// POST /api/lectures/[jobId]/regenerate - Trigger content generation for existing lecture
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params

  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()

    // Get job with transcription
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return createErrorResponse(`Job ${jobId} not found`, 404)
    }

    if (!job.txt_file_path) {
      return createErrorResponse('No transcription found for this lecture', 400)
    }

    // Download the transcription
    const { data: txtFile, error: downloadError } = await supabase.storage
      .from('generated-notes')
      .download(job.txt_file_path)

    if (downloadError || !txtFile) {
      return createErrorResponse('Could not download transcription', 500)
    }

    const transcriptText = await txtFile.text()

    // Trigger the existing content generation pipeline
    console.log('🚀 Regenerating content for:', jobId)

    await handleTranscriptionCompletion(jobId, {
      text: transcriptText,
      detectedLanguage: job.detected_language || 'en',
      languageConfidence: job.language_confidence
    })

    return createSuccessResponse({
      message: 'Content generation completed successfully',
      jobId
    })

  } catch (error) {
    console.error('❌ Regenerate error:', error)
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500)
  }
}