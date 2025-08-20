/**
 * Apply Grace System Fix
 * This script fixes the ambiguous column reference error in the grace functions
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyFix() {
  try {
    console.log('🔧 Applying grace system fix...\n');
    
    const fixSQL = readFileSync('./fix-grace-system.sql', 'utf8');
    
    // Split into individual statements and execute each one
    const statements = fixSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim()) {
        console.log(`${i + 1}. ${statement.substring(0, 50)}...`);
        
        try {
          // Try direct SQL execution via RPC
          const { error } = await supabase.rpc('exec', { sql: statement + ';' });
          
          if (error) {
            console.log(`⚠️ Statement ${i + 1} failed via RPC:`, error.message);
            // Continue anyway - some statements might work differently
          } else {
            console.log('✅ Executed successfully\n');
          }
        } catch (e) {
          console.log(`⚠️ Statement ${i + 1} exception:`, e.message);
        }
      }
    }
    
    console.log('✅ Grace system fix application completed!\n');
    
    // Test the corrected function
    console.log('🧪 Testing corrected grace function...');
    
    const testUserId = '3c684689-f3a2-4822-a72c-323b195a8b32';
    
    try {
      const { data: graceTest, error: graceError } = await supabase
        .rpc('check_usage_limits_with_grace', {
          p_user_id: testUserId,
          p_file_size_mb: 49
        });

      if (graceError) {
        console.error('❌ Grace function still has error:', graceError);
        console.log('\n🔍 Let me check if the function exists...');
        
        // Check if function exists
        const { data: functions, error: fnError } = await supabase
          .from('pg_proc')
          .select('proname')
          .like('proname', '%grace%');
          
        if (fnError) {
          console.log('Cannot check functions:', fnError);
        } else {
          console.log('Available grace functions:', functions);
        }
        return;
      }

      if (graceTest && graceTest.length > 0) {
        const result = graceTest[0];
        console.log('\n📊 Grace Validation Result:');
        console.log(`   Can process: ${result.can_process}`);
        console.log(`   Message: ${result.message}`);
        console.log(`   Current usage: ${result.current_usage_mb}MB`);
        console.log(`   Monthly limit: ${result.monthly_limit_mb}MB`);
        console.log(`   User tier: ${result.user_tier}`);
        
        if (result.grace_info) {
          console.log(`   Grace enabled: ${result.grace_info.enabled}`);
          console.log(`   Grace total: ${result.grace_info.totalMB}MB`);
          console.log(`   Grace used: ${result.grace_info.usedMB}MB`);
          console.log(`   Grace remaining: ${result.grace_info.remainingMB}MB`);
        }
        
        if (result.can_process) {
          console.log('\n🎉 SUCCESS! Grace system is now working!');
          console.log('✅ Your 49MB file upload should now be allowed');
          console.log('\n🚀 Next steps:');
          console.log('1. Try uploading your 49MB file again');
          console.log('2. The grace system should allow the upload');
          console.log('3. Grace usage will be tracked automatically');
        } else {
          console.log('\n⚠️ Still blocked. Checking calculations...');
          const graceAvailable = result.grace_info ? result.grace_info.remainingMB : 0;
          const totalAvailable = result.monthly_limit_mb + graceAvailable;
          const wouldUse = result.current_usage_mb + 49;
          console.log(`   Base limit: ${result.monthly_limit_mb}MB`);
          console.log(`   Grace available: ${graceAvailable}MB`);
          console.log(`   Total available: ${totalAvailable}MB`);
          console.log(`   Current usage: ${result.current_usage_mb}MB`);
          console.log(`   Would use: ${wouldUse}MB`);
          
          if (wouldUse <= totalAvailable) {
            console.log('   🤔 Math says it should work - may need to debug further');
          }
        }
      } else {
        console.log('❌ No result returned from grace function');
      }
      
    } catch (testError) {
      console.error('❌ Error testing grace function:', testError);
    }
    
  } catch (error) {
    console.error('💥 Fix failed:', error);
  }
}

// Execute if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  applyFix().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}