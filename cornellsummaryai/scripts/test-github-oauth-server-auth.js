#!/usr/bin/env node

/**
 * Integration test for GitHub OAuth server-side authentication
 * Tests the complete flow of OAuth session validation and middleware
 */

import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';

// Configuration
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.PUBLIC_SUPABASE_ANON_KEY;
const TEST_SERVER_URL = process.env.TEST_SERVER_URL || 'http://localhost:4321';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables');
  console.error('Required: PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Test server-side authentication with mock OAuth session
 */
async function testServerSideOAuthAuth() {
  console.log('\n🔐 Testing Server-side OAuth Authentication...\n');

  try {
    // Test 1: Unauthenticated request
    console.log('1. Testing unauthenticated request...');
    const unauthResponse = await fetch(`${TEST_SERVER_URL}/api/test-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (unauthResponse.status === 401) {
      console.log('✅ Correctly rejected unauthenticated request');
    } else {
      console.log('❌ Should have rejected unauthenticated request');
      return false;
    }

    // Test 2: Invalid token
    console.log('\n2. Testing invalid token...');
    const invalidTokenResponse = await fetch(`${TEST_SERVER_URL}/api/test-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'sb-access-token=invalid-token; sb-refresh-token=invalid-refresh'
      }
    });

    if (invalidTokenResponse.status === 401) {
      console.log('✅ Correctly rejected invalid token');
    } else {
      console.log('❌ Should have rejected invalid token');
      return false;
    }

    // Test 3: Test with actual session (if available)
    console.log('\n3. Testing with session validation...');
    
    // Create a test session (this would normally be done through OAuth flow)
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.log('⚠️  No active session found - skipping authenticated tests');
      console.log('   To test authenticated flows, sign in through the web interface first');
      return true;
    }

    // Test with valid session
    const authResponse = await fetch(`${TEST_SERVER_URL}/api/test-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sb-access-token=${sessionData.session.access_token}; sb-refresh-token=${sessionData.session.refresh_token}`
      }
    });

    if (authResponse.ok) {
      const authResult = await authResponse.json();
      console.log('✅ Successfully authenticated request');
      console.log(`   User ID: ${authResult.user?.id}`);
      console.log(`   Email: ${authResult.user?.email}`);
      
      // Check for OAuth context
      if (authResult.isOAuthUser) {
        console.log(`   OAuth Provider: ${authResult.oauthProvider}`);
        console.log('✅ OAuth context properly detected');
      } else {
        console.log('   Standard email/password authentication');
      }
    } else {
      console.log('❌ Failed to authenticate valid session');
      const errorResult = await authResponse.json();
      console.log(`   Error: ${errorResult.message}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Server-side OAuth authentication test failed:', error.message);
    return false;
  }
}

/**
 * Test middleware OAuth context
 */
async function testMiddlewareOAuthContext() {
  console.log('\n🔄 Testing Middleware OAuth Context...\n');

  try {
    // Test accessing a protected page to verify middleware OAuth handling
    console.log('1. Testing middleware OAuth context on protected route...');
    
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !sessionData.session) {
      console.log('⚠️  No active session - testing unauthenticated middleware behavior');
      
      // Test redirect to login for protected route
      const protectedResponse = await fetch(`${TEST_SERVER_URL}/dashboard`, {
        redirect: 'manual'
      });

      if (protectedResponse.status === 302) {
        const location = protectedResponse.headers.get('location');
        if (location && location.includes('/auth/login')) {
          console.log('✅ Middleware correctly redirects unauthenticated users to login');
        } else {
          console.log('❌ Middleware redirect location incorrect:', location);
          return false;
        }
      } else {
        console.log('❌ Middleware should redirect unauthenticated users');
        return false;
      }
      
      return true;
    }

    // Test with authenticated session
    const dashboardResponse = await fetch(`${TEST_SERVER_URL}/dashboard`, {
      headers: {
        'Cookie': `sb-access-token=${sessionData.session.access_token}; sb-refresh-token=${sessionData.session.refresh_token}`
      },
      redirect: 'manual'
    });

    if (dashboardResponse.ok || dashboardResponse.status === 200) {
      console.log('✅ Middleware allows authenticated users to access protected routes');
      
      // Check if user has OAuth identities
      const user = sessionData.session.user;
      const hasOAuthIdentity = user.identities?.some(identity => 
        identity.provider !== 'email' && identity.provider !== 'phone'
      );
      
      if (hasOAuthIdentity) {
        const oauthIdentity = user.identities.find(identity => 
          identity.provider !== 'email' && identity.provider !== 'phone'
        );
        console.log(`✅ OAuth identity detected: ${oauthIdentity.provider}`);
        
        if (oauthIdentity.provider === 'github') {
          console.log('✅ GitHub OAuth context available in middleware');
          const githubData = oauthIdentity.identity_data;
          if (githubData.login) {
            console.log(`   GitHub username: ${githubData.login}`);
          }
        }
      } else {
        console.log('   Standard email/password authentication in middleware');
      }
    } else {
      console.log('❌ Middleware failed to handle authenticated user');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ Middleware OAuth context test failed:', error.message);
    return false;
  }
}

/**
 * Test OAuth session validation edge cases
 */
async function testOAuthValidationEdgeCases() {
  console.log('\n🧪 Testing OAuth Validation Edge Cases...\n');

  try {
    // Test 1: Malformed cookies
    console.log('1. Testing malformed cookies...');
    const malformedResponse = await fetch(`${TEST_SERVER_URL}/api/test-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'sb-access-token=malformed%token; sb-refresh-token='
      }
    });

    if (malformedResponse.status === 401) {
      console.log('✅ Correctly handled malformed cookies');
    } else {
      console.log('❌ Should have rejected malformed cookies');
      return false;
    }

    // Test 2: Expired token simulation
    console.log('\n2. Testing expired token handling...');
    const expiredResponse = await fetch(`${TEST_SERVER_URL}/api/test-auth`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'sb-access-token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid; sb-refresh-token=refresh-token'
      }
    });

    if (expiredResponse.status === 401) {
      console.log('✅ Correctly handled expired token');
    } else {
      console.log('❌ Should have rejected expired token');
      return false;
    }

    return true;
  } catch (error) {
    console.error('❌ OAuth validation edge cases test failed:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting GitHub OAuth Server-side Authentication Tests');
  console.log('=' .repeat(60));

  const results = [];

  // Run all tests
  results.push(await testServerSideOAuthAuth());
  results.push(await testMiddlewareOAuthContext());
  results.push(await testOAuthValidationEdgeCases());

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Results Summary');
  console.log('=' .repeat(60));

  const passed = results.filter(Boolean).length;
  const total = results.length;

  console.log(`✅ Passed: ${passed}/${total}`);
  console.log(`❌ Failed: ${total - passed}/${total}`);

  if (passed === total) {
    console.log('\n🎉 All GitHub OAuth server-side authentication tests passed!');
    process.exit(0);
  } else {
    console.log('\n💥 Some tests failed. Please check the output above.');
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});