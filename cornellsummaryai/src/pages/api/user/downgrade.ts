import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../../lib/supabase-server';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Check authentication
    const user = locals.user;
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse request body
    const { periodEnd } = await request.json();
    
    if (!periodEnd) {
      return new Response(JSON.stringify({ error: 'Missing periodEnd parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log(`🔽 Processing downgrade for user ${user.id}`);
    console.log(`📅 Setting period end to: ${periodEnd}`);

    // Update user profile using admin client
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_tier: 'free',
        subscription_period_end: periodEnd,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      console.error('❌ Database update error:', error);
      return new Response(JSON.stringify({ 
        error: 'Database update failed',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('✅ User successfully downgraded:', data);

    return new Response(JSON.stringify({ 
      success: true,
      profile: data,
      message: 'Successfully downgraded to Free plan'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Downgrade API error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};