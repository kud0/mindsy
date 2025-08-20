#!/usr/bin/env node

/**
 * Authentication Debugging Script
 * 
 * This script helps diagnose common authentication issues by:
 * 1. Checking for OAuth configuration issues
 * 2. Validating callback URLs
 * 3. Testing cookie functionality
 * 4. Checking browser compatibility
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('=== Authentication Debugging Tool ===');

// Check if running in the correct directory
try {
  if (!fs.existsSync('./src/lib/auth-debugger.ts')) {
    console.error('Error: Please run this script from the project root directory');
    process.exit(1);
  }
} catch (error) {
  console.error('Error checking directory structure:', error);
  process.exit(1);
}

// Check for common issues
function checkForCommonIssues() {
  console.log('\n1. Checking for common authentication issues...');
  
  // Check for import/export issues
  console.log('\n- Checking for import/export issues:');
  
  // Check auth-utils-global.js
  if (!fs.existsSync('./src/lib/auth-utils-global.js')) {
    console.log('  ❌ auth-utils-global.js not found. This file is needed for global exports.');
    console.log('     Create this file to expose authentication utilities to the window object.');
  } else {
    console.log('  ✅ auth-utils-global.js found');
  }
  
  // Check script tags in callback pages
  const callbackPages = [
    './src/pages/auth/callback.astro',
    './src/pages/es/auth/callback.astro'
  ];
  
  callbackPages.forEach(page => {
    if (fs.existsSync(page)) {
      const content = fs.readFileSync(page, 'utf8');
      if (content.includes('import {') && !content.includes('is:inline')) {
        console.log(`  ❌ ${page} contains import statements without 'is:inline' directive.`);
        console.log('     Add is:inline to script tags or use global variables.');
      } else if (content.includes('is:inline') && content.includes('window.AuthUtils')) {
        console.log(`  ✅ ${page} correctly uses is:inline with global variables`);
      } else {
        console.log(`  ⚠️ ${page} may have script issues. Check manually.`);
      }
    }
  });
  
  // Check for OAuth configuration
  console.log('\n- Checking OAuth configuration:');
  
  // Check for environment variables
  const envFile = './.env';
  if (fs.existsSync(envFile)) {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const hasGithubClientId = envContent.includes('GITHUB_CLIENT_ID');
    const hasGithubSecret = envContent.includes('GITHUB_CLIENT_SECRET');
    
    if (hasGithubClientId && hasGithubSecret) {
      console.log('  ✅ GitHub OAuth environment variables found');
    } else {
      console.log('  ❌ Missing GitHub OAuth environment variables');
      if (!hasGithubClientId) console.log('     - GITHUB_CLIENT_ID not found');
      if (!hasGithubSecret) console.log('     - GITHUB_CLIENT_SECRET not found');
    }
  } else {
    console.log('  ❌ .env file not found');
  }
  
  // Check for browser compatibility issues
  console.log('\n- Checking browser compatibility handling:');
  
  if (fs.existsSync('./src/lib/browser-compatibility.ts')) {
    console.log('  ✅ browser-compatibility.ts found');
  } else {
    console.log('  ❌ browser-compatibility.ts not found');
  }
  
  // Check for cookie management
  console.log('\n- Checking cookie management:');
  
  if (fs.existsSync('./src/lib/auth-cookie-manager.ts')) {
    console.log('  ✅ auth-cookie-manager.ts found');
  } else {
    console.log('  ❌ auth-cookie-manager.ts not found');
  }
}

// Check for script errors
function checkForScriptErrors() {
  console.log('\n2. Checking for script errors...');
  
  try {
    // Run TypeScript check
    console.log('\n- Running TypeScript check:');
    const tsCheckOutput = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
    console.log('  ✅ TypeScript check passed');
  } catch (error) {
    console.log('  ❌ TypeScript errors found:');
    console.log(error.stdout.split('\n').slice(0, 5).join('\n'));
    console.log('  ... (more errors may exist)');
  }
}

// Suggest fixes
function suggestFixes() {
  console.log('\n=== Suggested Fixes ===');
  
  console.log(`
1. Fix import/export issues:
   - Create or update src/lib/auth-utils-global.js to expose utilities to window object
   - Use is:inline directive in script tags that use imports
   - Replace direct imports with window.AuthUtils.* references

2. Fix OAuth configuration:
   - Ensure GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET are in .env file
   - Verify callback URLs are correctly configured in GitHub OAuth settings

3. Fix script errors:
   - Address any TypeScript errors
   - Check for syntax errors in scripts
   - Ensure all required dependencies are properly imported

4. Browser compatibility:
   - Ensure browser-compatibility.ts is properly implemented
   - Add checks for cookies being enabled
   - Handle offline scenarios gracefully

5. Cookie management:
   - Verify auth-cookie-manager.ts is working correctly
   - Test cookie functionality in different browsers
   - Handle secure/non-secure cookie scenarios
`);
}

// Run all checks
function runAllChecks() {
  checkForCommonIssues();
  checkForScriptErrors();
  suggestFixes();
  
  console.log('\n=== Authentication Debugging Complete ===');
}

runAllChecks();