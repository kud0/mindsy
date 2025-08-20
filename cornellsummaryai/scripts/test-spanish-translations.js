#!/usr/bin/env node

/**
 * Test script to validate Spanish translations for processing status
 * This script verifies that all required translation keys are present
 * and that they contain the expected Spanish text.
 */

// Since we can't directly import TypeScript, we'll read and parse the file
import fs from 'fs';
import path from 'path';

// Read the i18n.ts file and extract translations
const i18nPath = path.join(process.cwd(), 'src/lib/i18n.ts');
const i18nContent = fs.readFileSync(i18nPath, 'utf8');

// Simple extraction of translations (this is a basic approach)
function extractTranslations(content, language) {
  const pattern = new RegExp(`${language}:\\s*{([\\s\\S]*?)},\\s*(?:}\\s*as const|es:|$)`);
  const section = content.match(pattern);
  if (!section) {
    throw new Error(`Could not find ${language} translations section`);
  }
  
  const translations = {};
  const lines = section[1].split('\n');
  
  for (const line of lines) {
    const match = line.match(/^\s*'([^']+)':\s*'([^']+)',?\s*$/);
    if (match) {
      translations[match[1]] = match[2];
    }
  }
  
  return translations;
}

const requiredTranslations = {
  // Processing Status Steps
  'processing.steps.transcribing': 'Transcribiendo Audio',
  'processing.steps.generating': 'Generando Notas', 
  'processing.steps.creating': 'Creando PDF',
  'processing.steps.completed': 'Completado',
  
  // Processing Status Messages
  'processing.messages.transcription': 'Estamos transcribiendo tu archivo de audio. Esto puede tomar unos minutos dependiendo del tamaño del archivo.',
  'processing.messages.pdfExtraction': 'Extrayendo texto del PDF...',
  'processing.messages.notesGeneration': 'Creando Notas Cornell desde tu audio y PDF...',
  'processing.messages.pdfGeneration': 'Formateando tus notas en un hermoso PDF...',
  'processing.messages.completed': '¡Tus notas han sido generadas exitosamente!',
  
  // Processing Error Messages
  'processing.error.failed': 'Error al procesar archivos. Por favor, inténtalo de nuevo.',
  'processing.error.download': 'Error de descarga',
  
  // Processing Title
  'processing.title': 'Procesando tu Audio'
};

function testSpanishTranslations() {
  console.log('🧪 Testing Spanish translations for processing status...\n');
  
  let passed = 0;
  let failed = 0;
  
  // Extract Spanish translations from the file
  const spanishTranslations = extractTranslations(i18nContent, 'es');
  
  // Test that all required keys exist in Spanish translations
  for (const [key, expectedValue] of Object.entries(requiredTranslations)) {
    const actualValue = spanishTranslations[key];
    
    if (!actualValue) {
      console.log(`❌ Missing translation key: ${key}`);
      failed++;
      continue;
    }
    
    if (actualValue !== expectedValue) {
      console.log(`❌ Translation mismatch for ${key}:`);
      console.log(`   Expected: "${expectedValue}"`);
      console.log(`   Actual:   "${actualValue}"`);
      failed++;
      continue;
    }
    
    console.log(`✅ ${key}: "${actualValue}"`);
    passed++;
  }
  
  // Test that English translations also exist for completeness
  console.log('\n🔍 Checking English translations exist...');
  
  const englishKeys = [
    'processing.steps.transcribing',
    'processing.steps.generating', 
    'processing.steps.creating',
    'processing.steps.completed',
    'processing.title'
  ];
  
  // Extract English translations from the file
  const englishTranslations = extractTranslations(i18nContent, 'en');
  
  for (const key of englishKeys) {
    const englishValue = englishTranslations[key];
    if (!englishValue) {
      console.log(`⚠️  Missing English translation for: ${key}`);
      failed++;
    } else {
      console.log(`✅ English ${key}: "${englishValue}"`);
      passed++;
    }
  }
  
  console.log('\n📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 All Spanish processing status translations are correctly implemented!');
    return true;
  } else {
    console.log('\n💥 Some translations are missing or incorrect. Please fix the issues above.');
    return false;
  }
}

// Run the test
const success = testSpanishTranslations();
process.exit(success ? 0 : 1);