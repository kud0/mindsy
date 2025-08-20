-- Debug: Check your most recent jobs and their duration values
SELECT 
  job_id,
  lecture_title,
  status,
  duration_minutes,
  file_size_mb,
  created_at,
  updated_at,
  CASE 
    WHEN duration_minutes IS NULL THEN 'NULL (needs fix)'
    WHEN duration_minutes > 120 THEN 'SUSPICIOUS (>2h)'
    WHEN duration_minutes > 60 THEN 'HIGH (>1h)'
    ELSE 'NORMAL'
  END as duration_status
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE - INTERVAL '1 day'
ORDER BY created_at DESC;

-- Check usage calculation
SELECT 
  COUNT(*) as total_jobs_today,
  SUM(COALESCE(duration_minutes, 0)) as total_minutes_today,
  AVG(COALESCE(duration_minutes, 0)) as avg_minutes_per_job,
  MAX(duration_minutes) as max_duration,
  MIN(duration_minutes) as min_duration
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
  AND status = 'completed';

-- Check get_current_usage function result
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);