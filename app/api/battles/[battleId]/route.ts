import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserParticipant } from '@/lib/battles/battle-utils';

/**
 * GET /api/battles/[battleId]
 * Get battle details with all rounds
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { battleId } = await params;

    // Verify user is participant
    const isParticipant = await isUserParticipant(battleId, user.id);
    if (!isParticipant) {
      return NextResponse.json(
        { error: 'Not authorized to view this battle' },
        { status: 403 }
      );
    }

    // Get battle details
    const { data: battle, error: battleError } = await supabase
      .from('quiz_battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      return NextResponse.json(
        { error: 'Battle not found' },
        { status: 404 }
      );
    }

    // Fetch profiles for both participants
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', [battle.created_by, battle.opponent_id]);

    const profileMap = new Map(
      (profiles || []).map(p => [p.id, p])
    );

    // Attach profiles to battle
    battle.challenger = profileMap.get(battle.created_by);
    battle.opponent = profileMap.get(battle.opponent_id);

    // Get all rounds
    const { data: rounds, error: roundsError } = await supabase
      .from('battle_rounds')
      .select('*')
      .eq('battle_id', battleId)
      .order('round_number', { ascending: true });

    if (roundsError) {
      console.error('Error fetching rounds:', roundsError);
    }

    // Get all participant submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('battle_participants')
      .select('*')
      .eq('battle_id', battleId)
      .order('round_number', { ascending: true });

    if (submissionsError) {
      console.error('Error fetching submissions:', submissionsError);
    }

    // Organize submissions by round
    const submissionsByRound: Record<number, {
      user_id: string;
      score: number;
      round_number: number;
      [key: string]: unknown;
    }[]> = {};
    submissions?.forEach(sub => {
      if (!submissionsByRound[sub.round_number]) {
        submissionsByRound[sub.round_number] = [];
      }
      submissionsByRound[sub.round_number].push(sub);
    });

    // Enrich rounds with submission data
    const enrichedRounds = rounds?.map(round => {
      const roundSubmissions = submissionsByRound[round.round_number] || [];
      const userSubmission = roundSubmissions.find(s => s.user_id === user.id);
      const opponentSubmission = roundSubmissions.find(s => s.user_id !== user.id);

      return {
        ...round,
        userSubmitted: !!userSubmission,
        opponentSubmitted: !!opponentSubmission,
        userScore: userSubmission?.score,
        opponentScore: opponentSubmission?.score,
        bothSubmitted: !!userSubmission && !!opponentSubmission
      };
    });

    // Determine current round (first incomplete round)
    // BUGFIX: If battle is completed, don't override current_round
    let currentRound;
    let currentRoundNumber;

    if (battle.status === 'completed' || battle.status === 'cancelled') {
      // Battle is finished - use the total number of rounds that exist
      currentRoundNumber = enrichedRounds?.length || battle.rounds_count || 3;
      currentRound = null; // No active round
      console.log('🏁 [Battle API] Battle finished, no current round');
    } else {
      // Battle is active - find the first incomplete round
      currentRound = enrichedRounds?.find(r => !r.bothSubmitted);

      if (currentRound) {
        currentRoundNumber = currentRound.round_number;
      } else {
        // All existing rounds are complete, but battle isn't marked complete yet
        // This can happen if we're waiting for next round to be created
        currentRoundNumber = (enrichedRounds && enrichedRounds.length > 0) ? enrichedRounds.length : 1;
      }

      console.log('🎮 [Battle API] Active battle, current round:', currentRoundNumber);
    }

    // Calculate user progress
    const userSubmissions = submissions?.filter(s => s.user_id === user.id) || [];
    const totalUserScore = userSubmissions.reduce((sum, s) => sum + s.score, 0);
    const completedRounds = userSubmissions.length;

    console.log('📊 [Battle API] Calculated state:', {
      battleId,
      status: battle.status,
      totalRounds: enrichedRounds?.length || 0,
      currentRoundNumber,
      hasCurrentRound: !!currentRound,
      completedRounds,
      userScore: totalUserScore,
      battleComplete: battle.status === 'completed'
    });

    return NextResponse.json({
      success: true,
      battle: {
        ...battle,
        current_round: currentRoundNumber,
        folder_name: battle.source_folder_name, // Ensure folder_name is included
        isChallenger: battle.created_by === user.id,
        opponent: battle.created_by === user.id ? battle.opponent : battle.challenger
      },
      rounds: enrichedRounds || [],
      currentRound,
      userProgress: {
        completedRounds,
        totalScore: totalUserScore,
        averageScore: completedRounds > 0 ? Math.round(totalUserScore / completedRounds) : 0
      }
    });
  } catch (error) {
    console.error('Unexpected error in GET /battles/[battleId]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/battles/[battleId]
 * Cancel or decline a battle
 * - Challenger can CANCEL their own pending challenge
 * - Opponent can DECLINE a pending challenge
 * - Either participant can FORFEIT an active battle (opponent wins)
 * - Completed or cancelled battles cannot be modified
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ battleId: string }> }
) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      console.warn('[Battle Delete] Unauthenticated request');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { battleId } = await params;

    // Get battle details
    const { data: battle, error: battleError } = await supabase
      .from('quiz_battles')
      .select('*')
      .eq('id', battleId)
      .single();

    if (battleError || !battle) {
      console.error('[Battle Delete] Battle not found:', battleId, battleError);
      return NextResponse.json(
        { error: 'Battle not found' },
        { status: 404 }
      );
    }

    // Determine user role
    const isChallenger = battle.created_by === user.id;
    const isOpponent = battle.opponent_id === user.id;

    // Authorization check
    if (!isChallenger && !isOpponent) {
      console.warn('[Battle Delete] Unauthorized user:', user.id, 'Battle:', battleId);
      return NextResponse.json(
        { error: 'Not authorized to cancel this battle' },
        { status: 403 }
      );
    }

    // Status validation - allow pending OR active battles to be cancelled
    if (battle.status !== 'pending' && battle.status !== 'active') {
      const statusMessages: Record<string, string> = {
        completed: 'Cannot cancel a completed battle.',
        cancelled: 'This battle has already been cancelled.'
      };

      const errorMessage = statusMessages[battle.status] ||
        `Cannot cancel battle with status: ${battle.status}. Only pending or active battles can be cancelled.`;

      console.warn('[Battle Delete] Invalid status:', {
        battleId,
        status: battle.status,
        userId: user.id,
        role: isChallenger ? 'challenger' : 'opponent'
      });

      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    // Determine action type based on status
    const isPending = battle.status === 'pending';
    const isActive = battle.status === 'active';
    const action = isPending
      ? (isChallenger ? 'CANCEL' : 'DECLINE')
      : 'FORFEIT';

    // Log the cancellation attempt
    console.log('[Battle Delete] Attempting cancellation:', {
      battleId,
      userId: user.id,
      role: isChallenger ? 'challenger' : 'opponent',
      action,
      status: battle.status
    });

    // Prepare update data
    const updateData: any = {
      status: 'cancelled',
      completed_at: new Date().toISOString()
    };

    // If forfeiting an active battle, assign win to opponent
    if (isActive) {
      const winnerId = isChallenger ? battle.opponent_id : battle.created_by;
      updateData.winner_id = winnerId;
      console.log(`[Battle Forfeit] ${user.id} forfeited, ${winnerId} wins`);
    }

    // Update battle status
    const { error: updateError } = await supabase
      .from('quiz_battles')
      .update(updateData)
      .eq('id', battleId);

    if (updateError) {
      console.error('[Battle Delete] Database update failed:', {
        battleId,
        error: updateError,
        code: updateError.code,
        message: updateError.message
      });

      return NextResponse.json(
        { error: 'Failed to cancel battle. Please try again.' },
        { status: 500 }
      );
    }

    // Generate appropriate message
    let actionMessage: string;
    if (isPending) {
      actionMessage = isChallenger ? 'Battle cancelled' : 'Battle declined';
    } else {
      actionMessage = 'Battle forfeited';
    }

    console.log('[Battle Delete] Success:', {
      battleId,
      userId: user.id,
      action: actionMessage,
      winnerId: updateData.winner_id
    });

    return NextResponse.json({
      success: true,
      message: actionMessage
    });
  } catch (error) {
    console.error('[Battle Delete] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
