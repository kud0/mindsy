import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface RouteContext {
  params: Promise<{ jobId: string }>;
}

/**
 * GET /api/lectures/[jobId]/notes
 * Fetch all user notes for a specific lecture
 */
export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { jobId } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Fetch all notes for this lecture
    const { data: notes, error } = await supabase
      .from('user_notes')
      .select('*')
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      return NextResponse.json(
        { error: 'Failed to fetch notes' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      notes: notes || []
    });
  } catch (error) {
    console.error('Unexpected error in GET /notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/lectures/[jobId]/notes
 * Create or update a user note
 */
export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { jobId } = await context.params;
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { content_type, content_id, note_content } = body;

    // Validate required fields
    if (!content_type || !content_id || note_content === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: content_type, content_id, note_content' },
        { status: 400 }
      );
    }

    // Validate content_type
    const validTypes = ['explanation', 'summary', 'question', 'overview', 'general'];
    if (!validTypes.includes(content_type)) {
      return NextResponse.json(
        { error: `Invalid content_type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // If note_content is empty, delete the note instead
    if (!note_content.trim()) {
      const { error: deleteError } = await supabase
        .from('user_notes')
        .delete()
        .eq('user_id', user.id)
        .eq('job_id', jobId)
        .eq('content_type', content_type)
        .eq('content_id', content_id);

      if (deleteError) {
        console.error('Error deleting empty note:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete note' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Note deleted (empty content)',
        note: null
      });
    }

    // Upsert (insert or update)
    const { data: note, error } = await supabase
      .from('user_notes')
      .upsert(
        {
          user_id: user.id,
          job_id: jobId,
          content_type,
          content_id,
          note_content: note_content.trim()
        },
        {
          onConflict: 'user_id,job_id,content_type,content_id',
          ignoreDuplicates: false
        }
      )
      .select()
      .single();

    if (error) {
      console.error('Error upserting note:', error);
      return NextResponse.json(
        { error: 'Failed to save note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      note
    });
  } catch (error) {
    console.error('Unexpected error in POST /notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/lectures/[jobId]/notes
 * Delete a specific user note
 */
export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { jobId } = await context.params;
    const { searchParams } = new URL(request.url);
    const content_type = searchParams.get('content_type');
    const content_id = searchParams.get('content_id');

    if (!content_type || !content_id) {
      return NextResponse.json(
        { error: 'Missing required query params: content_type, content_id' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Delete the note
    const { error } = await supabase
      .from('user_notes')
      .delete()
      .eq('user_id', user.id)
      .eq('job_id', jobId)
      .eq('content_type', content_type)
      .eq('content_id', content_id);

    if (error) {
      console.error('Error deleting note:', error);
      return NextResponse.json(
        { error: 'Failed to delete note' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Note deleted'
    });
  } catch (error) {
    console.error('Unexpected error in DELETE /notes:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
