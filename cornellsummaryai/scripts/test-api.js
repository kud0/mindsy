#!/usr/bin/env node

/**
 * API Testing Utility
 * 
 * This script provides a simple way to test the new API endpoints with various inputs.
 * It supports authentication, file uploads, and detailed response analysis.
 * 
 * Usage:
 *   node scripts/test-api.js [endpoint] [method] [data] [file1] [file2]
 * 
 * Examples:
 *   node scripts/test-api.js health GET
 *   node scripts/test-api.js generate POST '{"lectureTitle":"Test Lecture"}' ./test-audio.mp3 ./test-slides.pdf
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import FormData from 'form-data';
import { createReadStream } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get current file directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default values
const DEFAULT_BASE_URL = 'http://localhost:3000/api';
const DEFAULT_ENDPOINT = 'health';
const DEFAULT_METHOD = 'GET';

// Parse command line arguments
const endpoint = process.argv[2] || DEFAULT_ENDPOINT;
const method = process.argv[3] || DEFAULT_METHOD;
const dataStr = process.argv[4];
const file1Path = process.argv[5];
const file2Path = process.argv[6];

// Parse data
const data = dataStr ? JSON.parse(dataStr) : undefined;

// Construct the full URL
const baseUrl = process.env.API_BASE_URL || DEFAULT_BASE_URL;
const url = `${baseUrl}/${endpoint}`;

// Get authentication token if available
const authToken = process.env.AUTH_TOKEN;

// Function to make API request
async function makeRequest() {
  console.log(`Testing ${method} ${url}`);
  
  let options = {
    method,
    headers: {
      ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
    },
  };
  
  // Handle file uploads with FormData
  if (file1Path || file2Path) {
    const formData = new FormData();
    
    // Add JSON data if provided
    if (data) {
      formData.append('data', JSON.stringify(data), {
        contentType: 'application/json',
      });
    }
    
    // Add files if provided
    if (file1Path && fs.existsSync(file1Path)) {
      const file1Name = path.basename(file1Path);
      formData.append('file1', createReadStream(file1Path), { filename: file1Name });
      console.log(`Uploading file: ${file1Name}`);
    }
    
    if (file2Path && fs.existsSync(file2Path)) {
      const file2Name = path.basename(file2Path);
      formData.append('file2', createReadStream(file2Path), { filename: file2Name });
      console.log(`Uploading file: ${file2Name}`);
    }
    
    // Use form-data headers
    options.body = formData;
  } 
  // Handle JSON data
  else if (method !== 'GET' && data) {
    options.body = JSON.stringify(data);
    options.headers['Content-Type'] = 'application/json';
    console.log('Request data:', JSON.stringify(data, null, 2));
  }
  
  try {
    console.log('Sending request...');
    const startTime = performance.now();
    const response = await fetch(url, options);
    const responseTime = performance.now() - startTime;
    
    console.log(`Response received in ${responseTime.toFixed(2)}ms`);
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    // Log response headers
    console.log('\nResponse Headers:');
    response.headers.forEach((value, name) => {
      console.log(`${name}: ${value}`);
    });
    
    // Get response body
    const contentType = response.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      const jsonResponse = await response.json();
      console.log('\nResponse Body (JSON):');
      console.log(JSON.stringify(jsonResponse, null, 2));
      return { success: response.ok, data: jsonResponse, status: response.status };
    } else {
      const textResponse = await response.text();
      console.log('\nResponse Body (Text):');
      console.log(textResponse.length > 1000 
        ? `${textResponse.substring(0, 1000)}... (${textResponse.length} characters total)`
        : textResponse);
      return { success: response.ok, data: textResponse, status: response.status };
    }
  } catch (error) {
    console.error('\nRequest Failed:');
    console.error(error);
    return { success: false, error: error.message };
  }
}

// Run the test
makeRequest().then(result => {
  console.log(`\nTest ${result.success ? 'PASSED' : 'FAILED'} with status ${result.status || 'unknown'}`);
  process.exit(result.success ? 0 : 1);
});