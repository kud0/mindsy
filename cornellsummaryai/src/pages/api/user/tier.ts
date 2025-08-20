import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '../../../lib/supabase-server';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Create server client with cookies
    const supabase = createSupabaseServerClient(cookies);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Unauthorized'
        }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get user profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier, tier')
      .eq('id', user.id)
      .single();

    // Get current usage from RPC - this returns minute-based data
    const { data: usageData } = await supabaseAdmin
      .rpc('get_current_usage', { p_user_id: user.id });

    const usage = usageData?.[0];

    // Determine the actual tier (check multiple fields for compatibility)
    const rawTier = profile?.subscription_tier || profile?.tier || usage?.user_tier || 'free';
    // Normalize to only free or student
    const userTier = rawTier.toLowerCase() === 'student' ? 'student' : 'free';
    
    return new Response(
      JSON.stringify({ 
        success: true,
        tier: userTier,
        minutesUsed: usage?.current_usage_minutes || 0,
        minutesLimit: usage?.monthly_limit_minutes || 180,
        remaining: usage?.remaining_minutes || 0
      }), 
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

  } catch (error: any) {
    console.error('Tier API error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Internal server error'
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};