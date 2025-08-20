-- Emergency fix: Set recent jobs to accurate duration
-- Based on your tests, the audio file should be ~36 minutes

-- 1. Show current problematic jobs
SELECT 
  job_id,
  lecture_title,
  duration_minutes,
  file_size_mb,
  created_at
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
  AND status = 'completed'
ORDER BY created_at DESC;

-- 2. Fix the most recent jobs (assuming they're the same audio file ~36 minutes)
UPDATE jobs 
SET duration_minutes = 36
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
  AND status = 'completed'
  AND duration_minutes > 50;  -- Only fix the obviously wrong ones

-- 3. Check new total
SELECT 
  COUNT(*) as jobs_today,
  SUM(duration_minutes) as total_minutes,
  ROUND(SUM(duration_minutes) / 60.0, 1) as total_hours
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
  AND status = 'completed';

-- 4. Check updated usage
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);