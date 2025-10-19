import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/friends/accept/[id]
 * Accept a friend request
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { id } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch the connection
    const { data: connection, error: fetchError } = await supabase
      .from('user_connections')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !connection) {
      return NextResponse.json(
        { error: 'Connection not found' },
        { status: 404 }
      );
    }

    // Verify user is part of this connection
    if (connection.user_id !== user.id && connection.friend_id !== user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    // Verify connection is pending
    if (connection.status !== 'pending') {
      return NextResponse.json(
        { error: 'Connection is not pending' },
        { status: 400 }
      );
    }

    // Verify user is NOT the one who sent the request
    if (connection.requested_by === user.id) {
      return NextResponse.json(
        { error: 'Cannot accept your own friend request' },
        { status: 400 }
      );
    }

    // Accept the request
    const { data: updated, error: updateError } = await supabase
      .from('user_connections')
      .update({ status: 'accepted' })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Error accepting friend request:', updateError);
      return NextResponse.json(
        { error: 'Failed to accept friend request' },
        { status: 500 }
      );
    }

    // Note: Notification is automatically created by database trigger

    return NextResponse.json({
      success: true,
      connection: updated
    });
  } catch (error) {
    console.error('Unexpected error in POST /friends/accept:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
