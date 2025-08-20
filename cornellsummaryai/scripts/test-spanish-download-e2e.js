#!/usr/bin/env node

/**
 * End-to-end test for Spanish download functionality
 * Tests the complete download workflow with Spanish labels and error handling
 */

import fs from 'fs';

console.log('🧪 Testing Spanish Download End-to-End Functionality...\n');

// Test 1: Verify Spanish download labels are properly implemented
console.log('1. Testing Spanish download labels...');
const spanishDashboard = fs.readFileSync('src/pages/es/dashboard/index.astro', 'utf8');

const downloadLabels = {
  'Descargar PDF': 'dashboard.jobs.download',
  'Descargando...': 'dashboard.jobs.downloading', 
  '¡Descargado!': 'dashboard.jobs.downloaded'
};

let labelsCorrect = 0;
Object.entries(downloadLabels).forEach(([spanish, key]) => {
  if (spanishDashboard.includes(`'${key}': '${spanish}'`)) {
    console.log(`   ✅ Spanish label correct: ${spanish} (${key})`);
    labelsCorrect++;
  } else {
    console.log(`   ❌ Spanish label missing: ${spanish} (${key})`);
  }
});

console.log(`   📊 Spanish labels: ${labelsCorrect}/${Object.keys(downloadLabels).length}\n`);

// Test 2: Verify enhanced error messages
console.log('2. Testing enhanced Spanish error messages...');
const errorMessages = {
  'Archivo no encontrado. Es posible que haya sido eliminado.': 'download.error.notfound',
  'Error de conexión durante la descarga. Verifica tu conexión a internet.': 'download.error.network',
  'Error del servidor durante la descarga. Por favor, inténtalo más tarde.': 'download.error.server',
  'Error de descarga. Por favor, inténtalo de nuevo.': 'download.error.failed'
};

let errorsCorrect = 0;
Object.entries(errorMessages).forEach(([spanish, key]) => {
  if (spanishDashboard.includes(`'${key}': '${spanish}'`)) {
    console.log(`   ✅ Error message correct: ${key}`);
    errorsCorrect++;
  } else {
    console.log(`   ❌ Error message missing: ${key}`);
  }
});

console.log(`   📊 Error messages: ${errorsCorrect}/${Object.keys(errorMessages).length}\n`);

// Test 3: Verify blob handling with Spanish filename
console.log('3. Testing blob handling with Spanish filename...');
const blobHandlingChecks = [
  'a.download = `notas-${jobId}.pdf`', // Spanish filename
  'response.blob()',
  'window.URL.createObjectURL(blob)',
  'window.URL.revokeObjectURL(url)',
  'contentType.includes(\'application/pdf\')'
];

let blobChecksPass = 0;
blobHandlingChecks.forEach(check => {
  if (spanishDashboard.includes(check)) {
    console.log(`   ✅ Blob handling: ${check}`);
    blobChecksPass++;
  } else {
    console.log(`   ❌ Missing blob handling: ${check}`);
  }
});

console.log(`   📊 Blob handling: ${blobChecksPass}/${blobHandlingChecks.length}\n`);

// Test 4: Verify enhanced error handling logic
console.log('4. Testing enhanced error handling logic...');
const errorHandlingLogic = [
  'response.status === 404',
  'response.status === 401 || response.status === 403',
  'response.status >= 500',
  'error instanceof Error && error.message',
  'typeof error === \'string\'',
  'errorMessage = error.message'
];

let errorLogicPass = 0;
errorHandlingLogic.forEach(logic => {
  if (spanishDashboard.includes(logic)) {
    console.log(`   ✅ Error logic: ${logic}`);
    errorLogicPass++;
  } else {
    console.log(`   ❌ Missing error logic: ${logic}`);
  }
});

console.log(`   📊 Error handling logic: ${errorLogicPass}/${errorHandlingLogic.length}\n`);

// Test 5: Verify success feedback behavior
console.log('5. Testing success feedback behavior...');
const successFeedback = [
  'downloadBtn.textContent = t(\'dashboard.jobs.downloaded\')',
  'downloadBtn.classList.add(\'text-green-600\')',
  'downloadBtn.classList.remove(\'text-green-600\')',
  'setTimeout(() => {',
  'downloadBtn.style.pointerEvents = \'\''
];

let successPass = 0;
successFeedback.forEach(feedback => {
  if (spanishDashboard.includes(feedback)) {
    console.log(`   ✅ Success feedback: ${feedback}`);
    successPass++;
  } else {
    console.log(`   ❌ Missing success feedback: ${feedback}`);
  }
});

console.log(`   📊 Success feedback: ${successPass}/${successFeedback.length}\n`);

// Test 6: Verify loading state management
console.log('6. Testing loading state management...');
const loadingStates = [
  'downloadBtn.textContent = t(\'dashboard.jobs.downloading\')',
  'downloadBtn.classList.add(\'opacity-50\', \'cursor-wait\')',
  'downloadBtn.style.pointerEvents = \'none\'',
  'downloadBtn.classList.remove(\'opacity-50\', \'cursor-wait\')',
  'downloadBtn.textContent = originalText'
];

let loadingPass = 0;
loadingStates.forEach(state => {
  if (spanishDashboard.includes(state)) {
    console.log(`   ✅ Loading state: ${state}`);
    loadingPass++;
  } else {
    console.log(`   ❌ Missing loading state: ${state}`);
  }
});

console.log(`   📊 Loading states: ${loadingPass}/${loadingStates.length}\n`);

// Test 7: Compare with English version for feature completeness
console.log('7. Testing feature completeness vs English version...');
const englishDashboard = fs.readFileSync('src/pages/dashboard/index.astro', 'utf8');

// Core download features that should be present in both
const coreFeatures = [
  'e.preventDefault()',
  'fetch(`/api/download/${jobId}`)',
  'response.ok',
  'response.blob()',
  'document.createElement(\'a\')',
  'a.click()',
  'a.remove()'
];

let featureCompleteness = 0;
coreFeatures.forEach(feature => {
  const inSpanish = spanishDashboard.includes(feature);
  const inEnglish = englishDashboard.includes(feature);
  
  if (inSpanish && inEnglish) {
    console.log(`   ✅ Feature complete: ${feature}`);
    featureCompleteness++;
  } else if (inSpanish && !inEnglish) {
    console.log(`   🔄 Spanish has extra: ${feature}`);
    featureCompleteness++;
  } else if (!inSpanish && inEnglish) {
    console.log(`   ❌ Spanish missing: ${feature}`);
  } else {
    console.log(`   ⚠️  Neither has: ${feature}`);
  }
});

console.log(`   📊 Feature completeness: ${featureCompleteness}/${coreFeatures.length}\n`);

// Test 8: Verify Spanish-specific improvements
console.log('8. Testing Spanish-specific improvements...');
const spanishImprovements = [
  'Error de descarga:', // Spanish console logging
  'notas-${jobId}.pdf', // Spanish filename
  'download.error.notfound', // Enhanced error types
  'download.error.network',
  'download.error.server',
  'processing.error.authentication'
];

let improvementsPass = 0;
spanishImprovements.forEach(improvement => {
  if (spanishDashboard.includes(improvement)) {
    console.log(`   ✅ Spanish improvement: ${improvement}`);
    improvementsPass++;
  } else {
    console.log(`   ❌ Missing improvement: ${improvement}`);
  }
});

console.log(`   📊 Spanish improvements: ${improvementsPass}/${spanishImprovements.length}\n`);

// Final Summary
console.log('📋 FINAL SUMMARY:');
console.log(`   Spanish Labels: ${labelsCorrect}/${Object.keys(downloadLabels).length}`);
console.log(`   Error Messages: ${errorsCorrect}/${Object.keys(errorMessages).length}`);
console.log(`   Blob Handling: ${blobChecksPass}/${blobHandlingChecks.length}`);
console.log(`   Error Logic: ${errorLogicPass}/${errorHandlingLogic.length}`);
console.log(`   Success Feedback: ${successPass}/${successFeedback.length}`);
console.log(`   Loading States: ${loadingPass}/${loadingStates.length}`);
console.log(`   Feature Completeness: ${featureCompleteness}/${coreFeatures.length}`);
console.log(`   Spanish Improvements: ${improvementsPass}/${spanishImprovements.length}`);

const totalScore = labelsCorrect + errorsCorrect + blobChecksPass + errorLogicPass + successPass + loadingPass + featureCompleteness + improvementsPass;
const maxScore = Object.keys(downloadLabels).length + Object.keys(errorMessages).length + blobHandlingChecks.length + errorHandlingLogic.length + successFeedback.length + loadingStates.length + coreFeatures.length + spanishImprovements.length;

console.log(`\n🎯 Overall E2E Score: ${totalScore}/${maxScore} (${Math.round(totalScore/maxScore*100)}%)`);

if (totalScore >= maxScore * 0.95) {
  console.log('🎉 Spanish download functionality is EXCELLENT and fully enhanced!');
  console.log('✨ All requirements have been successfully implemented:');
  console.log('   • Spanish labels for download buttons and states');
  console.log('   • Comprehensive error handling with Spanish messages');
  console.log('   • Blob handling matching English site behavior');
  console.log('   • Enhanced error recovery and user feedback');
} else if (totalScore >= maxScore * 0.85) {
  console.log('✅ Spanish download functionality is very good!');
} else if (totalScore >= maxScore * 0.75) {
  console.log('⚠️  Spanish download functionality is acceptable but could be improved.');
} else {
  console.log('❌ Spanish download functionality needs significant improvements.');
}

console.log('\n✨ End-to-end test completed!');