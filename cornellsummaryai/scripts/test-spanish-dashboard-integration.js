#!/usr/bin/env node

/**
 * Test script to validate Spanish dashboard integration with processing status translations
 * This script verifies that the Spanish dashboard properly uses the translation system
 * for all processing status related text.
 */

import fs from 'fs';
import path from 'path';

// Read the Spanish dashboard file
const dashboardPath = path.join(process.cwd(), 'src/pages/es/dashboard/index.astro');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

// Read the i18n file
const i18nPath = path.join(process.cwd(), 'src/lib/i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

function testSpanishDashboardIntegration() {
  console.log('🧪 Testing Spanish dashboard integration with processing status translations...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Test cases: Check that the dashboard uses translation keys instead of hardcoded Spanish text
  const testCases = [
    {
      name: 'Processing title uses translation key',
      pattern: /t\('processing\.title'\)/,
      description: 'Dashboard should use t(\'processing.title\') for processing section title'
    },
    {
      name: 'Processing step uses translation key',
      pattern: /t\('processing\.steps\.transcribing'\)/,
      description: 'Dashboard should use t(\'processing.steps.transcribing\') for initial step'
    },
    {
      name: 'Processing message uses translation key',
      pattern: /t\('processing\.messages\.transcription'\)/,
      description: 'Dashboard should use t(\'processing.messages.transcription\') for initial message'
    },
    {
      name: 'Download error uses translation key',
      pattern: /t\('processing\.error\.download'\)/,
      description: 'Dashboard should use t(\'processing.error.download\') for download errors'
    },
    {
      name: 'Script contains all processing translations',
      pattern: /'processing\.steps\.transcribing':\s*'Transcribiendo Audio'/,
      description: 'Script should contain Spanish translation for transcribing step'
    },
    {
      name: 'Script contains generating notes translation',
      pattern: /'processing\.steps\.generating':\s*'Generando Notas'/,
      description: 'Script should contain Spanish translation for generating step'
    },
    {
      name: 'Script contains creating PDF translation',
      pattern: /'processing\.steps\.creating':\s*'Creando PDF'/,
      description: 'Script should contain Spanish translation for creating step'
    },
    {
      name: 'Script contains completed translation',
      pattern: /'processing\.steps\.completed':\s*'Completado'/,
      description: 'Script should contain Spanish translation for completed step'
    }
  ];
  
  // Test each case
  for (const testCase of testCases) {
    if (testCase.pattern.test(dashboardContent)) {
      console.log(`✅ ${testCase.name}`);
      passed++;
    } else {
      console.log(`❌ ${testCase.name}`);
      console.log(`   ${testCase.description}`);
      failed++;
    }
  }
  
  // Test that hardcoded Spanish text has been removed
  const hardcodedTextTests = [
    {
      name: 'No hardcoded "Procesando tu Audio" in HTML',
      pattern: />Procesando tu Audio</,
      shouldNotExist: true,
      description: 'HTML should not contain hardcoded "Procesando tu Audio"'
    },
    {
      name: 'No hardcoded "Transcribiendo Audio" in HTML',
      pattern: />Transcribiendo Audio</,
      shouldNotExist: true,
      description: 'HTML should not contain hardcoded "Transcribiendo Audio"'
    },
    {
      name: 'No hardcoded transcription message in HTML',
      pattern: />Estamos transcribiendo tu archivo de audio\./,
      shouldNotExist: true,
      description: 'HTML should not contain hardcoded transcription message'
    }
  ];
  
  console.log('\n🔍 Checking for removed hardcoded text...');
  
  for (const test of hardcodedTextTests) {
    const found = test.pattern.test(dashboardContent);
    if (test.shouldNotExist && !found) {
      console.log(`✅ ${test.name}`);
      passed++;
    } else if (test.shouldNotExist && found) {
      console.log(`❌ ${test.name}`);
      console.log(`   ${test.description}`);
      failed++;
    }
  }
  
  // Test that i18n file contains all required translations
  console.log('\n🔍 Checking i18n file contains all translations...');
  
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
  
  for (const key of requiredTranslations) {
    const pattern = new RegExp(`'${key.replace('.', '\\.')}':\\s*'[^']+',?`);
    if (pattern.test(i18nContent)) {
      console.log(`✅ i18n contains ${key}`);
      passed++;
    } else {
      console.log(`❌ i18n missing ${key}`);
      failed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 Spanish dashboard is properly integrated with processing status translations!');
    return true;
  } else {
    console.log('\n💥 Some integration issues found. Please fix the issues above.');
    return false;
  }
}

// Run the test
const success = testSpanishDashboardIntegration();
process.exit(success ? 0 : 1);