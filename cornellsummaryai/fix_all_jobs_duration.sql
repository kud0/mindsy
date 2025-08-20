-- Fix all existing jobs without duration by estimating from file size

-- 1. First, let's see what we're going to update
SELECT 
  job_id,
  lecture_title,
  file_size_mb,
  CASE 
    WHEN file_size_mb IS NULL THEN 10  -- Default 10 minutes if no file size
    ELSE GREATEST(1, CEIL(file_size_mb / 0.75))  -- Estimate: 0.75MB per minute
  END as estimated_minutes
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed'
  AND duration_minutes IS NULL
ORDER BY created_at DESC;

-- 2. Update all jobs without duration (using file size estimation)
UPDATE jobs 
SET duration_minutes = CASE 
    WHEN file_size_mb IS NULL THEN 10  -- Default 10 minutes if no file size
    ELSE GREATEST(1, CEIL(file_size_mb / 0.75))::INTEGER  -- Estimate: 0.75MB per minute
  END
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed'
  AND duration_minutes IS NULL;

-- 3. Verify the update worked
SELECT 
  COUNT(*) as updated_jobs,
  SUM(duration_minutes) as total_minutes_added
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed';

-- 4. Check new usage total
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);

-- 5. See the updated jobs
SELECT 
  job_id,
  lecture_title,
  duration_minutes,
  file_size_mb,
  created_at
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 10;