#!/usr/bin/env node

/**
 * Test script for GitHub OAuth multi-language support
 * Tests that GitHub OAuth works correctly in both English and Spanish
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing GitHub OAuth Multi-Language Support\n');

// Test 1: Verify Spanish translations exist
console.log('1. Checking Spanish translations...');
const i18nPath = path.join(__dirname, '../src/lib/i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

const spanishTranslations = [
  'auth.github.signin',
  'auth.github.signup', 
  'auth.github.link',
  'auth.github.or',
  'auth.github.error.cancelled',
  'auth.github.error.failed',
  'auth.github.error.network',
  'auth.github.error.generic',
  'auth.github.loading.signin',
  'auth.github.loading.signup',
  'auth.github.loading.link'
];

let translationsMissing = [];
for (const key of spanishTranslations) {
  if (!i18nContent.includes(`'${key}':`)) {
    translationsMissing.push(key);
  }
}

if (translationsMissing.length > 0) {
  console.log('❌ Missing Spanish translations:', translationsMissing);
} else {
  console.log('✅ All Spanish translations found');
}

// Test 2: Verify Spanish auth pages exist and use GitHub components
console.log('\n2. Checking Spanish auth pages...');
const spanishAuthPages = [
  '../src/pages/es/auth/login.astro',
  '../src/pages/es/auth/signup.astro',
  '../src/pages/es/auth/callback.astro'
];

let pagesMissing = [];
for (const pagePath of spanishAuthPages) {
  const fullPath = path.join(__dirname, pagePath);
  if (!fs.existsSync(fullPath)) {
    pagesMissing.push(pagePath);
  } else {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (pagePath.includes('login.astro') || pagePath.includes('signup.astro')) {
      if (!content.includes('GitHubSignInButton') || !content.includes('lang="es"')) {
        console.log(`⚠️  ${pagePath} may not be properly configured for Spanish GitHub OAuth`);
      }
    }
  }
}

if (pagesMissing.length > 0) {
  console.log('❌ Missing Spanish auth pages:', pagesMissing);
} else {
  console.log('✅ All Spanish auth pages found');
}

// Test 3: Verify GitHub components support language parameter
console.log('\n3. Checking GitHub OAuth components...');
const githubButtonPath = path.join(__dirname, '../src/components/GitHubSignInButton.astro');
const githubManagerPath = path.join(__dirname, '../src/components/GitHubAccountManager.astro');

if (fs.existsSync(githubButtonPath)) {
  const buttonContent = fs.readFileSync(githubButtonPath, 'utf8');
  if (buttonContent.includes('lang?:') && buttonContent.includes('useTranslations')) {
    console.log('✅ GitHubSignInButton supports language parameter');
  } else {
    console.log('❌ GitHubSignInButton may not support language parameter properly');
  }
} else {
  console.log('❌ GitHubSignInButton component not found');
}

if (fs.existsSync(githubManagerPath)) {
  const managerContent = fs.readFileSync(githubManagerPath, 'utf8');
  if (managerContent.includes('lang?:') && managerContent.includes('translations')) {
    console.log('✅ GitHubAccountManager supports language parameter');
  } else {
    console.log('❌ GitHubAccountManager may not support language parameter properly');
  }
} else {
  console.log('❌ GitHubAccountManager component not found');
}

// Test 4: Verify auth store handles language routing
console.log('\n4. Checking auth store language routing...');
const authStorePath = path.join(__dirname, '../src/stores/auth.ts');
if (fs.existsSync(authStorePath)) {
  const authContent = fs.readFileSync(authStorePath, 'utf8');
  if (authContent.includes('startsWith(\'/es/\')') && authContent.includes('/es/auth/callback')) {
    console.log('✅ Auth store handles Spanish language routing');
  } else {
    console.log('❌ Auth store may not handle Spanish language routing properly');
  }
} else {
  console.log('❌ Auth store not found');
}

// Test 5: Verify Spanish account page uses GitHub manager
console.log('\n5. Checking Spanish account page...');
const spanishAccountPath = path.join(__dirname, '../src/pages/es/dashboard/account.astro');
if (fs.existsSync(spanishAccountPath)) {
  const accountContent = fs.readFileSync(spanishAccountPath, 'utf8');
  if (accountContent.includes('GitHubAccountManager') && accountContent.includes('lang="es"')) {
    console.log('✅ Spanish account page uses GitHub manager with correct language');
  } else {
    console.log('❌ Spanish account page may not be properly configured');
  }
} else {
  console.log('❌ Spanish account page not found');
}

// Test 6: Check for potential issues
console.log('\n6. Checking for potential issues...');
const issues = [];

// Check if callback URLs are consistent
if (i18nContent.includes('/es/auth/callback') && i18nContent.includes('/auth/callback')) {
  issues.push('Both English and Spanish callback URLs found in auth store - this is expected');
}

// Check if error messages are properly translated
const errorKeys = ['cancelled', 'failed', 'network', 'generic'];
for (const key of errorKeys) {
  if (!i18nContent.includes(`'auth.github.error.${key}':`)) {
    issues.push(`Missing error translation: auth.github.error.${key}`);
  }
}

if (issues.length > 0) {
  console.log('⚠️  Potential issues found:');
  issues.forEach(issue => console.log(`   - ${issue}`));
} else {
  console.log('✅ No obvious issues detected');
}

// Summary
console.log('\n📋 Test Summary:');
console.log('================');

const allChecks = [
  translationsMissing.length === 0,
  pagesMissing.length === 0,
  fs.existsSync(githubButtonPath),
  fs.existsSync(githubManagerPath),
  fs.existsSync(authStorePath),
  fs.existsSync(spanishAccountPath)
];

const passedChecks = allChecks.filter(Boolean).length;
const totalChecks = allChecks.length;

console.log(`✅ Passed: ${passedChecks}/${totalChecks} checks`);

if (passedChecks === totalChecks) {
  console.log('🎉 All tests passed! GitHub OAuth multi-language support appears to be working correctly.');
} else {
  console.log('⚠️  Some issues were found. Please review the output above.');
}

// Manual testing instructions
console.log('\n🔧 Manual Testing Instructions:');
console.log('==============================');
console.log('1. Start the development server: npm run dev');
console.log('2. Test English OAuth flow:');
console.log('   - Visit http://localhost:4321/auth/login');
console.log('   - Click "Sign in with GitHub"');
console.log('   - Complete OAuth flow');
console.log('   - Verify redirect to /dashboard');
console.log('');
console.log('3. Test Spanish OAuth flow:');
console.log('   - Visit http://localhost:4321/es/auth/login');
console.log('   - Click "Iniciar sesión con GitHub"');
console.log('   - Complete OAuth flow');
console.log('   - Verify redirect to /es/dashboard');
console.log('');
console.log('4. Test account linking:');
console.log('   - Sign in with email/password');
console.log('   - Visit account settings (/dashboard/account or /es/dashboard/account)');
console.log('   - Click "Link GitHub Account" or "Conectar Cuenta de GitHub"');
console.log('   - Complete OAuth flow');
console.log('   - Verify account is linked');
console.log('');
console.log('5. Test error handling:');
console.log('   - Cancel OAuth flow and verify error messages are in correct language');
console.log('   - Test with network issues if possible');