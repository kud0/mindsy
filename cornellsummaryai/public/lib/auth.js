/**
 * Client-side Authentication Module (Static Version)
 * 
 * This module provides authentication functions for client-side usage.
 * Uses the global Supabase client initialized by the layout.
 */

/**
 * Get the global Supabase client
 */
function getSupabase() {
  if (!window.supabase) {
    throw new Error('Supabase client not initialized. Make sure to load this after Supabase is ready.');
  }
  return window.supabase;
}

/**
 * Initialize authentication - sets up Supabase client
 */
export async function initAuth() {
  const supabase = getSupabase();
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error) {
    return { user: null, session: null, error };
  }
  
  return { user: session?.user || null, session, error: null };
}

/**
 * Sign in with email and password
 */
export async function signIn(email, password) {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    return { user: null, error };
  }
  
  return { user: data.user, error: null };
}

/**
 * Alternative name for signIn (for backward compatibility)
 */
export async function signInWithPassword(email, password) {
  return signIn(email, password);
}

/**
 * Sign up with email and password
 */
export async function signUp(email, password, metadata = {}) {
  const supabase = getSupabase();
  
  const signUpOptions = {
    email,
    password,
  };
  
  // Add metadata if provided
  if (metadata && Object.keys(metadata).length > 0) {
    signUpOptions.options = {
      data: metadata,
      user_metadata: metadata
    };
  }
  
  const { data, error } = await supabase.auth.signUp(signUpOptions);
  
  if (error) {
    return { data: null, user: null, error };
  }
  
  return { data, user: data.user, session: data.session, error: null };
}

/**
 * Reset password
 */
export async function resetPassword(email) {
  const supabase = getSupabase();
  
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  
  if (error) {
    return { error };
  }
  
  return { error: null };
}

/**
 * Sign in with GitHub
 */
export async function signInWithGitHub() {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });
  
  if (error) {
    return { error };
  }
  
  return { error: null };
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  const supabase = getSupabase();
  
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/dashboard`,
    },
  });
  
  if (error) {
    return { error };
  }
  
  return { error: null };
}

/**
 * Sign out
 */
export async function signOut() {
  const supabase = getSupabase();
  
  const { error } = await supabase.auth.signOut();
  
  if (error) {
    return { error };
  }
  
  // Redirect to home page
  window.location.href = '/';
  
  return { error: null };
}

/**
 * Get current user
 */
export async function getCurrentUser() {
  const supabase = getSupabase();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error) {
    return { user: null, error };
  }
  
  return { user, error: null };
}

/**
 * Listen to auth state changes
 */
export function onAuthStateChange(callback) {
  const supabase = getSupabase();
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
}

