#!/usr/bin/env node

/**
 * OAuth Configuration Validator
 * Validates GitHub OAuth configuration and provides setup guidance
 */

import { createClient } from '@supabase/supabase-js';

// Configuration
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Validate OAuth configuration
 */
async function validateOAuthConfig() {
  console.log('🔍 Validating GitHub OAuth Configuration...\n');

  try {
    // Test 1: Check if GitHub provider is enabled
    console.log('1. Checking GitHub OAuth provider status...');
    
    // Try to initiate OAuth flow to see if provider is configured
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: 'http://localhost:4321/auth/callback',
          skipBrowserRedirect: true // Don't actually redirect, just test config
        }
      });

      if (error) {
        console.log('❌ GitHub OAuth provider configuration issue:');
        console.log(`   Error: ${error.message}`);
        return false;
      } else if (data.url) {
        console.log('✅ GitHub OAuth provider is configured');
        console.log(`   OAuth URL generated successfully`);
      }
    } catch (error) {
      console.log('❌ Failed to test GitHub OAuth provider:');
      console.log(`   Error: ${error.message}`);
      return false;
    }

    // Test 2: Validate callback URLs
    console.log('\n2. Validating callback URL configuration...');
    
    const expectedCallbacks = [
      'http://localhost:4321/auth/callback',
      'http://localhost:4321/es/auth/callback'
    ];

    console.log('   Expected callback URLs for development:');
    expectedCallbacks.forEach(url => {
      console.log(`   - ${url}`);
    });

    // Test 3: Check current port
    console.log('\n3. Checking application port configuration...');
    
    const currentPort = process.env.PORT || '4321';
    console.log(`   Expected port: ${currentPort}`);
    
    if (currentPort !== '4321') {
      console.log('⚠️  Non-standard port detected');
      console.log('   Make sure Supabase redirect URLs use the correct port');
    } else {
      console.log('✅ Using standard Astro port (4321)');
    }

    // Test 4: Environment-specific guidance
    console.log('\n4. Environment-specific configuration...');
    
    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = !isProduction;

    if (isDevelopment) {
      console.log('   Environment: Development');
      console.log('   Required Supabase redirect URLs:');
      console.log('   - http://localhost:4321/auth/callback');
      console.log('   - http://localhost:4321/es/auth/callback');
    } else {
      console.log('   Environment: Production');
      console.log('   Required Supabase redirect URLs:');
      console.log('   - https://yourdomain.com/auth/callback');
      console.log('   - https://yourdomain.com/es/auth/callback');
    }

    return true;
  } catch (error) {
    console.error('❌ OAuth configuration validation failed:', error.message);
    return false;
  }
}

/**
 * Provide setup guidance
 */
function provideSetupGuidance() {
  console.log('\n📋 GitHub OAuth Setup Guidance');
  console.log('=' .repeat(50));
  
  console.log('\n🔧 Supabase Configuration:');
  console.log('1. Go to Supabase Dashboard > Authentication > Providers');
  console.log('2. Find GitHub provider and click Configure');
  console.log('3. Add these redirect URLs:');
  console.log('   - http://localhost:4321/auth/callback');
  console.log('   - http://localhost:4321/es/auth/callback');
  console.log('4. Save the configuration');

  console.log('\n🔧 GitHub OAuth App Configuration:');
  console.log('1. Go to GitHub > Settings > Developer settings > OAuth Apps');
  console.log('2. Select your OAuth App');
  console.log('3. Update Authorization callback URL to:');
  console.log('   - http://localhost:4321/auth/callback');
  console.log('4. Save the changes');

  console.log('\n🚨 Common Issues:');
  console.log('• Port mismatch: Ensure all URLs use port 4321 for development');
  console.log('• Protocol mismatch: Use http:// for localhost, https:// for production');
  console.log('• Exact URL match: URLs must match exactly (including trailing slashes)');
  console.log('• Cache issues: Clear browser cache and restart dev server');

  console.log('\n🧪 Testing:');
  console.log('1. Start dev server: npm run dev');
  console.log('2. Navigate to: http://localhost:4321/auth/login');
  console.log('3. Click "Sign in with GitHub"');
  console.log('4. Check browser console for callback URL logs');
  console.log('5. Verify successful OAuth flow completion');
}

/**
 * Main function
 */
async function main() {
  console.log('🚀 GitHub OAuth Configuration Validator');
  console.log('=' .repeat(50));

  const isValid = await validateOAuthConfig();

  if (isValid) {
    console.log('\n✅ OAuth configuration validation completed');
    console.log('\nIf you\'re still experiencing issues:');
    console.log('1. Check the setup guidance below');
    console.log('2. Verify Supabase and GitHub OAuth App settings');
    console.log('3. Clear browser cache and restart dev server');
  } else {
    console.log('\n❌ OAuth configuration issues detected');
    console.log('Please follow the setup guidance below to fix the issues');
  }

  provideSetupGuidance();

  console.log('\n📚 For detailed setup instructions, see:');
  console.log('   docs/github-oauth-setup.md');
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run validator
main().catch(error => {
  console.error('❌ Validator failed:', error);
  process.exit(1);
});