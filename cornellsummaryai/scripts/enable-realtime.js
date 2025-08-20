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

async function enableRealtime() {
  console.log('🔧 Enabling real-time for folders and jobs tables...\n');

  try {
    // Enable real-time for folders table
    console.log('1. Enabling real-time for folders table...');
    const { error: foldersError } = await supabase.rpc('exec_sql', {
      sql: `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS folders;`
    }).single();

    if (foldersError) {
      // Try alternative approach - this might not work but worth trying
      console.log('   Note: Direct SQL execution might not be available. You may need to enable this in Supabase Dashboard.');
      console.log('   Go to: Table Editor > folders > Click "Enable Realtime"');
    } else {
      console.log('   ✅ Real-time enabled for folders table');
    }

    // Enable real-time for jobs table
    console.log('\n2. Enabling real-time for jobs table...');
    const { error: jobsError } = await supabase.rpc('exec_sql', {
      sql: `ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS jobs;`
    }).single();

    if (jobsError) {
      console.log('   Note: Direct SQL execution might not be available. You may need to enable this in Supabase Dashboard.');
      console.log('   Go to: Table Editor > jobs > Click "Enable Realtime"');
    } else {
      console.log('   ✅ Real-time enabled for jobs table');
    }

    console.log('\n📝 Instructions to enable real-time manually:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to Database > Replication');
    console.log('3. Under "Source", find the tables: folders and jobs');
    console.log('4. Toggle the switch to enable real-time for each table');
    console.log('\nAlternatively:');
    console.log('1. Go to Table Editor');
    console.log('2. Select the "folders" table');
    console.log('3. Click the "Enable Realtime" button');
    console.log('4. Repeat for the "jobs" table');

  } catch (error) {
    console.error('Error:', error);
    console.log('\n⚠️  Could not enable real-time programmatically.');
    console.log('Please enable it manually in the Supabase Dashboard.');
  }
}

enableRealtime().catch(console.error);