/**
 * Configuration for test scripts
 * Simple JavaScript version of the config for Node.js scripts
 */

function getEnvVar(name, required = true) {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const config = {
  supabaseUrl: getEnvVar('PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getEnvVar('PUBLIC_SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: getEnvVar('SUPABASE_SERVICE_ROLE_KEY'),
  openaiKey: getEnvVar('OPENAI_KEY'),
  runpodApiKey: getEnvVar('RUNPOD_API_KEY'),
  tikaApiUrl: getEnvVar('TIKA_API_URL'),
  gotenbergApiUrl: getEnvVar('GOTENBERG_API_URL'),
  stripeSecretKey: getEnvVar('STRIPE_SECRET_KEY', false),
  stripeWebhookSecret: getEnvVar('STRIPE_WEBHOOK_SECRET', false),
  nodeEnv: process.env.NODE_ENV || 'development'
};

export function validateEnvVars() {
  const required = [
    'PUBLIC_SUPABASE_URL',
    'PUBLIC_SUPABASE_ANON_KEY', 
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_KEY',
    'RUNPOD_API_KEY',
    'TIKA_API_URL',
    'GOTENBERG_API_URL'
  ];
  
  const missing = required.filter(name => !process.env[name]);
  
  return {
    valid: missing.length === 0,
    missingVars: missing
  };
}