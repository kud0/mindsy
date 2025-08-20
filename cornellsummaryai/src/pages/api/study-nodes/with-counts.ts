import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '../../../lib/supabase-server';

// GET /api/study-nodes/with-counts - Get study nodes with note counts
export const GET: APIRoute = async ({ cookies }) => {
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

    // Try to use the function first
    const { data: nodes, error } = await supabase
      .rpc('get_study_nodes_with_counts', {
        p_user_id: user.id
      });

    if (error) {
      console.error('Error fetching study nodes with counts:', error);
      
      // Fallback to manual query if function doesn't exist
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        // Get all study nodes for the user
        const { data: studyNodes, error: nodesError } = await supabase
          .from('study_nodes')
          .select('*')
          .eq('user_id', user.id)
          .order('sort_order')
          .order('name');

        if (nodesError) {
          return new Response(JSON.stringify({ error: 'Failed to fetch study nodes' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Get note counts for each node
        const nodesWithCounts = await Promise.all(
          (studyNodes || []).map(async (node) => {
            // Get direct note count
            const { count: directCount } = await supabase
              .from('jobs')
              .select('job_id', { count: 'exact', head: true })
              .eq('study_node_id', node.id)
              .eq('status', 'completed');

            // Get all descendants
            const { data: descendants } = await supabase
              .rpc('get_node_descendants', {
                node_id: node.id,
                max_depth: null
              }).catch(() => ({ data: [] }));

            // Get total count including descendants
            let totalCount = directCount || 0;
            if (descendants && descendants.length > 0) {
              const descendantIds = descendants.map(d => d.id);
              const { count: descendantCount } = await supabase
                .from('jobs')
                .select('job_id', { count: 'exact', head: true })
                .in('study_node_id', descendantIds)
                .eq('status', 'completed');
              
              totalCount += descendantCount || 0;
            }

            return {
              ...node,
              note_count: directCount || 0,
              total_note_count: totalCount
            };
          })
        );

        return new Response(JSON.stringify({ 
          nodes: nodesWithCounts 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      return new Response(JSON.stringify({ error: 'Failed to fetch study nodes' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build tree structure with counts
    const buildTreeWithCounts = (flatNodes: any[]): any[] => {
      const nodeMap = new Map();
      const rootNodes: any[] = [];

      // First pass: create all nodes
      flatNodes.forEach(node => {
        nodeMap.set(node.id, { ...node, children: [] });
      });

      // Second pass: build tree
      flatNodes.forEach(node => {
        const currentNode = nodeMap.get(node.id);
        if (node.parent_id && nodeMap.has(node.parent_id)) {
          const parent = nodeMap.get(node.parent_id);
          if (!parent.children) parent.children = [];
          parent.children.push(currentNode);
        } else {
          rootNodes.push(currentNode);
        }
      });

      return rootNodes;
    };

    const treeNodes = buildTreeWithCounts(nodes || []);

    return new Response(JSON.stringify({ 
      nodes: treeNodes,
      flat: nodes || []
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Study nodes with counts API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};