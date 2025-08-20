/**
 * Simplified Supabase Client Configuration
 * 
 * This is Phase 1 of the authentication system simplification.
 * Replaces the complex custom auth system with native Supabase patterns.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

// Environment variables
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.');
}

/**
 * Browser client for client-side operations
 * This handles authentication state, OAuth flows, and session management automatically
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Enable automatic session refresh - no custom refresh logic needed
    autoRefreshToken: true,
    // Persist session in localStorage - no custom cookie management needed
    persistSession: true,
    // Disable auto-detection - we handle OAuth in callback page
    detectSessionInUrl: false,
  },
  // Enable real-time subscriptions if needed
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Server client factory for SSR operations
 * Use this in middleware and API routes
 * 
 * Note: This is a simplified version using the standard client
 * For full SSR functionality, the @supabase/ssr package would be needed
 */
export function createSupabaseServerClient(cookies: { get: (name: string) => any; set: (name: string, value: string, options: any) => void; delete: (name: string, options: any) => void; }) {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false, // Server doesn't need auto-refresh
      persistSession: false,   // Server doesn't persist sessions
      detectSessionInUrl: false, // Server doesn't need URL detection
    },
  });
}

/**
 * Auth helper functions - simplified versions
 */
export const auth = {
  /**
   * Sign in with GitHub OAuth
   */
  async signInWithGitHub() {
    // Language-aware redirect: check current path for Spanish
    const isSpanish = window.location.pathname.startsWith('/es');
    const redirectUrl = `${window.location.origin}${isSpanish ? '/es/dashboard' : '/dashboard'}`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: redirectUrl,
        scopes: 'user:email',
      },
    });

    if (error) {
      throw new Error(`GitHub sign-in failed: ${error.message}`);
    }

    return data;
  },

  /**
   * Sign in with Google OAuth
   */
  async signInWithGoogle() {
    // Language-aware redirect: check current path for Spanish
    const isSpanish = window.location.pathname.startsWith('/es');
    const redirectUrl = `${window.location.origin}${isSpanish ? '/es/dashboard' : '/dashboard'}`;
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        scopes: 'email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      throw new Error(`Google sign-in failed: ${error.message}`);
    }

    return data;
  },

  /**
   * Sign up with Google OAuth
   */
  async signUpWithGoogle() {
    // For OAuth providers, sign up and sign in are the same flow
    // Supabase automatically creates a new user if one doesn't exist
    return this.signInWithGoogle();
  },

  /**
   * Sign in with email and password
   */
  async signInWithPassword(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(`Sign-in failed: ${error.message}`);
    }

    return data;
  },

  /**
   * Sign up with email and password
   */
  async signUp(email: string, password: string, metadata?: { full_name?: string }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    // Return the full response - let the caller handle errors
    return { data, error };
  },

  /**
   * Sign out
   */
  async signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error(`Sign-out failed: ${error.message}`);
    }
  },

  /**
   * Get current session - DEPRECATED: Use getUser() for security
   * @deprecated Use getUser() instead for server-authenticated data
   */
  async getSession() {
    console.warn('⚠️ getSession() is deprecated for security reasons. Use getUser() instead.');
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      throw new Error(`Failed to get session: ${error.message}`);
    }

    return session;
  },

  /**
   * Get current user
   */
  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return user;
  },


  /**
   * Reset password
   */
  async resetPassword(email: string) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      throw new Error(`Failed to send reset email: ${error.message}`);
    }

    return data;
  },
};

/**
 * Auth state listener helper
 * Use this to listen to authentication state changes
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/**
 * Database helper - typed Supabase client
 */
export const db = supabase;

// Export types
export type { Database } from '../types/database';
export type { User, Session, AuthError } from '@supabase/supabase-js';