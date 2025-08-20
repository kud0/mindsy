import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '../../../lib/supabase-server';

export const GET: APIRoute = async ({ request, cookies }) => {
  try {
    // Create server client with cookies
    const supabase = createSupabaseServerClient(cookies);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      console.error('API auth error:', authError);
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Authentication required',
          details: authError?.message
        }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('API: Fetching profile for user:', user.id);

    // Get user profile using admin client (bypasses RLS)
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch profile',
          details: error.message 
        }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Also fetch usage data for current month
    const monthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
    const { data: usage } = await supabaseAdmin
      .from('usage')
      .select('total_mb_used, summaries_count')
      .eq('user_id', user.id)
      .eq('month_year', monthYear)
      .maybeSingle();

    console.log('API: Usage data:', { usage, monthYear });

    return new Response(
      JSON.stringify({ 
        success: true,
        profile,
        usage: usage || { total_mb_used: 0, summaries_count: 0 },
        user: {
          id: user.id,
          email: user.email
        }
      }), 
      { 
        status: 200, 
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error: any) {
    console.error('Profile API error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};