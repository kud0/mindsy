import type { APIRoute } from 'astro';
import { createClient } from '@/lib/supabase-server';

export const GET: APIRoute = async ({ cookies }) => {
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
    // Call the stored procedure to get pinned nodes with hierarchy
    const { data, error } = await supabase.rpc('get_pinned_nodes', {
      p_user_id: user.id
    });

    if (error) throw error;

    return new Response(JSON.stringify({ nodes: data || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching pinned nodes:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch pinned nodes' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};