import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { parseContentIntelligently } from '@/lib/content-parser'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

interface QueryParams {
  view?: 'structured' | 'raw' | 'summary'
  include?: string // Comma-separated: 'navigation,stats,materials'
}

// GET /api/lectures/[jobId] - Unified lecture endpoint with query parameters
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params
  const { searchParams } = new URL(request.url)
  
  // Parse query parameters
  const view = (searchParams.get('view') || 'structured') as QueryParams['view']
  const includeParam = searchParams.get('include') || ''
  const include = includeParam.split(',').map(item => item.trim()).filter(Boolean)
  
  console.log('🚀 Unified Lectures API:', { jobId, view, include })
  console.log('📋 Request headers:', Object.fromEntries(request.headers.entries()))
  
  // Authentication
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()
    const response: Record<string, unknown> = {}

    // CORE LECTURE DATA (always included)
    const lectureData = await fetchLectureData(supabase, jobId, user.id, view)
    if (!lectureData) {
      return createErrorResponse('Lecture not found', 404)
    }
    response.lecture = lectureData

    // CONDITIONAL INCLUDES
    const promises = []

    if (include.includes('navigation')) {
      promises.push(
        fetchNavigationData(supabase, jobId, user.id)
          .then(nav => { response.navigation = nav })
      )
    }

    if (include.includes('stats')) {
      promises.push(
        fetchStudyStats(supabase, jobId, user.id)
          .then(stats => { response.stats = stats })
      )
    }

    if (include.includes('materials')) {
      promises.push(
        fetchMaterials(supabase, jobId, user.id)
          .then(materials => { response.materials = materials })
      )
    }

    // Wait for all optional data
    await Promise.all(promises)

    console.log('✅ Unified API: Response assembled with keys:', Object.keys(response))
    return createSuccessResponse(response)

  } catch (error) {
    console.error('❌ Unified Lectures API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Helper: Fetch core lecture data
async function fetchLectureData(supabase: unknown, jobId: string, userId: string, view: string) {
  console.log('📚 Fetching lecture data for:', { jobId, view })

  // Get job data
  const { data: job, error: jobError } = await supabase
    .from('jobs')
    .select('*')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .single()

  if (jobError || !job) {
    console.log('❌ Job not found:', { jobError, jobId, userId })
    return null
  }

  // Get notes data with intelligent parsing
  let notesData = []
  
  // Try new schema first, fallback to old
  const { data: newNotes, error: newError } = await supabase
    .from('notes')
    .select('id, content, summary, key_points, created_at, updated_at')
    .eq('job_id', jobId)

  if (newError) {
    // Fallback to old schema
    const { data: oldNotes, error: oldError } = await supabase
      .from('notes')
      .select('*')
      .eq('job_id', jobId)
      .limit(1)

    if (!oldError && oldNotes?.length > 0) {
      notesData = transformOldNotes(oldNotes)
    }
  } else {
    notesData = newNotes || []
  }

  // Structure based on view parameter
  if (view === 'structured') {
    return {
      id: job.job_id,
      title: job.lecture_title,
      content: await structureContentForStudyDesk(notesData, job),
      metadata: {
        courseSubject: job.course_subject,
        status: job.status,
        createdAt: job.created_at,
        updatedAt: job.updated_at
      }
    }
  }

  // Raw view - minimal processing
  return {
    id: job.job_id,
    title: job.lecture_title,
    rawContent: notesData,
    metadata: {
      courseSubject: job.course_subject,
      status: job.status,
      createdAt: job.created_at
    }
  }
}

// Helper: Structure content for StudentDesk component
async function structureContentForStudyDesk(notesData: Record<string, unknown>[], _job: Record<string, unknown>) {
  if (!notesData || notesData.length === 0) {
    return {
      toc: [],
      overviewHtml: '<p>No content available</p>',
      keyPoints: [],
      questions: [],
      explanationsHtml: '<p>Content not available</p>',
      summaryHtml: '<p>Summary not available</p>'
    }
  }

  const note = notesData[0]
  const parsed = parseContentIntelligently(note.content || '')

  return {
    toc: generateTableOfContents(note.content || ''),
    overviewHtml: `<div>${parsed.overview || note.summary || 'Overview not available'}</div>`,
    keyPoints: (note.key_points || parsed.keyPoints || []).map((point: string, index: number) => ({
      title: `Key Point ${index + 1}`,
      bodyHtml: `<p>${point}</p>`
    })),
    questions: (parsed.questions || []).map((q: string, index: number) => ({
      id: `q${index + 1}`,
      promptHtml: `<p>${q}</p>`,
      answerHtml: `<p>Answer for question ${index + 1}</p>`
    })),
    explanationsHtml: `<div>${parsed.explanations || parsed.cleanContent || 'Explanations not available'}</div>`,
    summaryHtml: `<div>${note.summary || parsed.summary || 'Summary not available'}</div>`
  }
}

// Helper: Generate table of contents from content
function generateTableOfContents(content: string) {
  const headings = content.match(/^#{1,3}\s+(.+)$/gm) || []
  return headings.map((heading, index) => ({
    label: heading.replace(/^#{1,3}\s+/, ''),
    ts: index * 120 // 2-minute intervals for demo
  }))
}

// Helper: Transform old notes structure
function transformOldNotes(oldNotes: Record<string, unknown>[]) {
  return oldNotes.map(note => {
    const rawContent = note.notes_column || note.transcript_text || note.content || ''
    const rawSummary = note.summary_section || note.summary || ''
    // const rawCues = note.cue_column || '' // Unused variable
    
    const parsed = parseContentIntelligently(rawContent)
    
    return {
      id: note.id || Math.random().toString(),
      content: parsed.cleanContent || rawContent || 'No content available',
      summary: rawSummary || parsed.summary || 'No summary available',
      key_points: parsed.keyPoints || [],
      created_at: note.created_at || new Date().toISOString(),
      updated_at: note.updated_at || note.created_at || new Date().toISOString()
    }
  })
}

// Helper: Fetch navigation data
async function fetchNavigationData(supabase: unknown, jobId: string, userId: string) {
  console.log('🧭 Fetching navigation data for:', jobId)

  // Get current job
  const { data: currentJob, error: currentError } = await supabase
    .from('jobs')
    .select('job_id, lecture_title, created_at')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .single()

  if (currentError || !currentJob) {
    return null
  }

  // Get all lectures ordered by date
  const { data: allLectures, error: lecturesError } = await supabase
    .from('jobs')
    .select('job_id, lecture_title, created_at, status')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })

  if (lecturesError || !allLectures) {
    return null
  }

  // Find current position
  const currentIndex = allLectures.findIndex(lecture => lecture.job_id === jobId)
  if (currentIndex === -1) return null

  const previousLecture = currentIndex > 0 ? allLectures[currentIndex - 1] : null
  const nextLecture = currentIndex < allLectures.length - 1 ? allLectures[currentIndex + 1] : null

  return {
    current: {
      id: currentJob.job_id,
      title: currentJob.lecture_title,
      index: currentIndex + 1,
      total: allLectures.length
    },
    previous: previousLecture ? {
      id: previousLecture.job_id,
      title: previousLecture.lecture_title,
      status: previousLecture.status,
      createdAt: previousLecture.created_at
    } : null,
    next: nextLecture ? {
      id: nextLecture.job_id,
      title: nextLecture.lecture_title,
      status: nextLecture.status,
      createdAt: nextLecture.created_at
    } : null
  }
}

// Helper: Fetch study statistics
async function fetchStudyStats(supabase: unknown, jobId: string, userId: string) {
  console.log('📊 Fetching study stats for:', jobId)

  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('start_time, end_time, completed')
    .eq('lecture_id', jobId)
    .eq('user_id', userId)

  if (error) {
    console.log('❌ Study stats error:', error)
    return { minutes: 0, sessions: 0, lastAccessed: null }
  }

  const totalMinutes = (sessions || []).reduce((total: number, session: Record<string, unknown>) => {
    if (session.end_time && session.start_time) {
      const duration = new Date(session.end_time).getTime() - new Date(session.start_time).getTime()
      return total + Math.floor(duration / 60000) // Convert to minutes
    }
    return total
  }, 0)

  return {
    minutes: totalMinutes,
    sessions: sessions?.length || 0,
    lastAccessed: sessions?.length > 0 ? sessions[sessions.length - 1].start_time : null
  }
}

// Helper: Fetch materials (placeholder)
async function fetchMaterials(_supabase: unknown, _jobId: string, _userId: string) {
  console.log('📁 Fetching materials for:', _jobId)
  
  // TODO: Implement materials fetching from storage
  // For now, return empty array
  return []
}