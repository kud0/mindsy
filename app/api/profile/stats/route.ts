import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface ProfileStats {
  // Character progression
  level: number;
  xp: number;
  xpForNextLevel: number;
  xpProgress: number; // percentage 0-100

  // Streak data
  currentStreak: number;
  longestStreak: number;
  lastStudyDate: string | null;

  // Performance metrics
  totalExams: number;
  avgScore: number;
  bestScore: number;
  totalStudyTime: number; // in minutes

  // Battle stats
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;

  // Social
  friendsCount: number;
  contentShared: number;

  // Title/Rank
  title: string;
  titleColor: string;
}

/**
 * GET /api/profile/stats
 * Returns comprehensive user stats for profile widget
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

    // Fetch data from multiple tables in parallel
    const [
      profileResult,
      performanceResult,
      battleStatsResult,
      friendsResult,
      sharedContentResult
    ] = await Promise.all([
      // Profile data (streak)
      supabase
        .from('profiles')
        .select('study_streak, last_quiz_date, longest_streak')
        .eq('id', user.id)
        .single(),

      // Performance data (XP, level, exams)
      supabase
        .from('user_performance')
        .select('*')
        .eq('user_id', user.id),

      // Battle stats
      supabase
        .from('battle_stats')
        .select('total_battles, wins, losses, draws')
        .eq('user_id', user.id)
        .single(),

      // Friends count
      supabase
        .from('user_connections')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'accepted'),

      // Shared content count
      supabase
        .from('shared_content')
        .select('id', { count: 'exact', head: true })
        .eq('shared_by_id', user.id)
    ]);

    // Handle errors
    if (profileResult.error) {
      console.error('Profile fetch error:', profileResult.error);
    }

    // Aggregate performance data (could be multiple folders)
    const performanceData = performanceResult.data || [];
    const aggregatedPerformance = performanceData.reduce((acc, perf) => ({
      totalExams: acc.totalExams + (perf.total_exams_taken || 0),
      totalXP: acc.totalXP + (perf.xp_points || 0),
      totalStudyTime: acc.totalStudyTime + (perf.total_study_time || 0),
      avgScore: Math.max(acc.avgScore, perf.average_score || 0),
      bestScore: Math.max(acc.bestScore, perf.best_score || 0),
      maxLevel: Math.max(acc.maxLevel, perf.level || 1)
    }), {
      totalExams: 0,
      totalXP: 0,
      totalStudyTime: 0,
      avgScore: 0,
      bestScore: 0,
      maxLevel: 1
    });

    // Calculate XP for next level (1000 XP per level)
    const XP_PER_LEVEL = 1000;
    const currentLevel = aggregatedPerformance.maxLevel;
    const currentXP = aggregatedPerformance.totalXP;
    const xpInCurrentLevel = currentXP % XP_PER_LEVEL;
    const xpForNextLevel = XP_PER_LEVEL;
    const xpProgress = Math.round((xpInCurrentLevel / xpForNextLevel) * 100);

    // Battle stats
    const battleStats = battleStatsResult.data || {
      total_battles: 0,
      wins: 0,
      losses: 0,
      draws: 0
    };
    const winRate = battleStats.total_battles > 0
      ? Math.round((battleStats.wins / battleStats.total_battles) * 100)
      : 0;

    // Determine title based on level and achievements
    const { title, titleColor } = getTitleAndColor(
      currentLevel,
      aggregatedPerformance.avgScore,
      profileResult.data?.study_streak || 0
    );

    const stats: ProfileStats = {
      // Progression
      level: currentLevel,
      xp: currentXP,
      xpForNextLevel,
      xpProgress,

      // Streak
      currentStreak: profileResult.data?.study_streak || 0,
      longestStreak: profileResult.data?.longest_streak || 0,
      lastStudyDate: profileResult.data?.last_quiz_date || null,

      // Performance
      totalExams: aggregatedPerformance.totalExams,
      avgScore: Math.round(aggregatedPerformance.avgScore),
      bestScore: Math.round(aggregatedPerformance.bestScore),
      totalStudyTime: Math.round(aggregatedPerformance.totalStudyTime / 60), // convert to minutes

      // Battles
      totalBattles: battleStats.total_battles,
      wins: battleStats.wins,
      losses: battleStats.losses,
      draws: battleStats.draws,
      winRate,

      // Social
      friendsCount: friendsResult.count || 0,
      contentShared: sharedContentResult.count || 0,

      // Title
      title,
      titleColor
    };

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Profile stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Helper: Determine user title based on level and achievements
 */
function getTitleAndColor(
  level: number,
  avgScore: number,
  streak: number
): { title: string; titleColor: string } {
  // Special titles for high achievers
  if (streak >= 100) {
    return { title: 'Eternal Scholar', titleColor: 'text-yellow-500' };
  }
  if (level >= 50 && avgScore >= 90) {
    return { title: 'Grand Master', titleColor: 'text-purple-500' };
  }
  if (level >= 30) {
    return { title: 'Master Scholar', titleColor: 'text-indigo-500' };
  }
  if (level >= 20) {
    return { title: 'Expert', titleColor: 'text-blue-500' };
  }
  if (level >= 10) {
    return { title: 'Advanced Scholar', titleColor: 'text-cyan-500' };
  }
  if (level >= 5) {
    return { title: 'Scholar', titleColor: 'text-green-500' };
  }

  return { title: 'Novice', titleColor: 'text-gray-500' };
}
