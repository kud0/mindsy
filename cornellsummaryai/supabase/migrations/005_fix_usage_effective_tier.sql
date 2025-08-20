-- Fix get_current_usage function to use effective subscription tier
-- This ensures users in grace period see correct limits (Student: 700MB instead of Free: 120MB)

-- Drop and recreate functions to avoid signature conflicts
DROP FUNCTION IF EXISTS public.check_usage_limits(UUID, INTEGER);
DROP FUNCTION IF EXISTS public.get_current_usage(UUID);

CREATE OR REPLACE FUNCTION public.get_current_usage(p_user_id UUID)
RETURNS TABLE(
  current_usage_mb INTEGER,
  monthly_limit_mb INTEGER,
  files_processed INTEGER,
  summary_limit INTEGER,
  user_tier TEXT,
  available_formats JSONB,
  remaining_mb INTEGER,
  remaining_files INTEGER
) AS $$
DECLARE
  v_month_year TEXT;
  v_effective_tier subscription_tier;
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get the effective tier (handles grace period logic)
  v_effective_tier := public.get_effective_subscription_tier(p_user_id);
  
  RETURN QUERY
  SELECT 
    COALESCE(u.total_mb_used, 0)::INTEGER as current_usage_mb,
    sp.total_monthly_mb as monthly_limit_mb,
    COALESCE(u.files_processed, 0)::INTEGER as files_processed,
    sp.summaries_per_month as summary_limit,
    v_effective_tier::TEXT as user_tier,
    sp.output_formats as available_formats,
    GREATEST(0, sp.total_monthly_mb - COALESCE(u.total_mb_used, 0))::INTEGER as remaining_mb,
    CASE 
      WHEN sp.summaries_per_month = -1 THEN -1 
      ELSE GREATEST(0, sp.summaries_per_month - COALESCE(u.files_processed, 0))
    END::INTEGER as remaining_files
  FROM public.profiles p
  LEFT JOIN public.subscription_plans sp ON sp.tier = v_effective_tier
  LEFT JOIN public.usage u ON u.user_id = p.id AND u.month_year = v_month_year
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Also update check_usage_limits to use effective tier
CREATE OR REPLACE FUNCTION public.check_usage_limits(
  p_user_id UUID, 
  p_file_size_mb INTEGER DEFAULT 0
)
RETURNS TABLE(
  can_process BOOLEAN, 
  message TEXT,
  current_usage_mb INTEGER,
  monthly_limit_mb INTEGER,
  files_this_month INTEGER,
  summary_limit INTEGER,
  user_tier TEXT,
  available_formats JSONB
) AS $$
DECLARE
  v_subscription_tier subscription_tier;
  v_current_mb_usage INTEGER;
  v_current_file_count INTEGER;
  v_monthly_mb_limit INTEGER;
  v_file_size_limit INTEGER;
  v_summary_limit INTEGER;
  v_output_formats JSONB;
  v_month_year TEXT;
BEGIN
  -- Get current month (YYYY-MM format)
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get user's effective subscription tier (handles grace period)
  v_subscription_tier := public.get_effective_subscription_tier(p_user_id);
  
  -- Get current month's usage
  SELECT 
    COALESCE(total_mb_used, 0),
    COALESCE(files_processed, 0)
  INTO v_current_mb_usage, v_current_file_count
  FROM public.usage 
  WHERE user_id = p_user_id AND month_year = v_month_year;
  
  -- Initialize usage if no record exists
  IF v_current_mb_usage IS NULL THEN
    v_current_mb_usage := 0;
    v_current_file_count := 0;
  END IF;
  
  -- Get plan limits based on effective tier
  SELECT 
    summaries_per_month,
    max_file_size_mb,
    total_monthly_mb,
    output_formats
  INTO v_summary_limit, v_file_size_limit, v_monthly_mb_limit, v_output_formats
  FROM public.subscription_plans
  WHERE tier = v_subscription_tier;
  
  -- Check file size limit
  IF p_file_size_mb > v_file_size_limit THEN
    RETURN QUERY SELECT 
      FALSE, 
      format('File size %sMB exceeds limit of %sMB for %s tier', 
             p_file_size_mb, v_file_size_limit, v_subscription_tier),
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats;
    RETURN;
  END IF;
  
  -- Check monthly MB limit
  IF (v_current_mb_usage + p_file_size_mb) > v_monthly_mb_limit THEN
    RETURN QUERY SELECT 
      FALSE,
      format('Adding %sMB would exceed monthly limit of %sMB (%sMB used)', 
             p_file_size_mb, v_monthly_mb_limit, v_current_mb_usage),
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats;
    RETURN;
  END IF;
  
  -- Check summary count limit (for free tier)
  IF v_summary_limit != -1 AND v_current_file_count >= v_summary_limit THEN
    RETURN QUERY SELECT 
      FALSE,
      format('Monthly limit of %s summaries reached', v_summary_limit),
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats;
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    TRUE,
    'Within all limits',
    v_current_mb_usage,
    v_monthly_mb_limit,
    v_current_file_count,
    v_summary_limit,
    v_subscription_tier::TEXT,
    v_output_formats;
END;
$$ LANGUAGE plpgsql;