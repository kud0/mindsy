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

// Mock the auth store's syncGitHubProfile function
vi.mock('../../stores/auth', () => ({
  syncGitHubProfile: vi.fn()
}));

// Mock DOM elements and event listeners
const setupDOM = () => {
  // Create the necessary DOM elements for testing
  document.body.innerHTML = `
    <div id="github-account-section">
      <div id="github-loading" class="hidden"></div>
      <div id="github-connected"></div>
      <div id="github-not-connected" class="hidden"></div>
      <div id="github-message" class="hidden"></div>
      <button id="sync-github-btn">Sync Profile</button>
    </div>
  `;

  // Return references to the elements
  return {
    syncBtn: document.getElementById('sync-github-btn'),
    loadingElement: document.getElementById('github-loading'),
    messageElement: document.getElementById('github-message')
  };
};

describe('GitHub Profile Synchronization', () => {
  let elements: ReturnType<typeof setupDOM>;
  
  beforeEach(() => {
    // Setup DOM elements
    elements = setupDOM();
    
    // Clear mocks
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('should show loading state during synchronization', async () => {
    // Mock successful synchronization
    const mockSyncGitHubProfile = vi.mocked(syncGitHubProfile);
    mockSyncGitHubProfile.mockResolvedValue({ error: null });

    // Get the sync button
    const syncBtn = elements.syncBtn;
    expect(syncBtn).not.toBeNull();

    // Simulate clicking the sync button
    syncBtn?.click();
    
    // Check if the button is disabled and shows loading text
    expect(syncBtn?.disabled).toBe(true);
    expect(syncBtn?.textContent).toBe('Syncing...');
    
    // Wait for the async operation to complete
    await vi.waitFor(() => {
      expect(mockSyncGitHubProfile).toHaveBeenCalled();
    });
    
    // After sync completes, button should be re-enabled
    expect(syncBtn?.disabled).toBe(false);
    expect(syncBtn?.textContent).toBe('Sync Profile');
  });

  it('should display success message after successful synchronization', async () => {
    // Mock successful synchronization
    const mockSyncGitHubProfile = vi.mocked(syncGitHubProfile);
    mockSyncGitHubProfile.mockResolvedValue({ error: null });

    // Get the sync button and message element
    const syncBtn = elements.syncBtn;
    const messageElement = elements.messageElement;
    
    // Simulate clicking the sync button
    syncBtn?.click();
    
    // Wait for the async operation to complete
    await vi.waitFor(() => {
      expect(mockSyncGitHubProfile).toHaveBeenCalled();
    });
    
    // Check if success message is displayed
    expect(messageElement?.classList.contains('hidden')).toBe(false);
    expect(messageElement?.textContent).toBe('Profile synced successfully!');
    expect(messageElement?.className).toContain('text-green-600');
    
    // Wait for message to disappear (setTimeout mock)
    vi.advanceTimersByTime(5000);
    expect(messageElement?.classList.contains('hidden')).toBe(true);
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
    
    // Simulate clicking the sync button
    syncBtn?.click();
    
    // Wait for the async operation to complete
    await vi.waitFor(() => {
      expect(mockSyncGitHubProfile).toHaveBeenCalled();
    });
    
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
    
    // Simulate clicking the sync button
    syncBtn?.click();
    
    // Wait for the async operation to complete
    await vi.waitFor(() => {
      expect(mockSyncGitHubProfile).toHaveBeenCalled();
    });
    
    // Check if error message is displayed
    expect(messageElement?.classList.contains('hidden')).toBe(false);
    expect(messageElement?.textContent).toBe('Failed to sync profile. Please try again.');
    expect(messageElement?.className).toContain('text-red-600');
  });
});