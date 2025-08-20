-- Fix Grace System - Resolve Ambiguous Column References
-- This fixes the ambiguous column reference error in the grace validation function

-- Drop and recreate the function with proper table aliases
DROP FUNCTION IF EXISTS public.check_usage_limits_with_grace(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.check_usage_limits_with_grace(
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
  available_formats JSONB,
  grace_info JSONB
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
  v_grace_mb INTEGER;
  v_grace_enabled BOOLEAN;
  v_grace_used_mb INTEGER;
  v_grace_reset_date DATE;
  v_total_available_mb INTEGER;
BEGIN
  -- Get current month (YYYY-MM format)
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get user's effective subscription tier (handles grace period)
  v_subscription_tier := public.get_effective_subscription_tier(p_user_id);
  
  -- Get current month's usage
  SELECT 
    COALESCE(u.total_mb_used, 0),
    COALESCE(u.files_processed, 0)
  INTO v_current_mb_usage, v_current_file_count
  FROM public.usage u
  WHERE u.user_id = p_user_id AND u.month_year = v_month_year;
  
  -- Initialize usage if no record exists
  IF v_current_mb_usage IS NULL THEN
    v_current_mb_usage := 0;
    v_current_file_count := 0;
  END IF;
  
  -- Get plan limits and grace settings
  SELECT 
    sp.summaries_per_month,
    sp.max_file_size_mb,
    sp.total_monthly_mb,
    sp.output_formats,
    COALESCE(sp.grace_mb, 0),
    COALESCE(sp.grace_enabled, FALSE)
  INTO v_summary_limit, v_file_size_limit, v_monthly_mb_limit, v_output_formats, v_grace_mb, v_grace_enabled
  FROM public.subscription_plans sp
  WHERE sp.tier = v_subscription_tier;
  
  -- Get user's current grace usage
  SELECT 
    COALESCE(prof.grace_used_mb, 0),
    COALESCE(prof.grace_reset_date, CURRENT_DATE)
  INTO v_grace_used_mb, v_grace_reset_date
  FROM public.profiles prof
  WHERE prof.id = p_user_id;
  
  -- Reset grace usage if it's a new month
  IF v_grace_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN
    v_grace_used_mb := 0;
    UPDATE public.profiles 
    SET grace_used_mb = 0, grace_reset_date = CURRENT_DATE
    WHERE id = p_user_id;
  END IF;
  
  -- Calculate total available MB (base limit + available grace)
  v_total_available_mb := v_monthly_mb_limit;
  IF v_grace_enabled THEN
    v_total_available_mb := v_total_available_mb + (v_grace_mb - v_grace_used_mb);
  END IF;
  
  -- Check file size limit (grace doesn't apply to per-file limits)
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
      v_output_formats,
      jsonb_build_object(
        'enabled', v_grace_enabled,
        'totalMB', v_grace_mb,
        'usedMB', v_grace_used_mb,
        'remainingMB', GREATEST(0, v_grace_mb - v_grace_used_mb)
      );
    RETURN;
  END IF;
  
  -- Check total monthly MB limit (including grace)
  IF (v_current_mb_usage + p_file_size_mb) > v_total_available_mb THEN
    RETURN QUERY SELECT 
      FALSE,
      format('Adding %sMB would exceed monthly limit of %sMB (includes %sMB grace) - %sMB used', 
             p_file_size_mb, v_total_available_mb, 
             CASE WHEN v_grace_enabled THEN v_grace_mb ELSE 0 END,
             v_current_mb_usage),
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats,
      jsonb_build_object(
        'enabled', v_grace_enabled,
        'totalMB', v_grace_mb,
        'usedMB', v_grace_used_mb,
        'remainingMB', GREATEST(0, v_grace_mb - v_grace_used_mb)
      );
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
      v_output_formats,
      jsonb_build_object(
        'enabled', v_grace_enabled,
        'totalMB', v_grace_mb,
        'usedMB', v_grace_used_mb,
        'remainingMB', GREATEST(0, v_grace_mb - v_grace_used_mb)
      );
    RETURN;
  END IF;
  
  -- All checks passed
  RETURN QUERY SELECT 
    TRUE,
    'Within all limits (including grace)',
    v_current_mb_usage,
    v_monthly_mb_limit,
    v_current_file_count,
    v_summary_limit,
    v_subscription_tier::TEXT,
    v_output_formats,
    jsonb_build_object(
      'enabled', v_grace_enabled,
      'totalMB', v_grace_mb,
      'usedMB', v_grace_used_mb,
      'remainingMB', GREATEST(0, v_grace_mb - v_grace_used_mb)
    );
END;
$$ LANGUAGE plpgsql;

-- Also fix the track_usage_with_grace function
DROP FUNCTION IF EXISTS public.track_usage_with_grace(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.track_usage_with_grace(
  p_user_id UUID, 
  p_file_size_mb INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
  v_month_year TEXT;
  v_monthly_limit INTEGER;
  v_current_usage INTEGER;
  v_grace_used INTEGER;
  v_over_base_limit INTEGER;
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get current usage and limits with proper table aliases
  SELECT 
    sp.total_monthly_mb,
    COALESCE(u.total_mb_used, 0),
    COALESCE(prof.grace_used_mb, 0)
  INTO v_monthly_limit, v_current_usage, v_grace_used
  FROM public.profiles prof
  LEFT JOIN public.subscription_plans sp ON sp.tier = public.get_effective_subscription_tier(p_user_id)
  LEFT JOIN public.usage u ON u.user_id = prof.id AND u.month_year = v_month_year
  WHERE prof.id = p_user_id;
  
  -- Calculate if this upload will use grace
  v_over_base_limit := GREATEST(0, (v_current_usage + p_file_size_mb) - v_monthly_limit);
  
  -- Update usage tracking
  INSERT INTO public.usage (user_id, month_year, total_mb_used, files_processed)
  VALUES (p_user_id, v_month_year, p_file_size_mb, 1)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    total_mb_used = usage.total_mb_used + p_file_size_mb,
    files_processed = usage.files_processed + 1,
    updated_at = NOW();
  
  -- Update grace usage if applicable
  IF v_over_base_limit > 0 THEN
    UPDATE public.profiles
    SET grace_used_mb = COALESCE(grace_used_mb, 0) + v_over_base_limit
    WHERE id = p_user_id;
  END IF;
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.check_usage_limits_with_grace(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.track_usage_with_grace(UUID, INTEGER) TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.check_usage_limits_with_grace(UUID, INTEGER) IS 
'Enhanced usage validation with 25MB grace buffer for Student tier users. Fixed ambiguous column references.';

COMMENT ON FUNCTION public.track_usage_with_grace(UUID, INTEGER) IS 
'Tracks usage and automatically manages grace MB consumption. Fixed ambiguous column references.';