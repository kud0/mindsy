-- Remove MB-based file size restrictions
-- Keep minute-based limits only

-- Update subscription plans to have very high MB limits (effectively no MB limit)
UPDATE public.subscription_plans 
SET 
  max_file_size_mb = 1000,  -- 1GB per file (effectively no limit)
  total_monthly_mb = 10000  -- 10GB monthly (effectively no limit)
WHERE tier = 'free';

UPDATE public.subscription_plans 
SET 
  max_file_size_mb = 2000,  -- 2GB per file 
  total_monthly_mb = 20000  -- 20GB monthly
WHERE tier = 'student';

-- The real limits are now:
-- Free tier: 120 minutes per file, 180 minutes per month, 2 files per month
-- Student tier: 240 minutes per file, 1500 minutes per month, unlimited files

-- Verify the changes
SELECT tier, name, max_file_size_mb, total_monthly_mb FROM public.subscription_plans;