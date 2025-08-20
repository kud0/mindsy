/**
 * Application Configuration
 * 
 * This module provides centralized access to environment variables and configuration settings.
 * It validates required environment variables and provides typed access to them.
 */

/**
 * Environment variable configuration interface
 */
export interface EnvConfig {
  // Supabase configuration
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceKey: string;
  
  // External API keys and URLs
  openaiKey: string;
  runpodApiKey: string;
  tikaApiUrl: string;
  gotenbergApiUrl: string;
  googleVisionApiKey?: string;
  
  // Stripe configuration
  stripeSecretKey: string;
  stripeWebhookSecret: string;
  
  // Server configuration
  nodeEnv: 'development' | 'production' | 'test';
  vercelEnv?: string;
  
  // API timeouts (in milliseconds)
  apiTimeoutMs: number;
  
  // Metrics API key for authentication
  metricsApiKey?: string;
  
  // Debug flags
  runpodDebugMode: boolean;
}

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  missingVars: string[];
}

/**
 * Validate required environment variables
 * @returns Validation result with list of missing variables
 */
export function validateEnvVars(): ValidationResult {
  const requiredVars = [
    'PUBLIC_SUPABASE_URL',
    'PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_KEY',
    'RUNPOD_API_KEY',
    'TIKA_API_URL',
    'GOTENBERG_API_URL',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET'
  ];
  
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  return {
    valid: missingVars.length === 0,
    missingVars
  };
}

/**
 * Get environment configuration with validation
 * @param skipValidation - Skip validation (useful for testing)
 * @returns Environment configuration object
 * @throws Error if required environment variables are missing
 */
export function getConfig(skipValidation = false): EnvConfig {
  if (!skipValidation) {
    const { valid, missingVars } = validateEnvVars();
    if (missingVars.length > 0) {
      console.warn(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
  }
  
  return {
    // Supabase configuration
    supabaseUrl: import.meta.env.PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: import.meta.env.PUBLIC_SUPABASE_ANON_KEY || '',
    supabaseServiceKey: import.meta.env.SUPABASE_SERVICE_ROLE_KEY || '',
    
    // External API keys and URLs
    openaiKey: import.meta.env.OPENAI_KEY || '',
    runpodApiKey: import.meta.env.RUNPOD_API_KEY || '',
    tikaApiUrl: import.meta.env.TIKA_API_URL || '',
    gotenbergApiUrl: import.meta.env.GOTENBERG_API_URL || '',
    googleVisionApiKey: import.meta.env.GOOGLE_VISION_API_KEY || undefined,
    
    // Stripe configuration
    stripeSecretKey: import.meta.env.STRIPE_SECRET_KEY || '',
    stripeWebhookSecret: import.meta.env.STRIPE_WEBHOOK_SECRET || '',
    
    // Server configuration
    nodeEnv: (import.meta.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    vercelEnv: import.meta.env.VERCEL_ENV,
    
    // API timeouts (in milliseconds)
    apiTimeoutMs: parseInt(import.meta.env.API_TIMEOUT_MS || '30000', 10),
    
    // Metrics API key for authentication
    metricsApiKey: import.meta.env.METRICS_API_KEY || '',
    
    // Debug flags
    runpodDebugMode: import.meta.env.RUNPOD_DEBUG_MODE === 'true'
  };
}

/**
 * Default configuration object
 */
export const config = getConfig();

/**
 * Check if running in production environment
 */
export const isProduction = config.nodeEnv === 'production';

/**
 * Check if running in development environment
 */
export const isDevelopment = config.nodeEnv === 'development';

/**
 * Check if running in test environment
 */
export const isTest = config.nodeEnv === 'test';

/**
 * API timeout in milliseconds
 */
export const API_TIMEOUT_MS = config.apiTimeoutMs;

/**
 * Storage bucket names
 */
export const STORAGE_BUCKETS = {
  USER_UPLOADS: 'user-uploads',
  GENERATED_NOTES: 'generated-notes'
};

/**
 * Expiration times for signed URLs (in seconds)
 */
export const EXPIRATION_TIMES = {
  SHORT: 900,    // 15 minutes
  MEDIUM: 3600,  // 1 hour
  LONG: 21600    // 6 hours
};