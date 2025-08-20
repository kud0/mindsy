import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'

// GET /api/exam/stats - Get user's exam statistics
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()

    // Get exam attempts
    const { data: examAttempts, error: attemptsError } = await supabase
      .from('exam_attempts')
      .select(`
        id,
        score,
        percentage,
        time_spent,
        question_count,
        completed_at,
        exam_config,
        study_nodes (
          name
        )
      `)
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('completed_at', { ascending: false })

    if (attemptsError) {
      console.error('Error fetching exam attempts:', attemptsError)
      return createErrorResponse('Failed to fetch exam statistics', 500)
    }

    const attempts = examAttempts || []

    // Calculate statistics
    const totalExams = attempts.length
    const averageScore = totalExams > 0 
      ? Math.round(attempts.reduce((sum, attempt) => sum + attempt.percentage, 0) / totalExams)
      : 0

    // Calculate streaks
    let currentStreak = 0
    let longestStreak = 0
    let tempStreak = 0

    // Sort by date for streak calculation
    const sortedAttempts = [...attempts].sort((a, b) => 
      new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
    )

    // Current streak (from most recent)
    for (let i = 0; i < sortedAttempts.length; i++) {
      if (sortedAttempts[i].percentage >= 70) { // 70% threshold for success
        currentStreak++
      } else {
        break
      }
    }

    // Longest streak
    for (const attempt of sortedAttempts) {
      if (attempt.percentage >= 70) {
        tempStreak++
        longestStreak = Math.max(longestStreak, tempStreak)
      } else {
        tempStreak = 0
      }
    }

    // Recent exams (last 10)
    const recentExams = attempts.slice(0, 10).map(attempt => ({
      id: attempt.id,
      folderName: (attempt.study_nodes as { name?: string })?.name || 'General',
      score: attempt.score,
      percentage: attempt.percentage,
      completedAt: attempt.completed_at,
      timeSpent: attempt.time_spent,
      questionCount: attempt.question_count
    }))

    const stats = {
      totalExams,
      averageScore,
      currentStreak,
      longestStreak,
      recentExams
    }

    return createSuccessResponse(stats)
  } catch (error) {
    console.error('Exam stats API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}