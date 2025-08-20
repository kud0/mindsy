-- Migration: Implement effective subscription tier logic
-- Description: Ensures users retain paid benefits until billing period expires
-- This addresses the downgrade scenario where users should keep Student benefits
-- until their subscription_period_end date, even if subscription_tier is set to 'free'

-- 1. Create function to determine effective subscription tier
CREATE OR REPLACE FUNCTION public.get_effective_subscription_tier(p_user_id UUID)
RETURNS subscription_tier AS $$
DECLARE
    v_subscription_tier subscription_tier;
    v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    -- Get current subscription tier and period end date
    SELECT subscription_tier, subscription_period_end 
    INTO v_subscription_tier, v_period_end
    FROM public.profiles 
    WHERE id = p_user_id;
    
    -- Default to free if user not found
    IF v_subscription_tier IS NULL THEN
        RETURN 'free';
    END IF;
    
    -- If no period end date, use current tier (handles legacy data)
    IF v_period_end IS NULL THEN
        RETURN v_subscription_tier;
    END IF;
    
    -- Key logic: If still within paid period, user gets Student benefits
    -- regardless of what subscription_tier field says
    IF v_period_end > NOW() THEN
        RETURN 'student';
    END IF;
    
    -- Period has expired, use current subscription_tier
    RETURN v_subscription_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop and recreate check_usage_limits function with new return type
DROP FUNCTION IF EXISTS public.check_usage_limits(UUID, INTEGER);

CREATE OR REPLACE FUNCTION public.check_usage_limits(p_user_id UUID, p_file_size_mb INTEGER)
RETURNS TABLE(
  can_process BOOLEAN, 
  message TEXT, 
  current_usage_mb INTEGER, 
  monthly_limit_mb INTEGER, 
  files_this_month INTEGER, 
  user_tier TEXT,
  effective_tier TEXT,
  period_end TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
    v_subscription_tier subscription_tier;
    v_effective_tier subscription_tier;
    v_current_mb_usage INTEGER;
    v_current_file_count INTEGER;
    v_monthly_mb_limit INTEGER;
    v_file_size_limit INTEGER;
    v_summary_limit INTEGER;
    v_month_year TEXT;
    v_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
    v_month_year := TO_CHAR(NOW(), 'YYYY-MM');
    
    -- Get user's subscription tier and period info
    SELECT subscription_tier, subscription_period_end
    INTO v_subscription_tier, v_period_end
    FROM public.profiles WHERE id = p_user_id;
    
    -- Get effective tier (considers billing period)
    SELECT get_effective_subscription_tier(p_user_id) INTO v_effective_tier;
    
    -- Default to free if not found
    IF v_effective_tier IS NULL THEN
        v_effective_tier := 'free';
    END IF;
    
    -- Get current month's usage
    SELECT COALESCE(total_mb_used, 0), COALESCE(summaries_count, 0)
    INTO v_current_mb_usage, v_current_file_count
    FROM public.usage 
    WHERE user_id = p_user_id AND month_year = v_month_year;
    
    IF v_current_mb_usage IS NULL THEN
        v_current_mb_usage := 0; 
        v_current_file_count := 0;
    END IF;
    
    -- Get plan limits based on EFFECTIVE tier (not stored tier)
    SELECT summaries_per_month, max_file_size_mb, total_monthly_mb
    INTO v_summary_limit, v_file_size_limit, v_monthly_mb_limit
    FROM public.subscription_plans WHERE tier = v_effective_tier;
    
    -- Check file size limit
    IF p_file_size_mb > v_file_size_limit THEN
        RETURN QUERY SELECT 
            FALSE, 
            format('File size %sMB exceeds limit of %sMB for %s tier', 
                   p_file_size_mb, v_file_size_limit, v_effective_tier),
            v_current_mb_usage, 
            v_monthly_mb_limit, 
            v_current_file_count, 
            v_subscription_tier::TEXT,
            v_effective_tier::TEXT,
            v_period_end;
        RETURN;
    END IF;
    
    -- Check monthly MB limit
    IF (v_current_mb_usage + p_file_size_mb) > v_monthly_mb_limit THEN
        RETURN QUERY SELECT 
            FALSE, 
            format('Would exceed monthly limit: %sMB + %sMB > %sMB for %s tier', 
                   v_current_mb_usage, p_file_size_mb, v_monthly_mb_limit, v_effective_tier),
            v_current_mb_usage, 
            v_monthly_mb_limit, 
            v_current_file_count, 
            v_subscription_tier::TEXT,
            v_effective_tier::TEXT,
            v_period_end;
        RETURN;
    END IF;
    
    -- Check summary count limit (only for effective free tier)
    IF v_effective_tier = 'free' AND v_current_file_count >= v_summary_limit THEN
        RETURN QUERY SELECT 
            FALSE, 
            format('Monthly limit of %s summaries reached for %s tier', 
                   v_summary_limit, v_effective_tier),
            v_current_mb_usage, 
            v_monthly_mb_limit, 
            v_current_file_count, 
            v_subscription_tier::TEXT,
            v_effective_tier::TEXT,
            v_period_end;
        RETURN;
    END IF;
    
    -- All checks passed
    RETURN QUERY SELECT 
        TRUE, 
        format('Within limits for %s tier (effective: %s)', 
               v_subscription_tier::TEXT, v_effective_tier::TEXT),
        v_current_mb_usage, 
        v_monthly_mb_limit, 
        v_current_file_count, 
        v_subscription_tier::TEXT,
        v_effective_tier::TEXT,
        v_period_end;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create cleanup function for expired subscriptions
CREATE OR REPLACE FUNCTION public.cleanup_expired_subscriptions()
RETURNS TABLE(
    cleaned_count INTEGER,
    message TEXT
) AS $$
DECLARE
    v_updated_count INTEGER;
BEGIN
    -- Reset subscription_period_end for expired free-tier users
    -- This cleanup ensures we don't keep stale period_end dates indefinitely
    UPDATE public.profiles 
    SET subscription_period_end = NULL,
        updated_at = NOW()
    WHERE subscription_tier = 'free' 
      AND subscription_period_end IS NOT NULL 
      AND subscription_period_end < NOW();
    
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RETURN QUERY SELECT 
        v_updated_count,
        format('Cleaned up %s expired subscription periods', v_updated_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Add helper function to get user subscription details
CREATE OR REPLACE FUNCTION public.get_user_subscription_details(p_user_id UUID)
RETURNS TABLE(
    user_id UUID,
    subscription_tier subscription_tier,
    effective_tier subscription_tier,
    subscription_period_start TIMESTAMP WITH TIME ZONE,
    subscription_period_end TIMESTAMP WITH TIME ZONE,
    is_within_paid_period BOOLEAN,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY 
    SELECT 
        p.id,
        p.subscription_tier,
        get_effective_subscription_tier(p.id) as effective_tier,
        p.subscription_period_start,
        p.subscription_period_end,
        CASE 
            WHEN p.subscription_period_end IS NULL THEN FALSE
            WHEN p.subscription_period_end > NOW() THEN TRUE
            ELSE FALSE
        END as is_within_paid_period,
        CASE 
            WHEN p.subscription_period_end IS NULL THEN 0
            WHEN p.subscription_period_end > NOW() THEN 
                EXTRACT(days FROM (p.subscription_period_end - NOW()))::INTEGER
            ELSE 0
        END as days_remaining
    FROM public.profiles p
    WHERE p.id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create RLS policies for new functions
CREATE POLICY "Users can call get_effective_subscription_tier on themselves" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.get_effective_subscription_tier(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_usage_limits(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_subscriptions() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_subscription_details(UUID) TO authenticated;

-- 7. Add index for better performance on subscription period queries
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_period_end 
ON public.profiles(subscription_period_end) 
WHERE subscription_period_end IS NOT NULL;

-- 8. Add comments for documentation
COMMENT ON FUNCTION public.get_effective_subscription_tier(UUID) IS 
'Returns the effective subscription tier for a user, considering billing periods. 
Users retain Student benefits until subscription_period_end expires, even if 
subscription_tier is set to free (downgrade scenario).';

COMMENT ON FUNCTION public.check_usage_limits(UUID, INTEGER) IS 
'Enhanced usage limits checker that uses effective subscription tier.
This ensures users who downgrade mid-billing cycle retain their paid benefits.';

COMMENT ON FUNCTION public.cleanup_expired_subscriptions() IS 
'Maintenance function to clean up expired subscription periods.
Should be run periodically to prevent stale period_end dates.';