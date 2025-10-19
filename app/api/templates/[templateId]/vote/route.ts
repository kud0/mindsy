import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteParams {
  params: Promise<{
    templateId: string
  }>
}

/**
 * POST /api/templates/[templateId]/vote
 * Toggle vote for a template (vote if not voted, unvote if already voted)
 */
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { templateId } = await params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get template and verify it exists
    const { data: template, error: templateError } = await supabase
      .from('course_templates')
      .select('id, course_id')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Verify user is enrolled in the course
    const { data: enrollment } = await supabase
      .from('course_enrollments')
      .select('id')
      .eq('user_id', user.id)
      .eq('course_id', template.course_id)
      .eq('is_active', true)
      .single();

    if (!enrollment) {
      return NextResponse.json(
        { error: 'You must be enrolled in this course to vote on templates' },
        { status: 403 }
      );
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('template_votes')
      .select('id')
      .eq('template_id', templateId)
      .eq('user_id', user.id)
      .single();

    let voted = false;

    if (existingVote) {
      // Unvote: remove existing vote
      const { error: deleteError } = await supabase
        .from('template_votes')
        .delete()
        .eq('id', existingVote.id);

      if (deleteError) {
        console.error('Vote removal error:', deleteError);
        return NextResponse.json(
          { error: 'Failed to remove vote' },
          { status: 500 }
        );
      }

      voted = false;
    } else {
      // Vote: create new vote
      const { error: insertError } = await supabase
        .from('template_votes')
        .insert({
          template_id: templateId,
          user_id: user.id
        });

      if (insertError) {
        console.error('Vote creation error:', insertError);
        return NextResponse.json(
          { error: 'Failed to vote' },
          { status: 500 }
        );
      }

      voted = true;
    }

    // Get updated vote count (trigger should have updated it automatically)
    const { data: updatedTemplate } = await supabase
      .from('course_templates')
      .select('vote_count, is_recommended')
      .eq('id', templateId)
      .single();

    return NextResponse.json({
      success: true,
      voted,
      vote_count: updatedTemplate?.vote_count || 0,
      is_recommended: updatedTemplate?.is_recommended || false
    });
  } catch (error) {
    console.error('Unexpected error in POST /templates/[templateId]/vote:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
