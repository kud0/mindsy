import type { APIRoute } from 'astro';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const supabase = createServerClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          get(key) {
            return cookies.get(key)?.value;
          },
          set(key, value, options) {
            cookies.set(key, value, options);
          },
          remove(key, options) {
            cookies.delete(key, options);
          },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ user: null, session: null, error: userError?.message || 'No user found' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ user: null, session: null, error: sessionError?.message || 'No session found' }), 
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        user: {
          id: user.id,
          email: user.email,
          user_metadata: user.user_metadata
        }, 
        session: {
          access_token: session.access_token,
          refresh_token: session.refresh_token
        } 
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Session API error:', error);
    return new Response(
      JSON.stringify({ user: null, session: null, error: 'Internal server error' }), 
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};