#!/usr/bin/env node

/**
 * Test Folder Creation API
 * 
 * This script tests the folder creation functionality to debug
 * why the create folder button isn't working.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFolderSystem() {
  console.log('🧪 Testing Folder System...\n');
  
  try {
    // 1. Check if folders table exists
    console.log('1️⃣ Checking folders table...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('folders')
      .select('id')
      .limit(1);
    
    if (tableError) {
      console.error('❌ Folders table error:', tableError.message);
      console.log('💡 Run: npm run setup-folders or execute create_folders_system.sql in Supabase');
      return;
    }
    
    console.log('✅ Folders table exists');
    
    // 2. Test get_folder_hierarchy function
    console.log('\n2️⃣ Testing get_folder_hierarchy function...');
    const { data: hierarchyData, error: hierarchyError } = await supabase
      .rpc('get_folder_hierarchy', { p_user_id: '00000000-0000-0000-0000-000000000000' });
    
    if (hierarchyError) {
      console.error('❌ get_folder_hierarchy function error:', hierarchyError.message);
      console.log('💡 The function may not exist. Check create_folders_system.sql');
      return;
    }
    
    console.log('✅ get_folder_hierarchy function exists');
    
    // 3. Check if jobs table has folder_id column
    console.log('\n3️⃣ Checking jobs table folder_id column...');
    const { data: jobsCheck, error: jobsError } = await supabase
      .from('jobs')
      .select('folder_id')
      .limit(1);
    
    if (jobsError && jobsError.message.includes('folder_id')) {
      console.error('❌ Jobs table missing folder_id column:', jobsError.message);
      console.log('💡 Need to add folder_id column to jobs table');
      return;
    }
    
    console.log('✅ Jobs table has folder_id column');
    
    // 4. Test folder creation with a test user
    console.log('\n4️⃣ Testing folder creation...');
    
    // Get a real user ID for testing
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError || !users || users.users.length === 0) {
      console.log('⚠️ No users found for testing folder creation');
      console.log('✅ Basic folder system structure is in place');
      return;
    }
    
    const testUserId = users.users[0].id;
    console.log(`📝 Testing with user: ${users.users[0].email || testUserId}`);
    
    // Try to create a test folder
    const { data: testFolder, error: createError } = await supabase
      .from('folders')
      .insert({
        user_id: testUserId,
        name: 'Test Folder - ' + Date.now(),
        color: '#3B82F6',
        icon: '📁'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Folder creation failed:', createError.message);
      
      if (createError.message.includes('RLS')) {
        console.log('💡 Row Level Security issue - users might not be authenticated properly');
      }
      if (createError.message.includes('foreign key')) {
        console.log('💡 Foreign key constraint issue - user_id reference problem');
      }
      return;
    }
    
    console.log('✅ Test folder created successfully:', testFolder.name);
    
    // Clean up test folder
    await supabase
      .from('folders')
      .delete()
      .eq('id', testFolder.id);
    
    console.log('🧹 Test folder cleaned up');
    
    console.log('\n🎉 Folder system is working correctly!');
    console.log('\n🔍 If the UI button isn\'t working, check:');
    console.log('1. Browser console for JavaScript errors');
    console.log('2. User authentication in the browser');
    console.log('3. Network tab for failed API requests');
    console.log('4. Click the "+" button next to "Folders" in dashboard sidebar');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testFolderSystem();