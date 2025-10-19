import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/notifications
 * Fetch all notifications for the current user
 *
 * Query params:
 * - unread_only: boolean (optional) - only return unread notifications
 * - limit: number (optional) - limit number of results (default: 50)
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread_only') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    // Build query
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    query = query
      .order('created_at', { ascending: false })
      .limit(limit);

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notifications' },
        { status: 500 }
      );
    }

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);

    return NextResponse.json({
      success: true,
      notifications: notifications || [],
      unread_count: unreadCount || 0
    });
  } catch (error) {
    console.error('Unexpected error in GET /notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Delete all notifications for the current user
 */
export async function DELETE(request: NextRequest) {
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

    // Delete all notifications
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting notifications:', error);
      return NextResponse.json(
        { error: 'Failed to delete notifications' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'All notifications deleted'
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /notifications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
