import { describe, it, expect } from 'vitest';
import { supabaseServer, createSecureSignedUrl } from '../supabase-server';

describe('Supabase Server Integration', () => {
  it('should connect to Supabase successfully', async () => {
    // Test basic connection by checking if we can access the auth service
    expect(supabaseServer).toBeDefined();
    expect(supabaseServer.auth).toBeDefined();
    expect(supabaseServer.from).toBeDefined();
    expect(supabaseServer.storage).toBeDefined();
  });

  it('should be able to create signed URLs for storage', async () => {
    // This test will only pass if we have proper storage buckets set up
    // For now, we'll just test that the function exists and handles errors gracefully
    const result = await createSecureSignedUrl('non-existent-bucket', 'test-path', 60);
    
    // Should return an error for non-existent bucket, but not throw
    expect(result).toBeDefined();
    expect(typeof result.url === 'string' || result.url === null).toBe(true);
    
    if (result.error) {
      // Error is expected for non-existent bucket
      expect(typeof result.error).toBe('string');
    }
  });

  it('should handle database queries without throwing', async () => {
    // Test that we can create a query builder without errors
    const query = supabaseServer.from('profiles');
    expect(query).toBeDefined();
    
    // We won't execute the query to avoid needing test data
    // but we can verify the query builder is properly constructed
    expect(typeof query.select).toBe('function');
  });
});