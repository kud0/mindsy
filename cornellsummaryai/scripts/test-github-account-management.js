#!/usr/bin/env node

/**
 * Integration test for GitHub Account Management Interface
 * 
 * This script tests the GitHub account management functionality by:
 * 1. Testing the component rendering
 * 2. Testing the account status display
 * 3. Testing the link/unlink functionality
 * 4. Testing the profile sync functionality
 * 5. Testing error handling
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 GitHub Account Management Integration Test');
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

// Test 1: Verify component files exist
function testComponentFiles() {
  console.log('\n📁 Testing Component Files...');
  
  const files = [
    'src/components/GitHubAccountManager.astro',
    'src/components/__tests__/GitHubAccountManager.test.ts',
    'src/pages/dashboard/account.astro',
    'src/pages/es/dashboard/account.astro'
  ];
  
  for (const file of files) {
    const filePath = join(projectRoot, file);
    const exists = existsSync(filePath);
    logTest(`File exists: ${file}`, exists);
  }
}

// Test 2: Verify component structure
function testComponentStructure() {
  console.log('\n🏗️  Testing Component Structure...');
  
  try {
    const componentPath = join(projectRoot, 'src/components/GitHubAccountManager.astro');
    const content = readFileSync(componentPath, 'utf-8');
    
    // Check for required elements
    const requiredElements = [
      'github-account-section',
      'github-loading',
      'github-connected',
      'github-not-connected',
      'github-message',
      'unlink-modal',
      'link-github-btn',
      'unlink-github-btn',
      'sync-github-btn'
    ];
    
    for (const element of requiredElements) {
      const hasElement = content.includes(`id="${element}"`);
      logTest(`Has element: ${element}`, hasElement);
    }
    
    // Check for translations
    const hasTranslations = content.includes('translations = {') && 
                           content.includes('en:') && 
                           content.includes('es:');
    logTest('Has multi-language support', hasTranslations);
    
    // Check for auth store imports
    const hasAuthImports = content.includes('linkGitHubAccount') && 
                          content.includes('unlinkGitHubAccount') && 
                          content.includes('syncGitHubProfile');
    logTest('Imports auth store functions', hasAuthImports);
    
  } catch (error) {
    logTest('Component structure analysis', false, error.message);
  }
}

// Test 3: Verify account page integration
function testAccountPageIntegration() {
  console.log('\n🔗 Testing Account Page Integration...');
  
  try {
    // Test English account page
    const enAccountPath = join(projectRoot, 'src/pages/dashboard/account.astro');
    const enContent = readFileSync(enAccountPath, 'utf-8');
    
    const hasEnImport = enContent.includes('import GitHubAccountManager');
    const hasEnComponent = enContent.includes('<GitHubAccountManager lang="en"');
    
    logTest('English page imports component', hasEnImport);
    logTest('English page uses component', hasEnComponent);
    
    // Test Spanish account page
    const esAccountPath = join(projectRoot, 'src/pages/es/dashboard/account.astro');
    const esContent = readFileSync(esAccountPath, 'utf-8');
    
    const hasEsImport = esContent.includes('import GitHubAccountManager');
    const hasEsComponent = esContent.includes('<GitHubAccountManager lang="es"');
    
    logTest('Spanish page imports component', hasEsImport);
    logTest('Spanish page uses component', hasEsComponent);
    
  } catch (error) {
    logTest('Account page integration analysis', false, error.message);
  }
}

// Test 4: Run unit tests
function testUnitTests() {
  console.log('\n🧪 Running Unit Tests...');
  
  try {
    const testCommand = 'npm test -- --run src/components/__tests__/GitHubAccountManager.test.ts';
    const output = execSync(testCommand, { 
      cwd: projectRoot, 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    const passed = output.includes('✓') && !output.includes('FAIL');
    const testCount = (output.match(/✓/g) || []).length;
    
    logTest('Unit tests execution', passed, `${testCount} tests passed`);
    
  } catch (error) {
    logTest('Unit tests execution', false, 'Tests failed - see output above');
  }
}

// Test 5: Verify auth store functions
function testAuthStoreFunctions() {
  console.log('\n🔐 Testing Auth Store Functions...');
  
  try {
    const authStorePath = join(projectRoot, 'src/stores/auth.ts');
    const content = readFileSync(authStorePath, 'utf-8');
    
    const functions = [
      'signInWithGitHub',
      'linkGitHubAccount', 
      'unlinkGitHubAccount',
      'syncGitHubProfile'
    ];
    
    for (const func of functions) {
      const hasFunction = content.includes(`export async function ${func}`) ||
                         content.includes(`async function ${func}`);
      logTest(`Has function: ${func}`, hasFunction);
    }
    
    // Check for proper error handling
    const hasErrorHandling = content.includes('try {') && 
                            content.includes('catch (error)') &&
                            content.includes('console.error');
    logTest('Has error handling', hasErrorHandling);
    
  } catch (error) {
    logTest('Auth store analysis', false, error.message);
  }
}

// Test 6: Verify requirements coverage
function testRequirementsCoverage() {
  console.log('\n📋 Testing Requirements Coverage...');
  
  try {
    const componentPath = join(projectRoot, 'src/components/GitHubAccountManager.astro');
    const content = readFileSync(componentPath, 'utf-8');
    
    // Requirement 3.1: Display connected GitHub account
    const hasAccountDisplay = content.includes('GitHub Account Connected') &&
                             content.includes('github-username') &&
                             content.includes('github-connected-date');
    logTest('Req 3.1: Display connected account', hasAccountDisplay);
    
    // Requirement 3.2: Unlink functionality with confirmation
    const hasUnlinkConfirmation = content.includes('unlink-modal') &&
                                 content.includes('confirm-unlink-btn') &&
                                 content.includes('cancel-unlink-btn');
    logTest('Req 3.2: Unlink with confirmation', hasUnlinkConfirmation);
    
    // Requirement 3.3: Manual profile sync
    const hasProfileSync = content.includes('sync-github-btn') &&
                          content.includes('syncGitHubProfile');
    logTest('Req 3.3: Manual profile sync', hasProfileSync);
    
    // Error handling and user feedback
    const hasErrorFeedback = content.includes('github-message') &&
                            content.includes('showMessage') &&
                            content.includes('text-red-600') &&
                            content.includes('text-green-600');
    logTest('Error handling and feedback', hasErrorFeedback);
    
    // Multi-language support
    const hasMultiLang = content.includes('lang?: \'en\' | \'es\'') &&
                        content.includes('translations');
    logTest('Multi-language support', hasMultiLang);
    
  } catch (error) {
    logTest('Requirements coverage analysis', false, error.message);
  }
}

// Test 7: Check for security considerations
function testSecurityConsiderations() {
  console.log('\n🔒 Testing Security Considerations...');
  
  try {
    const componentPath = join(projectRoot, 'src/components/GitHubAccountManager.astro');
    const content = readFileSync(componentPath, 'utf-8');
    
    // Check for proper authentication checks
    const hasAuthCheck = content.includes('getUser()') &&
                        content.includes('if (!user)');
    logTest('Has authentication checks', hasAuthCheck);
    
    // Check for loading state management
    const hasLoadingState = content.includes('isLoading') &&
                           content.includes('disabled = true');
    logTest('Has loading state management', hasLoadingState);
    
    // Check for error boundary
    const hasErrorBoundary = content.includes('try {') &&
                            content.includes('catch (error)') &&
                            content.includes('finally {');
    logTest('Has error boundaries', hasErrorBoundary);
    
  } catch (error) {
    logTest('Security analysis', false, error.message);
  }
}

// Run all tests
async function runTests() {
  try {
    testComponentFiles();
    testComponentStructure();
    testAccountPageIntegration();
    testUnitTests();
    testAuthStoreFunctions();
    testRequirementsCoverage();
    testSecurityConsiderations();
    
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
    
    console.log('\n🎉 GitHub Account Management Integration Test Complete!');
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();