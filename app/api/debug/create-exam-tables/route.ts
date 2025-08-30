import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const results = [];

    // Create exams table
    const examTableSql = `
      CREATE TABLE IF NOT EXISTS public.exams (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        folder_id TEXT NOT NULL,
        folder_name TEXT NOT NULL,
        title TEXT NOT NULL,
        questions JSONB NOT NULL,
        question_count INTEGER NOT NULL,
        difficulty TEXT CHECK (difficulty IN ('easy', 'medium', 'hard', 'mixed')) DEFAULT 'mixed',
        source_note_ids TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        expires_at TIMESTAMPTZ,
        is_active BOOLEAN DEFAULT true
      );
    `;

    try {
      const { error: examError } = await supabase.rpc('exec_sql', { sql: examTableSql });
      results.push({ 
        table: 'exams', 
        success: !examError, 
        error: examError?.message 
      });
    } catch (e) {
      results.push({ 
        table: 'exams', 
        success: false, 
        error: 'Cannot create table via RPC, likely permissions issue' 
      });
    }

    // Create exam_attempts table
    const attemptTableSql = `
      CREATE TABLE IF NOT EXISTS public.exam_attempts (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        started_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        answers JSONB NOT NULL,
        score INTEGER,
        percentage DECIMAL(5,2),
        correct_count INTEGER,
        incorrect_count INTEGER,
        time_spent INTEGER,
        performance_by_topic JSONB,
        status TEXT CHECK (status IN ('in_progress', 'completed', 'abandoned')) DEFAULT 'in_progress'
      );
    `;

    try {
      const { error: attemptError } = await supabase.rpc('exec_sql', { sql: attemptTableSql });
      results.push({ 
        table: 'exam_attempts', 
        success: !attemptError, 
        error: attemptError?.message 
      });
    } catch (e) {
      results.push({ 
        table: 'exam_attempts', 
        success: false, 
        error: 'Cannot create table via RPC, likely permissions issue' 
      });
    }

    // Create user_performance table
    const perfTableSql = `
      CREATE TABLE IF NOT EXISTS public.user_performance (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        folder_id TEXT NOT NULL,
        total_exams_taken INTEGER DEFAULT 0,
        average_score DECIMAL(5,2) DEFAULT 0,
        best_score DECIMAL(5,2) DEFAULT 0,
        current_streak INTEGER DEFAULT 0,
        longest_streak INTEGER DEFAULT 0,
        last_exam_date TIMESTAMPTZ,
        weak_topics TEXT[],
        strong_topics TEXT[],
        total_study_time INTEGER DEFAULT 0,
        xp_points INTEGER DEFAULT 0,
        level_current INTEGER DEFAULT 1,
        achievements TEXT[],
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, folder_id)
      );
    `;

    try {
      const { error: perfError } = await supabase.rpc('exec_sql', { sql: perfTableSql });
      results.push({ 
        table: 'user_performance', 
        success: !perfError, 
        error: perfError?.message 
      });
    } catch (e) {
      results.push({ 
        table: 'user_performance', 
        success: false, 
        error: 'Cannot create table via RPC, likely permissions issue' 
      });
    }

    // Create user_achievements table
    const achTableSql = `
      CREATE TABLE IF NOT EXISTS public.user_achievements (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        achievement_type TEXT NOT NULL,
        achievement_name TEXT NOT NULL,
        description TEXT,
        earned_at TIMESTAMPTZ DEFAULT NOW(),
        exam_attempt_id UUID REFERENCES public.exam_attempts(id) ON DELETE SET NULL,
        metadata JSONB
      );
    `;

    try {
      const { error: achError } = await supabase.rpc('exec_sql', { sql: achTableSql });
      results.push({ 
        table: 'user_achievements', 
        success: !achError, 
        error: achError?.message 
      });
    } catch (e) {
      results.push({ 
        table: 'user_achievements', 
        success: false, 
        error: 'Cannot create table via RPC, likely permissions issue' 
      });
    }

    // Try alternative approach - create tables using raw SQL if RPC doesn't work
    if (results.every(r => !r.success)) {
      try {
        // Try direct table creation (this might work with proper service role key)
        const { data: examData, error: examError2 } = await supabase
          .from('exams')
          .select('*')
          .limit(1);
        
        results.push({
          table: 'exams_test_query',
          success: !examError2,
          error: examError2?.message || 'Table accessible'
        });

        const { data: attemptData, error: attemptError2 } = await supabase
          .from('exam_attempts')
          .select('*')
          .limit(1);
        
        results.push({
          table: 'exam_attempts_test_query',
          success: !attemptError2,
          error: attemptError2?.message || 'Table accessible'
        });

      } catch (e) {
        results.push({
          table: 'direct_query_test',
          success: false,
          error: e instanceof Error ? e.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      message: 'Exam table creation attempted',
      results,
      note: 'If RPC method failed, you may need to run the SQL directly in your Supabase dashboard',
      sql_scripts: {
        exams: examTableSql,
        exam_attempts: attemptTableSql,
        user_performance: perfTableSql,
        user_achievements: achTableSql
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to create exam tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}