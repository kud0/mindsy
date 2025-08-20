import type { APIRoute } from 'astro';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  console.log(`[API Signin] Processing signin request from: ${request.url}`);
  
  const formData = await request.formData();
  const email = formData.get('email')?.toString();
  const password = formData.get('password')?.toString();
  const provider = formData.get('provider')?.toString();
  
  // Get referer to determine language
  const referer = request.headers.get('referer') || '';
  const isSpanish = referer.includes('/es/');

  console.log(`[API Signin] Form data - email: ${email}, provider: ${provider}, password: ${password ? 'provided' : 'missing'}`);

  if (!email) {
    console.error(`[API Signin] Missing email parameter`);
    return new Response('Email is required', { status: 400 });
  }

  // Debug environment variables
  console.log(`[API Signin] Supabase URL: ${import.meta.env.PUBLIC_SUPABASE_URL ? 'configured' : 'missing'}`);
  console.log(`[API Signin] Supabase Anon Key: ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY ? 'configured' : 'missing'}`);

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

  if (provider === 'github') {
    console.log(`[API Signin] Initiating GitHub OAuth flow`);
    
    const redirectUrl = `${new URL(request.url).origin}/api/auth/callback`;
    console.log(`[API Signin] Redirect URL: ${redirectUrl}`);
    
    // Language-aware callback URL
    const callbackPath = isSpanish ? '/es/auth/callback' : '/auth/callback';
    const redirectTo = `${new URL(request.url).origin}${callbackPath}`;
    console.log(`[API Signin] Language-aware redirectTo: ${redirectTo} (isSpanish: ${isSpanish})`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo,
        scopes: 'user:email',
      },
    });

    if (error) {
      console.error(`[API Signin] GitHub OAuth error:`, error);
      return new Response(error.message, { status: 500 });
    }

    console.log(`[API Signin] GitHub OAuth data:`, { 
      url: data.url, 
      provider: data.provider,
      hasUrl: !!data.url 
    });

    if (!data.url) {
      console.error(`[API Signin] No OAuth URL returned from Supabase`);
      return new Response('OAuth URL not generated', { status: 500 });
    }

    console.log(`[API Signin] Redirecting to GitHub: ${data.url}`);
    return redirect(data.url);
  }

  if (provider === 'google') {
    console.log(`[API Signin] Initiating Google OAuth flow`);
    
    const redirectUrl = `${new URL(request.url).origin}/api/auth/callback`;
    console.log(`[API Signin] Redirect URL: ${redirectUrl}`);
    
    // Language-aware callback URL
    const callbackPath = isSpanish ? '/es/auth/callback' : '/auth/callback';
    const redirectTo = `${new URL(request.url).origin}${callbackPath}`;
    console.log(`[API Signin] Language-aware redirectTo: ${redirectTo} (isSpanish: ${isSpanish})`);
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'email profile',
        queryParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      },
    });

    if (error) {
      console.error(`[API Signin] Google OAuth error:`, error);
      return new Response(error.message, { status: 500 });
    }

    console.log(`[API Signin] Google OAuth data:`, { 
      url: data.url, 
      provider: data.provider,
      hasUrl: !!data.url 
    });

    if (!data.url) {
      console.error(`[API Signin] No OAuth URL returned from Supabase`);
      return new Response('OAuth URL not generated', { status: 500 });
    }

    console.log(`[API Signin] Redirecting to Google: ${data.url}`);
    return redirect(data.url);
  }

  if (!password) {
    console.error(`[API Signin] Missing password parameter`);
    return new Response(JSON.stringify({ error: 'Password is required' }), { 
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  console.log(`[API Signin] Attempting email/password authentication for: ${email}`);
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error(`[API Signin] Email/password authentication error:`, error);
      return new Response(JSON.stringify({ 
        error: error.message,
        code: error.status || 'AUTH_ERROR'
      }), { 
        status: error.status === 400 ? 400 : 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!data?.user) {
      console.error(`[API Signin] No user data returned after authentication`);
      return new Response(JSON.stringify({ 
        error: 'Authentication failed - no user data'
      }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`[API Signin] Email/password authentication successful for user: ${data.user.id}`);
    
    // Return success with redirect URL (cookies are handled by Supabase)
    const dashboardPath = isSpanish ? '/es/dashboard' : '/dashboard';
    return new Response(JSON.stringify({ 
      success: true,
      redirectUrl: dashboardPath,
      user: {
        id: data.user.id,
        email: data.user.email
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (unexpectedError) {
    console.error(`[API Signin] Unexpected error during authentication:`, unexpectedError);
    return new Response(JSON.stringify({ 
      error: 'Authentication service temporarily unavailable'
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};