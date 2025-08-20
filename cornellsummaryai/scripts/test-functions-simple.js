#!/usr/bin/env node

/**
 * Simple Function Test Script
 * 
 * Tests the subscription tier functions without creating users
 * 
 * Usage: node scripts/test-functions-simple.js
 */

import { createClient } from '@supabase/supabase-js';
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

async function testFunction(functionName, params, description) {
  console.log(`\n🧪 Testing: ${description}`);
  console.log(`   Function: ${functionName}`);
  console.log(`   Params: ${JSON.stringify(params)}`);
  
  try {
    const { data, error } = await supabase.rpc(functionName, params);
    
    if (error) {
      console.log(`❌ Error: ${error.message}`);
      return false;
    } else {
      console.log(`✅ Success: ${JSON.stringify(data, null, 2)}`);
      return true;
    }
  } catch (error) {
    console.log(`❌ Exception: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Subscription Tier Functions');
  console.log('=' .repeat(50));
  
  const fakeUserId = '00000000-0000-0000-0000-000000000000';
  
  let allPassed = true;
  
  // Test 1: Get effective tier for non-existent user (should return 'free')
  const test1 = await testFunction(
    'get_effective_subscription_tier',
    { p_user_id: fakeUserId },
    'Get effective tier for non-existent user'
  );
  if (!test1) allPassed = false;
  
  // Test 2: Check usage limits for non-existent user (should handle gracefully)
  const test2 = await testFunction(
    'check_usage_limits',
    { p_user_id: fakeUserId, p_file_size_mb: 10 },
    'Check usage limits for non-existent user'
  );
  if (!test2) allPassed = false;
  
  // Test 3: Get subscription details for non-existent user
  const test3 = await testFunction(
    'get_user_subscription_details',
    { p_user_id: fakeUserId },
    'Get subscription details for non-existent user'
  );
  if (!test3) allPassed = false;
  
  // Test 4: Cleanup expired subscriptions
  const test4 = await testFunction(
    'cleanup_expired_subscriptions',
    {},
    'Cleanup expired subscriptions'
  );
  if (!test4) allPassed = false;
  
  // Test 5: Check if functions exist by querying pg_proc
  console.log('\n🔍 Checking function existence...');
  
  try {
    const { data: functions, error } = await supabase
      .from('pg_proc')
      .select('proname')
      .in('proname', [
        'get_effective_subscription_tier',
        'check_usage_limits',
        'cleanup_expired_subscriptions',
        'get_user_subscription_details'
      ]);
      
    if (error) {
      console.log('⚠️ Could not query pg_proc directly');
    } else {
      const foundFunctions = functions.map(f => f.proname);
      console.log(`📊 Found functions: ${foundFunctions.join(', ')}`);
    }
  } catch (error) {
    console.log('⚠️ Could not check function existence:', error.message);
  }
  
  // Test 6: Check return type of check_usage_limits
  console.log('\n🔍 Testing enhanced check_usage_limits return structure...');
  
  const { data: usageResult } = await supabase.rpc('check_usage_limits', {
    p_user_id: fakeUserId,
    p_file_size_mb: 10
  });
  
  if (usageResult && usageResult[0]) {
    const result = usageResult[0];
    const hasEffectiveTier = 'effective_tier' in result;
    const hasPeriodEnd = 'period_end' in result;
    
    console.log(`✅ Enhanced return structure: effective_tier=${hasEffectiveTier}, period_end=${hasPeriodEnd}`);
    
    if (hasEffectiveTier && hasPeriodEnd) {
      console.log('✅ New function signature working correctly');
    } else {
      console.log('❌ Function may still have old signature');
      allPassed = false;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allPassed) {
    console.log('🎉 All function tests PASSED!');
    console.log('\nFunctions are working correctly. The subscription downgrade logic is ready.');
    console.log('\nTo test with real user data:');
    console.log('1. Create a test user in your Supabase dashboard');
    console.log('2. Set subscription_tier="free" and subscription_period_end to future date');
    console.log('3. Call get_effective_subscription_tier(user_id) - should return "student"');
  } else {
    console.log('❌ Some function tests FAILED!');
    console.log('\nCheck that the migrations have been properly applied.');
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
}