import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { getMockLectureData, validateLectureData } from '@/lib/lecture-data-mapper'
import { LectureData, StudyStats, StudyMaterial } from '@/types/lecture-data'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

// GET /api/lectures/[jobId] - Simplified endpoint serving new JSON structure
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params
  
  console.log('🚀 Simplified Lectures API:', { jobId })
  
  // Authentication
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    // For now, load from sample JSON - in future this will load from database
    const lectureData: LectureData = await getMockLectureData()
    
    // Validate the data structure
    if (!validateLectureData(lectureData)) {
      throw new Error('Invalid lecture data structure')
    }

    // Get actual study stats from database if they exist
    const supabase = await createClient()
    const actualStats = await fetchStudyStats(supabase, jobId, user.id)
    const actualMaterials = await fetchMaterials(supabase, jobId, user.id)

    // Return structured response
    const response = {
      lecture: {
        id: jobId,
        data: lectureData
      },
      stats: actualStats,
      materials: actualMaterials
    }

    console.log('✅ Simplified API: Response ready with keys:', Object.keys(response))
    return createSuccessResponse(response)

  } catch (error) {
    console.error('❌ Simplified Lectures API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Helper: Fetch study statistics
async function fetchStudyStats(supabase: any, jobId: string, userId: string): Promise<StudyStats> {
  console.log('📊 Fetching study stats for:', jobId)

  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('start_time, end_time, completed')
    .eq('lecture_id', jobId)
    .eq('user_id', userId)

  if (error) {
    console.log('❌ Study stats error:', error)
    return { estimatedMinutes: 50, completedSessions: 0 }
  }

  const totalMinutes = (sessions || []).reduce((total: number, session: any) => {
    if (session.end_time && session.start_time) {
      const duration = new Date(session.end_time).getTime() - new Date(session.start_time).getTime()
      return total + Math.floor(duration / 60000) // Convert to minutes
    }
    return total
  }, 0)

  return {
    estimatedMinutes: totalMinutes || 50,
    completedSessions: sessions?.length || 0,
    lastAccessed: sessions?.length > 0 ? sessions[sessions.length - 1].start_time : undefined
  }
}

// Helper: Fetch materials
async function fetchMaterials(supabase: any, jobId: string, userId: string): Promise<StudyMaterial[]> {
  console.log('📁 Fetching materials for:', jobId)
  
  // Try to get materials from database
  const { data: job, error } = await supabase
    .from('jobs')
    .select('json_file_path, txt_file_path, md_file_path, pdf_file_path')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) {
    console.log('❌ No materials found in database')
    return []
  }

  const materials: StudyMaterial[] = []
  
  // Add available files as materials
  if (job.pdf_file_path) {
    materials.push({
      id: 'pdf-main',
      name: 'Lecture Notes.pdf',
      type: 'pdf',
      url: `/api/files/view?path=${encodeURIComponent(job.pdf_file_path)}`,
      size: 'Unknown'
    })
  }

  if (job.json_file_path) {
    materials.push({
      id: 'json-data',
      name: 'Lecture Data.json',
      type: 'json',
      url: `/api/files/download?path=${encodeURIComponent(job.json_file_path)}&filename=lecture-data.json`,
      size: 'Unknown'
    })
  }

  if (job.txt_file_path) {
    materials.push({
      id: 'txt-notes',
      name: 'Lecture Notes.txt',
      type: 'txt',
      url: `/api/files/download?path=${encodeURIComponent(job.txt_file_path)}&filename=lecture-notes.txt`,
      size: 'Unknown'
    })
  }

  if (job.md_file_path) {
    materials.push({
      id: 'md-notes',
      name: 'Lecture Notes.md',
      type: 'md',
      url: `/api/files/download?path=${encodeURIComponent(job.md_file_path)}&filename=lecture-notes.md`,
      size: 'Unknown'
    })
  }

  console.log('✅ Found materials:', materials.length)
  return materials
}