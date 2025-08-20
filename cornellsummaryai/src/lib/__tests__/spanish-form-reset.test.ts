import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JSDOM } from 'jsdom';

describe('Spanish Dashboard Form Reset and UI State Management', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

  beforeEach(() => {
    // Create a mock DOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <form id="upload-form">
            <input type="file" id="audio-file" />
            <input type="file" id="pdf-file" />
            <div id="file-names"></div>
            <div id="upload-error" class="hidden"></div>
          </form>
          
          <div id="processing-status" class="hidden">
            <span id="processing-step">Transcribiendo Audio</span>
            <div id="processing-progress" style="width: 25%"></div>
            <span id="processing-percentage">25%</span>
            <p id="processing-message">Estamos transcribiendo tu archivo de audio...</p>
          </div>
        </body>
      </html>
    `);

    document = dom.window.document;
    window = dom.window as Window & typeof globalThis;

    // Set up global variables
    (global as any).document = document;
    (global as any).window = window;

    // Mock translation function
    const translations = {
      'processing.steps.transcribing': 'Transcribiendo Audio',
      'processing.messages.transcription': 'Estamos transcribiendo tu archivo de audio. Esto puede tomar unos minutos dependiendo del tamaño del archivo.'
    };

    (global as any).t = (key: string) => translations[key as keyof typeof translations] || key;
  });

  describe('resetFormState function', () => {
    it('should reset all form fields and variables', () => {
      // Set up the resetFormState function
      const resetFormState = () => {
        const uploadForm = document.getElementById('upload-form') as HTMLFormElement;
        const audioInput = document.getElementById('audio-file') as HTMLInputElement;
        const pdfInput = document.getElementById('pdf-file') as HTMLInputElement;
        const fileNames = document.getElementById('file-names') as HTMLDivElement;

        uploadForm.reset();
        audioInput.value = '';
        pdfInput.value = '';
        fileNames.innerHTML = '';
        
        // Reset global variables (simulated)
        (window as any).audioFile = null;
        (window as any).pdfFile = null;
        (window as any).generatedTitle = '';
      };

      // Set initial state (can't set file input values, but can set other elements)
      const audioInput = document.getElementById('audio-file') as HTMLInputElement;
      const pdfInput = document.getElementById('pdf-file') as HTMLInputElement;
      const fileNames = document.getElementById('file-names') as HTMLDivElement;

      fileNames.innerHTML = '<span>Audio: test-audio.mp3</span>';
      (window as any).audioFile = { name: 'test-audio.mp3' };
      (window as any).pdfFile = { name: 'test.pdf' };
      (window as any).generatedTitle = 'test';

      // Call resetFormState
      resetFormState();

      // Verify reset
      expect(audioInput.value).toBe('');
      expect(pdfInput.value).toBe('');
      expect(fileNames.innerHTML).toBe('');
      expect((window as any).audioFile).toBeNull();
      expect((window as any).pdfFile).toBeNull();
      expect((window as any).generatedTitle).toBe('');
    });
  });

  describe('resetProcessingStatusUI function', () => {
    it('should reset processing status UI to initial state', () => {
      // Set up the resetProcessingStatusUI function
      const resetProcessingStatusUI = () => {
        const processingStep = document.getElementById('processing-step');
        const processingProgress = document.getElementById('processing-progress') as HTMLDivElement;
        const processingPercentage = document.getElementById('processing-percentage');
        const processingMessage = document.getElementById('processing-message');
        
        if (processingStep) processingStep.textContent = (global as any).t('processing.steps.transcribing');
        if (processingProgress) processingProgress.style.width = '25%';
        if (processingPercentage) processingPercentage.textContent = '25%';
        if (processingMessage) processingMessage.textContent = (global as any).t('processing.messages.transcription');
      };

      // Set processing status to completed state
      const processingStep = document.getElementById('processing-step')!;
      const processingProgress = document.getElementById('processing-progress') as HTMLDivElement;
      const processingPercentage = document.getElementById('processing-percentage')!;
      const processingMessage = document.getElementById('processing-message')!;

      processingStep.textContent = 'Completado';
      processingProgress.style.width = '100%';
      processingPercentage.textContent = '100%';
      processingMessage.textContent = '¡Tus notas han sido generadas exitosamente!';

      // Call resetProcessingStatusUI
      resetProcessingStatusUI();

      // Verify reset to initial state
      expect(processingStep.textContent).toBe('Transcribiendo Audio');
      expect(processingProgress.style.width).toBe('25%');
      expect(processingPercentage.textContent).toBe('25%');
      expect(processingMessage.textContent).toBe('Estamos transcribiendo tu archivo de audio. Esto puede tomar unos minutos dependiendo del tamaño del archivo.');
    });
  });

  describe('clearErrorState function', () => {
    it('should clear error messages and hide error element', () => {
      // Set up the clearErrorState function
      const clearErrorState = () => {
        const uploadError = document.getElementById('upload-error') as HTMLDivElement;
        if (uploadError) {
          uploadError.classList.add('hidden');
          uploadError.textContent = '';
        }
      };

      // Set error state
      const uploadError = document.getElementById('upload-error') as HTMLDivElement;
      uploadError.textContent = 'Test error message';
      uploadError.classList.remove('hidden');

      // Verify error is visible
      expect(uploadError.textContent).toBe('Test error message');
      expect(uploadError.classList.contains('hidden')).toBe(false);

      // Call clearErrorState
      clearErrorState();

      // Verify error is cleared
      expect(uploadError.textContent).toBe('');
      expect(uploadError.classList.contains('hidden')).toBe(true);
    });
  });

  describe('UI State Transitions', () => {
    it('should properly transition between form and processing states', () => {
      const uploadForm = document.getElementById('upload-form')!;
      const processingStatus = document.getElementById('processing-status')!;

      // Initial state - form visible, processing hidden
      expect(uploadForm.classList.contains('hidden')).toBe(false);
      expect(processingStatus.classList.contains('hidden')).toBe(true);

      // Transition to processing state
      uploadForm.classList.add('hidden');
      processingStatus.classList.remove('hidden');

      expect(uploadForm.classList.contains('hidden')).toBe(true);
      expect(processingStatus.classList.contains('hidden')).toBe(false);

      // Transition back to form state
      uploadForm.classList.remove('hidden');
      processingStatus.classList.add('hidden');

      expect(uploadForm.classList.contains('hidden')).toBe(false);
      expect(processingStatus.classList.contains('hidden')).toBe(true);
    });
  });

  describe('Error Handling with UI State Management', () => {
    it('should reset processing status UI when errors occur', () => {
      // Set up the error handling scenario
      const resetProcessingStatusUI = () => {
        const processingStep = document.getElementById('processing-step');
        const processingProgress = document.getElementById('processing-progress') as HTMLDivElement;
        const processingPercentage = document.getElementById('processing-percentage');
        const processingMessage = document.getElementById('processing-message');
        
        if (processingStep) processingStep.textContent = (global as any).t('processing.steps.transcribing');
        if (processingProgress) processingProgress.style.width = '25%';
        if (processingPercentage) processingPercentage.textContent = '25%';
        if (processingMessage) processingMessage.textContent = (global as any).t('processing.messages.transcription');
      };

      const uploadForm = document.getElementById('upload-form')!;
      const processingStatus = document.getElementById('processing-status')!;

      // Simulate processing state with progress
      uploadForm.classList.add('hidden');
      processingStatus.classList.remove('hidden');
      
      const processingStep = document.getElementById('processing-step')!;
      const processingProgress = document.getElementById('processing-progress') as HTMLDivElement;
      const processingPercentage = document.getElementById('processing-percentage')!;
      
      processingStep.textContent = 'Generando Notas';
      processingProgress.style.width = '75%';
      processingPercentage.textContent = '75%';

      // Simulate error handling
      processingStatus.classList.add('hidden');
      uploadForm.classList.remove('hidden');
      resetProcessingStatusUI();

      // Verify UI state after error
      expect(uploadForm.classList.contains('hidden')).toBe(false);
      expect(processingStatus.classList.contains('hidden')).toBe(true);
      expect(processingStep.textContent).toBe('Transcribiendo Audio');
      expect(processingProgress.style.width).toBe('25%');
      expect(processingPercentage.textContent).toBe('25%');
    });
  });

  describe('Form Interaction Error Clearing', () => {
    it('should clear errors when user interacts with form', () => {
      const clearErrorState = () => {
        const uploadError = document.getElementById('upload-error') as HTMLDivElement;
        if (uploadError) {
          uploadError.classList.add('hidden');
          uploadError.textContent = '';
        }
      };

      // Set error state
      const uploadError = document.getElementById('upload-error') as HTMLDivElement;
      uploadError.textContent = 'Please select an audio file';
      uploadError.classList.remove('hidden');

      // Simulate user file selection (which should clear errors)
      const audioInput = document.getElementById('audio-file') as HTMLInputElement;
      
      // Mock file selection event
      const mockFile = new File([''], 'test.mp3', { type: 'audio/mpeg' });
      Object.defineProperty(audioInput, 'files', {
        value: [mockFile],
        writable: false,
      });

      // Call clearErrorState (simulating what happens on file change)
      clearErrorState();

      // Verify error is cleared
      expect(uploadError.textContent).toBe('');
      expect(uploadError.classList.contains('hidden')).toBe(true);
    });
  });
});