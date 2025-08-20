import type { APIRoute } from 'astro';
import { createSupabaseServerClient, supabaseAdmin } from '../../../lib/supabase-server';

interface UsageResponse {
  success: boolean;
  usage?: {
    currentMonthUsage: {
      totalMinutes: number;
      totalMB: number;  // Keep for transition period
      filesProcessed: number;
      limit: {
        monthlyMinutes: number;
        monthlyMB: number;  // Keep for transition period
        maxFileMinutes: number;
        maxFileSize: number;  // Keep for transition period
        summariesPerMonth: number;
      };
      remaining: {
        minutes: number;
        mb: number;  // Keep for transition period
        files: number;
      };
    };
    tier: 'free' | 'student';
    lastUpdated: string;
  };
  error?: string;
}

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
          error: 'Unauthorized',
          message: 'Authentication required'
        }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Use the existing get_current_usage function
    const { data: usageData, error: usageError } = await supabaseAdmin
      .rpc('get_current_usage', { p_user_id: user.id });

    if (usageError) {
      console.error('Error fetching usage:', usageError);
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Failed to fetch usage data',
          details: usageError.message 
        }), 
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // usageData is an array, get the first result
    const usage = usageData?.[0];
    
    if (!usage) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'No usage data found' 
        }), 
        { 
          status: 404, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const response: UsageResponse = {
      success: true,
      usage: {
        currentMonthUsage: {
          totalMinutes: usage.current_usage_minutes || 0,
          totalMB: usage.current_usage_mb || 0,  // Keep for transition
          filesProcessed: usage.files_processed || 0,
          limit: {
            monthlyMinutes: usage.monthly_limit_minutes || 180,  // Default to 3 hours for free
            monthlyMB: 10000,  // Effectively unlimited (10GB)
            maxFileMinutes: usage.monthly_limit_minutes === 1500 ? 240 : 120, // 4h for student, 2h for free
            maxFileSize: 1000, // Effectively unlimited (1GB)
            summariesPerMonth: usage.summary_limit || 2
          },
          remaining: {
            minutes: usage.remaining_minutes || 0,
            mb: 10000,  // Effectively unlimited
            files: usage.remaining_files || 0
          }
        },
        tier: usage.user_tier as 'free' | 'student' || 'free',
        lastUpdated: new Date().toISOString()
      }
    };

    return new Response(
      JSON.stringify(response), 
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        }
      }
    );

  } catch (error: any) {
    console.error('Usage API error:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
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