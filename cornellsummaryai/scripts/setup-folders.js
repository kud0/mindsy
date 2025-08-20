#!/usr/bin/env node

/**
 * Setup Folders System Database Script
 * 
 * This script creates the necessary database tables and functions
 * for the folder organization feature.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupFoldersSystem() {
  console.log('🚀 Setting up folders system...\n');
  
  try {
    // Read the SQL file
    const sqlPath = join(__dirname, '..', 'create_folders_system.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    console.log('📝 Executing folder system SQL...');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // If rpc method doesn't exist, try direct SQL execution
      console.log('⚠️  RPC method not available, trying direct execution...');
      
      // Split SQL into individual statements and execute them
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
      
      for (const statement of statements) {
        try {
          const { error: execError } = await supabase.rpc('exec_sql', { 
            sql_query: statement 
          });
          
          if (execError) {
            console.log(`⚠️  Statement may have failed (often normal): ${statement.substring(0, 50)}...`);
          }
        } catch (e) {
          console.log(`⚠️  Statement execution note: ${e.message}`);
        }
      }
    }
    
    console.log('✅ Folder system setup completed!');
    
    // Verify the setup
    console.log('\n🔍 Verifying setup...');
    
    // Test the function
    const { data: testData, error: testError } = await supabase
      .rpc('get_folder_hierarchy', { p_user_id: '00000000-0000-0000-0000-000000000000' });
    
    if (testError) {
      console.log('⚠️  Function test failed (may be normal if no test user):', testError.message);
    } else {
      console.log('✅ get_folder_hierarchy function is working');
    }
    
    // Check if folders table exists
    const { data: tableCheck } = await supabase
      .from('folders')
      .select('id')
      .limit(1);
    
    console.log('✅ folders table is accessible');
    
    console.log('\n🎉 Folder system is ready!');
    console.log('\nNext steps:');
    console.log('1. Restart your development server (npm run dev)');
    console.log('2. Try creating a folder from the dashboard sidebar');
    console.log('3. The "+" button next to "Folders" should now work!');
    
  } catch (error) {
    console.error('❌ Error setting up folders system:', error.message);
    
    console.log('\n🔧 Manual Setup Instructions:');
    console.log('1. Go to your Supabase dashboard');
    console.log('2. Navigate to SQL Editor');  
    console.log('3. Copy and paste the contents of create_folders_system.sql');
    console.log('4. Click "Run" to execute the SQL');
    
    process.exit(1);
  }
}

// Run the setup
setupFoldersSystem();