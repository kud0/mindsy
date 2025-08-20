#!/usr/bin/env node

/**
 * Test script for GitHub OAuth configuration
 * This script tests the basic OAuth flow configuration without requiring a full UI
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testGitHubOAuthConfig() {
  console.log('🔍 Testing GitHub OAuth Configuration...\n');

  try {
    // Test 1: Check if we can generate OAuth URL
    console.log('1. Testing OAuth URL generation...');
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: 'http://localhost:3000/auth/callback',
        scopes: 'user:email read:user'
      }
    });

    if (error) {
      console.error('❌ OAuth URL generation failed:', error.message);
      return false;
    }

    if (data?.url) {
      console.log('✅ OAuth URL generated successfully');
      console.log('   URL:', data.url);
    } else {
      console.log('⚠️  OAuth URL generation returned no URL (this may be normal in server environment)');
    }

    // Test 2: Check Supabase connection
    console.log('\n2. Testing Supabase connection...');
    
    const { data: healthData, error: healthError } = await supabase
      .from('profiles')
      .select('count')
      .limit(1);

    if (healthError && !healthError.message.includes('permission denied')) {
      console.error('❌ Supabase connection failed:', healthError.message);
      return false;
    }

    console.log('✅ Supabase connection successful');

    // Test 3: Validate environment setup
    console.log('\n3. Validating environment setup...');
    
    const requiredEnvVars = [
      'PUBLIC_SUPABASE_URL',
      'PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      return false;
    }

    console.log('✅ All required environment variables are set');

    // Test 4: Check GitHub OAuth environment variables
    console.log('\n4. Checking GitHub OAuth environment variables...');
    
    const githubVars = ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'];
    const missingGitHubVars = githubVars.filter(varName => !process.env[varName]);
    
    if (missingGitHubVars.length > 0) {
      console.log('⚠️  GitHub OAuth environment variables not set:', missingGitHubVars.join(', '));
      console.log('   These are optional for testing but required for production');
    } else {
      console.log('✅ GitHub OAuth environment variables are set');
    }

    console.log('\n🎉 GitHub OAuth configuration test completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Configure GitHub OAuth app in GitHub Developer Settings');
    console.log('2. Configure GitHub provider in Supabase Dashboard');
    console.log('3. Test the complete OAuth flow in your application');
    
    return true;

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    return false;
  }
}

// Additional helper function to validate OAuth callback URL
function validateCallbackUrl() {
  console.log('\n5. Validating OAuth callback URL format...');
  
  const baseUrl = process.env.VERCEL_URL 
    ? `https://${process.env.VERCEL_URL}`
    : process.env.NODE_ENV === 'production'
    ? 'https://yourdomain.com'
    : 'http://localhost:3000';

  const callbackUrl = `${baseUrl}/auth/callback`;
  
  console.log('✅ Expected callback URL:', callbackUrl);
  console.log('   Make sure this URL is configured in:');
  console.log('   - GitHub OAuth App settings');
  console.log('   - Supabase Auth URL Configuration');
}

// Run tests
async function main() {
  const success = await testGitHubOAuthConfig();
  validateCallbackUrl();
  
  if (!success) {
    process.exit(1);
  }
}

main().catch(console.error);