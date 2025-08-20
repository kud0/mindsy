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
    const searchType = url.searchParams.get('type') || 'all'; // all, title, content

    if (!query || query.trim().length === 0) {
      return new Response(JSON.stringify({ results: [] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let results = [];

    if (searchType === 'all' || searchType === 'title') {
      // Search in job titles and course subjects
      const { data: titleResults, error: titleError } = await supabase
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
          notes!inner (
            id,
            title,
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
        .eq('status', 'completed')
        .or(`lecture_title.ilike.%${query}%,course_subject.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (titleError) {
        console.error('Title search error:', titleError);
      } else {
        results = [...results, ...(titleResults || []).map(job => ({
          ...job,
          matchType: 'title',
          relevance: 1.0
        }))];
      }
    }

    if (searchType === 'all' || searchType === 'content') {
      // Search in notes content (summary and notes)
      const { data: contentResults, error: contentError } = await supabase
        .from('notes')
        .select(`
          id,
          title,
          summary_section,
          created_at,
          job_id,
          jobs!inner (
            job_id,
            lecture_title,
            course_subject,
            status,
            file_size_mb,
            study_node_id,
            generated_pdf_path,
            audio_file_path,
            pdf_file_path,
            study_nodes (
              id,
              name,
              type,
              parent_id
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('jobs.status', 'completed')
        .or(`summary_section.ilike.%${query}%,notes_column.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (contentError) {
        console.error('Content search error:', contentError);
      } else {
        const contentJobResults = (contentResults || []).map(note => ({
          job_id: note.job_id,
          lecture_title: note.jobs.lecture_title,
          course_subject: note.jobs.course_subject,
          created_at: note.created_at,
          status: note.jobs.status,
          file_size_mb: note.jobs.file_size_mb,
          study_node_id: note.jobs.study_node_id,
          study_nodes: note.jobs.study_nodes,
          generated_pdf_path: note.jobs.generated_pdf_path,
          audio_file_path: note.jobs.audio_file_path,
          pdf_file_path: note.jobs.pdf_file_path,
          notes: [{
            id: note.id,
            title: note.title,
            summary_section: note.summary_section
          }],
          matchType: 'content',
          relevance: 0.8
        }));

        // Merge with existing results, avoiding duplicates
        const existingJobIds = new Set(results.map(r => r.job_id));
        const newResults = contentJobResults.filter(r => !existingJobIds.has(r.job_id));
        results = [...results, ...newResults];
      }
    }

    // Sort by relevance and date
    results.sort((a, b) => {
      // First by relevance
      if (a.relevance !== b.relevance) {
        return b.relevance - a.relevance;
      }
      // Then by date
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Format results for the frontend
    const formattedResults = results.slice(0, 20).map(job => ({
      id: job.job_id,
      noteId: job.notes?.[0]?.id || null,
      title: job.lecture_title || 'Untitled',
      createdAt: job.created_at,
      status: job.status,
      courseSubject: job.course_subject,
      fileSize: job.file_size_mb,
      hasNotes: job.notes && job.notes.length > 0,
      matchType: job.matchType,
      excerpt: job.notes?.[0]?.summary_section ? 
        job.notes[0].summary_section.substring(0, 150) + '...' : null,
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
    }));

    return new Response(JSON.stringify({ 
      results: formattedResults,
      totalCount: formattedResults.length,
      query: query
    }), {
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