import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Configure OAuth redirect URLs
    redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : undefined,
    // Enable automatic session refresh
    autoRefreshToken: true,
    // Persist session in localStorage
    persistSession: true,
    // Detect session in URL hash
    detectSessionInUrl: true
  }
}); 