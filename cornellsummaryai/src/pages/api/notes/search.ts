import type { APIRoute } from 'astro';
import { requireAuth, createClient } from '../../../lib/supabase-server';

export const GET: APIRoute = async ({ cookies, url }) => {
  try {
    // Check authentication
    const { user, response } = await requireAuth(cookies);
    if (response) {
      // Return 401 instead of redirect for API calls
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(cookies);
    const query = url.searchParams.get('q');

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Search in jobs table with notes and study nodes
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select(`
        job_id,
        lecture_title,
        course_subject,
        created_at,
        status,
        file_size_mb,
        study_node_id,
        generated_pdf_path,
        audio_file_path,
        pdf_file_path,
        notes (
          id,
          title,
          course_subject,
          notes_column,
          summary_section
        ),
        study_nodes (
          id,
          name,
          type,
          parent_id
        )
      `)
      .eq('user_id', user.id)
      .or(`lecture_title.ilike.%${query}%,course_subject.ilike.%${query}%`)
      .eq('status', 'completed') // Only search completed notes
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Search error:', error);
      return new Response(JSON.stringify({ error: 'Search failed' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Format results
    const results = jobs?.map(job => ({
      id: job.job_id,
      noteId: job.notes?.[0]?.id || null,
      title: job.lecture_title || 'Untitled',
      createdAt: job.created_at,
      status: job.status,
      courseSubject: job.course_subject,
      fileSize: job.file_size_mb,
      hasNotes: job.notes && job.notes.length > 0,
      studyNode: job.study_nodes ? {
        id: job.study_nodes.id,
        name: job.study_nodes.name,
        type: job.study_nodes.type
      } : null,
      studyNodeId: job.study_node_id,
      generatedPdfPath: job.generated_pdf_path,
      audioFilePath: job.audio_file_path,
      pdfFilePath: job.pdf_file_path,
      type: 'note' as const
    })) || [];

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Search API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};