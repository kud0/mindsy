/**
 * Script to list all jobs in the database
 * 
 * This script lists all jobs in the database to help identify the correct job ID
 * 
 * Usage:
 * node scripts/list-jobs.js
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

async function listJobs() {
  console.log('Listing all jobs in the database...');
  
  try {
    // Get all jobs
    const { data: jobs, error } = await adminClient
      .from('jobs')
      .select('job_id, lecture_title, status, output_pdf_path, created_at')
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (error) {
      console.error('Error fetching jobs:', error);
      return false;
    }
    
    if (jobs && jobs.length > 0) {
      console.log(`Found ${jobs.length} jobs:`);
      jobs.forEach((job, index) => {
        console.log(`\nJob ${index + 1}:`);
        console.log(`- Job ID: ${job.job_id}`);
        console.log(`- Title: ${job.lecture_title}`);
        console.log(`- Status: ${job.status}`);
        console.log(`- Output PDF Path: ${job.output_pdf_path || 'Not set'}`);
        console.log(`- Created: ${new Date(job.created_at).toLocaleString()}`);
      });
    } else {
      console.log('No jobs found in the database');
    }
    
    return true;
  } catch (error) {
    console.error('Error listing jobs:', error);
    return false;
  }
}

// Run the function
listJobs()
  .then(success => {
    if (success) {
      console.log('\nJob listing completed successfully');
      process.exit(0);
    } else {
      console.error('\nJob listing failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });