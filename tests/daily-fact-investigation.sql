-- ============================================
-- DAILY FACT INVESTIGATION & SOLUTIONS
-- ============================================
-- Date: 2025-10-21
-- Issue: Daily fact showing "No daily fact available yet"
-- Root Cause: dismissed flag is TRUE for user
-- ============================================

-- 1. CHECK CURRENT STATE
-- ============================================

-- Get current daily fact state for user
SELECT
  id,
  daily_fact_text,
  daily_fact_date,
  daily_fact_dismissed,
  daily_fact_collapsed,
  daily_fact_language,
  updated_at
FROM profiles
WHERE id = 'ad5f79b7-10d8-49a2-aaff-22a8066d79b6'::uuid;

-- Expected Result:
-- - daily_fact_dismissed: TRUE (this is why no fact is showing)
-- - daily_fact_date: 2025-10-21


-- ============================================
-- SOLUTION A: RESET DISMISSED FLAG (FOR TESTING)
-- ============================================
-- Use this to immediately show today's fact again
-- Good for: Testing, debugging, manual intervention

UPDATE profiles
SET
  daily_fact_dismissed = FALSE,
  updated_at = NOW()
WHERE id = 'ad5f79b7-10d8-49a2-aaff-22a8066d79b6'::uuid;

-- Verify the update
SELECT
  daily_fact_text,
  daily_fact_dismissed,
  daily_fact_collapsed
FROM profiles
WHERE id = 'ad5f79b7-10d8-49a2-aaff-22a8066d79b6'::uuid;


-- ============================================
-- SOLUTION B: FORCE REGENERATE NEW FACT
-- ============================================
-- This will reset the date, causing API to generate a fresh fact
-- Good for: Testing fact generation, getting new content

UPDATE profiles
SET
  daily_fact_dismissed = FALSE,
  daily_fact_date = NULL,  -- Force regeneration
  daily_fact_text = NULL,
  updated_at = NOW()
WHERE id = 'ad5f79b7-10d8-49a2-aaff-22a8066d79b6'::uuid;


-- ============================================
-- SOLUTION C: WAIT UNTIL TOMORROW
-- ============================================
-- The system is designed to auto-reset at midnight
-- When daily_fact_date != current date, API generates new fact
-- AND resets dismissed flag to FALSE (see line 97 in daily-fact-generator.ts)
-- Good for: Normal operation, no intervention needed

-- No SQL needed - system auto-resets daily
-- Next fact generation: 2025-10-22 00:00:00


-- ============================================
-- ADDITIONAL DIAGNOSTICS
-- ============================================

-- Check if user has completed lectures (required for fact generation)
SELECT COUNT(*) as completed_lectures
FROM jobs
WHERE user_id = 'ad5f79b7-10d8-49a2-aaff-22a8066d79b6'::uuid
  AND status = 'completed';

-- View recent lectures used for fact generation
SELECT
  job_id,
  lecture_title,
  course_subject,
  created_at
FROM jobs
WHERE user_id = 'ad5f79b7-10d8-49a2-aaff-22a8066d79b6'::uuid
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 10;

-- ============================================
-- EXPLANATION OF CURRENT BEHAVIOR
-- ============================================

/*
WHY IS THIS HAPPENING?

1. User clicked the X button on the daily fact box
2. This triggered `handleDismiss()` in NinjaFactBox.tsx (line 97-100)
3. PATCH request sent to /api/daily-fact with { dismissed: true }
4. Database updated: daily_fact_dismissed = TRUE
5. GET /api/daily-fact now returns { dismissed: true, fact: null } (line 92-99)
6. NinjaFactBox renders nothing when dismissed = true (line 114-116)

THIS IS EXPECTED BEHAVIOR! The user dismissed the fact for today.

AUTOMATIC RESET:
- Tomorrow (2025-10-22), when API checks:
  - daily_fact_date (2025-10-21) !== today (2025-10-22)
  - needsNewFact = TRUE (line 103-106 in route.ts)
  - generateDailyFact() is called
  - Line 97 in daily-fact-generator.ts sets: daily_fact_dismissed = FALSE
  - New fact appears automatically!

DESIGN INTENTION:
- User can dismiss fact once per day
- Cannot un-dismiss manually (by design)
- Fresh start each day
*/

-- ============================================
-- TESTING RECOMMENDATIONS
-- ============================================

/*
FOR QA TESTING:

Test Case 1: User dismisses fact
1. Load page with fact visible
2. Click X button
3. Verify fact disappears
4. Refresh page
5. Verify fact stays dismissed
6. Check DB: daily_fact_dismissed = TRUE

Test Case 2: Next day auto-reset
1. Manually set date to yesterday in DB
2. Refresh page
3. Verify new fact generates
4. Check DB: daily_fact_dismissed = FALSE

Test Case 3: Collapse/expand persists
1. Click minimize button
2. Refresh page
3. Verify fact stays minimized
4. Click ninja icon
5. Verify fact expands

Test Case 4: No lectures edge case
1. Create new user with no lectures
2. Check API response
3. Should show: "No completed lectures found. Upload some content first!"
*/
