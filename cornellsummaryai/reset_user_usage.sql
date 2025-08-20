-- Reset user usage for testing
-- This will clear the current month's usage for a specific user

-- Option 1: Reset by email (replace with your email)
UPDATE jobs 
SET duration_minutes = 0, file_size_mb = 0
WHERE user_id = (
  SELECT auth.uid() 
  FROM auth.users 
  WHERE email = 'alexsole@gmail.com'  -- Replace with your actual email
)
AND created_at >= DATE_TRUNC('month', NOW())
AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

-- Option 2: Reset for currently authenticated user (if running in Supabase dashboard)
-- UPDATE jobs 
-- SET duration_minutes = 0, file_size_mb = 0
-- WHERE user_id = auth.uid()
-- AND created_at >= DATE_TRUNC('month', NOW())
-- AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

-- Option 3: Delete all jobs for current month (more thorough reset)
-- DELETE FROM jobs 
-- WHERE user_id = auth.uid()
-- AND created_at >= DATE_TRUNC('month', NOW())
-- AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

-- Verify the reset worked by checking current usage
SELECT 
  u.email,
  COUNT(j.*) as jobs_this_month,
  COALESCE(SUM(j.duration_minutes), 0) as total_minutes,
  COALESCE(SUM(j.file_size_mb), 0) as total_mb
FROM auth.users u
LEFT JOIN jobs j ON j.user_id = u.id 
  AND j.created_at >= DATE_TRUNC('month', NOW())
  AND j.created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
WHERE u.email = 'alexsole@gmail.com'  -- Replace with your actual email
GROUP BY u.id, u.email;