import type { APIRoute } from 'astro';
import { createClient } from '@/lib/supabase-server';

export const POST: APIRoute = async ({ request, cookies }) => {
  const supabase = createClient(cookies);
  
  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const body = await request.json();
    const { noteIds, nodeId } = body;

    if (!noteIds || !Array.isArray(noteIds) || noteIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Note IDs are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If nodeId is provided, verify the user owns it
    if (nodeId) {
      const { data: nodeData, error: nodeError } = await supabase
        .from('study_nodes')
        .select('id')
        .eq('id', nodeId)
        .eq('user_id', user.id)
        .single();

      if (nodeError || !nodeData) {
        return new Response(JSON.stringify({ error: 'Invalid study node' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Update notes with the new study node
    const { error } = await supabase
      .from('notes')
      .update({ 
        study_node_id: nodeId || null,
        folder_id: null // Clear old folder association
      })
      .in('id', noteIds)
      .eq('user_id', user.id); // Ensure user owns the notes

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating note associations:', error);
    return new Response(JSON.stringify({ error: 'Failed to update note associations' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};