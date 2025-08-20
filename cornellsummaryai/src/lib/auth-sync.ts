import { supabase } from './supabase';

/**
 * Get authenticated user with server-client session sync
 * If client-side auth fails, attempts to sync session from server
 */
export async function getAuthenticatedUser() {
  // Try to get user from client-side auth
  let { data: { user } } = await supabase.auth.getUser();
  
  // If client-side auth fails, try to get session from server via API call
  if (!user) {
    try {
      const sessionResponse = await fetch('/api/auth/session', { credentials: 'include' });
      if (sessionResponse.ok) {
        const sessionData = await sessionResponse.json();
        
        if (sessionData.user) {
          // Manually set the session on the client
          await supabase.auth.setSession({
            access_token: sessionData.session.access_token,
            refresh_token: sessionData.session.refresh_token
          });
          
          // Try getting user again
          const { data: { user: newUser } } = await supabase.auth.getUser();
          user = newUser;
        }
      }
    } catch (sessionError) {
      console.log('Failed to sync session from server:', sessionError);
    }
  }
  
  return user;
}