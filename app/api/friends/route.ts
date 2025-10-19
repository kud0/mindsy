import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/friends
 * List all friends and pending friend requests
 *
 * Returns:
 * - friends: accepted connections
 * - sent_requests: pending requests sent by user
 * - received_requests: pending requests received by user
 */
export async function GET(request: NextRequest) {
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

    // Fetch all connections where user is involved
    const { data: connections, error } = await supabase
      .from('user_connections')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      return NextResponse.json(
        { error: 'Failed to fetch connections' },
        { status: 500 }
      );
    }

    // Get all unique user IDs to fetch profiles
    const userIds = new Set<string>();
    connections?.forEach(conn => {
      userIds.add(conn.user_id);
      userIds.add(conn.friend_id);
    });
    userIds.delete(user.id); // Remove current user

    // Fetch user profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', Array.from(userIds));

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
    }

    // Create a map of user profiles
    const profileMap = new Map(
      profiles?.map(p => [p.id, p]) || []
    );

    // Categorize connections
    const friends: any[] = [];
    const sentRequests: any[] = [];
    const receivedRequests: any[] = [];

    connections?.forEach(conn => {
      // Determine the other user
      const otherUserId = conn.user_id === user.id ? conn.friend_id : conn.user_id;
      const profile = profileMap.get(otherUserId);

      const connectionWithProfile = {
        ...conn,
        user: profile || {
          id: otherUserId,
          full_name: 'Unknown User',
          email: null,
          avatar_url: null
        }
      };

      if (conn.status === 'accepted') {
        friends.push(connectionWithProfile);
      } else if (conn.status === 'pending') {
        if (conn.requested_by === user.id) {
          sentRequests.push(connectionWithProfile);
        } else {
          receivedRequests.push(connectionWithProfile);
        }
      }
    });

    return NextResponse.json({
      success: true,
      friends,
      sent_requests: sentRequests,
      received_requests: receivedRequests
    });
  } catch (error) {
    console.error('Unexpected error in GET /friends:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
