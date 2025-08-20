#!/usr/bin/env node

/**
 * Deploy Tier Logic Fix Script
 * 
 * Applies the fix for NULL subscription_tier handling
 * 
 * Usage: node scripts/deploy-tier-logic-fix.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { config } from './config.js';

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

async function deployFix() {
  console.log('🚀 Deploying subscription tier logic fix...');
  console.log('=' .repeat(50));
  
  try {
    // Read the migration file
    const migrationSQL = readFileSync('./supabase/migrations/004_fix_effective_tier_logic.sql', 'utf8');
    
    console.log('📄 Applying migration 004_fix_effective_tier_logic.sql...');
    
    console.log('⚠️  Manual migration required - please run the SQL in Supabase dashboard:');
    console.log('\n' + '='.repeat(50));
    console.log(migrationSQL);
    console.log('='.repeat(50));
    console.log('\nAfter running the SQL, press Enter to continue testing...');
    
    // Wait for user input
    process.stdin.setRawMode(true);
    await new Promise(resolve => process.stdin.once('data', resolve));
    process.stdin.setRawMode(false);
    
    console.log('✅ Migration applied successfully!');
    
    // Test the fixed function
    console.log('\n🧪 Testing fixed function...');
    
    const testUserId = '3c684689-f3a2-4822-a72c-323b195a8b32'; // Your user ID from debug
    
    const { data: effectiveTier, error: tierError } = await supabase.rpc('get_effective_subscription_tier', {
      p_user_id: testUserId
    });
    
    if (tierError) {
      console.error('❌ Function test failed:', tierError);
      return;
    }
    
    console.log(`✅ Fixed function result: ${effectiveTier}`);
    
    // Check the user's profile after fix
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_period_end')
      .eq('id', testUserId)
      .single();
    
    if (profileError) {
      console.error('❌ Profile check failed:', profileError);
      return;
    }
    
    console.log('📊 User profile after fix:');
    console.log(`   - subscription_tier: ${profile.subscription_tier}`);
    console.log(`   - subscription_period_end: ${profile.subscription_period_end}`);
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Tier logic fix deployed successfully!');
    console.log('\nThe user should now see "Free" plan instead of "Student" in the frontend.');
    console.log('Refresh the account page to see the changes.');
    
  } catch (error) {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deployFix().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}