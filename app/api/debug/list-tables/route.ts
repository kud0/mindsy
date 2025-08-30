import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Query information schema to see what tables exist
    const { data: tables, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    if (error) {
      // Try alternative approach - just try to query common tables
      const tableTests = [];
      
      const testTables = ['jobs', 'study_nodes', 'exams', 'exam_attempts', 'user_performance', 'user_achievements'];
      
      for (const tableName of testTables) {
        try {
          const { data, error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact' })
            .limit(1);
          
          tableTests.push({
            table: tableName,
            exists: !error,
            count: data?.length || 0,
            error: error?.message
          });
        } catch (e) {
          tableTests.push({
            table: tableName,
            exists: false,
            error: e instanceof Error ? e.message : 'Unknown error'
          });
        }
      }
      
      return NextResponse.json({
        message: 'Cannot query information_schema, but tested common tables',
        tableTests,
        originalError: error.message
      });
    }

    return NextResponse.json({
      tables: tables?.map(t => t.table_name) || [],
      totalTables: tables?.length || 0
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to list tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}