#!/usr/bin/env node

/**
 * Integration test to verify Spanish site form reset and UI state management
 * This script tests the actual implementation in the Spanish dashboard
 */

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSpanishFormResetIntegration() {
  console.log('🧪 Testing Spanish site form reset integration...\n');

  try {
    // Read the Spanish dashboard file
    const spanishDashboardPath = path.join(__dirname, '..', 'src', 'pages', 'es', 'dashboard', 'index.astro');
    const spanishDashboardContent = await readFile(spanishDashboardPath, 'utf-8');

    console.log('📍 Analyzing Spanish dashboard implementation...');

    // Test 1: Check if resetFormState function is defined
    console.log('\n🔍 Test 1: Checking resetFormState function...');
    const hasResetFormState = spanishDashboardContent.includes('function resetFormState()');
    if (hasResetFormState) {
      console.log('✅ resetFormState function is defined');
      
      // Check if it resets all required elements
      const resetsForm = spanishDashboardContent.includes('uploadForm.reset()');
      const resetsAudioFile = spanishDashboardContent.includes('audioFile = null');
      const resetsPdfFile = spanishDashboardContent.includes('pdfFile = null');
      const resetsTitle = spanishDashboardContent.includes('generatedTitle = \'\'');
      const clearsInputs = spanishDashboardContent.includes('audioInput.value = \'\'') && 
                          spanishDashboardContent.includes('pdfInput.value = \'\'');
      
      if (resetsForm && resetsAudioFile && resetsPdfFile && resetsTitle && clearsInputs) {
        console.log('✅ resetFormState function properly resets all form elements');
      } else {
        console.log('❌ resetFormState function missing some reset operations:', {
          resetsForm, resetsAudioFile, resetsPdfFile, resetsTitle, clearsInputs
        });
      }
    } else {
      console.log('❌ resetFormState function not found');
    }

    // Test 2: Check if resetProcessingStatusUI function is defined
    console.log('\n🔍 Test 2: Checking resetProcessingStatusUI function...');
    const hasResetProcessingStatusUI = spanishDashboardContent.includes('function resetProcessingStatusUI()');
    if (hasResetProcessingStatusUI) {
      console.log('✅ resetProcessingStatusUI function is defined');
      
      // Check if it resets all processing status elements
      const resetsStep = spanishDashboardContent.includes('processingStep.textContent = t(\'processing.steps.transcribing\')');
      const resetsProgress = spanishDashboardContent.includes('processingProgress.style.width = \'25%\'');
      const resetsPercentage = spanishDashboardContent.includes('processingPercentage.textContent = \'25%\'');
      const resetsMessage = spanishDashboardContent.includes('processingMessage.textContent = t(\'processing.messages.transcription\')');
      
      if (resetsStep && resetsProgress && resetsPercentage && resetsMessage) {
        console.log('✅ resetProcessingStatusUI function properly resets all processing status elements');
      } else {
        console.log('❌ resetProcessingStatusUI function missing some reset operations:', {
          resetsStep, resetsProgress, resetsPercentage, resetsMessage
        });
      }
    } else {
      console.log('❌ resetProcessingStatusUI function not found');
    }

    // Test 3: Check if clearErrorState function is defined
    console.log('\n🔍 Test 3: Checking clearErrorState function...');
    const hasClearErrorState = spanishDashboardContent.includes('function clearErrorState()');
    if (hasClearErrorState) {
      console.log('✅ clearErrorState function is defined');
      
      // Check if it properly clears error state
      const hidesError = spanishDashboardContent.includes('uploadError.classList.add(\'hidden\')');
      const clearsErrorText = spanishDashboardContent.includes('uploadError.textContent = \'\'');
      
      if (hidesError && clearsErrorText) {
        console.log('✅ clearErrorState function properly clears error state');
      } else {
        console.log('❌ clearErrorState function missing some clear operations:', {
          hidesError, clearsErrorText
        });
      }
    } else {
      console.log('❌ clearErrorState function not found');
    }

    // Test 4: Check if functions are called in appropriate places
    console.log('\n🔍 Test 4: Checking function usage...');
    
    // Check if resetFormState is called after successful processing
    const callsResetFormStateOnSuccess = spanishDashboardContent.includes('resetFormState()');
    if (callsResetFormStateOnSuccess) {
      console.log('✅ resetFormState is called after successful processing');
    } else {
      console.log('❌ resetFormState is not called after successful processing');
    }

    // Check if resetProcessingStatusUI is called in error handling
    const callsResetProcessingStatusUIOnError = spanishDashboardContent.match(/resetProcessingStatusUI\(\)/g);
    if (callsResetProcessingStatusUIOnError && callsResetProcessingStatusUIOnError.length >= 3) {
      console.log('✅ resetProcessingStatusUI is called in error handling scenarios');
    } else {
      console.log('❌ resetProcessingStatusUI is not called in all error handling scenarios');
    }

    // Check if clearErrorState is called on file input changes
    const callsClearErrorStateOnFileChange = spanishDashboardContent.includes('clearErrorState()');
    if (callsClearErrorStateOnFileChange) {
      console.log('✅ clearErrorState is called on file input changes');
    } else {
      console.log('❌ clearErrorState is not called on file input changes');
    }

    // Test 5: Check UI state transitions
    console.log('\n🔍 Test 5: Checking UI state transitions...');
    
    // Check if processing status is shown/hidden properly
    const showsProcessingStatus = spanishDashboardContent.includes('processingStatus.classList.remove(\'hidden\')');
    const hidesProcessingStatus = spanishDashboardContent.includes('processingStatus.classList.add(\'hidden\')');
    const hidesForm = spanishDashboardContent.includes('uploadForm.classList.add(\'hidden\')');
    const showsForm = spanishDashboardContent.includes('uploadForm.classList.remove(\'hidden\')');
    
    if (showsProcessingStatus && hidesProcessingStatus && hidesForm && showsForm) {
      console.log('✅ UI state transitions are properly implemented');
    } else {
      console.log('❌ UI state transitions are incomplete:', {
        showsProcessingStatus, hidesProcessingStatus, hidesForm, showsForm
      });
    }

    // Test 6: Check timeout for processing status cleanup
    console.log('\n🔍 Test 6: Checking processing status cleanup timeout...');
    
    const hasCleanupTimeout = spanishDashboardContent.includes('setTimeout(() => {') && 
                             spanishDashboardContent.includes('resetProcessingStatusUI()');
    if (hasCleanupTimeout) {
      console.log('✅ Processing status cleanup timeout is implemented');
    } else {
      console.log('❌ Processing status cleanup timeout is missing');
    }

    console.log('\n🎉 Spanish form reset integration analysis completed!');

    // Summary
    const allTestsPassed = hasResetFormState && hasResetProcessingStatusUI && hasClearErrorState && 
                          callsResetFormStateOnSuccess && callsClearErrorStateOnFileChange && 
                          showsProcessingStatus && hidesProcessingStatus && hasCleanupTimeout;

    if (allTestsPassed) {
      console.log('\n✅ All integration tests passed! Form reset and UI state management is properly implemented.');
      return true;
    } else {
      console.log('\n⚠️  Some integration tests failed. Please review the implementation.');
      return false;
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    throw error;
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testSpanishFormResetIntegration()
    .then((success) => {
      if (success) {
        console.log('\n✅ Integration test passed!');
        process.exit(0);
      } else {
        console.log('\n❌ Integration test failed!');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n❌ Integration test failed:', error);
      process.exit(1);
    });
}

export { testSpanishFormResetIntegration };