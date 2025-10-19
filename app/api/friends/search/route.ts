import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/friends/search?q=query
 * Search for users by name or email
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

    // Get search query
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Search query must be at least 2 characters' },
        { status: 400 }
      );
    }

    // Search users by name or email (case-insensitive)
    const { data: users, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .neq('id', user.id)  // Exclude current user
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(20);

    if (error) {
      console.error('Error searching users:', error);
      return NextResponse.json(
        { error: 'Failed to search users' },
        { status: 500 }
      );
    }

    // Fetch current user's connections to show connection status
    const { data: connections } = await supabase
      .from('user_connections')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`);

    // Create a map of connection statuses
    const connectionMap = new Map<string, any>();
    connections?.forEach(conn => {
      const otherUserId = conn.user_id === user.id ? conn.friend_id : conn.user_id;
      connectionMap.set(otherUserId, {
        status: conn.status,
        requested_by: conn.requested_by,
        connection_id: conn.id
      });
    });

    // Add connection status to each user
    const usersWithStatus = users?.map(u => {
      const connection = connectionMap.get(u.id);

      let connectionStatus = 'none';
      let connectionId = null;

      if (connection) {
        if (connection.status === 'accepted') {
          connectionStatus = 'friends';
        } else if (connection.status === 'pending') {
          connectionStatus = connection.requested_by === user.id
            ? 'request_sent'
            : 'request_received';
        } else if (connection.status === 'blocked') {
          connectionStatus = 'blocked';
        }
        connectionId = connection.connection_id;
      }

      return {
        ...u,
        connection_status: connectionStatus,
        connection_id: connectionId
      };
    });

    return NextResponse.json({
      success: true,
      users: usersWithStatus || []
    });
  } catch (error) {
    console.error('Unexpected error in GET /friends/search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
