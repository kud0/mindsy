-- Quick fix for the function data type issue
DROP FUNCTION IF EXISTS get_current_usage(UUID);

CREATE FUNCTION get_current_usage(p_user_id UUID)
RETURNS TABLE (
  current_usage_minutes INTEGER,
  current_usage_mb DECIMAL,
  files_processed INTEGER,
  monthly_limit_minutes INTEGER,
  monthly_limit_mb INTEGER,
  remaining_minutes INTEGER,
  remaining_mb INTEGER,  -- Changed to INTEGER to match expectation
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
BEGIN
  -- Get user's profile and subscription info
  SELECT 
    COALESCE(subscription_tier, 'free'),
    subscription_period_end
  INTO user_subscription_tier, subscription_end
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
  
  -- Set tier limits based on subscription
  CASE user_subscription_tier
    WHEN 'student' THEN
      tier_minutes := 1500;  -- 25 hours
      tier_mb := 700;        -- Keep old MB limit for transition
      tier_summaries := 50;
    WHEN 'genius' THEN
      tier_minutes := 6000;  -- 100 hours (future tier)
      tier_mb := 2000;       -- Keep old MB limit for transition  
      tier_summaries := 200;
    ELSE -- 'free'
      tier_minutes := 600;   -- 10 hours
      tier_mb := 120;        -- Keep old MB limit for transition
      tier_summaries := 2;
  END CASE;
  
  -- Calculate current month usage (both minutes and MB)
  SELECT 
    COALESCE(SUM(duration_minutes), 0),
    COALESCE(SUM(file_size_mb), 0),
    COUNT(*)
  INTO usage_minutes, usage_mb, files_count
  FROM jobs 
  WHERE user_id = p_user_id 
    AND status = 'completed'
    AND created_at >= DATE_TRUNC('month', NOW())
    AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';
  
  -- Return the results
  RETURN QUERY SELECT
    usage_minutes AS current_usage_minutes,
    usage_mb AS current_usage_mb,
    files_count AS files_processed,
    tier_minutes AS monthly_limit_minutes,
    tier_mb AS monthly_limit_mb,
    GREATEST(0, tier_minutes - usage_minutes) AS remaining_minutes,
    GREATEST(0, tier_mb - usage_mb)::INTEGER AS remaining_mb,  -- Cast to INTEGER
    GREATEST(0, tier_summaries - files_count) AS remaining_files,
    tier_summaries AS summary_limit,
    user_subscription_tier AS user_tier;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_current_usage(UUID) TO authenticated;