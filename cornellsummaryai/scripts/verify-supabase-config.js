#!/usr/bin/env node

/**
 * Supabase Configuration Verification Script
 * Helps verify OAuth redirect URL configuration
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function verifySupabaseConfig() {
  console.log('🔍 Verifying Supabase OAuth Configuration');
  console.log('=' .repeat(50));
  
  console.log(`\n📋 Project Details:`);
  console.log(`   Supabase URL: ${SUPABASE_URL}`);
  console.log(`   Project ID: ${SUPABASE_URL.split('//')[1].split('.')[0]}`);
  
  console.log(`\n🎯 Testing OAuth URL Generation:`);
  
  try {
    // Test OAuth URL generation with different redirect URLs
    const testUrls = [
      'http://localhost:4321/auth/callback',
      'http://localhost:4321/es/auth/callback',
      'http://localhost:4321/',
      'http://localhost:3000/auth/callback'
    ];
    
    for (const redirectUrl of testUrls) {
      console.log(`\n   Testing: ${redirectUrl}`);
      
      try {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: redirectUrl,
            skipBrowserRedirect: true
          }
        });
        
        if (data?.url) {
          const oauthUrl = new URL(data.url);
          const actualRedirectTo = decodeURIComponent(oauthUrl.searchParams.get('redirect_to') || '');
          
          if (actualRedirectTo === redirectUrl) {
            console.log(`   ✅ ACCEPTED: ${redirectUrl}`);
          } else {
            console.log(`   ❌ REJECTED: ${redirectUrl}`);
            console.log(`      Supabase used: ${actualRedirectTo}`);
          }
        } else if (error) {
          console.log(`   ❌ ERROR: ${error.message}`);
        }
      } catch (testError) {
        console.log(`   ❌ FAILED: ${testError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Configuration test failed:', error.message);
  }
  
  console.log(`\n📝 Configuration Requirements:`);
  console.log(`   Site URL should be: http://localhost:4321`);
  console.log(`   Redirect URLs should include:`);
  console.log(`   - http://localhost:4321/auth/callback`);
  console.log(`   - http://localhost:4321/es/auth/callback`);
  
  console.log(`\n🔧 How to Fix:`);
  console.log(`   1. Go to: https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1].split('.')[0]}/settings/general`);
  console.log(`   2. Set Site URL to: http://localhost:4321`);
  console.log(`   3. Go to: https://supabase.com/dashboard/project/${SUPABASE_URL.split('//')[1].split('.')[0]}/auth/url-configuration`);
  console.log(`   4. Add redirect URLs listed above`);
  console.log(`   5. Remove any localhost:3000 entries`);
  console.log(`   6. Save configuration`);
}

// Run verification
verifySupabaseConfig().catch(console.error);