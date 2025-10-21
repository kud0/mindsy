import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

interface Quest {
  id: number;
  type: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
  icon: string;
  action?: string;
  actionLabel?: string;
}

interface DailyQuestsResponse {
  quests: Quest[];
  allCompleted: boolean;
  bonusXP: number;
  bonusClaimed: boolean;
  totalXP: number;
}

interface SingleQuestResponse {
  quest: Quest;
  totalEarnedToday: number;
  allCompleted: boolean;
}

/**
 * GET /api/profile/daily-quests
 * Returns today's quests with current progress
 *
 * Query Parameters:
 * - questId (optional): 1, 2, or 3 to fetch a specific quest
 *
 * Examples:
 * - GET /api/profile/daily-quests         → All 3 quests
 * - GET /api/profile/daily-quests?questId=1 → Pomodoro quest only
 * - GET /api/profile/daily-quests?questId=2 → Exam quest only
 * - GET /api/profile/daily-quests?questId=3 → Social quest only
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const questIdParam = searchParams.get('questId');
    const questId = questIdParam ? parseInt(questIdParam, 10) : null;

    // Validate questId if provided
    if (questId !== null && (questId < 1 || questId > 3 || isNaN(questId))) {
      return NextResponse.json(
        { error: 'Invalid questId. Must be 1, 2, or 3.' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Generate or fetch today's quests
    const { data: questsData, error: questError } = await supabase
      .rpc('generate_daily_quests', { p_user_id: user.id });

    if (questError) {
      console.error('Error generating quests:', questError);
      return NextResponse.json(
        { error: 'Failed to generate quests' },
        { status: 500 }
      );
    }

    // Fetch the actual quest record with progress
    const today = new Date().toISOString().split('T')[0];
    const { data: questRecord, error: fetchError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('quest_date', today)
      .single();

    if (fetchError || !questRecord) {
      console.error('Error fetching quest record:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch quest progress' },
        { status: 500 }
      );
    }

    // Format quests for frontend
    const quests: Quest[] = [
      {
        id: 1,
        type: questRecord.quest1_type,
        title: getQuestTitle(questRecord.quest1_type, questRecord.quest1_target),
        description: getQuestDescription(questRecord.quest1_type),
        target: questRecord.quest1_target,
        current: questRecord.quest1_current,
        completed: questRecord.quest1_completed,
        xpReward: questRecord.quest1_xp_reward,
        icon: getQuestIcon(questRecord.quest1_type),
        action: '/dashboard/pomodoro',
        actionLabel: 'Start Pomodoro'
      },
      {
        id: 2,
        type: questRecord.quest2_type,
        title: getQuestTitle(questRecord.quest2_type, questRecord.quest2_target),
        description: getQuestDescription(questRecord.quest2_type),
        target: questRecord.quest2_target,
        current: questRecord.quest2_current,
        completed: questRecord.quest2_completed,
        xpReward: questRecord.quest2_xp_reward,
        icon: getQuestIcon(questRecord.quest2_type),
        action: questRecord.quest2_type === 'battle' ? '/dashboard/social' : undefined,
        actionLabel: questRecord.quest2_type === 'battle' ? 'Find Battle' : undefined
      },
      {
        id: 3,
        type: questRecord.quest3_type,
        title: getQuestTitle(questRecord.quest3_type, questRecord.quest3_target),
        description: getQuestDescription(questRecord.quest3_type),
        target: questRecord.quest3_target,
        current: questRecord.quest3_current,
        completed: questRecord.quest3_completed,
        xpReward: questRecord.quest3_xp_reward,
        icon: getQuestIcon(questRecord.quest3_type),
        action: questRecord.quest3_type === 'battle_win' ? '/dashboard/social' : undefined,
        actionLabel: questRecord.quest3_type === 'battle_win' ? 'Challenge Friend' : undefined
      }
    ];

    // Calculate total XP earned today
    const totalEarnedToday = quests.reduce((sum, q) => sum + (q.completed ? q.xpReward : 0), 0);

    // If specific quest requested, return single quest response
    if (questId !== null) {
      const selectedQuest = quests.find(q => q.id === questId);

      if (!selectedQuest) {
        return NextResponse.json(
          { error: 'Quest not found' },
          { status: 404 }
        );
      }

      const singleResponse: SingleQuestResponse = {
        quest: selectedQuest,
        totalEarnedToday,
        allCompleted: questRecord.all_completed
      };

      return NextResponse.json({
        success: true,
        data: singleResponse
      });
    }

    // Return all quests (legacy behavior)
    const potentialXP = totalEarnedToday + (questRecord.all_completed && !questRecord.bonus_xp_claimed ? questRecord.bonus_xp_amount : 0);

    const response: DailyQuestsResponse = {
      quests,
      allCompleted: questRecord.all_completed,
      bonusXP: questRecord.bonus_xp_amount,
      bonusClaimed: questRecord.bonus_xp_claimed,
      totalXP: potentialXP
    };

    return NextResponse.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Daily quests API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/profile/daily-quests
 * Claim bonus XP when all quests completed
 */
export async function POST() {
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

    const today = new Date().toISOString().split('T')[0];

    // Check if all quests completed and bonus not claimed
    const { data: questRecord, error: fetchError } = await supabase
      .from('daily_quests')
      .select('*')
      .eq('user_id', user.id)
      .eq('quest_date', today)
      .single();

    if (fetchError || !questRecord) {
      return NextResponse.json(
        { error: 'Quest record not found' },
        { status: 404 }
      );
    }

    if (!questRecord.all_completed) {
      return NextResponse.json(
        { error: 'Not all quests completed' },
        { status: 400 }
      );
    }

    if (questRecord.bonus_xp_claimed) {
      return NextResponse.json(
        { error: 'Bonus already claimed' },
        { status: 400 }
      );
    }

    // Mark bonus as claimed
    const { error: updateError } = await supabase
      .from('daily_quests')
      .update({ bonus_xp_claimed: true })
      .eq('user_id', user.id)
      .eq('quest_date', today);

    if (updateError) {
      console.error('Error claiming bonus:', updateError);
      return NextResponse.json(
        { error: 'Failed to claim bonus' },
        { status: 500 }
      );
    }

    // Award XP to user_performance
    const { error: xpError } = await supabase.rpc('award_xp', {
      p_user_id: user.id,
      p_xp_amount: questRecord.bonus_xp_amount
    });

    if (xpError) {
      console.error('Error awarding XP:', xpError);
    }

    return NextResponse.json({
      success: true,
      xpAwarded: questRecord.bonus_xp_amount,
      message: 'Bonus XP claimed!'
    });

  } catch (error) {
    console.error('Claim bonus API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions

function getQuestTitle(type: string, target: number): string {
  const titles: Record<string, string> = {
    pomodoro: `Complete ${target} Pomodoro Sessions`,
    study_time: `Study for ${target} hours`,
    questions: `Answer ${target} Questions`,
    battle: `Play ${target} Quiz Battle`,
    exam: `Take ${target} Exam`,
    quiz: `Complete ${target} Quiz`,
    battle_win: `Win ${target} Quiz Battle`,
    share_content: `Share ${target} Lecture`,
    help_friend: `Help ${target} Friend`,
    perfect_score: `Get a Perfect Score`
  };
  return titles[type] || `Complete ${type}`;
}

function getQuestDescription(type: string): string {
  const descriptions: Record<string, string> = {
    pomodoro: 'Focus deeply with timed study sessions',
    study_time: 'Dedicate quality time to learning',
    questions: 'Test your knowledge through active recall',
    battle: 'Challenge a friend to a learning duel',
    exam: 'Assess your understanding comprehensively',
    quiz: 'Quick test on your study material',
    battle_win: 'Prove your mastery in competition',
    share_content: 'Help others by sharing knowledge',
    help_friend: 'Support a classmate in their studies',
    perfect_score: 'Demonstrate complete understanding'
  };
  return descriptions[type] || 'Complete this challenge';
}

function getQuestIcon(type: string): string {
  const icons: Record<string, string> = {
    pomodoro: '⏱️',
    study_time: '📚',
    questions: '🎯',
    battle: '⚔️',
    exam: '📝',
    quiz: '❓',
    battle_win: '🏆',
    share_content: '🤝',
    help_friend: '💙',
    perfect_score: '⭐'
  };
  return icons[type] || '✨';
}
