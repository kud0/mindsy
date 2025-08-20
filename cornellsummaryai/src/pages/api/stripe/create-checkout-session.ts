import type { APIRoute } from 'astro';
import Stripe from 'stripe';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;

// We'll initialize Stripe inside the function to avoid build-time errors

const SUBSCRIPTION_TIERS = {
  STUDENT: {
    url: 'https://buy.stripe.com/3cI9AS4O64Jp4do8CgdIA00',
    tier: 'student',
    name: 'Student Plan',
    metadata: { tier: 'STUDENT' }
  }
};

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Initialize Stripe inside the function
    const stripeSecretKey = import.meta.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return new Response(
        JSON.stringify({ error: 'STRIPE_SECRET_KEY not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
      typescript: true,
    });
    // Create Supabase server client using cookies (no Bearer token needed)
    const supabase = createServerClient(
      import.meta.env.PUBLIC_SUPABASE_URL!,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(key: string) {
            return cookies.get(key)?.value;
          },
          set(key: string, value: string, options: any) {
            cookies.set(key, value, options);
          },
          remove(key: string, options: any) {
            cookies.delete(key, options);
          },
        },
      }
    );

    // Get authenticated user from session cookies
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error('Authentication error:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized', 
          message: 'Authentication required. Please log in again.',
          details: authError?.message 
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const { tier, successUrl, cancelUrl } = body;

    if (!tier || !SUBSCRIPTION_TIERS[tier]) {
      return new Response(
        JSON.stringify({ 
          error: 'Bad Request', 
          message: `Invalid subscription tier: ${tier}. Valid options: ${Object.keys(SUBSCRIPTION_TIERS).join(', ')}` 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Creating checkout session for user ${user.id}, tier: ${tier}`);

    // Build the payment URL with client_reference_id to help webhook identify the user
    const paymentUrl = new URL(SUBSCRIPTION_TIERS[tier].url);
    paymentUrl.searchParams.set('client_reference_id', user.id);
    
    console.log(`Payment URL with user reference: ${paymentUrl.toString()}`);

    // Return the enhanced payment link with user reference
    return new Response(
      JSON.stringify({ 
        success: true, 
        url: paymentUrl.toString(),
        tier: SUBSCRIPTION_TIERS[tier].tier,
        name: SUBSCRIPTION_TIERS[tier].name,
        userId: user.id,
        clientReferenceId: user.id
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error creating checkout session:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Failed to create checkout session';
    let statusCode = 500;

    if (error instanceof Stripe.errors.StripeError) {
      errorMessage = `Stripe error: ${error.message}`;
      statusCode = error.statusCode || 500;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return new Response(
      JSON.stringify({ 
        error: 'Checkout Session Error', 
        message: errorMessage,
        details: import.meta.env.NODE_ENV === 'development' ? error : undefined
      }),
      { 
        status: statusCode, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  }
};