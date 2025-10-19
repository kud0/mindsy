import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notifications/[id]
 * Mark a notification as read/unread
 *
 * Body: { read: boolean }
 */
export async function PATCH(
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

    // Parse request body
    const body = await request.json();
    const { read } = body;

    if (typeof read !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid body: read must be a boolean' },
        { status: 400 }
      );
    }

    // Update notification
    const { data: notification, error } = await supabase
      .from('notifications')
      .update({ read })
      .eq('id', id)
      .eq('user_id', user.id)  // Ensure user owns this notification
      .select()
      .single();

    if (error || !notification) {
      console.error('Error updating notification:', error);
      return NextResponse.json(
        { error: 'Failed to update notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notification
    });
  } catch (error) {
    console.error('Unexpected error in PATCH /notifications/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete a specific notification
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

    // Delete notification
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);  // Ensure user owns this notification

    if (error) {
      console.error('Error deleting notification:', error);
      return NextResponse.json(
        { error: 'Failed to delete notification' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Notification deleted'
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /notifications/[id]:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
