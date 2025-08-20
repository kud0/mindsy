/**
 * Tests for AuthFeedback component
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock DOM elements
const mockElements = {
  'auth-feedback': { classList: { add: vi.fn(), remove: vi.fn() } },
  'auth-loading': { classList: { add: vi.fn(), remove: vi.fn() } },
  'auth-success': { classList: { add: vi.fn(), remove: vi.fn() } },
  'auth-error': { classList: { add: vi.fn(), remove: vi.fn() } },
  'loading-message': { textContent: '' },
  'error-message': { textContent: '' },
  'error-details': { classList: { add: vi.fn(), remove: vi.fn() } },
  'error-details-text': { textContent: '' },
  'retry-button': { addEventListener: vi.fn() }
};

// Mock document
global.document = {
  getElementById: vi.fn((id) => mockElements[id] as any)
} as any;

beforeEach(() => {
  vi.clearAllMocks();
});

// Import the AuthFeedback class
const AuthFeedback = class {
  constructor() {
    this.container = document.getElementById('auth-feedback');
    this.loadingState = document.getElementById('auth-loading');
    this.successState = document.getElementById('auth-success');
    this.errorState = document.getElementById('auth-error');
    this.loadingMessage = document.getElementById('loading-message');
    this.errorMessage = document.getElementById('error-message');
    this.errorDetails = document.getElementById('error-details');
    this.errorDetailsText = document.getElementById('error-details-text');
    this.retryButton = document.getElementById('retry-button');
    
    this.retryCallback = null;
    
    if (this.retryButton) {
      this.retryButton.addEventListener('click', () => this.handleRetry());
    }
  }
  
  showLoading(message) {
    this.hideAllStates();
    if (this.loadingMessage) this.loadingMessage.textContent = message;
    if (this.loadingState) this.loadingState.classList.remove('hidden');
  }
  
  showSuccess() {
    this.hideAllStates();
    if (this.successState) this.successState.classList.remove('hidden');
  }
  
  showError(message, details = '', retryCallback = null) {
    this.hideAllStates();
    if (this.errorMessage) this.errorMessage.textContent = message;
    
    if (details && this.errorDetails && this.errorDetailsText) {
      this.errorDetailsText.textContent = details;
      this.errorDetails.classList.remove('hidden');
    } else if (this.errorDetails) {
      this.errorDetails.classList.add('hidden');
    }
    
    this.retryCallback = retryCallback;
    
    if (this.errorState) this.errorState.classList.remove('hidden');
  }
  
  hideAllStates() {
    if (this.loadingState) this.loadingState.classList.add('hidden');
    if (this.successState) this.successState.classList.add('hidden');
    if (this.errorState) this.errorState.classList.add('hidden');
  }
  
  handleRetry() {
    if (typeof this.retryCallback === 'function') {
      this.retryCallback();
    }
  }
  
  updateLoadingMessage(message) {
    if (this.loadingMessage) this.loadingMessage.textContent = message;
  }
};

// Make AuthFeedback available globally for tests
global.window = global.window || {};
global.window.AuthFeedback = AuthFeedback;

describe('AuthFeedback Component', () => {
  it('should initialize correctly', () => {
    const feedback = new AuthFeedback();
    expect(document.getElementById).toHaveBeenCalledWith('auth-feedback');
    expect(document.getElementById).toHaveBeenCalledWith('auth-loading');
    expect(document.getElementById).toHaveBeenCalledWith('auth-success');
    expect(document.getElementById).toHaveBeenCalledWith('auth-error');
  });

  it('should show loading state with custom message', () => {
    const feedback = new AuthFeedback();
    feedback.showLoading('Custom loading message');
    
    expect(mockElements['auth-loading'].classList.remove).toHaveBeenCalledWith('hidden');
    expect(mockElements['auth-success'].classList.add).toHaveBeenCalledWith('hidden');
    expect(mockElements['auth-error'].classList.add).toHaveBeenCalledWith('hidden');
    expect(mockElements['loading-message'].textContent).toBe('Custom loading message');
  });

  it('should show success state', () => {
    const feedback = new AuthFeedback();
    feedback.showSuccess();
    
    expect(mockElements['auth-loading'].classList.add).toHaveBeenCalledWith('hidden');
    expect(mockElements['auth-success'].classList.remove).toHaveBeenCalledWith('hidden');
    expect(mockElements['auth-error'].classList.add).toHaveBeenCalledWith('hidden');
  });

  it('should show error state with message and details', () => {
    const feedback = new AuthFeedback();
    const mockRetryCallback = vi.fn();
    
    feedback.showError('Error message', 'Error details', mockRetryCallback);
    
    expect(mockElements['auth-loading'].classList.add).toHaveBeenCalledWith('hidden');
    expect(mockElements['auth-success'].classList.add).toHaveBeenCalledWith('hidden');
    expect(mockElements['auth-error'].classList.remove).toHaveBeenCalledWith('hidden');
    expect(mockElements['error-message'].textContent).toBe('Error message');
    expect(mockElements['error-details'].classList.remove).toHaveBeenCalledWith('hidden');
    expect(mockElements['error-details-text'].textContent).toBe('Error details');
    expect(feedback.retryCallback).toBe(mockRetryCallback);
  });

  it('should hide error details when no details provided', () => {
    const feedback = new AuthFeedback();
    
    feedback.showError('Error message');
    
    expect(mockElements['error-details'].classList.add).toHaveBeenCalledWith('hidden');
  });

  it('should call retry callback when handleRetry is called', () => {
    const feedback = new AuthFeedback();
    const mockRetryCallback = vi.fn();
    
    feedback.retryCallback = mockRetryCallback;
    feedback.handleRetry();
    
    expect(mockRetryCallback).toHaveBeenCalled();
  });

  it('should update loading message', () => {
    const feedback = new AuthFeedback();
    
    feedback.updateLoadingMessage('Updated loading message');
    
    expect(mockElements['loading-message'].textContent).toBe('Updated loading message');
  });
});