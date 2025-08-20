/**
 * Script to directly download a file from Supabase storage
 * 
 * This script downloads a file directly from Supabase storage using the file path
 * 
 * Usage:
 * node scripts/direct-download.js <file-path> <output-file>
 * 
 * Example:
 * node scripts/direct-download.js "3c684689-f3a2-4822-a72c-323b195a8b32/cornell-notes/testcornell-cornell_1752823306741_6lrh50.pdf" output.pdf
 */

// Import required modules using ES module syntax
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

// Get file path and output file from command line arguments
const filePath = process.argv[2];
const outputFile = process.argv[3] || 'output.pdf';

if (!filePath) {
  console.error('Error: File path is required');
  console.log('Usage: node scripts/direct-download.js <file-path> <output-file>');
  process.exit(1);
}

// Create Supabase admin client
const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function downloadFile() {
  console.log(`Downloading file: ${filePath}`);
  
  try {
    // Try to download from generated-notes bucket first
    console.log('Trying generated-notes bucket...');
    const { data: generatedData, error: generatedError } = await adminClient.storage
      .from('generated-notes')
      .download(filePath);
    
    if (!generatedError && generatedData) {
      console.log('File found in generated-notes bucket');
      
      // Convert blob to buffer
      const buffer = Buffer.from(await generatedData.arrayBuffer());
      
      // Write buffer to file
      fs.writeFileSync(outputFile, buffer);
      
      console.log(`File downloaded successfully to ${outputFile}`);
      return true;
    }
    
    // If not found in generated-notes, try user-uploads bucket
    console.log('File not found in generated-notes bucket, trying user-uploads bucket...');
    const { data: uploadsData, error: uploadsError } = await adminClient.storage
      .from('user-uploads')
      .download(filePath);
    
    if (!uploadsError && uploadsData) {
      console.log('File found in user-uploads bucket');
      
      // Convert blob to buffer
      const buffer = Buffer.from(await uploadsData.arrayBuffer());
      
      // Write buffer to file
      fs.writeFileSync(outputFile, buffer);
      
      console.log(`File downloaded successfully to ${outputFile}`);
      return true;
    }
    
    // If not found in either bucket, return error
    console.error('File not found in any bucket');
    console.error('Generated notes error:', generatedError);
    console.error('User uploads error:', uploadsError);
    return false;
  } catch (error) {
    console.error('Error downloading file:', error);
    return false;
  }
}

// Run the function
downloadFile()
  .then(success => {
    if (success) {
      console.log('Download completed successfully');
      process.exit(0);
    } else {
      console.error('Download failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });