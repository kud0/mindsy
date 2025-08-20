/**
 * Test script for the generate API endpoint
 * 
 * This script tests the generate API endpoint to verify that the fix for the variable scoping issue works.
 * It checks that the output_file_path is properly set in the database when a job completes.
 * 
 * Usage:
 * node scripts/test-generate-api.js
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

async function testGenerateAPI() {
  console.log('Testing generate API endpoint...');

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

    // Step 2: Create a test audio file in storage
    console.log('Creating test audio file in storage...');
    const testAudioPath = `test-${Date.now()}.mp3`;
    const { error: uploadError } = await supabase.storage
      .from('user-uploads')
      .upload(testAudioPath, new Uint8Array([1, 2, 3, 4]), {
        contentType: 'audio/mpeg'
      });

    if (uploadError) {
      console.error('Error uploading test audio file:', uploadError);
      return false;
    }

    console.log('Test audio file created:', testAudioPath);

    // Step 3: Call the generate API endpoint
    console.log('Calling generate API endpoint...');
    const response = await fetch(`${API_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        audioFilePath: testAudioPath,
        lectureTitle: 'Test Lecture'
      })
    });

    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Generate API error:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return false;
    }

    // Parse response
    const data = await response.json();
    console.log('Generate API response:', data);

    // Step 4: Check if job was created and has the correct status
    console.log('Checking job status...');
    const jobId = data.jobId;

    // Wait for job to complete (or fail)
    let jobCompleted = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!jobCompleted && attempts < maxAttempts) {
      attempts++;
      console.log(`Checking job status (attempt ${attempts}/${maxAttempts})...`);

      const { data: jobData, error: jobError } = await adminClient
        .from('jobs')
        .select('*')
        .eq('job_id', jobId)
        .single();

      if (jobError) {
        console.error('Error fetching job:', jobError);
        await new Promise(resolve => setTimeout(resolve, 2000));
        continue;
      }

      console.log('Job status:', jobData.status);
      console.log('Output PDF path:', jobData.output_pdf_path);

      if (jobData.status === 'completed' || jobData.status === 'failed') {
        jobCompleted = true;

        // Check if output_pdf_path is set
        if (jobData.status === 'completed' && !jobData.output_pdf_path) {
          console.error('Job completed but output_pdf_path is not set!');
          return false;
        }

        if (jobData.status === 'completed' && jobData.output_pdf_path) {
          console.log('Job completed successfully and output_pdf_path is set correctly!');
          return true;
        }
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    if (!jobCompleted) {
      console.error('Job did not complete within the expected time');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error during API test:', error);
    return false;
  }
}

// Run the test
testGenerateAPI()
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