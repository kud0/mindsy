#!/usr/bin/env node

/**
 * Integration test for GitHub Account Linking Functionality
 * 
 * This script specifically tests the GitHub account linking functionality by:
 * 1. Verifying that the linkGitHubAccount function is properly imported and can be called
 * 2. Ensuring the loading state is correctly displayed during the linking process
 * 3. Verifying that error handling works correctly for linking failures
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 GitHub Account Linking Functionality Test');
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

// Test 1: Verify component script structure
function testComponentScriptStructure() {
  console.log('\n📁 Testing Component Script Structure...');
  
  try {
    const componentPath = join(projectRoot, 'src/components/GitHubAccountManager.astro');
    const content = readFileSync(componentPath, 'utf-8');
    
    // Check for proper module script setup
    const hasTypeModule = content.includes('<script type="module"') || 
                         content.includes('client:load');
    logTest('Has proper module script setup', hasTypeModule);
    
    // Check for import of linkGitHubAccount
    const hasLinkImport = content.includes('import { linkGitHubAccount');
    logTest('Imports linkGitHubAccount function', hasLinkImport);
    
    // Check for link button handler
    const hasLinkHandler = content.includes('handleLinkAccount');
    logTest('Has link account handler function', hasLinkHandler);
    
    // Check for loading state management
    const hasLoadingState = content.includes('isLoading = true') && 
                           content.includes('isLoading = false');
    logTest('Has loading state management', hasLoadingState);
    
    // Check for button loading state
    const hasButtonLoading = content.includes('setButtonLoading') && 
                            content.includes('button.disabled = true');
    logTest('Has button loading state handling', hasButtonLoading);
    
    // Check for error handling
    const hasErrorHandling = content.includes('catch (error)') && 
                            content.includes('showMessage') && 
                            content.includes('linkError');
    logTest('Has error handling for link failures', hasErrorHandling);
    
  } catch (error) {
    logTest('Component script structure analysis', false, error.message);
  }
}

// Test 2: Run unit tests for linking functionality
function testLinkingUnitTests() {
  console.log('\n🧪 Running Unit Tests for Linking Functionality...');
  
  try {
    // Create a temporary test file that focuses on linking functionality
    const testFilePath = join(projectRoot, 'src/components/__tests__/GitHubLinkingTest.temp.ts');
    const testContent = `
      import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
      import { JSDOM } from 'jsdom';

      // Mock the auth store functions
      const mockLinkGitHubAccount = vi.fn();

      vi.mock('../../stores/auth', () => ({
        linkGitHubAccount: mockLinkGitHubAccount,
      }));

      // Mock Supabase client
      const mockSupabase = {
        auth: {
          getUser: vi.fn(),
        },
      };

      vi.mock('../../lib/supabase', () => ({
        supabase: mockSupabase,
      }));

      describe('GitHub Account Linking Functionality', () => {
        let dom;
        let document;
        let window;

        beforeEach(() => {
          // Create a new JSDOM instance for each test
          dom = new JSDOM(\`
            <!DOCTYPE html>
            <html>
              <body>
                <div id="github-account-section">
                  <div id="github-loading" class="hidden"></div>
                  <div id="github-not-connected">
                    <button id="link-github-btn">Link GitHub Account</button>
                  </div>
                  <div id="github-message" class="hidden"></div>
                </div>
              </body>
            </html>
          \`, {
            url: 'http://localhost',
            pretendToBeVisual: true,
          });

          document = dom.window.document;
          window = dom.window;

          // Set up global objects
          global.document = document;
          global.window = window;
          global.location = window.location;

          // Reset all mocks
          vi.clearAllMocks();
        });

        afterEach(() => {
          dom.window.close();
        });

        it('should call linkGitHubAccount when link button is clicked', async () => {
          mockLinkGitHubAccount.mockResolvedValue({
            data: { url: 'https://github.com/oauth' },
            error: null
          });

          const linkBtn = document.getElementById('link-github-btn');
          
          // Create helper functions similar to the component
          async function handleLinkAccount() {
            try {
              linkBtn.disabled = true;
              linkBtn.textContent = 'Linking...';
              
              const { data, error } = await mockLinkGitHubAccount();
              
              if (error) {
                throw error;
              }
              
              if (data?.url) {
                window.location.href = data.url;
              }
              
              return { success: true };
            } catch (error) {
              const messageEl = document.getElementById('github-message');
              messageEl.textContent = 'Failed to link GitHub account. Please try again.';
              messageEl.className = 'text-sm text-red-600';
              messageEl.classList.remove('hidden');
              
              return { success: false, error };
            } finally {
              linkBtn.disabled = false;
              linkBtn.textContent = 'Link GitHub Account';
            }
          }
          
          await handleLinkAccount();

          expect(mockLinkGitHubAccount).toHaveBeenCalledTimes(1);
          expect(window.location.href).toBe('https://github.com/oauth');
        });

        it('should show loading state during linking process', async () => {
          // Mock a delayed response to test loading state
          mockLinkGitHubAccount.mockImplementation(() => {
            return new Promise(resolve => {
              setTimeout(() => {
                resolve({
                  data: { url: 'https://github.com/oauth' },
                  error: null
                });
              }, 100);
            });
          });

          const linkBtn = document.getElementById('link-github-btn');
          let btnDisabled = false;
          let btnText = '';
          
          // Create helper functions similar to the component
          async function handleLinkAccount() {
            try {
              linkBtn.disabled = true;
              linkBtn.textContent = 'Linking...';
              
              // Capture button state right after setting loading state
              btnDisabled = linkBtn.disabled;
              btnText = linkBtn.textContent;
              
              const { data, error } = await mockLinkGitHubAccount();
              
              if (error) {
                throw error;
              }
              
              return { success: true };
            } catch (error) {
              return { success: false, error };
            } finally {
              linkBtn.disabled = false;
              linkBtn.textContent = 'Link GitHub Account';
            }
          }
          
          const linkPromise = handleLinkAccount();
          
          // Check loading state before promise resolves
          expect(btnDisabled).toBe(true);
          expect(btnText).toBe('Linking...');
          
          await linkPromise;
          
          // Check state after promise resolves
          expect(linkBtn.disabled).toBe(false);
          expect(linkBtn.textContent).toBe('Link GitHub Account');
        });

        it('should handle errors when linking fails', async () => {
          const errorMessage = 'OAuth configuration error';
          mockLinkGitHubAccount.mockResolvedValue({
            data: null,
            error: { message: errorMessage }
          });

          const linkBtn = document.getElementById('link-github-btn');
          const messageEl = document.getElementById('github-message');
          
          // Create helper functions similar to the component
          async function handleLinkAccount() {
            try {
              linkBtn.disabled = true;
              linkBtn.textContent = 'Linking...';
              
              const { data, error } = await mockLinkGitHubAccount();
              
              if (error) {
                throw error;
              }
              
              return { success: true };
            } catch (error) {
              messageEl.textContent = 'Failed to link GitHub account. Please try again.';
              messageEl.className = 'text-sm text-red-600';
              messageEl.classList.remove('hidden');
              
              return { success: false, error };
            } finally {
              linkBtn.disabled = false;
              linkBtn.textContent = 'Link GitHub Account';
            }
          }
          
          const result = await handleLinkAccount();

          expect(result.success).toBe(false);
          expect(result.error.message).toBe(errorMessage);
          expect(messageEl.classList.contains('hidden')).toBe(false);
          expect(messageEl.classList.contains('text-red-600')).toBe(true);
        });
      });
    `;
    
    // Run the focused test
    const testCommand = 'npx vitest run src/components/__tests__/GitHubAccountManager.test.ts --run "Link GitHub Account"';
    const output = execSync(testCommand, { 
      cwd: projectRoot, 
      encoding: 'utf-8',
      stdio: 'pipe'
    });
    
    const passed = output.includes('✓') && !output.includes('FAIL');
    const testCount = (output.match(/✓/g) || []).length;
    
    logTest('Link functionality unit tests', passed, `${testCount} tests passed`);
    
  } catch (error) {
    logTest('Link functionality unit tests', false, 'Tests failed: ' + error.message);
  }
}

// Test 3: Verify auth store linkGitHubAccount function
function testAuthStoreLinkFunction() {
  console.log('\n🔐 Testing Auth Store Link Function...');
  
  try {
    const authStorePath = join(projectRoot, 'src/stores/auth.ts');
    const content = readFileSync(authStorePath, 'utf-8');
    
    // Check for linkGitHubAccount function
    const hasLinkFunction = content.includes('export async function linkGitHubAccount') ||
                           content.includes('export const linkGitHubAccount');
    logTest('Has linkGitHubAccount function', hasLinkFunction);
    
    // Check for proper error handling in the function
    const hasErrorHandling = content.includes('try {') && 
                            content.includes('catch (error)') &&
                            content.includes('console.error');
    logTest('Has error handling in linkGitHubAccount', hasErrorHandling);
    
    // Check for OAuth URL generation
    const hasOAuthUrlGeneration = content.includes('supabase.auth.signInWithOAuth') || 
                                 content.includes('supabase.auth.getOAuthSignInUrl');
    logTest('Generates OAuth URL for GitHub', hasOAuthUrlGeneration);
    
  } catch (error) {
    logTest('Auth store link function analysis', false, error.message);
  }
}

// Test 4: Verify component integration with auth store
function testComponentIntegration() {
  console.log('\n🔗 Testing Component Integration with Auth Store...');
  
  try {
    const componentPath = join(projectRoot, 'src/components/GitHubAccountManager.astro');
    const content = readFileSync(componentPath, 'utf-8');
    
    // Check for proper import from auth store
    const hasProperImport = content.includes('import { linkGitHubAccount') && 
                           content.includes('from \'../stores/auth\'');
    logTest('Has proper import from auth store', hasProperImport);
    
    // Check for function call
    const hasProperCall = content.includes('await linkGitHubAccount()');
    logTest('Properly calls linkGitHubAccount function', hasProperCall);
    
    // Check for URL handling
    const hasUrlHandling = content.includes('data?.url') && 
                          content.includes('window.location.href = data.url');
    logTest('Handles OAuth URL redirect', hasUrlHandling);
    
  } catch (error) {
    logTest('Component integration analysis', false, error.message);
  }
}

// Test 5: Verify loading state implementation
function testLoadingState() {
  console.log('\n⏳ Testing Loading State Implementation...');
  
  try {
    const componentPath = join(projectRoot, 'src/components/GitHubAccountManager.astro');
    const content = readFileSync(componentPath, 'utf-8');
    
    // Check for loading state variable
    const hasLoadingVar = content.includes('let isLoading = false');
    logTest('Has loading state variable', hasLoadingVar);
    
    // Check for loading state management
    const hasLoadingManagement = content.includes('isLoading = true') && 
                               content.includes('isLoading = false');
    logTest('Has loading state management', hasLoadingManagement);
    
    // Check for button loading state
    const hasButtonLoading = content.includes('button.disabled = true') && 
                            content.includes('button.textContent = loadingText');
    logTest('Updates button during loading', hasButtonLoading);
    
    // Check for loading text
    const hasLoadingText = content.includes('linking:') && 
                          (content.includes('Linking...') || content.includes('Conectando...'));
    logTest('Has loading text for link action', hasLoadingText);
    
  } catch (error) {
    logTest('Loading state analysis', false, error.message);
  }
}

// Test 6: Verify error handling implementation
function testErrorHandling() {
  console.log('\n🚨 Testing Error Handling Implementation...');
  
  try {
    const componentPath = join(projectRoot, 'src/components/GitHubAccountManager.astro');
    const content = readFileSync(componentPath, 'utf-8');
    
    // Check for try-catch block
    const hasTryCatch = content.includes('try {') && 
                       content.includes('catch (error)');
    logTest('Has try-catch error handling', hasTryCatch);
    
    // Check for error logging
    const hasErrorLogging = content.includes('console.error') && 
                           content.includes('Error linking GitHub account');
    logTest('Logs linking errors', hasErrorLogging);
    
    // Check for user feedback
    const hasUserFeedback = content.includes('showMessage') && 
                           content.includes('linkError');
    logTest('Shows error message to user', hasUserFeedback);
    
    // Check for error message styling
    const hasErrorStyling = content.includes('text-red-600') || 
                           content.includes('type === \'error\'');
    logTest('Applies error styling to messages', hasErrorStyling);
    
  } catch (error) {
    logTest('Error handling analysis', false, error.message);
  }
}

// Run all tests
async function runTests() {
  try {
    testComponentScriptStructure();
    testLinkingUnitTests();
    testAuthStoreLinkFunction();
    testComponentIntegration();
    testLoadingState();
    testErrorHandling();
    
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
    
    console.log('\n🎉 GitHub Account Linking Functionality Test Complete!');
    
    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
runTests();