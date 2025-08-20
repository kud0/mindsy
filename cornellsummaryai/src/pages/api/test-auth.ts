import type { APIRoute } from 'astro';
import { requireAuth } from '../../lib/supabase-server';

export const POST: APIRoute = async ({ request }) => {
  try {
    // Test the authentication utilities with OAuth support
    const { user, client, isOAuthUser, oauthProvider, isAuthenticatedVia, getOAuthIdentity } = await requireAuth(request);
    
    // Get OAuth identity information if available
    const oauthIdentity = getOAuthIdentity();
    const githubIdentity = getOAuthIdentity('github');
    
    return new Response(JSON.stringify({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      oauth: {
        isOAuthUser,
        oauthProvider,
        isGitHubUser: isAuthenticatedVia('github'),
        githubUsername: githubIdentity?.identity_data?.login || null
      },
      message: 'Authentication successful'
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    // requireAuth throws a Response object for unauthorized requests
    if (error instanceof Response) {
      return error;
    }
    
    // Handle unexpected errors
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
};