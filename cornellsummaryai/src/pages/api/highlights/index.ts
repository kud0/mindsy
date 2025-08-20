import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '@/lib/supabase-server';
import type { CreateHighlightData } from '@/types/highlights';

// GET /api/highlights - Get user's highlights for a specific job
export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const url = new URL(request.url);
    const jobId = url.searchParams.get('job_id');
    const pageNumber = url.searchParams.get('page');

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'job_id parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);
    
    let query = supabase
      .from('highlights')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .order('created_at', { ascending: true });

    // Filter by page if specified
    if (pageNumber) {
      const pageNum = parseInt(pageNumber);
      if (!isNaN(pageNum)) {
        query = query.eq('page_number', pageNum);
      }
    }

    const { data: highlights, error } = await query;

    if (error) {
      console.error('Error fetching highlights:', error);
      return new Response(JSON.stringify({ error: 'Failed to fetch highlights' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ highlights: highlights || [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Highlights API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/highlights - Create a new highlight
export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const { user, response } = await requireAuth(cookies);
    if (response) return response;

    const body = await request.json();
    const highlightData: CreateHighlightData = body;
    
    // Validate required fields
    if (!highlightData.job_id || !highlightData.selected_text || !highlightData.position_data || !highlightData.page_number) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);
    
    // Verify the job belongs to the user
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('job_id')
      .eq('job_id', highlightData.job_id)
      .eq('user_id', user.id)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: 'Job not found or access denied' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newHighlight = {
      user_id: user.id,
      job_id: highlightData.job_id,
      page_number: highlightData.page_number,
      selected_text: highlightData.selected_text.trim(),
      position_data: highlightData.position_data,
      color: highlightData.color || 'yellow',
      note: highlightData.note?.trim() || null
    };
    
    const { data: highlight, error } = await supabase
      .from('highlights')
      .insert([newHighlight])
      .select()
      .single();

    if (error) {
      console.error('Error creating highlight:', error);
      return new Response(JSON.stringify({ error: 'Failed to create highlight' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ highlight }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Create highlight error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};