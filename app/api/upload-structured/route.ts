import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { AIStructuredProcessor, type StructuredLectureContent } from '@/lib/structured-content-processor'

// POST /api/upload-structured - New structured upload system
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const formData = await request.formData()
    
    const uploadType = formData.get('uploadType') as string || 'file'
    const lectureTitle = formData.get('lectureTitle') as string
    const courseSubject = formData.get('courseSubject') as string | null
    const processingMode = formData.get('processingMode') as string || 'structured' // 'structured', 'ai-enhanced', 'manual'
    
    // File inputs
    const audioFile = formData.get('audio') as File | null
    const pdfFile = formData.get('pdf') as File | null
    const linkUrl = formData.get('linkUrl') as string | null
    
    // New structured inputs (optional)
    const manualSummary = formData.get('summary') as string | null
    const manualKeyPoints = formData.get('keyPoints') as string | null
    const manualQuestions = formData.get('questions') as string | null

    if (!lectureTitle) {
      return createErrorResponse('Missing required field: lecture title')
    }

    console.log('🚀 Structured upload started:', { uploadType, processingMode, title: lectureTitle })

    const supabase = await createClient()
    const lectureId = crypto.randomUUID()

    // Step 1: Create lecture record
    const { data: lecture, error: lectureError } = await supabase
      .from('lectures')
      .insert({
        id: lectureId,
        user_id: user.id,
        title: lectureTitle,
        subject: courseSubject || null,
        processing_status: 'processing',
        overview_summary: manualSummary || 'Processing...',
        overview_objectives: []
      })
      .select()
      .single()

    if (lectureError) {
      console.error('❌ Lecture creation error:', lectureError)
      return createErrorResponse('Failed to create lecture record', 500)
    }

    console.log('✅ Lecture created:', lectureId)

    // Step 2: Process content based on upload type and mode
    let structuredContent: StructuredLectureContent
    let filePaths: { [key: string]: string } = {}

    if (uploadType === 'file' && (audioFile || pdfFile)) {
      // Handle file upload
      if (audioFile) {
        // TODO: Upload audio file and transcribe
        console.log('📼 Processing audio file...')
        // For now, create basic structure
        structuredContent = await AIStructuredProcessor.processContent(
          'Audio transcription will be processed here',
          { title: lectureTitle, type: 'audio' }
        )
      } else if (pdfFile) {
        // TODO: Upload PDF file and extract text
        console.log('📄 Processing PDF file...')
        // For now, create basic structure
        structuredContent = await AIStructuredProcessor.processContent(
          'PDF content will be extracted here',
          { title: lectureTitle, type: 'pdf' }
        )
      } else {
        return createErrorResponse('No valid file provided')
      }
    } else if (uploadType === 'link' && linkUrl) {
      // Handle link processing
      console.log('🔗 Processing link:', linkUrl)
      // TODO: Fetch and process content from URL
      structuredContent = await AIStructuredProcessor.processContent(
        'Link content will be fetched and processed here',
        { title: lectureTitle, type: 'link' }
      )
    } else if (processingMode === 'manual' && manualSummary) {
      // Handle manual structured input
      console.log('✏️ Processing manual input...')
      
      const keyPointsList = manualKeyPoints ? manualKeyPoints.split('\n').filter(p => p.trim()) : []
      const questionsList = manualQuestions ? manualQuestions.split('\n').filter(q => q.trim()) : []
      
      structuredContent = {
        title: lectureTitle,
        subject: courseSubject,
        overview: {
          summary: manualSummary,
          objectives: keyPointsList.slice(0, 3) // Use first few key points as objectives
        },
        sections: [{
          id: 'manual-section-1',
          title: 'Main Content',
          content: manualSummary
        }],
        keyPoints: keyPointsList.map((point, index) => ({
          id: `manual-point-${index}`,
          type: 'concept' as const,
          title: point.substring(0, 50),
          content: point,
          difficulty: 'intermediate' as const
        })),
        questions: questionsList.map((question, index) => ({
          id: `manual-question-${index}`,
          question,
          type: 'review' as const,
          difficulty: 'intermediate' as const
        })),
        resources: {
          originalFiles: [],
          generatedFiles: []
        }
      }
    } else {
      return createErrorResponse('Invalid upload configuration')
    }

    // Step 3: Save structured content to database
    console.log('💾 Saving structured content...')

    // Update lecture with processed overview
    await supabase
      .from('lectures')
      .update({
        overview_summary: structuredContent.overview.summary,
        overview_objectives: structuredContent.overview.objectives,
        processing_status: 'completed'
      })
      .eq('id', lectureId)

    // Save sections
    if (structuredContent.sections.length > 0) {
      const sectionsToInsert = structuredContent.sections.map((section, index) => ({
        id: section.id,
        lecture_id: lectureId,
        title: section.title,
        content: section.content,
        order_index: index,
        subsections: section.subsections || null,
        key_terms: section.keyTerms || null
      }))

      const { error: sectionsError } = await supabase
        .from('lecture_sections')
        .insert(sectionsToInsert)

      if (sectionsError) {
        console.error('❌ Sections save error:', sectionsError)
      } else {
        console.log('✅ Sections saved:', sectionsToInsert.length)
      }
    }

    // Save key points
    if (structuredContent.keyPoints.length > 0) {
      const keyPointsToInsert = structuredContent.keyPoints.map(point => ({
        id: point.id,
        lecture_id: lectureId,
        section_id: point.section || null,
        type: point.type,
        title: point.title,
        content: point.content,
        difficulty: point.difficulty
      }))

      const { error: keyPointsError } = await supabase
        .from('study_points')
        .insert(keyPointsToInsert)

      if (keyPointsError) {
        console.error('❌ Key points save error:', keyPointsError)
      } else {
        console.log('✅ Key points saved:', keyPointsToInsert.length)
      }
    }

    // Save questions
    if (structuredContent.questions.length > 0) {
      const questionsToInsert = structuredContent.questions.map(question => ({
        id: question.id,
        lecture_id: lectureId,
        section_id: question.section || null,
        question: question.question,
        type: question.type,
        difficulty: question.difficulty,
        answer: question.answer || null,
        hints: question.hints || null
      }))

      const { error: questionsError } = await supabase
        .from('study_questions')
        .insert(questionsToInsert)

      if (questionsError) {
        console.error('❌ Questions save error:', questionsError)
      } else {
        console.log('✅ Questions saved:', questionsToInsert.length)
      }
    }

    console.log('🎉 Structured upload completed successfully!')

    return createSuccessResponse({
      message: 'Lecture uploaded and processed successfully',
      lecture_id: lectureId,
      title: lectureTitle,
      url: `/dashboard/lectures/${lectureId}`,
      structure: {
        sections: structuredContent.sections.length,
        keyPoints: structuredContent.keyPoints.length,
        questions: structuredContent.questions.length
      }
    })

  } catch (error) {
    console.error('❌ Structured upload error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}