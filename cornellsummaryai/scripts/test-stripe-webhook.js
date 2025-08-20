/**
 * Test script for Stripe webhook endpoint
 * Tests the webhook processing functionality
 */

import dotenv from 'dotenv';
import fetch from 'node-fetch';

// Load environment variables
dotenv.config({ override: false });

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:4321';

/**
 * Mock Stripe webhook payload for testing
 */
function createMockWebhookPayload(eventType = 'checkout.session.completed') {
  const mockPayloads = {
    'checkout.session.completed': {
      id: 'evt_test_webhook',
      object: 'event',
      api_version: '2020-08-27',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'cs_test_session',
          object: 'checkout.session',
          client_reference_id: 'test-user-id-123',
          customer: 'cus_test_customer',
          subscription: 'sub_test_subscription',
          metadata: {
            tier: 'STUDENT'
          },
          payment_status: 'paid',
          status: 'complete'
        }
      },
      livemode: false,
      pending_webhooks: 1,
      request: {
        id: 'req_test',
        idempotency_key: null
      },
      type: eventType
    },
    'customer.subscription.updated': {
      id: 'evt_test_webhook_sub',
      object: 'event',
      api_version: '2020-08-27',
      created: Math.floor(Date.now() / 1000),
      data: {
        object: {
          id: 'sub_test_subscription',
          object: 'subscription',
          customer: 'cus_test_customer',
          status: 'active',
          current_period_start: Math.floor(Date.now() / 1000),
          current_period_end: Math.floor((Date.now() + 30 * 24 * 60 * 60 * 1000) / 1000),
          items: {
            data: [{
              price: {
                id: 'price_test_student'
              }
            }]
          }
        }
      },
      type: eventType
    }
  };

  return mockPayloads[eventType] || mockPayloads['checkout.session.completed'];
}

/**
 * Test webhook endpoint with mock data
 */
async function testWebhookEndpoint() {
  console.log('🧪 Testing Stripe Webhook Endpoint');
  console.log('=====================================');

  const webhookUrl = `${BASE_URL}/api/stripe/webhook`;
  
  try {
    // Test checkout.session.completed event
    console.log('\n1. Testing checkout.session.completed event...');
    const checkoutPayload = createMockWebhookPayload('checkout.session.completed');
    
    const checkoutResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature' // Note: This will fail signature verification in actual webhook
      },
      body: JSON.stringify(checkoutPayload)
    });

    console.log(`Status: ${checkoutResponse.status}`);
    const checkoutResult = await checkoutResponse.json();
    console.log('Response:', JSON.stringify(checkoutResult, null, 2));

    // Test subscription.updated event
    console.log('\n2. Testing customer.subscription.updated event...');
    const subPayload = createMockWebhookPayload('customer.subscription.updated');
    
    const subResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature'
      },
      body: JSON.stringify(subPayload)
    });

    console.log(`Status: ${subResponse.status}`);
    const subResult = await subResponse.json();
    console.log('Response:', JSON.stringify(subResult, null, 2));

    // Test missing signature
    console.log('\n3. Testing missing signature handling...');
    const noSigResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(checkoutPayload)
    });

    console.log(`Status: ${noSigResponse.status}`);
    const noSigResult = await noSigResponse.json();
    console.log('Response:', JSON.stringify(noSigResult, null, 2));

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n💡 Server not running. Start it with: npm run dev');
    }
  }
}

/**
 * Test create checkout session endpoint
 */
async function testCreateCheckoutSession() {
  console.log('\n🧪 Testing Create Checkout Session Endpoint');
  console.log('=============================================');

  const checkoutUrl = `${BASE_URL}/api/stripe/create-checkout-session`;
  
  try {
    const payload = {
      tier: 'STUDENT',
      successUrl: `${BASE_URL}/dashboard?success=true`,
      cancelUrl: `${BASE_URL}/pricing?canceled=true`
    };

    const response = await fetch(checkoutUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    console.log(`Status: ${response.status}`);
    const result = await response.json();
    console.log('Response:', JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('❌ Checkout session test failed:', error.message);
  }
}

// Main execution
async function main() {
  console.log('🚀 Starting Stripe Integration Tests');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('=====================================');

  await testCreateCheckoutSession();
  await testWebhookEndpoint();

  console.log('\n✅ Tests completed');
  console.log('\nNote: Webhook signature verification will fail with mock data.');
  console.log('Use actual Stripe CLI for full webhook testing.');
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { testWebhookEndpoint, testCreateCheckoutSession };