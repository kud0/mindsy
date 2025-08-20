import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  console.log('🔥 WEBHOOK TEST CALLED!');
  
  try {
    const body = await request.text();
    console.log('Webhook body received:', body.substring(0, 100) + '...');
    
    return new Response(
      JSON.stringify({ received: true }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed', details: error }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ 
      message: 'Webhook test endpoint works!',
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
};