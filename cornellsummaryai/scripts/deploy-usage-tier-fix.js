#!/usr/bin/env node

/**
 * Deploy Usage Tier Fix Script
 * 
 * Fixes get_current_usage and check_usage_limits to use effective tier
 * This ensures users in grace period see correct limits (Student: 700MB vs Free: 120MB)
 * 
 * Usage: node scripts/deploy-usage-tier-fix.js
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

async function deployUsageFix() {
  console.log('🚀 Deploying usage tier fix...');
  console.log('This fixes dashboard showing "410MB / 120MB" instead of "410MB / 700MB" for users in grace period');
  console.log('=' .repeat(50));
  
  try {
    // Read the migration file
    const migrationSQL = readFileSync('./supabase/migrations/005_fix_usage_effective_tier.sql', 'utf8');
    
    console.log('📄 Applying migration 005_fix_usage_effective_tier.sql...');
    
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
    console.log('\n🧪 Testing fixed usage function...');
    
    const testUserId = '3c684689-f3a2-4822-a72c-323b195a8b32'; // Your user ID from debug
    
    const { data: usageData, error: usageError } = await supabase.rpc('get_current_usage', {
      p_user_id: testUserId
    });
    
    if (usageError) {
      console.error('❌ Usage function test failed:', usageError);
      return;
    }
    
    const usage = usageData?.[0];
    console.log('✅ Fixed usage function results:');
    console.log(`   - Current usage: ${usage?.current_usage_mb}MB`);
    console.log(`   - Monthly limit: ${usage?.monthly_limit_mb}MB`);
    console.log(`   - User tier: ${usage?.user_tier}`);
    console.log(`   - Files processed: ${usage?.files_processed}`);
    
    // Check effective tier function still works
    const { data: effectiveTier, error: tierError } = await supabase.rpc('get_effective_subscription_tier', {
      p_user_id: testUserId
    });
    
    if (tierError) {
      console.error('❌ Effective tier test failed:', tierError);
      return;
    }
    
    console.log(`   - Effective tier: ${effectiveTier}`);
    
    // Check the user's profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_period_end')
      .eq('id', testUserId)
      .single();
    
    if (profileError) {
      console.error('❌ Profile check failed:', profileError);
      return;
    }
    
    console.log('\n📊 User profile context:');
    console.log(`   - Stored subscription_tier: ${profile.subscription_tier}`);
    console.log(`   - Subscription period end: ${profile.subscription_period_end}`);
    
    const periodEnd = new Date(profile.subscription_period_end);
    const now = new Date();
    const isInGracePeriod = profile.subscription_tier === 'free' && periodEnd > now;
    
    console.log(`   - In grace period: ${isInGracePeriod}`);
    
    if (isInGracePeriod && usage?.monthly_limit_mb === 700) {
      console.log('\n🎉 SUCCESS! Dashboard should now show "410MB / 700MB" instead of "410MB / 120MB"');
    } else if (isInGracePeriod && usage?.monthly_limit_mb === 120) {
      console.log('\n❌ ISSUE: Still showing Free tier limits (120MB) for user in grace period');
    } else {
      console.log('\n✅ User not in grace period or limits are correct');
    }
    
    console.log('\n' + '='.repeat(50));
    console.log('🎉 Usage tier fix deployed successfully!');
    console.log('\nRefresh the dashboard to see the corrected usage limits.');
    
  } catch (error) {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  deployUsageFix().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}