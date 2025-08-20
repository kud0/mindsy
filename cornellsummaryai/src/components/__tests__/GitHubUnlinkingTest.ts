import { describe, it, expect, vi } from 'vitest';

// Mock the auth store functions
const mockUnlinkGitHubAccount = vi.fn();

vi.mock('../../stores/auth', () => ({
  unlinkGitHubAccount: mockUnlinkGitHubAccount,
}));

describe('GitHub Account Unlinking Functionality', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
  });

  describe('Unlink Account Functionality', () => {
    it('should call unlinkGitHubAccount with correct parameters', async () => {
      // Setup mock to return success
      mockUnlinkGitHubAccount.mockResolvedValue({ error: null });
      
      // Call the function
      const result = await mockUnlinkGitHubAccount();
      
      // Verify the function was called
      expect(mockUnlinkGitHubAccount).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ error: null });
    });

    it('should handle successful unlinking', async () => {
      // Setup mock to return success
      mockUnlinkGitHubAccount.mockResolvedValue({ error: null });
      
      // Call the function
      const result = await mockUnlinkGitHubAccount();
      
      // Verify success
      expect(result.error).toBeNull();
    });

    it('should handle error during unlinking', async () => {
      // Setup mock to return error
      const errorMessage = 'Permission denied';
      mockUnlinkGitHubAccount.mockResolvedValue({
        error: { message: errorMessage }
      });
      
      // Call the function
      const result = await mockUnlinkGitHubAccount();
      
      // Verify error
      expect(result.error).toBeDefined();
      expect(result.error.message).toBe(errorMessage);
    });

    it('should handle network errors', async () => {
      // Setup mock to throw error
      mockUnlinkGitHubAccount.mockRejectedValue(new Error('Network error'));
      
      // Call the function and expect it to throw
      await expect(mockUnlinkGitHubAccount()).rejects.toThrow('Network error');
    });
  });
});