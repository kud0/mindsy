import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request }) => {
  console.log('🔥 SIMPLE WEBHOOK CALLED!');
  
  return new Response(
    JSON.stringify({ 
      message: 'Simple webhook works!',
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ 
      message: 'Simple webhook GET works!',
      timestamp: new Date().toISOString()
    }),
    { 
      status: 200, 
      headers: { 'Content-Type': 'application/json' } 
    }
  );
};