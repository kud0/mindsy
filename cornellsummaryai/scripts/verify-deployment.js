#!/usr/bin/env node

/**
 * Quick Deployment Verification Script
 * 
 * Verifies that the subscription tier logic functions were deployed correctly.
 * 
 * Usage: node scripts/verify-deployment.js
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

async function checkFunction(functionName, testParams = {}) {
  console.log(`🔍 Checking function: ${functionName}`);
  
  try {
    const { data, error } = await supabase.rpc(functionName, testParams);
    
    if (error) {
      // Expected errors for test calls are ok
      if (error.message.includes('null value') || 
          error.message.includes('no rows') ||
          error.message.includes('violates not-null')) {
        console.log(`✅ ${functionName} exists and is callable`);
        return true;
      } else {
        console.log(`❌ ${functionName} error: ${error.message}`);
        return false;
      }
    } else {
      console.log(`✅ ${functionName} executed successfully`);
      return true;
    }
  } catch (error) {
    console.log(`❌ ${functionName} failed: ${error.message}`);
    return false;
  }
}

async function checkFunctionSignature() {
  console.log('🔍 Checking function signatures...');
  
  try {
    // This query checks if our functions exist with correct signatures
    const { data, error } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_type')
      .eq('routine_schema', 'public')
      .in('routine_name', [
        'get_effective_subscription_tier',
        'check_usage_limits', 
        'cleanup_expired_subscriptions',
        'get_user_subscription_details'
      ]);

    if (error) {
      console.log('⚠️ Could not query function signatures directly');
      return false;
    }

    const foundFunctions = data.map(row => row.routine_name);
    const expectedFunctions = [
      'get_effective_subscription_tier',
      'check_usage_limits',
      'cleanup_expired_subscriptions', 
      'get_user_subscription_details'
    ];

    console.log(`📊 Found functions: ${foundFunctions.join(', ')}`);
    
    const allPresent = expectedFunctions.every(func => foundFunctions.includes(func));
    
    if (allPresent) {
      console.log('✅ All expected functions are present');
      return true;
    } else {
      const missing = expectedFunctions.filter(func => !foundFunctions.includes(func));
      console.log(`❌ Missing functions: ${missing.join(', ')}`);
      return false;
    }
    
  } catch (error) {
    console.log('⚠️ Could not verify function signatures:', error.message);
    return false;
  }
}

async function testBasicFunctionality() {
  console.log('\n🧪 Testing basic functionality...');
  
  const testUserId = '00000000-0000-0000-0000-000000000000'; // UUID that won't exist
  
  const tests = [
    {
      name: 'get_effective_subscription_tier',
      params: { p_user_id: testUserId },
      expectError: true
    },
    {
      name: 'check_usage_limits',
      params: { p_user_id: testUserId, p_file_size_mb: 10 },
      expectError: true
    },
    {
      name: 'cleanup_expired_subscriptions',
      params: {},
      expectError: false
    },
    {
      name: 'get_user_subscription_details',
      params: { p_user_id: testUserId },
      expectError: true
    }
  ];

  let allPassed = true;

  for (const test of tests) {
    const success = await checkFunction(test.name, test.params);
    if (!success) {
      allPassed = false;
    }
  }

  return allPassed;
}

async function main() {
  console.log('🚀 Verifying Subscription Tier Logic Deployment');
  console.log('=' .repeat(50));
  
  let allChecksPass = true;
  
  // Check function signatures
  const signaturesOk = await checkFunctionSignature();
  if (!signaturesOk) {
    allChecksPass = false;
  }
  
  // Test basic functionality
  const functionalityOk = await testBasicFunctionality();
  if (!functionalityOk) {
    allChecksPass = false;
  }
  
  console.log('\n' + '='.repeat(50));
  
  if (allChecksPass) {
    console.log('🎉 Deployment verification PASSED!');
    console.log('\nNext steps:');
    console.log('1. Run full tests: npm run test-subscription-downgrade');
    console.log('2. Test with real users: Monitor logs during usage');
    console.log('3. Schedule cleanup: npm run cleanup-expired-subscriptions');
  } else {
    console.log('❌ Deployment verification FAILED!');
    console.log('\nTroubleshooting:');
    console.log('1. Check if migrations were applied: npm run deploy-subscription-logic');
    console.log('2. Manually run SQL from: supabase/migrations/003b_effective_tier_functions.sql');
    console.log('3. Check Supabase dashboard for function errors');
    process.exit(1);
  }
}

// Run verification if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Verification failed:', error);
    process.exit(1);
  });
}