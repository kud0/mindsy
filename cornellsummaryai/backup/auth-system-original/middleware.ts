import { defineMiddleware } from 'astro:middleware';
import { supabase } from './lib/supabase';
import { getLangFromUrl, defaultLang } from './lib/i18n';

// Spanish-speaking countries that should redirect to /es
const SPANISH_COUNTRIES = [
  'ES', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 
  'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ'
];

export const onRequest = defineMiddleware(async ({ locals, url, redirect, cookies, request }, next) => {
  // Handle i18n routing and geo-based redirects
  const pathname = url.pathname;
  const currentLang = getLangFromUrl(url);
  
  // Check if user has a language preference cookie
  const langPreference = cookies.get('lang-preference')?.value;
  
  // Set language preference cookie when user navigates to a specific language
  if (pathname === '/es' || pathname.startsWith('/es/')) {
    cookies.set('lang-preference', 'es', {
      path: '/',
      httpOnly: false,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  } else if (pathname === '/' || (pathname.startsWith('/') && !pathname.startsWith('/es'))) {
    // Only set 'en' preference if explicitly visiting English pages (not assets)
    if (!pathname.includes('.') && pathname !== '/favicon.ico') {
      cookies.set('lang-preference', 'en', {
        path: '/',
        httpOnly: false,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 365, // 1 year
      });
    }
  }
  
  // Get country from Vercel headers
  const country = request.headers.get('x-vercel-ip-country') || '';
  
  // Only redirect on root path if:
  // 1. User doesn't have a language preference set
  // 2. User is from Spanish-speaking country
  if (pathname === '/' && !langPreference && SPANISH_COUNTRIES.includes(country)) {
    return redirect('/es', 302);
  }
  
  // Get the session from cookies using enhanced validation
  const accessToken = cookies.get('sb-access-token')?.value;
  const refreshToken = cookies.get('sb-refresh-token')?.value;

  // If we have tokens, try to get the session with OAuth support
  if (accessToken && refreshToken) {
    // First try to get the user with the access token
    const { data: { user }, error } = await supabase.auth.getUser(accessToken);
    
    if (!error && user) {
      locals.user = user;
      
      // Check for OAuth identities and add OAuth context to locals
      const oauthIdentity = user.identities?.find(identity => 
        identity.provider !== 'email' && identity.provider !== 'phone'
      );
      
      if (oauthIdentity) {
        locals.isOAuthUser = true;
        locals.oauthProvider = oauthIdentity.provider;
        
        // For GitHub OAuth users, perform additional validation
        if (oauthIdentity.provider === 'github') {
          const githubData = oauthIdentity.identity_data;
          if (githubData && (githubData.sub || githubData.id)) {
            locals.githubId = githubData.sub || githubData.id;
            locals.githubUsername = githubData.user_name || githubData.login;
          }
        }
      } else {
        locals.isOAuthUser = false;
      }
      
      // Check if token is close to expiration and refresh if needed
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (currentSession?.expires_at) {
        const now = Math.floor(Date.now() / 1000);
        const expiresAt = currentSession.expires_at;
        const timeToExpiration = expiresAt - now;
        
        // If token expires in less than 10 minutes, refresh it
        if (timeToExpiration < 600) {
          const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
          
          if (!refreshError && refreshedSession) {
            // Update cookies with new tokens
            cookies.set('sb-access-token', refreshedSession.access_token, {
              path: '/',
              httpOnly: true,
              secure: import.meta.env.PROD,
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 7, // 7 days
            });
            cookies.set('sb-refresh-token', refreshedSession.refresh_token, {
              path: '/',
              httpOnly: true,
              secure: import.meta.env.PROD,
              sameSite: 'lax',
              maxAge: 60 * 60 * 24 * 30, // 30 days
            });
          }
        }
      }
    } else {
      // Try to refresh the session
      const { data: { session }, error: refreshError } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      
      if (!refreshError && session) {
        locals.user = session.user;
        
        // Check for OAuth identities in refreshed session
        const oauthIdentity = session.user.identities?.find(identity => 
          identity.provider !== 'email' && identity.provider !== 'phone'
        );
        
        if (oauthIdentity) {
          locals.isOAuthUser = true;
          locals.oauthProvider = oauthIdentity.provider;
          
          // For GitHub OAuth users, add GitHub context
          if (oauthIdentity.provider === 'github') {
            const githubData = oauthIdentity.identity_data;
            if (githubData && (githubData.sub || githubData.id)) {
              locals.githubId = githubData.sub || githubData.id;
              locals.githubUsername = githubData.user_name || githubData.login;
            }
          }
        } else {
          locals.isOAuthUser = false;
        }
        
        // Update cookies with new tokens
        cookies.set('sb-access-token', session.access_token, {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 7, // 7 days
        });
        cookies.set('sb-refresh-token', session.refresh_token, {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      } else {
        // If refresh fails, clear cookies to prevent repeated failed attempts
        cookies.delete('sb-access-token', { path: '/' });
        cookies.delete('sb-refresh-token', { path: '/' });
        
        // Also clear with different configurations to ensure complete cleanup
        cookies.set('sb-access-token', '', {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 0,
        });
        cookies.set('sb-refresh-token', '', {
          path: '/',
          httpOnly: true,
          secure: import.meta.env.PROD,
          sameSite: 'lax',
          maxAge: 0,
        });
        
        locals.user = null;
        locals.isOAuthUser = false;
      }
    }
  } else {
    // No tokens in cookies, check if we have a session in Supabase
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // We have a session but no cookies - set cookies
      cookies.set('sb-access-token', session.access_token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      cookies.set('sb-refresh-token', session.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: import.meta.env.PROD,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      
      locals.user = session.user;
      
      // Check for OAuth identities
      const oauthIdentity = session.user.identities?.find(identity => 
        identity.provider !== 'email' && identity.provider !== 'phone'
      );
      
      if (oauthIdentity) {
        locals.isOAuthUser = true;
        locals.oauthProvider = oauthIdentity.provider;
        
        // For GitHub OAuth users, add GitHub context
        if (oauthIdentity.provider === 'github') {
          const githubData = oauthIdentity.identity_data;
          if (githubData && (githubData.sub || githubData.id)) {
            locals.githubId = githubData.sub || githubData.id;
            locals.githubUsername = githubData.user_name || githubData.login;
          }
        }
      } else {
        locals.isOAuthUser = false;
      }
    } else {
      locals.user = null;
      locals.isOAuthUser = false;
    }
  }
  
  // Add current language to locals
  locals.currentLang = currentLang;
  
  // Protected routes (support both languages)
  const protectedRoutes = ['/dashboard', '/dashboard/account', '/es/dashboard', '/es/dashboard/account'];
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/reset-password', '/es/auth/login', '/es/auth/signup', '/es/auth/reset-password'];
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  
  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !locals.user) {
    const loginPath = currentLang === 'es' ? '/es/auth/login' : '/auth/login';
    return redirect(loginPath);
  }
  
  // Redirect to dashboard if accessing auth routes while authenticated
  if (isAuthRoute && locals.user) {
    const dashboardPath = currentLang === 'es' ? '/es/dashboard' : '/dashboard';
    return redirect(dashboardPath);
  }
  
  // Redirect to dashboard if accessing landing page while authenticated
  if ((pathname === '/' || pathname === '/es') && locals.user) {
    const dashboardPath = currentLang === 'es' ? '/es/dashboard' : '/dashboard';
    return redirect(dashboardPath);
  }
  
  return next();
}); 