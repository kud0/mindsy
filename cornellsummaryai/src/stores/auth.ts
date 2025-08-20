/**
 * Simplified Auth Store - Phase 1 Implementation
 * 
 * This replaces the complex 1,400+ line auth store with a clean,
 * Supabase-native implementation that leverages built-in capabilities.
 * 
 * Key simplifications:
 * - No custom cookie management (Supabase handles this)
 * - No custom token refresh (Supabase auto-refreshes)
 * - No complex error handling (Supabase provides standard errors)
 * - No manual session validation (Supabase manages sessions)
 * - No cross-tab synchronization (Supabase handles this natively)
 */

import { atom } from 'nanostores';
import { supabase, auth, onAuthStateChange } from '../lib/supabase';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// ===== ATOMS =====
// Simple state atoms - Supabase manages the complexity

export const user = atom<User | null>(null);
export const session = atom<Session | null>(null);
export const loading = atom(true);
export const error = atom<AuthError | null>(null);

// Computed state
export const isAuthenticated = atom(false);

// ===== STATE MANAGEMENT =====

/**
 * Update auth state from Supabase session
 */
function updateAuthState(newSession: Session | null, authError?: AuthError | null) {
  session.set(newSession);
  user.set(newSession?.user ?? null);
  isAuthenticated.set(!!newSession?.user);
  error.set(authError ?? null);
  loading.set(false);
}

/**
 * Clear auth state
 */
function clearAuthState() {
  session.set(null);
  user.set(null);
  isAuthenticated.set(false);
  error.set(null);
  loading.set(false);
}

// ===== INITIALIZATION =====

/**
 * Initialize auth state
 * This sets up the auth listener and gets the initial session
 */
export async function initAuth() {
  try {
    // Get initial authenticated user - SECURE method that validates with server
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      // Handle "no session" as normal state, not an error
      if (error.message?.includes('session missing') || error.message?.includes('Auth session missing')) {
        console.log('[Auth] No active session - user not logged in');
        clearAuthState();
      } else {
        console.error('[Auth] Auth error:', error);
        clearAuthState();
      }
      // Don't return here - continue with auth listener setup
    } else {
      // Create session-like object for compatibility
      const { data: { session: sessionData } } = await supabase.auth.getSession();
      updateAuthState(sessionData);
    }

    // Listen to auth changes
    // Supabase automatically handles:
    // - Token refresh
    // - Session persistence
    // - Cross-tab synchronization
    // - OAuth callback processing
    onAuthStateChange((event, newSession) => {
      console.log(`[Auth] ${event}`, { hasSession: !!newSession });
      
      switch (event) {
        case 'SIGNED_IN':
        case 'TOKEN_REFRESHED':
        case 'USER_UPDATED':
          updateAuthState(newSession);
          break;
        
        case 'SIGNED_OUT':
          clearAuthState();
          break;
        
        default:
          updateAuthState(newSession);
      }
    });

  } catch (authError) {
    console.error('[Auth] Initialization failed:', authError);
    error.set(authError as AuthError);
    loading.set(false);
  }
}

// ===== AUTH ACTIONS =====

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string, metadata?: { full_name?: string }) {
  loading.set(true);
  error.set(null);

  try {
    const { data, error: authError } = await auth.signUp(email, password, metadata);
    
    if (authError) {
      const storeError = { message: authError.message, name: 'SignUpError' } as AuthError;
      error.set(storeError);
      return { data, error: authError };
    }
    
    return { data, error: null };
  } catch (err) {
    const authError = { message: err instanceof Error ? err.message : 'Sign up failed', name: 'SignUpError' } as AuthError;
    error.set(authError);
    return { data: null, error: authError };
  } finally {
    loading.set(false);
  }
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  loading.set(true);
  error.set(null);

  try {
    const result = await auth.signInWithPassword(email, password);
    return result;
  } catch (err) {
    const authError = { message: err instanceof Error ? err.message : 'Sign in failed', name: 'SignInError' } as AuthError;
    error.set(authError);
    throw err;
  } finally {
    loading.set(false);
  }
}

/**
 * Sign in with GitHub
 */
export async function signInWithGitHub() {
  loading.set(true);
  error.set(null);

  try {
    const result = await auth.signInWithGitHub();
    // Note: For OAuth, the actual sign-in completes on the callback page
    // The loading state will be updated by the auth state listener
    return result;
  } catch (err) {
    const authError = { message: err instanceof Error ? err.message : 'GitHub sign in failed', name: 'GitHubSignInError' } as AuthError;
    error.set(authError);
    loading.set(false);
    throw err;
  }
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  loading.set(true);
  error.set(null);

  try {
    const result = await auth.signInWithGoogle();
    // Note: For OAuth, the actual sign-in completes on the callback page
    // The loading state will be updated by the auth state listener
    return result;
  } catch (err) {
    const authError = { message: err instanceof Error ? err.message : 'Google sign in failed', name: 'GoogleSignInError' } as AuthError;
    error.set(authError);
    loading.set(false);
    throw err;
  }
}

/**
 * Sign up with Google
 */
export async function signUpWithGoogle() {
  loading.set(true);
  error.set(null);

  try {
    const result = await auth.signUpWithGoogle();
    // Note: For OAuth, the actual sign-up completes on the callback page
    // The loading state will be updated by the auth state listener
    return result;
  } catch (err) {
    const authError = { message: err instanceof Error ? err.message : 'Google sign up failed', name: 'GoogleSignUpError' } as AuthError;
    error.set(authError);
    loading.set(false);
    throw err;
  }
}

/**
 * Sign out - Clean Supabase-native approach
 */
export async function signOut() {
  loading.set(true);
  error.set(null);

  try {
    // Let Supabase handle everything natively - it manages:
    // 1. Session termination on server
    // 2. Cookie clearing (both httpOnly and regular)
    // 3. localStorage/sessionStorage cleanup
    // 4. Auth state change events
    const { error: signOutError } = await supabase.auth.signOut();
    
    if (signOutError) {
      console.error('[Auth] Supabase signOut error:', signOutError);
      throw signOutError;
    }
    
    // Supabase auth.signOut() automatically:
    // - Clears server-side session
    // - Removes auth cookies with proper settings
    // - Triggers onAuthStateChange('SIGNED_OUT')
    // - Updates middleware state on next request
    
    // The onAuthStateChange listener will call clearAuthState()
    console.log('[Auth] Native Supabase logout completed');
    
  } catch (err) {
    const authError = { message: err instanceof Error ? err.message : 'Sign out failed', name: 'SignOutError' } as AuthError;
    error.set(authError);
    loading.set(false);
    throw err;
  }
}

/**
 * Reset password
 */
export async function resetPassword(email: string) {
  loading.set(true);
  error.set(null);

  try {
    const result = await auth.resetPassword(email);
    return result;
  } catch (err) {
    const authError = { message: err instanceof Error ? err.message : 'Password reset failed', name: 'PasswordResetError' } as AuthError;
    error.set(authError);
    throw err;
  } finally {
    loading.set(false);
  }
}



// ===== UTILITIES =====

/**
 * Get current auth state snapshot
 */
export function getAuthState() {
  return {
    user: user.get(),
    session: session.get(),
    loading: loading.get(),
    error: error.get(),
    isAuthenticated: isAuthenticated.get(),
  };
}

/**
 * Check if user has GitHub account linked
 */
export function hasGitHubAccount(): boolean {
  const currentUser = user.get();
  return !!(currentUser?.identities?.some(identity => identity.provider === 'github'));
}

/**
 * Get GitHub username if available
 */
export function getGitHubUsername(): string | null {
  const currentUser = user.get();
  const githubIdentity = currentUser?.identities?.find(identity => identity.provider === 'github');
  return githubIdentity?.identity_data?.user_name || githubIdentity?.identity_data?.login || null;
}

/**
 * Check if user has Google account linked
 */
export function hasGoogleAccount(): boolean {
  const currentUser = user.get();
  return !!(currentUser?.identities?.some(identity => identity.provider === 'google'));
}

/**
 * Get Google email if available
 */
export function getGoogleEmail(): string | null {
  const currentUser = user.get();
  const googleIdentity = currentUser?.identities?.find(identity => identity.provider === 'google');
  return googleIdentity?.identity_data?.email || null;
}

/**
 * Get user's authentication provider
 */
export function getAuthProvider(): string | null {
  const currentUser = user.get();
  if (!currentUser?.identities || currentUser.identities.length === 0) {
    return 'email';
  }

  // Check for OAuth providers
  const oauthIdentity = currentUser.identities.find(identity => 
    identity.provider !== 'email' && identity.provider !== 'phone'
  );

  return oauthIdentity?.provider || 'email';
}

// ===== EXPORTS =====

// Re-export Supabase client for direct database operations
export { supabase as db } from '../lib/supabase';

// Export types
export type { User, Session, AuthError } from '@supabase/supabase-js';