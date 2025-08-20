import type { APIRoute } from 'astro';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;

export const GET: APIRoute = async ({ url, cookies, redirect, request }) => {
  console.log(`[API Callback] Processing OAuth callback at: ${url.pathname}${url.search}`);
  
  const authCode = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  
  // Detect language from referer header or callback path to set appropriate default dashboard
  const referer = request.headers.get('referer') || '';
  const isSpanish = referer.includes('/es/') || url.pathname.includes('/es/');
  const defaultDashboard = isSpanish ? '/es/dashboard' : '/dashboard';
  const next = url.searchParams.get('next') ?? defaultDashboard;
  
  console.log(`[API Callback] Language detection - referer: ${referer}, isSpanish: ${isSpanish}, defaultDashboard: ${defaultDashboard}`);

  if (error) {
    console.error(`[API Callback] OAuth error: ${error}`);
    const loginPath = isSpanish ? '/es/auth/login' : '/auth/login';
    return redirect(`${loginPath}?error=oauth_failed`);
  }

  if (!authCode) {
    console.error(`[API Callback] No auth code found in URL`);
    const loginPath = isSpanish ? '/es/auth/login' : '/auth/login';
    return redirect(`${loginPath}?error=no_code`);
  }

  console.log(`[API Callback] Found auth code, exchanging for session`);
  
  const supabase = createServerClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(key) {
          return cookies.get(key)?.value;
        },
        set(key, value, options) {
          console.log(`[API Callback] Cookie set: ${key} = ${value ? 'value' : 'null'}`);
          cookies.set(key, value, {
            ...options,
            httpOnly: true,
            secure: import.meta.env.PROD,
            sameSite: 'lax',
            path: '/',
          });
        },
        remove(key, options) {
          console.log(`[API Callback] Cookie remove: ${key}`);
          cookies.delete(key, options);
        },
      },
    }
  );

  const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);

  if (exchangeError) {
    console.error(`[API Callback] Code exchange failed:`, exchangeError);
    const loginPath = isSpanish ? '/es/auth/login' : '/auth/login';
    return redirect(`${loginPath}?error=session_exchange_failed`);
  }

  if (data.session && data.user) {
    console.log(`[API Callback] ✅ Session established for user: ${data.user.email}`);
    console.log(`[API Callback] Session access token: ${data.session.access_token ? 'exists' : 'missing'}`);
    console.log(`[API Callback] Session refresh token: ${data.session.refresh_token ? 'exists' : 'missing'}`);
  } else {
    console.error(`[API Callback] ⚠️ Session exchange succeeded but no session/user in response`);
    const loginPath = isSpanish ? '/es/auth/login' : '/auth/login';
    return redirect(`${loginPath}?error=no_session_data`);
  }

  console.log(`[API Callback] Redirecting to: ${next}`);
  return redirect(next);
};