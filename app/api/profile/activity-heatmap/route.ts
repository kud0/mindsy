import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ActivityData {
  date: string;
  pomodoros: number;
  questions: number;
  battles: number;
  exams: number;
  lectures: number;
  shares: number;
  score: number;
  intensity: 'none' | 'low' | 'medium' | 'high';
}

/**
 * GET /api/profile/activity-heatmap
 * Returns 28 days of activity data for heatmap visualization
 */
export async function GET() {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Query last 28 days of activity (4 weeks for clean grid)
    const { data: activities, error: queryError } = await supabase
      .from('activity_log')
      .select('*')
      .eq('user_id', user.id)
      .gte('activity_date', new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('activity_date', { ascending: true });

    if (queryError) {
      console.error('Error fetching activity log:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch activity data' },
        { status: 500 }
      );
    }

    // Create a map of existing activity data
    const activityMap = new Map(
      (activities || []).map(a => [a.activity_date, a])
    );

    // Generate full 28-day array (fill missing days with zeros)
    const heatmapData: ActivityData[] = [];
    const today = new Date();

    for (let i = 27; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const activity = activityMap.get(dateStr);

      if (activity) {
        const score = activity.activity_score || 0;
        heatmapData.push({
          date: dateStr,
          pomodoros: activity.pomodoros_completed || 0,
          questions: activity.questions_answered || 0,
          battles: activity.battles_played || 0,
          exams: activity.exams_taken || 0,
          lectures: activity.lectures_processed || 0,
          shares: activity.content_shared || 0,
          score,
          intensity: getIntensityLevel(score)
        });
      } else {
        // Fill missing days with empty data
        heatmapData.push({
          date: dateStr,
          pomodoros: 0,
          questions: 0,
          battles: 0,
          exams: 0,
          lectures: 0,
          shares: 0,
          score: 0,
          intensity: 'none'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: heatmapData,
      summary: {
        totalDays: heatmapData.length,
        activeDays: heatmapData.filter(d => d.score > 0).length,
        avgScore: Math.round(
          heatmapData.reduce((sum, d) => sum + d.score, 0) / heatmapData.length
        ),
        maxScore: Math.max(...heatmapData.map(d => d.score)),
        currentStreak: calculateStreak(heatmapData)
      }
    });

  } catch (error) {
    console.error('Activity heatmap API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Determine intensity level based on activity score
 */
function getIntensityLevel(score: number): 'none' | 'low' | 'medium' | 'high' {
  if (score === 0) return 'none';
  if (score <= 3) return 'low';
  if (score <= 7) return 'medium';
  return 'high';
}

/**
 * Helper: Calculate current streak from heatmap data
 */
function calculateStreak(data: ActivityData[]): number {
  let streak = 0;

  // Count backwards from today
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].score > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}
