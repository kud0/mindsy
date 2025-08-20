-- Fix the last job and check actual usage

-- 1. Find and update your most recent job
UPDATE jobs 
SET 
  duration_minutes = 41,  -- 31 minutes as you mentioned
  file_size_mb = 23.15    -- From your upload
WHERE job_id = (
  SELECT job_id 
  FROM jobs 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
    AND created_at >= CURRENT_DATE
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1
);

-- 2. Check total usage now
SELECT 
  COUNT(*) as total_jobs,
  SUM(duration_minutes) as total_minutes,
  ROUND(SUM(duration_minutes) / 60.0, 1) as total_hours
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed';

-- 3. Check the function result
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);

-- 4. List recent jobs to verify
SELECT 
  job_id,
  lecture_title,
  duration_minutes,
  file_size_mb,
  created_at
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
ORDER BY created_at DESC;