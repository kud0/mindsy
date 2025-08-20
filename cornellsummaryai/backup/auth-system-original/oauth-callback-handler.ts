/**
 * OAuth Callback Handler
 * 
 * Comprehensive OAuth callback processing for Supabase GitHub authentication including:
 * - Proper session extraction from URL parameters/hash
 * - Enhanced error handling for OAuth callback failures
 * - OAuth state cleanup after successful authentication
 * - Session synchronization with cookies
 * - Recovery mechanisms for failed callbacks
 */

import { supabase } from './supabase';
import { AuthCookieManager } from './auth-cookie-manager';
import { OAuthErrorHandler, type OAuthErrorContext } from './oauth-error-handler';
import { OAuthError, OAuthErrorType } from './oauth-security';
import type { Session, AuthError } from '@supabase/supabase-js';

/**
 * OAuth callback processing result
 */
export interface OAuthCallbackResult {
  success: boolean;
  session?: Session;
  error?: string;
  redirectUrl?: string;
  requiresEmailVerification?: boolean;
  isAccountLinking?: boolean;
}

/**
 * OAuth callback context for error handling
 */
interface CallbackContext {
  url: string;
  isLinking: boolean;
  hasCode: boolean;
  hasError: boolean;
  userAgent?: string;
}

/**
 * OAuth Callback Handler class
 */
export class OAuthCallbackHandler {
  /**
   * Process OAuth callback from URL with comprehensive error handling
   */
  static async handleCallback(url: URL): Promise<OAuthCallbackResult> {
    const context: CallbackContext = {
      url: url.toString(),
      isLinking: url.searchParams.get('linking') === 'true',
      hasCode: !!url.searchParams.get('code'),
      hasError: !!url.searchParams.get('error'),
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
    };

    const oauthContext: OAuthErrorContext = {
      flow: context.isLinking ? 'link_account' : 'sign_in',
      provider: 'github',
      userAgent: context.userAgent,
      step: 'callback_processing'
    };

    try {
      // Check for OAuth errors in URL parameters
      const error = url.searchParams.get('error');
      const errorDescription = url.searchParams.get('error_description');
      
      if (error) {
        return this.handleOAuthError(error, errorDescription, oauthContext);
      }

      // Validate OAuth state parameter if present
      const state = url.searchParams.get('state');
      if (state && typeof window !== 'undefined') {
        const expectedState = sessionStorage.getItem('oauth_state');
        if (expectedState && !OAuthErrorHandler.validateOAuthState(state, expectedState)) {
          return this.handleOAuthError(
            'invalid_state',
            'OAuth state parameter validation failed',
            oauthContext
          );
        }
      }

      // Process the OAuth callback with Supabase
      const sessionResult = await this.processSupabaseCallback(url, context, oauthContext);
      
      if (!sessionResult.success) {
        return sessionResult;
      }

      // Clean up OAuth state after successful authentication
      this.cleanupOAuthState();

      // Determine redirect URL based on context
      const redirectUrl = this.determineRedirectUrl(url, context);

      return {
        success: true,
        session: sessionResult.session,
        redirectUrl,
        isAccountLinking: context.isLinking
      };

    } catch (error) {
      console.error('[OAuthCallback] Unexpected error during callback processing:', error);
      
      const errorRecovery = OAuthErrorHandler.handleError(error as Error, oauthContext);
      
      return {
        success: false,
        error: errorRecovery.userMessage
      };
    }
  }

  /**
   * Process Supabase OAuth callback and establish session
   */
  private static async processSupabaseCallback(
    url: URL,
    context: CallbackContext,
    oauthContext: OAuthErrorContext
  ): Promise<OAuthCallbackResult> {
    try {
      // First, try to get the current session from Supabase
      const { data: { session: currentSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.warn('[OAuthCallback] Error getting current session:', sessionError);
      }

      // If we already have a valid session, use it
      if (currentSession && this.isSessionValid(currentSession)) {
        console.log('[OAuthCallback] Using existing valid session');
        
        // Ensure cookies are synchronized
        const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(currentSession);
        if (!cookiesSynced) {
          console.warn('[OAuthCallback] Failed to sync cookies with existing session');
        }

        return {
          success: true,
          session: currentSession
        };
      }

      // Try to extract session from URL fragments (for implicit flow)
      const fragmentSession = await this.extractSessionFromUrlFragments(url);
      if (fragmentSession) {
        console.log('[OAuthCallback] Successfully extracted session from URL fragments');
        
        // Set the session in Supabase
        const { data: sessionData, error: setSessionError } = await supabase.auth.setSession({
          access_token: fragmentSession.access_token,
          refresh_token: fragmentSession.refresh_token
        });

        if (setSessionError) {
          console.error('[OAuthCallback] Error setting session from fragments:', setSessionError);
          const errorRecovery = OAuthErrorHandler.handleError(setSessionError, oauthContext);
          return {
            success: false,
            error: errorRecovery.userMessage
          };
        }

        if (sessionData.session) {
          // Synchronize cookies with new session
          const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(sessionData.session);
          if (!cookiesSynced) {
            console.warn('[OAuthCallback] Failed to sync cookies with new session');
          }

          return {
            success: true,
            session: sessionData.session
          };
        }
      }

      // If we have an authorization code, let Supabase handle the exchange
      const code = url.searchParams.get('code');
      if (code) {
        console.log('[OAuthCallback] Processing authorization code');
        
        // Wait a moment for Supabase to process the callback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Try to get the session again after code processing
        const { data: { session: newSession }, error: newSessionError } = await supabase.auth.getSession();
        
        if (newSessionError) {
          console.error('[OAuthCallback] Error getting session after code processing:', newSessionError);
          const errorRecovery = OAuthErrorHandler.handleError(newSessionError, oauthContext);
          return {
            success: false,
            error: errorRecovery.userMessage
          };
        }

        if (newSession && this.isSessionValid(newSession)) {
          console.log('[OAuthCallback] Successfully obtained session after code processing');
          
          // Synchronize cookies with new session
          const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(newSession);
          if (!cookiesSynced) {
            console.warn('[OAuthCallback] Failed to sync cookies after code processing');
          }

          return {
            success: true,
            session: newSession
          };
        }
      }

      // If we still don't have a session, try a recovery approach
      console.log('[OAuthCallback] Attempting session recovery');
      const recoveryResult = await this.attemptSessionRecovery(oauthContext);
      
      if (recoveryResult.success) {
        return recoveryResult;
      }

      // Final fallback - no session could be established
      const errorRecovery = OAuthErrorHandler.handleError(
        new OAuthError('No session found after OAuth callback', OAuthErrorType.PROVIDER_ERROR),
        oauthContext
      );

      return {
        success: false,
        error: errorRecovery.userMessage
      };

    } catch (error) {
      console.error('[OAuthCallback] Error processing Supabase callback:', error);
      
      const errorRecovery = OAuthErrorHandler.handleError(error as Error, oauthContext);
      
      return {
        success: false,
        error: errorRecovery.userMessage
      };
    }
  }

  /**
   * Extract session tokens from URL fragments (for implicit OAuth flow)
   */
  private static async extractSessionFromUrlFragments(url: URL): Promise<{
    access_token: string;
    refresh_token: string;
  } | null> {
    try {
      // Check URL hash for tokens (implicit flow)
      const hash = url.hash.substring(1);
      if (hash) {
        const hashParams = new URLSearchParams(hash);
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (accessToken && refreshToken) {
          return {
            access_token: accessToken,
            refresh_token: refreshToken
          };
        }
      }

      // Also check search parameters as fallback
      const accessToken = url.searchParams.get('access_token');
      const refreshToken = url.searchParams.get('refresh_token');

      if (accessToken && refreshToken) {
        return {
          access_token: accessToken,
          refresh_token: refreshToken
        };
      }

      return null;
    } catch (error) {
      console.error('[OAuthCallback] Error extracting session from URL fragments:', error);
      return null;
    }
  }

  /**
   * Validate if a session is valid and not expired
   */
  private static isSessionValid(session: Session): boolean {
    if (!session || !session.access_token) {
      return false;
    }

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at <= now) {
      return false;
    }

    return true;
  }

  /**
   * Attempt session recovery using various strategies
   */
  private static async attemptSessionRecovery(oauthContext: OAuthErrorContext): Promise<OAuthCallbackResult> {
    try {
      console.log('[OAuthCallback] Attempting session recovery...');

      // Strategy 1: Try to refresh the session
      const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (!refreshError && refreshedSession && this.isSessionValid(refreshedSession)) {
        console.log('[OAuthCallback] Session recovery successful via refresh');
        
        const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(refreshedSession);
        if (!cookiesSynced) {
          console.warn('[OAuthCallback] Failed to sync cookies during recovery');
        }

        return {
          success: true,
          session: refreshedSession
        };
      }

      // Strategy 2: Wait and try getting session again (for async processing)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const { data: { session: delayedSession }, error: delayedError } = await supabase.auth.getSession();
      
      if (!delayedError && delayedSession && this.isSessionValid(delayedSession)) {
        console.log('[OAuthCallback] Session recovery successful via delayed fetch');
        
        const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(delayedSession);
        if (!cookiesSynced) {
          console.warn('[OAuthCallback] Failed to sync cookies during delayed recovery');
        }

        return {
          success: true,
          session: delayedSession
        };
      }

      // Recovery failed
      console.log('[OAuthCallback] Session recovery failed');
      
      const errorRecovery = OAuthErrorHandler.handleError(
        new OAuthError('Session recovery failed', OAuthErrorType.PROVIDER_ERROR),
        oauthContext
      );

      return {
        success: false,
        error: errorRecovery.userMessage
      };

    } catch (error) {
      console.error('[OAuthCallback] Error during session recovery:', error);
      
      const errorRecovery = OAuthErrorHandler.handleError(error as Error, oauthContext);
      
      return {
        success: false,
        error: errorRecovery.userMessage
      };
    }
  }

  /**
   * Handle OAuth errors from URL parameters
   */
  private static handleOAuthError(
    error: string,
    errorDescription: string | null,
    oauthContext: OAuthErrorContext
  ): OAuthCallbackResult {
    console.error('[OAuthCallback] OAuth error:', error, errorDescription);

    // Map OAuth error codes to our error types
    let oauthErrorType: OAuthErrorType;
    
    switch (error) {
      case 'access_denied':
        oauthErrorType = OAuthErrorType.REVOKED_TOKEN;
        break;
      case 'invalid_request':
      case 'invalid_client':
        oauthErrorType = OAuthErrorType.PROVIDER_ERROR;
        break;
      case 'invalid_grant':
      case 'invalid_scope':
        oauthErrorType = OAuthErrorType.INSUFFICIENT_PERMISSIONS;
        break;
      case 'server_error':
      case 'temporarily_unavailable':
        oauthErrorType = OAuthErrorType.PROVIDER_ERROR;
        break;
      case 'invalid_state':
        oauthErrorType = OAuthErrorType.ENCRYPTION_ERROR;
        break;
      default:
        oauthErrorType = OAuthErrorType.PROVIDER_ERROR;
    }

    const oauthError = new OAuthError(
      errorDescription || error,
      oauthErrorType,
      'github'
    );

    const errorRecovery = OAuthErrorHandler.handleError(oauthError, oauthContext);

    return {
      success: false,
      error: errorRecovery.userMessage
    };
  }

  /**
   * Clean up OAuth state after successful authentication
   */
  private static cleanupOAuthState(): void {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Remove OAuth state from session storage
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_linking');

      // Clean up URL by removing OAuth parameters and hash
      const url = new URL(window.location.href);
      
      // Remove OAuth-related search parameters
      const paramsToRemove = [
        'code',
        'state',
        'error',
        'error_description',
        'access_token',
        'refresh_token',
        'token_type',
        'expires_in'
      ];
      
      paramsToRemove.forEach(param => url.searchParams.delete(param));
      
      // Remove hash
      url.hash = '';
      
      // Update browser history without triggering navigation
      window.history.replaceState({}, document.title, url.pathname + url.search);
      
      console.log('[OAuthCallback] OAuth state cleanup completed');
    } catch (error) {
      console.warn('[OAuthCallback] Error during OAuth state cleanup:', error);
    }
  }

  /**
   * Determine the appropriate redirect URL after successful authentication
   */
  private static determineRedirectUrl(url: URL, context: CallbackContext): string {
    // Check for explicit redirect parameter
    const explicitRedirect = url.searchParams.get('redirect_to');
    if (explicitRedirect) {
      try {
        // Validate that redirect URL is safe (same origin)
        const redirectUrl = new URL(explicitRedirect, window.location.origin);
        if (redirectUrl.origin === window.location.origin) {
          return redirectUrl.toString();
        }
      } catch (error) {
        console.warn('[OAuthCallback] Invalid redirect URL:', explicitRedirect);
      }
    }

    // Determine language-specific dashboard URL
    const currentPath = url.pathname;
    const isSpanish = currentPath.includes('/es/');
    
    if (context.isLinking) {
      // For account linking, redirect to account management page
      return isSpanish ? '/es/dashboard/account' : '/dashboard/account';
    } else {
      // For sign-in, redirect to main dashboard
      return isSpanish ? '/es/dashboard' : '/dashboard';
    }
  }

  /**
   * Validate OAuth callback URL for security
   */
  static validateCallbackUrl(url: URL): { isValid: boolean; error?: string } {
    try {
      // Check for required parameters or fragments
      const hasCode = url.searchParams.has('code');
      const hasTokens = url.hash.includes('access_token') || url.searchParams.has('access_token');
      const hasError = url.searchParams.has('error');

      if (!hasCode && !hasTokens && !hasError) {
        return {
          isValid: false,
          error: 'Invalid OAuth callback - missing required parameters'
        };
      }

      // Validate URL structure
      if (!url.pathname.includes('/auth/callback')) {
        return {
          isValid: false,
          error: 'Invalid OAuth callback URL path'
        };
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid URL format'
      };
    }
  }

  /**
   * Get OAuth callback status for debugging
   */
  static getCallbackDebugInfo(url: URL): Record<string, any> {
    return {
      url: url.toString(),
      pathname: url.pathname,
      searchParams: Object.fromEntries(url.searchParams.entries()),
      hash: url.hash,
      hasCode: url.searchParams.has('code'),
      hasError: url.searchParams.has('error'),
      hasTokens: url.hash.includes('access_token') || url.searchParams.has('access_token'),
      isLinking: url.searchParams.get('linking') === 'true',
      timestamp: new Date().toISOString()
    };
  }
}