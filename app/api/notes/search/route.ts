import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

export async function GET(request: NextRequest) {
  // Check authentication
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult
  const searchParams = request.nextUrl.searchParams
  const query = searchParams.get('q')

  if (!query || query.trim().length === 0) {
    return createSuccessResponse({ results: [] })
  }

  try {
    const supabase = await createClient()

    // Search in jobs table with notes and study nodes
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        job_id,
        lecture_title,
        course_subject,
        created_at,
        status,
        study_node_id,
        study_nodes!inner (
          id,
          name,
          type
        )
      `)
      .eq('user_id', user.id)
      .in('status', ['completed', 'processing'])
      .or(`lecture_title.ilike.%${query}%,course_subject.ilike.%${query}%`)
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      console.error('Search error:', error)
      return createErrorResponse('Failed to search notes', 500)
    }

    // Also search in study nodes
    const { data: studyNodes, error: nodesError } = await supabase
      .from('study_nodes')
      .select('id, name, type, parent_id')
      .eq('user_id', user.id)
      .ilike('name', `%${query}%`)
      .limit(10)

    if (nodesError) {
      console.error('Study nodes search error:', nodesError)
    }

    const results = {
      notes: jobs || [],
      folders: studyNodes || [],
      total: (jobs?.length || 0) + (studyNodes?.length || 0)
    }

    return createSuccessResponse({ results })
  } catch (error) {
    console.error('Search API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}