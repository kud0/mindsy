import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * POST /api/friends/request
 * Send a friend request to another user
 *
 * Body: { friend_id: string }
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
    const { friend_id } = body;

    // Validate required fields
    if (!friend_id) {
      return NextResponse.json(
        { error: 'Missing required field: friend_id' },
        { status: 400 }
      );
    }

    // Prevent self-friending
    if (friend_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      );
    }

    // Check if friend user exists
    const { data: friendUser, error: friendError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', friend_id)
      .single();

    if (friendError || !friendUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Normalize order (user_id < friend_id)
    const [user_id_normalized, friend_id_normalized] =
      user.id < friend_id ? [user.id, friend_id] : [friend_id, user.id];

    // Check if connection already exists
    const { data: existing } = await supabase
      .from('user_connections')
      .select('*')
      .eq('user_id', user_id_normalized)
      .eq('friend_id', friend_id_normalized)
      .single();

    if (existing) {
      if (existing.status === 'accepted') {
        return NextResponse.json(
          { error: 'Already friends' },
          { status: 400 }
        );
      } else if (existing.status === 'pending') {
        return NextResponse.json(
          { error: 'Friend request already sent' },
          { status: 400 }
        );
      } else if (existing.status === 'blocked') {
        return NextResponse.json(
          { error: 'Cannot send friend request' },
          { status: 403 }
        );
      }
    }

    // Create friend request
    const { data: connection, error } = await supabase
      .from('user_connections')
      .insert({
        user_id: user_id_normalized,
        friend_id: friend_id_normalized,
        requested_by: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating friend request:', error);
      return NextResponse.json(
        { error: 'Failed to send friend request' },
        { status: 500 }
      );
    }

    // Note: Notification is automatically created by database trigger

    return NextResponse.json({
      success: true,
      connection
    });
  } catch (error) {
    console.error('Unexpected error in POST /friends/request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
