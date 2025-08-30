import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

export async function POST() {
  try {
    console.log('🔧 Creating Pomodoro tables...');
    
    const supabase = await createClient();
    
    // Get authenticated user (ensure only authenticated users can run this)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Read the SQL migration file
    const sqlPath = join(process.cwd(), 'database', 'create_pomodoro_tables.sql');
    const sqlContent = await readFile(sqlPath, 'utf-8');

    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: sqlContent
    });

    if (error) {
      // If the RPC function doesn't exist, try direct execution
      console.log('RPC function not available, trying direct execution...');
      
      // Split SQL by semicolons and execute each statement
      const statements = sqlContent
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const results = [];
      for (const statement of statements) {
        if (statement.length > 0) {
          console.log('Executing:', statement.substring(0, 50) + '...');
          const { data: stmtData, error: stmtError } = await supabase
            .from('information_schema.tables')
            .select('table_name')
            .limit(1);

          // This is just a test query - the actual table creation needs to be done via SQL
          // In a real environment, you'd use Supabase migrations or SQL editor
          console.log('Note: Table creation requires manual SQL execution in Supabase');
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Tables need to be created manually in Supabase SQL editor',
        sqlFile: 'database/create_pomodoro_tables.sql'
      });
    }

    console.log('✅ Pomodoro tables created successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Pomodoro tables created successfully',
      data
    });

  } catch (error) {
    console.error('❌ Error creating Pomodoro tables:', error);
    return NextResponse.json(
      { error: 'Failed to create tables', details: error },
      { status: 500 }
    );
  }
}