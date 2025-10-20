import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isUserParticipant, checkBothPlayersSubmitted } from '@/lib/battles/battle-utils';

/**
 * GET /api/battles/[battleId]/round-results
 * Get results after both players submit a round
 * Query: ?roundNumber=X
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
        { error: 'Not authorized to view results for this battle' },
        { status: 403 }
      );
    }

    // Get round number from query params
    const searchParams = request.nextUrl.searchParams;
    const roundNumber = parseInt(searchParams.get('roundNumber') || '1');

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

    // Check if both players submitted
    const { bothSubmitted } = await checkBothPlayersSubmitted(battleId, roundNumber);

    if (!bothSubmitted) {
      return NextResponse.json(
        { error: 'Round not completed by both players yet' },
        { status: 400 }
      );
    }

    // Get round with questions (including correct answers now)
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

    // Get both submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('battle_participants')
      .select('*')
      .eq('battle_id', battleId)
      .eq('round_number', roundNumber);

    if (submissionsError || !submissions || submissions.length < 2) {
      return NextResponse.json(
        { error: 'Failed to fetch submissions' },
        { status: 500 }
      );
    }

    // Separate user and opponent submissions
    const userSubmission = submissions.find(s => s.user_id === user.id);
    const opponentSubmission = submissions.find(s => s.user_id !== user.id);

    if (!userSubmission || !opponentSubmission) {
      return NextResponse.json(
        { error: 'Submissions not found' },
        { status: 404 }
      );
    }

    // Build question results with both players' answers
    const questionResults = round.questions.map((q: {
      id: string;
      question: string;
      options: { A: string; B: string; C: string; D: string };
      correctAnswer: string;
      topic: string;
      difficulty: string;
    }) => {
      const userAnswer = userSubmission.answers[q.id];
      const opponentAnswer = opponentSubmission.answers[q.id];

      return {
        id: q.id,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        topic: q.topic,
        difficulty: q.difficulty,
        userAnswer,
        opponentAnswer,
        userCorrect: userAnswer?.toUpperCase() === q.correctAnswer?.toUpperCase(),
        opponentCorrect: opponentAnswer?.toUpperCase() === q.correctAnswer?.toUpperCase()
      };
    });

    return NextResponse.json({
      success: true,
      roundNumber,
      userScore: userSubmission.score,
      opponentScore: opponentSubmission.score,
      userTime: userSubmission.time_taken,
      opponentTime: opponentSubmission.time_taken,
      userWon: userSubmission.score > opponentSubmission.score,
      questions: questionResults
    });
  } catch (error) {
    console.error('Unexpected error in GET /battles/[battleId]/round-results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
