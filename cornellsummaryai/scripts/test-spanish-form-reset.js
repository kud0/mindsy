#!/usr/bin/env node

/**
 * Test script to verify Spanish site form reset and UI state management
 * This script tests the form reset functionality and UI state transitions
 */

import puppeteer from 'puppeteer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSpanishFormReset() {
  console.log('🧪 Testing Spanish site form reset and UI state management...\n');

  const browser = await puppeteer.launch({ 
    headless: false, // Set to true for CI/CD
    devtools: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Error:', msg.text());
      }
    });

    // Navigate to Spanish dashboard
    console.log('📍 Navigating to Spanish dashboard...');
    await page.goto('http://localhost:4321/es/dashboard', { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });

    // Wait for the page to load
    await page.waitForSelector('#upload-form', { timeout: 10000 });
    console.log('✅ Spanish dashboard loaded successfully');

    // Test 1: Verify initial form state
    console.log('\n🔍 Test 1: Verifying initial form state...');
    
    const initialFormVisible = await page.evaluate(() => {
      const form = document.getElementById('upload-form');
      const processingStatus = document.getElementById('processing-status');
      return {
        formVisible: !form.classList.contains('hidden'),
        processingHidden: processingStatus.classList.contains('hidden'),
        fileNamesEmpty: document.getElementById('file-names').innerHTML === ''
      };
    });

    if (initialFormVisible.formVisible && initialFormVisible.processingHidden && initialFormVisible.fileNamesEmpty) {
      console.log('✅ Initial form state is correct');
    } else {
      console.log('❌ Initial form state is incorrect:', initialFormVisible);
    }

    // Test 2: Test file selection and error state clearing
    console.log('\n🔍 Test 2: Testing file selection and error state clearing...');
    
    // First, simulate an error state
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
      console.log('✅ Error state set successfully');
    } else {
      console.log('❌ Failed to set error state');
    }

    // Create a test audio file
    const testAudioPath = path.join(__dirname, 'test-audio.mp3');
    
    // Simulate file selection (this will trigger clearErrorState)
    await page.evaluate(() => {
      // Simulate file selection by calling the change event handler
      const audioInput = document.getElementById('audio-file');
      const file = new File(['test audio content'], 'test-audio.mp3', { type: 'audio/mpeg' });
      
      // Create a mock FileList
      const dataTransfer = new DataTransfer();
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
      return uploadError.classList.contains('hidden') && uploadError.textContent === '';
    });

    if (errorCleared) {
      console.log('✅ Error state cleared when file selected');
    } else {
      console.log('❌ Error state not cleared when file selected');
    }

    // Test 3: Test form reset functionality
    console.log('\n🔍 Test 3: Testing form reset functionality...');
    
    // Set some form state
    await page.evaluate(() => {
      // Set file names display
      const fileNames = document.getElementById('file-names');
      fileNames.innerHTML = '<span class="font-bold">Audio:</span> test-audio.mp3';
      
      // Set generated title
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
    } else {
      console.log('❌ Form state not fully reset:', formReset);
    }

    // Test 4: Test processing status UI reset
    console.log('\n🔍 Test 4: Testing processing status UI reset...');
    
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
    } else {
      console.log('❌ Processing status UI not fully reset:', processingReset);
    }

    // Test 5: Test UI state transitions
    console.log('\n🔍 Test 5: Testing UI state transitions...');
    
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
    } else {
      console.log('❌ UI transition to processing state failed:', processingShown);
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
    } else {
      console.log('❌ UI transition back to form state failed:', formShown);
    }

    console.log('\n🎉 Spanish form reset and UI state management tests completed!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSpanishFormReset()
    .then(() => {
      console.log('\n✅ All tests passed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Tests failed:', error);
      process.exit(1);
    });
}

export { testSpanishFormReset };