/**
 * Configuration for external services
 * Based on environment variables
 */

export const config = {
  // OpenAI Configuration
  openaiKey: process.env.OPENAI_API_KEY || '',
  
  // RunPod Configuration
  runpodApiKey: process.env.RUNPOD_API_KEY || '',
  runpodDebugMode: process.env.RUNPOD_DEBUG_MODE === 'true' || false,
  
  // Gotenberg Configuration
  gotenbergApiUrl: process.env.GOTENBERG_API_URL || 'http://localhost:3000',
  
  // Supabase Configuration (from Next.js)
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
};

/**
 * Validate that required configuration is present
 */
export function validateConfig() {
  const missing: string[] = [];

  if (!config.openaiKey) missing.push('OPENAI_API_KEY');
  if (!config.runpodApiKey) missing.push('RUNPOD_API_KEY');
  if (!config.supabaseUrl) missing.push('NEXT_PUBLIC_SUPABASE_URL');
  if (!config.supabaseAnonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return true;
}