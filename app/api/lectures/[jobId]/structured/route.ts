import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { parseContentIntelligently } from '@/lib/content-parser'

interface StructuredLectureResponse {
  // Lecture metadata
  lecture: {
    id: string
    title: string
    subject?: string
    status: 'completed' | 'processing' | 'failed'
    createdAt: string
    updatedAt: string
    processingTime?: string
  }
  
  // Perfect structure for UI tabs
  studyMaterial: {
    // Tab 1: Questions & Cues
    questions: {
      id: string
      question: string
      type: 'concept' | 'review' | 'definition' | 'application'
      difficulty: 'basic' | 'intermediate' | 'advanced'
    }[]
    
    // Tab 2: Detailed Notes
    content: {
      sections: {
        title: string
        content: string
        keyTerms?: { term: string; definition: string }[]
      }[]
      rawContent: string
    }
    
    // Tab 3: Summary
    summary: {
      overview: string
      keyTakeaways: string[]
      learningObjectives: string[]
    }
    
    // Tab 4: Study Materials
    files: {
      cornellPdf?: {
        name: string
        path: string
        description: string
      }
      originalPdf?: {
        name: string
        path: string  
        description: string
      }
      transcript?: {
        name: string
        path: string
        description: string
      }
      markdown?: {
        name: string
        path: string
        description: string
      }
      additionalFiles: {
        name: string
        path: string
        type: 'pdf' | 'image' | 'audio' | 'text'
        description: string
      }[]
    }
  }
}

// GET /api/lectures/[jobId]/structured - Return perfectly structured data for new UI
export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  console.log('🎯 Structured API: Fetching lecture for UI:', jobId)
  
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()

    // Get lecture and raw content
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      console.log('❌ Structured API: Job not found:', { jobError, jobId })
      return createErrorResponse('Lecture not found', 404)
    }

    console.log('✅ Structured API: Job found:', { jobId, title: job.lecture_title })

    // Get notes content
    const { data: notesData, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('job_id', jobId)

    if (notesError) {
      console.log('❌ Structured API: Notes error:', notesError)
      return createErrorResponse('Failed to fetch content', 500)
    }

    console.log('✅ Structured API: Notes found:', notesData?.length || 0)

    // Process content intelligently
    let processedContent = {
      questions: [],
      keyPoints: [],
      summary: 'No content available',
      cleanContent: 'No content available'
    }

    if (notesData && notesData.length > 0) {
      const rawContent = notesData[0].notes_column || notesData[0].transcript_text || notesData[0].content || ''
      const rawSummary = notesData[0].summary_section || ''
      const rawCues = notesData[0].cue_column || ''
      
      console.log('🧠 Structured API: Parsing content intelligently...')
      processedContent = parseContentIntelligently(rawContent)
      
      // Enhance with existing summary if available
      if (rawSummary && rawSummary.trim()) {
        processedContent.summary = rawSummary
      }
      
      // Add cues to questions if available
      if (rawCues && rawCues.trim()) {
        const cueQuestions = rawCues
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => line.replace(/^[-•*]\s*/, '').trim())
          .filter((line: string) => line.length > 5)
        
        processedContent.questions = [...processedContent.questions, ...cueQuestions]
      }
    }

    // Build structured response for UI
    const response: StructuredLectureResponse = {
      lecture: {
        id: job.job_id,
        title: job.lecture_title,
        subject: job.course_subject,
        status: job.status,
        createdAt: job.created_at,
        updatedAt: job.updated_at,
        processingTime: job.processing_completed_at && job.processing_started_at 
          ? `${Math.round((new Date(job.processing_completed_at).getTime() - new Date(job.processing_started_at).getTime()) / 1000)}s`
          : undefined
      },
      
      studyMaterial: {
        // Tab 1: Questions & Cues - Perfect for study
        questions: (processedContent.questions.length > 0 ? processedContent.questions : processedContent.keyPoints)
          .map((item, index) => ({
            id: `q-${index}`,
            question: typeof item === 'string' ? item : item,
            type: item.toLowerCase().includes('what') ? 'definition' as const : 
                  item.toLowerCase().includes('how') ? 'application' as const :
                  item.toLowerCase().includes('why') ? 'concept' as const : 'review' as const,
            difficulty: item.length > 100 ? 'advanced' as const : 
                       item.length > 50 ? 'intermediate' as const : 'basic' as const
          })),
        
        // Tab 2: Detailed Notes - Clean content
        content: {
          sections: [{
            title: job.lecture_title,
            content: processedContent.cleanContent
          }],
          rawContent: processedContent.cleanContent
        },
        
        // Tab 3: Summary - Key takeaways  
        summary: {
          overview: processedContent.summary,
          keyTakeaways: processedContent.keyPoints.slice(0, 5),
          learningObjectives: processedContent.questions.slice(0, 3)
        },
        
        // Tab 4: Study Materials - All files
        files: {
          cornellPdf: job.output_pdf_path ? {
            name: 'Cornell Notes PDF',
            path: job.output_pdf_path,
            description: 'AI-generated Cornell-style study notes'
          } : undefined,
          
          originalPdf: job.pdf_file_path ? {
            name: 'Original Document',
            path: job.pdf_file_path,
            description: 'Your original uploaded document'
          } : undefined,
          
          transcript: job.txt_file_path ? {
            name: 'Transcript',
            path: job.txt_file_path,
            description: 'Text transcript of the lecture'
          } : undefined,
          
          markdown: job.md_file_path ? {
            name: 'Markdown Notes',
            path: job.md_file_path,
            description: 'Structured notes in Markdown format'
          } : undefined,
          
          additionalFiles: [] // Future: attachments, slides, images
        }
      }
    }

    console.log('✅ Structured API: Response prepared:', {
      questions: response.studyMaterial.questions.length,
      sections: response.studyMaterial.content.sections.length,
      files: Object.keys(response.studyMaterial.files).filter(key => 
        key !== 'additionalFiles' && response.studyMaterial.files[key as keyof typeof response.studyMaterial.files]
      ).length
    })

    return createSuccessResponse(response)

  } catch (error) {
    console.error('❌ Structured API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}