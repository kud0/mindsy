-- Check current usage and what's being counted

-- 1. Show all completed jobs this month with their duration
SELECT 
  job_id,
  lecture_title,
  status,
  duration_minutes,
  file_size_mb,
  created_at,
  updated_at
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed'
ORDER BY created_at DESC;

-- 2. Manual calculation of total usage
SELECT 
  COUNT(*) as total_completed_jobs,
  SUM(COALESCE(duration_minutes, 0)) as total_minutes,
  SUM(CASE WHEN duration_minutes IS NOT NULL THEN 1 ELSE 0 END) as jobs_with_duration,
  SUM(CASE WHEN duration_minutes IS NULL THEN 1 ELSE 0 END) as jobs_without_duration
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed';

-- 3. Check the function result
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);

-- 4. Find jobs that were processed today but have no duration
SELECT 
  job_id,
  lecture_title,
  status,
  duration_minutes,
  file_size_mb,
  created_at
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
  AND (duration_minutes IS NULL OR duration_minutes = 0)
ORDER BY created_at DESC;