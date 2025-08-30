import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createErrorResponse } from '@/lib/auth/require-auth';
import { createClient } from '@supabase/supabase-js';

// Handle YouTube OAuth2 callback
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth2 errors
    if (error) {
      console.error('YouTube OAuth2 error:', error);
      return NextResponse.redirect(
        new URL('/dashboard/lectures?error=oauth_denied', request.url)
      );
    }

    // Validate authorization code
    if (!code) {
      return NextResponse.redirect(
        new URL('/dashboard/lectures?error=missing_code', request.url)
      );
    }

    // Validate state parameter (should match user ID)
    if (state !== authResult.user.id) {
      console.error('OAuth2 state mismatch:', { expected: authResult.user.id, received: state });
      return NextResponse.redirect(
        new URL('/dashboard/lectures?error=invalid_state', request.url)
      );
    }

    // Exchange authorization code for access token
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      console.error('Missing YouTube OAuth2 credentials');
      return NextResponse.redirect(
        new URL('/dashboard/lectures?error=oauth_config', request.url)
      );
    }

    // Get the current URL for redirect URI
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text();
      console.error('Token exchange failed:', errorData);
      return NextResponse.redirect(
        new URL('/dashboard/lectures?error=token_exchange', request.url)
      );
    }

    const tokens = await tokenResponse.json();
    
    // Validate token response
    if (!tokens.access_token) {
      console.error('No access token in response:', tokens);
      return NextResponse.redirect(
        new URL('/dashboard/lectures?error=no_access_token', request.url)
      );
    }

    // Store tokens in database - use service role to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    const expiresAt = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000) 
      : new Date(Date.now() + 3600 * 1000); // Default 1 hour

    const { error: dbError } = await supabase
      .from('youtube_tokens')
      .upsert({
        user_id: authResult.user.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || null,
        expires_at: expiresAt.toISOString(),
        scope: tokens.scope || 'https://www.googleapis.com/auth/youtube.readonly',
        token_type: tokens.token_type || 'Bearer',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error('Failed to store YouTube tokens:', dbError);
      return NextResponse.redirect(
        new URL('/dashboard/lectures?error=token_storage', request.url)
      );
    }

    console.log('✅ YouTube OAuth2 successful for user:', authResult.user.id);

    // Redirect to lectures page with success message
    return NextResponse.redirect(
      new URL('/dashboard/lectures?success=youtube_connected', request.url)
    );

  } catch (error) {
    console.error('YouTube OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/dashboard/lectures?error=oauth_callback_failed', request.url)
    );
  }
}