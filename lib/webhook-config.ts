/**
 * Webhook configuration for RunPod
 * Handles both development (ngrok) and production environments
 */

interface WebhookConfig {
  isWebhookEnabled: boolean;
  webhookUrl: string | null;
  mode: 'webhook' | 'polling';
  debugInfo: {
    environment: string;
    baseUrl: string | null;
    reason: string;
  };
}

/**
 * Get webhook configuration based on environment
 * Automatically detects ngrok URLs or production URLs
 */
export function getWebhookConfig(): WebhookConfig {
  const env = process.env.NODE_ENV;
  
  // Priority 1: Check for explicit webhook URL (works in dev and prod)
  const webhookBaseUrl = process.env.WEBHOOK_BASE_URL || process.env.NEXT_PUBLIC_WEBHOOK_BASE_URL;
  
  if (webhookBaseUrl) {
    // Validate it's a proper URL
    try {
      const url = new URL(webhookBaseUrl);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return {
          isWebhookEnabled: true,
          webhookUrl: `${webhookBaseUrl}/api/runpod-webhook`,
          mode: 'webhook',
          debugInfo: {
            environment: env || 'unknown',
            baseUrl: webhookBaseUrl,
            reason: 'Using explicit WEBHOOK_BASE_URL'
          }
        };
      }
    } catch (e) {
      console.warn('Invalid WEBHOOK_BASE_URL:', webhookBaseUrl);
    }
  }
  
  // Priority 2: In production, use the app URL
  if (env === 'production') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null;
    
    if (appUrl) {
      return {
        isWebhookEnabled: true,
        webhookUrl: `${appUrl}/api/runpod-webhook`,
        mode: 'webhook',
        debugInfo: {
          environment: env,
          baseUrl: appUrl,
          reason: 'Using production APP_URL'
        }
      };
    }
  }
  
  // Priority 3: Development without ngrok - use polling
  console.log('⚠️ Webhook URL not configured - falling back to polling mode');
  console.log('💡 To use webhooks locally, run: ./scripts/start-ngrok.sh');
  
  return {
    isWebhookEnabled: false,
    webhookUrl: null,
    mode: 'polling',
    debugInfo: {
      environment: env || 'unknown',
      baseUrl: null,
      reason: 'No webhook URL configured, using polling'
    }
  };
}

/**
 * Log webhook configuration for debugging
 */
export function logWebhookConfig() {
  const config = getWebhookConfig();
  
  console.log('🔧 RunPod Webhook Configuration:');
  console.log(`  Mode: ${config.mode}`);
  console.log(`  Environment: ${config.debugInfo.environment}`);
  console.log(`  Webhook Enabled: ${config.isWebhookEnabled}`);
  
  if (config.webhookUrl) {
    console.log(`  Webhook URL: ${config.webhookUrl}`);
  }
  
  console.log(`  Reason: ${config.debugInfo.reason}`);
  
  if (config.mode === 'polling') {
    console.log('');
    console.log('📌 To enable webhooks for local development:');
    console.log('   1. Install ngrok: brew install ngrok/ngrok/ngrok');
    console.log('   2. Run: ./scripts/start-ngrok.sh');
    console.log('   3. Add the URL to .env.local as WEBHOOK_BASE_URL');
    console.log('   4. Restart your Next.js server');
  }
}

/**
 * Helper to determine if we should use webhooks
 */
export function shouldUseWebhooks(): boolean {
  const config = getWebhookConfig();
  return config.isWebhookEnabled;
}

/**
 * Get the webhook URL or null
 */
export function getWebhookUrl(): string | null {
  const config = getWebhookConfig();
  return config.webhookUrl;
}