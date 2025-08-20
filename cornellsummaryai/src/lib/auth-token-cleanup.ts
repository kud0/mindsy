/**
 * Auth Token Cleanup Service
 * 
 * Handles cleanup of invalid refresh tokens and auth state recovery.
 * Used by middleware to handle various authentication error scenarios.
 */

export interface TokenCleanupOptions {
  /** Clear all authentication cookies */
  clearCookies?: boolean;
  /** Redirect to login page */
  redirectToLogin?: boolean;
  /** Clear client-side session storage */
  clearSessionStorage?: boolean;
  /** Log the cleanup reason */
  logReason?: string;
}

/**
 * Clean up invalid authentication tokens and state
 */
export async function cleanupAuthTokens(
  request: Request,
  options: TokenCleanupOptions = {}
): Promise<Response | null> {
  const {
    clearCookies = true,
    redirectToLogin = false,
    clearSessionStorage = false,
    logReason = 'Token cleanup requested'
  } = options;

  console.log(`[AuthCleanup] ${logReason}`);

  // Create response headers for cleanup
  const headers = new Headers();

  if (clearCookies) {
    // Clear all Supabase auth cookies
    const cookiesToClear = [
      'sb-access-token',
      'sb-refresh-token',
      'sb-auth-token',
      'supabase-auth-token',
      'supabase.auth.token'
    ];

    cookiesToClear.forEach(cookieName => {
      headers.append('Set-Cookie', `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; Secure; SameSite=Lax`);
    });

    console.log(`[AuthCleanup] Cleared ${cookiesToClear.length} auth cookies`);
  }

  // If redirect requested, create redirect response
  if (redirectToLogin) {
    const url = new URL(request.url);
    const loginUrl = url.pathname.startsWith('/es') ? '/es/auth/login' : '/auth/login';
    
    headers.set('Location', loginUrl);
    
    // Add client-side cleanup script if needed
    if (clearSessionStorage) {
      const cleanupScript = `
        <script>
          if (typeof window !== 'undefined') {
            // Clear session storage
            sessionStorage.clear();
            
            // Clear any client-side auth state
            if (window.localStorage) {
              const authKeys = Object.keys(localStorage).filter(key => 
                key.includes('supabase') || key.includes('auth')
              );
              authKeys.forEach(key => localStorage.removeItem(key));
            }
            
            // Redirect to login
            window.location.href = '${loginUrl}';
          }
        </script>
      `;
      
      return new Response(cleanupScript, {
        status: 302,
        headers: {
          ...Object.fromEntries(headers.entries()),
          'Content-Type': 'text/html'
        }
      });
    }

    return new Response(null, {
      status: 302,
      headers
    });
  }

  // Return headers for middleware to apply
  return new Response(null, {
    status: 200,
    headers
  });
}

/**
 * Categorize authentication errors for appropriate cleanup strategy
 */
export function categorizeAuthError(error: any): {
  category: 'invalid_token' | 'expired_token' | 'network_error' | 'unknown';
  shouldCleanup: boolean;
  shouldRedirect: boolean;
} {
  if (!error) {
    return { category: 'unknown', shouldCleanup: false, shouldRedirect: false };
  }

  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code || error.status;

  // Invalid refresh token - immediate cleanup needed
  if (errorMessage.includes('invalid refresh token') || 
      errorMessage.includes('refresh token not found') ||
      errorCode === 'invalid_refresh_token') {
    return {
      category: 'invalid_token',
      shouldCleanup: true,
      shouldRedirect: true
    };
  }

  // Expired token - cleanup and redirect
  if (errorMessage.includes('expired') || 
      errorMessage.includes('token expired') ||
      errorCode === 'token_expired' ||
      errorCode === 401) {
    return {
      category: 'expired_token',
      shouldCleanup: true,
      shouldRedirect: true
    };
  }

  // Network/connectivity issues - no cleanup needed
  if (errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorCode >= 500) {
    return {
      category: 'network_error',
      shouldCleanup: false,
      shouldRedirect: false
    };
  }

  // Unknown error - conservative approach
  return {
    category: 'unknown',
    shouldCleanup: false,
    shouldRedirect: false
  };
}

/**
 * Create cleanup response based on error categorization
 */
export async function createCleanupResponse(
  request: Request,
  error: any
): Promise<Response | null> {
  const { category, shouldCleanup, shouldRedirect } = categorizeAuthError(error);
  
  if (!shouldCleanup) {
    return null; // No cleanup needed
  }

  const options: TokenCleanupOptions = {
    clearCookies: true,
    redirectToLogin: shouldRedirect,
    clearSessionStorage: category === 'invalid_token',
    logReason: `Auth error: ${category} - ${error.message || 'Unknown error'}`
  };

  return cleanupAuthTokens(request, options);
}

/**
 * Client-side token cleanup utility
 * Can be called from browser scripts to clean up client state
 */
export const clientSideCleanup = `
(function() {
  if (typeof window === 'undefined') return;
  
  // Clear session storage
  if (window.sessionStorage) {
    sessionStorage.clear();
  }
  
  // Clear auth-related localStorage items
  if (window.localStorage) {
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || 
      key.includes('auth') ||
      key.includes('sb-')
    );
    authKeys.forEach(key => localStorage.removeItem(key));
  }
  
  // Clear any global auth state
  if (window.supabase) {
    window.supabase.auth.signOut();
  }
  
  if (window.AuthStore) {
    delete window.AuthStore;
  }
  
  console.log('[AuthCleanup] Client-side cleanup completed');
})();
`;