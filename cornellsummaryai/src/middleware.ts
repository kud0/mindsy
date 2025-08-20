/**
 * Astro Middleware - Unified Implementation
 * 
 * Handles authentication, i18n, and route protection.
 * This is the single source of truth for middleware logic.
 * 
 * Features:
 * - Supabase SSR authentication with proper session management
 * - Internationalization with geo-based redirects
 * - Route protection for authenticated/unauthenticated users
 * - OAuth identity detection and context
 */

import { defineMiddleware } from 'astro:middleware';
import pkg from '@supabase/ssr';
const { createServerClient } = pkg;
import { getLangFromUrl } from './lib/i18n';

// Spanish-speaking countries for geo-based redirects
const SPANISH_COUNTRIES = [
  'ES', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 
  'BO', 'DO', 'HN', 'PY', 'SV', 'NI', 'CR', 'PA', 'UY', 'GQ'
];

export const onRequest = defineMiddleware(async ({ locals, url, redirect, cookies, request }, next) => {
  const pathname = url.pathname;
  const currentLang = getLangFromUrl(url);
  
  // Skip all middleware processing for prerendered blog pages to avoid header warnings
  if (pathname.startsWith('/blog/') || pathname === '/blog') {
    // Set minimal required locals for blog pages
    // Auth state will be handled client-side for navbar
    locals.user = null;
    locals.isOAuthUser = false;
    locals.currentLang = currentLang;
    return next();
  }
  
  // ===== I18N HANDLING WITH GEO-DETECTION =====
  // Get user's country from Vercel's geolocation headers
  const country = request.headers.get('x-vercel-ip-country') || 
                  request.headers.get('cf-ipcountry') || 
                  request.headers.get('cloudfront-viewer-country') || '';

  // Handle language preference cookies
  const langPreference = cookies.get('lang-preference')?.value;
  
  // Set language preference based on current path
  if (pathname === '/es' || pathname.startsWith('/es/')) {
    cookies.set('lang-preference', 'es', {
      path: '/',
      httpOnly: false,
      secure: import.meta.env.PROD,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });
  } else if (pathname === '/' || (pathname.startsWith('/') && !pathname.startsWith('/es'))) {
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
  
  // Geo-based redirect for first-time visitors to homepage
  if (pathname === '/' && !langPreference && country && SPANISH_COUNTRIES.includes(country)) {
    return redirect('/es/');
  }

  // ===== AUTHENTICATION HANDLING =====
  // Create Supabase server client following Astro best practices
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

  // Get authenticated user using Supabase's recommended approach
  
  const { data: { user }, error } = await supabase.auth.getUser();

  // Skip auth handling for API routes - they handle their own auth
  if (pathname.startsWith('/api/')) {
    // Special handling for webhook endpoints - don't log auth errors
    if (pathname.includes('/webhook')) {
    }
    locals.user = user;
    locals.isOAuthUser = false;
    locals.currentLang = currentLang;
    return next();
  }

  // For all other routes, handle authentication normally
  if (user) {
    // Set authenticated user in locals
    locals.user = user;
    
    // Check for OAuth identities
    const oauthIdentity = user.identities?.find(identity => 
      identity.provider !== 'email' && identity.provider !== 'phone'
    );
    
    if (oauthIdentity) {
      locals.isOAuthUser = true;
      locals.oauthProvider = oauthIdentity.provider;
      
      // Add GitHub-specific context if available
      if (oauthIdentity.provider === 'github') {
        const githubData = oauthIdentity.identity_data;
        if (githubData) {
          locals.githubId = githubData.sub || githubData.id;
          locals.githubUsername = githubData.user_name || githubData.login;
        }
      }
    } else {
      locals.isOAuthUser = false;
    }
  } else {
    // No user = not authenticated
    locals.user = null;
    locals.isOAuthUser = false;
  }
  
  // Add current language to locals
  locals.currentLang = currentLang;
  
  // ===== ROUTE PROTECTION =====
  // Define protected and auth routes (support both languages)
  const protectedRoutes = ['/dashboard', '/dashboard/account', '/es/dashboard', '/es/dashboard/account'];
  const authRoutes = ['/auth/login', '/auth/signup', '/auth/reset-password', '/es/auth/login', '/es/auth/signup', '/es/auth/reset-password'];
  
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  
  // Redirect to login if accessing protected route without authentication
  if (isProtectedRoute && !locals.user) {
    // Redirect unauthenticated user to login
    const loginPath = currentLang === 'es' ? '/es/auth/login' : '/auth/login';
    return redirect(loginPath);
  }
  
  // Redirect to dashboard if accessing auth routes while authenticated
  if (isAuthRoute && locals.user) {
    // Redirect authenticated user away from auth pages
    const dashboardPath = currentLang === 'es' ? '/es/dashboard' : '/dashboard';
    return redirect(dashboardPath);
  }
  
  // Allow authenticated users to access homepage - removed automatic redirect
  // Users can now freely navigate between homepage and dashboard
  
  return next();
});