import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateSession, createUserClient, requireAuth, createSecureSignedUrl, secureDbOperation } from '../supabase-server';
import type { User } from '@supabase/supabase-js';

// Mock console methods to prevent noise in test output
const originalConsoleError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
});

// Mock the Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      refreshSession: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn()
      }))
    })),
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: vi.fn(),
        upload: vi.fn(),
        download: vi.fn()
      }))
    }
  }))
}));

describe('Supabase Server Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('validateSession', () => {
    it('should return null user when no cookies are present', async () => {
      const request = new Request('http://localhost', {
        headers: {}
      });

      const result = await validateSession(request);
      
      expect(result.user).toBeNull();
      expect(result.error).toBe('No cookies found');
    });

    it('should return null user when no access token is found', async () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: 'other-cookie=value'
        }
      });

      const result = await validateSession(request);
      
      expect(result.user).toBeNull();
      expect(result.error).toBe('No access token found in cookies');
    });

    it('should parse cookies correctly', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      // Mock successful auth response
      const mockSupabaseClient = await import('../supabase-server');
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'getUser').mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const request = new Request('http://localhost', {
        headers: {
          cookie: 'sb-access-token=valid-token; other-cookie=value'
        }
      });

      const result = await validateSession(request);
      
      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
    });

    it('should handle invalid access token', async () => {
      // Mock auth error response
      const mockSupabaseClient = await import('../supabase-server');
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'getUser').mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      });

      const request = new Request('http://localhost', {
        headers: {
          cookie: 'sb-access-token=invalid-token'
        }
      });

      const result = await validateSession(request);
      
      expect(result.user).toBeNull();
      expect(result.error).toBe('Invalid JWT');
    });

    it('should attempt token refresh when access token is invalid but refresh token exists', async () => {
      const mockUser = { id: 'refreshed-user', email: 'refreshed@example.com' };
      
      // Mock auth responses
      const mockSupabaseClient = await import('../supabase-server');
      
      // First call fails with JWT error
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'getUser').mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      });
      
      // Refresh succeeds
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'refreshSession').mockResolvedValue({
        data: { 
          user: mockUser,
          session: { access_token: 'new-token', refresh_token: 'new-refresh' }
        },
        error: null
      });

      const request = new Request('http://localhost', {
        headers: {
          cookie: 'sb-access-token=expired-token; sb-refresh-token=valid-refresh-token'
        }
      });

      const result = await validateSession(request);
      
      expect(result.user).toEqual(mockUser);
      expect(result.error).toBeUndefined();
      expect(mockSupabaseClient.supabaseServer.auth.refreshSession).toHaveBeenCalledWith({
        refresh_token: 'valid-refresh-token'
      });
    });

    it('should handle refresh token failure', async () => {
      // Mock auth responses
      const mockSupabaseClient = await import('../supabase-server');
      
      // First call fails with JWT error
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'getUser').mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      });
      
      // Refresh fails
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'refreshSession').mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid refresh token' }
      });

      const request = new Request('http://localhost', {
        headers: {
          cookie: 'sb-access-token=expired-token; sb-refresh-token=invalid-refresh-token'
        }
      });

      const result = await validateSession(request);
      
      expect(result.user).toBeNull();
      expect(result.error).toBe('Session expired and refresh failed');
    });

    it('should handle unexpected errors during validation', async () => {
      // Mock auth response that throws an error
      const mockSupabaseClient = await import('../supabase-server');
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'getUser').mockRejectedValue(
        new Error('Network error')
      );

      const request = new Request('http://localhost', {
        headers: {
          cookie: 'sb-access-token=valid-token'
        }
      });

      const result = await validateSession(request);
      
      expect(result.user).toBeNull();
      expect(result.error).toBe('Network error');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle malformed cookies', async () => {
      const request = new Request('http://localhost', {
        headers: {
          cookie: 'malformed-cookie'
        }
      });

      const result = await validateSession(request);
      
      expect(result.user).toBeNull();
      expect(result.error).toBe('No access token found in cookies');
    });
  });

  describe('createUserClient', () => {
    it('should create a user client with correct userId', () => {
      const userId = 'user-123';
      const client = createUserClient(userId);

      expect(client.userId).toBe(userId);
      expect(client.from).toBeDefined();
      expect(client.userQuery).toBeDefined();
      expect(client.admin).toBeDefined();
      expect(client.storage).toBeDefined();
    });

    it('should provide storage operations', () => {
      const userId = 'user-123';
      const client = createUserClient(userId);

      expect(client.storage.from).toBeDefined();
      expect(client.storage.createSignedUrl).toBeDefined();
      expect(client.storage.upload).toBeDefined();
    });

    it('should correctly pass userId to userQuery method', async () => {
      const userId = 'user-123';
      const client = createUserClient(userId);
      
      // Mock the Supabase client's from method
      const mockSupabaseClient = await import('../supabase-server');
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue('query-result')
      });
      const mockFrom = vi.fn().mockReturnValue({
        select: mockSelect
      });
      
      vi.spyOn(mockSupabaseClient.supabaseServer, 'from').mockImplementation(mockFrom);
      
      // Call the userQuery method
      const result = client.userQuery('test-table');
      
      // Verify the query was constructed correctly
      expect(mockFrom).toHaveBeenCalledWith('test-table');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(result).toBe('query-result');
    });

    it('should correctly pass parameters to storage.createSignedUrl method', async () => {
      const userId = 'user-123';
      const client = createUserClient(userId);
      
      // Mock the Supabase storage from method
      const mockSupabaseClient = await import('../supabase-server');
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'test-signed-url' },
        error: null
      });
      
      vi.spyOn(mockSupabaseClient.supabaseServer.storage, 'from').mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);
      
      // Call the createSignedUrl method
      await client.storage.createSignedUrl('test-bucket', 'test-path', 7200);
      
      // Verify the method was called with correct parameters
      expect(mockSupabaseClient.supabaseServer.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('test-path', 7200);
    });

    it('should correctly pass parameters to storage.upload method', async () => {
      const userId = 'user-123';
      const client = createUserClient(userId);
      
      // Mock the Supabase storage from method
      const mockSupabaseClient = await import('../supabase-server');
      const mockUpload = vi.fn().mockResolvedValue({
        data: { path: 'uploaded-path' },
        error: null
      });
      
      vi.spyOn(mockSupabaseClient.supabaseServer.storage, 'from').mockReturnValue({
        upload: mockUpload
      } as any);
      
      // Create a mock file
      const mockFile = new Blob(['test content'], { type: 'text/plain' });
      const options = { contentType: 'text/plain' };
      
      // Call the upload method
      await client.storage.upload('test-bucket', 'test-path', mockFile, options);
      
      // Verify the method was called with correct parameters
      expect(mockSupabaseClient.supabaseServer.storage.from).toHaveBeenCalledWith('test-bucket');
      expect(mockUpload).toHaveBeenCalledWith('test-path', mockFile, options);
    });
  });

  describe('requireAuth', () => {
    it('should throw 401 response when user is not authenticated', async () => {
      const request = new Request('http://localhost', {
        headers: {}
      });

      try {
        await requireAuth(request);
        // If we reach here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        expect((error as Response).status).toBe(401);
        
        const responseBody = await (error as Response).json();
        expect(responseBody.error).toBe('Unauthorized');
        expect(responseBody.message).toBe('No cookies found');
      }
    });

    it('should throw 401 with custom error message when authentication fails', async () => {
      // Mock auth error response
      const mockSupabaseClient = await import('../supabase-server');
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'getUser').mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid JWT' }
      });

      const request = new Request('http://localhost', {
        headers: {
          cookie: 'sb-access-token=invalid-token'
        }
      });

      try {
        await requireAuth(request);
        // If we reach here, the test should fail
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(Response);
        expect((error as Response).status).toBe(401);
        
        const responseBody = await (error as Response).json();
        expect(responseBody.error).toBe('Unauthorized');
        expect(responseBody.message).toBe('Invalid JWT');
      }
    });

    it('should return user and client when authenticated', async () => {
      const mockUser = { id: 'user-123', email: 'test@example.com' };
      
      // Mock successful auth response
      const mockSupabaseClient = await import('../supabase-server');
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'getUser').mockResolvedValue({
        data: { user: mockUser },
        error: null
      });

      const request = new Request('http://localhost', {
        headers: {
          cookie: 'sb-access-token=valid-token'
        }
      });

      const result = await requireAuth(request);
      
      expect(result.user).toEqual(mockUser);
      expect(result.client).toBeDefined();
      expect(result.client.userId).toBe(mockUser.id);
    });

    it('should handle token refresh during authentication', async () => {
      const mockUser = { id: 'refreshed-user', email: 'refreshed@example.com' };
      
      // Mock auth responses
      const mockSupabaseClient = await import('../supabase-server');
      
      // First call fails with JWT error
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'getUser').mockResolvedValue({
        data: { user: null },
        error: { message: 'JWT expired' }
      });
      
      // Refresh succeeds
      vi.spyOn(mockSupabaseClient.supabaseServer.auth, 'refreshSession').mockResolvedValue({
        data: { 
          user: mockUser,
          session: { access_token: 'new-token', refresh_token: 'new-refresh' }
        },
        error: null
      });

      const request = new Request('http://localhost', {
        headers: {
          cookie: 'sb-access-token=expired-token; sb-refresh-token=valid-refresh-token'
        }
      });

      const result = await requireAuth(request);
      
      expect(result.user).toEqual(mockUser);
      expect(result.client).toBeDefined();
      expect(result.client.userId).toBe(mockUser.id);
    });
  });

  describe('createSecureSignedUrl', () => {
    it('should create signed URL successfully', async () => {
      const mockSignedUrl = 'https://example.com/signed-url';
      
      const mockSupabaseClient = await import('../supabase-server');
      vi.spyOn(mockSupabaseClient.supabaseServer.storage, 'from').mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: { signedUrl: mockSignedUrl },
          error: null
        })
      } as any);

      const result = await createSecureSignedUrl('test-bucket', 'test-path');
      
      expect(result.url).toBe(mockSignedUrl);
      expect(result.error).toBeUndefined();
    });

    it('should handle errors when creating signed URL', async () => {
      const mockError = { message: 'Storage error' };
      
      const mockSupabaseClient = await import('../supabase-server');
      vi.spyOn(mockSupabaseClient.supabaseServer.storage, 'from').mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: null,
          error: mockError
        })
      } as any);

      const result = await createSecureSignedUrl('test-bucket', 'test-path');
      
      expect(result.url).toBeNull();
      expect(result.error).toBe(mockError.message);
    });
  });

  describe('secureDbOperation', () => {
    it('should execute database operation successfully', async () => {
      const mockData = { id: 1, name: 'test' };
      const operation = vi.fn().mockResolvedValue({
        data: mockData,
        error: null
      });

      const result = await secureDbOperation(operation);
      
      expect(result.data).toEqual(mockData);
      expect(result.error).toBeUndefined();
      expect(operation).toHaveBeenCalled();
    });

    it('should handle database operation errors', async () => {
      const mockError = { message: 'Database error' };
      const operation = vi.fn().mockResolvedValue({
        data: null,
        error: mockError
      });

      const result = await secureDbOperation(operation);
      
      expect(result.data).toBeNull();
      expect(result.error).toBe(mockError.message);
    });

    it('should handle unexpected errors', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Unexpected error'));

      const result = await secureDbOperation(operation);
      
      expect(result.data).toBeNull();
      expect(result.error).toBe('Unexpected error');
    });
  });
});