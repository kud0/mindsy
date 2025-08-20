import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { parseContentIntelligently } from '@/lib/content-parser'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

// GET /api/notes/[jobId] - Get specific note details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params
  console.log('🚀 API: Fetching note for jobId:', jobId)
  
  const authResult = await requireAuth(request)
  if (authResult.error) {
    console.log('❌ API: Auth failed:', authResult.error)
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult
  console.log('✅ API: User authenticated:', user.id)

  try {
    const supabase = await createClient()

    // First try to get the job to see if it exists
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      console.log('❌ API: Job not found:', { jobError, jobId, userId: user.id })
      return createErrorResponse('Lecture not found', 404)
    }

    console.log('✅ API: Job found:', { jobId, jobData: job })

    // Try different queries to understand the notes table structure
    let notesData = []
    let notesError = null

    // Try new schema first
    console.log('🔍 API: Trying new schema...')
    const { data: newNotes, error: newError } = await supabase
      .from('notes')
      .select('id, content, summary, key_points, created_at, updated_at')
      .eq('job_id', jobId)

    if (newError) {
      console.log('❌ API: New schema failed:', newError)
      
      // Try old schema - get all columns to see what exists
      console.log('🔍 API: Trying to get all notes columns...')
      const { data: allNotes, error: allError } = await supabase
        .from('notes')
        .select('*')
        .eq('job_id', jobId)
        .limit(1)

      if (allError) {
        console.log('❌ API: All notes query failed:', allError)
        notesError = allError
      } else {
        console.log('✅ API: Found notes with structure:', allNotes?.[0] ? Object.keys(allNotes[0]) : 'No notes')
        notesData = allNotes || []
        
        // Transform old structure to new structure if needed
        if (notesData.length > 0 && notesData[0]) {
          console.log('🔍 API: Raw old note data keys:', Object.keys(notesData[0]))
          console.log('🔍 API: Raw old note data values:')
          console.log('  - cue_column:', notesData[0].cue_column ? (notesData[0].cue_column.substring(0, 200) + '...') : 'NULL')
          console.log('  - notes_column:', notesData[0].notes_column ? (notesData[0].notes_column.substring(0, 200) + '...') : 'NULL')
          console.log('  - summary_section:', notesData[0].summary_section ? (notesData[0].summary_section.substring(0, 200) + '...') : 'NULL')
          console.log('  - transcript_text:', notesData[0].transcript_text ? (notesData[0].transcript_text.substring(0, 200) + '...') : 'NULL')
          
          notesData = notesData.map(note => {
            // Get the raw content from various possible fields
            const rawContent = note.notes_column || note.transcript_text || note.content || ''
            const rawSummary = note.summary_section || note.summary || ''
            const rawCues = note.cue_column || ''
            
            console.log('🧪 API: Parsing content intelligently...')
            
            // Use intelligent parsing to extract structured information
            const parsed = parseContentIntelligently(rawContent)
            
            // If we have specific summary or cues fields, use them too
            let finalSummary = parsed.summary
            if (rawSummary && rawSummary.trim() && rawSummary !== 'No summary available') {
              finalSummary = rawSummary
            }
            
            let finalKeyPoints = parsed.questions.length > 0 ? parsed.questions : parsed.keyPoints
            if (rawCues && rawCues.trim()) {
              // Parse cues column for additional key points
              const cuePoints = rawCues
                .split('\n')
                .filter((line: string) => line.trim())
                .map((line: string) => line.replace(/^[-•\*]\s*/, '').trim())
                .filter((line: string) => line.length > 5)
              
              if (cuePoints.length > 0) {
                finalKeyPoints = [...new Set([...cuePoints, ...finalKeyPoints])].slice(0, 10)
              }
            }
            
            const transformedNote = {
              id: note.id || Math.random().toString(),
              content: parsed.cleanContent || rawContent || 'No content available',
              summary: finalSummary || 'No summary available', 
              key_points: finalKeyPoints.length > 0 ? finalKeyPoints : ['Key points not available'],
              created_at: note.created_at || new Date().toISOString(),
              updated_at: note.updated_at || note.created_at || new Date().toISOString()
            }
            
            console.log('🔄 API: Transformed note:', {
              originalKeys: Object.keys(note),
              content: transformedNote.content?.substring(0, 100) + '...',
              summary: transformedNote.summary?.substring(0, 100) + '...',
              keyPointsCount: transformedNote.key_points?.length
            })
            
            return transformedNote
          })
        }
      }
    } else {
      console.log('✅ API: New schema worked:', newNotes)
      notesData = newNotes || []
    }

    // Get study nodes
    const { data: studyNode } = await supabase
      .from('study_nodes')
      .select('id, name, type')
      .eq('id', job.study_node_id)
      .single()

    const note = {
      ...job,
      notes: notesData,
      study_nodes: studyNode
    }

    if (notesError && notesData.length === 0) {
      console.log('❌ API: No notes found:', { notesError, jobId, userId: user.id })
      return createErrorResponse('Notes not found', 404)
    }

    console.log('✅ API: Note found successfully:', { jobId, noteCount: note.notes?.length || 0 })
    console.log('✅ API: Final note object structure:', Object.keys(note))
    console.log('✅ API: Notes array:', note.notes?.map((n: Record<string, unknown>) => Object.keys(n)))
    
    const response = createSuccessResponse(note)
    console.log('✅ API: Response being sent:', response)
    return response
  } catch (error) {
    console.error('❌ API: Get note error:', { error, jobId, userId: user?.id })
    return createErrorResponse('Internal server error', 500)
  }
}

// PUT /api/notes/[jobId] - Update note details
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const body = await request.json()
    const { lecture_title, course_subject, study_node_id } = body

    const supabase = await createClient()

    // Verify ownership
    const { data: existingNote, error: fetchError } = await supabase
      .from('jobs')
      .select('job_id')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingNote) {
      return createErrorResponse('Note not found', 404)
    }

    // Update the note
    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (lecture_title !== undefined) updates.lecture_title = lecture_title.trim()
    if (course_subject !== undefined) updates.course_subject = course_subject?.trim() || null
    if (study_node_id !== undefined) updates.study_node_id = study_node_id || null

    const { data: updatedNote, error: updateError } = await supabase
      .from('jobs')
      .update(updates)
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Note update error:', updateError)
      return createErrorResponse('Failed to update note', 500)
    }

    return createSuccessResponse({
      message: 'Note updated successfully',
      note: updatedNote
    })
  } catch (error) {
    console.error('Update note API error:', error)
    return createErrorResponse('Invalid request body or internal server error', 400)
  }
}

// DELETE /api/notes/[jobId] - Delete a note
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()

    // Verify ownership and delete
    const { data: deletedNote, error } = await supabase
      .from('jobs')
      .delete()
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !deletedNote) {
      console.error('Note deletion error:', error)
      return createErrorResponse('Note not found or failed to delete', 404)
    }

    // TODO: Also delete associated files from storage
    // TODO: Delete related notes, attachments, etc.

    return createSuccessResponse({
      message: 'Note deleted successfully',
      job_id: jobId
    })
  } catch (error) {
    console.error('Delete note API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}