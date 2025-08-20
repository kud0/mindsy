#!/usr/bin/env node

/**
 * Test Script: Subscription Downgrade Logic
 * 
 * This script tests the effective subscription tier logic to ensure
 * users retain paid benefits until billing period expires.
 * 
 * Usage: node scripts/test-subscription-downgrade.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

// Create admin client for testing
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

// Test scenarios
const TEST_SCENARIOS = [
  {
    name: 'Student user within billing period after downgrade',
    setup: {
      subscription_tier: 'free', // User clicked downgrade
      subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
    },
    expected: {
      effective_tier: 'student',
      should_get_student_benefits: true
    }
  },
  {
    name: 'Student user with expired billing period',
    setup: {
      subscription_tier: 'free',
      subscription_period_end: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days ago
    },
    expected: {
      effective_tier: 'free',
      should_get_student_benefits: false
    }
  },
  {
    name: 'Active student user',
    setup: {
      subscription_tier: 'student',
      subscription_period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString() // 15 days from now
    },
    expected: {
      effective_tier: 'student',
      should_get_student_benefits: true
    }
  },
  {
    name: 'Free user (never subscribed)',
    setup: {
      subscription_tier: 'free',
      subscription_period_end: null
    },
    expected: {
      effective_tier: 'free',
      should_get_student_benefits: false
    }
  }
];

async function createTestUser(email, scenario) {
  console.log(`📝 Creating test user for: ${scenario.name}`);
  
  // Create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: 'test-password-123',
    email_confirm: true
  });

  if (authError) {
    console.error('❌ Failed to create auth user:', authError);
    return null;
  }

  const userId = authData.user.id;

  // Create profile with test scenario data
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      email,
      full_name: `Test User - ${scenario.name}`,
      ...scenario.setup
    });

  if (profileError) {
    console.error('❌ Failed to create profile:', profileError);
    return null;
  }

  console.log(`✅ Created test user: ${userId}`);
  return userId;
}

async function testEffectiveTier(userId, scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  
  try {
    // Test get_effective_subscription_tier function
    const { data: effectiveTier, error: tierError } = await supabase
      .rpc('get_effective_subscription_tier', { p_user_id: userId });

    if (tierError) {
      console.error('❌ Error getting effective tier:', tierError);
      return false;
    }

    console.log(`📊 Effective tier: ${effectiveTier} (expected: ${scenario.expected.effective_tier})`);

    // Test usage limits with a 50MB file
    const { data: usageCheck, error: usageError } = await supabase
      .rpc('check_usage_limits', { 
        p_user_id: userId, 
        p_file_size_mb: 50 
      });

    if (usageError) {
      console.error('❌ Error checking usage limits:', usageError);
      return false;
    }

    const usage = usageCheck[0];
    
    console.log(`📋 Usage check result:`);
    console.log(`   Can process: ${usage.can_process}`);
    console.log(`   User tier: ${usage.user_tier}`);
    console.log(`   Effective tier: ${usage.effective_tier}`);
    console.log(`   Monthly limit: ${usage.monthly_limit_mb}MB`);
    console.log(`   Message: ${usage.message}`);

    // Validate results
    const effectiveTierCorrect = effectiveTier === scenario.expected.effective_tier;
    const usageTierCorrect = usage.effective_tier === scenario.expected.effective_tier;
    
    // Student benefits = 700MB monthly limit
    const hasStudentBenefits = usage.monthly_limit_mb === 700;
    const expectedStudentBenefits = scenario.expected.should_get_student_benefits;
    const benefitsCorrect = hasStudentBenefits === expectedStudentBenefits;

    if (effectiveTierCorrect && usageTierCorrect && benefitsCorrect) {
      console.log('✅ Test PASSED');
      return true;
    } else {
      console.log('❌ Test FAILED');
      console.log(`   Effective tier correct: ${effectiveTierCorrect}`);
      console.log(`   Usage tier correct: ${usageTierCorrect}`);
      console.log(`   Benefits correct: ${benefitsCorrect} (has: ${hasStudentBenefits}, expected: ${expectedStudentBenefits})`);
      return false;
    }

  } catch (error) {
    console.error('❌ Test error:', error);
    return false;
  }
}

async function cleanupTestUser(userId) {
  try {
    // Delete profile
    await supabase.from('profiles').delete().eq('id', userId);
    
    // Delete auth user
    await supabase.auth.admin.deleteUser(userId);
    
    console.log(`🗑️ Cleaned up test user: ${userId}`);
  } catch (error) {
    console.error(`❌ Failed to cleanup user ${userId}:`, error);
  }
}

async function cleanupExistingTestUsers() {
  console.log('🗑️ Cleaning up any existing test users...');
  
  try {
    // Delete any existing test users
    const { data: existingUsers } = await supabase
      .from('profiles')
      .select('id')
      .like('email', '%test-downgrade%@example.com');

    if (existingUsers && existingUsers.length > 0) {
      console.log(`Found ${existingUsers.length} existing test users to clean up`);
      
      for (const user of existingUsers) {
        await cleanupTestUser(user.id);
      }
      
      console.log('✅ Existing test users cleaned up');
    }
  } catch (error) {
    console.log('⚠️ Could not clean up existing users:', error.message);
  }
}

async function runTests() {
  console.log('🚀 Starting subscription downgrade logic tests...\n');
  
  // Clean up any existing test users first
  await cleanupExistingTestUsers();
  
  let allTestsPassed = true;
  const testUsers = [];

  try {
    // Run tests for each scenario
    for (let i = 0; i < TEST_SCENARIOS.length; i++) {
      const scenario = TEST_SCENARIOS[i];
      const timestamp = Date.now();
      const testEmail = `test-downgrade-${i}-${timestamp}@example.com`;
      
      const userId = await createTestUser(testEmail, scenario);
      if (!userId) {
        allTestsPassed = false;
        continue;
      }
      
      testUsers.push(userId);
      
      const testPassed = await testEffectiveTier(userId, scenario);
      if (!testPassed) {
        allTestsPassed = false;
      }
      
      console.log('─'.repeat(60));
    }

    // Test subscription details function
    console.log('\n🔍 Testing subscription details function...');
    
    if (testUsers.length > 0) {
      const { data: details, error: detailsError } = await supabase
        .rpc('get_user_subscription_details', { p_user_id: testUsers[0] });

      if (detailsError) {
        console.error('❌ Error getting subscription details:', detailsError);
        allTestsPassed = false;
      } else {
        console.log('📊 Subscription details:', JSON.stringify(details[0], null, 2));
      }
    }

    // Test cleanup function
    console.log('\n🧹 Testing cleanup function...');
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_expired_subscriptions');

    if (cleanupError) {
      console.error('❌ Error testing cleanup function:', cleanupError);
      allTestsPassed = false;
    } else {
      console.log('✅ Cleanup function working:', cleanupResult[0]);
    }

  } finally {
    // Cleanup all test users
    console.log('\n🗑️ Cleaning up test users...');
    for (const userId of testUsers) {
      await cleanupTestUser(userId);
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED! Subscription downgrade logic is working correctly.');
  } else {
    console.log('❌ SOME TESTS FAILED! Check the output above for details.');
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTests().catch(error => {
    console.error('💥 Test execution failed:', error);
    process.exit(1);
  });
}