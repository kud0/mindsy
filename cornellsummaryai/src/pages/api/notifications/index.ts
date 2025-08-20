import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '@/lib/supabase-server';
import { NotificationService } from '@/lib/notification-service';

// GET /api/notifications - Get user's notifications
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const unreadOnly = url.searchParams.get('unread') === 'true';

    const supabase = createClient(cookies);
    
    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (unreadOnly) {
      query = query.eq('read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      console.error('Error fetching notifications:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch notifications' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ notifications: notifications || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notifications API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/notifications - Create notification
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const body = await request.json();
    
    // Use the regular Supabase client instead of NotificationService
    const supabase = createClient(cookies);
    
    const notificationData = {
      user_id: user.id,
      title: body.title,
      message: body.message || null,
      type: body.type || 'info',
      category: body.category || 'general',
      read: false,
      related_id: body.related_id || null,
      related_type: body.related_type || null,
      action_url: body.action_url || null,
      metadata: body.metadata || {}
    };
    
    const { data: notification, error } = await supabase
      .from('notifications')
      .insert([notificationData])
      .select()
      .single();

    if (error) {
      console.error('Error creating notification:', error);
      return new Response(JSON.stringify({ error: 'Failed to create notification' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ notification }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create notification error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};