#!/usr/bin/env node

/**
 * Webhook Testing Script
 * Tests the Stripe webhook endpoint implementation
 */

const WEBHOOK_URL = process.env.WEBHOOK_URL || 'http://localhost:4321/api/stripe/webhook';

async function testWebhookEndpoint() {
  console.log('🧪 Testing Stripe Webhook Implementation');
  console.log('='.repeat(50));
  
  try {
    // Test GET endpoint (status check)
    console.log('\n1. Testing GET endpoint...');
    const getResponse = await fetch(WEBHOOK_URL, {
      method: 'GET'
    });
    
    const getResult = await getResponse.json();
    console.log(`Status: ${getResponse.status}`);
    console.log('Response:', JSON.stringify(getResult, null, 2));
    
    // Test POST endpoint (without valid signature - expected to fail)
    console.log('\n2. Testing POST endpoint (without signature)...');
    const postResponse = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'checkout.session.completed',
        data: { object: { customer: 'test' } }
      })
    });
    
    const postResult = await postResponse.json();
    console.log(`Status: ${postResponse.status}`);
    console.log('Response:', JSON.stringify(postResult, null, 2));
    
    console.log('\n✅ Webhook endpoint tests completed');
    console.log('\n📋 Summary:');
    console.log('- GET endpoint should return 200 with webhook info');
    console.log('- POST endpoint should return 400 without valid Stripe signature');
    console.log('- Both responses should have proper JSON format');
    
  } catch (error) {
    console.error('❌ Error testing webhook:', error.message);
  }
}

// Run the test
testWebhookEndpoint();