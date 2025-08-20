import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../../lib/config';
import {
  handleCheckoutSessionCompleted,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
  handleInvoicePaymentSucceeded,
  handleInvoicePaymentFailed
} from '../../../lib/webhook-handlers';
import {
  isSupportedEvent,
  createWebhookResponse,
  createWebhookErrorResponse,
  SUPPORTED_WEBHOOK_EVENTS
} from '../../../lib/webhook-types';

// Initialize clients at module level for better performance
const stripe = new Stripe(config.stripeSecretKey);
const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);


export const POST: APIRoute = async ({ request }) => {
  console.log('🔥 STRIPE WEBHOOK: Received event');
  
  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('❌ Missing stripe-signature header');
    return createWebhookErrorResponse('Missing stripe-signature header', 400);
  }

  try {
    // Get the raw body as text
    const payload = await request.text();
    
    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        config.stripeWebhookSecret
      );
      console.log(`✅ Webhook verified: ${event.type}`);
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return createWebhookErrorResponse(`Invalid signature: ${err.message}`, 400);
    }

    // Check if event type is supported
    if (!isSupportedEvent(event.type)) {
      console.log(`ℹ️ Unhandled event type: ${event.type}`);
      return createWebhookResponse(true, event.type, { note: 'Event type not handled' });
    }

    // Handle the event with improved error handling
    let result;
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          result = await handleCheckoutSessionCompleted(
            event.data.object as Stripe.Checkout.Session,
            stripe,
            supabase
          );
          break;
        case 'customer.subscription.updated':
          result = await handleSubscriptionUpdated(
            event.data.object as Stripe.Subscription,
            supabase
          );
          break;
        case 'customer.subscription.deleted':
          result = await handleSubscriptionDeleted(
            event.data.object as Stripe.Subscription,
            supabase
          );
          break;
        case 'invoice.payment_succeeded':
          result = await handleInvoicePaymentSucceeded(
            event.data.object as Stripe.Invoice,
            stripe,
            supabase
          );
          break;
        case 'invoice.payment_failed':
          result = await handleInvoicePaymentFailed(
            event.data.object as Stripe.Invoice
          );
          break;
        default:
          result = {
            success: true,
            event_type: event.type,
            details: { note: 'Event type not handled' }
          };
      }
      
      // Log the result
      if (result.success) {
        console.log(`✅ Successfully processed ${event.type}`);
        if (result.user_id) {
          console.log(`👤 Updated user: ${result.user_id}`);
        }
      } else {
        console.error(`❌ Failed to process ${event.type}: ${result.error}`);
      }
      
    } catch (eventError: any) {
      console.error(`❌ Error processing ${event.type}:`, eventError.message);
      result = {
        success: false,
        event_type: event.type,
        error: eventError.message
      };
    }

    return createWebhookResponse(result.success, event.type, result.details);
    
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error.message);
    return createWebhookErrorResponse('Internal server error', 500);
  }
};

/**
 * GET endpoint for webhook status and configuration
 */
export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ 
      message: 'Stripe webhook endpoint', 
      status: 'active',
      events_supported: SUPPORTED_WEBHOOK_EVENTS,
      version: '2.0.0'
    }), 
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};

