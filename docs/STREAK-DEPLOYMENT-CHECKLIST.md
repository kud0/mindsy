# Study Streak Tracking - Deployment Checklist

**Feature:** Daily Study Streak Tracking
**Version:** 1.0.0
**Date:** 2025-10-20

---

## Pre-Deployment Checklist

### Code Review
- [ ] All code reviewed by senior engineer
- [ ] TypeScript compilation succeeds (no errors)
- [ ] ESLint passes (no new errors)
- [ ] No console.log statements in production code
- [ ] Sensitive data not logged

### Testing
- [ ] All 14 test scenarios executed (see `tests/streak-tracking.test.md`)
- [ ] Edge cases verified (null values, concurrent completions)
- [ ] Regression tests passed (existing quiz features work)
- [ ] Manual testing on staging environment
- [ ] Real-time updates verified in browser

### Documentation
- [ ] System documentation complete (`STREAK-TRACKING-SYSTEM.md`)
- [ ] Quick reference created (`STREAK-QUICK-REFERENCE.md`)
- [ ] Implementation summary reviewed (`STREAK-IMPLEMENTATION-SUMMARY.md`)
- [ ] Rollback plan documented

### Database
- [ ] Migration script tested on staging database
- [ ] No syntax errors in SQL
- [ ] Indexes created successfully
- [ ] Column comments added
- [ ] Rollback script verified

---

## Deployment Steps

### Step 1: Backup Database
```bash
# Create backup before any changes
pg_dump $DATABASE_URL > backup_pre_streak_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_pre_streak_*.sql
```
**Checkpoint:** [ ] Backup created and verified

---

### Step 2: Apply Database Migration

**On Staging:**
```bash
# Apply migration to staging first
psql $STAGING_DATABASE_URL -f migrations/020_add_streak_tracking.sql

# Verify columns exist
psql $STAGING_DATABASE_URL -c "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'profiles' AND column_name LIKE '%streak%';"

# Expected output:
# study_streak    | integer
# last_quiz_date  | date
# longest_streak  | integer
```
**Checkpoint:** [ ] Migration applied successfully to staging

**On Production:**
```bash
# Apply to production
psql $DATABASE_URL -f migrations/020_add_streak_tracking.sql

# Verify
psql $DATABASE_URL -c "\d profiles" | grep streak
```
**Checkpoint:** [ ] Migration applied successfully to production

---

### Step 3: Deploy Code

**Build & Test:**
```bash
# Build production bundle
npm run build

# Check for build errors
echo $?  # Should be 0

# Check bundle size
ls -lh .next/static/

# Optional: Test production build locally
npm start
```
**Checkpoint:** [ ] Build successful, no errors

**Deploy:**
```bash
# Deploy to staging first
git push staging main

# Wait 2-3 minutes for deployment
# Check staging URL: https://staging.mindsy.app

# Deploy to production
git push production main

# Check production URL: https://mindsy.app
```
**Checkpoint:** [ ] Code deployed to production

---

### Step 4: Smoke Tests

**Test 1: API Endpoint**
```bash
# Get auth token
TOKEN=$(curl -X POST https://mindsy.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}' | jq -r '.token')

# Test streak endpoint
curl -X POST https://mindsy.app/api/lectures/test-job-id/quizzes/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "quizId": "smoke-test-quiz",
    "score": 100,
    "total": 100,
    "completedAt": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
  }'

# Expected: {"success": true, "streak": {...}}
```
**Checkpoint:** [ ] API endpoint responds correctly

**Test 2: TopBar Display**
1. [ ] Open https://mindsy.app/dashboard
2. [ ] Check TopBar shows streak number
3. [ ] Verify fire icon displays
4. [ ] Check value is not "NaN" or "undefined"

**Test 3: Quiz Completion Flow**
1. [ ] Navigate to a lecture with quizzes
2. [ ] Complete a quiz (answer all questions)
3. [ ] Submit quiz
4. [ ] Verify quiz results appear
5. [ ] Check for streak toast (may not appear if same day)
6. [ ] Verify TopBar updates (may take a few seconds)

**Checkpoint:** [ ] All smoke tests passed

---

### Step 5: Monitoring Setup

**Enable Logs:**
```bash
# Tail production logs
heroku logs --tail --app mindsy-production | grep "\[Streak\]"

# Or for other hosting:
pm2 logs --lines 100 | grep "\[Streak\]"
```

**Check for Expected Logs:**
- [ ] `[Streak] User X: First quiz ever, starting streak at 1`
- [ ] `[Streak] User X: Consecutive day! Streak increased to Y`
- [ ] No error logs related to streak tracking

**Database Monitoring:**
```sql
-- Check that streaks are being updated
SELECT
  COUNT(*) AS total_users_with_streak,
  AVG(study_streak) AS avg_streak,
  MAX(study_streak) AS max_streak
FROM profiles
WHERE study_streak > 0;

-- Run this query every hour for the first day
```
**Checkpoint:** [ ] Monitoring in place, logs show activity

---

### Step 6: Verify Real-time Updates

**Browser Test:**
1. [ ] Open dashboard in Chrome
2. [ ] Open browser console (F12)
3. [ ] Note current streak value in TopBar
4. [ ] Complete a quiz in another tab (or device)
5. [ ] Return to dashboard tab
6. [ ] Verify TopBar updates WITHOUT refresh
7. [ ] Check console for Supabase Realtime messages

**Checkpoint:** [ ] Real-time updates working

---

## Post-Deployment Monitoring (First 24 Hours)

### Hour 1
- [ ] Check error rates (should be <1%)
- [ ] Verify API response times (<200ms)
- [ ] Monitor database CPU/memory (no spikes)
- [ ] Check for user reports (support tickets)

### Hour 4
- [ ] Run database health check:
  ```sql
  SELECT study_streak, COUNT(*) FROM profiles
  WHERE study_streak > 0
  GROUP BY study_streak ORDER BY study_streak DESC;
  ```
- [ ] Verify distribution looks normal (pyramid shape)
- [ ] Check for any stale streaks (should be none)

### Hour 24
- [ ] Review all logs for errors
- [ ] Check user engagement (are people completing quizzes?)
- [ ] Verify longest_streak is updating correctly
- [ ] Run full test suite again to ensure stability

**Checkpoint:** [ ] 24-hour monitoring complete, no issues

---

## Rollback Plan

**If Critical Issues Occur:**

### Quick Rollback (Code Only)
```bash
# Revert to previous commit
git revert HEAD~2  # Adjust number as needed
git push production main

# Wait for deployment
# Verify old behavior restored
```

**Time:** 5-10 minutes
**Impact:** Streak tracking stops, but no data loss

### Full Rollback (Code + Database)
```bash
# 1. Revert code (as above)

# 2. Rollback database
psql $DATABASE_URL <<EOF
DROP INDEX IF EXISTS idx_profiles_study_streak;
DROP INDEX IF EXISTS idx_profiles_last_quiz_date;
ALTER TABLE profiles DROP COLUMN IF EXISTS study_streak;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_quiz_date;
ALTER TABLE profiles DROP COLUMN IF EXISTS longest_streak;
EOF

# 3. Verify rollback
psql $DATABASE_URL -c "\d profiles" | grep streak
# Expected: No output (columns removed)
```

**Time:** 10-15 minutes
**Impact:** All streak data lost (use only if critical bug)

---

## Success Criteria

### Technical Metrics
- [ ] API success rate >99%
- [ ] Response time <200ms (p95)
- [ ] Real-time subscription success >99%
- [ ] No database performance degradation

### User Experience
- [ ] No user-reported bugs (first 24 hours)
- [ ] Streak display accurate (verified by QA)
- [ ] Toast notifications appear correctly
- [ ] Real-time updates work smoothly

### Data Integrity
- [ ] No null/invalid streak values in database
- [ ] Longest streak always >= current streak
- [ ] last_quiz_date matches current date for active users

---

## Troubleshooting Common Issues

### Issue: High Error Rate (>5%)

**Investigate:**
```bash
# Check logs for specific errors
heroku logs --tail | grep -i "error.*streak"

# Check database connections
psql $DATABASE_URL -c "SELECT count(*) FROM pg_stat_activity;"
```

**Action:**
- If authentication errors: Check Supabase service role key
- If database errors: Check RLS policies
- If timeout errors: Check database performance
- If >10% errors: Consider rollback

---

### Issue: Streaks Not Updating

**Investigate:**
```sql
-- Check if migration applied
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'study_streak';

-- Check recent updates
SELECT id, study_streak, last_quiz_date, updated_at
FROM profiles
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC LIMIT 10;
```

**Action:**
- If no columns: Re-apply migration
- If no updates: Check API logs for errors
- If updates incorrect: Review streak calculation logic

---

### Issue: TopBar Shows 0 for All Users

**Investigate:**
```javascript
// In browser console
const { createClient } = await import('@/lib/supabase/client');
const supabase = createClient();
const { data, error } = await supabase.from('profiles').select('study_streak').single();
console.log(data, error);
```

**Action:**
- If error "no rows": User not in profiles table
- If error "permission denied": Check RLS policies
- If data null: Migration not applied
- If Supabase error: Check API keys

---

## Sign-off

### Pre-Deployment
- [ ] **Developer:** Code complete and tested
- [ ] **QA Engineer:** All tests passed
- [ ] **Tech Lead:** Code reviewed and approved
- [ ] **DevOps:** Infrastructure ready

### Post-Deployment
- [ ] **Developer:** Smoke tests passed
- [ ] **QA Engineer:** Production testing complete
- [ ] **Tech Lead:** Monitoring confirmed
- [ ] **Product Manager:** Feature live and working

---

## Deployment Log

**Staging Deployment:**
- Date/Time: ________________
- Deployed By: ________________
- Migration Applied: [ ] Yes [ ] No
- Tests Passed: [ ] Yes [ ] No
- Issues: ________________

**Production Deployment:**
- Date/Time: ________________
- Deployed By: ________________
- Migration Applied: [ ] Yes [ ] No
- Smoke Tests: [ ] Pass [ ] Fail
- Rollback Needed: [ ] Yes [ ] No
- Notes: ________________

---

## Contact Information

**On-Call Engineer:** ________________
**Phone:** ________________
**Slack Channel:** #mindsy-deployments
**Escalation:** ________________

---

**Deployment Status:** [ ] Not Started [ ] In Progress [ ] Complete [ ] Rolled Back

**Final Sign-off:** ________________ (Name, Date)
