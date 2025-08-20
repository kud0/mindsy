/**
 * Grace System Validation
 * Manual grace calculation logic to work around database function issues
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface GraceValidationResult {
  can_process: boolean;
  message: string;
  current_usage_mb: number;
  monthly_limit_mb: number;
  files_this_month: number;
  summary_limit: number;
  user_tier: string;
  available_formats: string[];
  grace_info?: {
    enabled: boolean;
    totalMB: number;
    usedMB: number;
    remainingMB: number;
  };
}

/**
 * Check usage limits with grace buffer for Student tier users
 * This is a manual implementation to work around database function issues
 */
export async function checkUsageLimitsWithGrace(
  userClient: SupabaseClient,
  userId: string,
  fileSizeMB: number
): Promise<GraceValidationResult> {
  const monthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  
  try {
    // Get user's effective subscription tier
    let effectiveTier = 'free';
    try {
      if (userClient.rpc) {
        // Try the RPC function if available
        const { data, error: tierError } = await userClient.rpc('get_effective_subscription_tier', { p_user_id: userId });
        if (!tierError && data) {
          effectiveTier = data;
        }
      } else {
        // Fallback: get tier directly from profile
        const { data: profile } = await userClient
          .from('profiles')
          .select('subscription_tier')
          .eq('id', userId)
          .single();
        effectiveTier = profile?.subscription_tier || 'free';
      }
    } catch (e) {
      // Fallback to getting tier from profile
      const { data: profile } = await userClient
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();
      effectiveTier = profile?.subscription_tier || 'free';
    }
    
    const userTier = effectiveTier || 'free';
    
    // Get current month's usage
    const { data: usage, error: usageError } = await userClient
      .from('usage')
      .select('total_mb_used, files_processed')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();
      
    const currentUsageMB = usage?.total_mb_used || 0;
    const filesThisMonth = usage?.files_processed || 0;
    
    // Get plan limits and grace settings
    const { data: plan, error: planError } = await userClient
      .from('subscription_plans')
      .select('*')
      .eq('tier', userTier)
      .single();
      
    if (planError || !plan) {
      throw new Error(`Failed to get plan limits: ${planError?.message || 'Plan not found'}`);
    }
    
    // Get user's current grace usage (if grace columns exist)
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('grace_used_mb, grace_reset_date')
      .eq('id', userId)
      .single();
      
    let graceUsedMB = 0;
    let graceResetDate = new Date();
    
    // Handle case where grace columns don't exist yet
    if (!profileError && profile) {
      graceUsedMB = profile.grace_used_mb || 0;
      graceResetDate = profile.grace_reset_date ? new Date(profile.grace_reset_date) : new Date();
      
      // Reset grace usage if it's a new month
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);
      
      if (graceResetDate < currentMonth) {
        graceUsedMB = 0;
        // Try to update grace reset (may fail if columns don't exist, that's ok)
        try {
          await userClient
            .from('profiles')
            .update({ 
              grace_used_mb: 0, 
              grace_reset_date: new Date().toISOString().split('T')[0] 
            })
            .eq('id', userId);
        } catch (e) {
          // Ignore error if grace columns don't exist
        }
      }
    }
    
    const graceMB = plan.grace_mb || 0;
    const graceEnabled = plan.grace_enabled || false;
    const graceRemainingMB = graceEnabled ? Math.max(0, graceMB - graceUsedMB) : 0;
    
    // Calculate total available MB (base limit + available grace)
    const totalAvailableMB = plan.total_monthly_mb + graceRemainingMB;
    
    const result: GraceValidationResult = {
      can_process: false,
      message: '',
      current_usage_mb: currentUsageMB,
      monthly_limit_mb: plan.total_monthly_mb,
      files_this_month: filesThisMonth,
      summary_limit: plan.summaries_per_month,
      user_tier: userTier,
      available_formats: plan.output_formats || ['pdf'],
      grace_info: graceEnabled ? {
        enabled: true,
        totalMB: graceMB,
        usedMB: graceUsedMB,
        remainingMB: graceRemainingMB
      } : undefined
    };
    
    // NOTE: MB-based limits removed - only minute-based limits apply now
    // The real limits are enforced by minute-based validation
    console.log(`📊 MB limits bypassed - using minute-based validation only (${fileSizeMB}MB file)`);
    
    // No longer check MB limits - they are set very high in database (1000MB+)
    // File size and monthly MB limits are now effectively unlimited
    
    // Check summary count limit (for free tier)
    if (plan.summaries_per_month !== -1 && filesThisMonth >= plan.summaries_per_month) {
      result.message = `Monthly limit of ${plan.summaries_per_month} summaries reached`;
      return result;
    }
    
    // All checks passed
    result.can_process = true;
    result.message = graceEnabled ? 'Within all limits (including grace buffer)' : 'Within all limits';
    
    return result;
    
  } catch (error) {
    throw new Error(`Grace validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Track usage with grace handling
 * Updates usage and grace consumption after successful processing
 */
export async function trackUsageWithGrace(
  userClient: SupabaseClient,
  userId: string,
  fileSizeMB: number
): Promise<boolean> {
  const monthYear = new Date().toISOString().slice(0, 7);
  
  try {
    // Get current usage and plan info
    const { data: usage } = await userClient
      .from('usage')
      .select('total_mb_used')
      .eq('user_id', userId)
      .eq('month_year', monthYear)
      .single();
      
    const currentUsage = usage?.total_mb_used || 0;
    
    // Get user's plan info
    let effectiveTier = 'free';
    try {
      if (userClient.rpc) {
        const { data } = await userClient.rpc('get_effective_subscription_tier', { p_user_id: userId });
        effectiveTier = data || 'free';
      } else {
        const { data: profile } = await userClient
          .from('profiles')
          .select('subscription_tier')
          .eq('id', userId)
          .single();
        effectiveTier = profile?.subscription_tier || 'free';
      }
    } catch (e) {
      // Fallback
      const { data: profile } = await userClient
        .from('profiles')
        .select('subscription_tier')
        .eq('id', userId)
        .single();
      effectiveTier = profile?.subscription_tier || 'free';
    }
      
    const { data: plan } = await userClient
      .from('subscription_plans')
      .select('total_monthly_mb')
      .eq('tier', effectiveTier || 'free')
      .single();
      
    const monthlyLimit = plan?.total_monthly_mb || 120;
    
    // Calculate if this upload will use grace
    const overBaseLimit = Math.max(0, (currentUsage + fileSizeMB) - monthlyLimit);
    
    // Update usage tracking
    const { error: usageError } = await userClient
      .from('usage')
      .upsert({
        user_id: userId,
        month_year: monthYear,
        total_mb_used: (currentUsage + fileSizeMB),
        files_processed: (usage?.files_processed || 0) + 1,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,month_year'
      });
      
    if (usageError) {
      console.error('Error updating usage:', usageError);
      return false;
    }
    
    // Update grace usage if applicable (may fail if columns don't exist, that's ok)
    if (overBaseLimit > 0) {
      try {
        const { data: currentProfile } = await userClient
          .from('profiles')
          .select('grace_used_mb')
          .eq('id', userId)
          .single();
          
        await userClient
          .from('profiles')
          .update({ 
            grace_used_mb: (currentProfile?.grace_used_mb || 0) + overBaseLimit 
          })
          .eq('id', userId);
      } catch (e) {
        // Ignore error if grace columns don't exist yet
        console.log('Grace tracking failed (columns may not exist):', e);
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('Error tracking usage with grace:', error);
    return false;
  }
}