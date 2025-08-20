import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

interface ExamGenerationRequest {
  studyNodeId?: string
  noteIds?: string[]
  questionCount: number
  questionTypes: string[]
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  includeMultipleChoice: boolean
  includeTrueFalse: boolean
  includeShortAnswer: boolean
  examTitle?: string
}

// POST /api/exam/generate - Generate a new exam
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const {
      studyNodeId,
      noteIds,
      questionCount = 10,
      questionTypes = ['multiple_choice'],
      difficulty = 'mixed',
      includeMultipleChoice = true,
      includeTrueFalse = false,
      includeShortAnswer = false,
      examTitle
    }: ExamGenerationRequest = body

    // Validate request
    if (!studyNodeId && (!noteIds || noteIds.length === 0)) {
      return createErrorResponse('Either studyNodeId or noteIds must be provided')
    }

    if (questionCount < 1 || questionCount > 50) {
      return createErrorResponse('Question count must be between 1 and 50')
    }

    const supabase = await createClient()

    // Get notes to use for exam generation
    let notesToUse: Array<{
      job_id: string
      lecture_title: string
      course_subject?: string
      notes: Array<{
        id: string
        content: string
        summary?: string
        key_points?: string[]
      }>
    }> = []

    if (noteIds && noteIds.length > 0) {
      // Use specific notes
      const { data: notes, error } = await supabase
        .from('jobs')
        .select(`
          job_id,
          lecture_title,
          course_subject,
          notes!inner (
            id,
            content,
            summary,
            key_points
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .in('job_id', noteIds)

      if (error) {
        console.error('Error fetching notes:', error)
        return createErrorResponse('Failed to fetch notes for exam generation', 500)
      }

      notesToUse = notes || []
    } else if (studyNodeId) {
      // Get all notes from study node
      const { data: notes, error } = await supabase
        .from('jobs')
        .select(`
          job_id,
          lecture_title,
          course_subject,
          notes!inner (
            id,
            content,
            summary,
            key_points
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'completed')
        .eq('study_node_id', studyNodeId)

      if (error) {
        console.error('Error fetching study node notes:', error)
        return createErrorResponse('Failed to fetch notes from study folder', 500)
      }

      notesToUse = notes || []
    }

    if (notesToUse.length === 0) {
      return createErrorResponse('No completed notes found for exam generation')
    }

    // Create exam configuration
    const examId = `exam_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    const examConfig = {
      examId,
      title: examTitle || `Exam - ${new Date().toLocaleDateString()}`,
      questionCount,
      questionTypes,
      difficulty,
      includeMultipleChoice,
      includeTrueFalse,
      includeShortAnswer,
      sourceNotes: notesToUse.map(note => ({
        jobId: note.job_id,
        title: note.lecture_title,
        subject: note.course_subject
      })),
      createdAt: new Date().toISOString()
    }

    // TODO: Here you would normally call OpenAI to generate the actual exam questions
    // For now, we'll create a placeholder exam structure
    const mockQuestions = Array.from({ length: questionCount }, (_, index) => ({
      id: `q_${index + 1}`,
      type: 'multiple_choice',
      question: `Sample question ${index + 1} based on your notes`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0,
      explanation: 'This is a sample explanation',
      source: notesToUse[index % notesToUse.length]?.lecture_title || 'Unknown'
    }))

    // Store exam in database
    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        id: examId,
        user_id: user.id,
        title: examConfig.title,
        study_node_id: studyNodeId || null,
        questions: mockQuestions,
        config: examConfig,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (examError) {
      console.error('Error creating exam:', examError)
      return createErrorResponse('Failed to create exam', 500)
    }

    return createSuccessResponse({
      examId,
      title: examConfig.title,
      questionCount: mockQuestions.length,
      questions: mockQuestions,
      message: 'Exam generated successfully'
    }, 201)

  } catch (error) {
    console.error('Exam generation API error:', error)
    return createErrorResponse('Invalid request body or internal server error', 400)
  }
}