import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, createErrorResponse } from '@/lib/auth/require-auth';

// Initiate YouTube OAuth2 flow
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  try {
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    if (!clientId) {
      return createErrorResponse('YouTube OAuth not configured');
    }

    // Get the current URL for redirect
    const url = new URL(request.url);
    const baseUrl = `${url.protocol}//${url.host}`;
    const redirectUri = `${baseUrl}/api/auth/youtube/callback`;

    // YouTube OAuth2 scopes for reading captions
    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
      'https://www.googleapis.com/auth/youtube.force-ssl'
    ].join(' ');

    // Build OAuth2 URL
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline', // Get refresh token
      prompt: 'consent', // Force consent to get refresh token
      state: authResult.user.id // Pass user ID for security
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return NextResponse.redirect(authUrl);

  } catch (error) {
    console.error('YouTube OAuth initiation error:', error);
    return createErrorResponse('Failed to initiate YouTube authorization');
  }
}