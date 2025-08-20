import type { APIRoute } from 'astro';
import { supabaseAdmin, requireAuth } from '../../../lib/supabase-server';

// POST /api/notes/move - Move notes to a study node
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Use requireAuth for consistent authentication
    const { user } = await requireAuth(request);

    // Parse request body
    const body = await request.json();
    const { jobIds, studyNodeId, folderId } = body;

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Job IDs are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Support both studyNodeId (new) and folderId (legacy)
    const targetNodeId = studyNodeId || folderId || null;

    // Move jobs to study node (null removes from any node)
    const { data, error } = await supabaseAdmin
      .rpc('move_notes_to_study_node', {
        p_user_id: user.id,
        p_job_ids: jobIds,
        p_study_node_id: targetNodeId
      });

    if (error) {
      console.error('Error moving notes:', error);
      // Fallback to old function if new one doesn't exist
      if (error.message?.includes('function') && error.message?.includes('does not exist')) {
        const { data: fallbackData, error: fallbackError } = await supabaseAdmin
          .from('jobs')
          .update({ study_node_id: targetNodeId })
          .in('job_id', jobIds)
          .eq('user_id', user.id);
        
        if (fallbackError) {
          console.error('Fallback error:', fallbackError);
          return new Response(JSON.stringify({ error: 'Failed to move notes' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          movedCount: jobIds.length 
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      return new Response(JSON.stringify({ error: 'Failed to move notes' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      movedCount: data 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Move notes API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};