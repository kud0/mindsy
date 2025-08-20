#!/usr/bin/env node

/**
 * OAuth Redirect Debug Script
 * Helps diagnose OAuth redirect URL issues
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function debugOAuthRedirect() {
  console.log('🔍 OAuth Redirect Debug Analysis');
  console.log('=' .repeat(50));
  
  console.log('\n1. Testing OAuth URL generation...');
  
  try {
    // Test with correct port
    const { data: correctData, error: correctError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'http://localhost:4321/auth/callback',
        skipBrowserRedirect: true
      }
    });

    if (correctData?.url) {
      console.log('✅ OAuth URL generated successfully');
      console.log(`   Generated URL: ${correctData.url}`);
      
      // Parse the URL to see what redirect_uri is being used
      const url = new URL(correctData.url);
      const redirectUri = url.searchParams.get('redirect_uri');
      console.log(`   Redirect URI in URL: ${redirectUri}`);
      
      if (redirectUri?.includes('localhost:3000')) {
        console.log('❌ PROBLEM FOUND: Supabase is using localhost:3000 in the OAuth URL');
        console.log('   This means Supabase has localhost:3000 configured as the redirect URL');
      } else if (redirectUri?.includes('localhost:4321')) {
        console.log('✅ Supabase is correctly using localhost:4321');
      } else {
        console.log(`⚠️  Unexpected redirect URI: ${redirectUri}`);
      }
    } else if (correctError) {
      console.log('❌ Error generating OAuth URL:');
      console.log(`   ${correctError.message}`);
    }

    // Test with wrong port to see behavior
    console.log('\n2. Testing with wrong port (3000)...');
    const { data: wrongData, error: wrongError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
        skipBrowserRedirect: true
      }
    });

    if (wrongData?.url) {
      const url = new URL(wrongData.url);
      const redirectUri = url.searchParams.get('redirect_uri');
      console.log(`   Redirect URI with 3000: ${redirectUri}`);
    }

  } catch (error) {
    console.error('❌ Error during OAuth URL generation:', error.message);
  }

  console.log('\n3. Configuration Analysis:');
  console.log('   Expected behavior:');
  console.log('   - App requests: http://localhost:4321/auth/callback');
  console.log('   - Supabase should accept and use: http://localhost:4321/auth/callback');
  console.log('   - GitHub should redirect to: http://localhost:4321/auth/callback');
  
  console.log('\n   Current behavior (based on error):');
  console.log('   - App requests: http://localhost:4321/auth/callback');
  console.log('   - Supabase ignores request and uses: http://localhost:3000/auth/callback');
  console.log('   - GitHub redirects to: http://localhost:3000/auth/callback');
  
  console.log('\n🔧 SOLUTION:');
  console.log('   1. Go to Supabase Dashboard > Authentication > Providers > GitHub');
  console.log('   2. Find "Redirect URLs" field');
  console.log('   3. Replace any localhost:3000 URLs with localhost:4321 URLs');
  console.log('   4. Save the configuration');
  console.log('   5. Also update GitHub OAuth App settings to use localhost:4321');
}

// Run debug
debugOAuthRedirect().catch(console.error);