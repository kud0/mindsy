import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get all lectures/jobs for this user
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('job_id, lecture_title, status, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Get all study guides for this user
    const { data: studyGuides, error: guidesError } = await supabase
      .from('study_guides')
      .select('id, job_id, title, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (guidesError) {
      console.error('Error fetching study guides:', guidesError);
      // Don't fail if study_guides table doesn't exist
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      data: {
        jobs: jobs || [],
        studyGuides: studyGuides || [],
        jobsCount: jobs?.length || 0,
        studyGuidesCount: studyGuides?.length || 0
      }
    });

  } catch (error) {
    console.error('Debug list-lectures error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}