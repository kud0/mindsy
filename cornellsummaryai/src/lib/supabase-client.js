/**
 * Client-side Supabase utilities
 * This provides access to Supabase client for browser scripts
 */

// Check if Supabase is available globally (should be set by layout)
export const supabase = window.supabase || (() => {
  throw new Error('Supabase not initialized. Make sure the layout properly initializes the global supabase client.');
})();

export const db = supabase;