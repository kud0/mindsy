import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const accessToken = cookies.get('sb-access-token')?.value;
    const refreshToken = cookies.get('sb-refresh-token')?.value;

    if (!accessToken || !refreshToken) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'User not found' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all folders for the user
    const { data: folders, error: foldersError } = await supabase
      .from('folders')
      .select('id, name, parent_id')
      .eq('user_id', user.id)
      .order('name');

    if (foldersError) {
      console.error('Error fetching folders:', foldersError);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch folders',
        details: foldersError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Count notes in each folder
    const foldersWithCount = await Promise.all((folders || []).map(async (folder) => {
      const { count } = await supabase
        .from('notes')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('folder_id', folder.id);

      return {
        id: folder.id,
        name: folder.name,
        parentId: folder.parent_id,
        noteCount: count || 0
      };
    }));

    // Also include "unfiled" as a special folder
    const { count: unfiledCount } = await supabase
      .from('notes')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('folder_id', null);

    const allFolders = [
      {
        id: 'unfiled',
        name: 'Unfiled',
        parentId: null,
        noteCount: unfiledCount || 0
      },
      ...foldersWithCount
    ];

    return new Response(JSON.stringify({
      folders: allFolders
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in folders list:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to fetch folders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};