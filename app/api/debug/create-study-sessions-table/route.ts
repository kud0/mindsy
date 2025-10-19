import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
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

    console.log('Creating study_sessions table...');

    // Create the study_sessions table
    const { error: createTableError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Create study_sessions table for study schedule feature
        CREATE TABLE IF NOT EXISTS study_sessions (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
          title TEXT NOT NULL,
          start_time TIMESTAMPTZ NOT NULL,
          end_time TIMESTAMPTZ NOT NULL,
          session_type TEXT NOT NULL CHECK (session_type IN ('lecture', 'study', 'review', 'exam-prep', 'break')),
          subject TEXT,
          description TEXT,
          lecture_id TEXT,
          user_folder_id UUID,
          completed BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_study_sessions_start_time ON study_sessions(start_time);
        CREATE INDEX IF NOT EXISTS idx_study_sessions_lecture_id ON study_sessions(lecture_id);
        CREATE INDEX IF NOT EXISTS idx_study_sessions_user_folder_id ON study_sessions(user_folder_id);

        -- Enable RLS
        ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
      `
    });

    if (createTableError) {
      console.error('Error creating table:', createTableError);
      // Try direct SQL execution if RPC fails
      const { error: directError } = await supabase
        .from('study_sessions')
        .select('count')
        .limit(1);

      if (directError) {
        return NextResponse.json({
          success: false,
          error: 'Failed to create study_sessions table',
          details: createTableError.message
        });
      }
    }

    // Create RLS policies
    const { error: policyError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop existing policies if they exist
        DROP POLICY IF EXISTS "Users can view their own study sessions" ON study_sessions;
        DROP POLICY IF EXISTS "Users can insert their own study sessions" ON study_sessions;
        DROP POLICY IF EXISTS "Users can update their own study sessions" ON study_sessions;
        DROP POLICY IF EXISTS "Users can delete their own study sessions" ON study_sessions;

        -- Create RLS policies
        CREATE POLICY "Users can view their own study sessions" ON study_sessions
          FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Users can insert their own study sessions" ON study_sessions
          FOR INSERT WITH CHECK (auth.uid() = user_id);

        CREATE POLICY "Users can update their own study sessions" ON study_sessions
          FOR UPDATE USING (auth.uid() = user_id);

        CREATE POLICY "Users can delete their own study sessions" ON study_sessions
          FOR DELETE USING (auth.uid() = user_id);
      `
    });

    if (policyError) {
      console.error('Error creating policies (this may be expected):', policyError);
    }

    // Test the table by inserting and removing a test record
    const testSession = {
      user_id: user.id,
      title: 'Test Session',
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString(), // 1 hour later
      session_type: 'study'
    };

    const { data: insertedSession, error: insertError } = await supabase
      .from('study_sessions')
      .insert(testSession)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({
        success: false,
        error: 'Table created but insert test failed',
        details: insertError.message
      });
    }

    // Clean up test record
    await supabase
      .from('study_sessions')
      .delete()
      .eq('id', insertedSession.id);

    console.log('✅ study_sessions table created successfully');

    return NextResponse.json({
      success: true,
      message: 'study_sessions table created successfully',
      tableExists: true
    });

  } catch (error) {
    console.error('❌ Error creating study_sessions table:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create study_sessions table',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}