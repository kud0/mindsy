import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the auth store functions
vi.mock('../../stores/auth', () => ({
  signInWithGitHub: vi.fn(),
  linkGitHubAccount: vi.fn(),
}));

import { signInWithGitHub, linkGitHubAccount } from '../../stores/auth';

// Mock window.location
const mockLocation = {
  href: '',
  origin: 'http://localhost:3000',
};

Object.defineProperty(global, 'window', {
  value: {
    location: mockLocation,
  },
  writable: true,
});

// Helper function to create a GitHub button component simulation
function createGitHubButton(variant: 'login' | 'signup' | 'link' = 'login', lang: 'en' | 'es' = 'en') {
  const button = {
    disabled: false,
    classList: new Set<string>(),
    dataset: { variant, lang },
    textContent: '',
    click: vi.fn(),
  };

  const buttonText = {
    textContent: variant === 'login' ? 'Sign in with GitHub' : 
                 variant === 'signup' ? 'Sign up with GitHub' : 
                 'Link GitHub Account',
  };

  const loadingSpinner = {
    classList: new Set(['hidden']),
  };

  const errorMessage = {
    classList: new Set(['hidden']),
    textContent: '',
  };

  // Simulate the button click handler logic
  const handleClick = async () => {
    // Hide error
    errorMessage.classList.add('hidden');
    errorMessage.textContent = '';
    
    // Set loading state
    button.disabled = true;
    button.classList.add('opacity-75');
    button.classList.add('cursor-not-allowed');
    loadingSpinner.classList.delete('hidden');
    
    const translations = {
      en: {
        loading: {
          login: 'Signing in...',
          signup: 'Signing up...',
          link: 'Linking account...'
        },
        errors: {
          cancelled: 'GitHub sign-in was cancelled.',
          failed: 'Failed to sign in with GitHub. Please try again.',
          network: 'Network error. Please check your connection and try again.',
          generic: 'An error occurred. Please try again.'
        }
      },
      es: {
        loading: {
          login: 'Iniciando sesión...',
          signup: 'Registrándose...',
          link: 'Vinculando cuenta...'
        },
        errors: {
          cancelled: 'El inicio de sesión con GitHub fue cancelado.',
          failed: 'Error al iniciar sesión con GitHub. Por favor, inténtalo de nuevo.',
          network: 'Error de red. Por favor, verifica tu conexión e inténtalo de nuevo.',
          generic: 'Ocurrió un error. Por favor, inténtalo de nuevo.'
        }
      }
    };

    buttonText.textContent = translations[lang].loading[variant];

    try {
      let result;
      
      if (variant === 'link') {
        result = await linkGitHubAccount();
      } else {
        result = await signInWithGitHub();
      }
      
      if (result.error) {
        // Handle specific error types
        if (result.error.message?.includes('cancelled') || result.error.message?.includes('denied')) {
          errorMessage.textContent = translations[lang].errors.cancelled;
        } else if (result.error.message?.toLowerCase().includes('network') || result.error.message?.toLowerCase().includes('fetch')) {
          errorMessage.textContent = translations[lang].errors.network;
        } else {
          errorMessage.textContent = result.error.message || translations[lang].errors.generic;
        }
        errorMessage.classList.delete('hidden');
        return;
      }

      if (result.data?.url) {
        mockLocation.href = result.data.url;
      } else {
        errorMessage.textContent = translations[lang].errors.failed;
        errorMessage.classList.delete('hidden');
      }
    } catch (error) {
      errorMessage.textContent = translations[lang].errors.generic;
      errorMessage.classList.delete('hidden');
    } finally {
      // Reset loading state
      button.disabled = false;
      button.classList.delete('opacity-75');
      button.classList.delete('cursor-not-allowed');
      loadingSpinner.classList.add('hidden');
      buttonText.textContent = variant === 'login' ? 'Sign in with GitHub' : 
                               variant === 'signup' ? 'Sign up with GitHub' : 
                               'Link GitHub Account';
    }
  };

  button.click.mockImplementation(handleClick);

  return {
    button,
    buttonText,
    loadingSpinner,
    errorMessage,
    handleClick,
  };
}

describe('GitHubSignInButton Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.href = '';
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('Button Rendering', () => {
    it('should render button with correct initial state for login variant', () => {
      const { button, buttonText, loadingSpinner, errorMessage } = createGitHubButton('login', 'en');
      
      expect(button.disabled).toBe(false);
      expect(buttonText.textContent).toBe('Sign in with GitHub');
      expect(loadingSpinner.classList.has('hidden')).toBe(true);
      expect(errorMessage.classList.has('hidden')).toBe(true);
    });

    it('should render button with correct initial state for signup variant', () => {
      const { button, buttonText } = createGitHubButton('signup', 'en');
      
      expect(button.disabled).toBe(false);
      expect(buttonText.textContent).toBe('Sign up with GitHub');
    });

    it('should render button with correct initial state for link variant', () => {
      const { button, buttonText } = createGitHubButton('link', 'en');
      
      expect(button.disabled).toBe(false);
      expect(buttonText.textContent).toBe('Link GitHub Account');
    });

    it('should have correct data attributes', () => {
      const { button } = createGitHubButton('login', 'es');
      
      expect(button.dataset.variant).toBe('login');
      expect(button.dataset.lang).toBe('es');
    });
  });

  describe('Loading States', () => {
    it('should show loading state when button is clicked', async () => {
      const { button, buttonText, loadingSpinner } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { url: 'https://github.com/oauth' }, error: null }), 100))
      );

      // Trigger click and check immediate loading state
      const clickPromise = button.click();
      
      // Check loading state during async operation
      expect(button.disabled).toBe(true);
      expect(button.classList.has('opacity-75')).toBe(true);
      expect(button.classList.has('cursor-not-allowed')).toBe(true);
      expect(loadingSpinner.classList.has('hidden')).toBe(false);
      expect(buttonText.textContent).toBe('Signing in...');

      // Wait for completion
      await clickPromise;
    });

    it('should restore normal state after successful OAuth', async () => {
      const { button, buttonText, loadingSpinner } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: { url: 'https://github.com/oauth/authorize' },
        error: null,
      });

      await button.click();

      expect(mockLocation.href).toBe('https://github.com/oauth/authorize');
      expect(button.disabled).toBe(false);
      expect(button.classList.has('opacity-75')).toBe(false);
      expect(button.classList.has('cursor-not-allowed')).toBe(false);
      expect(loadingSpinner.classList.has('hidden')).toBe(true);
      expect(buttonText.textContent).toBe('Sign in with GitHub');
    });

    it('should restore normal state after error', async () => {
      const { button, buttonText, loadingSpinner } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: null,
        error: { message: 'OAuth failed', name: 'AuthError', status: 400 },
      });

      await button.click();

      expect(button.disabled).toBe(false);
      expect(button.classList.has('opacity-75')).toBe(false);
      expect(button.classList.has('cursor-not-allowed')).toBe(false);
      expect(loadingSpinner.classList.has('hidden')).toBe(true);
      expect(buttonText.textContent).toBe('Sign in with GitHub');
    });
  });

  describe('Error Handling', () => {
    it('should display error message when OAuth fails', async () => {
      const { button, errorMessage } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: null,
        error: { message: 'OAuth failed', name: 'AuthError', status: 400 },
      });

      await button.click();

      expect(errorMessage.classList.has('hidden')).toBe(false);
      expect(errorMessage.textContent).toBe('OAuth failed');
    });

    it('should display cancelled error for cancelled OAuth', async () => {
      const { button, errorMessage } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: null,
        error: { message: 'User cancelled OAuth', name: 'AuthError', status: 400 },
      });

      await button.click();

      expect(errorMessage.textContent).toBe('GitHub sign-in was cancelled.');
    });

    it('should display network error for network issues', async () => {
      const { button, errorMessage } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: null,
        error: { message: 'Network error occurred', name: 'AuthError', status: 500 },
      });

      await button.click();

      expect(errorMessage.textContent).toBe('Network error. Please check your connection and try again.');
    });

    it('should display generic error for unknown errors', async () => {
      const { button, errorMessage } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: null,
        error: { message: 'Unknown error', name: 'AuthError', status: 500 },
      });

      await button.click();

      expect(errorMessage.textContent).toBe('Unknown error');
    });

    it('should handle unexpected exceptions', async () => {
      const { button, errorMessage } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockRejectedValue(new Error('Unexpected error'));

      await button.click();

      expect(errorMessage.textContent).toBe('An error occurred. Please try again.');
    });

    it('should hide error message when button is clicked again', async () => {
      const { button, errorMessage } = createGitHubButton('login', 'en');
      
      // First click with error
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: null,
        error: { message: 'OAuth failed', name: 'AuthError', status: 400 },
      });

      await button.click();
      expect(errorMessage.classList.has('hidden')).toBe(false);

      // Second click should hide error
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: { url: 'https://github.com/oauth' },
        error: null,
      });

      await button.click();
      expect(errorMessage.classList.has('hidden')).toBe(true);
    });
  });

  describe('Variant Handling', () => {
    it('should call signInWithGitHub for login variant', async () => {
      const { button } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: { url: 'https://github.com/oauth' },
        error: null,
      });

      await button.click();

      expect(signInWithGitHub).toHaveBeenCalled();
      expect(linkGitHubAccount).not.toHaveBeenCalled();
    });

    it('should call signInWithGitHub for signup variant', async () => {
      const { button } = createGitHubButton('signup', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: { url: 'https://github.com/oauth' },
        error: null,
      });

      await button.click();

      expect(signInWithGitHub).toHaveBeenCalled();
      expect(linkGitHubAccount).not.toHaveBeenCalled();
    });

    it('should call linkGitHubAccount for link variant', async () => {
      const { button } = createGitHubButton('link', 'en');
      
      vi.mocked(linkGitHubAccount).mockResolvedValue({
        data: { url: 'https://github.com/oauth' },
        error: null,
      });

      await button.click();

      expect(linkGitHubAccount).toHaveBeenCalled();
      expect(signInWithGitHub).not.toHaveBeenCalled();
    });
  });

  describe('Multi-language Support', () => {
    it('should use English loading text for English locale', async () => {
      const { button, buttonText } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { url: 'https://github.com/oauth' }, error: null }), 100))
      );

      const clickPromise = button.click();
      expect(buttonText.textContent).toBe('Signing in...');
      await clickPromise;
    });

    it('should use Spanish loading text for Spanish locale', async () => {
      const { button, buttonText } = createGitHubButton('login', 'es');
      
      vi.mocked(signInWithGitHub).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { url: 'https://github.com/oauth' }, error: null }), 100))
      );

      const clickPromise = button.click();
      expect(buttonText.textContent).toBe('Iniciando sesión...');
      await clickPromise;
    });

    it('should display Spanish error messages for Spanish locale', async () => {
      const { button, errorMessage } = createGitHubButton('login', 'es');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: null,
        error: { message: 'User cancelled OAuth', name: 'AuthError', status: 400 },
      });

      await button.click();

      expect(errorMessage.textContent).toBe('El inicio de sesión con GitHub fue cancelado.');
    });
  });

  describe('Button Text Variants', () => {
    it('should show correct loading text for signup variant', async () => {
      const { button, buttonText } = createGitHubButton('signup', 'en');
      
      vi.mocked(signInWithGitHub).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { url: 'https://github.com/oauth' }, error: null }), 100))
      );

      const clickPromise = button.click();
      expect(buttonText.textContent).toBe('Signing up...');
      await clickPromise;
    });

    it('should show correct loading text for link variant', async () => {
      const { button, buttonText } = createGitHubButton('link', 'en');
      
      vi.mocked(linkGitHubAccount).mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ data: { url: 'https://github.com/oauth' }, error: null }), 100))
      );

      const clickPromise = button.click();
      expect(buttonText.textContent).toBe('Linking account...');
      await clickPromise;
    });
  });

  describe('OAuth Response Handling', () => {
    it('should handle missing redirect URL', async () => {
      const { button, errorMessage } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: {},
        error: null,
      });

      await button.click();

      expect(errorMessage.textContent).toBe('Failed to sign in with GitHub. Please try again.');
    });

    it('should redirect to OAuth URL when provided', async () => {
      const { button } = createGitHubButton('login', 'en');
      
      vi.mocked(signInWithGitHub).mockResolvedValue({
        data: { url: 'https://github.com/oauth/authorize?client_id=123' },
        error: null,
      });

      await button.click();

      expect(mockLocation.href).toBe('https://github.com/oauth/authorize?client_id=123');
    });
  });
});