import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { config } from '../../lib/config';

// Initialize Supabase client
const supabaseUrl = config.supabaseUrl;
const supabaseServiceKey = config.supabaseServiceKey;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// We'll initialize Stripe inside the function to avoid build-time errors

export const POST: APIRoute = async ({ request }) => {
  console.log('🔥 WEBHOOK CALLED! Received Stripe webhook event');
  console.log('Request URL:', request.url);
  console.log('Request method:', request.method);
  
  // Initialize Stripe inside the function
  const stripe = new Stripe(config.stripeSecretKey);
  const endpointSecret = config.stripeWebhookSecret;
  
  const signature = request.headers.get('stripe-signature');
  
  if (!signature) {
    console.error('Missing stripe-signature header');
    return new Response(
      JSON.stringify({ error: 'Missing stripe-signature header' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Get the raw body as text
    const payload = await request.text();
    
    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(
        payload,
        signature,
        endpointSecret
      );
      console.log(`Webhook verified successfully: ${event.type}`);
    } catch (err: any) {
      console.error(`⚠️ Webhook signature verification failed:`, err.message);
      return new Response(
        JSON.stringify({ error: `Webhook signature verification failed: ${err.message}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          console.log('Processing checkout.session.completed event');
          await handleCheckoutSessionCompleted(event.data.object);
          break;
        case 'customer.subscription.created':
          console.log('Processing customer.subscription.created event');
          await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.updated':
          console.log('Processing customer.subscription.updated event');
          await handleSubscriptionUpdated(event.data.object);
          break;
        case 'customer.subscription.deleted':
          console.log('Processing customer.subscription.deleted event');
          await handleSubscriptionDeleted(event.data.object);
          break;
        case 'invoice.payment_succeeded':
          console.log('Processing invoice.payment_succeeded event');
          // Handle successful subscription renewals
          const invoice = event.data.object as Stripe.Invoice;
          // Access subscription ID from the invoice object
          const subscriptionId = invoice.subscription as unknown as string;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            await handleSubscriptionUpdated(subscription);
          }
          break;
        case 'invoice.payment_failed':
          console.log('Processing invoice.payment_failed event');
          // Handle failed subscription payments
          const failedInvoice = event.data.object as Stripe.Invoice;
          if (failedInvoice.subscription) {
            console.log(`Payment failed for subscription: ${failedInvoice.subscription}`);
            // You might want to notify the user or take other actions
          }
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }
    } catch (eventError) {
      console.error(`Error processing ${event.type} event:`, eventError);
      // Continue processing to return 200 response to Stripe
      // This prevents Stripe from retrying the webhook unnecessarily
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

/**
 * Handle checkout.session.completed event
 * This is triggered when a customer completes the checkout process
 */
async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  try {
    // Extract customer ID from the session
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    if (!customerId) {
      console.error('No customer ID found in the session');
      return;
    }

    // Determine subscription tier based on the product
    let subscriptionTier = 'free';
    let subscriptionEndDate = null;
    
    if (subscriptionId) {
      try {
        // Get subscription details to determine the tier
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const priceId = subscription.items.data[0].price.id;
        
        // Set subscription end date
        subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
        
        // Map price IDs to subscription tiers based on the payment links
        // STUDENT: €5/month Student tier
        
        // Use the session metadata to determine the tier
        const metadata = session.metadata || {};
        console.log('Session metadata:', metadata);
        
        if (metadata.tier === 'STUDENT') {
          subscriptionTier = 'student';
        } else {
          // Fallback to checking the price ID if available
          console.log('Checking price ID:', priceId);
          // For now, any subscription defaults to student since we only have one tier
          subscriptionTier = 'student';
        }
      } catch (subscriptionError) {
        console.error('Error retrieving subscription details:', subscriptionError);
        // Continue with default tier if subscription retrieval fails
      }
    }

    // Try to find user ID from client_reference_id first
    let userId = session.client_reference_id;
    
    // If no client_reference_id, try to find user by customer email
    if (!userId) {
      console.log('No client_reference_id found, trying to match by customer email');
      
      // Get customer details from Stripe
      const customer = await stripe.customers.retrieve(customerId);
      const customerEmail = (customer as Stripe.Customer)?.email;
      
      if (customerEmail) {
        console.log('Looking for user with email:', customerEmail);
        
        // Find user in Supabase by email
        const { data: profiles, error: fetchError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', customerEmail)
          .limit(1);
          
        if (fetchError) {
          console.error('Error fetching user by email:', fetchError);
          return;
        }
        
        if (profiles && profiles.length > 0) {
          userId = profiles[0].id;
          console.log('Found user by email:', userId);
        } else {
          console.error('No user found with email:', customerEmail);
          return;
        }
      } else {
        console.error('No customer email found');
        return;
      }
    }
    
    if (!userId) {
      console.error('Could not determine user ID');
      return;
    }

    console.log(`Updating user ${userId} with subscription tier: ${subscriptionTier}`);
    
    // Update the user's profile with subscription information
    const { error } = await supabase
      .from('profiles')
      .update({
        stripe_customer_id: customerId,
        stripe_subscription_id: subscriptionId,
        subscription_tier: subscriptionTier,
        subscription_period_start: new Date().toISOString(),
        subscription_period_end: subscriptionEndDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating user profile:', error);
    }
  } catch (error) {
    console.error('Error handling checkout.session.completed:', error);
  }
}

/**
 * Handle customer.subscription.updated event
 * This is triggered when a subscription is updated (e.g., plan change, renewal)
 */
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;
    const subscriptionId = subscription.id;
    const priceId = subscription.items.data[0].price.id;
    
    // Determine subscription tier based on price ID
    let subscriptionTier = 'free';
    switch (priceId) {
      case 'price_student_id': // Replace with actual price ID when known
        subscriptionTier = 'student';
        break;
      default:
        subscriptionTier = 'student'; // Default to student if we can't determine
    }

    // Find the user with this Stripe customer ID
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .limit(1);

    if (fetchError || !profiles || profiles.length === 0) {
      console.error('No user found with Stripe customer ID:', customerId);
      return;
    }

    const userId = profiles[0].id;

    // Update the user's subscription information
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: subscriptionTier,
        stripe_subscription_id: subscriptionId,
        subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating subscription information:', error);
    }
  } catch (error) {
    console.error('Error handling subscription update:', error);
  }
}

/**
 * Handle customer.subscription.deleted event
 * This is triggered when a subscription is canceled or expires
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  try {
    const customerId = subscription.customer as string;

    // Find the user with this Stripe customer ID
    const { data: profiles, error: fetchError } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .limit(1);

    if (fetchError || !profiles || profiles.length === 0) {
      console.error('No user found with Stripe customer ID:', customerId);
      return;
    }

    const userId = profiles[0].id;

    // Update the user's subscription information
    const { error } = await supabase
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_period_end: new Date().toISOString(), // End subscription immediately
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('Error updating subscription information:', error);
    }
  } catch (error) {
    console.error('Error handling subscription deletion:', error);
  }
}