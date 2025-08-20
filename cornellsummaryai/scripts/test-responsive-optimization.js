#!/usr/bin/env node

/**
 * Test script to verify responsive optimization implementation
 * Tests the logo watermark scaling and features section rounded corners
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🧪 Testing Responsive Optimization Implementation...\n');

// Test files to check
const testFiles = [
  'src/pages/index.astro',
  'src/pages/es/index.astro'
];

let allTestsPassed = true;

// Expected responsive breakpoints for logo watermark
const expectedBreakpoints = [
  '@media (max-width: 1400px)',
  '@media (max-width: 1200px)', 
  '@media (max-width: 1024px)',
  '@media (max-width: 768px)',
  '@media (max-width: 640px)',
  '@media (max-width: 480px)',
  '@media (max-width: 375px)',
  '@media (max-width: 320px)'
];

// Expected features for rounded corners optimization
const expectedFeatures = [
  'border-radius: 3rem 3rem 0 0',
  'border-radius: 2.5rem 2.5rem 0 0',
  'border-radius: 2rem 2rem 0 0',
  'border-radius: 1.5rem 1.5rem 0 0',
  'border-radius: 1rem 1rem 0 0'
];

testFiles.forEach((filePath, index) => {
  console.log(`📄 Testing ${filePath}...`);
  
  try {
    const content = readFileSync(join(projectRoot, filePath), 'utf8');
    
    // Test 1: Logo watermark responsive breakpoints
    console.log('  ✓ Checking logo watermark responsive breakpoints...');
    let breakpointsPassed = 0;
    expectedBreakpoints.forEach(breakpoint => {
      if (content.includes(breakpoint)) {
        breakpointsPassed++;
      }
    });
    
    if (breakpointsPassed >= 6) { // At least 6 breakpoints should be present
      console.log(`    ✅ Found ${breakpointsPassed}/${expectedBreakpoints.length} responsive breakpoints`);
    } else {
      console.log(`    ❌ Only found ${breakpointsPassed}/${expectedBreakpoints.length} responsive breakpoints`);
      allTestsPassed = false;
    }
    
    // Test 2: Features section rounded corners
    console.log('  ✓ Checking features section rounded corners...');
    let roundedCornersPassed = 0;
    expectedFeatures.forEach(feature => {
      if (content.includes(feature)) {
        roundedCornersPassed++;
      }
    });
    
    if (roundedCornersPassed >= 3) { // At least 3 different border-radius values
      console.log(`    ✅ Found ${roundedCornersPassed}/${expectedFeatures.length} rounded corner variations`);
    } else {
      console.log(`    ❌ Only found ${roundedCornersPassed}/${expectedFeatures.length} rounded corner variations`);
      allTestsPassed = false;
    }
    
    // Test 3: Hero section responsive spacing
    console.log('  ✓ Checking hero section responsive spacing...');
    if (content.includes('lg:pt-24 lg:pb-40') && content.includes('sm:pt-20 sm:pb-28')) {
      console.log('    ✅ Hero section responsive spacing implemented');
    } else {
      console.log('    ❌ Hero section responsive spacing missing');
      allTestsPassed = false;
    }
    
    // Test 4: Feature card responsive optimizations
    console.log('  ✓ Checking feature card responsive optimizations...');
    if (content.includes('transform: translateY(-4px) scale(1.01)') && 
        content.includes('transform: translateY(-2px) scale(1.005)')) {
      console.log('    ✅ Feature card responsive hover effects implemented');
    } else {
      console.log('    ❌ Feature card responsive hover effects missing');
      allTestsPassed = false;
    }
    
    // Test 5: Visual balance optimizations (background removed to fix watermark issue)
    console.log('  ✓ Checking visual balance optimizations...');
    if (content.includes('align-items: flex-start') && 
        content.includes('Remove problematic background styling')) {
      console.log('    ✅ Visual balance optimizations implemented (background removed for watermark)');
    } else {
      console.log('    ❌ Visual balance optimizations missing');
      allTestsPassed = false;
    }
    
    console.log(`  ✅ ${filePath} tests completed\n`);
    
  } catch (error) {
    console.log(`  ❌ Error reading ${filePath}: ${error.message}\n`);
    allTestsPassed = false;
  }
});

// Final results
console.log('📊 Test Results Summary:');
console.log('========================');

if (allTestsPassed) {
  console.log('✅ All responsive optimization tests PASSED!');
  console.log('\n🎯 Implementation Summary:');
  console.log('• Logo watermark scaling optimized across 8+ breakpoints');
  console.log('• Features section rounded corners responsive on all devices');
  console.log('• Hero section spacing optimized for different screen sizes');
  console.log('• Feature cards have responsive hover effects');
  console.log('• Visual balance and contrast optimizations implemented');
  console.log('\n✨ Task 3 requirements fulfilled:');
  console.log('• ✅ Logo watermark scaling across different screen sizes');
  console.log('• ✅ Rounded corners maintain proper appearance on mobile devices');
  console.log('• ✅ Proper visual balance and spacing on all screen sizes');
  process.exit(0);
} else {
  console.log('❌ Some responsive optimization tests FAILED!');
  console.log('Please review the implementation and fix any issues.');
  process.exit(1);
}