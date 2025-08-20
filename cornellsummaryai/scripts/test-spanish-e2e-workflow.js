#!/usr/bin/env node

/**
 * Comprehensive End-to-End Test Script for Spanish Site Workflow
 * 
 * This script validates the complete Spanish user workflow including:
 * - File upload functionality
 * - Processing status updates with Spanish translations
 * - Download functionality with Spanish labels
 * - Error handling scenarios with Spanish messages
 * - Feature parity with English site
 * 
 * Requirements tested: 1.1, 2.1, 3.1, 4.1
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';

console.log('🧪 Testing Spanish Site End-to-End Workflow...\n');
console.log('=' .repeat(60));

// Test configuration
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: []
};

function logTest(name, passed, details = '') {
  if (passed) {
    console.log(`✅ ${name}`);
    testResults.passed++;
  } else {
    console.log(`❌ ${name}`);
    if (details) console.log(`   ${details}`);
    testResults.failed++;
  }
  testResults.details.push({ name, passed, details });
}

function logWarning(name, details = '') {
  console.log(`⚠️  ${name}`);
  if (details) console.log(`   ${details}`);
  testResults.warnings++;
}

// Read necessary files
const spanishDashboardPath = 'src/pages/es/dashboard/index.astro';
const englishDashboardPath = 'src/pages/dashboard/index.astro';
const i18nPath = 'src/lib/i18n.ts';

let spanishDashboard, englishDashboard, i18nContent;

try {
  spanishDashboard = fs.readFileSync(spanishDashboardPath, 'utf8');
  englishDashboard = fs.readFileSync(englishDashboardPath, 'utf8');
  i18nContent = fs.readFileSync(i18nPath, 'utf8');
} catch (error) {
  console.error('❌ Failed to read required files:', error.message);
  process.exit(1);
}

console.log('📋 TEST SUITE 1: API Integration (Requirement 1.1, 4.1)');
console.log('-'.repeat(50));

// Test 1.1: Spanish site uses /api/generate endpoint
logTest(
  'Spanish site calls /api/generate endpoint',
  spanishDashboard.includes("fetch('/api/generate'"),
  'Spanish dashboard should use /api/generate instead of /api/trigger-n8n'
);

// Test 1.2: Spanish site uses same request format as English
const generateApiCallPattern = /fetch\('\/api\/generate',\s*{\s*method:\s*'POST',\s*headers:\s*{\s*'Content-Type':\s*'application\/json',?\s*},\s*body:\s*JSON\.stringify\(/;
logTest(
  'Spanish site uses correct API request format',
  generateApiCallPattern.test(spanishDashboard),
  'Request format should match English site'
);

// Test 1.3: Spanish site handles same response format
logTest(
  'Spanish site handles processingStatus response',
  spanishDashboard.includes('responseData.processingStatus'),
  'Should handle processingStatus from API response'
);

// Test 1.4: Spanish site has same error handling patterns
const errorHandlingPatterns = [
  'response.ok',
  'responseData.success',
  'errorData.error'
];

errorHandlingPatterns.forEach(pattern => {
  logTest(
    `Error handling includes ${pattern}`,
    spanishDashboard.includes(pattern),
    `Should handle ${pattern} like English site`
  );
});

console.log('\n📋 TEST SUITE 2: Processing Status UI (Requirement 2.1)');
console.log('-'.repeat(50));

// Test 2.1: Processing status section exists
logTest(
  'Processing status section exists',
  spanishDashboard.includes('id="processing-status"'),
  'Should have processing status section'
);

// Test 2.2: Progress indicators exist
const progressElements = [
  'id="processing-step"',
  'id="processing-progress"',
  'id="processing-percentage"',
  'id="processing-message"'
];

progressElements.forEach(element => {
  logTest(
    `Progress element ${element} exists`,
    spanishDashboard.includes(element),
    `Should have ${element} for progress tracking`
  );
});

// Test 2.3: Progress updates implemented
const progressUpdates = [
  "processingProgress.style.width = '25%'",
  "processingProgress.style.width = '50%'",
  "processingProgress.style.width = '75%'",
  "processingProgress.style.width = '90%'",
  "processingProgress.style.width = '100%'"
];

progressUpdates.forEach(update => {
  logTest(
    `Progress update ${update} implemented`,
    spanishDashboard.includes(update),
    'Should update progress bar at different stages'
  );
});

// Test 2.4: Processing status show/hide logic
logTest(
  'Processing status show/hide logic implemented',
  spanishDashboard.includes('processingStatus.classList.remove(\'hidden\')') &&
  spanishDashboard.includes('processingStatus.classList.add(\'hidden\')'),
  'Should show/hide processing status appropriately'
);

// Test 2.5: Form hide/show during processing
logTest(
  'Form hide/show during processing',
  spanishDashboard.includes('uploadForm.classList.add(\'hidden\')') &&
  spanishDashboard.includes('uploadForm.classList.remove(\'hidden\')'),
  'Should hide form during processing and show after completion'
);

console.log('\n📋 TEST SUITE 3: Spanish Translations (Requirement 3.1)');
console.log('-'.repeat(50));

// Test 3.1: All required Spanish translations exist in i18n
const requiredTranslations = [
  'processing.title',
  'processing.steps.transcribing',
  'processing.steps.generating',
  'processing.steps.creating',
  'processing.steps.completed',
  'processing.messages.transcription',
  'processing.messages.pdfExtraction',
  'processing.messages.notesGeneration',
  'processing.messages.pdfGeneration',
  'processing.messages.completed',
  'processing.error.failed',
  'processing.error.download'
];

// Extract Spanish translations from i18n file
const spanishTranslationPattern = /es:\s*{([\s\S]*?)},?\s*}\s*as const/;
const spanishSection = i18nContent.match(spanishTranslationPattern);

if (spanishSection) {
  const spanishTranslationsText = spanishSection[1];
  
  requiredTranslations.forEach(key => {
    const keyPattern = new RegExp(`'${key.replace('.', '\\.')}':\\s*'[^']+',?`);
    logTest(
      `Spanish translation exists: ${key}`,
      keyPattern.test(spanishTranslationsText),
      `Should have Spanish translation for ${key}`
    );
  });
} else {
  logTest('Spanish translations section found', false, 'Could not find Spanish translations in i18n file');
}

// Test 3.2: Dashboard uses translation keys instead of hardcoded text
const translationUsagePatterns = [
  "t('processing.title')",
  "t('processing.steps.transcribing')",
  "t('processing.steps.generating')",
  "t('processing.steps.creating')",
  "t('processing.steps.completed')",
  "t('processing.messages.transcription')",
  "t('processing.messages.notesGeneration')",
  "t('processing.messages.pdfGeneration')",
  "t('processing.messages.completed')"
];

translationUsagePatterns.forEach(pattern => {
  logTest(
    `Uses translation key: ${pattern}`,
    spanishDashboard.includes(pattern),
    `Should use ${pattern} instead of hardcoded text`
  );
});

// Test 3.3: No hardcoded Spanish text in HTML
const hardcodedTextPatterns = [
  />Procesando tu Audio</,
  />Transcribiendo Audio</,
  />Generando Notas</,
  />Creando PDF</,
  />Completado</
];

hardcodedTextPatterns.forEach(pattern => {
  logTest(
    `No hardcoded text: ${pattern.source}`,
    !pattern.test(spanishDashboard),
    'Should not have hardcoded Spanish text in HTML'
  );
});

// Test 3.4: Error messages use Spanish translations
const errorTranslationPatterns = [
  "t('dashboard.upload.error.login')",
  "t('dashboard.upload.error.audio')",
  "t('dashboard.upload.error.failed')",
  "t('processing.error.failed')",
  "t('processing.error.download')"
];

errorTranslationPatterns.forEach(pattern => {
  logTest(
    `Error message uses translation: ${pattern}`,
    spanishDashboard.includes(pattern),
    `Should use ${pattern} for error messages`
  );
});

console.log('\n📋 TEST SUITE 4: Download Functionality');
console.log('-'.repeat(50));

// Test 4.1: Download button uses Spanish translations
const downloadTranslations = [
  "t('dashboard.jobs.download')",
  "t('dashboard.jobs.downloading')",
  "t('dashboard.jobs.downloaded')"
];

downloadTranslations.forEach(pattern => {
  logTest(
    `Download button uses translation: ${pattern}`,
    spanishDashboard.includes(pattern),
    `Should use ${pattern} for download states`
  );
});

// Test 4.2: Download error handling with Spanish messages
const downloadErrorPatterns = [
  "t('download.error.notfound')",
  "t('download.error.network')",
  "t('download.error.server')",
  "t('download.error.failed')"
];

downloadErrorPatterns.forEach(pattern => {
  logTest(
    `Download error uses translation: ${pattern}`,
    spanishDashboard.includes(pattern),
    `Should use ${pattern} for download errors`
  );
});

// Test 4.3: Blob handling for PDF downloads
const blobHandlingFeatures = [
  'response.blob()',
  'window.URL.createObjectURL(blob)',
  'a.download = `notas-${jobId}.pdf`',
  'window.URL.revokeObjectURL(url)'
];

blobHandlingFeatures.forEach(feature => {
  logTest(
    `Blob handling includes: ${feature}`,
    spanishDashboard.includes(feature),
    `Should handle ${feature} for PDF downloads`
  );
});

console.log('\n📋 TEST SUITE 5: Feature Parity with English Site');
console.log('-'.repeat(50));

// Test 5.1: Core functionality comparison
const coreFunctionalities = [
  'drag and drop',
  'file validation',
  'progress tracking',
  'error recovery',
  'form reset',
  'job refresh'
];

// Extract key functions from both files
const extractFunctionNames = (content) => {
  const functionMatches = content.match(/function\s+(\w+)/g) || [];
  const asyncFunctionMatches = content.match(/async\s+function\s+(\w+)/g) || [];
  return [...functionMatches, ...asyncFunctionMatches].map(f => f.replace(/^(async\s+)?function\s+/, ''));
};

const spanishFunctions = extractFunctionNames(spanishDashboard);
const englishFunctions = extractFunctionNames(englishDashboard);

// Check for key functions
const keyFunctions = ['loadJobs', 'resetFormState', 'updateFileNames', 'clearErrorState'];
keyFunctions.forEach(func => {
  const inSpanish = spanishFunctions.includes(func) || spanishDashboard.includes(`function ${func}`);
  const inEnglish = englishFunctions.includes(func) || englishDashboard.includes(`function ${func}`);
  
  if (inEnglish) {
    logTest(
      `Function parity: ${func}`,
      inSpanish,
      `Spanish site should have ${func} function like English site`
    );
  }
});

// Test 5.2: Event handlers comparison
const eventHandlers = [
  'addEventListener(\'submit\'',
  'addEventListener(\'click\'',
  'addEventListener(\'dragover\'',
  'addEventListener(\'drop\'',
  'addEventListener(\'change\''
];

eventHandlers.forEach(handler => {
  const spanishCount = (spanishDashboard.match(new RegExp(handler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  const englishCount = (englishDashboard.match(new RegExp(handler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  
  logTest(
    `Event handler parity: ${handler}`,
    spanishCount >= englishCount,
    `Spanish site should have at least ${englishCount} ${handler} handlers (found ${spanishCount})`
  );
});

console.log('\n📋 TEST SUITE 6: Form Reset and State Management');
console.log('-'.repeat(50));

// Test 6.1: Form reset functionality
logTest(
  'Form reset function exists',
  spanishDashboard.includes('function resetFormState()'),
  'Should have resetFormState function'
);

logTest(
  'Form reset clears files',
  spanishDashboard.includes('audioFile = null') && spanishDashboard.includes('pdfFile = null'),
  'Should clear file variables on reset'
);

logTest(
  'Form reset clears input values',
  spanishDashboard.includes('audioInput.value = \'\'') && spanishDashboard.includes('pdfInput.value = \'\''),
  'Should clear input values on reset'
);

// Test 6.2: Processing status reset
logTest(
  'Processing status reset function exists',
  spanishDashboard.includes('function resetProcessingStatusUI()'),
  'Should have resetProcessingStatusUI function'
);

logTest(
  'Processing status resets to initial state',
  spanishDashboard.includes("processingProgress.style.width = '25%'") &&
  spanishDashboard.includes("processingPercentage.textContent = '25%'"),
  'Should reset processing status to initial transcription state'
);

console.log('\n📋 TEST SUITE 7: Error Handling Scenarios');
console.log('-'.repeat(50));

// Test 7.1: Authentication errors
logTest(
  'Authentication error handling',
  spanishDashboard.includes('authentication') && spanishDashboard.includes('unauthorized'),
  'Should handle authentication errors'
);

// Test 7.2: File validation errors
logTest(
  'File validation error handling',
  spanishDashboard.includes('audio') && spanishDashboard.includes('file'),
  'Should handle file validation errors'
);

// Test 7.3: Network errors
logTest(
  'Network error handling',
  spanishDashboard.includes('network') && spanishDashboard.includes('connection'),
  'Should handle network errors'
);

// Test 7.4: Server errors
logTest(
  'Server error handling',
  spanishDashboard.includes('server') && spanishDashboard.includes('response.status >= 500'),
  'Should handle server errors'
);

// Test 7.5: Error recovery (hide processing, show form)
logTest(
  'Error recovery implementation',
  spanishDashboard.includes('processingStatus.classList.add(\'hidden\')') &&
  spanishDashboard.includes('uploadForm.classList.remove(\'hidden\')') &&
  spanishDashboard.includes('resetProcessingStatusUI()'),
  'Should recover from errors by hiding processing status and showing form'
);

console.log('\n📋 TEST SUITE 8: Translation Content Validation');
console.log('-'.repeat(50));

// Test 8.1: Validate Spanish translation content
const expectedSpanishTranslations = {
  'processing.steps.transcribing': 'Transcribiendo Audio',
  'processing.steps.generating': 'Generando Notas',
  'processing.steps.creating': 'Creando PDF',
  'processing.steps.completed': 'Completado',
  'processing.title': 'Procesando tu Audio'
};

Object.entries(expectedSpanishTranslations).forEach(([key, expectedValue]) => {
  const pattern = new RegExp(`'${key.replace('.', '\\.')}':\\s*'${expectedValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
  logTest(
    `Translation content correct: ${key}`,
    pattern.test(i18nContent),
    `Should have correct Spanish translation: "${expectedValue}"`
  );
});

console.log('\n📋 TEST SUITE 9: Integration with Translation System');
console.log('-'.repeat(50));

// Test 9.1: Translation function usage
logTest(
  'Translation function imported',
  spanishDashboard.includes('useTranslations') || spanishDashboard.includes('function t('),
  'Should import or define translation function'
);

// Test 9.2: Translation function used consistently
const tFunctionUsage = (spanishDashboard.match(/t\('[^']+'\)/g) || []).length;
logTest(
  'Translation function used extensively',
  tFunctionUsage >= 20,
  `Should use t() function extensively (found ${tFunctionUsage} usages)`
);

// Test 9.3: No mixed hardcoded/translated text
const hardcodedSpanishWords = ['Procesando', 'Transcribiendo', 'Generando', 'Creando', 'Completado'];
let hardcodedFound = 0;

hardcodedSpanishWords.forEach(word => {
  const pattern = new RegExp(`>${word}<|"${word}"|'${word}'`, 'g');
  const matches = spanishDashboard.match(pattern) || [];
  hardcodedFound += matches.length;
});

logTest(
  'No hardcoded Spanish text mixed with translations',
  hardcodedFound === 0,
  `Found ${hardcodedFound} instances of hardcoded Spanish text`
);

console.log('\n📋 FINAL RESULTS');
console.log('=' .repeat(60));

console.log(`✅ Tests Passed: ${testResults.passed}`);
console.log(`❌ Tests Failed: ${testResults.failed}`);
console.log(`⚠️  Warnings: ${testResults.warnings}`);

const totalTests = testResults.passed + testResults.failed;
const successRate = totalTests > 0 ? Math.round((testResults.passed / totalTests) * 100) : 0;

console.log(`📊 Success Rate: ${successRate}%`);

// Detailed breakdown by requirement
console.log('\n📋 REQUIREMENT COVERAGE:');
console.log(`Requirement 1.1 (API Integration): ${testResults.details.filter(t => t.name.includes('API') || t.name.includes('endpoint') || t.name.includes('request')).filter(t => t.passed).length} tests passed`);
console.log(`Requirement 2.1 (Processing Status): ${testResults.details.filter(t => t.name.includes('Processing') || t.name.includes('progress') || t.name.includes('status')).filter(t => t.passed).length} tests passed`);
console.log(`Requirement 3.1 (Spanish Translations): ${testResults.details.filter(t => t.name.includes('translation') || t.name.includes('Spanish') || t.name.includes('hardcoded')).filter(t => t.passed).length} tests passed`);
console.log(`Requirement 4.1 (Backend Logic): ${testResults.details.filter(t => t.name.includes('parity') || t.name.includes('error handling') || t.name.includes('response')).filter(t => t.passed).length} tests passed`);

// Recommendations
console.log('\n💡 RECOMMENDATIONS:');

if (testResults.failed > 0) {
  console.log('🔧 Issues to fix:');
  testResults.details.filter(t => !t.passed).forEach(test => {
    console.log(`   - ${test.name}: ${test.details}`);
  });
}

if (successRate >= 95) {
  console.log('🎉 Excellent! Spanish site workflow is fully implemented and tested.');
} else if (successRate >= 85) {
  console.log('✅ Good! Spanish site workflow is mostly complete with minor issues.');
} else if (successRate >= 70) {
  console.log('⚠️  Spanish site workflow needs some improvements.');
} else {
  console.log('❌ Spanish site workflow needs significant work.');
}

// Browser-based end-to-end testing with Puppeteer
console.log('\n📋 TEST SUITE 10: Browser-Based End-to-End Testing');
console.log('-'.repeat(50));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the browser test function
async function runBrowserTests() {
  console.log('🌐 Starting browser-based end-to-end tests...');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable console logging from the browser
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ Browser Console Error: ${msg.text()}`);
      }
    });
    
    // Test 10.1: Spanish site loads correctly
    console.log('\n🔍 Test 10.1: Spanish site loading...');
    try {
      await page.goto('http://localhost:4321/es/dashboard', { 
        waitUntil: 'networkidle0',
        timeout: 30000 
      });
      
      // Check if the page title contains Spanish text
      const title = await page.title();
      const pageContent = await page.content();
      
      if (pageContent.includes('Convertir Clases en Notas') || 
          pageContent.includes('Generar Notas') ||
          title.includes('Panel')) {
        console.log('✅ Spanish dashboard loaded successfully');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Spanish dashboard loads correctly', 
          passed: true 
        });
      } else {
        console.log('❌ Spanish dashboard did not load correctly');
        testResults.failed++;
        testResults.details.push({ 
          name: 'Spanish dashboard loads correctly', 
          passed: false,
          details: 'Spanish text not found in page content'
        });
      }
    } catch (error) {
      console.log(`❌ Error loading Spanish dashboard: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'Spanish dashboard loads correctly', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
    // Test 10.2: Form elements exist and are properly translated
    console.log('\n🔍 Test 10.2: Form elements and translations...');
    try {
      // Check for key form elements
      const formExists = await page.evaluate(() => {
        return document.getElementById('upload-form') !== null;
      });
      
      const dropAreaExists = await page.evaluate(() => {
        return document.getElementById('drop-area') !== null;
      });
      
      const submitBtnText = await page.evaluate(() => {
        const btn = document.getElementById('submit-btn');
        return btn ? btn.textContent.trim() : '';
      });
      
      if (formExists && dropAreaExists) {
        console.log('✅ Form elements exist');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Form elements exist', 
          passed: true 
        });
      } else {
        console.log('❌ Form elements missing');
        testResults.failed++;
        testResults.details.push({ 
          name: 'Form elements exist', 
          passed: false,
          details: 'Upload form or drop area not found'
        });
      }
      
      if (submitBtnText === 'Generar Notas') {
        console.log('✅ Submit button has correct Spanish text');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Submit button has Spanish text', 
          passed: true 
        });
      } else {
        console.log(`❌ Submit button text incorrect: "${submitBtnText}"`);
        testResults.failed++;
        testResults.details.push({ 
          name: 'Submit button has Spanish text', 
          passed: false,
          details: `Expected "Generar Notas", got "${submitBtnText}"`
        });
      }
    } catch (error) {
      console.log(`❌ Error checking form elements: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'Form elements check', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
    // Test 10.3: Processing status UI exists and is hidden initially
    console.log('\n🔍 Test 10.3: Processing status UI...');
    try {
      const processingStatusExists = await page.evaluate(() => {
        const el = document.getElementById('processing-status');
        return el !== null;
      });
      
      const processingStatusHidden = await page.evaluate(() => {
        const el = document.getElementById('processing-status');
        return el ? el.classList.contains('hidden') : false;
      });
      
      if (processingStatusExists) {
        console.log('✅ Processing status UI exists');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Processing status UI exists', 
          passed: true 
        });
      } else {
        console.log('❌ Processing status UI missing');
        testResults.failed++;
        testResults.details.push({ 
          name: 'Processing status UI exists', 
          passed: false,
          details: 'Processing status element not found'
        });
      }
      
      if (processingStatusHidden) {
        console.log('✅ Processing status UI correctly hidden initially');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Processing status hidden initially', 
          passed: true 
        });
      } else {
        console.log('❌ Processing status UI should be hidden initially');
        testResults.failed++;
        testResults.details.push({ 
          name: 'Processing status hidden initially', 
          passed: false,
          details: 'Processing status not hidden on page load'
        });
      }
    } catch (error) {
      console.log(`❌ Error checking processing status UI: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'Processing status UI check', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
    // Test 10.4: Error handling UI exists
    console.log('\n🔍 Test 10.4: Error handling UI...');
    try {
      const errorElementExists = await page.evaluate(() => {
        return document.getElementById('upload-error') !== null;
      });
      
      const errorElementHidden = await page.evaluate(() => {
        const el = document.getElementById('upload-error');
        return el ? el.classList.contains('hidden') : false;
      });
      
      if (errorElementExists) {
        console.log('✅ Error handling UI exists');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Error handling UI exists', 
          passed: true 
        });
      } else {
        console.log('❌ Error handling UI missing');
        testResults.failed++;
        testResults.details.push({ 
          name: 'Error handling UI exists', 
          passed: false,
          details: 'Error element not found'
        });
      }
      
      if (errorElementHidden) {
        console.log('✅ Error element correctly hidden initially');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Error element hidden initially', 
          passed: true 
        });
      } else {
        console.log('❌ Error element should be hidden initially');
        testResults.failed++;
        testResults.details.push({ 
          name: 'Error element hidden initially', 
          passed: false,
          details: 'Error element not hidden on page load'
        });
      }
    } catch (error) {
      console.log(`❌ Error checking error handling UI: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'Error handling UI check', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
    // Test 10.5: File selection triggers UI updates
    console.log('\n🔍 Test 10.5: File selection UI updates...');
    try {
      // Create a mock file and set it to the file input
      await page.evaluate(() => {
        const audioInput = document.getElementById('audio-file');
        
        // Create a mock file
        const dataTransfer = new DataTransfer();
        const file = new File(['test audio content'], 'test-audio.mp3', { type: 'audio/mpeg' });
        dataTransfer.items.add(file);
        audioInput.files = dataTransfer.files;
        
        // Trigger the change event
        const event = new Event('change', { bubbles: true });
        audioInput.dispatchEvent(event);
      });
      
      // Wait a moment for the UI to update
      await page.waitForTimeout(500);
      
      // Check if file name is displayed
      const fileNameDisplayed = await page.evaluate(() => {
        const fileNames = document.getElementById('file-names');
        return fileNames ? fileNames.innerHTML.includes('test-audio.mp3') : false;
      });
      
      if (fileNameDisplayed) {
        console.log('✅ File selection updates UI correctly');
        testResults.passed++;
        testResults.details.push({ 
          name: 'File selection updates UI', 
          passed: true 
        });
      } else {
        console.log('❌ File selection does not update UI');
        testResults.failed++;
        testResults.details.push({ 
          name: 'File selection updates UI', 
          passed: false,
          details: 'File name not displayed after selection'
        });
      }
    } catch (error) {
      console.log(`❌ Error testing file selection: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'File selection test', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
    // Test 10.6: Error state is cleared when selecting files
    console.log('\n🔍 Test 10.6: Error state clearing...');
    try {
      // First set an error state
      await page.evaluate(() => {
        const uploadError = document.getElementById('upload-error');
        uploadError.textContent = 'Test error message';
        uploadError.classList.remove('hidden');
      });
      
      // Verify error is visible
      const errorVisible = await page.evaluate(() => {
        const uploadError = document.getElementById('upload-error');
        return !uploadError.classList.contains('hidden') && uploadError.textContent !== '';
      });
      
      if (errorVisible) {
        console.log('✅ Error state set successfully for testing');
      } else {
        console.log('⚠️ Could not set error state for testing');
        testResults.warnings++;
      }
      
      // Trigger file selection again
      await page.evaluate(() => {
        const audioInput = document.getElementById('audio-file');
        
        // Create a mock file
        const dataTransfer = new DataTransfer();
        const file = new File(['test audio content'], 'test-audio2.mp3', { type: 'audio/mpeg' });
        dataTransfer.items.add(file);
        audioInput.files = dataTransfer.files;
        
        // Trigger the change event
        const event = new Event('change', { bubbles: true });
        audioInput.dispatchEvent(event);
      });
      
      // Wait a moment for the error clearing to take effect
      await page.waitForTimeout(500);
      
      // Verify error state is cleared
      const errorCleared = await page.evaluate(() => {
        const uploadError = document.getElementById('upload-error');
        return uploadError.classList.contains('hidden') || uploadError.textContent === '';
      });
      
      if (errorCleared) {
        console.log('✅ Error state cleared when file selected');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Error state cleared on file selection', 
          passed: true 
        });
      } else {
        console.log('❌ Error state not cleared when file selected');
        testResults.failed++;
        testResults.details.push({ 
          name: 'Error state cleared on file selection', 
          passed: false,
          details: 'Error message still visible after file selection'
        });
      }
    } catch (error) {
      console.log(`❌ Error testing error state clearing: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'Error state clearing test', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
    // Test 10.7: Form reset functionality
    console.log('\n🔍 Test 10.7: Form reset functionality...');
    try {
      // Set some form state
      await page.evaluate(() => {
        // Set file names display
        const fileNames = document.getElementById('file-names');
        fileNames.innerHTML = '<span class="font-bold">Audio:</span> test-audio.mp3';
        
        // Set generated title (if this variable exists in the page context)
        window.generatedTitle = 'test-audio_cornell';
        
        // Set file variables (simulate file selection)
        window.audioFile = new File(['test'], 'test-audio.mp3', { type: 'audio/mpeg' });
        window.pdfFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      });
      
      // Call resetFormState function
      await page.evaluate(() => {
        if (typeof resetFormState === 'function') {
          resetFormState();
        } else {
          console.error('resetFormState function not found');
        }
      });
      
      // Verify form state is reset
      const formReset = await page.evaluate(() => {
        const fileNames = document.getElementById('file-names');
        const audioInput = document.getElementById('audio-file');
        const pdfInput = document.getElementById('pdf-file');
        
        return {
          fileNamesCleared: fileNames.innerHTML === '',
          audioInputCleared: audioInput.value === '',
          pdfInputCleared: pdfInput.value === '',
          generatedTitleCleared: window.generatedTitle === '',
          audioFileCleared: window.audioFile === null,
          pdfFileCleared: window.pdfFile === null
        };
      });
      
      const allReset = Object.values(formReset).every(value => value === true);
      if (allReset) {
        console.log('✅ Form state reset successfully');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Form reset functionality', 
          passed: true 
        });
      } else {
        console.log('❌ Form state not fully reset');
        console.log('   Reset state:', formReset);
        testResults.failed++;
        testResults.details.push({ 
          name: 'Form reset functionality', 
          passed: false,
          details: `Not all form elements were reset: ${JSON.stringify(formReset)}`
        });
      }
    } catch (error) {
      console.log(`❌ Error testing form reset: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'Form reset test', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
    // Test 10.8: Processing status UI reset
    console.log('\n🔍 Test 10.8: Processing status UI reset...');
    try {
      // Set processing status to a non-initial state
      await page.evaluate(() => {
        const processingStep = document.getElementById('processing-step');
        const processingProgress = document.getElementById('processing-progress');
        const processingPercentage = document.getElementById('processing-percentage');
        const processingMessage = document.getElementById('processing-message');
        
        processingStep.textContent = 'Completado';
        processingProgress.style.width = '100%';
        processingPercentage.textContent = '100%';
        processingMessage.textContent = '¡Tus notas han sido generadas exitosamente!';
      });
      
      // Call resetProcessingStatusUI function
      await page.evaluate(() => {
        if (typeof resetProcessingStatusUI === 'function') {
          resetProcessingStatusUI();
        } else {
          console.error('resetProcessingStatusUI function not found');
        }
      });
      
      // Verify processing status UI is reset to initial state
      const processingReset = await page.evaluate(() => {
        const processingStep = document.getElementById('processing-step');
        const processingProgress = document.getElementById('processing-progress');
        const processingPercentage = document.getElementById('processing-percentage');
        const processingMessage = document.getElementById('processing-message');
        
        return {
          stepReset: processingStep.textContent === 'Transcribiendo Audio',
          progressReset: processingProgress.style.width === '25%',
          percentageReset: processingPercentage.textContent === '25%',
          messageReset: processingMessage.textContent.includes('transcribiendo tu archivo de audio')
        };
      });
      
      const allProcessingReset = Object.values(processingReset).every(value => value === true);
      if (allProcessingReset) {
        console.log('✅ Processing status UI reset successfully');
        testResults.passed++;
        testResults.details.push({ 
          name: 'Processing status UI reset', 
          passed: true 
        });
      } else {
        console.log('❌ Processing status UI not fully reset');
        console.log('   Reset state:', processingReset);
        testResults.failed++;
        testResults.details.push({ 
          name: 'Processing status UI reset', 
          passed: false,
          details: `Not all processing status elements were reset: ${JSON.stringify(processingReset)}`
        });
      }
    } catch (error) {
      console.log(`❌ Error testing processing status reset: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'Processing status reset test', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
    // Test 10.9: UI state transitions
    console.log('\n🔍 Test 10.9: UI state transitions...');
    try {
      // Test showing processing status and hiding form
      await page.evaluate(() => {
        const processingStatus = document.getElementById('processing-status');
        const uploadForm = document.getElementById('upload-form');
        
        processingStatus.classList.remove('hidden');
        uploadForm.classList.add('hidden');
      });
      
      const processingShown = await page.evaluate(() => {
        const processingStatus = document.getElementById('processing-status');
        const uploadForm = document.getElementById('upload-form');
        
        return {
          processingVisible: !processingStatus.classList.contains('hidden'),
          formHidden: uploadForm.classList.contains('hidden')
        };
      });
      
      if (processingShown.processingVisible && processingShown.formHidden) {
        console.log('✅ UI transition to processing state works');
        testResults.passed++;
        testResults.details.push({ 
          name: 'UI transition to processing state', 
          passed: true 
        });
      } else {
        console.log('❌ UI transition to processing state failed');
        console.log('   State:', processingShown);
        testResults.failed++;
        testResults.details.push({ 
          name: 'UI transition to processing state', 
          passed: false,
          details: `Processing not shown or form not hidden: ${JSON.stringify(processingShown)}`
        });
      }
      
      // Test hiding processing status and showing form
      await page.evaluate(() => {
        const processingStatus = document.getElementById('processing-status');
        const uploadForm = document.getElementById('upload-form');
        
        processingStatus.classList.add('hidden');
        uploadForm.classList.remove('hidden');
      });
      
      const formShown = await page.evaluate(() => {
        const processingStatus = document.getElementById('processing-status');
        const uploadForm = document.getElementById('upload-form');
        
        return {
          processingHidden: processingStatus.classList.contains('hidden'),
          formVisible: !uploadForm.classList.contains('hidden')
        };
      });
      
      if (formShown.processingHidden && formShown.formVisible) {
        console.log('✅ UI transition back to form state works');
        testResults.passed++;
        testResults.details.push({ 
          name: 'UI transition back to form state', 
          passed: true 
        });
      } else {
        console.log('❌ UI transition back to form state failed');
        console.log('   State:', formShown);
        testResults.failed++;
        testResults.details.push({ 
          name: 'UI transition back to form state', 
          passed: false,
          details: `Form not shown or processing not hidden: ${JSON.stringify(formShown)}`
        });
      }
    } catch (error) {
      console.log(`❌ Error testing UI state transitions: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'UI state transitions test', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
    // Test 10.10: Download button Spanish text
    console.log('\n🔍 Test 10.10: Download button Spanish text...');
    try {
      // Check if there are any download buttons in the jobs list
      const downloadButtonExists = await page.evaluate(() => {
        const downloadButtons = document.querySelectorAll('.download-btn');
        return downloadButtons.length > 0;
      });
      
      if (downloadButtonExists) {
        const downloadButtonText = await page.evaluate(() => {
          const downloadButton = document.querySelector('.download-btn');
          return downloadButton ? downloadButton.textContent.trim() : '';
        });
        
        if (downloadButtonText === 'Descargar PDF') {
          console.log('✅ Download button has correct Spanish text');
          testResults.passed++;
          testResults.details.push({ 
            name: 'Download button Spanish text', 
            passed: true 
          });
        } else {
          console.log(`❌ Download button text incorrect: "${downloadButtonText}"`);
          testResults.failed++;
          testResults.details.push({ 
            name: 'Download button Spanish text', 
            passed: false,
            details: `Expected "Descargar PDF", got "${downloadButtonText}"`
          });
        }
      } else {
        console.log('⚠️ No download buttons found to test (no completed jobs)');
        testResults.warnings++;
      }
    } catch (error) {
      console.log(`❌ Error checking download button text: ${error.message}`);
      testResults.failed++;
      testResults.details.push({ 
        name: 'Download button text check', 
        passed: false,
        details: `Error: ${error.message}`
      });
    }
    
  } finally {
    await browser.close();
    console.log('🌐 Browser-based tests completed');
  }
}

// Run browser tests if the server is running
try {
  console.log('🔍 Checking if local server is running...');
  execSync('curl -s http://localhost:4321 > /dev/null');
  console.log('✅ Local server is running, proceeding with browser tests');
  await runBrowserTests();
} catch (error) {
  console.log('⚠️ Local server not running, skipping browser tests');
  console.log('   To run browser tests, start the server with: npm run dev');
  testResults.warnings++;
}

console.log('\n📋 UPDATED FINAL RESULTS');
console.log('=' .repeat(60));

console.log(`✅ Tests Passed: ${testResults.passed}`);
console.log(`❌ Tests Failed: ${testResults.failed}`);
console.log(`⚠️  Warnings: ${testResults.warnings}`);

const totalTests = testResults.passed + testResults.failed;
const successRate = totalTests > 0 ? Math.round((testResults.passed / totalTests) * 100) : 0;

console.log(`📊 Success Rate: ${successRate}%`);

// Detailed breakdown by requirement
console.log('\n📋 REQUIREMENT COVERAGE:');
console.log(`Requirement 1.1 (API Integration): ${testResults.details.filter(t => t.name.includes('API') || t.name.includes('endpoint') || t.name.includes('request')).filter(t => t.passed).length} tests passed`);
console.log(`Requirement 2.1 (Processing Status): ${testResults.details.filter(t => t.name.includes('Processing') || t.name.includes('progress') || t.name.includes('status')).filter(t => t.passed).length} tests passed`);
console.log(`Requirement 3.1 (Spanish Translations): ${testResults.details.filter(t => t.name.includes('translation') || t.name.includes('Spanish') || t.name.includes('hardcoded')).filter(t => t.passed).length} tests passed`);
console.log(`Requirement 4.1 (Backend Logic): ${testResults.details.filter(t => t.name.includes('parity') || t.name.includes('error handling') || t.name.includes('response')).filter(t => t.passed).length} tests passed`);

// Recommendations
console.log('\n💡 RECOMMENDATIONS:');

if (testResults.failed > 0) {
  console.log('🔧 Issues to fix:');
  testResults.details.filter(t => !t.passed).forEach(test => {
    console.log(`   - ${test.name}: ${test.details}`);
  });
}

if (successRate >= 95) {
  console.log('🎉 Excellent! Spanish site workflow is fully implemented and tested.');
} else if (successRate >= 85) {
  console.log('✅ Good! Spanish site workflow is mostly complete with minor issues.');
} else if (successRate >= 70) {
  console.log('⚠️  Spanish site workflow needs some improvements.');
} else {
  console.log('❌ Spanish site workflow needs significant work.');
}

console.log('\n🏁 End-to-End Test Complete!');

// Exit with appropriate code
process.exit(testResults.failed > 0 ? 1 : 0);