/**
 * GitHub Account Loading Verification Script
 * 
 * This script verifies that the GitHubAccountManager component is properly configured
 * to use ES module imports and will not cause JavaScript errors when loaded.
 */

import fs from 'fs';
import path from 'path';

// Paths to check
const COMPONENT_PATH = 'src/components/GitHubAccountManager.astro';
const AUTH_STORE_PATH = 'src/stores/auth.ts';

// Function to check if a file exists
function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    console.error(`Error checking if file exists: ${filePath}`, error);
    return false;
  }
}

// Function to read a file
function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
    return null;
  }
}

// Function to check if the component is properly configured
function checkComponentConfiguration() {
  console.log('Checking GitHubAccountManager component configuration...');
  
  // Check if component file exists
  if (!fileExists(COMPONENT_PATH)) {
    console.error(`Component file not found: ${COMPONENT_PATH}`);
    return false;
  }
  
  // Read component file
  const componentContent = readFile(COMPONENT_PATH);
  if (!componentContent) {
    return false;
  }
  
  // Check if script tag has client:load directive
  const hasClientLoadDirective = componentContent.includes('<script client:load');
  
  // Check if component imports from auth store
  const importsFromAuthStore = componentContent.includes("import { linkGitHubAccount, unlinkGitHubAccount, syncGitHubProfile } from '../stores/auth'");
  
  // Check if auth store exports the required functions
  if (!fileExists(AUTH_STORE_PATH)) {
    console.error(`Auth store file not found: ${AUTH_STORE_PATH}`);
    return false;
  }
  
  const authStoreContent = readFile(AUTH_STORE_PATH);
  if (!authStoreContent) {
    return false;
  }
  
  const exportsLinkGitHubAccount = authStoreContent.includes('export async function linkGitHubAccount');
  const exportsUnlinkGitHubAccount = authStoreContent.includes('export async function unlinkGitHubAccount');
  const exportsSyncGitHubProfile = authStoreContent.includes('export async function syncGitHubProfile');
  
  // Log results
  console.log(`- Script has client:load directive: ${hasClientLoadDirective ? '✅' : '❌'}`);
  console.log(`- Imports from auth store: ${importsFromAuthStore ? '✅' : '❌'}`);
  console.log(`- Auth store exports linkGitHubAccount: ${exportsLinkGitHubAccount ? '✅' : '❌'}`);
  console.log(`- Auth store exports unlinkGitHubAccount: ${exportsUnlinkGitHubAccount ? '✅' : '❌'}`);
  console.log(`- Auth store exports syncGitHubProfile: ${exportsSyncGitHubProfile ? '✅' : '❌'}`);
  
  // Check if component has proper loading state handling
  const hasLoadingState = componentContent.includes('showLoading(true)') && 
                          componentContent.includes('showLoading(false)');
  
  console.log(`- Has proper loading state handling: ${hasLoadingState ? '✅' : '❌'}`);
  
  // Overall result
  const isProperlyConfigured = hasClientLoadDirective && 
                              importsFromAuthStore && 
                              exportsLinkGitHubAccount && 
                              exportsUnlinkGitHubAccount && 
                              exportsSyncGitHubProfile &&
                              hasLoadingState;
  
  if (isProperlyConfigured) {
    console.log('✅ GitHubAccountManager component is properly configured and should not cause JavaScript errors');
  } else {
    console.error('❌ GitHubAccountManager component has configuration issues that may cause JavaScript errors');
  }
  
  return isProperlyConfigured;
}

// Function to check if the account page imports the component
function checkAccountPageImport() {
  console.log('\nChecking account page imports...');
  
  const ACCOUNT_PAGE_PATH = 'src/pages/dashboard/account.astro';
  
  // Check if account page exists
  if (!fileExists(ACCOUNT_PAGE_PATH)) {
    console.error(`Account page not found: ${ACCOUNT_PAGE_PATH}`);
    return false;
  }
  
  // Read account page
  const accountPageContent = readFile(ACCOUNT_PAGE_PATH);
  if (!accountPageContent) {
    return false;
  }
  
  // Check if account page imports GitHubAccountManager
  const importsGitHubAccountManager = accountPageContent.includes("import GitHubAccountManager from '../../components/GitHubAccountManager.astro'");
  
  // Check if account page uses GitHubAccountManager
  const usesGitHubAccountManager = accountPageContent.includes('<GitHubAccountManager');
  
  console.log(`- Imports GitHubAccountManager: ${importsGitHubAccountManager ? '✅' : '❌'}`);
  console.log(`- Uses GitHubAccountManager: ${usesGitHubAccountManager ? '✅' : '❌'}`);
  
  return importsGitHubAccountManager && usesGitHubAccountManager;
}

// Main function
function verifyGitHubAccountLoading() {
  console.log('GitHub Account Loading Verification');
  console.log('==================================\n');
  
  const componentConfigured = checkComponentConfiguration();
  const accountPageImports = checkAccountPageImport();
  
  console.log('\nVerification Summary:');
  console.log(`- Component properly configured: ${componentConfigured ? '✅' : '❌'}`);
  console.log(`- Account page properly imports component: ${accountPageImports ? '✅' : '❌'}`);
  
  const overallResult = componentConfigured && accountPageImports;
  
  console.log(`\nOverall Result: ${overallResult ? '✅ PASSED' : '❌ FAILED'}`);
  
  return overallResult;
}

// Run verification if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  const passed = verifyGitHubAccountLoading();
  process.exit(passed ? 0 : 1);
}

export { verifyGitHubAccountLoading };