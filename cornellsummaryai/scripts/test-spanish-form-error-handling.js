#!/usr/bin/env node

/**
 * Test script for Spanish site form submission and error handling
 * Tests the improvements made to task 5 of the Spanish site migration
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Spanish Site Form Submission and Error Handling');
console.log('=' .repeat(60));

// Test 1: Verify Spanish dashboard file exists and has correct structure
function testSpanishDashboardExists() {
  console.log('\n1. Testing Spanish dashboard file exists...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  
  if (!fs.existsSync(spanishDashboardPath)) {
    console.log('❌ Spanish dashboard file not found');
    return false;
  }
  
  console.log('✅ Spanish dashboard file exists');
  return true;
}

// Test 2: Verify API endpoint usage
function testApiEndpointUsage() {
  console.log('\n2. Testing API endpoint usage...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check that it uses /api/generate endpoint
  if (!content.includes('/api/generate')) {
    console.log('❌ Spanish dashboard does not use /api/generate endpoint');
    return false;
  }
  
  // Check that it doesn't use the old /api/trigger-n8n endpoint
  if (content.includes('/api/trigger-n8n')) {
    console.log('❌ Spanish dashboard still uses old /api/trigger-n8n endpoint');
    return false;
  }
  
  console.log('✅ Spanish dashboard uses correct /api/generate endpoint');
  return true;
}

// Test 3: Verify Spanish error messages
function testSpanishErrorMessages() {
  console.log('\n3. Testing Spanish error messages...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  const requiredSpanishMessages = [
    'Debes iniciar sesión para subir archivos',
    'Por favor selecciona un archivo de audio',
    'Error al procesar archivos. Por favor, inténtalo de nuevo.',
    'Error de descarga',
    'Transcribiendo Audio',
    'Generando Notas',
    'Creando PDF',
    'Completado'
  ];
  
  let missingMessages = [];
  
  for (const message of requiredSpanishMessages) {
    if (!content.includes(message)) {
      missingMessages.push(message);
    }
  }
  
  if (missingMessages.length > 0) {
    console.log('❌ Missing Spanish error messages:');
    missingMessages.forEach(msg => console.log(`   - ${msg}`));
    return false;
  }
  
  console.log('✅ All required Spanish error messages are present');
  return true;
}

// Test 4: Verify error recovery logic
function testErrorRecoveryLogic() {
  console.log('\n4. Testing error recovery logic...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check for processing status hiding on error
  const hasProcessingStatusHiding = content.includes('processingStatus.classList.add(\'hidden\')') &&
                                   content.includes('uploadForm.classList.remove(\'hidden\')');
  
  if (!hasProcessingStatusHiding) {
    console.log('❌ Missing processing status hiding logic on error');
    return false;
  }
  
  // Check for error message display logic
  const hasErrorDisplay = content.includes('uploadError.textContent') &&
                         content.includes('uploadError.classList.remove(\'hidden\')');
  
  if (!hasErrorDisplay) {
    console.log('❌ Missing error message display logic');
    return false;
  }
  
  // Check for error message clearing on success
  const hasErrorClearing = content.includes('uploadError.classList.add(\'hidden\')') &&
                          content.includes('uploadError.textContent = \'\'');
  
  if (!hasErrorClearing) {
    console.log('❌ Missing error message clearing logic on success');
    return false;
  }
  
  console.log('✅ Error recovery logic is properly implemented');
  return true;
}

// Test 5: Verify enhanced error handling for different error types
function testEnhancedErrorHandling() {
  console.log('\n5. Testing enhanced error handling...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check for authentication error handling
  const hasAuthErrorHandling = content.includes('authentication') || content.includes('unauthorized');
  
  if (!hasAuthErrorHandling) {
    console.log('❌ Missing authentication error handling');
    return false;
  }
  
  // Check for file upload error handling
  const hasFileErrorHandling = content.includes('audioError') && content.includes('pdfError');
  
  if (!hasFileErrorHandling) {
    console.log('❌ Missing file upload error handling');
    return false;
  }
  
  // Check for download error handling
  const hasDownloadErrorHandling = content.includes('download') && content.includes('error');
  
  if (!hasDownloadErrorHandling) {
    console.log('❌ Missing download error handling');
    return false;
  }
  
  console.log('✅ Enhanced error handling for different error types is implemented');
  return true;
}

// Test 6: Verify form reset functionality
function testFormResetFunctionality() {
  console.log('\n6. Testing form reset functionality...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check for form reset on success
  const hasFormReset = content.includes('uploadForm.reset()') &&
                      content.includes('audioFile = null') &&
                      content.includes('pdfFile = null') &&
                      content.includes('generatedTitle = \'\'');
  
  if (!hasFormReset) {
    console.log('❌ Missing form reset functionality');
    return false;
  }
  
  // Check for file names update after reset
  const hasFileNamesUpdate = content.includes('updateFileNames()');
  
  if (!hasFileNamesUpdate) {
    console.log('❌ Missing file names update after reset');
    return false;
  }
  
  console.log('✅ Form reset functionality is properly implemented');
  return true;
}

// Test 7: Verify request/response format compatibility
function testRequestResponseFormat() {
  console.log('\n7. Testing request/response format compatibility...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check for correct request format
  const hasCorrectRequestFormat = content.includes('audioFilePath') &&
                                 content.includes('pdfFilePath') &&
                                 content.includes('lectureTitle') &&
                                 content.includes('courseSubject');
  
  if (!hasCorrectRequestFormat) {
    console.log('❌ Missing correct request format for /api/generate');
    return false;
  }
  
  // Check for response handling
  const hasResponseHandling = content.includes('responseData.success') &&
                             content.includes('processingStatus');
  
  if (!hasResponseHandling) {
    console.log('❌ Missing proper response handling');
    return false;
  }
  
  console.log('✅ Request/response format is compatible with /api/generate');
  return true;
}

// Run all tests
async function runAllTests() {
  const tests = [
    testSpanishDashboardExists,
    testApiEndpointUsage,
    testSpanishErrorMessages,
    testErrorRecoveryLogic,
    testEnhancedErrorHandling,
    testFormResetFunctionality,
    testRequestResponseFormat
  ];
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  for (const test of tests) {
    try {
      if (test()) {
        passedTests++;
      }
    } catch (error) {
      console.log(`❌ Test failed with error: ${error.message}`);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! Spanish form submission and error handling is properly implemented.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    return false;
  }
}

// Run the tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});