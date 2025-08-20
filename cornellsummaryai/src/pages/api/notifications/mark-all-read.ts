import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '@/lib/supabase-server';

// PUT /api/notifications/mark-all-read - Mark all notifications as read
export const PUT: APIRoute = async ({ cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const supabase = createClient(cookies);
    
    const { error } = await supabase
      .from('notifications')
      .update({ read: true, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('read', false);

    if (error) {
      console.error('Error marking all notifications as read:', error);
      return new Response(JSON.stringify({ error: 'Failed to mark all notifications as read' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Mark all as read error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};