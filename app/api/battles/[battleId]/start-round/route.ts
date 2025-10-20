import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserParticipant, checkBothPlayersSubmitted } from '@/lib/battles/battle-utils';
import { generateBattleQuestions } from '@/lib/battles/question-generator';

/**
 * POST /api/battles/[battleId]/start-round
 * Start next round (auto-called after previous round completes)
 *
 * Body: { roundNumber: number }
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
        { error: 'Not authorized to start round in this battle' },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { roundNumber } = body;

    if (!roundNumber || roundNumber < 1) {
      return NextResponse.json(
        { error: 'Invalid round number' },
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

    // Verify round number is valid
    if (roundNumber > battle.rounds_count) {
      return NextResponse.json(
        { error: 'Round number exceeds battle rounds count' },
        { status: 400 }
      );
    }

    // Check if round already exists
    const { data: existingRound } = await supabase
      .from('battle_rounds')
      .select('id')
      .eq('battle_id', battleId)
      .eq('round_number', roundNumber)
      .single();

    if (existingRound) {
      return NextResponse.json(
        { error: 'Round already exists' },
        { status: 400 }
      );
    }

    // If not round 1, verify previous round is complete
    if (roundNumber > 1) {
      const { bothSubmitted } = await checkBothPlayersSubmitted(battleId, roundNumber - 1);

      if (!bothSubmitted) {
        return NextResponse.json(
          { error: 'Previous round not completed by both players' },
          { status: 400 }
        );
      }
    }

    // Generate questions
    console.log(`🎮 Generating ${battle.questions_per_round} questions for battle ${battleId}, round ${roundNumber}`);

    const questions = await generateBattleQuestions(
      battle.created_by,
      battle.source_folder_id,
      battle.questions_per_round
    );

    if (!questions || questions.length === 0) {
      console.error('❌ Failed to generate questions - received empty array');
      return NextResponse.json(
        { error: 'Failed to generate questions for battle. Please ensure your folder has completed lectures with content, and check that GROK_API_KEY is configured.' },
        { status: 500 }
      );
    }

    console.log(`✅ Generated ${questions.length} questions successfully`);

    // Create round
    const { data: round, error: roundError } = await supabase
      .from('battle_rounds')
      .insert({
        battle_id: battleId,
        round_number: roundNumber,
        questions: questions
      })
      .select()
      .single();

    if (roundError || !round) {
      console.error('Error creating round:', roundError);
      return NextResponse.json(
        { error: 'Failed to create round' },
        { status: 500 }
      );
    }

    // Remove correct answers from questions before sending to client
    const questionsWithoutAnswers = questions.map(q => ({
      id: q.id,
      question: q.question,
      options: q.options,
      topic: q.topic,
      difficulty: q.difficulty
      // correctAnswer is intentionally omitted
    }));

    return NextResponse.json({
      success: true,
      round: {
        ...round,
        questions: questionsWithoutAnswers
      }
    });
  } catch (error) {
    console.error('Unexpected error in POST /battles/[battleId]/start-round:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
