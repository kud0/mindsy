import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '@/lib/supabase-server';

// PUT /api/notifications/[id]/read - Mark notification as read
export const PUT: APIRoute = async ({ params, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const notificationId = params.id;
    if (!notificationId) {
      return new Response(JSON.stringify({ error: 'Notification ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error marking notification as read:', error);
      return new Response(JSON.stringify({ error: 'Failed to mark notification as read' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Mark as read error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};