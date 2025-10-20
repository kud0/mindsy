import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/lectures/[jobId]/quizzes/complete
 *
 * Tracks quiz completion and updates user's study streak
 *
 * Request Body:
 * - quizId: string - Unique identifier for the quiz
 * - score: number - Points earned by the user
 * - total: number - Total points available
 * - completedAt: string - ISO timestamp of completion
 *
 * Streak Rules:
 * 1. Completion = Finishing all quiz questions (any score)
 * 2. Increment = +1 per day (multiple quizzes same day = still +1)
 * 3. Grace Period = 1 day (can skip 1 day without reset)
 * 4. Reset = After 2 missed days (strict after grace period)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const params = await context.params;
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body = await request.json();
    const { quizId, score, total, completedAt } = body;

    // Validate required fields
    if (!quizId || score === undefined || total === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: quizId, score, total' },
        { status: 400 }
      );
    }

    // 3. Get current profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('study_streak, last_quiz_date, longest_streak')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
    }

    // 4. Calculate new streak
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
    const lastQuizDate = profile.last_quiz_date;
    let newStreak = profile.study_streak || 0;
    let streakIncreased = false;
    let streakReset = false;

    if (!lastQuizDate) {
      // First quiz ever - start streak at 1
      newStreak = 1;
      streakIncreased = true;
      console.log(`[Streak] User ${user.id}: First quiz ever, starting streak at 1`);
    } else {
      const daysSinceLastQuiz = Math.floor(
        (new Date(today).getTime() - new Date(lastQuizDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      console.log(`[Streak] User ${user.id}: Days since last quiz: ${daysSinceLastQuiz}, Current streak: ${profile.study_streak}`);

      if (daysSinceLastQuiz === 0) {
        // Same day - no change to streak
        newStreak = profile.study_streak || 1;
        console.log(`[Streak] User ${user.id}: Same day completion, maintaining streak at ${newStreak}`);
      } else if (daysSinceLastQuiz === 1) {
        // Consecutive day - increment streak
        newStreak = (profile.study_streak || 0) + 1;
        streakIncreased = true;
        console.log(`[Streak] User ${user.id}: Consecutive day! Streak increased to ${newStreak}`);
      } else if (daysSinceLastQuiz === 2) {
        // Grace period (1 missed day) - maintain streak
        newStreak = profile.study_streak || 1;
        console.log(`[Streak] User ${user.id}: Grace period used, maintaining streak at ${newStreak}`);
      } else {
        // 2+ missed days - reset to 1
        newStreak = 1;
        streakReset = true;
        console.log(`[Streak] User ${user.id}: ${daysSinceLastQuiz - 1} days missed, streak reset to 1`);
      }
    }

    // 5. Update longest streak if needed
    const newLongestStreak = Math.max(newStreak, profile.longest_streak || 0);
    const longestStreakBroken = newLongestStreak > (profile.longest_streak || 0);

    // 6. Update profile with new streak data
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        study_streak: newStreak,
        last_quiz_date: today,
        longest_streak: newLongestStreak,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating streak:', updateError);
      return NextResponse.json({ error: 'Failed to update streak' }, { status: 500 });
    }

    console.log(`[Streak] User ${user.id}: Successfully updated - Current: ${newStreak}, Longest: ${newLongestStreak}`);

    // 7. Return success response with streak details
    return NextResponse.json({
      success: true,
      streak: {
        current: newStreak,
        previous: profile.study_streak || 0,
        increased: streakIncreased,
        reset: streakReset,
        longest: newLongestStreak,
        longestStreakBroken,
        lastQuizDate: today
      },
      quiz: {
        id: quizId,
        score,
        total,
        completedAt
      }
    });

  } catch (error) {
    console.error('Error in quiz completion handler:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
