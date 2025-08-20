-- Fix the recent job that failed to update with duration

-- 1. Find your most recent job
SELECT 
  job_id,
  lecture_title,
  status,
  duration_minutes,
  file_size_mb,
  created_at
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 1;

-- 2. Update the most recent job with estimated duration
-- (Replace this with the actual job_id from query above)
UPDATE jobs 
SET 
  duration_minutes = 55,  -- Estimated from your 41.3MB file (41.3 / 0.75)
  file_size_mb = 41.3
WHERE job_id = (
  SELECT job_id 
  FROM jobs 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
    AND created_at >= DATE_TRUNC('month', NOW())
    AND status = 'completed'
  ORDER BY created_at DESC
  LIMIT 1
);

-- 3. Verify the update worked
SELECT 
  job_id,
  lecture_title,
  status,
  duration_minutes,
  file_size_mb,
  created_at
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND duration_minutes IS NOT NULL
ORDER BY created_at DESC;

-- 4. Test the usage function
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);