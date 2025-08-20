#!/usr/bin/env node

/**
 * Environment Variable Check Utility
 * 
 * This script checks if all required environment variables are set.
 * It's useful for debugging environment variable issues.
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
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
  'GOTENBERG_API_URL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET'
];

// Check if environment variables are set
const missingVars = requiredVars.filter(varName => !process.env[varName]);

console.log('Environment Variable Check:');
console.log('==========================');

if (missingVars.length === 0) {
  console.log('✅ All required environment variables are set.');
} else {
  console.log(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
}

// Print all environment variables (with sensitive values masked)
console.log('\nEnvironment Variables:');
requiredVars.forEach(varName => {
  const value = process.env[varName];
  let displayValue = value;
  
  // Mask sensitive values
  if (value && (varName.includes('KEY') || varName.includes('SECRET'))) {
    displayValue = value.substring(0, 4) + '...' + value.substring(value.length - 4);
  }
  
  console.log(`${varName}: ${value ? displayValue : '❌ Not set'}`);
});

// Check if .env file exists
const envPath = path.join(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  console.log('\n✅ .env file exists');
  
  // Check if .env file contains all required variables
  const envContent = fs.readFileSync(envPath, 'utf8');
  const missingInFile = requiredVars.filter(varName => !envContent.includes(varName + '='));
  
  if (missingInFile.length === 0) {
    console.log('✅ .env file contains all required variables');
  } else {
    console.log(`❌ Variables missing in .env file: ${missingInFile.join(', ')}`);
  }
} else {
  console.log('\n❌ .env file does not exist');
}