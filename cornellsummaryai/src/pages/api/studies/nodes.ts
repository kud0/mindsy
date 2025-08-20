import type { APIRoute } from 'astro';
import { createClient } from '@/lib/supabase-server';

export const GET: APIRoute = async ({ request, cookies }) => {
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
    // Fetch all study nodes for the user
    const { data, error } = await supabase
      .from('study_nodes')
      .select('*')
      .eq('user_id', user.id)
      .order('sort_order')
      .order('name');

    if (error) throw error;

    return new Response(JSON.stringify({ nodes: data || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching study nodes:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch study nodes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

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
    const { name, type, description, parent_id, color, icon } = body;

    if (!name || !type) {
      return new Response(JSON.stringify({ error: 'Name and type are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create new study node
    const { data, error } = await supabase
      .from('study_nodes')
      .insert({
        user_id: user.id,
        name,
        type,
        description: description || null,
        parent_id: parent_id || null,
        color: color || null,
        icon: icon || null,
        sort_order: 0
      })
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ node: data }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error creating study node:', error);
    return new Response(JSON.stringify({ error: 'Failed to create study node' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const PATCH: APIRoute = async ({ request, cookies }) => {
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
    const { id, name, description, is_pinned, color, icon, sort_order } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Node ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (is_pinned !== undefined) updateData.is_pinned = is_pinned;
    if (color !== undefined) updateData.color = color;
    if (icon !== undefined) updateData.icon = icon;
    if (sort_order !== undefined) updateData.sort_order = sort_order;

    // Update study node
    const { data, error } = await supabase
      .from('study_nodes')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user owns the node
      .select()
      .single();

    if (error) throw error;

    return new Response(JSON.stringify({ node: data }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating study node:', error);
    return new Response(JSON.stringify({ error: 'Failed to update study node' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: APIRoute = async ({ request, cookies }) => {
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
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ error: 'Node ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete study node (cascade will handle children and note associations)
    const { error } = await supabase
      .from('study_nodes')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id); // Ensure user owns the node

    if (error) throw error;

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting study node:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete study node' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};