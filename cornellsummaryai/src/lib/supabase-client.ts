import { createClient } from '@supabase/supabase-js';

declare global {
  interface Window {
    supabase: ReturnType<typeof createClient>;
  }
}

// Create a shared Supabase client instance
let supabaseClient: ReturnType<typeof createClient> | null = null;

// Get or create the shared Supabase client
export function getSupabaseClient() {
  // Only run on client side
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClient can only be called on the client side');
  }

  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
  
  // Also attach to window for backward compatibility
  window.supabase = supabaseClient;

  return supabaseClient;
}

// Initialize on module load
if (typeof window !== 'undefined') {
  getSupabaseClient();
} 