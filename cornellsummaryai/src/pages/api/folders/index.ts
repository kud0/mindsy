import type { APIRoute } from 'astro';
import { supabaseAdmin, requireAuth } from '../../../lib/supabase-server';

// GET /api/folders - Get all user's folders with hierarchy
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Use requireAuth for consistent authentication
    const { user } = await requireAuth(request);

    // Get folder hierarchy using our function
    const { data: folders, error } = await supabaseAdmin
      .rpc('get_folder_hierarchy', { p_user_id: user.id });

    if (error) {
      console.error('Error fetching folders:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch folders' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ folders: folders || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Folders API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/folders - Create a new folder
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Use requireAuth for consistent authentication
    const { user } = await requireAuth(request);

    // Parse request body
    const body = await request.json();
    const { name, parentId, color, icon } = body;

    if (!name) {
      return new Response(JSON.stringify({ error: 'Folder name is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Creating folder with name:', name, 'parentId:', parentId);

    // Create the folder
    const { data: folder, error } = await supabaseAdmin
      .from('folders')
      .insert({
        user_id: user.id,
        name,
        parent_id: parentId || null,
        color: color || '#3B82F6',
        icon: icon || '📁'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating folder:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return new Response(JSON.stringify({ 
        error: 'Failed to create folder',
        details: error.message || error.toString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ folder }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create folder API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT /api/folders - Update a folder
export const PUT: APIRoute = async ({ request, cookies }) => {
  try {
    // Use requireAuth for consistent authentication
    const { user } = await requireAuth(request);

    // Parse request body
    const body = await request.json();
    const { id, name, color, icon } = body;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Folder ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update the folder
    const { data: folder, error } = await supabaseAdmin
      .from('folders')
      .update({
        name,
        color,
        icon,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating folder:', error);
      return new Response(JSON.stringify({ error: 'Failed to update folder' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ folder }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update folder API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/folders - Delete a folder
export const DELETE: APIRoute = async ({ request, cookies }) => {
  try {
    // Use requireAuth for consistent authentication
    const { user } = await requireAuth(request);

    // Get folder ID from query params
    const url = new URL(request.url);
    const folderId = url.searchParams.get('id');

    if (!folderId) {
      return new Response(JSON.stringify({ error: 'Folder ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete the folder (will cascade delete subfolders)
    const { error } = await supabaseAdmin
      .from('folders')
      .delete()
      .eq('id', folderId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error deleting folder:', error);
      return new Response(JSON.stringify({ error: 'Failed to delete folder' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete folder API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};