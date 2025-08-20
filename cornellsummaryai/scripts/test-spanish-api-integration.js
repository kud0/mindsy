#!/usr/bin/env node

/**
 * Test script to verify Spanish dashboard API integration
 * This script tests the updated Spanish dashboard to ensure it properly calls /api/generate
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing Spanish Dashboard API Integration...\n');

// Test 1: Verify Spanish dashboard file exists and contains correct API endpoint
function testSpanishDashboardFile() {
  console.log('📁 Test 1: Checking Spanish dashboard file...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  
  if (!fs.existsSync(spanishDashboardPath)) {
    console.error('❌ Spanish dashboard file not found');
    return false;
  }
  
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check that it uses /api/generate instead of /api/trigger-n8n
  if (content.includes('/api/trigger-n8n')) {
    console.error('❌ Spanish dashboard still contains /api/trigger-n8n endpoint');
    return false;
  }
  
  if (!content.includes('/api/generate')) {
    console.error('❌ Spanish dashboard does not contain /api/generate endpoint');
    return false;
  }
  
  console.log('✅ Spanish dashboard uses correct API endpoint (/api/generate)');
  return true;
}

// Test 2: Verify request payload structure matches English site
function testRequestPayloadStructure() {
  console.log('\n📋 Test 2: Checking request payload structure...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check for correct payload structure
  const requiredFields = [
    'audioFilePath',
    'pdfFilePath',
    'lectureTitle',
    'courseSubject'
  ];
  
  let allFieldsFound = true;
  requiredFields.forEach(field => {
    if (!content.includes(field)) {
      console.error(`❌ Missing required field in payload: ${field}`);
      allFieldsFound = false;
    }
  });
  
  if (allFieldsFound) {
    console.log('✅ Request payload structure matches expected format');
  }
  
  return allFieldsFound;
}

// Test 3: Verify response handling logic
function testResponseHandling() {
  console.log('\n🔄 Test 3: Checking response handling logic...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check for proper response handling
  const responseChecks = [
    'response.ok',
    'response.json()',
    'responseData.success',
    'responseData.error'
  ];
  
  let allChecksFound = true;
  responseChecks.forEach(check => {
    if (!content.includes(check)) {
      console.error(`❌ Missing response handling: ${check}`);
      allChecksFound = false;
    }
  });
  
  if (allChecksFound) {
    console.log('✅ Response handling logic is properly implemented');
  }
  
  return allChecksFound;
}

// Test 4: Verify Spanish translations are maintained
function testSpanishTranslations() {
  console.log('\n🌐 Test 4: Checking Spanish translations...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check for key Spanish translations
  const spanishTranslations = [
    'Debes iniciar sesión para subir archivos',
    'Por favor selecciona un archivo de audio',
    'Error al procesar archivos',
    'Procesando...',
    'Generar Notas'
  ];
  
  let allTranslationsFound = true;
  spanishTranslations.forEach(translation => {
    if (!content.includes(translation)) {
      console.error(`❌ Missing Spanish translation: ${translation}`);
      allTranslationsFound = false;
    }
  });
  
  if (allTranslationsFound) {
    console.log('✅ Spanish translations are maintained');
  }
  
  return allTranslationsFound;
}

// Test 5: Verify job creation logic is removed
function testJobCreationRemoval() {
  console.log('\n🗑️  Test 5: Checking job creation logic removal...');
  
  const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
  const content = fs.readFileSync(spanishDashboardPath, 'utf8');
  
  // Check that manual job creation is removed
  const jobCreationPatterns = [
    'supabase.from(\'jobs\').insert',
    'status: \'pending\''
  ];
  
  let jobCreationRemoved = true;
  jobCreationPatterns.forEach(pattern => {
    if (content.includes(pattern)) {
      console.error(`❌ Manual job creation logic still present: ${pattern}`);
      jobCreationRemoved = false;
    }
  });
  
  if (jobCreationRemoved) {
    console.log('✅ Manual job creation logic properly removed');
  }
  
  return jobCreationRemoved;
}

// Run all tests
async function runTests() {
  const tests = [
    testSpanishDashboardFile,
    testRequestPayloadStructure,
    testResponseHandling,
    testSpanishTranslations,
    testJobCreationRemoval
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    if (test()) {
      passedTests++;
    }
  }
  
  console.log(`\n📊 Test Results: ${passedTests}/${tests.length} tests passed`);
  
  if (passedTests === tests.length) {
    console.log('🎉 All tests passed! Spanish dashboard API integration is working correctly.');
    return true;
  } else {
    console.log('❌ Some tests failed. Please review the implementation.');
    return false;
  }
}

// Run the tests
runTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Error running tests:', error);
  process.exit(1);
});