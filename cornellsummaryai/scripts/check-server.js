/**
 * Check if the server is running
 * 
 * This script checks if the server is running at the specified URL
 * before running the end-to-end tests.
 */

import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

async function checkServerRunning() {
  try {
    console.log(`Checking if server is running at ${API_BASE_URL}...`);
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      timeout: 5000
    });
    
    if (response.ok) {
      console.log('Server is running!');
      return true;
    } else {
      console.error(`Server returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.error('Server is not running:', error.message);
    return false;
  }
}

// Run the check
checkServerRunning()
  .then(isRunning => {
    if (!isRunning) {
      console.error('\nPlease start the server before running the tests:');
      console.error('  npm run dev');
      process.exit(1);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('Error checking server:', error);
    process.exit(1);
  });