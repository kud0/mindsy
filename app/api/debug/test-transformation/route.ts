import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { loadAndTransformLectureData } from '@/lib/lecture-data-transformer'

// GET /api/debug/test-transformation?jobId=xxx - Test data transformation (development only)
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
  const jobId = searchParams.get('jobId')

  if (!jobId) {
    return createErrorResponse('jobId parameter required', 400)
  }

  try {
    const supabase = await createClient()

    console.log('🔍 Testing transformation for job:', jobId)

    // Get job data
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      return createErrorResponse(`Job not found: ${jobError?.message}`, 404)
    }

    // Get study guide data
    const { data: studyGuide, error: sgError } = await supabase
      .from('study_guides')
      .select('*')
      .eq('job_id', jobId)
      .single()

    let originalData = null
    let transformedData = null

    if (studyGuide && !sgError) {
      console.log('✅ Found study guide data')

      // Show original format
      originalData = {
        metadata: {
          title: studyGuide.title,
          subject: studyGuide.subject,
          language: studyGuide.language
        },
        questions: studyGuide.questions?.slice(0, 2), // Sample
        explanations: studyGuide.explanations?.slice(0, 2), // Sample
        summary: studyGuide.summary
      }

      // Transform to StudentDesk format
      const cornellFormat = {
        metadata: {
          title: studyGuide.title || job.lecture_title,
          subject: studyGuide.subject || job.course_subject,
          language: studyGuide.language || 'en',
          estimatedStudyTime: '45 minutes',
          difficulty: 'intermediate'
        },
        tableOfContents: {
          title: 'Table of Contents',
          items: studyGuide.table_of_contents ?
            studyGuide.table_of_contents.split('\n').map((item: string) => ({
              title: item.split(':')[0]?.trim(),
              description: item.split(':')[1]?.trim() || ''
            })) : []
        },
        questions: studyGuide.questions || [],
        explanations: studyGuide.explanations || [],
        summary: studyGuide.summary || {}
      }

      transformedData = await loadAndTransformLectureData(cornellFormat, false)

    } else if (job.json_file_path) {
      console.log('🔍 Loading from JSON file:', job.json_file_path)

      const { data: jsonFile, error: downloadError } = await supabase.storage
        .from('generated-notes')
        .download(job.json_file_path)

      if (!downloadError && jsonFile) {
        const jsonText = await jsonFile.text()
        originalData = JSON.parse(jsonText)
        transformedData = await loadAndTransformLectureData(originalData, false)
      }
    }

    return createSuccessResponse({
      job: {
        id: job.job_id,
        title: job.lecture_title,
        status: job.status,
        hasJsonFile: !!job.json_file_path,
        hasPdfFile: !!job.pdf_file_path,
        hasStudyGuide: !!studyGuide
      },
      transformation: {
        original: {
          format: 'Cornell Notes',
          structure: originalData ? Object.keys(originalData) : null,
          sample: originalData
        },
        transformed: {
          format: 'StudentDesk',
          structure: transformedData ? Object.keys(transformedData) : null,
          sample: {
            metadata: transformedData?.metadata,
            overview: transformedData?.overview,
            questionCount: transformedData?.questions?.length || 0,
            explanationCount: transformedData?.explanations?.length || 0,
            hasSummary: !!transformedData?.summary,
            hasEngagement: !!transformedData?.engagement
          }
        }
      },
      fullTransformedData: transformedData
    })

  } catch (error) {
    console.error('❌ Test transformation error:', error)
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500)
  }
}