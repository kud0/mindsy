import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceRoleClient } from '@/lib/supabase/server'
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { getMockLectureData, validateLectureData } from '@/lib/lecture-data-mapper'
import { loadAndTransformLectureData } from '@/lib/lecture-data-transformer'
import { LectureData, StudyStats, StudyMaterial } from '@/types/lecture-data'

interface RouteParams {
  params: Promise<{
    jobId: string
  }>
}

// GET /api/lectures/[jobId] - Endpoint serving real data from database
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params

  console.log('🚀 Lectures API: Loading real data for job:', { jobId })

  // Authentication
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()

    // Fetch job data from database
    console.log('📚 Fetching job data from database...');
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('*')
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .single()

    if (jobError || !job) {
      console.log('❌ Job not found');
      return createErrorResponse(`Job ${jobId} not found`, 404)
    }

    console.log('📋 Job details:', {
      jobId: job.job_id,
      status: job.status,
      hasTxtPath: !!job.txt_file_path,
      txtPath: job.txt_file_path,
      hasJsonPath: !!job.json_file_path,
      hasTimestamps: !!job.timestamped_transcript
    });

    let lectureData: LectureData;

    // Try to load from study_guides table first (most reliable)
    console.log('🔍 Checking study_guides table for content...');
    const { data: studyGuide, error: sgError } = await supabase
      .from('study_guides')
      .select('*')
      .eq('job_id', jobId)
      .single()

    if (studyGuide && !sgError) {
      console.log('✅ Found content in study_guides table');

      // Reconstruct the Cornell Notes format from study_guides data
      const cornellFormat = {
        metadata: {
          title: studyGuide.title || job.lecture_title,
          subject: studyGuide.subject || job.course_subject,
          language: studyGuide.language || 'en',
          estimatedStudyTime: '45 minutes',
          difficulty: 'intermediate'
        },
        tableOfContents: {
          title: 'Table of Contents',
          items: studyGuide.table_of_contents ?
            studyGuide.table_of_contents.split('\n').map((item: string) => ({
              title: item.split(':')[0]?.trim(),
              description: item.split(':')[1]?.trim() || ''
            })) : []
        },
        questions: studyGuide.questions || [],
        explanations: studyGuide.explanations || [],
        summary: studyGuide.summary || {}
      };

      lectureData = await loadAndTransformLectureData(cornellFormat);

    } else if (job.json_file_path) {
      // Try to load from JSON file if available
      console.log('🔍 Loading from JSON file:', job.json_file_path);

      // Use service role client to bypass RLS (needed for shared content)
      const serviceClient = createServiceRoleClient()
      const { data: jsonFile, error: downloadError } = await serviceClient.storage
        .from('generated-notes')
        .download(job.json_file_path)

      if (!downloadError && jsonFile) {
        const jsonText = await jsonFile.text()
        const jsonData = JSON.parse(jsonText)
        console.log('✅ Loaded JSON file, transforming data...');
        lectureData = await loadAndTransformLectureData(jsonData);
      } else {
        console.log('❌ Could not load JSON file:', downloadError);
        return createErrorResponse('No content available for this lecture. Please wait for processing to complete.', 404)
      }
    } else {
      // No data available
      console.log('⚠️ No content found');
      return createErrorResponse('No content available for this lecture. Please wait for processing to complete.', 404)
    }

    // Get actual study stats and materials
    const actualStats = await fetchStudyStats(supabase, jobId, user.id)
    const actualMaterials = await fetchMaterials(supabase, jobId, user.id)

    // Fetch transcript with segments if available
    const transcript = await fetchTranscript(supabase, job.txt_file_path, job.timestamped_transcript)

    // Return structured response with real data
    const response = {
      lecture: {
        id: jobId,
        data: {
          ...lectureData,
          transcript: transcript // Add transcript to lecture data
        }
      },
      stats: actualStats,
      materials: actualMaterials
    }

    console.log('✅ API: Response ready with real data:', {
      hasQuestions: lectureData.questions?.length || 0,
      hasExplanations: lectureData.explanations?.length || 0,
      title: lectureData.metadata?.title,
      hasTranscript: !!transcript?.text,
      transcriptLength: transcript?.text?.length || 0,
      segmentsCount: transcript?.segments?.length || 0
    })
    return createSuccessResponse(response)

  } catch (error) {
    console.error('❌ Simplified Lectures API error:', error)
    return createErrorResponse('Internal server error', 500)
  }
}

// Helper: Fetch study statistics
async function fetchStudyStats(supabase: any, jobId: string, userId: string): Promise<StudyStats> {
  console.log('📊 Fetching study stats for:', jobId)

  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('start_time, end_time, completed')
    .eq('lecture_id', jobId)
    .eq('user_id', userId)

  if (error) {
    console.log('❌ Study stats error:', error)
    return { estimatedMinutes: 50, completedSessions: 0 }
  }

  const totalMinutes = (sessions || []).reduce((total: number, session: any) => {
    if (session.end_time && session.start_time) {
      const duration = new Date(session.end_time).getTime() - new Date(session.start_time).getTime()
      return total + Math.floor(duration / 60000) // Convert to minutes
    }
    return total
  }, 0)

  return {
    estimatedMinutes: totalMinutes || 50,
    completedSessions: sessions?.length || 0,
    lastAccessed: sessions?.length > 0 ? sessions[sessions.length - 1].start_time : undefined
  }
}

// Helper: Fetch materials
async function fetchMaterials(supabase: any, jobId: string, userId: string): Promise<StudyMaterial[]> {
  console.log('📁 Fetching materials for:', jobId)
  
  // Try to get materials from database
  const { data: job, error } = await supabase
    .from('jobs')
    .select('json_file_path, txt_file_path, md_file_path, pdf_file_path')
    .eq('job_id', jobId)
    .eq('user_id', userId)
    .single()

  if (error || !job) {
    console.log('❌ No materials found in database')
    return []
  }

  const materials: StudyMaterial[] = []
  
  // Add available files as materials
  if (job.pdf_file_path) {
    materials.push({
      id: 'pdf-main',
      name: 'Lecture Notes.pdf',
      type: 'pdf',
      url: `/api/files/view?path=${encodeURIComponent(job.pdf_file_path)}`,
      size: 'Unknown'
    })
  }

  if (job.json_file_path) {
    materials.push({
      id: 'json-data',
      name: 'Lecture Data.json',
      type: 'json',
      url: `/api/files/download?path=${encodeURIComponent(job.json_file_path)}&filename=lecture-data.json`,
      size: 'Unknown'
    })
  }

  if (job.txt_file_path) {
    materials.push({
      id: 'txt-notes',
      name: 'Lecture Notes.txt',
      type: 'txt',
      url: `/api/files/download?path=${encodeURIComponent(job.txt_file_path)}&filename=lecture-notes.txt`,
      size: 'Unknown'
    })
  }

  if (job.md_file_path) {
    materials.push({
      id: 'md-notes',
      name: 'Lecture Notes.md',
      type: 'md',
      url: `/api/files/download?path=${encodeURIComponent(job.md_file_path)}&filename=lecture-notes.md`,
      size: 'Unknown'
    })
  }

  console.log('✅ Found materials:', materials.length)
  return materials
}

// Helper: Fetch transcript text and segments
async function fetchTranscript(supabase: any, txtFilePath: string | null, timestampedTranscript: any): Promise<any> {
  const result: any = {
    text: null,
    segments: timestampedTranscript || []
  };

  if (!txtFilePath) {
    console.log('⚠️ No transcript file path available');
    return result;
  }

  try {
    console.log('📝 Fetching transcript from:', txtFilePath);

    // Use service role client for storage access (transcripts are uploaded with service role)
    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: transcriptFile, error: downloadError } = await adminClient.storage
      .from('generated-notes')
      .download(txtFilePath);

    if (downloadError || !transcriptFile) {
      console.log('❌ Could not download transcript:', downloadError);
      return result;
    }

    const transcriptText = await transcriptFile.text();
    console.log('✅ Transcript loaded:', transcriptText.length, 'characters,', result.segments.length, 'segments');
    result.text = transcriptText;
    return result;
  } catch (error) {
    console.error('❌ Error fetching transcript:', error);
    return result;
  }
}

/**
 * PATCH /api/lectures/[jobId]
 * Update lecture properties (e.g., assign to folder)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { jobId } = await params

  console.log('🔧 PATCH /api/lectures/[jobId]:', { jobId })

  // Authentication
  const authResult = await requireAuth(request)
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status)
  }

  const { user } = authResult

  try {
    const supabase = await createClient()
    const body = await request.json()
    const { user_folder_id } = body

    // Validate input
    if (user_folder_id !== null && user_folder_id !== undefined && typeof user_folder_id !== 'string') {
      return NextResponse.json(
        { error: 'Invalid user_folder_id format' },
        { status: 400 }
      )
    }

    // If folder is specified, verify it exists and belongs to user
    if (user_folder_id) {
      const { data: folder, error: folderError } = await supabase
        .from('user_folders')
        .select('id, course_id')
        .eq('id', user_folder_id)
        .eq('user_id', user.id)
        .single()

      if (folderError || !folder) {
        return NextResponse.json(
          { error: 'Folder not found or access denied' },
          { status: 404 }
        )
      }
    }

    // Update lecture folder assignment
    const { data: updatedJob, error: updateError } = await supabase
      .from('jobs')
      .update({ user_folder_id: user_folder_id || null })
      .eq('job_id', jobId)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError || !updatedJob) {
      console.error('Error updating lecture:', updateError)
      return NextResponse.json(
        { error: 'Failed to update lecture' },
        { status: 500 }
      )
    }

    console.log('✅ Lecture updated successfully:', {
      jobId,
      user_folder_id: updatedJob.user_folder_id
    })

    return NextResponse.json({
      success: true,
      job: updatedJob
    })

  } catch (error) {
    console.error('❌ Error in PATCH /lectures/[jobId]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}