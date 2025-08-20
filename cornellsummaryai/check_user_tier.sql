-- Check what tier support@mysummary.app has
SELECT 
  p.email,
  p.subscription_tier,
  p.subscription_status,
  p.subscription_period_start,
  p.subscription_period_end,
  p.stripe_customer_id,
  p.stripe_subscription_id,
  p.created_at,
  p.updated_at
FROM public.profiles p 
WHERE p.email = 'support@mysummary.app';

-- Also check their usage data
SELECT 
  p.email,
  p.subscription_tier,
  u.current_usage_minutes,
  u.monthly_limit_minutes,
  u.files_processed,
  u.summary_limit,
  u.remaining_minutes,
  u.user_tier
FROM public.profiles p
LEFT JOIN (
  SELECT * FROM get_current_usage(p.id)
) u ON true
WHERE p.email = 'support@mysummary.app';