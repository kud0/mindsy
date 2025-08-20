import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '../../../lib/supabase-server';

// GET /api/notes/by-study-node - Get notes for a specific study node
export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Check authentication
    const { user, response } = await requireAuth(cookies);
    if (response) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);
    const studyNodeId = url.searchParams.get('nodeId');
    const includeDescendants = url.searchParams.get('includeDescendants') !== 'false';

    if (!studyNodeId) {
      return new Response(JSON.stringify({ error: 'Study node ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get notes for the study node
    const { data: notes, error } = await supabase
      .rpc('get_study_node_notes', {
        p_study_node_id: studyNodeId,
        p_user_id: user.id,
        p_include_descendants: includeDescendants
      });

    if (error) {
      console.error('Error fetching notes by study node:', error);
      
      // Fallback to direct query if function doesn't exist
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        let query = supabase
          .from('jobs')
          .select(`
            job_id,
            lecture_title,
            course_subject,
            created_at,
            status,
            file_size_mb,
            audio_duration,
            study_node_id,
            txt_file_path,
            output_pdf_path,
            md_file_path,
            study_nodes (
              id,
              name,
              type,
              parent_id
            )
          `)
          .eq('user_id', user.id)
          .eq('status', 'completed');

        if (includeDescendants) {
          // Get all descendant node IDs first
          const { data: descendants } = await supabase
            .rpc('get_node_descendants', {
              node_id: studyNodeId,
              max_depth: null
            });
          
          if (descendants && descendants.length > 0) {
            const nodeIds = [studyNodeId, ...descendants.map(d => d.id)];
            query = query.in('study_node_id', nodeIds);
          } else {
            query = query.eq('study_node_id', studyNodeId);
          }
        } else {
          query = query.eq('study_node_id', studyNodeId);
        }

        const { data: fallbackNotes, error: fallbackError } = await query
          .order('created_at', { ascending: false });

        if (fallbackError) {
          return new Response(JSON.stringify({ error: 'Failed to fetch notes' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ 
          notes: fallbackNotes || [],
          studyNodeId,
          includeDescendants
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Failed to fetch notes' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      notes: notes || [],
      studyNodeId,
      includeDescendants
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notes by study node API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/notes/by-study-node - Get notes for multiple study nodes
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Check authentication
    const { user, response } = await requireAuth(cookies);
    if (response) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);
    const body = await request.json();
    const { nodeIds, includeDescendants = true } = body;

    if (!nodeIds || !Array.isArray(nodeIds) || nodeIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Node IDs are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get all notes for the specified nodes
    let allNodeIds = [...nodeIds];

    if (includeDescendants) {
      // Get descendants for each node
      for (const nodeId of nodeIds) {
        const { data: descendants } = await supabase
          .rpc('get_node_descendants', {
            node_id: nodeId,
            max_depth: null
          });
        
        if (descendants && descendants.length > 0) {
          allNodeIds.push(...descendants.map(d => d.id));
        }
      }
    }

    // Remove duplicates
    allNodeIds = [...new Set(allNodeIds)];

    // Get all notes for these nodes
    const { data: notes, error } = await supabase
      .from('jobs')
      .select(`
        job_id,
        lecture_title,
        course_subject,
        created_at,
        status,
        file_size_mb,
        audio_duration,
        study_node_id,
        txt_file_path,
        output_pdf_path,
        md_file_path,
        study_nodes (
          id,
          name,
          type,
          parent_id
        )
      `)
      .eq('user_id', user.id)
      .eq('status', 'completed')
      .in('study_node_id', allNodeIds)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes for multiple study nodes:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch notes' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      notes: notes || [],
      nodeIds: allNodeIds,
      includeDescendants
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Notes by study nodes API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};