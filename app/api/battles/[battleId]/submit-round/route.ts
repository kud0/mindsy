import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserParticipant, checkBothPlayersSubmitted, completeBattle } from '@/lib/battles/battle-utils';
import { calculateScore } from '@/lib/battles/scoring';
import { generateBattleQuestions } from '@/lib/battles/question-generator';

/**
 * POST /api/battles/[battleId]/submit-round
 * Submit answers for current round
 *
 * Body: {
 *   roundNumber: number;
 *   answers: Record<string, string>; // questionId -> answer
 *   timeTaken: number; // seconds
 * }
 */
export async function POST(
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
        { error: 'Not authorized to submit in this battle' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { roundNumber, answers, timeTaken } = body;

    if (!roundNumber || !answers || timeTaken === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: roundNumber, answers, timeTaken' },
        { status: 400 }
      );
    }

    // Get battle
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

    // Verify battle is active
    if (battle.status !== 'active') {
      return NextResponse.json(
        { error: 'Battle is not active' },
        { status: 400 }
      );
    }

    // Get round
    const { data: round, error: roundError } = await supabase
      .from('battle_rounds')
      .select('*')
      .eq('battle_id', battleId)
      .eq('round_number', roundNumber)
      .single();

    if (roundError || !round) {
      return NextResponse.json(
        { error: 'Round not found' },
        { status: 404 }
      );
    }

    // Check if user already submitted
    const { data: existingSubmission } = await supabase
      .from('battle_participants')
      .select('id')
      .eq('battle_id', battleId)
      .eq('user_id', user.id)
      .eq('round_number', roundNumber)
      .single();

    if (existingSubmission) {
      return NextResponse.json(
        { error: 'Already submitted for this round' },
        { status: 400 }
      );
    }

    // Log questions for debugging
    console.log(`🎯 [Battle ${battleId}] Round ${roundNumber} questions:`, {
      totalQuestions: round.questions.length,
      questionsPreview: round.questions.map((q: any) => ({
        id: q.id.substring(0, 8),
        correctAnswer: q.correctAnswer,
        hasOptions: !!q.options,
        optionKeys: q.options ? Object.keys(q.options) : []
      }))
    });

    // Calculate score
    const scoreResult = calculateScore(answers, round.questions);

    console.log(`📊 [Battle ${battleId}] Round ${roundNumber} submission:`, {
      userId: user.id,
      correctCount: scoreResult.correctCount,
      incorrectCount: scoreResult.incorrectCount,
      score: scoreResult.score,
      totalQuestions: round.questions.length,
      correctAnswers: round.questions.map((q: any) => q.correctAnswer).join(',')
    });

    // Create submission
    const { data: submission, error: submissionError } = await supabase
      .from('battle_participants')
      .insert({
        battle_id: battleId,
        user_id: user.id,
        round_number: roundNumber,
        answers: answers,
        score: scoreResult.score,
        time_taken: timeTaken
      })
      .select()
      .single();

    if (submissionError || !submission) {
      console.error('Error creating submission:', submissionError);
      return NextResponse.json(
        { error: 'Failed to submit round' },
        { status: 500 }
      );
    }

    // Check if both players submitted
    const { bothSubmitted, player1Score, player2Score } = await checkBothPlayersSubmitted(
      battleId,
      roundNumber
    );

    // === NOTIFICATION SYSTEM ===
    // Send notification to opponent that it's their turn
    const opponentId = battle.created_by === user.id ? battle.opponent_id : battle.created_by;

    // Get user's name for notification
    const { data: userData } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const userName = userData?.full_name || 'Your opponent';

    if (!bothSubmitted) {
      // Opponent hasn't submitted yet - notify them it's their turn
      console.log(`🔔 [Battle ${battleId}] Notifying opponent (${opponentId}) - their turn for Round ${roundNumber}`);

      await supabase.from('notifications').insert({
        user_id: opponentId,
        type: 'battle_turn',
        title: 'Your turn in Quiz Battle!',
        message: `${userName} completed Round ${roundNumber}. It's your turn to play!`,
        metadata: {
          battle_id: battleId,
          round_number: roundNumber,
          action_url: `/dashboard/battles/${battleId}`
        },
        read: false
      });
    } else {
      // Both submitted - notify opponent that next round is ready (if not last round)
      const isLastRound = roundNumber === battle.rounds_count;

      if (!isLastRound) {
        console.log(`🔔 [Battle ${battleId}] Both submitted Round ${roundNumber} - notifying next round ready`);

        // Notify opponent that next round is available
        await supabase.from('notifications').insert({
          user_id: opponentId,
          type: 'battle_round_ready',
          title: 'Next Round Ready!',
          message: `Round ${roundNumber + 1} is now available in your battle with ${userName}`,
          metadata: {
            battle_id: battleId,
            round_number: roundNumber + 1,
            action_url: `/dashboard/battles/${battleId}`
          },
          read: false
        });
      }
    }

    const response: {
      success: boolean;
      score: number;
      correctCount: number;
      incorrectCount: number;
      topicPerformance: Record<string, { correct: number; total: number; percentage: number }>;
      detailedResults: unknown[];
      bothSubmitted: boolean;
      nextRoundReady?: boolean;
      opponentScore?: number;
      battleComplete?: boolean;
      winner?: string | null;
      isDraw?: boolean;
      userWon?: boolean;
      nextRound?: {
        id: string;
        battle_id: string;
        round_number: number;
        questions: unknown[];
        started_at: string;
        completed_at?: string | null;
      };
    } = {
      success: true,
      score: scoreResult.score,
      correctCount: scoreResult.correctCount,
      incorrectCount: scoreResult.incorrectCount,
      topicPerformance: scoreResult.topicPerformance,
      detailedResults: scoreResult.detailedResults,
      bothSubmitted,
      nextRoundReady: false
    };

    // If both submitted, provide opponent score
    if (bothSubmitted) {
      const opponentScore = battle.created_by === user.id ? player2Score : player1Score;

      response.opponentScore = opponentScore;

      // Check if this was the last round
      const isLastRound = roundNumber === battle.rounds_count;

      console.log('📊 Round submission:', {
        battleId,
        roundNumber,
        totalRounds: battle.rounds_count,
        bothSubmitted,
        isLastRound,
        willComplete: bothSubmitted && isLastRound
      });

      if (isLastRound) {
        // Complete battle
        console.log(`🏁 Battle complete! Calculating winner for battle ${battleId}...`);
        try {
          const winnerId = await completeBattle(battleId);
          console.log(`🏆 Battle ${battleId} completed. Winner: ${winnerId || 'DRAW'}`);
          response.battleComplete = true;
          response.winner = winnerId;
          response.isDraw = winnerId === null;
          response.userWon = winnerId === user.id;
        } catch (error) {
          console.error('❌ Error completing battle:', error);
        }
      } else {
        // Start next round automatically
        try {
          const nextRoundNumber = roundNumber + 1;

          console.log(`[Battle ${battleId}] Both players finished round ${roundNumber}`);
          console.log(`[Battle ${battleId}] Auto-generating round ${nextRoundNumber}`);

          const questions = await generateBattleQuestions(
            battle.created_by,
            battle.source_folder_id,
            battle.questions_per_round
          );

          const { data: nextRound, error: nextRoundError } = await supabase
            .from('battle_rounds')
            .insert({
              battle_id: battleId,
              round_number: nextRoundNumber,
              questions: questions
            })
            .select()
            .single();

          if (!nextRoundError && nextRound) {
            console.log(`[Battle ${battleId}] Round ${nextRoundNumber} created successfully`);

            // Remove correct answers before sending
            const questionsWithoutAnswers = questions.map(q => ({
              id: q.id,
              question: q.question,
              options: q.options,
              topic: q.topic,
              difficulty: q.difficulty
            }));

            response.nextRound = {
              ...nextRound,
              questions: questionsWithoutAnswers
            };
            response.nextRoundReady = true;
          } else {
            console.error(`[Battle ${battleId}] Failed to create round ${nextRoundNumber}:`, nextRoundError);
          }
        } catch (error) {
          console.error('Error starting next round:', error);
          // Non-critical - round can be started manually
        }
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Unexpected error in POST /battles/[battleId]/submit-round:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
