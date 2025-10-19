import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/friends/[id]
 * Remove a friend connection or reject a friend request
 */
export async function DELETE(
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

    // Fetch the connection to verify ownership
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

    // Delete the connection
    const { error: deleteError } = await supabase
      .from('user_connections')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting connection:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete connection' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: connection.status === 'accepted'
        ? 'Friend removed successfully'
        : 'Friend request cancelled/rejected'
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /friends:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
