#!/usr/bin/env node

/**
 * Setup Billing Period Script
 * 
 * Sets up proper billing period for active Student subscription
 * 
 * Usage: node scripts/setup-billing-period.js
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

async function setupBillingPeriod() {
  const userId = '3c684689-f3a2-4822-a72c-323b195a8b32';
  
  console.log('🔧 Setting up proper billing period for Student subscription');
  console.log('=' .repeat(60));
  
  try {
    // Get current profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    console.log('📊 Current Profile:');
    console.log(`   subscription_tier: ${profile.subscription_tier}`);
    console.log(`   subscription_period_start: ${profile.subscription_period_start}`);
    console.log(`   subscription_period_end: ${profile.subscription_period_end}`);
    
    // Calculate proper period end (1 month from start)
    const startDate = new Date(profile.subscription_period_start);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    console.log(`\n🗓️  Calculated billing period:`);
    console.log(`   Start: ${startDate.toLocaleDateString()}`);
    console.log(`   End: ${endDate.toLocaleDateString()}`);
    console.log(`   Days remaining: ${Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}`);
    
    // Update profile with proper period end
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_period_end: endDate.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Update failed:', error);
      return;
    }
    
    console.log('\n✅ Billing period updated successfully!');
    
    // Test effective tier function
    const { data: effectiveTier } = await supabase.rpc('get_effective_subscription_tier', {
      p_user_id: userId
    });
    
    console.log(`✅ Effective tier: ${effectiveTier}`);
    console.log('\n🎯 Ready for downgrade testing!');
    console.log('   Now when you click "downgrade" it will:');
    console.log('   1. Change subscription_tier to "free"');
    console.log('   2. Keep subscription_period_end as-is');
    console.log('   3. Show "Student (Downgraded)" with remaining days');
    
  } catch (error) {
    console.error('💥 Script failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupBillingPeriod().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}