import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
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

    // Get specific job IDs from query params (optional)
    const { searchParams } = new URL(request.url);
    const jobIds = searchParams.get('jobIds')?.split(',') || [];

    // Query for all review marks for this user
    let query = supabase
      .from('lecture_reviews')
      .select('job_id, marked_for_review, review_reason, marked_at, updated_at')
      .eq('user_id', user.id)
      .eq('marked_for_review', true); // Only get lectures marked for review

    // Filter by specific job IDs if provided
    if (jobIds.length > 0) {
      query = query.in('job_id', jobIds);
    }

    const { data: reviews, error } = await query.order('marked_at', { ascending: false });

    if (error) {
      console.error('Error fetching review marks:', error);
      return NextResponse.json(
        { error: 'Failed to fetch review marks' },
        { status: 500 }
      );
    }

    // Transform to lookup object for easy frontend consumption
    const reviewLookup: Record<string, {
      markedForReview: boolean;
      reviewReason: string | null;
      markedAt: string;
      updatedAt: string;
    }> = {};

    reviews?.forEach(review => {
      reviewLookup[review.job_id] = {
        markedForReview: review.marked_for_review,
        reviewReason: review.review_reason,
        markedAt: review.marked_at,
        updatedAt: review.updated_at
      };
    });

    return NextResponse.json({
      success: true,
      data: reviewLookup,
      totalMarkedForReview: reviews?.length || 0
    });

  } catch (error) {
    console.error('Batch review status API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}