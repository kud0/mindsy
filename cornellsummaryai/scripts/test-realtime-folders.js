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

async function testRealtimeFolders() {
  console.log('🔍 Testing Supabase Realtime for folders table...\n');

  // Get a test user ID (you'll need to replace this with an actual user ID)
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

  // Set up real-time subscription
  console.log('\n📡 Setting up real-time subscription...');
  
  const channel = supabase
    .channel('test-folders')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'folders'
      },
      (payload) => {
        console.log('\n✅ Real-time event received!');
        console.log('Event type:', payload.eventType);
        console.log('Payload:', JSON.stringify(payload, null, 2));
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to folders table');
        performTest();
      }
    });

  // Perform test operations
  async function performTest() {
    console.log('\n🧪 Performing test operations...');
    
    // Create a test folder
    console.log('\n1. Creating test folder...');
    const { data: folder, error: createError } = await supabase
      .from('folders')
      .insert({
        user_id: userId,
        name: `Test Folder ${Date.now()}`,
        color: '#FF0000',
        icon: '🧪'
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating folder:', createError);
      return;
    }

    console.log('Created folder:', folder);

    // Wait a bit for real-time event
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Update the folder
    console.log('\n2. Updating test folder...');
    const { error: updateError } = await supabase
      .from('folders')
      .update({ name: 'Updated Test Folder' })
      .eq('id', folder.id);

    if (updateError) {
      console.error('Error updating folder:', updateError);
    }

    // Wait a bit for real-time event
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Delete the folder
    console.log('\n3. Deleting test folder...');
    const { error: deleteError } = await supabase
      .from('folders')
      .delete()
      .eq('id', folder.id);

    if (deleteError) {
      console.error('Error deleting folder:', deleteError);
    }

    // Wait for events
    console.log('\n⏳ Waiting 5 seconds for all real-time events...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Clean up
    console.log('\n🧹 Cleaning up...');
    supabase.removeChannel(channel);
    console.log('✅ Test complete!');
    process.exit(0);
  }
}

testRealtimeFolders().catch(console.error);