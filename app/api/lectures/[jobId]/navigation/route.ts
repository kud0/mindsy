import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

// GET /api/lectures/[jobId]/navigation - Get previous and next lectures for navigation
export async function GET(request: NextRequest, { params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  console.log('🧭 Navigation API: Getting prev/next lectures for:', jobId)
  
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()

    // First get the current lecture to find its creation date
    const { data: currentJob, error: currentError } = await supabase
      .from('jobs')
      .select('job_id, lecture_title, created_at')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (currentError || !currentJob) {
      console.log('❌ Navigation API: Current lecture not found:', { currentError, jobId })
      return createErrorResponse('Current lecture not found', 404)
    }

    console.log('✅ Navigation API: Current lecture found:', { 
      jobId: currentJob.job_id, 
      title: currentJob.lecture_title,
      createdAt: currentJob.created_at 
    })

    // Get all lectures for this user, ordered by creation date
    const { data: allLectures, error: lecturesError } = await supabase
      .from('jobs')
      .select('job_id, lecture_title, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (lecturesError) {
      console.log('❌ Navigation API: Error fetching all lectures:', lecturesError)
      return createErrorResponse('Failed to fetch lectures', 500)
    }

    console.log('📚 Navigation API: Found', allLectures?.length || 0, 'total lectures')

    // Find the current lecture index
    const currentIndex = allLectures?.findIndex(lecture => lecture.job_id === jobId) ?? -1
    
    if (currentIndex === -1) {
      return createErrorResponse('Current lecture not found in user lectures', 404)
    }

    // Get previous and next lectures
    const previousLecture = currentIndex > 0 ? allLectures[currentIndex - 1] : null
    const nextLecture = currentIndex < (allLectures?.length || 0) - 1 ? allLectures[currentIndex + 1] : null

    console.log('🧭 Navigation API: Navigation context:', {
      currentIndex,
      totalLectures: allLectures?.length || 0,
      hasPrevious: !!previousLecture,
      hasNext: !!nextLecture,
      previousTitle: previousLecture?.lecture_title,
      nextTitle: nextLecture?.lecture_title
    })

    const response = {
      current: {
        jobId: currentJob.job_id,
        title: currentJob.lecture_title,
        index: currentIndex + 1, // 1-based for display
        total: allLectures?.length || 0
      },
      previous: previousLecture ? {
        jobId: previousLecture.job_id,
        title: previousLecture.lecture_title,
        status: previousLecture.status,
        createdAt: previousLecture.created_at
      } : null,
      next: nextLecture ? {
        jobId: nextLecture.job_id,
        title: nextLecture.lecture_title,
        status: nextLecture.status,
        createdAt: nextLecture.created_at
      } : null
    }

    return createSuccessResponse(response)

  } catch (error) {
    console.error('❌ Navigation API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}