import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateBattleQuestions } from '@/lib/battles/question-generator';

/**
 * POST /api/battles/[battleId]/accept
 * Accept a battle challenge and start first round
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

    // Verify user is the opponent
    if (battle.opponent_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the opponent can accept this battle' },
        { status: 403 }
      );
    }

    // Verify status is pending
    if (battle.status !== 'pending') {
      return NextResponse.json(
        { error: 'Battle is not pending' },
        { status: 400 }
      );
    }

    // Update battle status to active
    const { error: updateError } = await supabase
      .from('quiz_battles')
      .update({ status: 'active' })
      .eq('id', battleId);

    if (updateError) {
      console.error('Error updating battle status:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept battle' },
        { status: 500 }
      );
    }

    // Generate questions for first round
    let firstRound;
    try {
      console.log('🎮 Accepting battle:', {
        battleId,
        challenger: battle.created_by,
        opponent: user.id,
        folderId: battle.source_folder_id,
        folderName: battle.source_folder_name,
        questionsPerRound: battle.questions_per_round
      });

      const questions = await generateBattleQuestions(
        battle.created_by,
        battle.source_folder_id,
        battle.questions_per_round
      );

      console.log(`✅ Generated ${questions.length} questions for battle`);

      // Create first round
      const { data: round, error: roundError } = await supabase
        .from('battle_rounds')
        .insert({
          battle_id: battleId,
          round_number: 1,
          questions: questions
        })
        .select()
        .single();

      if (roundError || !round) {
        console.error('Error creating first round:', roundError);
        throw new Error('Failed to create first round');
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

      firstRound = {
        ...round,
        questions: questionsWithoutAnswers
      };
    } catch (error) {
      console.error('❌ Error generating questions:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Rollback battle status
      await supabase
        .from('quiz_battles')
        .update({ status: 'pending' })
        .eq('id', battleId);

      return NextResponse.json(
        {
          error: 'Failed to generate questions for battle. Please ensure the folder has completed lectures.',
          details: error instanceof Error ? error.message : 'Unknown error'
        },
        { status: 500 }
      );
    }

    // Note: Notification is automatically created by database trigger

    return NextResponse.json({
      success: true,
      battle: {
        id: battle.id,
        status: 'active',
        source_folder_name: battle.source_folder_name,
        rounds_count: battle.rounds_count,
        questions_per_round: battle.questions_per_round
      },
      firstRound
    });
  } catch (error) {
    console.error('Unexpected error in POST /battles/[battleId]/accept:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
