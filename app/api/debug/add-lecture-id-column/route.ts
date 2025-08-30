import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    console.log('🔧 Adding lecture_id column to pomodoro_sessions...');
    
    const supabase = await createClient();
    
    // Get authenticated user (ensure only authenticated users can run this)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Check if column already exists
    const { data: columnCheck } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'pomodoro_sessions')
      .eq('column_name', 'lecture_id');

    if (columnCheck && columnCheck.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Column lecture_id already exists in pomodoro_sessions table'
      });
    }

    // Since we can't execute DDL statements directly through the Supabase client,
    // we need to provide instructions for manual execution
    const sqlInstructions = `
-- Run this SQL in your Supabase SQL Editor:

ALTER TABLE pomodoro_sessions 
ADD COLUMN IF NOT EXISTS lecture_id UUID REFERENCES jobs(job_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_lecture_id ON pomodoro_sessions(lecture_id);

CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_type_completed_lecture 
ON pomodoro_sessions(user_id, type, was_completed, lecture_id);
    `;

    console.log('📝 SQL to execute:', sqlInstructions);
    
    return NextResponse.json({
      success: false,
      message: 'Column needs to be added manually in Supabase SQL Editor',
      sql: sqlInstructions,
      instructions: [
        '1. Go to Supabase Dashboard → SQL Editor',
        '2. Copy and run the SQL from the "sql" field above',
        '3. Refresh the lectures page to test the study history feature'
      ]
    });

  } catch (error) {
    console.error('❌ Error in add-lecture-id-column:', error);
    return NextResponse.json(
      { error: 'Failed to add column', details: error },
      { status: 500 }
    );
  }
}