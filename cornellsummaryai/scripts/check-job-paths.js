/**
 * Script to check for jobs with NULL output_pdf_path values
 * 
 * This script queries the database for jobs with NULL output_pdf_path values
 * to help verify that our fix for the variable scoping issue is working correctly.
 * 
 * Usage:
 * node scripts/check-job-paths.js
 */

// Import required modules using ES module syntax
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

// Get Supabase credentials from environment variables
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Error: Supabase environment variables are not set');
  process.exit(1);
}

// Create Supabase admin client
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkJobPaths() {
  console.log('Checking for jobs with NULL output_pdf_path values...');
  
  try {
    // Query for completed jobs with NULL output_pdf_path
    const { data: nullPathJobs, error: nullPathError } = await adminClient
      .from('jobs')
      .select('job_id, status, output_pdf_path, created_at')
      .eq('status', 'completed')
      .is('output_pdf_path', null);
    
    if (nullPathError) {
      console.error('Error querying jobs with NULL paths:', nullPathError);
      return false;
    }
    
    // Query for completed jobs with non-NULL output_pdf_path
    const { data: validPathJobs, error: validPathError } = await adminClient
      .from('jobs')
      .select('job_id, status, output_pdf_path, created_at')
      .eq('status', 'completed')
      .not('output_pdf_path', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (validPathError) {
      console.error('Error querying jobs with valid paths:', validPathError);
      return false;
    }
    
    // Display results
    console.log(`Found ${nullPathJobs.length} completed jobs with NULL output_pdf_path`);
    if (nullPathJobs.length > 0) {
      console.log('Sample of jobs with NULL paths:');
      nullPathJobs.slice(0, 5).forEach(job => {
        console.log(`- Job ID: ${job.job_id}, Created: ${job.created_at}`);
      });
    }
    
    console.log(`\nRecent completed jobs with valid output_pdf_path:`);
    if (validPathJobs.length > 0) {
      validPathJobs.forEach(job => {
        console.log(`- Job ID: ${job.job_id}, Path: ${job.output_pdf_path}, Created: ${job.created_at}`);
      });
    } else {
      console.log('No jobs found with valid output_pdf_path');
    }
    
    return true;
  } catch (error) {
    console.error('Error checking job paths:', error);
    return false;
  }
}

// Run the check
checkJobPaths()
  .then(success => {
    if (success) {
      console.log('\nCheck completed successfully');
      process.exit(0);
    } else {
      console.error('\nCheck failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error during check:', error);
    process.exit(1);
  });