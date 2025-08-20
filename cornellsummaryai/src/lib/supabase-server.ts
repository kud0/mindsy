import { createClient } from '@supabase/supabase-js';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;
import type { User } from '@supabase/supabase-js';

// Environment variables
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Admin client with service role key for admin operations only
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Modern SSR client factory (preferred for most operations)
export function createSupabaseServerClient(cookies: any) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookies.get(name)?.value;
      },
      set(name: string, value: string, options: any) {
        cookies.set(name, value, options);
      },
      remove(name: string, options: any) {
        cookies.delete(name, options);
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Simple session validation using SSR client
 * Use middleware locals.user instead - this is for legacy compatibility only
 * @deprecated Use middleware locals.user for authenticated operations
 */
export async function validateSession(request: Request): Promise<{
  user: User | null;
  isOAuthUser?: boolean;
  oauthProvider?: string;
  error?: string;
}> {
  console.warn('⚠️ validateSession() is deprecated. Use middleware locals.user instead.');
  
  try {
    // Parse cookies manually for legacy compatibility
    const cookies = request.headers.get('cookie');
    if (!cookies) {
      return { user: null, error: 'No cookies found' };
    }

    // Create mock cookies object for SSR client
    const cookieMap = new Map<string, string>();
    cookies.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        cookieMap.set(key.trim(), decodeURIComponent(value));
      }
    });

    const mockCookies = {
      get: (name: string) => ({ value: cookieMap.get(name) }),
      set: () => {},
      remove: () => {},
    };

    // Use SSR client for validation
    const supabase = createSupabaseServerClient(mockCookies);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      return { user: null, error: error.message };
    }

    if (!user) {
      return { user: null, error: 'Invalid session' };
    }

    // Basic OAuth detection
    const oauthInfo = validateOAuthIdentities(user);
    return { user, ...oauthInfo };
  } catch (error) {
    console.error('Session validation error:', error);
    return { 
      user: null, 
      error: error instanceof Error ? error.message : 'Unknown authentication error' 
    };
  }
}

/**
 * Helper function to validate OAuth identities in user object
 * @param user - The authenticated user object
 * @returns OAuth information including provider and validation status
 */
function validateOAuthIdentities(user: User): {
  isOAuthUser: boolean;
  oauthProvider?: string;
} {
  if (!user.identities || user.identities.length === 0) {
    return { isOAuthUser: false };
  }

  // Check for GitHub OAuth identity
  const githubIdentity = user.identities.find(identity => identity.provider === 'github');
  if (githubIdentity) {
    return {
      isOAuthUser: true,
      oauthProvider: 'github'
    };
  }

  // Check for Google OAuth identity
  const googleIdentity = user.identities.find(identity => identity.provider === 'google');
  if (googleIdentity) {
    return {
      isOAuthUser: true,
      oauthProvider: 'google'
    };
  }

  // Check for other OAuth providers (extensible for future providers)
  const oauthIdentity = user.identities.find(identity => 
    identity.provider !== 'email' && identity.provider !== 'phone'
  );
  
  if (oauthIdentity) {
    return {
      isOAuthUser: true,
      oauthProvider: oauthIdentity.provider
    };
  }

  return { isOAuthUser: false };
}

/**
 * GitHub profile validation using admin client
 * @param user - The authenticated user with GitHub identity
 * @returns Validation result with status and error details
 */
async function validateGitHubOAuthSession(user: User): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    const githubIdentity = user.identities?.find(identity => identity.provider === 'github');
    
    if (!githubIdentity) {
      return { isValid: false, error: 'No GitHub identity found' };
    }

    // Validate GitHub identity data structure
    const identityData = githubIdentity.identity_data;
    if (!identityData || !identityData.sub) {
      return { isValid: false, error: 'Invalid GitHub identity data' };
    }

    // Use admin client for profile validation
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, github_id, github_username')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile for GitHub validation:', profileError);
      return { isValid: false, error: 'Profile validation failed' };
    }

    // Verify GitHub ID consistency between identity and profile
    const githubId = identityData.sub || identityData.id;
    if (profile.github_id && profile.github_id !== githubId.toString()) {
      return { 
        isValid: false, 
        error: 'GitHub identity mismatch - potential security issue' 
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('GitHub OAuth session validation error:', error);
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'GitHub validation failed' 
    };
  }
}

/**
 * Google profile validation using admin client
 * @param user - The authenticated user with Google identity
 * @returns Validation result with status and error details
 */
async function validateGoogleOAuthSession(user: User): Promise<{
  isValid: boolean;
  error?: string;
}> {
  try {
    const googleIdentity = user.identities?.find(identity => identity.provider === 'google');
    
    if (!googleIdentity) {
      return { isValid: false, error: 'No Google identity found' };
    }

    // Validate Google identity data structure
    const identityData = googleIdentity.identity_data;
    if (!identityData || !identityData.sub) {
      return { isValid: false, error: 'Invalid Google identity data' };
    }

    // Use admin client for profile validation
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, google_id, google_email')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile for Google validation:', profileError);
      return { isValid: false, error: 'Profile validation failed' };
    }

    // Verify Google ID consistency between identity and profile
    const googleId = identityData.sub || identityData.id;
    if (profile.google_id && profile.google_id !== googleId.toString()) {
      return { 
        isValid: false, 
        error: 'Google identity mismatch - potential security issue' 
      };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Google OAuth session validation error:', error);
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Google validation failed' 
    };
  }
}

/**
 * Utility function for secure database operations with user context
 * @param userId - The authenticated user's ID
 * @returns Admin client configured for the specific user operations
 */
export function createUserClient(userId: string) {
  return {
    // Helper for user-scoped queries - returns a query builder that can be chained
    from: (table: string) => {
      return supabaseAdmin.from(table);
    },
    
    // Helper to get user-scoped query builder
    userQuery: (table: string) => {
      return supabaseAdmin.from(table).select('*').eq('user_id', userId);
    },
    
    // Direct access to admin client for admin operations
    admin: supabaseAdmin,
    
    // User ID for reference
    userId,
    
    // Storage operations with user context
    storage: {
      from: (bucket: string) => supabaseAdmin.storage.from(bucket),
      createSignedUrl: async (bucket: string, path: string, expiresIn: number = 3600) => {
        return supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
      },
      upload: async (bucket: string, path: string, file: File | ArrayBuffer, options?: any) => {
        return supabaseAdmin.storage.from(bucket).upload(path, file, options);
      }
    }
  };
}

/**
 * Middleware function to authenticate requests and extract user
 * Enhanced to support OAuth authentication and provide OAuth context
 * @param request - The incoming request
 * @returns Object with user, OAuth info, and helper functions, or throws error if unauthorized
 */
export async function requireAuthOld(request: Request) {
  try {
    // Parse cookies manually for direct auth check
    const cookies = request.headers.get('cookie');
    if (!cookies) {
      throw new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'No authentication cookies found' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create mock cookies object for SSR client
    const cookieMap = new Map<string, string>();
    cookies.split(';').forEach(cookie => {
      const [key, value] = cookie.trim().split('=');
      if (key && value) {
        cookieMap.set(key.trim(), decodeURIComponent(value));
      }
    });

    const mockCookies = {
      get: (name: string) => ({ value: cookieMap.get(name) }),
      set: () => {},
      remove: () => {},
    };

    const supabase = createSupabaseServerClient(mockCookies);
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      throw new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: error?.message || 'Authentication required' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if user is OAuth user (has GitHub provider)
    const isOAuthUser = user.app_metadata?.provider === 'github';
    const oauthProvider = user.app_metadata?.provider;

    return {
      user,
      client: createUserClient(user.id),
      isOAuthUser: isOAuthUser || false,
      oauthProvider,
      // Helper method to check if user authenticated via specific OAuth provider
      isAuthenticatedVia: (provider: string) => oauthProvider === provider,
      // Helper method to get OAuth identity data
      getOAuthIdentity: (provider?: string) => {
        if (!user.identities) return null;
        
        if (provider) {
          return user.identities.find(identity => identity.provider === provider) || null;
        }
        
        // Return first OAuth identity (non-email/phone)
        return user.identities.find(identity => 
          identity.provider !== 'email' && identity.provider !== 'phone'
        ) || null;
      }
    };
  } catch (error) {
    throw new Response(JSON.stringify({ 
      error: 'Unauthorized', 
      message: 'Authentication failed' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Utility function to create secure signed URLs for file access
 * @param bucket - Storage bucket name
 * @param path - File path in bucket
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Promise with signed URL or error
 */
export async function createSecureSignedUrl(
  bucket: string, 
  path: string, 
  expiresIn: number = 3600
): Promise<{ url: string | null; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      return { url: null, error: error.message };
    }

    return { url: data.signedUrl };
  } catch (error) {
    console.error('Error creating signed URL:', error);
    return { 
      url: null, 
      error: error instanceof Error ? error.message : 'Failed to create signed URL' 
    };
  }
}

/**
 * Utility function for secure database operations with error handling
 * @param operation - Database operation function
 * @returns Promise with result or error
 */
// Convenience export for compatibility with pages  
export { createSupabaseServerClient as createClient };

// Astro-compatible requireAuth function
export async function requireAuth(cookies: any) {
  const supabase = createSupabaseServerClient(cookies);
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return {
      user: null,
      response: new Response(null, {
        status: 302,
        headers: {
          Location: '/auth/login'
        }
      })
    };
  }
  
  return { 
    user, 
    client: createUserClient(user.id),
    response: null 
  };
}

export async function secureDbOperation<T>(
  operation: () => Promise<{ data: T; error: any }>
): Promise<{ data: T | null; error?: string }> {
  try {
    const { data, error } = await operation();
    
    if (error) {
      console.error('Database operation error:', error);
      return { data: null, error: error.message };
    }

    return { data };
  } catch (error) {
    console.error('Unexpected database error:', error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : 'Database operation failed' 
    };
  }
}