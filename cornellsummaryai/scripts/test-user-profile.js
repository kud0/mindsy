#!/usr/bin/env node

/**
 * Test User Profile Script
 * 
 * Tests the specific user's profile and effective tier
 * 
 * Usage: node scripts/test-user-profile.js
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

async function testUserProfile() {
  const userId = '3c684689-f3a2-4822-a72c-323b195a8b32';
  
  console.log('🔍 Testing user profile and effective tier logic');
  console.log('=' .repeat(60));
  console.log(`User ID: ${userId}`);
  console.log('');
  
  try {
    // 1. Check raw profile data
    console.log('📊 Raw Profile Data:');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (profileError) {
      console.error('❌ Profile error:', profileError);
      return;
    }
    
    console.log(`   subscription_tier: ${profile.subscription_tier}`);
    console.log(`   subscription_period_start: ${profile.subscription_period_start}`);
    console.log(`   subscription_period_end: ${profile.subscription_period_end}`);
    console.log(`   created_at: ${profile.created_at}`);
    console.log(`   updated_at: ${profile.updated_at}`);
    
    // 2. Test effective tier function
    console.log('\n🧪 Effective Tier Function:');
    const { data: effectiveTier, error: tierError } = await supabase.rpc('get_effective_subscription_tier', {
      p_user_id: userId
    });
    
    if (tierError) {
      console.error('❌ Function error:', tierError);
      return;
    }
    
    console.log(`   Effective tier: ${effectiveTier}`);
    
    // 3. Check usage limits
    console.log('\n📈 Usage Limits Check:');
    const { data: usageCheck, error: usageError } = await supabase.rpc('check_usage_limits', {
      p_user_id: userId,
      p_file_size_mb: 10
    });
    
    if (usageError) {
      console.error('❌ Usage check error:', usageError);
      return;
    }
    
    const usage = usageCheck[0];
    console.log(`   Can process: ${usage.can_process}`);
    console.log(`   User tier: ${usage.user_tier}`);
    console.log(`   Effective tier: ${usage.effective_tier}`);
    console.log(`   Period end: ${usage.period_end}`);
    console.log(`   Monthly limit: ${usage.monthly_limit_mb}MB`);
    console.log(`   Current usage: ${usage.current_usage_mb}MB`);
    
    // 4. Analysis
    console.log('\n🔍 Analysis:');
    if (profile.subscription_tier === null) {
      console.log('⚠️  Profile has NULL subscription_tier - this should have been fixed');
    } else {
      console.log(`✅ Profile has subscription_tier: ${profile.subscription_tier}`);
    }
    
    if (effectiveTier === 'free') {
      console.log('✅ Effective tier correctly returns "free"');
    } else {
      console.log(`❌ Effective tier returns "${effectiveTier}" - expected "free"`);
    }
    
    // 5. If there's still an issue, try to fix the profile
    if (profile.subscription_tier === null) {
      console.log('\n🔧 Attempting to fix NULL subscription_tier...');
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ subscription_tier: 'free' })
        .eq('id', userId);
      
      if (updateError) {
        console.error('❌ Update failed:', updateError);
      } else {
        console.log('✅ Profile updated to "free" tier');
        
        // Test again
        const { data: newEffectiveTier } = await supabase.rpc('get_effective_subscription_tier', {
          p_user_id: userId
        });
        console.log(`✅ New effective tier: ${newEffectiveTier}`);
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testUserProfile().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}