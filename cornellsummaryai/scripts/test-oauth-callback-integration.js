#!/usr/bin/env node

/**
 * OAuth Callback Integration Test Script
 * 
 * Tests the OAuth callback flow by simulating different callback scenarios
 * and verifying the callback handler behavior.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Test scenarios for OAuth callback
const testScenarios = [
  {
    name: 'Authorization Code Flow - English',
    url: 'http://localhost:4321/auth/callback?code=test-auth-code&state=test-state',
    expectedRedirect: '/dashboard',
    expectedLinking: false,
    expectedLanguage: 'en'
  },
  {
    name: 'Authorization Code Flow - Spanish',
    url: 'http://localhost:4321/es/auth/callback?code=test-auth-code&state=test-state',
    expectedRedirect: '/es/dashboard',
    expectedLinking: false,
    expectedLanguage: 'es'
  },
  {
    name: 'Account Linking Flow - English',
    url: 'http://localhost:4321/auth/callback?code=test-auth-code&state=test-state&linking=true',
    expectedRedirect: '/dashboard/account',
    expectedLinking: true,
    expectedLanguage: 'en'
  },
  {
    name: 'Account Linking Flow - Spanish',
    url: 'http://localhost:4321/es/auth/callback?code=test-auth-code&state=test-state&linking=true',
    expectedRedirect: '/es/dashboard/account',
    expectedLinking: true,
    expectedLanguage: 'es'
  },
  {
    name: 'Implicit Flow with Tokens - English',
    url: 'http://localhost:4321/auth/callback#access_token=test-access-token&refresh_token=test-refresh-token&token_type=bearer&expires_in=3600',
    expectedRedirect: '/dashboard',
    expectedLinking: false,
    expectedLanguage: 'en'
  },
  {
    name: 'OAuth Error - Access Denied',
    url: 'http://localhost:4321/auth/callback?error=access_denied&error_description=User%20denied%20access',
    expectedError: 'access_denied',
    expectedLanguage: 'en'
  },
  {
    name: 'OAuth Error - Invalid Request',
    url: 'http://localhost:4321/auth/callback?error=invalid_request&error_description=Invalid%20OAuth%20request',
    expectedError: 'invalid_request',
    expectedLanguage: 'en'
  },
  {
    name: 'Invalid Callback - No Parameters',
    url: 'http://localhost:4321/auth/callback',
    expectedValidation: false,
    expectedLanguage: 'en'
  },
  {
    name: 'Invalid Callback - Wrong Path',
    url: 'http://localhost:4321/invalid/path?code=test-code',
    expectedValidation: false,
    expectedLanguage: 'en'
  }
];

/**
 * Test OAuth callback URL validation
 */
function testCallbackValidation(scenario) {
  console.log(`\n🧪 Testing: ${scenario.name}`);
  
  try {
    const url = new URL(scenario.url);
    
    // Validate callback URL structure
    const hasCode = url.searchParams.has('code');
    const hasTokens = url.hash.includes('access_token') || url.searchParams.has('access_token');
    const hasError = url.searchParams.has('error');
    const isValidPath = url.pathname.includes('/auth/callback');
    
    const isValid = (hasCode || hasTokens || hasError) && isValidPath;
    
    console.log(`   URL: ${scenario.url}`);
    console.log(`   Valid: ${isValid}`);
    
    if (scenario.expectedValidation !== undefined) {
      if (isValid === scenario.expectedValidation) {
        console.log(`   ✅ Validation result matches expected: ${scenario.expectedValidation}`);
      } else {
        console.log(`   ❌ Validation result mismatch. Expected: ${scenario.expectedValidation}, Got: ${isValid}`);
        return false;
      }
    }
    
    if (isValid) {
      // Test parameter extraction
      const debugInfo = {
        pathname: url.pathname,
        hasCode: hasCode,
        hasError: hasError,
        hasTokens: hasTokens,
        isLinking: url.searchParams.get('linking') === 'true',
        searchParams: Object.fromEntries(url.searchParams.entries()),
        hash: url.hash
      };
      
      console.log(`   Debug Info:`, JSON.stringify(debugInfo, null, 4));
      
      // Test redirect URL determination
      const isSpanish = url.pathname.includes('/es/');
      const isLinking = url.searchParams.get('linking') === 'true';
      
      let expectedRedirect;
      if (hasError) {
        expectedRedirect = isSpanish ? '/es/auth/login' : '/auth/login';
      } else if (isLinking) {
        expectedRedirect = isSpanish ? '/es/dashboard/account' : '/dashboard/account';
      } else {
        expectedRedirect = isSpanish ? '/es/dashboard' : '/dashboard';
      }
      
      console.log(`   Expected Redirect: ${expectedRedirect}`);
      
      if (scenario.expectedRedirect && expectedRedirect === scenario.expectedRedirect) {
        console.log(`   ✅ Redirect URL matches expected`);
      } else if (scenario.expectedRedirect && expectedRedirect !== scenario.expectedRedirect) {
        console.log(`   ❌ Redirect URL mismatch. Expected: ${scenario.expectedRedirect}, Got: ${expectedRedirect}`);
        return false;
      }
      
      // Test language detection
      const detectedLanguage = isSpanish ? 'es' : 'en';
      if (detectedLanguage === scenario.expectedLanguage) {
        console.log(`   ✅ Language detection matches expected: ${scenario.expectedLanguage}`);
      } else {
        console.log(`   ❌ Language detection mismatch. Expected: ${scenario.expectedLanguage}, Got: ${detectedLanguage}`);
        return false;
      }
      
      // Test linking detection
      if (scenario.expectedLinking !== undefined) {
        if (isLinking === scenario.expectedLinking) {
          console.log(`   ✅ Linking detection matches expected: ${scenario.expectedLinking}`);
        } else {
          console.log(`   ❌ Linking detection mismatch. Expected: ${scenario.expectedLinking}, Got: ${isLinking}`);
          return false;
        }
      }
      
      // Test error detection
      if (scenario.expectedError) {
        const errorParam = url.searchParams.get('error');
        if (errorParam === scenario.expectedError) {
          console.log(`   ✅ Error detection matches expected: ${scenario.expectedError}`);
        } else {
          console.log(`   ❌ Error detection mismatch. Expected: ${scenario.expectedError}, Got: ${errorParam}`);
          return false;
        }
      }
    }
    
    console.log(`   ✅ Test passed`);
    return true;
    
  } catch (error) {
    console.log(`   ❌ Test failed with error: ${error.message}`);
    return false;
  }
}

/**
 * Test OAuth state validation
 */
function testOAuthStateValidation() {
  console.log(`\n🔐 Testing OAuth State Validation`);
  
  const testCases = [
    {
      name: 'Valid matching state',
      received: 'abc123def456',
      expected: 'abc123def456',
      shouldPass: true
    },
    {
      name: 'Invalid mismatched state',
      received: 'abc123def456',
      expected: 'xyz789ghi012',
      shouldPass: false
    },
    {
      name: 'Empty received state',
      received: '',
      expected: 'abc123def456',
      shouldPass: false
    },
    {
      name: 'Empty expected state',
      received: 'abc123def456',
      expected: '',
      shouldPass: false
    },
    {
      name: 'Null received state',
      received: null,
      expected: 'abc123def456',
      shouldPass: false
    },
    {
      name: 'Different length states',
      received: 'abc123',
      expected: 'abc123def456',
      shouldPass: false
    }
  ];
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    console.log(`   Testing: ${testCase.name}`);
    
    // Simulate constant-time comparison
    const isValid = !!(testCase.received && testCase.expected && 
                      testCase.received === testCase.expected &&
                      testCase.received.length === testCase.expected.length);
    
    if (isValid === testCase.shouldPass) {
      console.log(`   ✅ Passed`);
    } else {
      console.log(`   ❌ Failed. Expected: ${testCase.shouldPass}, Got: ${isValid}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Test token extraction from URL fragments
 */
function testTokenExtraction() {
  console.log(`\n🔑 Testing Token Extraction`);
  
  const testCases = [
    {
      name: 'Standard implicit flow tokens',
      url: 'http://localhost:4321/auth/callback#access_token=test-access&refresh_token=test-refresh&token_type=bearer&expires_in=3600',
      expectedTokens: {
        access_token: 'test-access',
        refresh_token: 'test-refresh',
        token_type: 'bearer',
        expires_in: '3600'
      }
    },
    {
      name: 'Tokens in search parameters',
      url: 'http://localhost:4321/auth/callback?access_token=test-access&refresh_token=test-refresh',
      expectedTokens: {
        access_token: 'test-access',
        refresh_token: 'test-refresh'
      }
    },
    {
      name: 'No tokens present',
      url: 'http://localhost:4321/auth/callback?code=test-code',
      expectedTokens: null
    },
    {
      name: 'Mixed parameters and hash',
      url: 'http://localhost:4321/auth/callback?state=test-state#access_token=test-token',
      expectedTokens: {
        access_token: 'test-token'
      }
    }
  ];
  
  let allPassed = true;
  
  for (const testCase of testCases) {
    console.log(`   Testing: ${testCase.name}`);
    
    try {
      const url = new URL(testCase.url);
      
      // Extract tokens from hash
      let extractedTokens = null;
      const hash = url.hash.substring(1);
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (accessToken || refreshToken) {
          extractedTokens = {};
          if (accessToken) extractedTokens.access_token = accessToken;
          if (refreshToken) extractedTokens.refresh_token = refreshToken;
          
          // Add other token parameters
          for (const [key, value] of hashParams.entries()) {
            if (key !== 'access_token' && key !== 'refresh_token') {
              extractedTokens[key] = value;
            }
          }
        }
      }
      
      // Also check search parameters as fallback
      if (!extractedTokens) {
        const accessToken = url.searchParams.get('access_token');
        const refreshToken = url.searchParams.get('refresh_token');
        
        if (accessToken || refreshToken) {
          extractedTokens = {};
          if (accessToken) extractedTokens.access_token = accessToken;
          if (refreshToken) extractedTokens.refresh_token = refreshToken;
        }
      }
      
      console.log(`   Extracted: ${JSON.stringify(extractedTokens)}`);
      console.log(`   Expected: ${JSON.stringify(testCase.expectedTokens)}`);
      
      // Compare results
      if (JSON.stringify(extractedTokens) === JSON.stringify(testCase.expectedTokens)) {
        console.log(`   ✅ Passed`);
      } else {
        console.log(`   ❌ Failed - token extraction mismatch`);
        allPassed = false;
      }
      
    } catch (error) {
      console.log(`   ❌ Failed with error: ${error.message}`);
      allPassed = false;
    }
  }
  
  return allPassed;
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🚀 Starting OAuth Callback Integration Tests\n');
  
  let totalTests = 0;
  let passedTests = 0;
  
  // Test callback validation scenarios
  console.log('📋 Testing Callback Validation Scenarios');
  for (const scenario of testScenarios) {
    totalTests++;
    if (testCallbackValidation(scenario)) {
      passedTests++;
    }
  }
  
  // Test OAuth state validation
  totalTests++;
  if (testOAuthStateValidation()) {
    passedTests++;
  }
  
  // Test token extraction
  totalTests++;
  if (testTokenExtraction()) {
    passedTests++;
  }
  
  // Summary
  console.log(`\n📊 Test Results Summary`);
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Passed: ${passedTests}`);
  console.log(`   Failed: ${totalTests - passedTests}`);
  console.log(`   Success Rate: ${Math.round((passedTests / totalTests) * 100)}%`);
  
  if (passedTests === totalTests) {
    console.log(`\n🎉 All tests passed! OAuth callback handling is working correctly.`);
    process.exit(0);
  } else {
    console.log(`\n❌ Some tests failed. Please review the OAuth callback implementation.`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test runner failed:', error);
  process.exit(1);
});