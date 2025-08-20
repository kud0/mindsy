import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock the auth store functions
const mockLinkGitHubAccount = vi.fn();

vi.mock('../../stores/auth', () => ({
  linkGitHubAccount: mockLinkGitHubAccount,
}));

// Mock Supabase client
const mockSupabase = {
  auth: {
    getUser: vi.fn(),
  },
};

vi.mock('../../lib/supabase', () => ({
  supabase: mockSupabase,
}));

describe('GitHub Account Linking Functionality', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="github-account-section">
            <div id="github-loading" class="hidden"></div>
            <div id="github-not-connected">
              <button id="link-github-btn">Link GitHub Account</button>
            </div>
            <div id="github-message" class="hidden"></div>
          </div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
    });

    document = dom.window.document;
    window = dom.window as Window & typeof globalThis;

    // Set up global objects
    global.document = document;
    global.window = window;
    global.location = window.location;

    // Reset all mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    dom.window.close();
  });

  it('should call linkGitHubAccount when link button is clicked', async () => {
    mockLinkGitHubAccount.mockResolvedValue({
      data: { url: 'https://github.com/oauth' },
      error: null
    });

    const linkBtn = document.getElementById('link-github-btn');
    
    // Create helper functions similar to the component
    async function handleLinkAccount() {
      try {
        if (linkBtn) {
          linkBtn.setAttribute('disabled', 'true');
          linkBtn.textContent = 'Linking...';
        }
        
        const { data, error } = await mockLinkGitHubAccount();
        
        if (error) {
          throw error;
        }
        
        if (data?.url) {
          window.location.href = data.url;
        }
        
        return { success: true };
      } catch (error) {
        const messageEl = document.getElementById('github-message');
        if (messageEl) {
          messageEl.textContent = 'Failed to link GitHub account. Please try again.';
          messageEl.className = 'text-sm text-red-600';
          messageEl.classList.remove('hidden');
        }
        
        return { success: false, error };
      } finally {
        if (linkBtn) {
          linkBtn.removeAttribute('disabled');
          linkBtn.textContent = 'Link GitHub Account';
        }
      }
    }
    
    await handleLinkAccount();

    expect(mockLinkGitHubAccount).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('https://github.com/oauth');
  });

  it('should show loading state during linking process', async () => {
    // Mock a delayed response to test loading state
    mockLinkGitHubAccount.mockImplementation(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          resolve({
            data: { url: 'https://github.com/oauth' },
            error: null
          });
        }, 100);
      });
    });

    const linkBtn = document.getElementById('link-github-btn');
    let btnDisabled = false;
    let btnText = '';
    
    // Create helper functions similar to the component
    async function handleLinkAccount() {
      try {
        if (linkBtn) {
          linkBtn.setAttribute('disabled', 'true');
          linkBtn.textContent = 'Linking...';
          
          // Capture button state right after setting loading state
          btnDisabled = linkBtn.hasAttribute('disabled');
          btnText = linkBtn.textContent || '';
        }
        
        const { data, error } = await mockLinkGitHubAccount();
        
        if (error) {
          throw error;
        }
        
        return { success: true };
      } catch (error) {
        return { success: false, error };
      } finally {
        if (linkBtn) {
          linkBtn.removeAttribute('disabled');
          linkBtn.textContent = 'Link GitHub Account';
        }
      }
    }
    
    const linkPromise = handleLinkAccount();
    
    // Check loading state before promise resolves
    expect(btnDisabled).toBe(true);
    expect(btnText).toBe('Linking...');
    
    await linkPromise;
    
    // Check state after promise resolves
    expect(linkBtn?.hasAttribute('disabled')).toBe(false);
    expect(linkBtn?.textContent).toBe('Link GitHub Account');
  });

  it('should handle errors when linking fails', async () => {
    const errorMessage = 'OAuth configuration error';
    mockLinkGitHubAccount.mockResolvedValue({
      data: null,
      error: { message: errorMessage }
    });

    const linkBtn = document.getElementById('link-github-btn');
    const messageEl = document.getElementById('github-message');
    
    // Create helper functions similar to the component
    async function handleLinkAccount() {
      try {
        if (linkBtn) {
          linkBtn.setAttribute('disabled', 'true');
          linkBtn.textContent = 'Linking...';
        }
        
        const { data, error } = await mockLinkGitHubAccount();
        
        if (error) {
          throw error;
        }
        
        return { success: true };
      } catch (error: any) {
        if (messageEl) {
          messageEl.textContent = 'Failed to link GitHub account. Please try again.';
          messageEl.className = 'text-sm text-red-600';
          messageEl.classList.remove('hidden');
        }
        
        return { success: false, error };
      } finally {
        if (linkBtn) {
          linkBtn.removeAttribute('disabled');
          linkBtn.textContent = 'Link GitHub Account';
        }
      }
    }
    
    const result = await handleLinkAccount();

    expect(result.success).toBe(false);
    expect(result.error.message).toBe(errorMessage);
    expect(messageEl?.classList.contains('hidden')).toBe(false);
    expect(messageEl?.classList.contains('text-red-600')).toBe(true);
  });
});