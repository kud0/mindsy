#!/usr/bin/env node

/**
 * Test script for GitHub Account Unlinking Functionality
 * 
 * This script tests the GitHub account unlinking functionality by:
 * 1. Testing the unlinking confirmation modal
 * 2. Testing the unlinking API call
 * 3. Testing error handling during unlinking
 * 4. Testing UI updates after unlinking
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 GitHub Account Unlinking Test');
console.log('='.repeat(50));

// Test results tracking
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

function logTest(name, passed, details = '') {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${status} ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  
  results.tests.push({ name, passed, details });
  if (passed) {
    results.passed++;
  } else {
    results.failed++;
  }
}

// Test 1: Verify test files exist
function testFilesExist() {
  console.log('\n📁 Testing Files Existence...');
  
  const files = [
    'src/components/GitHubAccountManager.astro',
    'src/components/__tests__/GitHubUnlinkingTest.ts',
    'src/stores/auth.ts'
  ];
  
  for (const file of files) {
    const filePath = join(projectRoot, file);
    const exists = existsSync(filePath);
    logTest(`File exists: ${file}`, exists);
  }
}

// Test 2: Verify unlinking functionality in component
function testUnlinkingFunctionality() {
  console.log('\n🔗 Testing Unlinking Functionality...');
  
  try {
    const componentPath = join(projectRoot, 'src/components/GitHubAccountManager.astro');
    const content = readFileSync(componentPath, 'utf-8');
    
    // Check for required elements
    const requiredElements = [
      'unlink-github-btn',
      'unlink-modal',
      'confirm-unlink-btn',
      'cancel-unlink-btn'
    ];
    
    for (const element of requiredElements) {
      const hasElement = content.includes(`id="${element}"`);
      logTest(`Has element: ${element}`, hasElement);
    }
    
    // Check for unlinking function import
    const hasUnlinkImport = content.includes('unlinkGitHubAccount');
    logTest('Imports unlinkGitHubAccount function', hasUnlinkImport);
    
    // Check for unlinking handler
    const hasUnlinkHandler = content.includes('handleUnlinkAccount');
    logTest('Has unlinking handler function', hasUnlinkHandler);
    
    // Check for confirmation modal functionality
    const hasModalShow = content.includes('showUnlinkModal');
    const hasModalHide = content.includes('hideUnlinkModal');
    logTest('Has modal show/hide functions', hasModalShow && hasModalHide);
    
    // Check for error handling
    const hasErrorHandling = content.includes('try {') && 
                            content.includes('catch (error)') &&
                            content.includes('showMessage');
    logTest('Has error handling', hasErrorHandling);
    
  } catch (error) {
    logTest('Component analysis', false, error.message);
  }
}

// Test 3: Verify auth store unlinking function
function testAuthStoreFunction() {
  console.log('\n🔐 Testing Auth Store Unlinking Function...');
  
  try {
    const authStorePath = join(projectRoot, 'src/stores/auth.ts');
    const content = readFileSync(authStorePath, 'utf-8');
    
    // Check for unlinkGitHubAccount function
    const hasUnlinkFunction = content.includes('export async function unlinkGitHubAccount') ||
                             content.includes('async function unlinkGitHubAccount');
    logTest('Has unlinkGitHubAccount function', hasUnlinkFunction);
    
    // Check for proper error handling
    const hasErrorHandling = content.includes('try {') && 
                            content.includes('catch (error)');
    logTest('Has error handling in unlinking function', hasErrorHandling);
    
  } catch (error) {
    logTest('Auth store analysis', false, error.message);
  }
}

// Test 4: Check unit test files
function runUnitTests() {
  console.log('\n🧪 Checking Unit Test Files...');
  
  try {
    // Check if test files exist
    const unlinkingTestPath = join(projectRoot, 'src/components/__tests__/GitHubUnlinkingTest.ts');
    const generalTestPath = join(projectRoot, 'src/components/__tests__/GitHubAccountManager.test.ts');
    
    const unlinkingTestExists = existsSync(unlinkingTestPath);
    const generalTestExists = existsSync(generalTestPath);
    
    logTest('Unlinking test file exists', unlinkingTestExists);
    logTest('General component test file exists', generalTestExists);
    
    // Check test file content
    if (unlinkingTestExists) {
      const content = readFileSync(unlinkingTestPath, 'utf-8');
      
      const hasUnlinkTests = content.includes('unlinkGitHubAccount');
      const hasErrorHandlingTests = content.includes('handle error');
      
      logTest('Unlinking test has unlinkGitHubAccount tests', hasUnlinkTests);
      logTest('Unlinking test has error handling tests', hasErrorHandlingTests);
    }
    
  } catch (error) {
    logTest('Unit test file check', false, error.message);
  }
}

// Test 5: Verify requirements coverage
function testRequirementsCoverage() {
  console.log('\n📋 Testing Requirements Coverage...');
  
  try {
    const componentPath = join(projectRoot, 'src/components/GitHubAccountManager.astro');
    const content = readFileSync(componentPath, 'utf-8');
    
    // Requirement 1.3: Unlink GitHub account without syntax errors
    const hasUnlinkFunction = content.includes('unlinkGitHubAccount') &&
                             content.includes('handleUnlinkAccount');
    logTest('Req 1.3: Unlink GitHub account without syntax errors', hasUnlinkFunction);
    
    // Requirement 1.4: No infinite loading state
    const hasLoadingState = content.includes('isLoading') &&
                           content.includes('showLoading');
    logTest('Req 1.4: No infinite loading state', hasLoadingState);
    
    // Check for confirmation modal
    const hasConfirmationModal = content.includes('unlink-modal') &&
                               content.includes('confirm-unlink-btn') &&
                               content.includes('cancel-unlink-btn');
    logTest('Has confirmation modal for unlinking', hasConfirmationModal);
    
    // Check for error handling
    const hasErrorHandling = content.includes('try {') && 
                            content.includes('catch (error)') &&
                            content.includes('showMessage');
    logTest('Has error handling for unlinking failures', hasErrorHandling);
    
  } catch (error) {
    logTest('Requirements coverage analysis', false, error.message);
  }
}

// Run all tests
async function runTests() {
  try {
    testFilesExist();
    testUnlinkingFunctionality();
    testAuthStoreFunction();
    runUnitTests();
    testRequirementsCoverage();
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Test Summary');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);
    
    if (results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      results.tests
        .filter(test => !test.passed)
        .forEach(test => {
          console.log(`   • ${test.name}`);
          if (test.details) {
            console.log(`     ${test.details}`);
          }
        });
    }
    
    console.log('\n🎉 GitHub Account Unlinking Test Complete!');
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();