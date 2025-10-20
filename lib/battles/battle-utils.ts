import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Complete a battle and determine the winner
 * Called when both players have submitted all rounds
 */
export async function completeBattle(battleId: string): Promise<string | null> {
  const supabase = createServiceRoleClient();

  console.log(`🏁 [completeBattle] Starting completion for battle ${battleId}`);

  // Get battle details
  const { data: battle, error: battleError } = await supabase
    .from('quiz_battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (battleError || !battle) {
    console.error('❌ [completeBattle] Failed to fetch battle:', battleError);
    throw new Error('Battle not found');
  }

  console.log(`📊 [completeBattle] Battle details:`, {
    id: battleId,
    status: battle.status,
    rounds_count: battle.rounds_count,
    current_round: battle.current_round
  });

  // Get all participants and their scores
  const { data: participants, error: participantsError } = await supabase
    .from('battle_participants')
    .select('*')
    .eq('battle_id', battleId)
    .order('round_number', { ascending: true });

  if (participantsError || !participants) {
    console.error('❌ [completeBattle] Failed to fetch participants:', participantsError);
    throw new Error('Failed to fetch battle participants');
  }

  console.log(`📊 [completeBattle] Found ${participants.length} submissions`);

  // Calculate total scores for each player
  const player1Id = battle.created_by;
  const player2Id = battle.opponent_id;

  const player1Submissions = participants.filter(p => p.user_id === player1Id);
  const player2Submissions = participants.filter(p => p.user_id === player2Id);

  const player1TotalScore = player1Submissions.reduce((sum, s) => sum + s.score, 0);
  const player2TotalScore = player2Submissions.reduce((sum, s) => sum + s.score, 0);

  const player1TotalTime = player1Submissions.reduce((sum, s) => sum + s.time_taken, 0);
  const player2TotalTime = player2Submissions.reduce((sum, s) => sum + s.time_taken, 0);

  console.log(`📊 [completeBattle] Final scores:`, {
    player1: { id: player1Id.substring(0, 8), score: player1TotalScore, time: player1TotalTime },
    player2: { id: player2Id.substring(0, 8), score: player2TotalScore, time: player2TotalTime }
  });

  // Determine winner
  let winnerId: string | null = null;

  if (player1TotalScore > player2TotalScore) {
    winnerId = player1Id;
    console.log(`🏆 [completeBattle] Player 1 wins by score (${player1TotalScore} > ${player2TotalScore})`);
  } else if (player2TotalScore > player1TotalScore) {
    winnerId = player2Id;
    console.log(`🏆 [completeBattle] Player 2 wins by score (${player2TotalScore} > ${player1TotalScore})`);
  } else {
    // Tie on score - use time as tiebreaker (faster is better)
    if (player1TotalTime < player2TotalTime) {
      winnerId = player1Id;
      console.log(`🏆 [completeBattle] Player 1 wins by time (${player1TotalTime}s < ${player2TotalTime}s)`);
    } else if (player2TotalTime < player1TotalTime) {
      winnerId = player2Id;
      console.log(`🏆 [completeBattle] Player 2 wins by time (${player2TotalTime}s < ${player1TotalTime}s)`);
    } else {
      console.log(`🤝 [completeBattle] Draw - same score and time`);
    }
    // If still tied (same score and time), winnerId remains null (draw)
  }

  // Update battle status
  console.log(`💾 [completeBattle] Updating battle status to 'completed'...`);
  const { error: updateError } = await supabase
    .from('quiz_battles')
    .update({
      status: 'completed',
      winner_id: winnerId,
      completed_at: new Date().toISOString()
    })
    .eq('id', battleId);

  if (updateError) {
    console.error('❌ [completeBattle] Failed to update battle status:', updateError);
    throw new Error('Failed to complete battle');
  }

  console.log(`✅ [completeBattle] Battle status updated successfully`);

  // Update battle stats for both players
  console.log(`📊 [completeBattle] Updating player stats...`);
  await updateBattleStats(player1Id, winnerId === player1Id, participants.filter(p => p.user_id === player1Id));
  await updateBattleStats(player2Id, winnerId === player2Id, participants.filter(p => p.user_id === player2Id));

  console.log(`✅ [completeBattle] Battle ${battleId} completed. Winner: ${winnerId || 'Draw'}`);

  return winnerId;
}

/**
 * Update battle statistics for a user
 */
async function updateBattleStats(
  userId: string,
  won: boolean,
  userParticipations: any[]
): Promise<void> {
  const supabase = createServiceRoleClient();

  // Get current stats
  const { data: stats } = await supabase
    .from('battle_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  // Calculate topic performance from this battle
  const topicPerformance: Record<string, { correct: number; total: number }> = {};

  for (const participation of userParticipations) {
    // Note: topic performance should be stored in answers or calculated from questions
    // For now we'll update basic stats
  }

  const now = new Date().toISOString();

  if (stats) {
    // Update existing stats
    const updates: any = {
      total_battles: stats.total_battles + 1,
      last_battle_at: now,
      updated_at: now
    };

    if (won) {
      updates.wins = stats.wins + 1;
    } else {
      updates.losses = stats.losses + 1;
    }

    await supabase
      .from('battle_stats')
      .update(updates)
      .eq('user_id', userId);
  } else {
    // Create new stats
    await supabase
      .from('battle_stats')
      .insert({
        user_id: userId,
        total_battles: 1,
        wins: won ? 1 : 0,
        losses: won ? 0 : 1,
        draws: 0,
        weak_topics: {},
        strong_topics: {},
        last_battle_at: now,
        updated_at: now
      });
  }
}

/**
 * Determine if both players have submitted for a specific round
 */
export async function checkBothPlayersSubmitted(
  battleId: string,
  roundNumber: number
): Promise<{ bothSubmitted: boolean; player1Score?: number; player2Score?: number }> {
  const supabase = createServiceRoleClient();

  // Get battle to know the players
  const { data: battle } = await supabase
    .from('quiz_battles')
    .select('created_by, opponent_id')
    .eq('id', battleId)
    .single();

  if (!battle) {
    return { bothSubmitted: false };
  }

  // Get submissions for this round
  const { data: submissions } = await supabase
    .from('battle_participants')
    .select('user_id, score')
    .eq('battle_id', battleId)
    .eq('round_number', roundNumber);

  if (!submissions || submissions.length < 2) {
    return { bothSubmitted: false };
  }

  const player1Submission = submissions.find(s => s.user_id === battle.created_by);
  const player2Submission = submissions.find(s => s.user_id === battle.opponent_id);

  const bothSubmitted = !!player1Submission && !!player2Submission;

  return {
    bothSubmitted,
    player1Score: player1Submission?.score,
    player2Score: player2Submission?.score
  };
}

/**
 * Check if user is participant in battle
 */
export async function isUserParticipant(battleId: string, userId: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  const { data: battle } = await supabase
    .from('quiz_battles')
    .select('created_by, opponent_id')
    .eq('id', battleId)
    .single();

  if (!battle) return false;

  return battle.created_by === userId || battle.opponent_id === userId;
}

/**
 * Check if both players are friends
 */
export async function checkFriendship(userId1: string, userId2: string): Promise<boolean> {
  const supabase = createServiceRoleClient();

  // Normalize order for bidirectional check
  const [smallerId, largerId] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

  const { data: connection } = await supabase
    .from('user_connections')
    .select('status')
    .eq('user_id', smallerId)
    .eq('friend_id', largerId)
    .single();

  return connection?.status === 'accepted';
}
