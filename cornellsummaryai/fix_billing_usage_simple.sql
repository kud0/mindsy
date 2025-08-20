-- Simple fix: Use billing periods for paid users, calendar months for free users
-- This ensures users get fresh limits when they upgrade

-- Drop and recreate the function with billing period fix
DROP FUNCTION IF EXISTS get_current_usage(UUID);

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
  subscription_end TIMESTAMP WITH TIME ZONE;
  subscription_start TIMESTAMP WITH TIME ZONE;
  period_start TIMESTAMP WITH TIME ZONE;
  period_end TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get user's profile and subscription info
  SELECT 
    COALESCE(subscription_tier, 'free'),
    subscription_period_end,
    subscription_period_start
  INTO user_subscription_tier, subscription_end, subscription_start
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
  
  -- Set period dates: billing period for paid users, calendar month for free users
  IF user_subscription_tier = 'free' OR subscription_start IS NULL THEN
    -- Free users: use calendar month
    period_start := DATE_TRUNC('month', NOW());
    period_end := period_start + INTERVAL '1 month';
  ELSE
    -- Paid users: use billing period starting from subscription start
    period_start := subscription_start;
    period_end := subscription_start + INTERVAL '1 month';
    
    -- If we're past the first billing period, calculate current period
    WHILE period_end < NOW() LOOP
      period_start := period_start + INTERVAL '1 month';
      period_end := period_end + INTERVAL '1 month';
    END LOOP;
  END IF;
  
  -- Set tier limits (only 2 tiers: free and student)
  CASE user_subscription_tier
    WHEN 'student' THEN
      tier_minutes := 1500;  -- 25 hours
      tier_mb := 2000;       -- High limit (effectively unlimited)
      tier_summaries := -1;  -- Unlimited files
    ELSE -- 'free'
      tier_minutes := 180;   -- 3 hours
      tier_mb := 1000;       -- High limit (effectively unlimited)
      tier_summaries := 2;   -- 2 files per month
  END CASE;
  
  -- Calculate usage for current period (billing period for paid, calendar month for free)
  SELECT 
    COALESCE(SUM(duration_minutes), 0),
    COALESCE(SUM(file_size_mb), 0),
    COUNT(*)
  INTO usage_minutes, usage_mb, files_count
  FROM jobs 
  WHERE user_id = p_user_id 
    AND status = 'completed'
    AND created_at >= period_start
    AND created_at < period_end;
  
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
      WHEN tier_summaries = -1 THEN 999999
      ELSE GREATEST(0, tier_summaries - files_count)
    END AS remaining_files,
    CASE 
      WHEN tier_summaries = -1 THEN 999999
      ELSE tier_summaries
    END AS summary_limit,
    user_subscription_tier AS user_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_current_usage(UUID) TO authenticated;