import { atom } from 'nanostores';
import type { User, AuthError, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { AuthCookieManager } from '../lib/auth-cookie-manager';
import { OAuthErrorHandler, type OAuthErrorContext } from '../lib/oauth-error-handler';
import { OAuthTokenManager, OAuthError, OAuthErrorType } from '../lib/oauth-security';
import { OAuthAccountValidator, type AccountLinkingContext } from '../lib/oauth-account-validator';
import { AuthErrorHandler, AuthErrorType, type AuthErrorContext } from '../lib/auth-error-handler';
import { AuthDebugger } from '../lib/auth-debugger';
import { TokenRefreshManager } from '../lib/token-refresh-manager';

// Enhanced auth state atoms
export const user = atom<User | null>(null);
export const isLoading = atom(true);
export const isAuthenticated = atom(false);
export const lastError = atom<AuthError | null>(null);
export const sessionValidationInProgress = atom(false);

/**
 * Enhanced session validation result
 */
interface SessionValidationResult {
  isValid: boolean;
  needsRefresh: boolean;
  error?: string;
  sessionExists?: boolean;
  cookiesValid?: boolean;
}

/**
 * Enhanced auth state interface
 */
interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  lastError: AuthError | null;
  lastValidation?: SessionValidationResult;
}

/**
 * Get current auth state snapshot
 */
export function getAuthState(): AuthState {
  return {
    user: user.get(),
    session: null, // We don't store session in atom for security
    isLoading: isLoading.get(),
    isAuthenticated: isAuthenticated.get(),
    lastError: lastError.get()
  };
}

/**
 * Update auth state atoms synchronously
 */
function updateAuthState(newUser: User | null, error?: AuthError | null): void {
  const wasAuthenticated = isAuthenticated.get();
  const isNowAuthenticated = !!newUser;
  
  user.set(newUser);
  isAuthenticated.set(isNowAuthenticated);
  lastError.set(error || null);
  
  // Log state transitions for debugging
  if (wasAuthenticated !== isNowAuthenticated) {
    console.log(`[AuthStore] Authentication state changed: ${wasAuthenticated} -> ${isNowAuthenticated}`);
  }
}

/**
 * Validate current session against Supabase and cookies with enhanced checks
 * Improved to handle cross-tab synchronization and token refresh
 */
export async function validateCurrentSession(): Promise<SessionValidationResult> {
  if (sessionValidationInProgress.get()) {
    // Prevent concurrent validations
    return { isValid: false, needsRefresh: false, error: 'Validation already in progress' };
  }

  sessionValidationInProgress.set(true);
  
  try {
    // Start performance monitoring
    const endPerformanceMonitoring = AuthDebugger.startPerformanceMonitoring('validate_session');
    
    // Check if we have valid cookies first
    const hasValidCookies = await AuthCookieManager.hasValidAuthCookies();
    
    // Get current Supabase session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    const result: SessionValidationResult = {
      isValid: false,
      needsRefresh: false,
      sessionExists: !!session,
      cookiesValid: hasValidCookies
    };
    
    if (error) {
      result.error = error.message;
      
      // Log validation failure
      await AuthDebugger.logWithState('session_validation', false, {
        error: error.message,
        hasValidCookies
      }, error.message, 'error');
      
      endPerformanceMonitoring(false, { errorType: 'session_error' });
      return result;
    }
    
    if (!session) {
      // No Supabase session but we have cookies - clear them
      if (hasValidCookies) {
        AuthCookieManager.clearAuthCookies();
        updateAuthState(null);
        
        // Log cookie cleanup
        await AuthDebugger.logWithState('session_validation', false, {
          reason: 'no_session_but_cookies_exist',
          action: 'cleared_cookies'
        }, 'No active session but cookies exist', 'warn');
      }
      
      result.error = 'No active session';
      endPerformanceMonitoring(false, { errorType: 'no_session' });
      return result;
    }
    
    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at <= now) {
      result.needsRefresh = true;
      result.error = 'Session expired';
      
      // Log session expiration
      await AuthDebugger.logWithState('session_validation', false, {
        reason: 'session_expired',
        expiresAt: session.expires_at,
        now
      }, 'Session expired', 'warn');
      
      endPerformanceMonitoring(false, { errorType: 'session_expired' });
      return result;
    }
    
    // We have a valid Supabase session - ensure cookies are synchronized
    if (!hasValidCookies) {
      // Log cookie sync attempt
      await AuthDebugger.logWithState('session_validation', false, {
        reason: 'cookies_invalid_but_session_valid',
        action: 'syncing_cookies'
      }, 'Valid session but invalid cookies', 'warn');
      
      const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(session);
      if (!cookiesSynced) {
        result.error = 'Failed to synchronize cookies';
        
        // Log cookie sync failure
        await AuthDebugger.logWithState('session_validation', false, {
          reason: 'cookie_sync_failed'
        }, 'Failed to synchronize cookies', 'error');
        
        endPerformanceMonitoring(false, { errorType: 'cookie_sync_failed' });
        return result;
      }
      
      result.cookiesValid = true;
      
      // Log successful cookie sync
      await AuthDebugger.logWithState('session_validation', true, {
        action: 'cookies_synced'
      });
    }
    
    // Ensure local state matches session
    const currentUser = user.get();
    if (!currentUser || currentUser.id !== session.user.id) {
      updateAuthState(session.user);
      
      // Log state update
      await AuthDebugger.logWithState('session_validation', true, {
        action: 'updated_local_state',
        userId: session.user.id
      });
    }
    
    result.isValid = true;
    
    // Log successful validation
    await AuthDebugger.logWithState('session_validation', true, {
      sessionId: session.user.id,
      expiresAt: session.expires_at,
      cookiesValid: result.cookiesValid
    });
    
    endPerformanceMonitoring(true, { 
      sessionValidationTime: Date.now() - now * 1000 
    });
    
    return result;
  } catch (error) {
    // Log unexpected error
    await AuthDebugger.logWithState('session_validation', false, {
      unexpectedError: true
    }, error instanceof Error ? error.message : 'Unknown error', 'error');
    
    return { 
      isValid: false, 
      needsRefresh: false, 
      error: error instanceof Error ? error.message : 'Session validation failed',
      sessionExists: false,
      cookiesValid: false
    };
  } finally {
    sessionValidationInProgress.set(false);
  }
}

/**
 * Attempt to recover session when state gets out of sync
 */
export async function attemptSessionRecovery(): Promise<boolean> {
  console.log('[AuthStore] Attempting session recovery...');
  
  const context: AuthErrorContext = {
    operation: 'session_recovery',
    timestamp: Date.now(),
    retryCount: 1
  };
  
  try {
    // Use the enhanced session recovery from AuthErrorHandler
    const recoveryResult = await AuthErrorHandler.attemptSessionRecovery(context);
    
    if (recoveryResult.success && recoveryResult.session) {
      updateAuthState(recoveryResult.user || recoveryResult.session.user);
      
      // Log successful recovery
      await AuthDebugger.logWithState('session_recovery', true, {
        recoveryMethod: recoveryResult.recoveryMethod,
        debugInfo: recoveryResult.debugInfo
      });
      
      console.log('[AuthStore] Session recovery successful via', recoveryResult.recoveryMethod);
      return true;
    } else {
      // Clear state as recommended by recovery result
      updateAuthState(null);
      
      // Log failed recovery
      await AuthDebugger.logWithState('session_recovery', false, {
        error: recoveryResult.error,
        recoveryMethod: recoveryResult.recoveryMethod
      }, recoveryResult.error, 'warn');
      
      console.warn('[AuthStore] Session recovery failed:', recoveryResult.error);
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Handle recovery error using AuthErrorHandler
    const errorRecovery = AuthErrorHandler.handleError(error as Error, context);
    
    // Log the error
    await AuthDebugger.logWithState('session_recovery', false, {
      errorRecovery
    }, errorMessage, 'error');
    
    console.error('[AuthStore] Session recovery failed:', errorMessage);
    
    // Clear state for safety
    updateAuthState(null);
    return false;
  }
}

/**
 * Force session validation and recovery if needed
 */
export async function validateAndRecoverSession(): Promise<boolean> {
  const validation = await validateCurrentSession();
  
  if (validation.isValid) {
    return true;
  }
  
  if (validation.needsRefresh || validation.error?.includes('expired')) {
    return await attemptSessionRecovery();
  }
  
  // Session is invalid and can't be recovered
  AuthCookieManager.clearAuthCookies();
  updateAuthState(null);
  return false;
}

/**
 * Internal function to sync GitHub profile data for the current user
 * Updates user profile with latest GitHub information
 */
async function internalSyncGitHubProfile(): Promise<{ error?: Error }> {
  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      return { error: new Error('No authenticated user found') };
    }

    // Check if user has GitHub identity
    const githubIdentity = currentUser.identities?.find(
      identity => identity.provider === 'github'
    );

    if (!githubIdentity) {
      return { error: new Error('No GitHub account linked') };
    }

    // Get GitHub user data from identity
    const githubData = githubIdentity.identity_data;
    if (!githubData) {
      return { error: new Error('No GitHub profile data available') };
    }

    // Update profile using database function
    const { error: updateError } = await supabase
      .rpc('update_github_profile', {
        p_user_id: currentUser.id,
        p_github_id: githubData.sub || githubData.id,
        p_github_username: githubData.user_name || githubData.login,
        p_avatar_url: githubData.avatar_url,
        p_full_name: githubData.full_name || githubData.name
      });

    if (updateError) {
      console.error('Error updating GitHub profile:', updateError);
      return { error: updateError };
    }

    return {};
  } catch (error) {
    console.error('Error syncing GitHub profile:', error);
    return { error: error as Error };
  }
}

// Initialize auth state with enhanced session validation and persistence
export async function initAuth() {
  console.log('[AuthStore] Initializing auth state...');
  
  const context: AuthErrorContext = {
    operation: 'session_validation',
    timestamp: Date.now(),
    retryCount: 1
  };
  
  try {
    // Start performance monitoring
    const endPerformanceMonitoring = AuthDebugger.startPerformanceMonitoring('auth_init');
    
    // Initialize session persistence and cross-tab synchronization
    AuthCookieManager.initSessionPersistence();
    
    // Initialize token refresh manager
    TokenRefreshManager.initialize();
    
    // Get initial session from Supabase
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('[AuthStore] Error getting initial session:', error);
      
      // Handle initialization error
      const errorRecovery = AuthErrorHandler.handleError(error, context);
      
      // Log the error
      await AuthDebugger.logWithState('auth_init', false, {
        errorRecovery
      }, error.message, 'error');
      
      const enhancedError = {
        ...error,
        message: errorRecovery.userMessage
      } as AuthError;
      
      updateAuthState(null, enhancedError);
      AuthCookieManager.clearAuthCookies();
      
      endPerformanceMonitoring(false, { errorType: 'session_error' });
      return;
    }

    // Update initial state
    updateAuthState(session?.user ?? null);

    // Synchronize cookies with Supabase session
    if (session) {
      const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(session);
      if (!cookiesSynced) {
        console.warn('[AuthStore] Failed to synchronize cookies during auth initialization');
        
        // Log cookie sync warning
        await AuthDebugger.logWithState('cookie_sync', false, {
          phase: 'initialization'
        }, 'Cookie synchronization failed', 'warn');
      }
    } else {
      // Clear any stale cookies if no session
      AuthCookieManager.clearAuthCookies();
    }

    // Perform comprehensive session validation
    const validation = await validateCurrentSession();
    if (!validation.isValid) {
      console.warn('[AuthStore] Session validation failed during init:', validation.error);
      
      // Attempt recovery if session needs refresh or is recoverable
      if (validation.needsRefresh || validation.sessionExists) {
        console.log('[AuthStore] Attempting session recovery during init...');
        const recovered = await attemptSessionRecovery();
        if (!recovered) {
          console.warn('[AuthStore] Session recovery failed during init');
          updateAuthState(null);
          
          // Log recovery failure
          await AuthDebugger.logWithState('session_recovery', false, {
            phase: 'initialization',
            validationResult: validation
          }, 'Session recovery failed during initialization', 'warn');
          
          endPerformanceMonitoring(false, { errorType: 'recovery_failed' });
        } else {
          // Log successful recovery
          await AuthDebugger.logWithState('session_recovery', true, {
            phase: 'initialization'
          });
          
          endPerformanceMonitoring(true, { recoveryPerformed: true });
        }
      } else {
        // Session is completely invalid, clear state
        updateAuthState(null);
        
        // Log session clearing
        await AuthDebugger.logWithState('session_clear', true, {
          phase: 'initialization',
          reason: 'invalid_session'
        });
        
        endPerformanceMonitoring(false, { errorType: 'invalid_session' });
      }
    } else {
      console.log('[AuthStore] Session validation successful during init');
      
      // Log successful initialization
      await AuthDebugger.logWithState('auth_init', true, {
        hasSession: !!session,
        userId: session?.user?.id
      });
      
      endPerformanceMonitoring(true);
    }
    
    // Set up page visibility change listener for session validation
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }
    
    // Set up beforeunload listener to clean up resources
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        AuthCookieManager.cleanupSessionPersistence();
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
      });
    }
    
  } catch (error) {
    console.error('[AuthStore] Error initializing auth:', error);
    
    // Handle unexpected initialization errors
    const errorRecovery = AuthErrorHandler.handleError(error as Error, context);
    
    // Log the unexpected error
    await AuthDebugger.logWithState('auth_init', false, {
      errorRecovery,
      unexpectedError: true
    }, (error as Error).message, 'error');
    
    // Clear potentially corrupted state
    AuthCookieManager.clearAuthCookies();
    updateAuthState(null, {
      message: errorRecovery.userMessage,
      name: 'InitializationError'
    } as AuthError);
  } finally {
    isLoading.set(false);
    console.log('[AuthStore] Auth initialization complete');
  }
}

/**
 * Handle visibility change events to validate session when tab becomes visible
 */
async function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    console.log('[AuthStore] Tab became visible, validating session...');
    
    // Only validate if we think we're authenticated to avoid unnecessary API calls
    if (isAuthenticated.get()) {
      const validation = await validateCurrentSession();
      
      if (!validation.isValid) {
        console.warn('[AuthStore] Session invalid after visibility change:', validation.error);
        
        // Attempt recovery if needed
        if (validation.needsRefresh || validation.sessionExists) {
          await attemptSessionRecovery();
        }
      }
    }
  }
}

// Listen to auth state changes with enhanced session state synchronization
supabase.auth.onAuthStateChange(async (event, session) => {
  console.log(`[AuthStore] Auth state change: ${event}`, { hasSession: !!session, userId: session?.user?.id });
  
  // Start performance monitoring
  const endPerformanceMonitoring = AuthDebugger.startPerformanceMonitoring(`auth_state_change_${event.toLowerCase()}`);
  
  // Update auth state synchronously first
  updateAuthState(session?.user ?? null);

  // Handle different auth events
  switch (event) {
    case 'SIGNED_IN':
      if (session) {
        // Synchronize cookies with new session
        const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(session);
        if (!cookiesSynced) {
          console.warn('[AuthStore] Failed to synchronize cookies after sign in');
          // Set error state but don't fail the sign in
          lastError.set({ 
            message: 'Session created but cookie synchronization failed',
            name: 'CookieSyncError'
          } as AuthError);
          
          // Log cookie sync failure
          await AuthDebugger.logWithState('auth_state_change', false, {
            event,
            error: 'Cookie synchronization failed'
          }, 'Failed to synchronize cookies after sign in', 'warn');
          
          endPerformanceMonitoring(false, { errorType: 'cookie_sync_failed' });
        } else {
          // Schedule token refresh based on session expiration
          TokenRefreshManager.scheduleRefreshForSession(session);
          
          // Log successful sign in
          await AuthDebugger.logWithState('auth_state_change', true, {
            event,
            userId: session.user.id,
            cookiesSynced
          });
          
          endPerformanceMonitoring(true);
        }

        // Handle OAuth sign-in success - sync profile data
        if (session.user?.identities?.some(id => id.provider === 'github')) {
          try {
            await internalSyncGitHubProfile();
          } catch (error) {
            console.error('[AuthStore] Error syncing GitHub profile after sign-in:', error);
          }
        }
      }
      break;

    case 'SIGNED_OUT':
      // Clear all auth state and cookies
      AuthCookieManager.clearAuthCookies();
      updateAuthState(null);
      
      // Clean up token refresh manager
      TokenRefreshManager.cleanup();
      
      // Log sign out
      await AuthDebugger.logWithState('auth_state_change', true, {
        event,
        action: 'cleared_auth_state'
      });
      
      endPerformanceMonitoring(true);
      break;

    case 'TOKEN_REFRESHED':
      if (session) {
        // Synchronize cookies with refreshed tokens
        const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(session);
        if (!cookiesSynced) {
          console.warn('[AuthStore] Failed to synchronize cookies after token refresh');
          
          // Log cookie sync failure
          await AuthDebugger.logWithState('auth_state_change', false, {
            event,
            error: 'Cookie synchronization failed'
          }, 'Failed to synchronize cookies after token refresh', 'warn');
          
          endPerformanceMonitoring(false, { errorType: 'cookie_sync_failed' });
        } else {
          // Schedule next token refresh
          TokenRefreshManager.scheduleRefreshForSession(session);
          
          // Log successful token refresh
          await AuthDebugger.logWithState('auth_state_change', true, {
            event,
            userId: session.user.id,
            cookiesSynced,
            expiresAt: session.expires_at
          });
          
          endPerformanceMonitoring(true);
        }
      }
      break;

    case 'USER_UPDATED':
      // User data was updated, ensure local state is current
      if (session) {
        updateAuthState(session.user);
        
        // Log user update
        await AuthDebugger.logWithState('auth_state_change', true, {
          event,
          userId: session.user.id
        });
        
        endPerformanceMonitoring(true);
      }
      break;

    default:
      // For other events, just ensure state consistency
      if (session) {
        const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(session);
        if (!cookiesSynced) {
          console.warn(`[AuthStore] Failed to synchronize cookies after auth state change: ${event}`);
          
          // Log cookie sync failure
          await AuthDebugger.logWithState('auth_state_change', false, {
            event,
            error: 'Cookie synchronization failed'
          }, `Failed to synchronize cookies after auth state change: ${event}`, 'warn');
          
          endPerformanceMonitoring(false, { errorType: 'cookie_sync_failed' });
        } else {
          // Log successful state change
          await AuthDebugger.logWithState('auth_state_change', true, {
            event,
            userId: session.user.id
          });
          
          endPerformanceMonitoring(true);
        }
      }
  }
});

// Auth helper functions with enhanced session state management
export async function signUp(email: string, password: string, metadata?: { full_name?: string }) {
  console.log('[AuthStore] Attempting sign up...');
  isLoading.set(true);
  
  const context: AuthErrorContext = {
    operation: 'signup',
    timestamp: Date.now(),
    retryCount: 1,
    email
  };
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      console.error('[AuthStore] Sign up failed:', error);
      
      // Handle the error using AuthErrorHandler
      const errorRecovery = AuthErrorHandler.handleError(error, context);
      
      // Log the error with context
      await AuthDebugger.logWithState('sign_up', false, {
        errorRecovery,
        email
      }, error.message, 'error');
      
      // Update state with user-friendly error message
      const enhancedError = {
        ...error,
        message: errorRecovery.userMessage
      } as AuthError;
      
      updateAuthState(null, enhancedError);
      return { data, error: enhancedError };
    }

    // Synchronize cookies and state if successful
    if (data.session) {
      const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(data.session);
      if (!cookiesSynced) {
        console.warn('[AuthStore] Failed to synchronize cookies after sign up');
        
        // Handle cookie sync failure
        const cookieContext: AuthErrorContext = {
          ...context,
          cookiesValid: false
        };
        
        const cookieErrorRecovery = AuthErrorHandler.handleError(
          new Error('Cookie synchronization failed'),
          cookieContext
        );
        
        // Set warning but don't fail the sign up
        lastError.set({
          message: cookieErrorRecovery.userMessage,
          name: 'SessionSyncWarning'
        } as AuthError);
      }
      
      // Update auth state
      updateAuthState(data.session.user);
      
      // Log successful sign up
      await AuthDebugger.logWithState('sign_up', true, {
        userId: data.session.user.id,
        cookiesSynced
      });
    } else {
      // Log sign up without immediate session (email confirmation required)
      await AuthDebugger.logWithState('sign_up', true, {
        requiresConfirmation: true
      });
    }

    console.log('[AuthStore] Sign up successful');
    return { data, error };
  } catch (unexpectedError) {
    console.error('[AuthStore] Unexpected error during sign up:', unexpectedError);
    
    // Handle unexpected errors
    const errorRecovery = AuthErrorHandler.handleError(unexpectedError as Error, context);
    
    const authError = {
      message: errorRecovery.userMessage,
      name: 'UnexpectedError'
    } as AuthError;
    
    // Log the unexpected error
    await AuthDebugger.logWithState('sign_up', false, {
      errorRecovery,
      unexpectedError: true
    }, (unexpectedError as Error).message, 'error');
    
    updateAuthState(null, authError);
    return { data: null, error: authError };
  } finally {
    isLoading.set(false);
  }
}

export async function signIn(email: string, password: string) {
  console.log('[AuthStore] Attempting sign in...');
  isLoading.set(true);
  
  const context: AuthErrorContext = {
    operation: 'login',
    timestamp: Date.now(),
    retryCount: 1,
    email
  };
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[AuthStore] Sign in failed:', error);
      
      // Handle the error using AuthErrorHandler
      const errorRecovery = AuthErrorHandler.handleError(error, context);
      
      // Log the error with context
      await AuthDebugger.logWithState('sign_in', false, {
        errorRecovery,
        email
      }, error.message, 'error');
      
      // Update state with user-friendly error message
      const enhancedError = {
        ...error,
        message: errorRecovery.userMessage
      } as AuthError;
      
      updateAuthState(null, enhancedError);
      return { data, error: enhancedError };
    }

    // Synchronize cookies and state if successful
    if (data.session) {
      const cookiesSynced = await AuthCookieManager.syncWithSupabaseSession(data.session);
      let syncError: AuthError | null = null;
      if (!cookiesSynced) {
        console.warn('[AuthStore] Failed to synchronize cookies after sign in');
        
        // Handle cookie sync failure
        const cookieContext: AuthErrorContext = {
          ...context,
          cookiesValid: false
        };
        
        const cookieErrorRecovery = AuthErrorHandler.handleError(
          new Error('Cookie synchronization failed'),
          cookieContext
        );
        
        syncError = {
          message: cookieErrorRecovery.userMessage,
          name: 'SessionSyncWarning'
        } as AuthError;
      }
      
      // Update auth state, preserving sync error if it occurred
      updateAuthState(data.session.user, syncError);
      
      // Validate the session was properly established
      const validation = await validateCurrentSession();
      if (!validation.isValid) {
        console.warn('[AuthStore] Session validation failed after sign in:', validation.error);
        
        // Attempt recovery
        const recovered = await attemptSessionRecovery();
        if (!recovered) {
          console.error('[AuthStore] Failed to recover session after sign in');
          
          // Handle session establishment failure
          const establishmentError = new Error('Session could not be established');
          const establishmentRecovery = AuthErrorHandler.handleError(establishmentError, {
            ...context,
            operation: 'session_validation'
          });
          
          const finalError = {
            message: establishmentRecovery.userMessage,
            name: 'SessionEstablishmentError'
          } as AuthError;
          
          updateAuthState(null, finalError);
          
          // Log the establishment failure
          await AuthDebugger.logWithState('session_establishment', false, {
            establishmentRecovery
          }, establishmentError.message, 'error');
        }
      } else {
        // Log successful sign in
        await AuthDebugger.logWithState('sign_in', true, {
          userId: data.session.user.id,
          cookiesSynced
        });
      }
    }

    console.log('[AuthStore] Sign in successful');
    return { data, error };
  } catch (unexpectedError) {
    console.error('[AuthStore] Unexpected error during sign in:', unexpectedError);
    
    // Handle unexpected errors
    const errorRecovery = AuthErrorHandler.handleError(unexpectedError as Error, context);
    
    const authError = {
      message: errorRecovery.userMessage,
      name: 'UnexpectedError'
    } as AuthError;
    
    // Log the unexpected error
    await AuthDebugger.logWithState('sign_in', false, {
      errorRecovery,
      unexpectedError: true
    }, (unexpectedError as Error).message, 'error');
    
    updateAuthState(null, authError);
    return { data: null, error: authError };
  } finally {
    isLoading.set(false);
  }
}

export async function signOut() {
  console.log('[AuthStore] Attempting sign out...');
  isLoading.set(true);
  
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('[AuthStore] Sign out failed:', error);
      // Even if sign out fails, clear local state for security
      AuthCookieManager.clearAuthCookies();
      updateAuthState(null, error);
      return { error };
    }

    // Clear all auth state and cookies
    AuthCookieManager.clearAuthCookies();
    updateAuthState(null);
    
    console.log('[AuthStore] Sign out successful');
    return { error: null };
  } catch (unexpectedError) {
    console.error('[AuthStore] Unexpected error during sign out:', unexpectedError);
    // Clear local state even on error for security
    AuthCookieManager.clearAuthCookies();
    updateAuthState(null);
    
    const authError = {
      message: 'An unexpected error occurred during sign out',
      name: 'UnexpectedError'
    } as AuthError;
    return { error: authError };
  } finally {
    isLoading.set(false);
  }
}

export async function resetPassword(email: string) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
}

// GitHub OAuth functions

/**
 * Sign in with GitHub OAuth with enhanced error handling and security
 * Initiates the GitHub OAuth flow and handles the authentication
 */
export async function signInWithGitHub(): Promise<{ data: { url: string } | null; error: AuthError | null }> {
  const context: OAuthErrorContext = {
    flow: 'sign_in',
    provider: 'github',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
  };

  try {
    // Clear any existing OAuth state to prevent conflicts
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('oauth_state');
      sessionStorage.removeItem('oauth_linking');
    }

    // Determine the correct callback URL based on current language and environment
    const currentPath = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
    let origin: string;

    if (typeof window !== 'undefined' && window.location) {
      // Use the actual current origin from the browser
      origin = window.location.origin;
    } else {
      // Fallback for server-side rendering
      origin = 'http://localhost:4321';
    }

    const isSpanish = currentPath && currentPath.startsWith('/es/');
    const callbackUrl = isSpanish
      ? `${origin}/es/auth/callback`
      : `${origin}/auth/callback`;

    console.log('GitHub OAuth callback URL:', callbackUrl); // Debug log
    console.log('Current origin:', origin); // Debug log

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: callbackUrl,
        scopes: 'user:email'
      }
    });

    if (error) {
      const errorRecovery = OAuthErrorHandler.handleError(error, context);

      return {
        data: null,
        error: {
          ...error,
          message: errorRecovery.userMessage
        } as AuthError
      };
    }

    return { data, error };
  } catch (error) {
    const errorRecovery = OAuthErrorHandler.handleError(error as Error, context);

    return {
      data: null,
      error: {
        message: errorRecovery.userMessage,
        name: 'OAuthError'
      } as AuthError
    };
  }
}

/**
 * Link GitHub account to existing user with enhanced security validation
 * Links a GitHub account to the currently authenticated user
 */
export async function linkGitHubAccount(): Promise<{ data: { url: string } | null; error: AuthError | null }> {
  const context: OAuthErrorContext = {
    flow: 'link_account',
    provider: 'github',
    userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : undefined
  };

  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      const errorRecovery = OAuthErrorHandler.handleError(
        new OAuthError('No authenticated user found', OAuthErrorType.INVALID_TOKEN),
        context
      );

      return {
        data: null,
        error: {
          message: errorRecovery.userMessage,
          name: 'AuthError',
          status: 401
        } as AuthError
      };
    }

    context.userId = currentUser.id;

    // Pre-validate account linking eligibility
    const linkingContext: AccountLinkingContext = {
      userId: currentUser.id,
      email: currentUser.email || '',
      provider: 'github',
      providerUserId: '', // Will be filled after OAuth
      providerUsername: '',
      providerData: {},
      userAgent: context.userAgent,
      sessionId: currentUser.id // Using user ID as session identifier
    };

    const validation = await OAuthAccountValidator.validateAccountLinking(linkingContext);

    if (!validation.canLink) {
      const errorMessage = validation.errors.length > 0
        ? validation.errors[0]
        : 'Account linking not allowed';

      const errorRecovery = OAuthErrorHandler.handleError(
        new OAuthError(errorMessage, OAuthErrorType.ACCOUNT_LINKING_ERROR),
        context
      );

      return {
        data: null,
        error: {
          message: errorRecovery.userMessage,
          name: 'AuthError',
          status: 400
        } as AuthError
      };
    }

    // Generate secure state parameter
    const state = OAuthErrorHandler.generateOAuthState();

    // Store state and linking context
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('oauth_linking', 'true');
    }

    // Determine the correct callback URL based on current language and environment
    const currentPath = typeof window !== 'undefined' && window.location ? window.location.pathname : '';
    let origin: string;

    if (typeof window !== 'undefined' && window.location) {
      // Use the actual current origin from the browser
      origin = window.location.origin;
    } else {
      // Fallback for server-side rendering
      origin = 'http://localhost:4321';
    }

    const isSpanish = currentPath && currentPath.startsWith('/es/');
    const callbackUrl = isSpanish
      ? `${origin}/es/auth/callback?linking=true`
      : `${origin}/auth/callback?linking=true`;

    console.log('GitHub OAuth linking callback URL:', callbackUrl); // Debug log

    const { data, error } = await supabase.auth.linkIdentity({
      provider: 'github',
      options: {
        redirectTo: callbackUrl,
        scopes: 'user:email',
        queryParams: {
          state: state
        }
      }
    });

    if (error) {
      const errorRecovery = OAuthErrorHandler.handleError(error, context);

      return {
        data: null,
        error: {
          ...error,
          message: errorRecovery.userMessage
        } as AuthError
      };
    }

    return { data, error };
  } catch (error) {
    const errorRecovery = OAuthErrorHandler.handleError(error as Error, context);

    return {
      data: null,
      error: {
        message: errorRecovery.userMessage,
        name: 'OAuthError'
      } as AuthError
    };
  }
}

/**
 * Unlink GitHub account from current user with enhanced security
 * Removes the GitHub OAuth connection and cleans up related data
 */
export async function unlinkGitHubAccount(): Promise<{ error?: AuthError }> {
  const context: OAuthErrorContext = {
    flow: 'link_account',
    provider: 'github',
    step: 'unlink'
  };

  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      const errorRecovery = OAuthErrorHandler.handleError(
        new OAuthError('No authenticated user found', OAuthErrorType.INVALID_TOKEN),
        context
      );

      return {
        error: {
          message: errorRecovery.userMessage,
          name: 'AuthError',
          status: 401
        } as AuthError
      };
    }

    context.userId = currentUser.id;

    // Check if user can safely unlink GitHub (has other auth methods)
    const { data: canUnlinkData, error: canUnlinkError } = await supabase
      .rpc('can_unlink_oauth_provider', {
        p_user_id: currentUser.id,
        p_provider: 'github'
      });

    if (canUnlinkError) {
      const errorRecovery = OAuthErrorHandler.handleError(canUnlinkError, context);

      return {
        error: {
          message: errorRecovery.userMessage,
          name: 'AuthError',
          status: 500
        } as AuthError
      };
    }

    const canUnlink = canUnlinkData?.[0];
    if (!canUnlink?.can_unlink) {
      const errorRecovery = OAuthErrorHandler.handleError(
        new OAuthError(
          canUnlink?.reason || 'Cannot unlink GitHub account',
          OAuthErrorType.ACCOUNT_LINKING_ERROR
        ),
        context
      );

      return {
        error: {
          message: errorRecovery.userMessage,
          name: 'AuthError',
          status: 400
        } as AuthError
      };
    }

    // Find the GitHub identity to unlink
    const githubIdentity = currentUser.identities?.find(
      identity => identity.provider === 'github'
    );

    if (!githubIdentity) {
      const errorRecovery = OAuthErrorHandler.handleError(
        new OAuthError('No GitHub account linked', OAuthErrorType.ACCOUNT_LINKING_ERROR),
        context
      );

      return {
        error: {
          message: errorRecovery.userMessage,
          name: 'AuthError',
          status: 404
        } as AuthError
      };
    }

    // Remove encrypted tokens first
    try {
      await OAuthTokenManager.removeTokens(currentUser.id, 'github');
    } catch (tokenError) {
      // Log but don't fail the operation
      console.warn('Failed to remove OAuth tokens:', tokenError);
    }

    // Unlink the identity
    const { error: unlinkError } = await supabase.auth.unlinkIdentity(githubIdentity);

    if (unlinkError) {
      const errorRecovery = OAuthErrorHandler.handleError(unlinkError, context);
      return {
        error: {
          ...unlinkError,
          message: errorRecovery.userMessage
        } as AuthError
      };
    }

    // Clean up OAuth connection data using database function
    const { error: cleanupError } = await supabase
      .rpc('remove_oauth_connection', {
        p_user_id: currentUser.id,
        p_provider: 'github'
      });

    if (cleanupError) {
      console.error('Error cleaning up OAuth connection:', cleanupError);
      // Don't return error here as the main unlinking succeeded
    }

    return {};
  } catch (error) {
    const errorRecovery = OAuthErrorHandler.handleError(error as Error, context);

    return {
      error: {
        message: errorRecovery.userMessage,
        name: 'OAuthError'
      } as AuthError
    };
  }
}

/**
 * Sync GitHub profile data for the current user with enhanced error handling
 * Updates user profile with latest GitHub information using fresh API data
 */
export async function syncGitHubProfile(): Promise<{ error?: Error }> {
  const context: OAuthErrorContext = {
    flow: 'profile_sync',
    provider: 'github'
  };

  try {
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (!currentUser) {
      const errorRecovery = OAuthErrorHandler.handleError(
        new OAuthError('No authenticated user found', OAuthErrorType.INVALID_TOKEN),
        context
      );
      return { error: new Error(errorRecovery.userMessage) };
    }

    context.userId = currentUser.id;

    // Check if user has GitHub identity
    const githubIdentity = currentUser.identities?.find(
      identity => identity.provider === 'github'
    );

    if (!githubIdentity) {
      const errorRecovery = OAuthErrorHandler.handleError(
        new OAuthError('No GitHub account linked', OAuthErrorType.ACCOUNT_LINKING_ERROR),
        context
      );
      return { error: new Error(errorRecovery.userMessage) };
    }

    // Get fresh access token for API calls
    let accessToken: string;
    try {
      accessToken = await OAuthTokenManager.getValidAccessToken(currentUser.id, 'github');
    } catch (tokenError) {
      // Fallback to identity data if token refresh fails
      console.warn('Failed to get fresh access token, using identity data:', tokenError);

      const githubData = githubIdentity.identity_data;
      if (!githubData) {
        const errorRecovery = OAuthErrorHandler.handleError(
          new OAuthError('No GitHub profile data available', OAuthErrorType.PROVIDER_ERROR),
          context
        );
        return { error: new Error(errorRecovery.userMessage) };
      }

      // Update profile using cached identity data
      const { error: updateError } = await supabase
        .rpc('update_github_profile', {
          p_user_id: currentUser.id,
          p_github_id: githubData.sub || githubData.id,
          p_github_username: githubData.user_name || githubData.login,
          p_avatar_url: githubData.avatar_url,
          p_full_name: githubData.full_name || githubData.name
        });

      if (updateError) {
        const errorRecovery = OAuthErrorHandler.handleError(updateError, context);
        return { error: new Error(errorRecovery.userMessage) };
      }

      return {};
    }

    // Fetch fresh profile data from GitHub API with retry logic
    const fetchProfile = OAuthErrorHandler.createRetryFunction(
      async () => {
        const response = await fetch('https://api.github.com/user', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'StudyNotes-App'
          }
        });

        if (!response.ok) {
          throw OAuthErrorHandler.handleGitHubApiError(response, context);
        }

        return response.json();
      },
      context
    );

    const githubProfile = await fetchProfile();

    // Store updated tokens if we got new ones during refresh
    if (githubProfile.id) {
      try {
        // Get current session to check for updated tokens
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token !== accessToken) {
          // Tokens were refreshed, store the new ones
          const githubIdentityData = session?.user?.identities?.find(
            identity => identity.provider === 'github'
          )?.identity_data;

          if (githubIdentityData) {
            await OAuthTokenManager.storeTokens(
              currentUser.id,
              'github',
              {
                access_token: session!.access_token,
                refresh_token: session!.refresh_token,
                expires_at: session!.expires_at
              },
              githubIdentityData.sub || githubIdentityData.id,
              githubIdentityData.user_name || githubIdentityData.login
            );
          }
        }
      } catch (storeError) {
        // Log but don't fail the sync operation
        console.warn('Failed to store updated tokens:', storeError);
      }
    }

    // Update profile using fresh GitHub data
    const { error: updateError } = await supabase
      .rpc('update_github_profile', {
        p_user_id: currentUser.id,
        p_github_id: githubProfile.id.toString(),
        p_github_username: githubProfile.login,
        p_avatar_url: githubProfile.avatar_url,
        p_full_name: githubProfile.name
      });

    if (updateError) {
      const errorRecovery = OAuthErrorHandler.handleError(updateError, context);
      return { error: new Error(errorRecovery.userMessage) };
    }

    return {};
  } catch (error) {
    const errorRecovery = OAuthErrorHandler.handleError(error as Error, context);
    return { error: new Error(errorRecovery.userMessage) };
  }
}