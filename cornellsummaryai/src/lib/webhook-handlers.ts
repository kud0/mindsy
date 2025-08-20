/**
 * Webhook Event Handlers
 * Centralized business logic for processing Stripe webhook events
 */

import type Stripe from 'stripe';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { SubscriptionUpdate, WebhookEventResult } from './webhook-types';
import { mapSubscriptionStatusToTier } from './webhook-types';

/**
 * Find user by multiple strategies (client_reference_id, then email)
 */
async function findUserIdFromSession(
  session: Stripe.Checkout.Session, 
  stripe: Stripe, 
  supabase: SupabaseClient
): Promise<string | null> {
  // Strategy 1: Use client_reference_id (most reliable)
  if (session.client_reference_id) {
    console.log('📋 Using client_reference_id:', session.client_reference_id);
    return session.client_reference_id;
  }

  // Strategy 2: Find by customer email
  const customerId = session.customer as string;
  if (!customerId) {
    console.error('❌ No customer ID in session');
    return null;
  }

  try {
    const customer = await stripe.customers.retrieve(customerId);
    const customerEmail = (customer as Stripe.Customer)?.email;
    
    if (!customerEmail) {
      console.error('❌ No customer email found');
      return null;
    }

    console.log('🔍 Finding user by email:', customerEmail);
    
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', customerEmail)
      .limit(1);
      
    if (error) {
      console.error('❌ Error finding user by email:', error.message);
      return null;
    }
    
    if (!profiles || profiles.length === 0) {
      console.error('❌ No user found with email:', customerEmail);
      return null;
    }
    
    return profiles[0].id;
    
  } catch (error: any) {
    console.error('❌ Error retrieving customer:', error.message);
    return null;
  }
}

/**
 * Find user by Stripe customer ID
 */
async function findUserByCustomerId(
  customerId: string, 
  supabase: SupabaseClient
): Promise<string | null> {
  try {
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', customerId)
      .limit(1);

    if (error) {
      console.error('❌ Error finding user by customer ID:', error.message);
      return null;
    }

    if (!profiles || profiles.length === 0) {
      console.error('❌ No user found with customer ID:', customerId);
      return null;
    }

    return profiles[0].id;
  } catch (error: any) {
    console.error('❌ Error in findUserByCustomerId:', error.message);
    return null;
  }
}

/**
 * Update user subscription in database
 */
async function updateUserSubscription(
  userId: string,
  updateData: Partial<SubscriptionUpdate>,
  supabase: SupabaseClient
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      console.error('❌ Error updating user subscription:', error.message);
      return false;
    }

    console.log('✅ Successfully updated user subscription');
    return true;
  } catch (error: any) {
    console.error('❌ Error in updateUserSubscription:', error.message);
    return false;
  }
}

/**
 * Handle checkout.session.completed event
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: SupabaseClient
): Promise<WebhookEventResult> {
  console.log('📋 Processing checkout.session.completed');
  
  try {
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;
    
    if (!customerId) {
      return {
        success: false,
        event_type: 'checkout.session.completed',
        error: 'No customer ID in session'
      };
    }

    // Find user ID
    const userId = await findUserIdFromSession(session, stripe, supabase);
    if (!userId) {
      return {
        success: false,
        event_type: 'checkout.session.completed',
        error: 'Could not find user'
      };
    }

    // Calculate subscription dates
    const subscriptionStartDate = new Date().toISOString();
    let subscriptionEndDate = null;
    
    if (subscriptionId) {
      try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        subscriptionEndDate = new Date(subscription.current_period_end * 1000).toISOString();
      } catch (subError: any) {
        console.warn('⚠️ Could not retrieve subscription details:', subError.message);
      }
    }
    
    // Update user profile
    const updateData: Partial<SubscriptionUpdate> = {
      subscription_tier: 'student',
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      subscription_period_start: subscriptionStartDate,
      subscription_period_end: subscriptionEndDate
    };
    
    const success = await updateUserSubscription(userId, updateData, supabase);
    
    // IMPORTANT: Reset usage when upgrading to give fresh start
    if (success) {
      console.log('🔄 Resetting usage for upgrade - giving fresh start');
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      const { error: usageError } = await supabase
        .from('usage')
        .upsert({
          user_id: userId,
          month_year: currentMonth,
          summaries_count: 0,
          total_mb_used: 0
        });
        
      if (usageError) {
        console.warn('⚠️ Could not reset usage:', usageError.message);
      } else {
        console.log('✅ Usage reset - user gets fresh 25h limit');
      }
    }
    
    return {
      success,
      event_type: 'checkout.session.completed',
      user_id: userId,
      details: {
        tier: 'student',
        customer_id: customerId,
        subscription_id: subscriptionId,
        usage_reset: success
      }
    };
    
  } catch (error: any) {
    console.error('❌ Error in handleCheckoutSessionCompleted:', error.message);
    return {
      success: false,
      event_type: 'checkout.session.completed',
      error: error.message
    };
  }
}

/**
 * Handle customer.subscription.updated event
 */
export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
): Promise<WebhookEventResult> {
  console.log('🔄 Processing subscription update');
  
  try {
    const customerId = subscription.customer as string;
    const userId = await findUserByCustomerId(customerId, supabase);
    
    if (!userId) {
      return {
        success: false,
        event_type: 'customer.subscription.updated',
        error: 'User not found'
      };
    }

    const tier = mapSubscriptionStatusToTier(subscription.status);
    
    const updateData: Partial<SubscriptionUpdate> = {
      subscription_tier: tier,
      stripe_subscription_id: subscription.id,
      subscription_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      subscription_period_end: new Date(subscription.current_period_end * 1000).toISOString()
    };
    
    const success = await updateUserSubscription(userId, updateData, supabase);
    
    return {
      success,
      event_type: 'customer.subscription.updated',
      user_id: userId,
      details: {
        tier,
        status: subscription.status,
        subscription_id: subscription.id
      }
    };
    
  } catch (error: any) {
    console.error('❌ Error in handleSubscriptionUpdated:', error.message);
    return {
      success: false,
      event_type: 'customer.subscription.updated',
      error: error.message
    };
  }
}

/**
 * Handle customer.subscription.deleted event
 */
export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: SupabaseClient
): Promise<WebhookEventResult> {
  console.log('🗑️ Processing subscription deletion');
  
  try {
    const customerId = subscription.customer as string;
    const userId = await findUserByCustomerId(customerId, supabase);
    
    if (!userId) {
      return {
        success: false,
        event_type: 'customer.subscription.deleted',
        error: 'User not found'
      };
    }
    
    const updateData: Partial<SubscriptionUpdate> = {
      subscription_tier: 'free',
      subscription_period_end: new Date().toISOString()
    };
    
    const success = await updateUserSubscription(userId, updateData, supabase);
    
    return {
      success,
      event_type: 'customer.subscription.deleted',
      user_id: userId,
      details: {
        tier: 'free',
        cancelled_at: new Date().toISOString()
      }
    };
    
  } catch (error: any) {
    console.error('❌ Error in handleSubscriptionDeleted:', error.message);
    return {
      success: false,
      event_type: 'customer.subscription.deleted',
      error: error.message
    };
  }
}

/**
 * Handle invoice.payment_succeeded event
 */
export async function handleInvoicePaymentSucceeded(
  invoice: Stripe.Invoice,
  stripe: Stripe,
  supabase: SupabaseClient
): Promise<WebhookEventResult> {
  console.log('💳 Processing successful payment');
  
  if (!invoice.subscription) {
    return {
      success: true,
      event_type: 'invoice.payment_succeeded',
      details: { note: 'Invoice not related to subscription' }
    };
  }
  
  try {
    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    return await handleSubscriptionUpdated(subscription, supabase);
  } catch (error: any) {
    console.error('❌ Error processing payment success:', error.message);
    return {
      success: false,
      event_type: 'invoice.payment_succeeded',
      error: error.message
    };
  }
}

/**
 * Handle invoice.payment_failed event
 */
export async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice
): Promise<WebhookEventResult> {
  console.log('💸 Processing failed payment');
  
  if (invoice.subscription) {
    console.warn(`⚠️ Payment failed for subscription: ${invoice.subscription}`);
  }
  
  return {
    success: true,
    event_type: 'invoice.payment_failed',
    details: {
      subscription_id: invoice.subscription,
      amount: invoice.amount_due,
      note: 'Payment failure logged - Stripe will retry automatically'
    }
  };
}