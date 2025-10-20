# Study Streak Tracking - Quick Reference

## 🚀 Quick Start

### Apply Migration
```bash
psql $DATABASE_URL -f migrations/020_add_streak_tracking.sql
```

### Test Endpoint
```bash
curl -X POST http://localhost:3001/api/lectures/{jobId}/quizzes/complete \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "quizId": "test-quiz-id",
    "score": 85,
    "total": 100,
    "completedAt": "2025-10-20T14:30:00Z"
  }'
```

---

## 📊 Streak Rules Cheat Sheet

| Days Since Last Quiz | Streak Behavior | Example |
|----------------------|-----------------|---------|
| 0 (same day) | No change | Quiz 1: streak=5, Quiz 2: streak=5 |
| 1 (consecutive) | +1 increment | Day 1: streak=5, Day 2: streak=6 |
| 2 (grace period) | Maintain | Day 1: streak=5, Day 3: streak=5 |
| 3+ (missed 2+ days) | Reset to 1 | Day 1: streak=5, Day 5: streak=1 |

---

## 🗄️ Database Schema

```sql
-- New columns in profiles table
study_streak INTEGER DEFAULT 0    -- Current streak
last_quiz_date DATE               -- Last completion
longest_streak INTEGER DEFAULT 0  -- Personal best

-- Indexes
idx_profiles_study_streak         -- Performance
idx_profiles_last_quiz_date       -- Calculations
```

---

## 🔌 API Endpoint

**POST** `/api/lectures/[jobId]/quizzes/complete`

**Request:**
```json
{
  "quizId": "string",
  "score": 85,
  "total": 100,
  "completedAt": "2025-10-20T14:30:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "streak": {
    "current": 6,
    "previous": 5,
    "increased": true,
    "reset": false,
    "longest": 10,
    "longestStreakBroken": false
  }
}
```

---

## 🎨 Frontend Integration

### QuestionsTab (Quiz Completion)
```typescript
// After quiz submission
await trackQuizCompletion(quizId, score, total);

// Shows toasts:
// - 🔥 "X day streak! Keep it up!" (increased)
// - 🔄 "Starting fresh..." (reset)
// - 🎉 "New Personal Best!" (record broken)
```

### TopBar (Display)
```typescript
// Fetches on mount
const { data: profile } = await supabase
  .from('profiles')
  .select('study_streak')
  .single();

// Real-time subscription
supabase.channel('streak-updates')
  .on('postgres_changes', { table: 'profiles' })
  .subscribe();
```

---

## 🧪 Testing Commands

### Setup Test Data
```sql
-- First quiz ever
UPDATE profiles SET study_streak = 0, last_quiz_date = NULL WHERE id = '{user}';

-- Consecutive day test
UPDATE profiles SET study_streak = 3, last_quiz_date = CURRENT_DATE - 1 WHERE id = '{user}';

-- Grace period test
UPDATE profiles SET study_streak = 5, last_quiz_date = CURRENT_DATE - 2 WHERE id = '{user}';

-- Reset test
UPDATE profiles SET study_streak = 7, last_quiz_date = CURRENT_DATE - 3 WHERE id = '{user}';
```

### Verify Results
```sql
SELECT study_streak, last_quiz_date, longest_streak
FROM profiles WHERE id = '{user}';
```

---

## 🐛 Debugging

### Check Logs
```bash
# Server logs (look for these patterns)
grep "\[Streak\]" server.log

# Common log messages:
# [Streak] User X: First quiz ever, starting streak at 1
# [Streak] User X: Consecutive day! Streak increased to Y
# [Streak] User X: Grace period used, maintaining streak
# [Streak] User X: N days missed, streak reset to 1
```

### Browser Console
```javascript
// Check TopBar fetch
// Look for: "Error fetching streak" or "Error in fetchStreak"

// Check quiz completion
// Look for: "Failed to track quiz completion"
```

### Database Queries
```sql
-- Find users with active streaks
SELECT id, study_streak, last_quiz_date
FROM profiles WHERE study_streak > 0
ORDER BY study_streak DESC LIMIT 10;

-- Check for stale data (potential bugs)
SELECT COUNT(*) FROM profiles
WHERE study_streak > 0
  AND last_quiz_date < CURRENT_DATE - INTERVAL '7 days';
```

---

## 🔧 Common Fixes

### "Streak not updating"
```sql
-- 1. Check migration applied
\d profiles  -- Should show streak columns

-- 2. Check user exists
SELECT id FROM profiles WHERE email = 'user@example.com';

-- 3. Manually trigger update
UPDATE profiles SET
  study_streak = 1,
  last_quiz_date = CURRENT_DATE,
  longest_streak = 1
WHERE email = 'user@example.com';
```

### "TopBar shows 0"
```javascript
// 1. Check authentication
const { data: { user } } = await supabase.auth.getUser();
console.log(user); // Should not be null

// 2. Check RLS policies
// Go to Supabase Dashboard → Table Editor → profiles
// Verify SELECT policy allows: auth.uid() = id

// 3. Enable Realtime
// Go to Database → Replication → Enable "profiles"
```

---

## 📈 Monitoring

### Key Metrics
- **Streak update success rate:** >99%
- **API response time:** <200ms
- **Real-time errors:** <1%

### Health Check Query
```sql
-- Streak distribution (should be pyramid-shaped)
SELECT
  study_streak AS streak,
  COUNT(*) AS users
FROM profiles
WHERE study_streak > 0
GROUP BY study_streak
ORDER BY study_streak DESC
LIMIT 20;
```

---

## 🚨 Rollback

### Code Rollback
```bash
git revert <commit-hash>  # Revert streak tracking commits
npm run build
npm run deploy
```

### Database Rollback
```sql
DROP INDEX IF EXISTS idx_profiles_study_streak;
DROP INDEX IF EXISTS idx_profiles_last_quiz_date;
ALTER TABLE profiles DROP COLUMN IF EXISTS study_streak;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_quiz_date;
ALTER TABLE profiles DROP COLUMN IF EXISTS longest_streak;
```

---

## 📚 Full Documentation

- **System Overview:** `docs/STREAK-TRACKING-SYSTEM.md`
- **Test Suite:** `tests/streak-tracking.test.md`
- **Implementation Summary:** `docs/STREAK-IMPLEMENTATION-SUMMARY.md`

---

## 🎯 Files Changed

### Created
- `migrations/020_add_streak_tracking.sql`
- `app/api/lectures/[jobId]/quizzes/complete/route.ts`
- `tests/streak-tracking.test.md`
- `docs/STREAK-TRACKING-SYSTEM.md`

### Modified
- `components/student-desk-v2/tabs/QuestionsTab.tsx`
- `components/layout/TopBar.tsx`

---

**Need Help?** See full documentation at `docs/STREAK-TRACKING-SYSTEM.md`
