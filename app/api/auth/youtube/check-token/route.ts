import { NextRequest } from 'next/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';
import { createClient } from '@/lib/supabase/server';

// Check if user has valid YouTube OAuth tokens
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  try {
    const { userId } = await request.json();
    
    // Validate that the requesting user matches the token owner
    if (userId !== authResult.user.id) {
      return createErrorResponse('Unauthorized token access', 403);
    }

    const supabase = createClient();
    
    const { data: tokenData, error } = await supabase
      .from('youtube_tokens')
      .select('access_token, expires_at, refresh_token')
      .eq('user_id', userId)
      .single();

    if (error || !tokenData) {
      return createSuccessResponse({
        hasToken: false,
        message: 'No YouTube tokens found'
      });
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    if (now >= expiresAt) {
      return createSuccessResponse({
        hasToken: false,
        message: 'YouTube token expired',
        canRefresh: !!tokenData.refresh_token
      });
    }

    return createSuccessResponse({
      hasToken: true,
      message: 'Valid YouTube token found'
    });

  } catch (error) {
    console.error('Token check error:', error);
    return createErrorResponse('Failed to check YouTube tokens');
  }
}