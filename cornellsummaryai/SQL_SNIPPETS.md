# Mindsy Notes AI - SQL Snippets Reference

Common SQL snippets for user tracking, debugging, and profile management.

## 🔍 User Tracking & Analytics

### Find Your User ID
```sql
-- Get your user ID and basic info
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'alexsole@gmail.com';
```

### Current Usage Overview
```sql
-- Get current month usage using the function
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);
```

### Detailed Usage Breakdown
```sql
-- Manual calculation of current usage
SELECT 
  COUNT(*) as total_jobs,
  SUM(COALESCE(duration_minutes, 0)) as total_minutes,
  ROUND(SUM(COALESCE(duration_minutes, 0)) / 60.0, 1) as total_hours,
  AVG(COALESCE(duration_minutes, 0)) as avg_minutes_per_job,
  SUM(COALESCE(file_size_mb, 0)) as total_mb
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed';
```

### Recent Jobs Analysis
```sql
-- Check recent jobs with duration and status
SELECT 
  job_id,
  lecture_title,
  status,
  duration_minutes,
  file_size_mb,
  created_at,
  CASE 
    WHEN duration_minutes IS NULL THEN '❌ NULL'
    WHEN duration_minutes > 120 THEN '⚠️ HIGH (>2h)'
    WHEN duration_minutes > 60 THEN '⚡ LONG (>1h)' 
    ELSE '✅ NORMAL'
  END as duration_status
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC
LIMIT 10;
```

### Jobs by Status
```sql
-- Count jobs by status
SELECT 
  status,
  COUNT(*) as count,
  ROUND(AVG(COALESCE(duration_minutes, 0)), 1) as avg_minutes
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
GROUP BY status
ORDER BY count DESC;
```

### Daily Usage Pattern
```sql
-- Usage by day this month
SELECT 
  DATE(created_at) as date,
  COUNT(*) as jobs,
  SUM(COALESCE(duration_minutes, 0)) as total_minutes,
  ROUND(SUM(COALESCE(duration_minutes, 0)) / 60.0, 1) as hours
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## 🔧 Profile Management

### View Profile Details
```sql
-- Get complete profile information
SELECT 
  p.*,
  u.email,
  u.created_at as user_created_at,
  u.email_confirmed_at
FROM profiles p
JOIN auth.users u ON p.id = u.id
WHERE u.email = 'alexsole@gmail.com';
```

### Reset Usage (Current Month)
```sql
-- ⚠️ CAUTION: This deletes all your jobs for current month
DELETE FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW());

-- Verify deletion
SELECT COUNT(*) as remaining_jobs_this_month
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= DATE_TRUNC('month', NOW());
```

### Reset Usage (Today Only)
```sql
-- Delete only today's jobs (safer)
DELETE FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE;

-- Check updated usage
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
);
```

### Update Profile Tier
```sql
-- Change your tier (free, student, premium)
UPDATE profiles 
SET subscription_tier = 'student'  -- or 'free', 'premium'
WHERE id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com');
```

### Give Extra Minutes to Early Adopters
```sql
-- Method 1: Temporarily upgrade user to student tier (2400 minutes)
UPDATE profiles 
SET subscription_tier = 'student'
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@email.com');

-- Method 2: Delete some recent jobs to "refund" minutes
-- Example: Remove last 2 jobs to give back ~72 minutes
DELETE FROM jobs 
WHERE job_id IN (
  SELECT job_id FROM jobs 
  WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@email.com')
    AND status = 'completed'
  ORDER BY created_at DESC 
  LIMIT 2
);

-- Method 3: Reduce duration of existing jobs (temporary hack)
-- Reduce all jobs this month by 50% to give back minutes
UPDATE jobs 
SET duration_minutes = ROUND(duration_minutes * 0.5)
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@email.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed'
  AND duration_minutes > 0;
```

### View Subscription Limits
```sql
-- Check tier limits
SELECT 
  subscription_tier,
  CASE subscription_tier
    WHEN 'free' THEN '600 minutes (10h), 2 summaries'
    WHEN 'student' THEN '2400 minutes (40h), unlimited summaries'  
    WHEN 'premium' THEN 'Unlimited'
    ELSE 'Unknown tier'
  END as limits
FROM profiles
WHERE id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com');
```

### Verify Monthly Caps Are Correct
```sql
-- Check if monthly caps are properly enforced across all users
WITH tier_usage AS (
  SELECT 
    u.email,
    p.subscription_tier,
    usage.current_usage_minutes,
    usage.monthly_limit_minutes,
    usage.jobs_count,
    CASE 
      WHEN p.subscription_tier = 'free' THEN 600
      WHEN p.subscription_tier = 'student' THEN 2400
      WHEN p.subscription_tier = 'premium' THEN 999999
      ELSE 0
    END as expected_limit_minutes,
    CASE 
      WHEN p.subscription_tier = 'free' THEN 2
      WHEN p.subscription_tier = 'student' THEN 999999
      WHEN p.subscription_tier = 'premium' THEN 999999
      ELSE 0
    END as expected_limit_jobs
  FROM auth.users u
  JOIN profiles p ON u.id = p.id
  JOIN LATERAL (SELECT * FROM get_current_usage(u.id)) usage ON true
  WHERE u.created_at >= NOW() - INTERVAL '30 days'  -- Recent users only
)
SELECT 
  subscription_tier,
  COUNT(*) as users_count,
  COUNT(CASE WHEN monthly_limit_minutes = expected_limit_minutes THEN 1 END) as correct_minute_limits,
  COUNT(CASE WHEN monthly_limit_minutes != expected_limit_minutes THEN 1 END) as incorrect_minute_limits,
  STRING_AGG(
    CASE WHEN monthly_limit_minutes != expected_limit_minutes 
    THEN email || ' (has: ' || monthly_limit_minutes || ', should: ' || expected_limit_minutes || ')'
    END, 
    ', '
  ) as users_with_wrong_limits,
  ROUND(AVG(current_usage_minutes), 1) as avg_usage_minutes,
  MAX(current_usage_minutes) as max_usage_minutes
FROM tier_usage
GROUP BY subscription_tier
ORDER BY 
  CASE subscription_tier 
    WHEN 'free' THEN 1 
    WHEN 'student' THEN 2 
    WHEN 'premium' THEN 3 
  END;
```

### Find Users Who Exceeded Their Tier Limits
```sql
-- Identify users who somehow exceeded their monthly caps (potential bugs)
WITH limit_violations AS (
  SELECT 
    u.email,
    p.subscription_tier,
    usage.current_usage_minutes,
    usage.monthly_limit_minutes,
    usage.jobs_count,
    CASE 
      WHEN p.subscription_tier = 'free' AND usage.current_usage_minutes > 600 THEN 'MINUTES EXCEEDED'
      WHEN p.subscription_tier = 'free' AND usage.jobs_count > 2 THEN 'JOBS EXCEEDED'
      WHEN p.subscription_tier = 'student' AND usage.current_usage_minutes > 2400 THEN 'MINUTES EXCEEDED'
      ELSE 'OK'
    END as violation_type,
    usage.current_usage_minutes - 
      CASE p.subscription_tier 
        WHEN 'free' THEN 600
        WHEN 'student' THEN 2400
        ELSE 999999
      END as excess_minutes
  FROM auth.users u
  JOIN profiles p ON u.id = p.id
  JOIN LATERAL (SELECT * FROM get_current_usage(u.id)) usage ON true
  WHERE p.subscription_tier != 'premium'  -- Premium has no limits
)
SELECT 
  email,
  subscription_tier,
  current_usage_minutes,
  monthly_limit_minutes,
  jobs_count,
  violation_type,
  excess_minutes,
  CASE 
    WHEN violation_type != 'OK' THEN '🚨 NEEDS ATTENTION'
    ELSE '✅ OK'
  END as status
FROM limit_violations
WHERE violation_type != 'OK'
ORDER BY excess_minutes DESC;
```

## 🐛 Debugging & Troubleshooting

### Find Jobs with Duration Issues
```sql
-- Find jobs with problematic durations
SELECT 
  job_id,
  lecture_title,
  duration_minutes,
  file_size_mb,
  created_at,
  CASE 
    WHEN duration_minutes IS NULL THEN 'Missing duration'
    WHEN file_size_mb > 0 AND duration_minutes > (file_size_mb / 0.5) THEN 'Duration too high'
    WHEN file_size_mb > 0 AND duration_minutes < (file_size_mb / 2.0) THEN 'Duration too low'
    ELSE 'Looks reasonable'
  END as diagnosis
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Fix Specific Job Duration
```sql
-- Update a specific job's duration (replace job_id and duration)
UPDATE jobs 
SET duration_minutes = 36  -- Replace with correct duration
WHERE job_id = 'your-job-id-here'
  AND user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com');
```

### Bulk Fix Recent Jobs
```sql
-- Fix all jobs today with inflated durations (>50 minutes)
UPDATE jobs 
SET duration_minutes = 36  -- Replace with reasonable duration
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
  AND status = 'completed'
  AND duration_minutes > 50;

-- Check what was updated
SELECT COUNT(*) as jobs_fixed FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= CURRENT_DATE
  AND duration_minutes = 36;
```

### Database Health Check
```sql
-- Check for data inconsistencies
SELECT 
  'Jobs without duration' as issue,
  COUNT(*) as count
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND duration_minutes IS NULL
  AND status = 'completed'

UNION ALL

SELECT 
  'Jobs without file size' as issue,
  COUNT(*) as count
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND file_size_mb IS NULL
  AND status = 'completed'

UNION ALL

SELECT 
  'Suspiciously long jobs (>4h)' as issue,
  COUNT(*) as count
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND duration_minutes > 240
  AND status = 'completed';
```

## 🎁 Early Adopter Management

### Identify Users Who Need Extra Minutes
```sql
-- Find users close to their monthly limit (>90% usage)
SELECT 
  u.email,
  p.subscription_tier,
  usage.current_usage_minutes,
  usage.monthly_limit_minutes,
  ROUND((usage.current_usage_minutes::float / usage.monthly_limit_minutes * 100), 1) as usage_percent,
  (usage.monthly_limit_minutes - usage.current_usage_minutes) as remaining_minutes
FROM auth.users u
JOIN profiles p ON u.id = p.id
JOIN LATERAL (
  SELECT * FROM get_current_usage(u.id)
) usage ON true
WHERE usage.current_usage_minutes::float / usage.monthly_limit_minutes > 0.9  -- >90% usage
ORDER BY usage_percent DESC;
```

### Grant Extra Minutes - Multiple Methods

#### Method 1: Temporary Tier Upgrade (Recommended)
```sql
-- Upgrade user to student tier until end of month
UPDATE profiles 
SET subscription_tier = 'student'
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@email.com');

-- Note: Remember to downgrade them back to 'free' next month if needed
-- You can set a reminder or create a scheduled job
```

#### Method 2: Selective Job Deletion (Minutes Refund)
```sql
-- Check user's recent jobs first
SELECT 
  job_id, 
  lecture_title, 
  duration_minutes, 
  created_at,
  ROW_NUMBER() OVER (ORDER BY created_at DESC) as recent_rank
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@email.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed'
ORDER BY created_at DESC;

-- Delete specific jobs to refund minutes (choose jobs carefully)
DELETE FROM jobs 
WHERE job_id IN ('job-id-1', 'job-id-2', 'job-id-3')  -- Replace with actual job IDs
  AND user_id = (SELECT id FROM auth.users WHERE email = 'user@email.com');
```

#### Method 3: Duration Adjustment (Temporary Fix)
```sql
-- Reduce duration of all jobs by 25% to free up minutes
UPDATE jobs 
SET duration_minutes = ROUND(duration_minutes * 0.75)
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@email.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed'
  AND duration_minutes > 5;  -- Don't reduce very short jobs

-- Check how many minutes were freed up
SELECT 
  COUNT(*) as jobs_adjusted,
  SUM(duration_minutes) as current_total_minutes
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'user@email.com')
  AND created_at >= DATE_TRUNC('month', NOW())
  AND status = 'completed';
```

### Bulk Early Adopter Benefits
```sql
-- Upgrade ALL free tier users to student (use carefully!)
UPDATE profiles 
SET subscription_tier = 'student'
WHERE subscription_tier = 'free'
  AND id IN (
    SELECT u.id FROM auth.users u
    WHERE u.created_at <= NOW() - INTERVAL '30 days'  -- Users older than 30 days
  );

-- Or upgrade users with high usage (loyal users)
UPDATE profiles 
SET subscription_tier = 'student'
WHERE subscription_tier = 'free'
  AND id IN (
    SELECT user_id FROM jobs 
    WHERE created_at >= NOW() - INTERVAL '30 days'
    GROUP BY user_id 
    HAVING COUNT(*) >= 5  -- Users with 5+ jobs in last 30 days
  );
```

### Early Adopter Analytics
```sql
-- Find your most active early adopters
SELECT 
  u.email,
  u.created_at as signup_date,
  p.subscription_tier,
  COUNT(j.job_id) as total_jobs,
  SUM(COALESCE(j.duration_minutes, 0)) as total_minutes,
  ROUND(SUM(COALESCE(j.duration_minutes, 0)) / 60.0, 1) as total_hours,
  MAX(j.created_at) as last_activity
FROM auth.users u
JOIN profiles p ON u.id = p.id
LEFT JOIN jobs j ON u.id = j.user_id AND j.status = 'completed'
WHERE u.created_at <= NOW() - INTERVAL '14 days'  -- Early adopters (2+ weeks ago)
GROUP BY u.id, u.email, u.created_at, p.subscription_tier
HAVING COUNT(j.job_id) > 0  -- Only users who actually used the service
ORDER BY total_minutes DESC;
```

### Emergency Minutes Grant
```sql
-- Emergency: Give specific user 10 extra hours by upgrading to student tier
-- and leaving a note for follow-up
UPDATE profiles 
SET 
  subscription_tier = 'student',
  updated_at = NOW()
WHERE id = (SELECT id FROM auth.users WHERE email = 'user@email.com');

-- Add a comment job for tracking (optional)
INSERT INTO jobs (
  job_id, 
  user_id, 
  lecture_title, 
  status, 
  duration_minutes,
  created_at
) VALUES (
  'bonus-' || generate_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'user@email.com'),
  '🎁 BONUS: Extra minutes granted by admin',
  'completed',
  -600,  -- Negative duration = bonus minutes (10 hours)
  NOW()
);
```

### Reset Early Adopter Status (Next Month)
```sql
-- At the start of next month, reset early adopters back to free tier
-- Run this on the 1st of each month
UPDATE profiles 
SET subscription_tier = 'free'
WHERE subscription_tier = 'student'
  AND id IN (
    -- Only reset users who were temporarily upgraded
    SELECT u.id FROM auth.users u
    WHERE u.created_at >= NOW() - INTERVAL '60 days'  -- Recent signups
    -- Add more conditions to identify temporary upgrades
  );
```

### 💳 Paying Customer Support (Student Tier Users)

### Find Paying Customers Who Hit Their Limit
```sql
-- Find student tier users who exceeded or are close to 2400 minutes (40h)
SELECT 
  u.email,
  u.created_at as signup_date,
  usage.current_usage_minutes,
  usage.monthly_limit_minutes,
  ROUND((usage.current_usage_minutes::float / usage.monthly_limit_minutes * 100), 1) as usage_percent,
  (usage.monthly_limit_minutes - usage.current_usage_minutes) as remaining_minutes,
  CASE 
    WHEN usage.current_usage_minutes >= usage.monthly_limit_minutes THEN '🚨 EXCEEDED LIMIT'
    WHEN usage.current_usage_minutes::float / usage.monthly_limit_minutes > 0.9 THEN '⚠️ CLOSE TO LIMIT'
    ELSE '✅ OK'
  END as status
FROM auth.users u
JOIN profiles p ON u.id = p.id
JOIN LATERAL (SELECT * FROM get_current_usage(u.id)) usage ON true
WHERE p.subscription_tier = 'student'  -- Only paying customers
  AND usage.current_usage_minutes::float / usage.monthly_limit_minutes > 0.8  -- >80% usage
ORDER BY usage_percent DESC;
```

### Give Extra Minutes to Paying Customers

#### Method 1: Create Temporary "Premium" Tier (Recommended)
```sql
-- Create a temporary premium tier with unlimited minutes for heavy users
UPDATE profiles 
SET subscription_tier = 'premium'
WHERE id = (SELECT id FROM auth.users WHERE email = 'paying-user@email.com')
  AND subscription_tier = 'student';  -- Only upgrade existing student users

-- Note: Your get_current_usage function should handle 'premium' as unlimited
-- or set a very high limit like 10000 minutes (166 hours)
```

#### Method 2: Negative Duration "Bonus Credits"
```sql
-- Add bonus credits by creating negative duration jobs
INSERT INTO jobs (
  job_id, 
  user_id, 
  lecture_title, 
  status, 
  duration_minutes,
  file_size_mb,
  created_at,
  updated_at
) VALUES (
  'bonus-' || extract(epoch from now())::text,
  (SELECT id FROM auth.users WHERE email = 'paying-user@email.com'),
  '🎁 BONUS: Extra 10 hours - Thank you for being an early adopter!',
  'completed',
  -600,  -- Negative 600 minutes = +10 hours bonus
  0,
  NOW(),
  NOW()
);

-- Verify the bonus was applied
SELECT * FROM get_current_usage(
  (SELECT id FROM auth.users WHERE email = 'paying-user@email.com')
);
```

#### Method 3: Temporary Limit Boost in Database
```sql
-- If you have a custom limits table or want to modify the function
-- This is a more advanced approach - you'd need to modify get_current_usage function
-- to check for custom limits first

-- Example: Create a temporary limits override table
CREATE TABLE IF NOT EXISTS user_limit_overrides (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  monthly_limit_minutes INTEGER NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant extra 20 hours (1200 minutes) until end of month
INSERT INTO user_limit_overrides (user_id, monthly_limit_minutes, expires_at, reason)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'paying-user@email.com'),
  3600,  -- 2400 + 1200 = 60 hours total
  DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day',  -- End of month
  'Early adopter bonus - first month heavy usage'
) ON CONFLICT (user_id) DO UPDATE SET
  monthly_limit_minutes = EXCLUDED.monthly_limit_minutes,
  expires_at = EXCLUDED.expires_at,
  reason = EXCLUDED.reason;
```

### Bulk Support for Heavy Users
```sql
-- Find all student users who used >90% of their limit this month
WITH heavy_users AS (
  SELECT 
    u.id,
    u.email,
    usage.current_usage_minutes,
    usage.monthly_limit_minutes
  FROM auth.users u
  JOIN profiles p ON u.id = p.id
  JOIN LATERAL (SELECT * FROM get_current_usage(u.id)) usage ON true
  WHERE p.subscription_tier = 'student'
    AND usage.current_usage_minutes::float / usage.monthly_limit_minutes > 0.9
)
-- Upgrade all heavy users to premium temporarily
UPDATE profiles 
SET subscription_tier = 'premium'
WHERE id IN (SELECT id FROM heavy_users);

-- Or give all heavy users bonus credits
WITH heavy_users AS (
  SELECT 
    u.id,
    u.email,
    usage.current_usage_minutes
  FROM auth.users u
  JOIN profiles p ON u.id = p.id
  JOIN LATERAL (SELECT * FROM get_current_usage(u.id)) usage ON true
  WHERE p.subscription_tier = 'student'
    AND usage.current_usage_minutes::float / usage.monthly_limit_minutes > 0.9
)
INSERT INTO jobs (job_id, user_id, lecture_title, status, duration_minutes, created_at)
SELECT 
  'bonus-' || extract(epoch from now())::text || '-' || ROW_NUMBER() OVER(),
  id,
  '🎁 BONUS: Extra 20 hours - Heavy user appreciation!',
  'completed',
  -1200,  -- 20 hours bonus
  NOW()
FROM heavy_users;
```

### Customer Appreciation Messages
```sql
-- Add a nice message job for customers you help
INSERT INTO jobs (
  job_id, 
  user_id, 
  lecture_title, 
  status, 
  duration_minutes,
  created_at
) VALUES (
  'message-' || extract(epoch from now())::text,
  (SELECT id FROM auth.users WHERE email = 'paying-user@email.com'),
  '💌 Thanks for being an early supporter! We noticed you hit your limit and added extra minutes. Feedback welcome!',
  'completed',
  0,  -- No minutes used/given, just a message
  NOW()
);
```

### Monthly Reset and Tier Management
```sql
-- At the start of each month, reset any temporary premium users back to student
-- Run this on the 1st of each month
UPDATE profiles 
SET subscription_tier = 'student'
WHERE subscription_tier = 'premium'
  AND id IN (
    -- Only reset users who were temporarily upgraded from student
    SELECT DISTINCT user_id FROM jobs 
    WHERE lecture_title LIKE '%BONUS:%'
      AND created_at >= NOW() - INTERVAL '35 days'  -- Last month's bonuses
  );

-- Clean up expired limit overrides (if using Method 3)
DELETE FROM user_limit_overrides 
WHERE expires_at < NOW();
```

### View User Feedback
```sql
-- See all user feedback
SELECT 
  user_email,
  rating,
  suggestion,
  created_at
FROM feedback 
ORDER BY created_at DESC;
```

## 📊 Advanced Analytics

### Monthly Usage History
```sql
-- Usage by month (last 6 months)
SELECT 
  DATE_TRUNC('month', created_at) as month,
  COUNT(*) as jobs,
  SUM(COALESCE(duration_minutes, 0)) as total_minutes,
  ROUND(SUM(COALESCE(duration_minutes, 0)) / 60.0, 1) as total_hours,
  ROUND(AVG(COALESCE(duration_minutes, 0)), 1) as avg_minutes_per_job
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= NOW() - INTERVAL '6 months'
  AND status = 'completed'
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;
```

### Peak Usage Days
```sql
-- Find your busiest days
SELECT 
  DATE(created_at) as date,
  COUNT(*) as jobs,
  SUM(COALESCE(duration_minutes, 0)) as total_minutes,
  STRING_AGG(lecture_title, ', ') as lectures
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND created_at >= NOW() - INTERVAL '30 days'
  AND status = 'completed'
GROUP BY DATE(created_at)
HAVING COUNT(*) > 1  -- Only days with multiple jobs
ORDER BY total_minutes DESC
LIMIT 5;
```

### File Size vs Duration Analysis
```sql
-- Analyze file size to duration ratio
SELECT 
  ROUND(file_size_mb, 0) as size_mb_rounded,
  COUNT(*) as jobs,
  ROUND(AVG(duration_minutes), 1) as avg_duration,
  ROUND(AVG(duration_minutes / NULLIF(file_size_mb, 0)), 2) as minutes_per_mb
FROM jobs 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com')
  AND file_size_mb > 0 
  AND duration_minutes > 0
  AND status = 'completed'
GROUP BY ROUND(file_size_mb, 0)
HAVING COUNT(*) >= 2  -- Only sizes with multiple samples
ORDER BY size_mb_rounded;
```

## 🚨 Emergency Reset Commands

### Complete Profile Reset (DANGER!)
```sql
-- ⚠️ NUCLEAR OPTION: Delete everything for your account
-- This will delete ALL your jobs and notes permanently!

-- Uncomment and run ONLY if you're absolutely sure:
-- DELETE FROM jobs WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com');
-- DELETE FROM notes WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com');
-- 
-- -- Reset profile to defaults
-- UPDATE profiles SET 
--   subscription_tier = 'free',
--   github_username = NULL,
--   github_avatar_url = NULL
-- WHERE id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com');
```

## 💡 Quick Usage Tips

1. **Always backup before bulk operations**:
   ```sql
   -- Create backup of your jobs
   CREATE TABLE jobs_backup AS 
   SELECT * FROM jobs 
   WHERE user_id = (SELECT id FROM auth.users WHERE email = 'alexsole@gmail.com');
   ```

2. **Use transactions for safety**:
   ```sql
   BEGIN;
   -- Your dangerous operation here
   -- Check results first, then:
   COMMIT;  -- or ROLLBACK; if something went wrong
   ```

3. **Replace email in all snippets**:
   - Change `'alexsole@gmail.com'` to your actual email
   - Or create a variable: `\set myemail 'your@email.com'`

4. **Check usage after any changes**:
   ```sql
   SELECT * FROM get_current_usage(
     (SELECT id FROM auth.users WHERE email = 'your@email.com')
   );
   ```

---

**Remember**: Always test changes with `SELECT` queries first before running `UPDATE` or `DELETE` operations!