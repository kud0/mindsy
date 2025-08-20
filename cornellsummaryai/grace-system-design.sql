-- Grace System Implementation for Student Tier Users
-- Provides 25MB grace buffer for paying users

-- 1. Database Schema Updates
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS grace_mb INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS grace_enabled BOOLEAN DEFAULT FALSE;

-- Enable grace for Student tier
UPDATE public.subscription_plans 
SET grace_mb = 25, grace_enabled = true 
WHERE tier = 'student';

-- Add grace tracking to usage table
ALTER TABLE public.usage 
ADD COLUMN IF NOT EXISTS grace_used_mb INTEGER DEFAULT 0;

-- 2. Enhanced check_usage_limits function with grace support
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
  using_grace BOOLEAN,
  grace_used_mb INTEGER,
  grace_available_mb INTEGER
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
  v_grace_mb INTEGER := 0;
  v_grace_enabled BOOLEAN := FALSE;
  v_current_grace_used INTEGER := 0;
  v_total_with_upload INTEGER;
  v_would_use_grace BOOLEAN := FALSE;
  v_grace_needed INTEGER := 0;
BEGIN
  -- Get current month (YYYY-MM format)
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Get user's subscription tier and grace settings
  SELECT 
    p.subscription_tier,
    sp.summaries_per_month,
    sp.max_file_size_mb,
    sp.total_monthly_mb,
    sp.output_formats,
    COALESCE(sp.grace_mb, 0),
    COALESCE(sp.grace_enabled, FALSE)
  INTO 
    v_subscription_tier,
    v_summary_limit,
    v_file_size_limit,
    v_monthly_mb_limit,
    v_output_formats,
    v_grace_mb,
    v_grace_enabled
  FROM public.profiles p
  LEFT JOIN public.subscription_plans sp ON sp.tier = p.subscription_tier
  WHERE p.id = p_user_id;
  
  -- Default to free if null
  IF v_subscription_tier IS NULL THEN
    v_subscription_tier := 'free';
    v_grace_enabled := FALSE;
    v_grace_mb := 0;
  END IF;
  
  -- Get current month's usage including grace
  SELECT 
    COALESCE(total_mb_used, 0),
    COALESCE(files_processed, 0),
    COALESCE(grace_used_mb, 0)
  INTO v_current_mb_usage, v_current_file_count, v_current_grace_used
  FROM public.usage 
  WHERE user_id = p_user_id AND month_year = v_month_year;
  
  -- Initialize usage if no record exists
  IF v_current_mb_usage IS NULL THEN
    v_current_mb_usage := 0;
    v_current_file_count := 0;
    v_current_grace_used := 0;
  END IF;
  
  -- Calculate total usage with new upload
  v_total_with_upload := v_current_mb_usage + p_file_size_mb;
  
  -- Check file size limit (grace doesn't apply to individual file size)
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
      FALSE, -- not using grace
      v_current_grace_used,
      CASE WHEN v_grace_enabled THEN v_grace_mb - v_current_grace_used ELSE 0 END;
    RETURN;
  END IF;
  
  -- Check summary count limit (for free tier only)
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
      FALSE, -- not using grace
      v_current_grace_used,
      CASE WHEN v_grace_enabled THEN v_grace_mb - v_current_grace_used ELSE 0 END;
    RETURN;
  END IF;
  
  -- Primary limit check (without grace)
  IF v_total_with_upload <= v_monthly_mb_limit THEN
    -- Within normal limits, no grace needed
    RETURN QUERY SELECT 
      TRUE,
      'Within normal limits',
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats,
      FALSE, -- not using grace
      v_current_grace_used,
      CASE WHEN v_grace_enabled THEN v_grace_mb - v_current_grace_used ELSE 0 END;
    RETURN;
  END IF;
  
  -- If we reach here, upload would exceed normal limit
  -- Check if grace is available and applicable
  IF NOT v_grace_enabled THEN
    -- No grace available (free tier)
    RETURN QUERY SELECT 
      FALSE,
      format('Adding %sMB would exceed monthly limit of %sMB (%sMB used)', 
             p_file_size_mb, v_monthly_mb_limit, v_current_mb_usage),
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats,
      FALSE, -- not using grace
      v_current_grace_used,
      0; -- no grace available
    RETURN;
  END IF;
  
  -- Calculate grace needed for this upload
  v_grace_needed := v_total_with_upload - v_monthly_mb_limit;
  
  -- Check if enough grace is available
  IF (v_current_grace_used + v_grace_needed) > v_grace_mb THEN
    -- Insufficient grace available
    RETURN QUERY SELECT 
      FALSE,
      format('Upload would exceed grace limit. Need %sMB grace but only %sMB available (%sMB already used)', 
             v_grace_needed, 
             v_grace_mb - v_current_grace_used,
             v_current_grace_used),
      v_current_mb_usage,
      v_monthly_mb_limit,
      v_current_file_count,
      v_summary_limit,
      v_subscription_tier::TEXT,
      v_output_formats,
      FALSE, -- not using grace (rejected)
      v_current_grace_used,
      v_grace_mb - v_current_grace_used;
    RETURN;
  END IF;
  
  -- Grace is available and sufficient
  RETURN QUERY SELECT 
    TRUE,
    format('Approved using %sMB grace (%sMB remaining after this upload)', 
           v_grace_needed,
           v_grace_mb - v_current_grace_used - v_grace_needed),
    v_current_mb_usage,
    v_monthly_mb_limit,
    v_current_file_count,
    v_summary_limit,
    v_subscription_tier::TEXT,
    v_output_formats,
    TRUE, -- using grace
    v_current_grace_used,
    v_grace_mb - v_current_grace_used;
  RETURN;
END;
$$ LANGUAGE plpgsql;

-- 3. Enhanced usage tracking function with grace support
CREATE OR REPLACE FUNCTION public.track_usage_with_grace(
  p_user_id UUID, 
  p_file_size_mb INTEGER,
  p_grace_used_mb INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
  v_month_year TEXT;
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Upsert usage record with grace tracking
  INSERT INTO public.usage (user_id, month_year, total_mb_used, files_processed, grace_used_mb)
  VALUES (p_user_id, v_month_year, p_file_size_mb, 1, p_grace_used_mb)
  ON CONFLICT (user_id, month_year)
  DO UPDATE SET
    total_mb_used = usage.total_mb_used + p_file_size_mb,
    files_processed = usage.files_processed + 1,
    grace_used_mb = usage.grace_used_mb + p_grace_used_mb,
    updated_at = NOW();
    
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 4. Enhanced current usage function with grace information
CREATE OR REPLACE FUNCTION public.get_current_usage_with_grace(p_user_id UUID)
RETURNS TABLE(
  current_usage_mb INTEGER,
  monthly_limit_mb INTEGER,
  files_processed INTEGER,
  summary_limit INTEGER,
  user_tier TEXT,
  available_formats JSONB,
  remaining_mb INTEGER,
  remaining_files INTEGER,
  grace_enabled BOOLEAN,
  grace_total_mb INTEGER,
  grace_used_mb INTEGER,
  grace_remaining_mb INTEGER
) AS $$
DECLARE
  v_month_year TEXT;
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  RETURN QUERY
  SELECT 
    COALESCE(u.total_mb_used, 0)::INTEGER as current_usage_mb,
    sp.total_monthly_mb as monthly_limit_mb,
    COALESCE(u.files_processed, 0)::INTEGER as files_processed,
    sp.summaries_per_month as summary_limit,
    p.subscription_tier::TEXT as user_tier,
    sp.output_formats as available_formats,
    GREATEST(0, sp.total_monthly_mb - COALESCE(u.total_mb_used, 0))::INTEGER as remaining_mb,
    CASE 
      WHEN sp.summaries_per_month = -1 THEN -1 
      ELSE GREATEST(0, sp.summaries_per_month - COALESCE(u.files_processed, 0))
    END::INTEGER as remaining_files,
    COALESCE(sp.grace_enabled, FALSE) as grace_enabled,
    COALESCE(sp.grace_mb, 0) as grace_total_mb,
    COALESCE(u.grace_used_mb, 0) as grace_used_mb,
    GREATEST(0, COALESCE(sp.grace_mb, 0) - COALESCE(u.grace_used_mb, 0)) as grace_remaining_mb
  FROM public.profiles p
  LEFT JOIN public.subscription_plans sp ON sp.tier = p.subscription_tier
  LEFT JOIN public.usage u ON u.user_id = p.id AND u.month_year = v_month_year
  WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- 5. Migration queries for existing data
-- Reset grace usage for all users (monthly reset)
-- This would be run as part of monthly reset job
CREATE OR REPLACE FUNCTION public.reset_monthly_grace()
RETURNS VOID AS $$
DECLARE
  v_month_year TEXT;
BEGIN
  v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Reset grace for new month (this happens automatically with new month_year)
  -- But we can also explicitly reset if needed
  UPDATE public.usage 
  SET grace_used_mb = 0
  WHERE month_year = v_month_year;
END;
$$ LANGUAGE plpgsql;