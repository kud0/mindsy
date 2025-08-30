import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  try {
    const supabase = await createClient();
    
    // Get authenticated user (admin check could be added here)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log('🔧 Database Migration: Adding lecture_id column to pomodoro_sessions');

    // First check if column already exists
    const { data: existingColumn } = await supabase
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'pomodoro_sessions')
      .eq('column_name', 'lecture_id');

    if (existingColumn && existingColumn.length > 0) {
      console.log('✅ Database Migration: lecture_id column already exists');
      return NextResponse.json({
        success: true,
        message: 'Column already exists',
        columnExists: true
      });
    }

    // Try to add column using a simple insert that will fail if column doesn't exist
    // This is a workaround since we can't directly execute DDL
    console.log('🔧 Attempting to add lecture_id column...');
    
    // We'll need to use the Supabase dashboard or direct SQL access for this
    // For now, let's return instructions
    return NextResponse.json({
      success: false,
      message: 'Column needs to be added manually',
      instructions: 'Please run this SQL in your Supabase SQL editor: ALTER TABLE pomodoro_sessions ADD COLUMN lecture_id TEXT;',
      sqlToRun: 'ALTER TABLE pomodoro_sessions ADD COLUMN lecture_id TEXT;'
    });

  } catch (error) {
    console.error('❌ Database Migration: Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
}