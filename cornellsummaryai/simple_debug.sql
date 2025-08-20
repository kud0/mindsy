-- Simple debug queries to check usage tracking

-- 1. Check your recent jobs
SELECT 
  job_id,
  lecture_title,
  status,
  duration_minutes,
  file_size_mb,
  created_at::timestamp
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
ORDER BY created_at DESC
LIMIT 5;

-- 2. Check the function result
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);

-- 3. Manual calculation
SELECT 
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
  SUM(CASE WHEN status = 'completed' THEN COALESCE(duration_minutes, 0) END) as completed_minutes
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW());