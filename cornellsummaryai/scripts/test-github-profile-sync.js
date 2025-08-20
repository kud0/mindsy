/**
 * Test script for GitHub Profile Synchronization
 * 
 * This script tests the GitHub profile synchronization functionality:
 * - Verifies that the syncGitHubProfile function is properly imported and can be called
 * - Ensures the loading state is correctly displayed during synchronization
 * - Verifies that error handling works correctly for synchronization failures
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// Define paths
const testFile = path.resolve('src/components/__tests__/GitHubProfileSyncTest.test.ts');
const componentFile = path.resolve('src/components/GitHubAccountManager.astro');

// Check if files exist
if (!existsSync(testFile)) {
  console.error('❌ Test file not found:', testFile);
  process.exit(1);
}

if (!existsSync(componentFile)) {
  console.error('❌ Component file not found:', componentFile);
  process.exit(1);
}

console.log('🧪 Running GitHub Profile Synchronization tests...');

try {
  // Run the test with Vitest
  execSync(`npx vitest run src/components/__tests__/GitHubProfileSyncTest.test.ts --run`, {
    stdio: 'inherit'
  });
  
  console.log('✅ GitHub Profile Synchronization tests completed successfully!');
} catch (error) {
  console.error('❌ GitHub Profile Synchronization tests failed:', error.message);
  process.exit(1);
}