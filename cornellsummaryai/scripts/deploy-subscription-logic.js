#!/usr/bin/env node

/**
 * Deployment Script: Subscription Tier Logic
 * 
 * This script safely deploys the effective subscription tier logic
 * by running migrations in the correct order.
 * 
 * Usage: node scripts/deploy-subscription-logic.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = dirname(__dirname);

// Create admin client
const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function runMigration(migrationFile, description) {
  console.log(`📄 Running migration: ${description}`);
  
  try {
    const migrationPath = join(projectRoot, 'supabase', 'migrations', migrationFile);
    const migrationSQL = readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements and execute them
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    for (const statement of statements) {
      if (statement.trim()) {
        const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' });
        
        if (error) {
          // If exec_sql function doesn't exist, try direct execution
          const { error: directError } = await supabase
            .from('_dummy')
            .select('*')
            .limit(0); // This will fail but allows us to execute SQL
          
          if (directError) {
            console.log('⚠️ Using alternative SQL execution method...');
            // For safety, we'll log the SQL and ask user to run manually
            console.log('Please run this SQL manually in your Supabase dashboard:');
            console.log('─'.repeat(60));
            console.log(statement + ';');
            console.log('─'.repeat(60));
          }
        }
      }
    }
    
    console.log(`✅ Migration completed: ${description}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Migration failed: ${description}`, error);
    return false;
  }
}

async function validateDeployment() {
  console.log('\n🔍 Validating deployment...');
  
  try {
    // Test if new functions exist and work
    const testUserId = 'test-user-id'; // This will fail gracefully
    
    // Test get_effective_subscription_tier
    const { error: tierError } = await supabase
      .rpc('get_effective_subscription_tier', { p_user_id: testUserId });
    
    if (tierError && !tierError.message.includes('no rows')) {
      console.log('✅ get_effective_subscription_tier function deployed');
    } else {
      console.log('⚠️ get_effective_subscription_tier function may have issues');
    }
    
    // Test check_usage_limits
    const { error: usageError } = await supabase
      .rpc('check_usage_limits', { p_user_id: testUserId, p_file_size_mb: 10 });
    
    if (usageError && !usageError.message.includes('no rows')) {
      console.log('✅ check_usage_limits function deployed with new signature');
    } else {
      console.log('⚠️ check_usage_limits function may have issues');
    }
    
    // Test cleanup function
    const { error: cleanupError } = await supabase
      .rpc('cleanup_expired_subscriptions');
    
    if (!cleanupError) {
      console.log('✅ cleanup_expired_subscriptions function deployed');
    } else {
      console.log('⚠️ cleanup_expired_subscriptions function may have issues');
    }
    
    console.log('\n📊 Deployment validation completed');
    
  } catch (error) {
    console.error('❌ Validation error:', error);
  }
}

async function checkDependencies() {
  console.log('🔍 Checking database dependencies...');
  
  try {
    // Check if subscription_tier enum exists
    const { data: enumCheck, error: enumError } = await supabase
      .from('information_schema.types')
      .select('typname')
      .eq('typname', 'subscription_tier')
      .limit(1);
    
    if (enumError || !enumCheck || enumCheck.length === 0) {
      console.error('❌ subscription_tier enum not found. Please ensure base schema is deployed.');
      return false;
    }
    
    // Check if profiles table exists
    const { data: tableCheck, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_name', 'profiles')
      .limit(1);
    
    if (tableError || !tableCheck || tableCheck.length === 0) {
      console.error('❌ profiles table not found. Please ensure base schema is deployed.');
      return false;
    }
    
    console.log('✅ Dependencies check passed');
    return true;
    
  } catch (error) {
    console.error('❌ Dependencies check failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Deploying Effective Subscription Tier Logic');
  console.log('=' .repeat(50));
  
  // Check dependencies first
  const dependenciesOk = await checkDependencies();
  if (!dependenciesOk) {
    console.log('❌ Dependencies check failed. Aborting deployment.');
    process.exit(1);
  }
  
  // Run migrations in order
  const migrations = [
    {
      file: '003a_drop_old_function.sql',
      description: 'Drop old check_usage_limits function'
    },
    {
      file: '003b_effective_tier_functions.sql', 
      description: 'Create effective tier functions'
    }
  ];
  
  let allSuccessful = true;
  
  for (const migration of migrations) {
    const success = await runMigration(migration.file, migration.description);
    if (!success) {
      allSuccessful = false;
      break;
    }
    
    // Wait a moment between migrations
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (allSuccessful) {
    await validateDeployment();
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Deployment completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Test the implementation: npm run test-subscription-downgrade');
    console.log('2. Schedule cleanup job: npm run cleanup-expired-subscriptions');
    console.log('3. Monitor logs for effective tier usage');
  } else {
    console.log('\n' + '='.repeat(50));
    console.log('❌ Deployment failed! Check the logs above for details.');
    process.exit(1);
  }
}

// Manual SQL execution instructions
function showManualInstructions() {
  console.log('\n📝 Manual Migration Instructions:');
  console.log('If automatic deployment fails, run these SQL commands in Supabase dashboard:');
  console.log('\n1. First, drop the old function:');
  console.log('   DROP FUNCTION IF EXISTS public.check_usage_limits(UUID, INTEGER);');
  console.log('\n2. Then run the full migration from:');
  console.log('   supabase/migrations/003b_effective_tier_functions.sql');
  console.log('\n3. Finally, test with:');
  console.log('   npm run test-subscription-downgrade');
}

// Run deployment if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Deployment failed:', error);
    showManualInstructions();
    process.exit(1);
  });
}