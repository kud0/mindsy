import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🔧 Testing database access and checking jobs table...');
    
    const supabase = await createClient();
    
    // Test basic database access first
    const { data: testData, error: testError } = await supabase
      .from('jobs')
      .select('job_id')
      .limit(1);
      
    if (testError) {
      throw new Error(`Database access test failed: ${testError.message}`);
    }
    
    console.log('✅ Database access successful');
    
    // Try to select review columns to see if they exist
    const { data: reviewTest, error: reviewError } = await supabase
      .from('jobs')
      .select('marked_for_review, review_reason')
      .limit(1);
    
    if (reviewError) {
      console.log('❌ Review columns do not exist:', reviewError.message);
      return NextResponse.json({
        success: false,
        message: 'Review columns do not exist in database',
        error: reviewError.message,
        instruction: 'Please run the SQL migration in /database/migrations/add-review-columns.sql in your Supabase SQL Editor'
      });
    } else {
      console.log('✅ Review columns already exist in database');
      return NextResponse.json({
        success: true,
        message: 'Review columns already exist in database',
        columnData: reviewTest
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking database:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check database structure',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}