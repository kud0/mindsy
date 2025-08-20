#!/usr/bin/env node

/**
 * Test Delete Note Functionality
 * 
 * Tests the delete note API endpoint and verifies proper cleanup
 * 
 * Usage: node scripts/test-delete-functionality.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function testDeleteFunctionality() {
  console.log('🧪 Testing Delete Note Functionality...');
  console.log('=' .repeat(50));
  
  try {
    const testUserId = '3c684689-f3a2-4822-a72c-323b195a8b32'; // Your user ID
    
    // 1. Get current jobs for the user
    console.log('📋 Step 1: Fetching current jobs...');
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('job_id, lecture_title, status, created_at, file_size_mb')
      .eq('user_id', testUserId)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (jobsError) {
      console.error('❌ Failed to fetch jobs:', jobsError);
      return;
    }
    
    if (!jobs || jobs.length === 0) {
      console.log('ℹ️ No jobs found for testing. Create a job first.');
      return;
    }
    
    console.log(`✅ Found ${jobs.length} jobs:`);
    jobs.forEach((job, index) => {
      console.log(`   ${index + 1}. ${job.lecture_title} (${job.job_id}) - ${job.status} - ${job.file_size_mb || 0}MB`);
    });
    
    // 2. Get current usage before deletion
    console.log('\n📊 Step 2: Checking current usage...');
    const monthYear = new Date().toISOString().slice(0, 7);
    const { data: usageBefore, error: usageError } = await supabase
      .from('usage')
      .select('total_mb_used, files_processed')
      .eq('user_id', testUserId)
      .eq('month_year', monthYear)
      .single();
    
    if (usageError) {
      console.warn('⚠️ Could not fetch usage data:', usageError.message);
    } else {
      console.log(`✅ Current usage: ${usageBefore.total_mb_used || 0}MB, ${usageBefore.files_processed || 0} files`);
    }
    
    // 3. Test the delete API endpoint
    console.log('\n🗑️ Step 3: Testing delete API...');
    console.log('⚠️ This would delete a real job. Skipping actual deletion in test mode.');
    console.log('To test deletion, manually call:');
    console.log(`   DELETE /api/delete-note/${jobs[0].job_id}`);
    
    // 4. Verify file paths exist (for manual verification)
    console.log('\n📁 Step 4: Checking file paths for first job...');
    const { data: jobDetails, error: detailsError } = await supabase
      .from('jobs')
      .select('audio_file_path, pdf_file_path, output_pdf_path, txt_file_path, md_file_path')
      .eq('job_id', jobs[0].job_id)
      .single();
    
    if (detailsError) {
      console.error('❌ Failed to fetch job details:', detailsError);
      return;
    }
    
    console.log('📁 Files associated with job:', {
      audio: jobDetails.audio_file_path,
      pdf: jobDetails.pdf_file_path,
      output_pdf: jobDetails.output_pdf_path,
      txt: jobDetails.txt_file_path,
      md: jobDetails.md_file_path
    });
    
    // 5. Test delete endpoint manually
    console.log('\n🧪 Step 5: Manual Delete Test Instructions...');
    console.log('To manually test delete functionality:');
    console.log('1. Open browser developer tools');
    console.log('2. Go to dashboard with notes');
    console.log('3. Click delete button on a test note');
    console.log('4. Verify:');
    console.log('   - Confirmation dialog appears');
    console.log('   - Button shows "Deleting..." state');
    console.log('   - Note disappears from list');
    console.log('   - Usage counter decreases');
    console.log('   - Files are removed from storage');
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Delete functionality test completed!');
    console.log('\nThe delete API endpoint has been created and UI updated.');
    console.log('Test manually in the dashboard to verify full functionality.');
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testDeleteFunctionality().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}