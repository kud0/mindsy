#!/usr/bin/env node

/**
 * Test script for Spanish site download functionality
 * Tests download button behavior, error handling, and Spanish translations
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧪 Testing Spanish Download Functionality...\n');

// Test 1: Verify Spanish translations are present
console.log('1. Checking Spanish download translations...');
const spanishDashboard = fs.readFileSync('src/pages/es/dashboard/index.astro', 'utf8');

const requiredTranslations = [
  'dashboard.jobs.download',
  'dashboard.jobs.downloading', 
  'dashboard.jobs.downloaded',
  'download.error.notfound',
  'download.error.network',
  'download.error.server',
  'download.error.failed',
  'processing.error.authentication'
];

let translationsFound = 0;
requiredTranslations.forEach(key => {
  if (spanishDashboard.includes(`'${key}':`)) {
    console.log(`   ✅ Found translation: ${key}`);
    translationsFound++;
  } else {
    console.log(`   ❌ Missing translation: ${key}`);
  }
});

console.log(`   📊 Translations found: ${translationsFound}/${requiredTranslations.length}\n`);

// Test 2: Verify download button uses Spanish translations
console.log('2. Checking download button implementation...');
const downloadBtnUsage = [
  "t('dashboard.jobs.download')",
  "t('dashboard.jobs.downloading')",
  "t('dashboard.jobs.downloaded')"
];

let usageFound = 0;
downloadBtnUsage.forEach(usage => {
  if (spanishDashboard.includes(usage)) {
    console.log(`   ✅ Found usage: ${usage}`);
    usageFound++;
  } else {
    console.log(`   ❌ Missing usage: ${usage}`);
  }
});

console.log(`   📊 Translation usage found: ${usageFound}/${downloadBtnUsage.length}\n`);

// Test 3: Verify enhanced error handling
console.log('3. Checking enhanced error handling...');
const errorHandlingFeatures = [
  'response.status === 404',
  'response.status === 401',
  'response.status >= 500',
  'download.error.notfound',
  'download.error.server',
  'processing.error.authentication'
];

let errorFeaturesFound = 0;
errorHandlingFeatures.forEach(feature => {
  if (spanishDashboard.includes(feature)) {
    console.log(`   ✅ Found error handling: ${feature}`);
    errorFeaturesFound++;
  } else {
    console.log(`   ❌ Missing error handling: ${feature}`);
  }
});

console.log(`   📊 Error handling features found: ${errorFeaturesFound}/${errorHandlingFeatures.length}\n`);

// Test 4: Verify blob handling matches English version
console.log('4. Checking blob handling implementation...');
const blobFeatures = [
  'response.blob()',
  'window.URL.createObjectURL(blob)',
  'a.download = `notas-${jobId}.pdf`',
  'window.URL.revokeObjectURL(url)',
  'application/pdf'
];

let blobFeaturesFound = 0;
blobFeatures.forEach(feature => {
  if (spanishDashboard.includes(feature)) {
    console.log(`   ✅ Found blob handling: ${feature}`);
    blobFeaturesFound++;
  } else {
    console.log(`   ❌ Missing blob handling: ${feature}`);
  }
});

console.log(`   📊 Blob handling features found: ${blobFeaturesFound}/${blobFeatures.length}\n`);

// Test 5: Verify success feedback implementation
console.log('5. Checking success feedback implementation...');
const successFeatures = [
  'text-green-600',
  'setTimeout(() => {',
  'downloadBtn.textContent = originalText',
  'downloadBtn.style.pointerEvents = \'\''
];

let successFeaturesFound = 0;
successFeatures.forEach(feature => {
  if (spanishDashboard.includes(feature)) {
    console.log(`   ✅ Found success feedback: ${feature}`);
    successFeaturesFound++;
  } else {
    console.log(`   ❌ Missing success feedback: ${feature}`);
  }
});

console.log(`   📊 Success feedback features found: ${successFeaturesFound}/${successFeatures.length}\n`);

// Test 6: Compare with English version for feature parity
console.log('6. Comparing with English version for feature parity...');
const englishDashboard = fs.readFileSync('src/pages/dashboard/index.astro', 'utf8');

// Extract download functionality from both versions
const extractDownloadFunction = (content) => {
  const start = content.indexOf('// Handle download button clicks');
  const end = content.indexOf('// Refresh jobs every 10 seconds');
  return start !== -1 && end !== -1 ? content.substring(start, end) : '';
};

const spanishDownloadCode = extractDownloadFunction(spanishDashboard);
const englishDownloadCode = extractDownloadFunction(englishDashboard);

const coreFeatures = [
  'preventDefault()',
  'opacity-50',
  'cursor-wait',
  'pointerEvents = \'none\'',
  'fetch(`/api/download/${jobId}`)',
  'response.blob()',
  'createObjectURL',
  'text-red-600'
];

let parityScore = 0;
coreFeatures.forEach(feature => {
  const inSpanish = spanishDownloadCode.includes(feature);
  const inEnglish = englishDownloadCode.includes(feature);
  
  if (inSpanish && inEnglish) {
    console.log(`   ✅ Feature parity: ${feature}`);
    parityScore++;
  } else if (inSpanish && !inEnglish) {
    console.log(`   🔄 Spanish has extra: ${feature}`);
    parityScore++;
  } else if (!inSpanish && inEnglish) {
    console.log(`   ❌ Spanish missing: ${feature}`);
  } else {
    console.log(`   ⚠️  Neither has: ${feature}`);
  }
});

console.log(`   📊 Feature parity score: ${parityScore}/${coreFeatures.length}\n`);

// Test 7: Verify Spanish-specific enhancements
console.log('7. Checking Spanish-specific enhancements...');
const spanishEnhancements = [
  'notas-${jobId}.pdf', // Spanish filename
  'Error de descarga:', // Spanish console log
  'error instanceof Error && error.message', // Enhanced error message handling
  'typeof error === \'string\'', // String error handling
  'errorMessage = error.message' // Specific error message usage
];

let enhancementsFound = 0;
spanishEnhancements.forEach(enhancement => {
  if (spanishDashboard.includes(enhancement)) {
    console.log(`   ✅ Found Spanish enhancement: ${enhancement}`);
    enhancementsFound++;
  } else {
    console.log(`   ❌ Missing Spanish enhancement: ${enhancement}`);
  }
});

console.log(`   📊 Spanish enhancements found: ${enhancementsFound}/${spanishEnhancements.length}\n`);

// Summary
console.log('📋 SUMMARY:');
console.log(`   Translations: ${translationsFound}/${requiredTranslations.length}`);
console.log(`   Translation Usage: ${usageFound}/${downloadBtnUsage.length}`);
console.log(`   Error Handling: ${errorFeaturesFound}/${errorHandlingFeatures.length}`);
console.log(`   Blob Handling: ${blobFeaturesFound}/${blobFeatures.length}`);
console.log(`   Success Feedback: ${successFeaturesFound}/${successFeatures.length}`);
console.log(`   Feature Parity: ${parityScore}/${coreFeatures.length}`);
console.log(`   Spanish Enhancements: ${enhancementsFound}/${spanishEnhancements.length}`);

const totalScore = translationsFound + usageFound + errorFeaturesFound + blobFeaturesFound + successFeaturesFound + parityScore + enhancementsFound;
const maxScore = requiredTranslations.length + downloadBtnUsage.length + errorHandlingFeatures.length + blobFeatures.length + successFeatures.length + coreFeatures.length + spanishEnhancements.length;

console.log(`\n🎯 Overall Score: ${totalScore}/${maxScore} (${Math.round(totalScore/maxScore*100)}%)`);

if (totalScore >= maxScore * 0.9) {
  console.log('🎉 Spanish download functionality is excellent!');
} else if (totalScore >= maxScore * 0.8) {
  console.log('✅ Spanish download functionality is good!');
} else if (totalScore >= maxScore * 0.7) {
  console.log('⚠️  Spanish download functionality needs some improvements.');
} else {
  console.log('❌ Spanish download functionality needs significant improvements.');
}

console.log('\n✨ Test completed!');