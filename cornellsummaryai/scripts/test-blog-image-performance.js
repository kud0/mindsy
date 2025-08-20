#!/usr/bin/env node

/**
 * Test script for blog image performance and optimization
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🖼️  Testing Blog Image Performance...\n');

// Test 1: Check image directory structure
console.log('1. Checking image directory structure...');
const imageDirectories = [
  'public/images/blog',
  'public/images/blog/content',
  'public/images/blog/heroes'
];

let structureScore = 0;
imageDirectories.forEach(dir => {
  const fullPath = join(projectRoot, dir);
  if (existsSync(fullPath)) {
    console.log(`   ✅ ${dir} exists`);
    structureScore++;
  } else {
    console.log(`   ❌ ${dir} missing`);
  }
});

console.log(`   Score: ${structureScore}/${imageDirectories.length}\n`);

// Test 2: Check BlogImage component exists and has required features
console.log('2. Checking BlogImage component...');
const blogImagePath = join(projectRoot, 'src/components/BlogImage.astro');
let componentScore = 0;

if (existsSync(blogImagePath)) {
  const componentContent = readFileSync(blogImagePath, 'utf-8');
  
  const features = [
    { name: 'Image component import', pattern: /import.*Image.*from.*astro:assets/ },
    { name: 'Alt text validation', pattern: /validateAltText/ },
    { name: 'Responsive sizes', pattern: /sizes/ },
    { name: 'Lazy loading', pattern: /loading/ },
    { name: 'Caption support', pattern: /figcaption/ },
    { name: 'Accessibility attributes', pattern: /role="img"/ }
  ];
  
  features.forEach(feature => {
    if (feature.pattern.test(componentContent)) {
      console.log(`   ✅ ${feature.name}`);
      componentScore++;
    } else {
      console.log(`   ❌ ${feature.name} missing`);
    }
  });
} else {
  console.log('   ❌ BlogImage component not found');
}

console.log(`   Score: ${componentScore}/6\n`);

// Test 3: Check image utilities
console.log('3. Checking image utilities...');
const imageUtilsPath = join(projectRoot, 'src/lib/image-utils.ts');
let utilsScore = 0;

if (existsSync(imageUtilsPath)) {
  const utilsContent = readFileSync(imageUtilsPath, 'utf-8');
  
  const utilities = [
    { name: 'Alt text validation', pattern: /validateAltText/ },
    { name: 'Responsive sizes generation', pattern: /generateResponsiveSizes/ },
    { name: 'Image format optimization', pattern: /getOptimalImageFormat/ },
    { name: 'Metadata extraction', pattern: /extractImageMetadata/ },
    { name: 'Fallback alt text', pattern: /generateFallbackAltText/ }
  ];
  
  utilities.forEach(utility => {
    if (utility.pattern.test(utilsContent)) {
      console.log(`   ✅ ${utility.name}`);
      utilsScore++;
    } else {
      console.log(`   ❌ ${utility.name} missing`);
    }
  });
} else {
  console.log('   ❌ Image utilities not found');
}

console.log(`   Score: ${utilsScore}/5\n`);

// Test 4: Check Astro config for image optimization
console.log('4. Checking Astro configuration...');
const astroConfigPath = join(projectRoot, 'astro.config.mjs');
let configScore = 0;

if (existsSync(astroConfigPath)) {
  const configContent = readFileSync(astroConfigPath, 'utf-8');
  
  const configFeatures = [
    { name: 'Image configuration', pattern: /image:\s*{/ },
    { name: 'Markdown configuration', pattern: /markdown:\s*{/ },
    { name: 'Remark plugins', pattern: /remarkPlugins/ }
  ];
  
  configFeatures.forEach(feature => {
    if (feature.pattern.test(configContent)) {
      console.log(`   ✅ ${feature.name}`);
      configScore++;
    } else {
      console.log(`   ❌ ${feature.name} missing`);
    }
  });
} else {
  console.log('   ❌ Astro config not found');
}

console.log(`   Score: ${configScore}/3\n`);

// Test 5: Check remark plugin
console.log('5. Checking remark plugin...');
const remarkPluginPath = join(projectRoot, 'src/lib/remark-blog-images.ts');
let remarkScore = 0;

if (existsSync(remarkPluginPath)) {
  const remarkContent = readFileSync(remarkPluginPath, 'utf-8');
  
  const remarkFeatures = [
    { name: 'Visit function import', pattern: /import.*visit.*from.*unist-util-visit/ },
    { name: 'Image node processing', pattern: /visit.*image/ },
    { name: 'Alt text enhancement', pattern: /node\.alt/ },
    { name: 'URL normalization', pattern: /node\.url/ }
  ];
  
  remarkFeatures.forEach(feature => {
    if (feature.pattern.test(remarkContent)) {
      console.log(`   ✅ ${feature.name}`);
      remarkScore++;
    } else {
      console.log(`   ❌ ${feature.name} missing`);
    }
  });
} else {
  console.log('   ❌ Remark plugin not found');
}

console.log(`   Score: ${remarkScore}/4\n`);

// Calculate overall score
const totalScore = structureScore + componentScore + utilsScore + configScore + remarkScore;
const maxScore = 3 + 6 + 5 + 3 + 4; // 21 total points
const percentage = Math.round((totalScore / maxScore) * 100);

console.log('📊 Overall Results:');
console.log(`   Total Score: ${totalScore}/${maxScore} (${percentage}%)`);

if (percentage >= 90) {
  console.log('   🎉 Excellent! Blog image handling is fully implemented.');
} else if (percentage >= 70) {
  console.log('   ✅ Good! Most image handling features are implemented.');
} else if (percentage >= 50) {
  console.log('   ⚠️  Fair. Some image handling features need attention.');
} else {
  console.log('   ❌ Poor. Blog image handling needs significant work.');
}

console.log('\n🔍 Performance Recommendations:');
console.log('   • Use WebP format for better compression');
console.log('   • Implement lazy loading for images below the fold');
console.log('   • Use responsive images with appropriate sizes');
console.log('   • Optimize alt text for accessibility');
console.log('   • Consider using Astro\'s Image component for automatic optimization');

process.exit(percentage >= 70 ? 0 : 1);