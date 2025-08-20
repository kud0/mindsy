-- Fix usage calculation to use billing periods instead of calendar months
-- This ensures users get fresh limits when they upgrade

-- Drop the existing function
DROP FUNCTION IF EXISTS get_current_usage(UUID);

-- Create updated get_current_usage function that uses billing periods
CREATE FUNCTION get_current_usage(p_user_id UUID)
RETURNS TABLE (
  current_usage_minutes INTEGER,
  current_usage_mb DECIMAL,
  files_processed INTEGER,
  monthly_limit_minutes INTEGER,
  monthly_limit_mb INTEGER,
  remaining_minutes INTEGER,
  remaining_mb DECIMAL,
  remaining_files INTEGER,
  summary_limit INTEGER,
  user_tier TEXT
) AS $$
DECLARE
  tier_minutes INTEGER;
  tier_mb INTEGER;
  tier_summaries INTEGER;
  usage_minutes INTEGER;
  usage_mb DECIMAL;
  files_count INTEGER;
  user_subscription_tier TEXT;
  subscription_start TIMESTAMP WITH TIME ZONE;
  subscription_end TIMESTAMP WITH TIME ZONE;
  billing_period_start TIMESTAMP WITH TIME ZONE;
  billing_period_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's profile and subscription info
  SELECT 
    COALESCE(subscription_tier, 'free'),
    subscription_period_start,
    subscription_period_end
  INTO user_subscription_tier, subscription_start, subscription_end
  FROM profiles 
  WHERE id = p_user_id;
  
  -- Handle null subscription tier
  IF user_subscription_tier IS NULL THEN
    user_subscription_tier := 'free';
  END IF;
  
  -- Check if user is in downgrade grace period
  IF user_subscription_tier = 'free' AND subscription_end IS NOT NULL AND subscription_end > NOW() THEN
    user_subscription_tier := 'student'; -- Keep Student benefits during grace period
  END IF;
  
  -- Calculate billing period dates
  IF user_subscription_tier = 'free' OR subscription_start IS NULL THEN
    -- Free users: use calendar month (legacy behavior)
    billing_period_start := DATE_TRUNC('month', NOW());
    billing_period_end := billing_period_start + INTERVAL '1 month';
  ELSE
    -- Paid users: use billing cycle from subscription start
    -- Calculate current billing period based on subscription start date
    billing_period_start := subscription_start + 
      (INTERVAL '1 month' * FLOOR(EXTRACT(EPOCH FROM (NOW() - subscription_start)) / (30.44 * 24 * 3600)));
    billing_period_end := billing_period_start + INTERVAL '1 month';
  END IF;
  
  -- Get tier limits from subscription_plans table (no hardcoding!)
  SELECT 
    sp.total_monthly_mb,
    sp.summaries_per_month
  INTO tier_mb, tier_summaries
  FROM subscription_plans sp
  WHERE sp.tier = user_subscription_tier::subscription_tier
  LIMIT 1;
  
  -- Set minute limits (these aren't in subscription_plans table yet)
  -- TODO: Add monthly_minutes column to subscription_plans table
  tier_minutes := CASE user_subscription_tier
    WHEN 'student' THEN 1500  -- 25 hours
    WHEN 'genius' THEN 6000   -- 100 hours
    ELSE 180                  -- 3 hours (free)
  END;
  
  -- Fallback if plan not found (should not happen)
  IF tier_minutes IS NULL THEN
    tier_minutes := CASE user_subscription_tier
      WHEN 'student' THEN 1500
      WHEN 'genius' THEN 6000
      ELSE 180
    END;
    tier_mb := CASE user_subscription_tier
      WHEN 'student' THEN 2000
      WHEN 'genius' THEN 10000
      ELSE 1000
    END;
    tier_summaries := CASE user_subscription_tier
      WHEN 'free' THEN 2
      ELSE -1
    END;
  END IF;
  
  -- Calculate usage for current billing period
  SELECT 
    COALESCE(SUM(duration_minutes), 0),
    COALESCE(SUM(file_size_mb), 0),
    COUNT(*)
  INTO usage_minutes, usage_mb, files_count
  FROM jobs 
  WHERE user_id = p_user_id 
    AND status = 'completed'
    AND created_at >= billing_period_start
    AND created_at < billing_period_end;
  
  -- Return the results
  RETURN QUERY SELECT
    usage_minutes AS current_usage_minutes,
    usage_mb AS current_usage_mb,
    files_count AS files_processed,
    tier_minutes AS monthly_limit_minutes,
    tier_mb AS monthly_limit_mb,
    GREATEST(0, tier_minutes - usage_minutes) AS remaining_minutes,
    GREATEST(0, tier_mb - usage_mb) AS remaining_mb,
    CASE 
      WHEN tier_summaries = -1 THEN 999999 -- Show unlimited as large number
      ELSE GREATEST(0, tier_summaries - files_count)
    END AS remaining_files,
    CASE 
      WHEN tier_summaries = -1 THEN 999999 -- Show unlimited
      ELSE tier_summaries
    END AS summary_limit,
    user_subscription_tier AS user_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_current_usage(UUID) TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION get_current_usage(UUID) IS 'Calculate usage based on billing periods - gives fresh limits on upgrade';

-- Test the function (replace with actual user ID)
-- SELECT * FROM get_current_usage('your-user-id-here');