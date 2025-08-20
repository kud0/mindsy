import type { APIRoute } from 'astro';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;
import { supabaseAdmin, requireAuth } from '../../lib/supabase-server';

export const GET: APIRoute = async ({ cookies, url }) => {
  console.log('[API Jobs] Fetching user jobs...');
  
  // Get query params
  const folderId = url.searchParams.get('folder');
  const studyNodeId = url.searchParams.get('studyNode');
  const jobId = url.searchParams.get('jobId');
  console.log('[API Jobs] Folder filter:', folderId, 'Study Node:', studyNodeId, 'Job ID:', jobId);
  
  try {
    // Create server-side Supabase client with cookies
    const supabase = createServerClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(key) {
            return cookies.get(key)?.value;
          },
          set(key, value, options) {
            cookies.set(key, value, options);
          },
          remove(key, options) {
            cookies.delete(key, options);
          },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('[API Jobs] Authentication failed:', authError);
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        data: null 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API Jobs] Authenticated user: ${user.email} (${user.id})`);

    // If jobId is specified, fetch single job status
    if (jobId) {
      const { data: job, error: jobError } = await supabase
        .from('jobs')
        .select('*')
        .eq('job_id', jobId)
        .eq('user_id', user.id)
        .single();
      
      if (jobError) {
        console.error('[API Jobs] Error fetching job:', jobError);
        return new Response(JSON.stringify({ 
          error: jobError.message,
          data: null 
        }), { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`[API Jobs] Job ${jobId} status: ${job?.status}`);
      return new Response(JSON.stringify(job), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Build query for jobs
    let query = supabase
      .from('jobs')
      .select('*')
      .eq('user_id', user.id);
    
    // Apply study node filter if specified (takes precedence)
    if (studyNodeId === 'unfiled') {
      // Show only jobs without a study node
      query = query.is('study_node_id', null);
    } else if (studyNodeId && studyNodeId !== 'all') {
      // Show only jobs in the specified study node
      query = query.eq('study_node_id', studyNodeId);
    }
    // Apply folder filter if no study node filter (legacy support)
    else if (folderId === 'unfiled') {
      // Show only jobs without a folder/study node
      query = query.is('study_node_id', null).is('folder_id', null);
    } else if (folderId && folderId !== 'all') {
      // Try to map folder_id to study_node_id or use directly
      query = query.or(`study_node_id.eq.${folderId},folder_id.eq.${folderId}`);
    }
    // If neither filter is specified or is 'all', show all jobs

    // Fetch jobs for the authenticated user with ordering
    const { data: jobs, error: jobsError } = await query
      .order('created_at', { ascending: false });

    if (jobsError) {
      console.error('[API Jobs] Database query error:', jobsError);
      return new Response(JSON.stringify({ 
        error: jobsError.message,
        data: null 
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API Jobs] Found ${jobs?.length || 0} jobs for user ${user.id}`);
    
    // Debug: Log file paths for completed jobs
    if (jobs && jobs.length > 0) {
      jobs.forEach(job => {
        if (job.status === 'completed') {
          console.log(`[API Jobs] Job ${job.job_id} file paths:`, {
            pdf: job.output_pdf_path,
            txt: job.txt_file_path,
            md: job.md_file_path
          });
        }
      });
    }

    return new Response(JSON.stringify({ 
      data: jobs || [],
      error: null 
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[API Jobs] Unexpected error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      data: null 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PATCH /api/jobs - Update job details (like title)
export const PATCH: APIRoute = async ({ request }) => {
  try {
    // Use requireAuth for consistent authentication
    const { user } = await requireAuth(request);

    // Parse request body
    const body = await request.json();
    const { jobId, title } = body;

    if (!jobId) {
      return new Response(JSON.stringify({ error: 'Job ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!title || !title.trim()) {
      return new Response(JSON.stringify({ error: 'Title is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Update the job title
    const { data, error } = await supabaseAdmin
      .from('jobs')
      .update({ 
        lecture_title: title.trim(),
        updated_at: new Date().toISOString()
      })
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating job title:', error);
      return new Response(JSON.stringify({ error: 'Failed to update note title' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      job: data 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update job API error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};