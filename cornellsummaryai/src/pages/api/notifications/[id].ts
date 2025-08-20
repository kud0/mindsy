import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '@/lib/supabase-server';

// DELETE /api/notifications/[id] - Delete a specific notification
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const notificationId = params?.id;
    if (!notificationId) {
      return new Response(JSON.stringify({ error: 'Notification ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);
    
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', user.id); // Ensure user can only delete their own notifications

    if (error) {
      console.error('Error deleting notification:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete notification' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};