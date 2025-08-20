-- Debug and Reset User Usage
-- First, let's see what jobs are contributing to your 200m usage

-- Step 1: Find your user ID and see current jobs
SELECT 
  u.id as user_id,
  u.email,
  j.job_id,
  j.lecture_title,
  j.duration_minutes,
  j.file_size_mb,
  j.status,
  j.created_at,
  j.updated_at
FROM auth.users u
LEFT JOIN jobs j ON j.user_id = u.id 
  AND j.created_at >= DATE_TRUNC('month', NOW())
  AND j.created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
WHERE u.email = 'alexsole@gmail.com'  -- Replace with your actual email
ORDER BY j.created_at DESC;

-- Step 2: Check what the get_current_usage function returns
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')  -- Replace with your email
);

-- Step 3: More thorough reset - set ALL jobs to 0 duration for this month
UPDATE jobs 
SET duration_minutes = 0, file_size_mb = 0
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com'  -- Replace with your email
)
AND created_at >= DATE_TRUNC('month', NOW())
AND created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month';

-- Step 4: Alternative - Delete all jobs for current month (complete reset)
-- Uncomment the lines below if you want to completely remove job records:
/*
DELETE FROM notes WHERE job_id IN (
  SELECT job_id FROM jobs 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
);

DELETE FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
AND created_at >= DATE_TRUNC('month', NOW());
*/

-- Step 5: Verify the reset worked
SELECT 
  'After Reset' as status,
  u.email,
  COUNT(j.*) as jobs_this_month,
  COALESCE(SUM(j.duration_minutes), 0) as total_minutes,
  COALESCE(SUM(j.file_size_mb), 0) as total_mb
FROM auth.users u
LEFT JOIN jobs j ON j.user_id = u.id 
  AND j.created_at >= DATE_TRUNC('month', NOW())
  AND j.created_at < DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
WHERE u.email = 'alexsole@gmail.com'  -- Replace with your email
GROUP BY u.id, u.email;