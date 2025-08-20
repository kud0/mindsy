import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  console.log('🔥 SIMPLE CHECKOUT CALLED!');
  
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    return new Response(
      JSON.stringify({ 
        success: true,
        url: 'https://buy.stripe.com/3cI9AS4O64Jp4do8CgdIA00',
        tier: 'student',
        name: 'Student Plan'
      }),
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Failed', details: error }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ 
      message: 'Simple checkout GET works!',
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
};