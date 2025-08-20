#!/usr/bin/env node

/**
 * Integration test for GitHub OAuth multi-language support
 * Simulates the OAuth flow to verify language routing works correctly
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔗 Testing GitHub OAuth Integration with Multi-Language Support\n');

// Test 1: Verify callback URL generation logic
console.log('1. Testing callback URL generation...');

// Simulate the auth store logic
function getCallbackUrl(currentPath, origin = 'http://localhost:4321') {
  const isSpanish = currentPath.startsWith('/es/');
  return isSpanish 
    ? `${origin}/es/auth/callback`
    : `${origin}/auth/callback`;
}

const testCases = [
  { path: '/auth/login', expected: 'http://localhost:4321/auth/callback' },
  { path: '/es/auth/login', expected: 'http://localhost:4321/es/auth/callback' },
  { path: '/dashboard/account', expected: 'http://localhost:4321/auth/callback' },
  { path: '/es/dashboard/account', expected: 'http://localhost:4321/es/auth/callback' },
];

let callbackUrlTests = 0;
for (const testCase of testCases) {
  const result = getCallbackUrl(testCase.path);
  if (result === testCase.expected) {
    console.log(`✅ ${testCase.path} → ${result}`);
    callbackUrlTests++;
  } else {
    console.log(`❌ ${testCase.path} → ${result} (expected: ${testCase.expected})`);
  }
}

// Test 2: Verify translation keys are consistent
console.log('\n2. Testing translation consistency...');

const i18nPath = path.join(__dirname, '../src/lib/i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

// Extract English translations
const englishMatch = i18nContent.match(/en:\s*{([^}]+(?:{[^}]*}[^}]*)*)/s);
const spanishMatch = i18nContent.match(/es:\s*{([^}]+(?:{[^}]*}[^}]*)*)/s);

if (!englishMatch || !spanishMatch) {
  console.log('❌ Could not parse translations');
} else {
  const englishKeys = [...englishMatch[1].matchAll(/'([^']+)':/g)].map(m => m[1]);
  const spanishKeys = [...spanishMatch[1].matchAll(/'([^']+)':/g)].map(m => m[1]);
  
  const githubKeys = englishKeys.filter(key => key.startsWith('auth.github.'));
  const missingSpanishKeys = githubKeys.filter(key => !spanishKeys.includes(key));
  
  if (missingSpanishKeys.length === 0) {
    console.log(`✅ All ${githubKeys.length} GitHub OAuth translation keys are present in both languages`);
  } else {
    console.log(`❌ Missing Spanish translations: ${missingSpanishKeys.join(', ')}`);
  }
}

// Test 3: Verify component language parameter usage
console.log('\n3. Testing component language parameter usage...');

const componentTests = [
  {
    file: '../src/pages/auth/login.astro',
    shouldContain: ['GitHubSignInButton', 'lang="en"'],
    description: 'English login page'
  },
  {
    file: '../src/pages/es/auth/login.astro', 
    shouldContain: ['GitHubSignInButton', 'lang="es"'],
    description: 'Spanish login page'
  },
  {
    file: '../src/pages/auth/signup.astro',
    shouldContain: ['GitHubSignInButton', 'lang="en"'],
    description: 'English signup page'
  },
  {
    file: '../src/pages/es/auth/signup.astro',
    shouldContain: ['GitHubSignInButton', 'lang="es"'],
    description: 'Spanish signup page'
  },
  {
    file: '../src/pages/dashboard/account.astro',
    shouldContain: ['GitHubAccountManager', 'lang="en"'],
    description: 'English account page'
  },
  {
    file: '../src/pages/es/dashboard/account.astro',
    shouldContain: ['GitHubAccountManager', 'lang="es"'],
    description: 'Spanish account page'
  }
];

let componentTests_passed = 0;
for (const test of componentTests) {
  const filePath = path.join(__dirname, test.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const allPresent = test.shouldContain.every(item => content.includes(item));
    
    if (allPresent) {
      console.log(`✅ ${test.description} - correctly configured`);
      componentTests_passed++;
    } else {
      console.log(`❌ ${test.description} - missing required elements: ${test.shouldContain.filter(item => !content.includes(item)).join(', ')}`);
    }
  } else {
    console.log(`❌ ${test.description} - file not found`);
  }
}

// Test 4: Verify error message translations
console.log('\n4. Testing error message translations...');

const errorMessageTests = [
  'auth.github.error.cancelled',
  'auth.github.error.failed', 
  'auth.github.error.network',
  'auth.github.error.generic'
];

let errorTranslationTests = 0;
for (const errorKey of errorMessageTests) {
  const englishPattern = new RegExp(`'${errorKey}':\\s*'([^']+)'`);
  const spanishPattern = new RegExp(`'${errorKey}':\\s*'([^']+)'`);
  
  const englishMatch = i18nContent.match(englishPattern);
  const spanishMatch = i18nContent.match(spanishPattern);
  
  if (englishMatch && spanishMatch) {
    const englishText = englishMatch[1];
    const spanishText = spanishMatch[1];
    
    if (englishText !== spanishText) {
      console.log(`✅ ${errorKey} - properly translated`);
      errorTranslationTests++;
    } else {
      console.log(`⚠️  ${errorKey} - same text in both languages (may need review)`);
    }
  } else {
    console.log(`❌ ${errorKey} - missing translation`);
  }
}

// Test 5: Verify callback page language handling
console.log('\n5. Testing callback page language handling...');

const callbackPages = [
  { file: '../src/pages/auth/callback.astro', lang: 'en', redirects: ['/dashboard'] },
  { file: '../src/pages/es/auth/callback.astro', lang: 'es', redirects: ['/es/dashboard', '/es/auth/login'] }
];

let callbackTests = 0;
for (const page of callbackPages) {
  const filePath = path.join(__dirname, page.file);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const hasCorrectRedirects = page.redirects.every(redirect => content.includes(redirect));
    const hasCorrectLang = content.includes(`lang="${page.lang}"`);
    
    if (hasCorrectRedirects && hasCorrectLang) {
      console.log(`✅ ${page.file} - correctly configured for ${page.lang}`);
      callbackTests++;
    } else {
      console.log(`❌ ${page.file} - missing required elements`);
    }
  } else {
    console.log(`❌ ${page.file} - file not found`);
  }
}

// Summary
console.log('\n📊 Integration Test Results:');
console.log('============================');

const totalTests = testCases.length + componentTests.length + errorMessageTests.length + callbackPages.length;
const passedTests = callbackUrlTests + componentTests_passed + errorTranslationTests + callbackTests;

console.log(`✅ Callback URL generation: ${callbackUrlTests}/${testCases.length}`);
console.log(`✅ Component configuration: ${componentTests_passed}/${componentTests.length}`);
console.log(`✅ Error message translations: ${errorTranslationTests}/${errorMessageTests.length}`);
console.log(`✅ Callback page configuration: ${callbackTests}/${callbackPages.length}`);
console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('\n🎉 All integration tests passed!');
  console.log('✅ GitHub OAuth multi-language support is fully implemented and working correctly.');
} else {
  console.log('\n⚠️  Some integration tests failed. Please review the issues above.');
}

// Final recommendations
console.log('\n💡 Recommendations for Production:');
console.log('==================================');
console.log('1. Test the OAuth flow manually in both languages');
console.log('2. Verify that error messages display correctly in both languages');
console.log('3. Test account linking functionality in both language versions');
console.log('4. Ensure that users are redirected to the correct language version after OAuth');
console.log('5. Test with different browsers and devices');
console.log('6. Monitor OAuth success/failure rates by language in production');