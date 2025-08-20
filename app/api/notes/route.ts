import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

// GET /api/notes - List all notes for the authenticated user
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams
  const studyNodeId = searchParams.get('study_node_id')
  const status = searchParams.get('status') || 'all'
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const supabase = await createClient()

    let query = supabase
      .from('jobs')
      .select(`
        job_id,
        lecture_title,
        course_subject,
        created_at,
        updated_at,
        status,
        study_node_id,
        original_file_path,
        processing_metadata
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Filter by study node if specified
    if (studyNodeId) {
      query = query.eq('study_node_id', studyNodeId)
    }

    // Filter by status if specified
    if (status !== 'all') {
      if (status === 'completed') {
        query = query.eq('status', 'completed')
      } else if (status === 'processing') {
        query = query.in('status', ['processing', 'uploading'])
      } else if (status === 'failed') {
        query = query.eq('status', 'failed')
      }
    } else {
      // Default: exclude deleted items
      query = query.in('status', ['processing', 'completed', 'failed', 'uploading'])
    }

    const { data: notes, error, count } = await query

    if (error) {
      console.error('Notes fetch error:', error)
      return createErrorResponse('Failed to fetch notes', 500)
    }

    return createSuccessResponse({
      notes: notes || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit
      }
    })
  } catch (error) {
    console.error('Notes API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// POST /api/notes - Create a new note (job)
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const {
      lecture_title,
      course_subject,
      study_node_id,
      audio_file_path,
      pdf_file_path,
      processing_mode = 'enhance'
    } = body

    if (!lecture_title || !audio_file_path) {
      return createErrorResponse('Missing required fields: lecture_title, audio_file_path')
    }

    const supabase = await createClient()

    // Create new job record
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`
    
    const { data: job, error } = await supabase
      .from('jobs')
      .insert({
        job_id: jobId,
        user_id: user.id,
        lecture_title: lecture_title.trim(),
        course_subject: course_subject?.trim() || null,
        study_node_id: study_node_id || null,
        status: 'processing',
        processing_metadata: {
          audio_file_path,
          pdf_file_path,
          processing_mode,
          created_via_api: true
        },
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Job creation error:', error)
      return createErrorResponse('Failed to create note job', 500)
    }

    return createSuccessResponse({
      job_id: jobId,
      message: 'Note job created successfully',
      note: job
    }, 201)
  } catch (error) {
    console.error('Create note API error:', error)
    return createErrorResponse('Invalid request body or internal server error', 400)
  }
}