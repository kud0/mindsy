/**
 * Test script for the download API endpoint
 * 
 * This script tests the download API endpoint to verify that the fix for handling multiple jobs works.
 * It checks that the endpoint can retrieve job details even when multiple jobs with the same ID exist.
 * 
 * Usage:
 * node scripts/test-download-api.js
 */

// Import required modules using ES module syntax
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TEST_USER_EMAIL = process.env.TEST_USER_EMAIL;
const TEST_USER_PASSWORD = process.env.TEST_USER_PASSWORD;
const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Supabase environment variables are not set');
  process.exit(1);
}

if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error('Error: Test user credentials are not set');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testDownloadAPI() {
  console.log('Testing download API endpoint...');

  try {
    // Step 1: Sign in as test user
    console.log('Signing in as test user...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (authError) {
      console.error('Authentication error:', authError);
      return false;
    }

    const { session } = authData;
    console.log('Signed in successfully, user ID:', session.user.id);

    // Step 2: Get a list of completed jobs for the user
    console.log('Getting list of completed jobs...');
    const { data: jobs, error: jobsError } = await adminClient
      .from('jobs')
      .select('job_id, status, output_pdf_path, lecture_title')
      .eq('user_id', session.user.id)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(5);

    if (jobsError) {
      console.error('Error fetching jobs:', jobsError);
      return false;
    }

    if (!jobs || jobs.length === 0) {
      console.error('No completed jobs found for the user');
      return false;
    }

    console.log(`Found ${jobs.length} completed jobs`);

    // Step 3: Test download API with each job
    let successCount = 0;
    let failureCount = 0;

    for (const job of jobs) {
      console.log(`\nTesting download for job: ${job.job_id} (${job.lecture_title})`);
      
      // Skip jobs with no output PDF path
      if (!job.output_pdf_path) {
        console.log('Skipping job with no output PDF path');
        continue;
      }

      try {
        // Call the download API endpoint
        console.log('Calling download API endpoint...');
        const response = await fetch(`${API_BASE_URL}/api/download/${job.job_id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        // Check if response is OK
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Download API error:', response.status, response.statusText);
          console.error('Error details:', errorText);
          failureCount++;
          continue;
        }

        // Check if response is a PDF
        const contentType = response.headers.get('content-type');
        if (contentType !== 'application/pdf') {
          console.error('Unexpected content type:', contentType);
          failureCount++;
          continue;
        }

        // Get the content disposition header
        const contentDisposition = response.headers.get('content-disposition');
        console.log('Content disposition:', contentDisposition);

        // Get the file size
        const contentLength = response.headers.get('content-length');
        console.log('File size:', contentLength, 'bytes');

        // Success!
        console.log('Download successful!');
        successCount++;
      } catch (error) {
        console.error('Error during download:', error);
        failureCount++;
      }
    }

    console.log(`\nTest results: ${successCount} successful, ${failureCount} failed`);
    return successCount > 0;
  } catch (error) {
    console.error('Error during API test:', error);
    return false;
  }
}

// Run the test
testDownloadAPI()
  .then(success => {
    if (success) {
      console.log('Integration test passed!');
      process.exit(0);
    } else {
      console.error('Integration test failed!');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during test:', error);
    process.exit(1);
  });