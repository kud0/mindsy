#!/usr/bin/env node

/**
 * Environment Variable Validation Script
 * 
 * This script validates that all required environment variables are set.
 * It's used as part of the build process to ensure proper configuration.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import fs from 'fs';

// Get current file directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
dotenv.config();

// Required environment variables
const requiredVars = [
  'PUBLIC_SUPABASE_URL',
  'PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'OPENAI_KEY',
  'RUNPOD_API_KEY',
  'TIKA_API_URL',
  'GOTENBERG_API_URL'
];

// Check if environment variables are set
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ Error: Missing required environment variables: ${missingVars.join(', ')}`);
  console.error('Please check your .env file and make sure all required variables are set.');
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file does not exist. Please create one based on .env.example');
  } else {
    // Check if variables are in .env file
    const envContent = fs.readFileSync(envPath, 'utf8');
    const missingInFile = missingVars.filter(varName => !envContent.includes(varName + '='));
    
    if (missingInFile.length > 0) {
      console.error(`❌ Variables missing in .env file: ${missingInFile.join(', ')}`);
    } else {
      console.error('❌ Variables exist in .env file but may be empty or not properly loaded.');
    }
  }
  
  process.exit(1);
} else {
  console.log('✅ All required environment variables are set.');
}

// Validate URL format for API endpoints
const urlVars = ['PUBLIC_SUPABASE_URL', 'TIKA_API_URL', 'GOTENBERG_API_URL'];
const invalidUrls = [];

for (const varName of urlVars) {
  const url = process.env[varName];
  if (url) {
    try {
      new URL(url);
    } catch (error) {
      invalidUrls.push(varName);
    }
  }
}

if (invalidUrls.length > 0) {
  console.error(`❌ Error: Invalid URL format for: ${invalidUrls.join(', ')}`);
  process.exit(1);
}

// Validate API key format
if (process.env.OPENAI_KEY && !process.env.OPENAI_KEY.startsWith('sk-')) {
  console.error('❌ Error: OPENAI_KEY appears to be invalid (should start with sk-)');
  process.exit(1);
}

console.log('✅ Environment validation successful.');