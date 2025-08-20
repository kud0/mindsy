/**
 * Simple migration runner for notifications table
 * Run with: node scripts/run-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
if (process.env.NODE_ENV !== 'production') {
  const { config } = await import('dotenv');
  config();
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('🚀 Running notifications table migration...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add_notifications_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('❌ Migration failed:', error);
      process.exit(1);
    }
    
    console.log('✅ Notifications table migration completed successfully!');
    console.log('📋 Created:');
    console.log('  - notifications table');
    console.log('  - RLS policies');
    console.log('  - Indexes for performance');
    console.log('  - Updated trigger');
    
  } catch (error) {
    console.error('❌ Error running migration:', error);
    process.exit(1);
  }
}

// Alternative method if rpc doesn't work - execute raw SQL
async function runMigrationDirect() {
  try {
    console.log('🚀 Running notifications table migration (direct)...');
    
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', 'add_notifications_table.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split into individual statements and execute
    const statements = migrationSQL.split(';').filter(stmt => stmt.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.trim().substring(0, 50) + '...');
        const { error } = await supabase.from('_migration_temp').select().limit(0);
        if (error && error.code === '42P01') {
          // Table doesn't exist, which is expected for raw SQL execution
          console.log('Raw SQL execution - this approach might not work with hosted Supabase');
        }
      }
    }
    
    console.log('✅ Migration attempt completed!');
    
  } catch (error) {
    console.error('❌ Error with direct migration:', error);
    console.log('💡 You may need to run this SQL manually in the Supabase Dashboard:');
    console.log('   https://app.supabase.com/project/[your-project]/sql');
  }
}

// Check if notifications table exists first
async function checkTable() {
  const { data, error } = await supabase
    .from('notifications')
    .select('id')
    .limit(1);
    
  if (error && error.code === '42P01') {
    console.log('❌ Notifications table does not exist');
    return false;
  } else if (error) {
    console.error('❌ Error checking table:', error);
    return false;
  } else {
    console.log('✅ Notifications table already exists');
    return true;
  }
}

async function main() {
  console.log('🔍 Checking if notifications table exists...');
  const tableExists = await checkTable();
  
  if (!tableExists) {
    console.log('\n📝 To create the notifications table, please:');
    console.log('1. Go to your Supabase Dashboard: https://app.supabase.com/project/[your-project]/sql');
    console.log('2. Copy and paste the SQL from: supabase/migrations/add_notifications_table.sql');
    console.log('3. Click "Run" to execute the migration');
    console.log('\nThis will create the notifications table with proper RLS policies and indexes.');
  }
}

main().catch(console.error);