#!/usr/bin/env node

/**
 * Reset User Usage Script
 * This script resets monthly usage for a specific user (for testing purposes)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetUserUsage(userEmail) {
  try {
    console.log(`🔍 Looking up user: ${userEmail}`);
    
    // Find user by email
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id, email, subscription_tier')
      .eq('email', userEmail)
      .limit(1);

    if (userError || !users || users.length === 0) {
      console.error('❌ User not found:', userError?.message || 'No user with that email');
      return;
    }

    const user = users[0];
    console.log(`👤 Found user: ${user.email} (${user.subscription_tier || 'free'} tier)`);
    console.log(`🆔 User ID: ${user.id}`);

    // Get current usage
    console.log('\n📊 Current usage:');
    const { data: currentUsage, error: usageError } = await supabase
      .rpc('get_current_usage', { p_user_id: user.id });

    if (usageError) {
      console.error('❌ Error fetching current usage:', usageError.message);
    } else if (currentUsage && currentUsage.length > 0) {
      const usage = currentUsage[0];
      console.log(`   • Minutes used: ${usage.current_usage_minutes || 0}`);
      console.log(`   • Files processed: ${usage.files_processed || 0}`);
      console.log(`   • Summary limit: ${usage.summary_limit || 'N/A'}`);
    }

    // Reset monthly usage by updating jobs to not count towards current month
    console.log('\n🔄 Resetting monthly usage...');
    
    const currentDate = new Date();
    const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    
    // Update all current month jobs to be from last month (so they don't count in usage)
    const { data: updatedJobs, error: updateError } = await supabase
      .from('jobs')
      .update({ created_at: lastMonth.toISOString() })
      .eq('user_id', user.id)
      .gte('created_at', new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).toISOString())
      .select('job_id, lecture_title');

    if (updateError) {
      console.error('❌ Error resetting usage:', updateError.message);
      return;
    }

    console.log(`✅ Successfully reset usage for ${updatedJobs?.length || 0} jobs`);
    
    if (updatedJobs && updatedJobs.length > 0) {
      console.log('\n📝 Updated jobs:');
      updatedJobs.forEach((job, index) => {
        console.log(`   ${index + 1}. ${job.lecture_title || 'Untitled'} (${job.job_id})`);
      });
    }

    // Verify the reset worked
    console.log('\n🔍 Verifying reset...');
    const { data: newUsage, error: verifyError } = await supabase
      .rpc('get_current_usage', { p_user_id: user.id });

    if (!verifyError && newUsage && newUsage.length > 0) {
      const usage = newUsage[0];
      console.log('\n📊 New usage after reset:');
      console.log(`   • Minutes used: ${usage.current_usage_minutes || 0}`);
      console.log(`   • Files processed: ${usage.files_processed || 0}`);
      console.log(`   • Remaining files: ${usage.remaining_files || 'N/A'}`);
    }

    console.log('\n✅ Usage reset completed successfully!');

  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

// Get user email from command line arguments
const userEmail = process.argv[2];

if (!userEmail) {
  console.log('Usage: node reset-user-usage.js <user-email>');
  console.log('Example: node reset-user-usage.js user@example.com');
  process.exit(1);
}

resetUserUsage(userEmail);