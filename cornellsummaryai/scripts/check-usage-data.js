#!/usr/bin/env node

/**
 * Check Usage Data Script
 * 
 * Checks what usage data exists for the user
 * 
 * Usage: node scripts/check-usage-data.js
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

async function checkUsageData() {
  const userId = '3c684689-f3a2-4822-a72c-323b195a8b32';
  
  console.log('🔍 Checking usage data for user');
  console.log('=' .repeat(50));
  
  try {
    // Check all usage records for this user
    const { data: allUsage, error } = await supabase
      .from('usage')
      .select('*')
      .eq('user_id', userId)
      .order('month_year', { ascending: false });
    
    if (error) {
      console.error('❌ Error:', error);
      return;
    }
    
    console.log(`📊 Found ${allUsage.length} usage records:`);
    
    allUsage.forEach((record, index) => {
      console.log(`\n${index + 1}. Month: ${record.month_year}`);
      console.log(`   Total MB used: ${record.total_mb_used}`);
      console.log(`   Summaries count: ${record.summaries_count}`);
      console.log(`   Created: ${record.created_at}`);
      console.log(`   Updated: ${record.updated_at}`);
    });
    
    // Check current month specifically
    const currentMonth = new Date().toISOString().slice(0, 7); // '2025-08'
    console.log(`\n🗓️  Current month: ${currentMonth}`);
    
    const currentMonthUsage = allUsage.find(u => u.month_year === currentMonth);
    if (currentMonthUsage) {
      console.log(`✅ Current month usage found: ${currentMonthUsage.total_mb_used}MB`);
    } else {
      console.log(`❌ No usage data for current month (${currentMonth})`);
      
      // Find the most recent month with data
      if (allUsage.length > 0) {
        const latestUsage = allUsage[0];
        console.log(`📅 Latest usage data is from: ${latestUsage.month_year} (${latestUsage.total_mb_used}MB)`);
      }
    }
    
  } catch (error) {
    console.error('💥 Script failed:', error);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  checkUsageData().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}