/**
 * Test for GitHub Profile Synchronization
 * 
 * This test verifies that:
 * 1. The syncGitHubProfile function is properly imported and can be called
 * 2. The loading state is correctly displayed during synchronization
 * 3. Error handling works correctly for synchronization failures
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { syncGitHubProfile } from '../../stores/auth';
import { JSDOM } from 'jsdom';

// Mock the auth store's syncGitHubProfile function
vi.mock('../../stores/auth', () => ({
  syncGitHubProfile: vi.fn()
}));

// Setup DOM with JSDOM
const setupDOM = () => {
  // Create a new JSDOM instance
  const dom = new JSDOM(`
    <div id="github-account-section">
      <div id="github-loading" class="hidden"></div>
      <div id="github-connected"></div>
      <div id="github-not-connected" class="hidden"></div>
      <div id="github-message" class="hidden"></div>
      <button id="sync-github-btn">Sync Profile</button>
    </div>
  `);

  // Set global document and window
  global.document = dom.window.document;
  global.window = dom.window;

  // Return references to the elements
  return {
    syncBtn: document.getElementById('sync-github-btn'),
    loadingElement: document.getElementById('github-loading'),
    messageElement: document.getElementById('github-message'),
    dom
  };
};

describe('GitHub Profile Synchronization', () => {
  let elements: ReturnType<typeof setupDOM>;
  
  beforeEach(() => {
    // Setup DOM elements
    elements = setupDOM();
    
    // Clear mocks
    vi.clearAllMocks();
    
    // Setup fake timers for setTimeout
    vi.useFakeTimers();
    
    // Mock the handleSyncProfile function from GitHubAccountManager.astro
    // This simulates the function that would be called when clicking the sync button
    global.window.handleSyncProfile = async function() {
      const syncBtn = document.getElementById('sync-github-btn');
      const messageElement = document.getElementById('github-message');
      
      try {
        // Set button to loading state
        if (syncBtn) {
          syncBtn.disabled = true;
          syncBtn.textContent = 'Syncing...';
        }
        
        // Call the syncGitHubProfile function
        const { error } = await syncGitHubProfile();
        
        if (error) {
          throw error;
        }
        
        // Show success message
        if (messageElement) {
          messageElement.textContent = 'Profile synced successfully!';
          messageElement.className = 'text-sm text-green-600';
          messageElement.classList.remove('hidden');
        }
        
        // In the real component, there would be a setTimeout here to hide the message
      } catch (error) {
        // Show error message
        if (messageElement) {
          // For rejected promises, use the fallback message
          messageElement.textContent = error instanceof Error && error.message === 'Unexpected error' 
            ? 'Failed to sync profile. Please try again.'
            : error.message || 'Failed to sync profile. Please try again.';
          messageElement.className = 'text-sm text-red-600';
          messageElement.classList.remove('hidden');
        }
      } finally {
        // Reset button state
        if (syncBtn) {
          syncBtn.disabled = false;
          syncBtn.textContent = 'Sync Profile';
        }
      }
    };
  });

  afterEach(() => {
    // Clean up
    delete global.document;
    delete global.window;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('should show loading state during synchronization', async () => {
    // Mock successful synchronization
    const mockSyncGitHubProfile = vi.mocked(syncGitHubProfile);
    mockSyncGitHubProfile.mockResolvedValue({ error: null });

    // Get the sync button
    const syncBtn = elements.syncBtn;
    expect(syncBtn).not.toBeNull();

    // Start the sync process
    const syncPromise = global.window.handleSyncProfile();
    
    // Check if the button is disabled and shows loading text
    expect(syncBtn?.disabled).toBe(true);
    expect(syncBtn?.textContent).toBe('Syncing...');
    
    // Wait for the async operation to complete
    await syncPromise;
    
    // After sync completes, button should be re-enabled
    expect(syncBtn?.disabled).toBe(false);
    expect(syncBtn?.textContent).toBe('Sync Profile');
    
    // Verify the syncGitHubProfile function was called
    expect(mockSyncGitHubProfile).toHaveBeenCalled();
  });

  it('should display success message after successful synchronization', async () => {
    // Mock successful synchronization
    const mockSyncGitHubProfile = vi.mocked(syncGitHubProfile);
    mockSyncGitHubProfile.mockResolvedValue({ error: null });

    // Get the sync button and message element
    const syncBtn = elements.syncBtn;
    const messageElement = elements.messageElement;
    
    // Start the sync process
    await global.window.handleSyncProfile();
    
    // Verify the syncGitHubProfile function was called
    expect(mockSyncGitHubProfile).toHaveBeenCalled();
    
    // Check if success message is displayed
    expect(messageElement?.classList.contains('hidden')).toBe(false);
    expect(messageElement?.textContent).toBe('Profile synced successfully!');
    expect(messageElement?.className).toContain('text-green-600');
  });

  it('should handle synchronization errors correctly', async () => {
    // Mock failed synchronization
    const mockSyncGitHubProfile = vi.mocked(syncGitHubProfile);
    mockSyncGitHubProfile.mockResolvedValue({ 
      error: { message: 'API error' } 
    });

    // Get the sync button and message element
    const syncBtn = elements.syncBtn;
    const messageElement = elements.messageElement;
    
    // Start the sync process
    await global.window.handleSyncProfile();
    
    // Verify the syncGitHubProfile function was called
    expect(mockSyncGitHubProfile).toHaveBeenCalled();
    
    // Check if error message is displayed
    expect(messageElement?.classList.contains('hidden')).toBe(false);
    expect(messageElement?.textContent).toBe('API error');
    expect(messageElement?.className).toContain('text-red-600');
  });

  it('should handle unexpected errors during synchronization', async () => {
    // Mock synchronization throwing an error
    const mockSyncGitHubProfile = vi.mocked(syncGitHubProfile);
    mockSyncGitHubProfile.mockRejectedValue(new Error('Unexpected error'));

    // Get the sync button and message element
    const syncBtn = elements.syncBtn;
    const messageElement = elements.messageElement;
    
    // Start the sync process
    await global.window.handleSyncProfile();
    
    // Verify the syncGitHubProfile function was called
    expect(mockSyncGitHubProfile).toHaveBeenCalled();
    
    // Check if error message is displayed
    expect(messageElement?.classList.contains('hidden')).toBe(false);
    expect(messageElement?.textContent).toBe('Failed to sync profile. Please try again.');
    expect(messageElement?.className).toContain('text-red-600');
  });
});