import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

export const GET: APIRoute = async () => {
  try {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

    console.log('Supabase URL:', supabaseUrl);
    console.log('Supabase Key exists:', !!supabaseAnonKey);

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing Supabase environment variables',
        url: supabaseUrl,
        keyExists: !!supabaseAnonKey
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Test connection - using secure getUser method
    const { data, error } = await supabase.auth.getUser();
    
    return new Response(JSON.stringify({ 
      success: true,
      connectionTest: 'OK',
      error: error?.message || null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Supabase test error:', error);
    return new Response(JSON.stringify({ 
      error: 'Connection test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};