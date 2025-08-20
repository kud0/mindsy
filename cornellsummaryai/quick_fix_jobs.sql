-- Quick fix for recent jobs with inflated durations
-- Set recent jobs to reasonable 36-minute duration based on your tests

-- Fix today's jobs that are obviously wrong (>50 minutes for your test file)
UPDATE jobs 
SET duration_minutes = 36
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
  AND status = 'completed'
  AND duration_minutes > 50;  -- Only fix the obviously inflated ones

-- Check updated total
SELECT 
  COUNT(*) as jobs_today,
  SUM(duration_minutes) as total_minutes,
  ROUND(SUM(duration_minutes) / 60.0, 1) as total_hours
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
  AND status = 'completed';