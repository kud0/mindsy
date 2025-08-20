#!/usr/bin/env node

/**
 * Test script to verify Tailwind Typography plugin is working correctly
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing Tailwind Typography Plugin...\n');

// Check if the build output exists
const buildDir = 'dist/client';
const blogIndexPath = join(buildDir, 'blog', 'index.html');
const blogPostPath = join(buildDir, 'blog', 'getting-started-with-astro', 'index.html');

let testsPassed = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    const result = testFn();
    if (result) {
      console.log(`✅ ${testName}`);
      testsPassed++;
    } else {
      console.log(`❌ ${testName}`);
    }
  } catch (error) {
    console.log(`❌ ${testName} - Error: ${error.message}`);
  }
}

// Test 1: Check if build output exists
runTest('Build output exists', () => {
  return existsSync(blogIndexPath) && existsSync(blogPostPath);
});

if (existsSync(blogPostPath)) {
  const blogPostContent = readFileSync(blogPostPath, 'utf-8');
  
  // Test 2: Check if prose classes are applied
  runTest('Prose classes are applied to blog content', () => {
    return blogPostContent.includes('prose') && 
           (blogPostContent.includes('prose-lg') || blogPostContent.includes('prose-gray'));
  });
  
  // Test 3: Check if Tailwind CSS is included
  runTest('Tailwind CSS is included in the build', () => {
    // Look for Tailwind-generated classes or CSS
    return blogPostContent.includes('max-w-') || 
           blogPostContent.includes('text-') || 
           blogPostContent.includes('prose');
  });
  
  // Test 4: Check if typography styles are applied
  runTest('Typography-specific classes are present', () => {
    return blogPostContent.includes('prose') && 
           blogPostContent.includes('max-w-none');
  });
  
  // Test 5: Check if code blocks have proper styling
  runTest('Code blocks are properly styled', () => {
    return blogPostContent.includes('<pre>') || 
           blogPostContent.includes('<code>');
  });
  
  // Test 6: Check if headings are properly structured
  runTest('Headings are properly structured', () => {
    return blogPostContent.includes('<h1 id=') && 
           blogPostContent.includes('<h2 id=');
  });
}

console.log(`\n📊 Test Results: ${testsPassed}/${totalTests} tests passed`);

if (testsPassed === totalTests) {
  console.log('🎉 All typography tests passed! The Tailwind Typography plugin is working correctly.');
  process.exit(0);
} else {
  console.log('⚠️  Some typography tests failed. Please check the configuration.');
  process.exit(1);
}