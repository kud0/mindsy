import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '@/lib/supabase-server';
import type { UpdateHighlightData } from '@/types/highlights';

// PUT /api/highlights/[id] - Update a highlight
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const highlightId = params?.id;
    if (!highlightId) {
      return new Response(JSON.stringify({ error: 'Highlight ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const updateData: UpdateHighlightData = body;

    const supabase = createClient(cookies);

    // Prepare update object (only include provided fields)
    const updates: any = {};
    if (updateData.color) updates.color = updateData.color;
    if (updateData.note !== undefined) updates.note = updateData.note?.trim() || null;

    if (Object.keys(updates).length === 0) {
      return new Response(JSON.stringify({ error: 'No update data provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { data: highlight, error } = await supabase
      .from('highlights')
      .update(updates)
      .eq('id', highlightId)
      .eq('user_id', user.id) // Ensure user can only update their own highlights
      .select()
      .single();

    if (error) {
      console.error('Error updating highlight:', error);
      return new Response(JSON.stringify({ error: 'Failed to update highlight' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!highlight) {
      return new Response(JSON.stringify({ error: 'Highlight not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ highlight }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Update highlight error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/highlights/[id] - Delete a highlight
export const DELETE: APIRoute = async ({ params, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const highlightId = params?.id;
    if (!highlightId) {
      return new Response(JSON.stringify({ error: 'Highlight ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);
    
    const { error } = await supabase
      .from('highlights')
      .delete()
      .eq('id', highlightId)
      .eq('user_id', user.id); // Ensure user can only delete their own highlights

    if (error) {
      console.error('Error deleting highlight:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete highlight' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Delete highlight error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};