import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../lib/config';

export const POST: APIRoute = async ({ request }) => {
  // Initialize clients inside function to avoid build-time errors
  const stripe = new Stripe(config.stripeSecretKey);
  const supabase = createClient(config.supabaseUrl, config.supabaseServiceKey);
  console.log('🔥 STRIPE WEBHOOK: Received event');
  
  try {
    
    const signature = request.headers.get('stripe-signature');
    const payload = await request.text();
    
    if (!signature) {
      console.error('Missing stripe-signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), { status: 400 });
    }

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
      return new Response(
        JSON.stringify({ error: `Invalid signature: ${err.message}` }), 
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle different event types
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        case 'customer.subscription.updated':
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
          await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        case 'invoice.payment_failed':
          await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        default:
          console.log(`ℹ️  Unhandled event type: ${event.type}`);
      }
    } catch (eventError: any) {
      console.error(`❌ Error processing ${event.type}:`, eventError.message);
      // Continue to return 200 to prevent Stripe retries for handled errors
    }

    return new Response(
      JSON.stringify({ received: true, event_type: event.type }), 
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
    
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error.message);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }), 
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  /**
   * Handle checkout.session.completed event - upgrades user to student tier
   */
  async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session): Promise<void> {
    console.log('📋 Processing checkout.session.completed');
    
    try {
      const customerId = session.customer as string;
      const subscriptionId = session.subscription as string;
      const clientReferenceId = session.client_reference_id; // This should be the user ID
      
      console.log('Session details:', {
        customerId,
        subscriptionId,
        clientReferenceId,
        customerDetails: session.customer_details
      });
      
      // Use client_reference_id (user ID) if available, otherwise find by email
      let userId = clientReferenceId;
      
      if (!userId && session.customer_details?.email) {
        console.log('🔍 Finding user by customer email:', session.customer_details.email);
        
        // Find user by email
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', session.customer_details.email)
          .limit(1);
          
        if (error) {
          console.error('❌ Error finding user by email:', error.message);
          return;
        }
        
        if (!profiles || profiles.length === 0) {
          console.error('❌ No user found with email:', session.customer_details.email);
          return;
        }
        
        userId = profiles[0].id;
      }
      
      if (!userId) {
        console.error('❌ No user ID found in session');
        return;
      }
      
      console.log('👤 Processing upgrade for user:', userId);
      
      // Calculate subscription dates
      const subscriptionStartDate = new Date().toISOString();
      let subscriptionEndDate = null;
      
      if (subscriptionId) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
          console.log('📅 Subscription period end:', subscriptionEndDate);
        } catch (subError: any) {
          console.warn('⚠️  Could not retrieve subscription details:', subError.message);
        }
      }
      
      // Update user profile to Student tier
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          subscription_tier: 'student',
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          subscription_period_start: subscriptionStartDate,
          subscription_period_end: subscriptionEndDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);
        
      if (updateError) {
        console.error('❌ Error updating user profile:', updateError.message);
        throw updateError;
      }
      
      console.log('✅ Successfully upgraded user to Student tier!');
      
    } catch (error: any) {
      console.error('❌ Error in handleCheckoutSessionCompleted:', error.message);
      throw error;
    }
  }

  /**
   * Handle customer.subscription.updated event
   */
  async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
    console.log('🔄 Processing subscription update');
    
    try {
      const customerId = subscription.customer as string;
      
      // Find user with this Stripe customer ID
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .limit(1);

      if (fetchError || !profiles || profiles.length === 0) {
        console.error('❌ No user found with customer ID:', customerId);
        return;
      }

      const userId = profiles[0].id;
      const isActive = subscription.status === 'active' || subscription.status === 'trialing';
      
      // Update subscription information
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_tier: isActive ? 'student' : 'free',
          stripe_subscription_id: subscription.id,
          subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
          subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error updating subscription:', error.message);
        throw error;
      }
      
      console.log(`✅ Updated user subscription: ${isActive ? 'student' : 'free'} tier`);
      
    } catch (error: any) {
      console.error('❌ Error in handleSubscriptionUpdated:', error.message);
      throw error;
    }
  }

  /**
   * Handle customer.subscription.deleted event
   */
  async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
    console.log('🗑️  Processing subscription deletion');
    
    try {
      const customerId = subscription.customer as string;
      
      // Find user with this Stripe customer ID
      const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .limit(1);

      if (fetchError || !profiles || profiles.length === 0) {
        console.error('❌ No user found with customer ID:', customerId);
        return;
      }

      const userId = profiles[0].id;
      
      // Downgrade to free tier
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_tier: 'free',
          subscription_period_end: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Error downgrading user:', error.message);
        throw error;
      }
      
      console.log('✅ Downgraded user to free tier');
      
    } catch (error: any) {
      console.error('❌ Error in handleSubscriptionDeleted:', error.message);
      throw error;
    }
  }

  /**
   * Handle invoice.payment_succeeded event
   */
  async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    console.log('💳 Processing successful payment');
    
    if (!invoice.subscription) {
      console.log('ℹ️  Invoice not related to subscription, skipping');
      return;
    }
    
    try {
      const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
      await handleSubscriptionUpdated(subscription);
      console.log('✅ Subscription renewed successfully');
    } catch (error: any) {
      console.error('❌ Error processing payment success:', error.message);
      throw error;
    }
  }

  /**
   * Handle invoice.payment_failed event
   */
  async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    console.log('💸 Processing failed payment');
    
    if (invoice.subscription) {
      console.warn(`⚠️  Payment failed for subscription: ${invoice.subscription}`);
      // Note: We don't immediately downgrade on failed payments
      // Stripe will retry and eventually cancel the subscription if payments continue to fail
    }
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ 
      message: 'Stripe webhook endpoint', 
      status: 'active',
      events_supported: [
        'checkout.session.completed',
        'customer.subscription.updated', 
        'customer.subscription.deleted',
        'invoice.payment_succeeded',
        'invoice.payment_failed'
      ]
    }), 
    { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }
  );
};