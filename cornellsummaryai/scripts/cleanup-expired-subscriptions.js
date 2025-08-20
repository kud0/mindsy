#!/usr/bin/env node

/**
 * Cleanup Script: Expired Subscription Periods
 * 
 * This script cleans up expired subscription periods to prevent
 * stale period_end dates from accumulating in the database.
 * 
 * Should be run periodically (e.g., daily via cron job).
 * 
 * Usage: node scripts/cleanup-expired-subscriptions.js
 */

import { createClient } from '@supabase/supabase-js';
import { config } from './config.js';

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

async function runCleanup() {
  console.log('🧹 Starting cleanup of expired subscription periods...');
  console.log(`📅 Current time: ${new Date().toISOString()}`);
  
  try {
    // Get list of users who will be affected before cleanup
    const { data: expiredUsers, error: queryError } = await supabase
      .from('profiles')
      .select('id, email, subscription_tier, subscription_period_end')
      .eq('subscription_tier', 'free')
      .not('subscription_period_end', 'is', null)
      .lt('subscription_period_end', new Date().toISOString());

    if (queryError) {
      console.error('❌ Error querying expired subscriptions:', queryError);
      return false;
    }

    console.log(`📊 Found ${expiredUsers.length} users with expired subscription periods:`);
    
    if (expiredUsers.length > 0) {
      console.log('Users to be cleaned up:');
      expiredUsers.forEach(user => {
        const expiredDate = new Date(user.subscription_period_end);
        const daysExpired = Math.floor((Date.now() - expiredDate.getTime()) / (1000 * 60 * 60 * 24));
        console.log(`  • ${user.email} (expired ${daysExpired} days ago)`);
      });
    }

    // Run the cleanup function
    const { data: cleanupResult, error: cleanupError } = await supabase
      .rpc('cleanup_expired_subscriptions');

    if (cleanupError) {
      console.error('❌ Error running cleanup function:', cleanupError);
      return false;
    }

    const result = cleanupResult[0];
    console.log(`✅ Cleanup completed: ${result.message}`);
    
    if (result.cleaned_count > 0) {
      console.log('📧 Consider sending notification emails to affected users');
      console.log('   informing them their paid period has ended.');
    }

    return true;

  } catch (error) {
    console.error('💥 Cleanup failed:', error);
    return false;
  }
}

async function validateCleanup() {
  console.log('\n🔍 Validating cleanup results...');
  
  try {
    // Check if any expired periods remain
    const { data: remainingExpired, error: validationError } = await supabase
      .from('profiles')
      .select('count')
      .eq('subscription_tier', 'free')
      .not('subscription_period_end', 'is', null)
      .lt('subscription_period_end', new Date().toISOString());

    if (validationError) {
      console.error('❌ Error validating cleanup:', validationError);
      return false;
    }

    const count = remainingExpired[0]?.count || 0;
    
    if (count === 0) {
      console.log('✅ Validation passed: No expired subscription periods remaining');
      return true;
    } else {
      console.log(`⚠️ Warning: ${count} expired subscription periods still remain`);
      return false;
    }

  } catch (error) {
    console.error('💥 Validation failed:', error);
    return false;
  }
}

async function generateReport() {
  console.log('\n📊 Generating subscription status report...');
  
  try {
    // Get overall subscription statistics
    const { data: stats, error: statsError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_period_end')
      .not('subscription_tier', 'is', null);

    if (statsError) {
      console.error('❌ Error getting statistics:', statsError);
      return;
    }

    const now = new Date();
    let activeStudents = 0;
    let expiredStudents = 0;
    let freeUsers = 0;
    let downgradedinPeriod = 0;

    stats.forEach(user => {
      if (user.subscription_tier === 'student') {
        activeStudents++;
      } else if (user.subscription_tier === 'free') {
        if (user.subscription_period_end) {
          const periodEnd = new Date(user.subscription_period_end);
          if (periodEnd > now) {
            downgradedinPeriod++;
          } else {
            expiredStudents++;
          }
        } else {
          freeUsers++;
        }
      }
    });

    console.log('📈 Subscription Status Report:');
    console.log(`   • Active Students: ${activeStudents}`);
    console.log(`   • Downgraded (still in period): ${downgradedinPeriod}`);
    console.log(`   • Expired Students: ${expiredStudents}`);
    console.log(`   • Free Users: ${freeUsers}`);
    console.log(`   • Total Users: ${stats.length}`);

  } catch (error) {
    console.error('💥 Report generation failed:', error);
  }
}

async function main() {
  console.log('🚀 Subscription Cleanup Job Started');
  console.log('=' .repeat(50));
  
  const cleanupSuccess = await runCleanup();
  
  if (cleanupSuccess) {
    const validationSuccess = await validateCleanup();
    await generateReport();
    
    console.log('\n' + '='.repeat(50));
    if (validationSuccess) {
      console.log('🎉 Cleanup job completed successfully!');
    } else {
      console.log('⚠️ Cleanup job completed with warnings.');
    }
  } else {
    console.log('\n' + '='.repeat(50));
    console.log('❌ Cleanup job failed!');
    process.exit(1);
  }
}

// Run cleanup if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('💥 Cleanup job execution failed:', error);
    process.exit(1);
  });
}