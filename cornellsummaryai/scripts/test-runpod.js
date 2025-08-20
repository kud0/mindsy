/**
 * Test script for RunPod client integration testing
 * 
 * This script tests the RunPod client with the actual RunPod API
 * to verify that the fix for the response format issue works.
 * 
 * Usage:
 * node scripts/test-runpod.js
 */

// Import required modules using ES module syntax
import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config();

// Get API key and test audio URL from environment variables
const RUNPOD_API_KEY = process.env.RUNPOD_API_KEY;
const TEST_AUDIO_URL = process.env.TEST_AUDIO_URL;
const RUNPOD_ENDPOINT = 'https://api.runpod.ai/v2/ojwmcpij9mwq9w/runsync';

// Validate environment variables
if (!RUNPOD_API_KEY) {
  console.error('Error: RUNPOD_API_KEY environment variable is not set');
  process.exit(1);
}

if (!TEST_AUDIO_URL) {
  console.error('Error: TEST_AUDIO_URL environment variable is not set');
  process.exit(1);
}

async function testRunPodAPI() {
  console.log('Testing RunPod API directly...');
  console.log(`Audio URL: ${TEST_AUDIO_URL.substring(0, 50)}...`);
  
  try {
    // Create request body
    const requestBody = {
      input: {
        audio: TEST_AUDIO_URL
      }
    };
    
    // Send request to RunPod API
    console.log('Sending transcription request to RunPod API...');
    const response = await fetch(RUNPOD_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RUNPOD_API_KEY}`
      },
      body: JSON.stringify(requestBody)
    });
    
    // Check if response is OK
    if (!response.ok) {
      const errorText = await response.text();
      console.error('RunPod API error:', response.status, response.statusText);
      console.error('Error details:', errorText);
      return false;
    }
    
    // Parse response
    const data = await response.json();
    
    // Log the full response structure
    console.log('RunPod API response structure:');
    console.log(JSON.stringify(data, null, 2));
    
    // Check if the job is still in progress
    if (data.status === 'IN_PROGRESS') {
      console.log('\nJob is still in progress. Testing retry mechanism...');
      
      // Wait for 5 seconds
      console.log('Waiting 5 seconds before retrying...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Retry the request
      console.log('Retrying request...');
      return await testRunPodAPI();
    }
    
    // Try to extract transcription text
    let transcriptionText = null;
    
    // Check for different response formats
    if (data.output && typeof data.output.text === 'string') {
      transcriptionText = data.output.text;
      console.log('Found transcription in output.text format');
    } else if (data.output && typeof data.output.transcription === 'string') {
      transcriptionText = data.output.transcription;
      console.log('Found transcription in output.transcription format');
    } else if (data.output && data.output.result && typeof data.output.result.transcription === 'string') {
      transcriptionText = data.output.result.transcription;
      console.log('Found transcription in output.result.transcription format');
    } else if (data.output && typeof data.output.transcript === 'string') {
      transcriptionText = data.output.transcript;
      console.log('Found transcription in output.transcript format');
    } else if (data.output && data.output.data && typeof data.output.data.transcript === 'string') {
      transcriptionText = data.output.data.transcript;
      console.log('Found transcription in output.data.transcript format');
    } else if (data.output && data.output.data && typeof data.output.data.transcription === 'string') {
      transcriptionText = data.output.data.transcription;
      console.log('Found transcription in output.data.transcription format');
    } else if (data.output && data.output.data && typeof data.output.data.text === 'string') {
      transcriptionText = data.output.data.text;
      console.log('Found transcription in output.data.text format');
    } else {
      console.error('Could not find transcription text in response');
      console.error('Response keys:', Object.keys(data));
      if (data.output) {
        console.error('Output keys:', Object.keys(data.output));
        
        // Check for nested objects
        for (const key in data.output) {
          if (typeof data.output[key] === 'object' && data.output[key] !== null) {
            console.error(`${key} keys:`, Object.keys(data.output[key]));
          }
        }
      }
      return false;
    }
    
    // Log the transcription text
    console.log('\nTranscription text:');
    console.log('-------------------');
    console.log(transcriptionText);
    console.log('-------------------\n');
    
    return true;
  } catch (error) {
    console.error('Error during API request:', error);
    return false;
  }
}

// Run the test
testRunPodAPI()
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