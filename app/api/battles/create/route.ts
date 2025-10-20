import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkFriendship } from '@/lib/battles/battle-utils';

/**
 * POST /api/battles/create
 * Create a quiz battle challenge
 *
 * Body: {
 *   opponentId: string;
 *   folderId: string;
 *   folderName: string;
 *   roundsCount?: number; // default 3
 *   questionsPerRound?: number; // default 5
 * }
 */
export async function POST(request: NextRequest) {
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

    // Parse request body
    const body = await request.json();
    const {
      opponentId,
      folderId,
      folderName,
      roundsCount = 3,
      questionsPerRound = 5
    } = body;

    // Validate required fields
    if (!opponentId || !folderId || !folderName) {
      return NextResponse.json(
        { error: 'Missing required fields: opponentId, folderId, folderName' },
        { status: 400 }
      );
    }

    // Prevent self-challenge
    if (opponentId === user.id) {
      return NextResponse.json(
        { error: 'Cannot challenge yourself' },
        { status: 400 }
      );
    }

    // Verify friendship
    const areFriends = await checkFriendship(user.id, opponentId);
    if (!areFriends) {
      return NextResponse.json(
        { error: 'Can only challenge friends' },
        { status: 403 }
      );
    }

    // Verify folder exists and belongs to user
    const { data: folder, error: folderError } = await supabase
      .from('user_folders')
      .select('id, folder_name')
      .eq('id', folderId)
      .eq('user_id', user.id)
      .single();

    if (folderError || !folder) {
      return NextResponse.json(
        { error: 'Folder not found or does not belong to you' },
        { status: 404 }
      );
    }

    // Verify folder has completed lectures
    const { data: lectures, error: lecturesError } = await supabase
      .from('jobs')
      .select('job_id')
      .eq('user_folder_id', folderId)
      .eq('status', 'completed')
      .limit(1);

    if (lecturesError || !lectures || lectures.length === 0) {
      return NextResponse.json(
        { error: 'Folder must have at least one completed lecture' },
        { status: 400 }
      );
    }

    // Validate rounds and questions
    if (roundsCount < 1 || roundsCount > 10) {
      return NextResponse.json(
        { error: 'Rounds count must be between 1 and 10' },
        { status: 400 }
      );
    }

    if (questionsPerRound < 1 || questionsPerRound > 20) {
      return NextResponse.json(
        { error: 'Questions per round must be between 1 and 20' },
        { status: 400 }
      );
    }

    // Create battle
    const { data: battle, error: battleError } = await supabase
      .from('quiz_battles')
      .insert({
        created_by: user.id,
        opponent_id: opponentId,
        source_folder_id: folderId,
        source_folder_name: folderName,
        rounds_count: roundsCount,
        questions_per_round: questionsPerRound,
        status: 'pending'
      })
      .select()
      .single();

    if (battleError || !battle) {
      console.error('Error creating battle:', battleError);
      return NextResponse.json(
        { error: 'Failed to create battle' },
        { status: 500 }
      );
    }

    // Note: Notification is automatically created by database trigger

    return NextResponse.json({
      success: true,
      battle: {
        id: battle.id,
        status: battle.status,
        source_folder_name: battle.source_folder_name,
        rounds_count: battle.rounds_count,
        questions_per_round: battle.questions_per_round,
        created_at: battle.created_at
      }
    });
  } catch (error) {
    console.error('Unexpected error in POST /battles/create:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
