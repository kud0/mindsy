#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testSubfolderRealtime() {
  console.log('🧪 Testing Subfolder Real-time Deletion...\n');

  // Get a test user ID
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);

  if (!users || users.length === 0) {
    console.error('No users found in database');
    return;
  }

  const userId = users[0].id;
  console.log('Using user ID:', userId);

  // Create a parent folder
  console.log('\n1. Creating parent folder...');
  const { data: parentFolder, error: parentError } = await supabase
    .from('folders')
    .insert({
      user_id: userId,
      name: `Parent Folder ${Date.now()}`,
      color: '#00FF00',
      icon: '📁'
    })
    .select()
    .single();

  if (parentError) {
    console.error('Error creating parent folder:', parentError);
    return;
  }

  console.log('✅ Created parent folder:', parentFolder.name);

  // Create a subfolder
  console.log('\n2. Creating subfolder...');
  const { data: subfolder, error: subError } = await supabase
    .from('folders')
    .insert({
      user_id: userId,
      parent_id: parentFolder.id,
      name: `Subfolder ${Date.now()}`,
      color: '#FF0000',
      icon: '📂'
    })
    .select()
    .single();

  if (subError) {
    console.error('Error creating subfolder:', subError);
    // Clean up parent
    await supabase.from('folders').delete().eq('id', parentFolder.id);
    return;
  }

  console.log('✅ Created subfolder:', subfolder.name);

  // Wait a moment
  console.log('\n⏳ Waiting 2 seconds before deletion...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Delete the subfolder
  console.log('\n3. Deleting subfolder...');
  const { error: deleteError } = await supabase
    .from('folders')
    .delete()
    .eq('id', subfolder.id);

  if (deleteError) {
    console.error('Error deleting subfolder:', deleteError);
  } else {
    console.log('✅ Subfolder deleted successfully');
  }

  // Wait and then clean up
  console.log('\n⏳ Waiting 2 seconds before cleanup...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Clean up parent folder
  console.log('\n4. Cleaning up parent folder...');
  const { error: cleanupError } = await supabase
    .from('folders')
    .delete()
    .eq('id', parentFolder.id);

  if (cleanupError) {
    console.error('Error cleaning up:', cleanupError);
  } else {
    console.log('✅ Cleanup complete');
  }

  console.log('\n🎉 Test complete! Check your dashboard to verify:');
  console.log('1. The subfolder should disappear immediately from the parent folder');
  console.log('2. No browser refresh should be needed');
  console.log('3. Check the browser console for real-time event logs');
}

testSubfolderRealtime().catch(console.error);