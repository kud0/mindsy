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

    // Fetch user's study sessions
    const { data: sessions, error } = await supabase
      .from('study_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching study sessions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch study sessions' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      sessions: sessions || []
    });

  } catch (error) {
    console.error('Study sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { title, start_time, end_time, session_type, subject, description, lecture_id, study_node_id } = body;

    // Validate required fields
    if (!title || !start_time || !end_time || !session_type) {
      return NextResponse.json(
        { error: 'Missing required fields: title, start_time, end_time, session_type' },
        { status: 400 }
      );
    }

    // Insert new study session
    const { data: session, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
        title,
        start_time,
        end_time,
        session_type,
        subject,
        description,
        lecture_id,
        study_node_id,
        completed: false,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating study session:', error);
      return NextResponse.json(
        { error: 'Failed to create study session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Study sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
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

    const body = await request.json();
    const { id, title, start_time, end_time, session_type, subject, description, completed, lecture_id, study_node_id } = body;
    console.log('🔄 PUT API received:', { id, title, user_id: user.id });

    if (!id) {
      console.log('❌ PUT API error: No ID provided');
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Update study session
    console.log('🔄 PUT API attempting update with conditions:', { id, user_id: user.id });
    const { data: session, error } = await supabase
      .from('study_sessions')
      .update({
        title,
        start_time,
        end_time,
        session_type,
        subject,
        description,
        completed,
        lecture_id,
        study_node_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', user.id) // Ensure user can only update their own sessions
      .select()
      .single();

    console.log('🔄 PUT API supabase response:', { data: session, error, rowsAffected: session ? 1 : 0 });

    if (error) {
      console.error('❌ PUT API error updating study session:', error);
      return NextResponse.json(
        { error: 'Failed to update study session' },
        { status: 500 }
      );
    }

    if (!session) {
      console.log('❌ PUT API: No session found to update (wrong ID or user_id)');
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 404 }
      );
    }

    console.log('✅ PUT API: Session updated successfully:', session.id);
    return NextResponse.json({
      success: true,
      session
    });

  } catch (error) {
    console.error('Study sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('id');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'Session ID is required' },
        { status: 400 }
      );
    }

    // Delete study session
    const { error } = await supabase
      .from('study_sessions')
      .delete()
      .eq('id', sessionId)
      .eq('user_id', user.id); // Ensure user can only delete their own sessions

    if (error) {
      console.error('Error deleting study session:', error);
      return NextResponse.json(
        { error: 'Failed to delete study session' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Study session deleted successfully'
    });

  } catch (error) {
    console.error('Study sessions API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}