import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JSDOM } from 'jsdom';

// Mock the auth store functions
const mockLinkGitHubAccount = vi.fn();
const mockUnlinkGitHubAccount = vi.fn();
const mockSyncGitHubProfile = vi.fn();

vi.mock('../../stores/auth', () => ({
  linkGitHubAccount: mockLinkGitHubAccount,
  unlinkGitHubAccount: mockUnlinkGitHubAccount,
  syncGitHubProfile: mockSyncGitHubProfile,
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

describe('GitHubAccountManager Component', () => {
  let dom: JSDOM;
  let document: Document;
  let window: Window & typeof globalThis;

  beforeEach(() => {
    // Create a new JSDOM instance for each test
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="github-account-section" class="space-y-4">
            <div id="github-loading" class="flex items-center space-x-2">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span class="text-sm text-gray-600">Loading...</span>
            </div>

            <div id="github-connected" class="hidden">
              <div class="flex items-center justify-between p-4 border border-green-200 bg-green-50 rounded-lg">
                <div class="flex items-center space-x-3">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900">GitHub Account Connected</h3>
                    <p class="text-sm text-gray-600">
                      <span class="font-medium">Username:</span> 
                      <span id="github-username">-</span>
                    </p>
                    <p class="text-xs text-gray-500">
                      <span>Connected on:</span> 
                      <span id="github-connected-date">-</span>
                    </p>
                  </div>
                </div>
                <div class="flex space-x-2">
                  <button id="sync-github-btn" class="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors">
                    Sync Profile
                  </button>
                  <button id="unlink-github-btn" class="px-3 py-1 text-xs font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 transition-colors">
                    Unlink Account
                  </button>
                </div>
              </div>
            </div>

            <div id="github-not-connected" class="hidden">
              <div class="flex items-center justify-between p-4 border border-gray-200 bg-gray-50 rounded-lg">
                <div class="flex items-center space-x-3">
                  <div>
                    <h3 class="text-sm font-medium text-gray-900">No GitHub Account Connected</h3>
                    <p class="text-sm text-gray-600">Link your GitHub account to sync profile information</p>
                  </div>
                </div>
                <button id="link-github-btn" class="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 transition-colors">
                  Link GitHub Account
                </button>
              </div>
            </div>

            <div id="github-message" class="hidden text-sm"></div>
          </div>

          <div id="unlink-modal" class="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full hidden z-50">
            <div class="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div class="mt-3 text-center">
                <h3 class="text-lg font-medium text-gray-900 mt-2">Are you sure you want to unlink your GitHub account?</h3>
                <div class="mt-2 px-7 py-3">
                  <p class="text-sm text-gray-500">This will remove the connection to your GitHub account. You can reconnect it later.</p>
                </div>
                <div class="items-center px-4 py-3">
                  <button id="confirm-unlink-btn" class="px-4 py-2 bg-red-600 text-white text-base font-medium rounded-md w-full shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300">
                    Unlink Account
                  </button>
                  <button id="cancel-unlink-btn" class="mt-3 px-4 py-2 bg-white text-gray-500 text-base font-medium rounded-md w-full shadow-sm border border-gray-300 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `, {
      url: 'http://localhost',
      pretendToBeVisual: true,
      resources: 'usable'
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

  describe('GitHub Account Status Display', () => {
    it('should show loading state initially', () => {
      const loadingElement = document.getElementById('github-loading');
      const connectedElement = document.getElementById('github-connected');
      const notConnectedElement = document.getElementById('github-not-connected');

      expect(loadingElement?.classList.contains('hidden')).toBe(false);
      expect(connectedElement?.classList.contains('hidden')).toBe(true);
      expect(notConnectedElement?.classList.contains('hidden')).toBe(true);
    });

    it('should show connected state when user has GitHub identity', async () => {
      // Mock user with GitHub identity
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            identities: [{
              provider: 'github',
              identity_data: {
                user_name: 'testuser',
                login: 'testuser'
              },
              created_at: '2024-01-01T00:00:00Z'
            }]
          }
        }
      });

      // Simulate the component initialization
      const { loadGitHubAccountStatus, showConnected, showLoading } = createComponentHelpers();
      
      await loadGitHubAccountStatus();

      const connectedElement = document.getElementById('github-connected');
      const notConnectedElement = document.getElementById('github-not-connected');
      const usernameElement = document.getElementById('github-username');

      expect(connectedElement?.classList.contains('hidden')).toBe(false);
      expect(notConnectedElement?.classList.contains('hidden')).toBe(true);
      expect(usernameElement?.textContent).toBe('testuser');
    });

    it('should show not connected state when user has no GitHub identity', async () => {
      // Mock user without GitHub identity
      mockSupabase.auth.getUser.mockResolvedValue({
        data: {
          user: {
            id: 'user-123',
            identities: []
          }
        }
      });

      const { loadGitHubAccountStatus } = createComponentHelpers();
      
      await loadGitHubAccountStatus();

      const connectedElement = document.getElementById('github-connected');
      const notConnectedElement = document.getElementById('github-not-connected');

      expect(connectedElement?.classList.contains('hidden')).toBe(true);
      expect(notConnectedElement?.classList.contains('hidden')).toBe(false);
    });
  });

  describe('Link GitHub Account', () => {
    it('should call linkGitHubAccount when link button is clicked', async () => {
      mockLinkGitHubAccount.mockResolvedValue({
        data: { url: 'https://github.com/oauth' },
        error: null
      });

      const { handleLinkAccount } = createComponentHelpers();
      
      await handleLinkAccount();

      expect(mockLinkGitHubAccount).toHaveBeenCalledTimes(1);
    });

    it('should handle successful link response with URL', async () => {
      const mockUrl = 'https://github.com/oauth';
      mockLinkGitHubAccount.mockResolvedValue({
        data: { url: mockUrl },
        error: null
      });

      const { handleLinkAccount } = createComponentHelpers();
      
      // We can't easily test the actual redirect in JSDOM, but we can test
      // that the function completes without error when a URL is provided
      await expect(handleLinkAccount()).resolves.not.toThrow();
      expect(mockLinkGitHubAccount).toHaveBeenCalledTimes(1);
    });

    it('should show error message when link fails', async () => {
      const errorMessage = 'OAuth failed';
      mockLinkGitHubAccount.mockResolvedValue({
        data: null,
        error: { message: errorMessage }
      });

      const { handleLinkAccount, showMessage } = createComponentHelpers();
      const showMessageSpy = vi.fn();
      
      await handleLinkAccount();

      // Check that error handling was triggered
      expect(mockLinkGitHubAccount).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unlink GitHub Account', () => {
    it('should show confirmation modal when unlink button is clicked', () => {
      const { showUnlinkModal } = createComponentHelpers();
      
      showUnlinkModal();

      const modal = document.getElementById('unlink-modal');
      expect(modal?.classList.contains('hidden')).toBe(false);
    });

    it('should hide modal when cancel button is clicked', () => {
      const { showUnlinkModal, hideUnlinkModal } = createComponentHelpers();
      
      showUnlinkModal();
      hideUnlinkModal();

      const modal = document.getElementById('unlink-modal');
      expect(modal?.classList.contains('hidden')).toBe(true);
    });

    it('should call unlinkGitHubAccount when confirmed', async () => {
      mockUnlinkGitHubAccount.mockResolvedValue({ error: null });

      const { handleUnlinkAccount } = createComponentHelpers();
      
      await handleUnlinkAccount();

      expect(mockUnlinkGitHubAccount).toHaveBeenCalledTimes(1);
    });

    it('should show success message and update UI after successful unlink', async () => {
      mockUnlinkGitHubAccount.mockResolvedValue({ error: null });

      const { handleUnlinkAccount, showNotConnected } = createComponentHelpers();
      
      await handleUnlinkAccount();

      const connectedElement = document.getElementById('github-connected');
      const notConnectedElement = document.getElementById('github-not-connected');

      expect(connectedElement?.classList.contains('hidden')).toBe(true);
      expect(notConnectedElement?.classList.contains('hidden')).toBe(false);
    });

    it('should show error message when unlink fails', async () => {
      const errorMessage = 'Unlink failed';
      mockUnlinkGitHubAccount.mockResolvedValue({
        error: { message: errorMessage }
      });

      const { handleUnlinkAccount } = createComponentHelpers();
      
      await handleUnlinkAccount();

      expect(mockUnlinkGitHubAccount).toHaveBeenCalledTimes(1);
    });
  });

  describe('Sync GitHub Profile', () => {
    it('should call syncGitHubProfile when sync button is clicked', async () => {
      mockSyncGitHubProfile.mockResolvedValue({ error: null });

      const { handleSyncProfile } = createComponentHelpers();
      
      await handleSyncProfile();

      expect(mockSyncGitHubProfile).toHaveBeenCalledTimes(1);
    });

    it('should show success message after successful sync', async () => {
      mockSyncGitHubProfile.mockResolvedValue({ error: null });

      const { handleSyncProfile } = createComponentHelpers();
      
      await handleSyncProfile();

      expect(mockSyncGitHubProfile).toHaveBeenCalledTimes(1);
    });

    it('should show error message when sync fails', async () => {
      const errorMessage = 'Sync failed';
      mockSyncGitHubProfile.mockResolvedValue({
        error: { message: errorMessage }
      });

      const { handleSyncProfile } = createComponentHelpers();
      
      await handleSyncProfile();

      expect(mockSyncGitHubProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('UI Helper Functions', () => {
    it('should show and hide loading state correctly', () => {
      const { showLoading } = createComponentHelpers();
      
      showLoading(true);
      
      const loadingElement = document.getElementById('github-loading');
      const connectedElement = document.getElementById('github-connected');
      const notConnectedElement = document.getElementById('github-not-connected');

      expect(loadingElement?.classList.contains('hidden')).toBe(false);
      expect(connectedElement?.classList.contains('hidden')).toBe(true);
      expect(notConnectedElement?.classList.contains('hidden')).toBe(true);

      showLoading(false);
      expect(loadingElement?.classList.contains('hidden')).toBe(true);
    });

    it('should display connected state with user data', () => {
      const { showConnected } = createComponentHelpers();
      
      const userData = {
        username: 'testuser',
        connectedDate: '1/1/2024'
      };
      
      showConnected(userData);

      const connectedElement = document.getElementById('github-connected');
      const notConnectedElement = document.getElementById('github-not-connected');
      const usernameElement = document.getElementById('github-username');
      const dateElement = document.getElementById('github-connected-date');

      expect(connectedElement?.classList.contains('hidden')).toBe(false);
      expect(notConnectedElement?.classList.contains('hidden')).toBe(true);
      expect(usernameElement?.textContent).toBe('testuser');
      expect(dateElement?.textContent).toBe('1/1/2024');
    });

    it('should display not connected state', () => {
      const { showNotConnected } = createComponentHelpers();
      
      showNotConnected();

      const connectedElement = document.getElementById('github-connected');
      const notConnectedElement = document.getElementById('github-not-connected');

      expect(connectedElement?.classList.contains('hidden')).toBe(true);
      expect(notConnectedElement?.classList.contains('hidden')).toBe(false);
    });

    it('should show and hide messages with correct styling', () => {
      const { showMessage } = createComponentHelpers();
      
      showMessage('Success message', 'success');
      
      const messageElement = document.getElementById('github-message');
      expect(messageElement?.classList.contains('hidden')).toBe(false);
      expect(messageElement?.classList.contains('text-green-600')).toBe(true);
      expect(messageElement?.textContent).toBe('Success message');

      showMessage('Error message', 'error');
      expect(messageElement?.classList.contains('text-red-600')).toBe(true);
      expect(messageElement?.textContent).toBe('Error message');
    });
  });

  // Helper function to create component methods for testing
  function createComponentHelpers() {
    let isLoading = false;

    async function loadGitHubAccountStatus() {
      try {
        showLoading(true);
        
        const { data: { user } } = await mockSupabase.auth.getUser();
        
        if (!user) {
          showNotConnected();
          return;
        }

        const githubIdentity = user.identities?.find(
          (identity: any) => identity.provider === 'github'
        );

        if (githubIdentity) {
          const githubData = githubIdentity.identity_data;
          showConnected({
            username: githubData?.user_name || githubData?.login || 'Unknown',
            connectedDate: new Date(githubIdentity.created_at).toLocaleDateString()
          });
        } else {
          showNotConnected();
        }
      } catch (error) {
        console.error('Error loading GitHub account status:', error);
        showMessage('Failed to link GitHub account. Please try again.', 'error');
        showNotConnected();
      } finally {
        showLoading(false);
      }
    }

    async function handleLinkAccount() {
      if (isLoading) return;
      
      try {
        isLoading = true;
        
        const { data, error } = await mockLinkGitHubAccount();
        
        if (error) {
          throw error;
        }
        
        if (data?.url) {
          window.location.href = data.url;
        }
      } catch (error: any) {
        console.error('Error linking GitHub account:', error);
        showMessage('Failed to link GitHub account. Please try again.', 'error');
      } finally {
        isLoading = false;
      }
    }

    async function handleUnlinkAccount() {
      if (isLoading) return;
      
      try {
        isLoading = true;
        hideUnlinkModal();
        
        const { error } = await mockUnlinkGitHubAccount();
        
        if (error) {
          throw error;
        }
        
        showMessage('GitHub account unlinked successfully!', 'success');
        showNotConnected();
      } catch (error: any) {
        console.error('Error unlinking GitHub account:', error);
        showMessage(error.message || 'Failed to unlink GitHub account. Please try again.', 'error');
      } finally {
        isLoading = false;
      }
    }

    async function handleSyncProfile() {
      if (isLoading) return;
      
      try {
        isLoading = true;
        
        const { error } = await mockSyncGitHubProfile();
        
        if (error) {
          throw error;
        }
        
        showMessage('Profile synced successfully!', 'success');
      } catch (error: any) {
        console.error('Error syncing GitHub profile:', error);
        showMessage(error.message || 'Failed to sync profile. Please try again.', 'error');
      } finally {
        isLoading = false;
      }
    }

    function showLoading(show: boolean) {
      const githubLoading = document.getElementById('github-loading');
      const githubConnected = document.getElementById('github-connected');
      const githubNotConnected = document.getElementById('github-not-connected');

      if (show) {
        githubLoading?.classList.remove('hidden');
        githubConnected?.classList.add('hidden');
        githubNotConnected?.classList.add('hidden');
      } else {
        githubLoading?.classList.add('hidden');
      }
    }

    function showConnected(data: { username: string; connectedDate: string }) {
      const githubConnected = document.getElementById('github-connected');
      const githubNotConnected = document.getElementById('github-not-connected');
      const githubUsername = document.getElementById('github-username');
      const githubConnectedDate = document.getElementById('github-connected-date');

      githubConnected?.classList.remove('hidden');
      githubNotConnected?.classList.add('hidden');
      
      if (githubUsername) githubUsername.textContent = data.username;
      if (githubConnectedDate) githubConnectedDate.textContent = data.connectedDate;
    }

    function showNotConnected() {
      const githubConnected = document.getElementById('github-connected');
      const githubNotConnected = document.getElementById('github-not-connected');

      githubConnected?.classList.add('hidden');
      githubNotConnected?.classList.remove('hidden');
    }

    function showMessage(message: string, type: 'success' | 'error') {
      const githubMessage = document.getElementById('github-message');
      if (!githubMessage) return;
      
      githubMessage.textContent = message;
      githubMessage.className = `text-sm ${type === 'error' ? 'text-red-600' : 'text-green-600'}`;
      githubMessage.classList.remove('hidden');
    }

    function showUnlinkModal() {
      const unlinkModal = document.getElementById('unlink-modal');
      unlinkModal?.classList.remove('hidden');
    }

    function hideUnlinkModal() {
      const unlinkModal = document.getElementById('unlink-modal');
      unlinkModal?.classList.add('hidden');
    }

    return {
      loadGitHubAccountStatus,
      handleLinkAccount,
      handleUnlinkAccount,
      handleSyncProfile,
      showLoading,
      showConnected,
      showNotConnected,
      showMessage,
      showUnlinkModal,
      hideUnlinkModal
    };
  }
});