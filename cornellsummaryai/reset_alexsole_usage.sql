-- Reset usage for alexsole@gmail.com
UPDATE jobs 
SET duration_minutes = 0, file_size_mb = 0
WHERE user_id = (
  SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com'
)
AND created_at >= DATE_TRUNC('month', NOW());

-- Verify the reset
SELECT 
  'AFTER RESET' as status,
  COUNT(*) as jobs_count,
  COALESCE(SUM(duration_minutes), 0) as total_minutes,
  COALESCE(SUM(file_size_mb), 0) as total_mb
FROM jobs j
JOIN auth.users u ON j.user_id = u.id
WHERE u.email = 'alexsole@gmail.com'
AND j.created_at >= DATE_TRUNC('month', NOW());

-- Test the function after fix
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);