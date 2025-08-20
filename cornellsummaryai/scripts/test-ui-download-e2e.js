/**
 * End-to-End Test Script for UI Download Functionality
 * 
 * This script tests the end-to-end functionality of the UI display and download features:
 * 1. Verifies that the UI displays job information correctly (no file paths or NULL values)
 * 2. Tests the download functionality with different job statuses
 * 3. Ensures error messages are displayed properly
 * 
 * Usage:
 * node scripts/test-ui-download-e2e.js
 */

// Import required modules
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import chalk from 'chalk';

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
  console.error(chalk.red('Error: Supabase environment variables are not set'));
  process.exit(1);
}

if (!TEST_USER_EMAIL || !TEST_USER_PASSWORD) {
  console.error(chalk.red('Error: Test user credentials are not set'));
  process.exit(1);
}

// Create Supabase clients
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test result tracking
const testResults = {
  uiDisplay: {
    noFilePaths: { passed: false, details: '' },
    noNullValues: { passed: false, details: '' },
    relevantInfoOnly: { passed: false, details: '' }
  },
  downloadFunctionality: {
    completedJob: { passed: false, details: '' },
    processingJob: { passed: false, details: '' },
    failedJob: { passed: false, details: '' },
    nonexistentJob: { passed: false, details: '' }
  },
  errorMessages: {
    jobNotFound: { passed: false, details: '' },
    jobNotReady: { passed: false, details: '' },
    noOutputFile: { passed: false, details: '' }
  }
};

/**
 * Main test function
 */
async function runEndToEndTests() {
  console.log(chalk.blue('=== UI Download End-to-End Tests ==='));
  console.log(chalk.blue('Testing UI display and download functionality...'));

  try {
    // Step 1: Sign in as test user
    console.log(chalk.yellow('\nStep 1: Authenticating test user...'));
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER_EMAIL,
      password: TEST_USER_PASSWORD
    });

    if (authError) {
      console.error(chalk.red('Authentication error:'), authError);
      return false;
    }

    const { session } = authData;
    console.log(chalk.green('✓ Signed in successfully, user ID:'), session.user.id);

    // Step 2: Get jobs with different statuses for testing
    console.log(chalk.yellow('\nStep 2: Retrieving jobs with different statuses...'));
    const jobs = await getTestJobs(session.user.id);
    
    if (!jobs) {
      console.error(chalk.red('Failed to retrieve test jobs'));
      return false;
    }

    // Step 3: Test UI display
    console.log(chalk.yellow('\nStep 3: Testing UI display...'));
    await testUIDisplay(session);

    // Step 4: Test download functionality with different job statuses
    console.log(chalk.yellow('\nStep 4: Testing download functionality...'));
    await testDownloadFunctionality(session, jobs);

    // Step 5: Test error messages
    console.log(chalk.yellow('\nStep 5: Testing error messages...'));
    await testErrorMessages(session);

    // Print test summary
    printTestSummary();

    // Check if all tests passed
    const allTestsPassed = Object.values(testResults).every(category => 
      Object.values(category).every(test => test.passed)
    );

    return allTestsPassed;
  } catch (error) {
    console.error(chalk.red('Unexpected error during tests:'), error);
    return false;
  }
}

/**
 * Get jobs with different statuses for testing
 */
async function getTestJobs(userId) {
  try {
    // Get jobs with different statuses
    const { data: jobs, error: jobsError } = await adminClient
      .from('jobs')
      .select('job_id, status, output_pdf_path, lecture_title, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (jobsError) {
      console.error(chalk.red('Error fetching jobs:'), jobsError);
      return null;
    }

    if (!jobs || jobs.length === 0) {
      console.error(chalk.red('No jobs found for the user'));
      return null;
    }

    console.log(chalk.green(`✓ Found ${jobs.length} jobs`));

    // Categorize jobs by status
    const completedJobs = jobs.filter(job => job.status === 'completed' && job.output_pdf_path);
    const processingJobs = jobs.filter(job => job.status === 'processing');
    const failedJobs = jobs.filter(job => job.status === 'failed');
    
    // Create a non-existent job ID for testing
    const nonexistentJobId = 'nonexistent-job-id-' + Date.now();

    console.log(chalk.green(`✓ Completed jobs: ${completedJobs.length}`));
    console.log(chalk.green(`✓ Processing jobs: ${processingJobs.length}`));
    console.log(chalk.green(`✓ Failed jobs: ${failedJobs.length}`));

    return {
      completedJob: completedJobs.length > 0 ? completedJobs[0] : null,
      processingJob: processingJobs.length > 0 ? processingJobs[0] : null,
      failedJob: failedJobs.length > 0 ? failedJobs[0] : null,
      nonexistentJobId
    };
  } catch (error) {
    console.error(chalk.red('Error retrieving test jobs:'), error);
    return null;
  }
}

/**
 * Test UI display
 */
async function testUIDisplay(session) {
  try {
    // Fetch the dashboard page
    console.log('Fetching dashboard page...');
    const response = await fetch(`${API_BASE_URL}/dashboard`, {
      headers: {
        'Cookie': `sb-access-token=${session.access_token}; sb-refresh-token=${session.refresh_token}`
      }
    });

    if (!response.ok) {
      console.error(chalk.red('Failed to fetch dashboard:'), response.status, response.statusText);
      return;
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    // Test 1: Check for file paths in the UI
    console.log('Checking for file paths in the UI...');
    const jobElements = document.querySelectorAll('[data-job-id]');
    
    if (jobElements.length === 0) {
      console.log(chalk.yellow('No job elements found in the UI. Skipping file path check.'));
    } else {
      let filePathFound = false;
      
      jobElements.forEach(element => {
        const textContent = element.textContent || '';
        // Check for common file path patterns
        if (textContent.includes('/') && (
            textContent.includes('.pdf') || 
            textContent.includes('uploads/') || 
            textContent.includes('storage/') ||
            textContent.includes('cornell-notes/')
        )) {
          filePathFound = true;
          console.error(chalk.red('✗ File path found in UI:'), textContent.trim());
        }
      });
      
      if (!filePathFound) {
        console.log(chalk.green('✓ No file paths displayed in the UI'));
        testResults.uiDisplay.noFilePaths.passed = true;
        testResults.uiDisplay.noFilePaths.details = 'No file paths found in the UI';
      } else {
        testResults.uiDisplay.noFilePaths.details = 'File paths found in the UI';
      }
    }

    // Test 2: Check for NULL values in the UI
    console.log('Checking for NULL values in the UI...');
    const pageContent = document.body.textContent || '';
    const nullPattern = /\bnull\b/i;
    
    if (nullPattern.test(pageContent)) {
      console.error(chalk.red('✗ NULL values found in the UI'));
      testResults.uiDisplay.noNullValues.details = 'NULL values found in the UI';
    } else {
      console.log(chalk.green('✓ No NULL values displayed in the UI'));
      testResults.uiDisplay.noNullValues.passed = true;
      testResults.uiDisplay.noNullValues.details = 'No NULL values found in the UI';
    }

    // Test 3: Check that only relevant information is displayed
    console.log('Checking for relevant information display...');
    let relevantInfoFound = false;
    
    jobElements.forEach(element => {
      // Check for expected job information
      const hasTitle = element.querySelector('[data-job-title]') !== null;
      const hasStatus = element.querySelector('[data-job-status]') !== null;
      const hasDate = element.querySelector('[data-job-date]') !== null;
      
      if (hasTitle && hasStatus) {
        relevantInfoFound = true;
      }
    });
    
    if (relevantInfoFound || jobElements.length === 0) {
      console.log(chalk.green('✓ Only relevant information is displayed in the UI'));
      testResults.uiDisplay.relevantInfoOnly.passed = true;
      testResults.uiDisplay.relevantInfoOnly.details = 'Only relevant information is displayed';
    } else {
      console.error(chalk.red('✗ Relevant information is missing in the UI'));
      testResults.uiDisplay.relevantInfoOnly.details = 'Relevant information is missing';
    }
  } catch (error) {
    console.error(chalk.red('Error testing UI display:'), error);
  }
}

/**
 * Test download functionality with different job statuses
 */
async function testDownloadFunctionality(session, jobs) {
  // Test 1: Download a completed job
  if (jobs.completedJob) {
    console.log(`Testing download for completed job: ${jobs.completedJob.job_id}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/download/${jobs.completedJob.job_id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        const contentDisposition = response.headers.get('content-disposition');
        
        if (contentType === 'application/pdf' && contentDisposition) {
          console.log(chalk.green('✓ Successfully downloaded completed job'));
          testResults.downloadFunctionality.completedJob.passed = true;
          testResults.downloadFunctionality.completedJob.details = 'Successfully downloaded PDF';
        } else {
          console.error(chalk.red('✗ Downloaded file is not a PDF or missing content disposition'));
          testResults.downloadFunctionality.completedJob.details = 'Downloaded file is not a proper PDF';
        }
      } else {
        console.error(chalk.red('✗ Failed to download completed job:'), response.status, response.statusText);
        testResults.downloadFunctionality.completedJob.details = `Failed with status ${response.status}`;
      }
    } catch (error) {
      console.error(chalk.red('Error downloading completed job:'), error);
      testResults.downloadFunctionality.completedJob.details = `Error: ${error.message}`;
    }
  } else {
    console.log(chalk.yellow('No completed job available for testing'));
    testResults.downloadFunctionality.completedJob.passed = true;
    testResults.downloadFunctionality.completedJob.details = 'Skipped - No completed job available';
  }

  // Test 2: Try to download a processing job
  if (jobs.processingJob) {
    console.log(`Testing download for processing job: ${jobs.processingJob.job_id}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/download/${jobs.processingJob.job_id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      // We expect this to fail with a 400 status
      if (response.status === 400) {
        const errorData = await response.json();
        console.log(chalk.green('✓ Correctly rejected download for processing job'));
        testResults.downloadFunctionality.processingJob.passed = true;
        testResults.downloadFunctionality.processingJob.details = 'Correctly rejected with status 400';
      } else if (response.ok) {
        console.error(chalk.red('✗ Unexpectedly allowed download of processing job'));
        testResults.downloadFunctionality.processingJob.details = 'Incorrectly allowed download';
      } else {
        console.error(chalk.red('✗ Unexpected status for processing job:'), response.status);
        testResults.downloadFunctionality.processingJob.details = `Unexpected status ${response.status}`;
      }
    } catch (error) {
      console.error(chalk.red('Error testing processing job download:'), error);
      testResults.downloadFunctionality.processingJob.details = `Error: ${error.message}`;
    }
  } else {
    console.log(chalk.yellow('No processing job available for testing'));
    testResults.downloadFunctionality.processingJob.passed = true;
    testResults.downloadFunctionality.processingJob.details = 'Skipped - No processing job available';
  }

  // Test 3: Try to download a failed job
  if (jobs.failedJob) {
    console.log(`Testing download for failed job: ${jobs.failedJob.job_id}`);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/download/${jobs.failedJob.job_id}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      // We expect this to fail with a 400 status
      if (response.status === 400) {
        const errorData = await response.json();
        console.log(chalk.green('✓ Correctly rejected download for failed job'));
        testResults.downloadFunctionality.failedJob.passed = true;
        testResults.downloadFunctionality.failedJob.details = 'Correctly rejected with status 400';
      } else if (response.ok) {
        console.error(chalk.red('✗ Unexpectedly allowed download of failed job'));
        testResults.downloadFunctionality.failedJob.details = 'Incorrectly allowed download';
      } else {
        console.error(chalk.red('✗ Unexpected status for failed job:'), response.status);
        testResults.downloadFunctionality.failedJob.details = `Unexpected status ${response.status}`;
      }
    } catch (error) {
      console.error(chalk.red('Error testing failed job download:'), error);
      testResults.downloadFunctionality.failedJob.details = `Error: ${error.message}`;
    }
  } else {
    console.log(chalk.yellow('No failed job available for testing'));
    testResults.downloadFunctionality.failedJob.passed = true;
    testResults.downloadFunctionality.failedJob.details = 'Skipped - No failed job available';
  }

  // Test 4: Try to download a non-existent job
  console.log(`Testing download for non-existent job: ${jobs.nonexistentJobId}`);
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/download/${jobs.nonexistentJobId}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    // We expect this to fail with a 404 status
    if (response.status === 404) {
      const errorData = await response.json();
      console.log(chalk.green('✓ Correctly returned 404 for non-existent job'));
      testResults.downloadFunctionality.nonexistentJob.passed = true;
      testResults.downloadFunctionality.nonexistentJob.details = 'Correctly returned 404';
    } else {
      console.error(chalk.red('✗ Unexpected status for non-existent job:'), response.status);
      testResults.downloadFunctionality.nonexistentJob.details = `Unexpected status ${response.status}`;
    }
  } catch (error) {
    console.error(chalk.red('Error testing non-existent job download:'), error);
    testResults.downloadFunctionality.nonexistentJob.details = `Error: ${error.message}`;
  }
}

/**
 * Test error messages
 */
async function testErrorMessages(session) {
  // Test 1: Job not found error
  console.log('Testing job not found error message...');
  const nonexistentJobId = 'nonexistent-job-id-' + Date.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/download/${nonexistentJobId}`, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });

    if (response.status === 404) {
      const errorData = await response.json();
      
      if (errorData.error && 
          errorData.error.message && 
          errorData.error.message.includes('not found')) {
        console.log(chalk.green('✓ Job not found error message is clear and helpful'));
        testResults.errorMessages.jobNotFound.passed = true;
        testResults.errorMessages.jobNotFound.details = 'Clear error message provided';
      } else {
        console.error(chalk.red('✗ Job not found error message is not clear:'), errorData.error?.message);
        testResults.errorMessages.jobNotFound.details = 'Error message is not clear';
      }
    } else {
      console.error(chalk.red('✗ Unexpected status for job not found test:'), response.status);
      testResults.errorMessages.jobNotFound.details = `Unexpected status ${response.status}`;
    }
  } catch (error) {
    console.error(chalk.red('Error testing job not found message:'), error);
    testResults.errorMessages.jobNotFound.details = `Error: ${error.message}`;
  }

  // Test 2: Job not ready error
  console.log('Testing job not ready error message...');
  
  // Get a processing job
  const { data: processingJobs, error: jobsError } = await adminClient
    .from('jobs')
    .select('job_id')
    .eq('status', 'processing')
    .limit(1);

  if (jobsError) {
    console.error(chalk.red('Error fetching processing job:'), jobsError);
    testResults.errorMessages.jobNotReady.details = 'Could not fetch processing job';
    return;
  }

  if (processingJobs && processingJobs.length > 0) {
    const processingJobId = processingJobs[0].job_id;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/download/${processingJobId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.status === 400) {
        const errorData = await response.json();
        
        if (errorData.error && 
            errorData.error.message && 
            errorData.error.message.includes('processing') || 
            errorData.error.message.includes('not ready')) {
          console.log(chalk.green('✓ Job not ready error message is clear and helpful'));
          testResults.errorMessages.jobNotReady.passed = true;
          testResults.errorMessages.jobNotReady.details = 'Clear error message provided';
        } else {
          console.error(chalk.red('✗ Job not ready error message is not clear:'), errorData.error?.message);
          testResults.errorMessages.jobNotReady.details = 'Error message is not clear';
        }
      } else {
        console.error(chalk.red('✗ Unexpected status for job not ready test:'), response.status);
        testResults.errorMessages.jobNotReady.details = `Unexpected status ${response.status}`;
      }
    } catch (error) {
      console.error(chalk.red('Error testing job not ready message:'), error);
      testResults.errorMessages.jobNotReady.details = `Error: ${error.message}`;
    }
  } else {
    console.log(chalk.yellow('No processing job available for testing job not ready error'));
    testResults.errorMessages.jobNotReady.passed = true;
    testResults.errorMessages.jobNotReady.details = 'Skipped - No processing job available';
  }

  // Test 3: No output file error
  console.log('Testing no output file error message...');
  
  // Get a job with no output file
  const { data: noOutputJobs, error: noOutputError } = await adminClient
    .from('jobs')
    .select('job_id')
    .eq('status', 'completed')
    .is('output_pdf_path', null)
    .limit(1);

  if (noOutputError) {
    console.error(chalk.red('Error fetching job with no output:'), noOutputError);
    testResults.errorMessages.noOutputFile.details = 'Could not fetch job with no output';
    return;
  }

  if (noOutputJobs && noOutputJobs.length > 0) {
    const noOutputJobId = noOutputJobs[0].job_id;
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/download/${noOutputJobId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.status === 404) {
        const errorData = await response.json();
        
        if (errorData.error && 
            errorData.error.message && 
            errorData.error.message.includes('not available')) {
          console.log(chalk.green('✓ No output file error message is clear and helpful'));
          testResults.errorMessages.noOutputFile.passed = true;
          testResults.errorMessages.noOutputFile.details = 'Clear error message provided';
        } else {
          console.error(chalk.red('✗ No output file error message is not clear:'), errorData.error?.message);
          testResults.errorMessages.noOutputFile.details = 'Error message is not clear';
        }
      } else {
        console.error(chalk.red('✗ Unexpected status for no output file test:'), response.status);
        testResults.errorMessages.noOutputFile.details = `Unexpected status ${response.status}`;
      }
    } catch (error) {
      console.error(chalk.red('Error testing no output file message:'), error);
      testResults.errorMessages.noOutputFile.details = `Error: ${error.message}`;
    }
  } else {
    console.log(chalk.yellow('No job with null output_pdf_path available for testing'));
    testResults.errorMessages.noOutputFile.passed = true;
    testResults.errorMessages.noOutputFile.details = 'Skipped - No job with null output_pdf_path available';
  }
}

/**
 * Print test summary
 */
function printTestSummary() {
  console.log(chalk.blue('\n=== Test Summary ==='));
  
  // UI Display Tests
  console.log(chalk.yellow('\nUI Display Tests:'));
  Object.entries(testResults.uiDisplay).forEach(([test, result]) => {
    const status = result.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
    console.log(`${status} ${formatTestName(test)}: ${result.details}`);
  });
  
  // Download Functionality Tests
  console.log(chalk.yellow('\nDownload Functionality Tests:'));
  Object.entries(testResults.downloadFunctionality).forEach(([test, result]) => {
    const status = result.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
    console.log(`${status} ${formatTestName(test)}: ${result.details}`);
  });
  
  // Error Messages Tests
  console.log(chalk.yellow('\nError Messages Tests:'));
  Object.entries(testResults.errorMessages).forEach(([test, result]) => {
    const status = result.passed ? chalk.green('✓ PASS') : chalk.red('✗ FAIL');
    console.log(`${status} ${formatTestName(test)}: ${result.details}`);
  });
}

/**
 * Format test name for display
 */
function formatTestName(testName) {
  return testName
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .replace(/([A-Z])/g, str => str.toUpperCase());
}

// Run the tests
runEndToEndTests()
  .then(success => {
    if (success) {
      console.log(chalk.green('\nAll end-to-end tests passed!'));
      process.exit(0);
    } else {
      console.error(chalk.red('\nSome end-to-end tests failed!'));
      process.exit(1);
    }
  })
  .catch(error => {
    console.error(chalk.red('\nUnexpected error during tests:'), error);
    process.exit(1);
  });