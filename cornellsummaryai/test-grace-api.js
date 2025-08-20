/**
 * Test Grace System API Integration
 * Verifies that the updated API logic works correctly
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testGraceAPI() {
  try {
    console.log('🧪 Testing Grace System API Integration...\n');
    
    // Import the grace validation function
    const { checkUsageLimitsWithGrace } = await import('./src/lib/grace-validation.ts');
    
    const testUserId = '3c684689-f3a2-4822-a72c-323b195a8b32';
    const testFileSizeMB = 49;
    
    console.log(`Testing with user ID: ${testUserId}`);
    console.log(`Testing with file size: ${testFileSizeMB}MB\n`);
    
    // Test the grace validation
    const result = await checkUsageLimitsWithGrace(supabase, testUserId, testFileSizeMB);
    
    console.log('📊 Grace Validation Result:');
    console.log(`   Can process: ${result.can_process}`);
    console.log(`   Message: ${result.message}`);
    console.log(`   Current usage: ${result.current_usage_mb}MB`);
    console.log(`   Monthly limit: ${result.monthly_limit_mb}MB`);
    console.log(`   User tier: ${result.user_tier}`);
    
    if (result.grace_info) {
      console.log('\n🎯 Grace Information:');
      console.log(`   Grace enabled: ${result.grace_info.enabled}`);
      console.log(`   Grace total: ${result.grace_info.totalMB}MB`);
      console.log(`   Grace used: ${result.grace_info.usedMB}MB`);
      console.log(`   Grace remaining: ${result.grace_info.remainingMB}MB`);
      
      const totalAvailable = result.monthly_limit_mb + result.grace_info.remainingMB;
      const wouldUse = result.current_usage_mb + testFileSizeMB;
      
      console.log('\n🧮 Calculation Check:');
      console.log(`   Base limit: ${result.monthly_limit_mb}MB`);
      console.log(`   Grace available: ${result.grace_info.remainingMB}MB`);
      console.log(`   Total available: ${totalAvailable}MB`);
      console.log(`   Would use: ${wouldUse}MB`);
      console.log(`   Should work: ${wouldUse <= totalAvailable ? 'YES' : 'NO'}`);
    }
    
    if (result.can_process) {
      console.log('\n🎉 SUCCESS!');
      console.log('✅ Grace system is working correctly');
      console.log('✅ Your 49MB file upload should now be allowed');
      console.log('\n🚀 Ready to test!');
      console.log('1. Try uploading your 49MB file via the web interface');
      console.log('2. The grace buffer should allow the upload');
      console.log('3. Grace usage will be tracked automatically');
    } else {
      console.log('\n⚠️ Upload would still be blocked');
      console.log('❌ There may be an issue with the calculation or limits');
      
      // Debug information
      if (result.grace_info) {
        console.log('\n🔍 Debug Information:');
        console.log(`   Expected total available: ${result.monthly_limit_mb + result.grace_info.remainingMB}MB`);
        console.log(`   Current + file: ${result.current_usage_mb + testFileSizeMB}MB`);
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Execute the test
testGraceAPI().catch(error => {
  console.error('💥 Script failed:', error);
  process.exit(1);
});