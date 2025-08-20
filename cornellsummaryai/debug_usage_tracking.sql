-- Debug usage tracking - check what's actually in the jobs table

-- 1. Check your recent jobs and their duration data
SELECT 
  j.job_id,
  j.lecture_title,
  j.status,
  j.duration_minutes,
  j.file_size_mb,
  j.created_at,
  j.updated_at
FROM jobs j
JOIN auth.users u ON j.user_id = u.id
WHERE u.email = 'alexsole@gmail.com'
  AND j.created_at >= DATE_TRUNC('month', NOW())
ORDER BY j.created_at DESC
LIMIT 10;

-- 2. Check what the get_current_usage function returns
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);

-- 3. Check raw calculation manually
SELECT 
  COUNT(*) as total_jobs,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_jobs,
  COALESCE(SUM(CASE WHEN status = 'completed' THEN duration_minutes END), 0) as total_completed_minutes,
  COALESCE(SUM(duration_minutes), 0) as total_all_minutes,
  COALESCE(SUM(CASE WHEN status = 'completed' THEN file_size_mb END), 0) as total_completed_mb
FROM jobs j
JOIN auth.users u ON j.user_id = u.id
WHERE u.email = 'alexsole@gmail.com'
  AND j.created_at >= DATE_TRUNC('month', NOW());

-- 4. Check if there are any jobs with duration but not completed
SELECT 
  j.job_id,
  j.status,
  j.duration_minutes,
  j.file_size_mb,
  j.created_at
FROM jobs j
JOIN auth.users u ON j.user_id = u.id
WHERE u.email = 'alexsole@gmail.com'
  AND j.created_at >= DATE_TRUNC('month', NOW())
  AND j.duration_minutes IS NOT NULL
  AND j.duration_minutes > 0;