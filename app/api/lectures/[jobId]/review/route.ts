import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params;
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get review status for this lecture
    const { data: review, error } = await supabase
      .from('lecture_reviews')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching review status:', error);
      return NextResponse.json(
        { error: 'Failed to fetch review status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        markedForReview: review?.marked_for_review || false,
        reviewReason: review?.review_reason || null,
        markedAt: review?.marked_at || null,
        updatedAt: review?.updated_at || null
      }
    });

  } catch (error) {
    console.error('Review status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const { jobId } = params;
    const body = await request.json();
    const { markedForReview, reviewReason } = body;
    
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (markedForReview) {
      // Mark lecture for review (upsert)
      const { data, error } = await supabase
        .from('lecture_reviews')
        .upsert({
          user_id: user.id,
          job_id: jobId,
          marked_for_review: true,
          review_reason: reviewReason || null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,job_id'
        })
        .select()
        .single();

      if (error) {
        console.error('Error marking lecture for review:', error);
        return NextResponse.json(
          { error: 'Failed to mark lecture for review' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Lecture marked for review',
        data: {
          jobId,
          markedForReview: true,
          reviewReason: data.review_reason,
          markedAt: data.marked_at,
          updatedAt: data.updated_at
        }
      });

    } else {
      // Remove review mark (delete record)
      const { error } = await supabase
        .from('lecture_reviews')
        .delete()
        .eq('user_id', user.id)
        .eq('job_id', jobId);

      if (error) {
        console.error('Error removing review mark:', error);
        return NextResponse.json(
          { error: 'Failed to remove review mark' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Review mark removed',
        data: {
          jobId,
          markedForReview: false,
          reviewReason: null,
          markedAt: null,
          updatedAt: null
        }
      });
    }

  } catch (error) {
    console.error('Review toggle API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}