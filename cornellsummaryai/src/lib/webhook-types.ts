/**
 * Webhook Types and Utilities
 * Centralized type definitions and helper functions for webhook processing
 */

export interface WebhookEventResult {
  success: boolean;
  event_type: string;
  user_id?: string;
  error?: string;
  details?: Record<string, any>;
}

export interface SubscriptionUpdate {
  user_id: string;
  subscription_tier: 'free' | 'student';
  stripe_customer_id: string;
  stripe_subscription_id?: string;
  subscription_period_start?: string;
  subscription_period_end?: string;
}

/**
 * Webhook event types we handle
 */
export const SUPPORTED_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.payment_succeeded',
  'invoice.payment_failed'
] as const;

export type SupportedWebhookEvent = typeof SUPPORTED_WEBHOOK_EVENTS[number];

/**
 * Validate if event type is supported
 */
export function isSupportedEvent(eventType: string): eventType is SupportedWebhookEvent {
  return SUPPORTED_WEBHOOK_EVENTS.includes(eventType as SupportedWebhookEvent);
}

/**
 * Map subscription status to tier
 */
export function mapSubscriptionStatusToTier(status: string): 'free' | 'student' {
  const activeTierStatuses = ['active', 'trialing'];
  return activeTierStatuses.includes(status) ? 'student' : 'free';
}

/**
 * Create standardized webhook response
 */
export function createWebhookResponse(
  success: boolean, 
  eventType: string, 
  details?: Record<string, any>
): Response {
  const responseBody = {
    received: success,
    event_type: eventType,
    timestamp: new Date().toISOString(),
    ...details
  };

  return new Response(
    JSON.stringify(responseBody),
    {
      status: success ? 200 : 400,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/**
 * Create error response for webhook
 */
export function createWebhookErrorResponse(error: string, status: number = 500): Response {
  return new Response(
    JSON.stringify({
      error,
      timestamp: new Date().toISOString()
    }),
    {
      status,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}