import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';

/**
 * GET /api/study-guides/[id] - Clean approach to get study guide
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  console.log('🎯 Clean Study Guide API: Fetching guide:', id);

  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;

  try {
    const supabase = await createClient();

    // Simple query - can lookup by studyGuideId OR jobId 
    let studyGuide, error;
    
    // First try by study guide ID
    const studyGuideQuery = await supabase
      .from('study_guides')
      .select(`
        id,
        title,
        subject,
        language,
        questions,
        explanations,
        summary,
        table_of_contents,
        created_at,
        updated_at,
        jobs!inner(
          job_id,
          lecture_title,
          status,
          output_pdf_path,
          txt_file_path,
          created_at
        )
      `)
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (studyGuideQuery.error && studyGuideQuery.error.code === 'PGRST116') {
      // Not found by ID, try by job_id (for backward compatibility)
      console.log('🔄 Clean Study Guide API: Not found by ID, trying jobId:', id);
      const jobQuery = await supabase
        .from('study_guides')
        .select('*')
        .eq('job_id', id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single(); // Get the most recent one if there are duplicates
      
      console.log('🔍 Job query result:', { 
        hasData: !!jobQuery.data,
        error: jobQuery.error,
        questionsCount: jobQuery.data?.questions?.length || 0,
        explanationsCount: jobQuery.data?.explanations?.length || 0
      });
      
      studyGuide = jobQuery.data;
      error = jobQuery.error;
    } else {
      studyGuide = studyGuideQuery.data;
      error = studyGuideQuery.error;
    }

    if (error || !studyGuide) {
      console.log('⚠️ Clean Study Guide API: Not found in study_guides, trying jobs table:', { error, id });
      
      // Fallback: Try to get job data directly (for older jobs not in study_guides table)
      console.log('🔍 Trying fallback query for job:', { id, userId: user.id });
      const jobQuery = await supabase
        .from('jobs')
        .select('job_id, lecture_title, status, output_pdf_path, txt_file_path, created_at, user_id')
        .eq('job_id', id)
        .eq('user_id', user.id)
        .single();
      
      console.log('🔍 Fallback query result:', { 
        error: jobQuery.error, 
        data: jobQuery.data,
        errorCode: jobQuery.error?.code,
        errorDetails: jobQuery.error?.details
      });
      
      if (jobQuery.error || !jobQuery.data) {
        console.log('❌ Clean Study Guide API: Also not found in jobs table:', jobQuery.error);
        return createErrorResponse('Study guide not found', 404);
      }
      
      // Return basic job data structure for compatibility
      const jobData = jobQuery.data;
      return createSuccessResponse({
        id: jobData.job_id,
        title: jobData.lecture_title,
        subject: null,
        language: 'en',
        questions: [],
        explanations: [],
        summary: {},
        tableOfContents: '',
        createdAt: jobData.created_at,
        updatedAt: jobData.created_at,
        job: {
          id: jobData.job_id,
          title: jobData.lecture_title,
          status: jobData.status,
          pdfPath: jobData.output_pdf_path,
          txt_file_path: jobData.txt_file_path, // Correct column name
          createdAt: jobData.created_at
        }
      });
    }

    console.log('✅ Clean Study Guide API: Found guide:', {
      id: studyGuide.id,
      title: studyGuide.title,
      questions: studyGuide.questions?.length || 0,
      explanations: studyGuide.explanations?.length || 0,
      language: studyGuide.language
    });

    // Get job info if we need it
    let jobInfo = null;
    if (!studyGuide.jobs && studyGuide.job_id) {
      const { data: jobData } = await supabase
        .from('jobs')
        .select('job_id, lecture_title, status, pdf_file_path, txt_file_path, created_at')
        .eq('job_id', studyGuide.job_id)
        .single();
      jobInfo = jobData;
    }

    // Return clean, structured data - no parsing needed!
    return createSuccessResponse({
      id: studyGuide.id,
      title: studyGuide.title,
      subject: studyGuide.subject,
      language: studyGuide.language,
      
      // Direct JSON - no transformation needed
      questions: studyGuide.questions || [],
      explanations: studyGuide.explanations || [],
      summary: studyGuide.summary || {},
      tableOfContents: studyGuide.table_of_contents || '',
      
      // Metadata
      createdAt: studyGuide.created_at,
      updatedAt: studyGuide.updated_at,
      
      // Job info (from join or separate query)
      job: studyGuide.jobs ? {
        id: studyGuide.jobs.job_id,
        title: studyGuide.jobs.lecture_title,
        status: studyGuide.jobs.status,
        pdfPath: studyGuide.jobs.pdf_file_path,
        txt_file_path: studyGuide.jobs.txt_file_path,
        createdAt: studyGuide.jobs.created_at
      } : jobInfo ? {
        id: jobInfo.job_id,
        title: jobInfo.lecture_title,
        status: jobInfo.status,
        pdfPath: jobInfo.pdf_file_path,
        txt_file_path: jobInfo.txt_file_path,
        createdAt: jobInfo.created_at
      } : null
    });

  } catch (error) {
    console.error('❌ Clean Study Guide API: Error:', error);
    return createErrorResponse('Internal server error', 500);
  }
}