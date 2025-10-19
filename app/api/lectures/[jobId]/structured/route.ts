import { NextRequest } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

// GET /api/lectures/[jobId]/structured - Return structured lecture content
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params
  
  console.log('📚 Structured Lecture API:', { jobId })
  
  // Authentication
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()

    // Get job data including OpenAI content
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select(`
        *,
        openai_content,
        output_pdf_path,
        json_file_path
      `)
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      console.log('❌ Job not found:', { jobError, jobId, userId: user.id })
      return createErrorResponse('Lecture not found', 404)
    }

    // Get notes data - try multiple possible table structures
    console.log('🔍 Looking for notes with job_id:', jobId)
    console.log('🔍 Job details:', { title: job.lecture_title, status: job.status, created_at: job.created_at })

    // Try the notes table first
    const { data: notes, error: notesError } = await supabase
      .from('notes')
      .select('*')
      .eq('job_id', jobId)
      .limit(1)

    console.log('🔍 Notes query result:', { notes, notesError, hasNotes: notes?.length > 0 })

    let lectureContent = {
      toc: [],
      overviewHtml: '<p>No content available</p>',
      keyPoints: [],
      questions: [],
      explanationsHtml: '<p>Content not available</p>',
      summaryHtml: '<p>Summary not available</p>'
    }

    let openaiData: any = null

    // Check if we have OpenAI JSON content stored in the job
    if (job.openai_content) {
      console.log('📊 Found OpenAI JSON content in job column')
      try {
        openaiData = JSON.parse(job.openai_content)
        console.log('✅ Successfully parsed OpenAI JSON:', Object.keys(openaiData))
      } catch (parseError) {
        console.error('❌ Failed to parse OpenAI JSON content:', parseError)
      }
    }

    // If no content in column, try loading from storage file
    if (!openaiData && job.json_file_path) {
      console.log('📁 Trying to load from storage file:', job.json_file_path)
      try {
        // Use service role client to bypass RLS for storage access
        const serviceClient = createServiceRoleClient()

        const { data: fileData, error: storageError } = await serviceClient.storage
          .from('generated-notes')
          .download(job.json_file_path)

        if (storageError) {
          console.error('❌ Storage download error:', storageError)
        } else if (fileData) {
          const fileText = await fileData.text()
          openaiData = JSON.parse(fileText)
          console.log('✅ Successfully loaded JSON from storage:', Object.keys(openaiData))
        }
      } catch (storageError) {
        console.error('❌ Failed to load from storage:', storageError)
      }
    }

    // Transform the loaded data
    if (openaiData) {
      console.log('🔄 Transforming OpenAI data to lecture content')
      lectureContent = {
        toc: openaiData.tableOfContents?.items?.map((item: any, index: number) => ({
          label: item.title || item.description || `Section ${index + 1}`,
          ts: index * 120
        })) || [],
        overviewHtml: `<div>${openaiData.summary?.overview || 'No overview available'}</div>`,
        keyPoints: openaiData.explanations?.map((exp: any) => ({
          title: exp.title || 'Key Point',
          bodyHtml: `<p>${exp.content || ''}</p>`
        })) || [],
        questions: openaiData.questions?.map((q: any) => ({
          id: q.id || `q${Math.random()}`,
          promptHtml: `<p>${q.question || q.statement || ''}</p>`,
          answerHtml: `<p>${q.answer || q.feedback || ''}</p>`
        })) || [],
        explanationsHtml: `<div>${openaiData.explanations?.map((exp: any) =>
          `<h3>${exp.title}</h3><p>${exp.content}</p>`
        ).join('') || 'Content not available'}</div>`,
        summaryHtml: `<div>${openaiData.summary?.overview || 'Summary not available'}</div>`
      }
    }
    
    // Fallback: try to find content in notes table if no OpenAI data loaded
    if (!openaiData && notes && notes.length > 0) {
      console.log('📝 Falling back to notes table content')
      const note = notes[0]
      console.log('🔍 Found note data:', Object.keys(note))
      
      // Extract content from whatever columns exist
      const content = note.notes_column || note.transcript_text || note.content || ''
      const summary = note.summary_section || note.summary || note.summaryHtml || ''
      const cues = note.cue_column || note.cues || ''
      
      console.log('🔍 Content lengths:', { 
        content: content.length, 
        summary: summary.length, 
        cues: cues.length 
      })

      if (content || summary || cues) {
        // Parse questions from cues or content
        const questions = parseQuestions(cues || content)
        
        // Parse key points 
        const keyPoints = parseKeyPoints(content || cues)
        
        // Generate table of contents from content
        const toc = generateTOC(content)

        lectureContent = {
          toc,
          overviewHtml: content ? `<div>${content.substring(0, 1000)}...</div>` : '<p>No content available</p>',
          keyPoints,
          questions,
          explanationsHtml: content ? `<div>${content}</div>` : '<p>Content not available</p>',
          summaryHtml: summary ? `<div>${summary}</div>` : '<p>Summary not available</p>'
        }
      }
    }

    const response = {
      lecture: {
        id: job.job_id,
        title: job.lecture_title,
        content: lectureContent,
        metadata: {
          courseSubject: job.course_subject,
          status: job.status,
          createdAt: job.created_at,
          updatedAt: job.updated_at
        }
      },
      stats: {
        minutes: 0,
        sessions: 0,
        lastAccessed: null
      },
      materials: []
    }

    console.log('✅ Structured API: Response ready with content keys:', Object.keys(lectureContent))
    return createSuccessResponse(response)

  } catch (error) {
    console.error('❌ Structured Lecture API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Helper functions
function parseQuestions(text: string) {
  if (!text) return []
  
  const questions = []
  const questionMarkers = ['?', 'What', 'How', 'Why', 'When', 'Where', 'Which']
  const sentences = text.split(/[.!?]+/)
  
  for (const sentence of sentences) {
    const trimmed = sentence.trim()
    if (trimmed.length > 10 && questionMarkers.some(marker => 
      trimmed.includes(marker) || trimmed.includes('?')
    )) {
      questions.push({
        id: `q${questions.length + 1}`,
        promptHtml: `<p>${trimmed}?</p>`,
        answerHtml: `<p>Answer for: ${trimmed}</p>`
      })
    }
  }
  
  return questions.slice(0, 10)
}

function parseKeyPoints(text: string) {
  if (!text) return []
  
  const points = []
  const lines = text.split('\n')
  
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.length > 20 && (
      trimmed.startsWith('•') || 
      trimmed.startsWith('-') || 
      trimmed.match(/^\d+\./) ||
      trimmed.includes('important') ||
      trimmed.includes('key')
    )) {
      points.push({
        title: `Key Point ${points.length + 1}`,
        bodyHtml: `<p>${trimmed.replace(/^[-•\d\.]\s*/, '')}</p>`
      })
    }
  }
  
  return points.slice(0, 10)
}

function generateTOC(text: string) {
  if (!text) return []
  
  const headings = text.match(/^#{1,3}\s+(.+)$/gm) || []
  return headings.map((heading, index) => ({
    label: heading.replace(/^#{1,3}\s+/, ''),
    ts: index * 120 // 2-minute intervals
  }))
}

