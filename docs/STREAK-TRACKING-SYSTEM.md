# Study Streak Tracking System

## Overview

The Study Streak Tracking System encourages daily engagement by tracking consecutive days of quiz completion. This gamification feature motivates students to maintain consistent study habits.

**Key Features:**
- Daily streak counter displayed in TopBar
- Real-time updates via Supabase Realtime
- Grace period for missed days
- Personal best (longest streak) tracking
- Automatic calculation and persistence

---

## Streak Rules

### 1. **Completion Criteria**
- **Trigger:** Finishing all questions in a quiz (any score)
- **Non-trigger:** Generating a quiz, viewing content, partial completion

### 2. **Increment Logic**
- **+1 per day:** Completing multiple quizzes on the same day still counts as one day
- **Consecutive days:** Completing a quiz on Day N and Day N+1 increments the streak

### 3. **Grace Period**
- **1 missed day allowed:** Users can skip one day without losing their streak
- **Silent grace:** No notification when grace period is used
- **Example:** Quiz on Mon, skip Tue, quiz on Wed = streak maintained

### 4. **Reset Condition**
- **2+ missed days:** Streak resets to 1 (after grace period expires)
- **User notification:** Toast message informs user of reset
- **Fresh start:** Longest streak is preserved for motivation

### 5. **Longest Streak**
- **Automatic tracking:** System tracks the highest streak ever achieved
- **Never decreases:** Only updates when current streak exceeds previous best
- **Celebration toast:** Special notification when personal record is broken

---

## Architecture

### Database Schema

**Table:** `profiles`

**New Columns:**
```sql
study_streak     INTEGER  DEFAULT 0   -- Current consecutive days
last_quiz_date   DATE                 -- Last quiz completion date
longest_streak   INTEGER  DEFAULT 0   -- Personal best streak
```

**Indexes:**
```sql
idx_profiles_study_streak      -- For leaderboard queries (future)
idx_profiles_last_quiz_date    -- For streak calculation performance
```

**Migration File:** `migrations/020_add_streak_tracking.sql`

---

### API Endpoints

#### POST `/api/lectures/[jobId]/quizzes/complete`

**Purpose:** Track quiz completion and update user's study streak

**Request Body:**
```typescript
{
  quizId: string;         // Unique identifier for the quiz
  score: number;          // Points earned (0-N)
  total: number;          // Total points available
  completedAt: string;    // ISO timestamp (e.g., "2025-10-20T14:30:00Z")
}
```

**Success Response (200):**
```json
{
  "success": true,
  "streak": {
    "current": 5,                    // New streak value
    "previous": 4,                   // Streak before this quiz
    "increased": true,               // Whether streak went up
    "reset": false,                  // Whether streak was reset
    "longest": 7,                    // Personal best
    "longestStreakBroken": false,    // New record achieved
    "lastQuizDate": "2025-10-20"     // Date of this quiz
  },
  "quiz": {
    "id": "quiz-123",
    "score": 85,
    "total": 100,
    "completedAt": "2025-10-20T14:30:00Z"
  }
}
```

**Error Responses:**
- `401 Unauthorized` - User not authenticated
- `400 Bad Request` - Missing required fields
- `500 Internal Server Error` - Database or server error

**Implementation:** `/app/api/lectures/[jobId]/quizzes/complete/route.ts`

---

### Streak Calculation Algorithm

**Logic (pseudocode):**
```typescript
function calculateNewStreak(lastQuizDate, currentStreak) {
  const today = getCurrentDate();

  if (lastQuizDate === null) {
    // First quiz ever
    return { streak: 1, increased: true };
  }

  const daysSinceLastQuiz = daysBetween(lastQuizDate, today);

  if (daysSinceLastQuiz === 0) {
    // Same day - no change
    return { streak: currentStreak, increased: false };
  }

  if (daysSinceLastQuiz === 1) {
    // Consecutive day - increment
    return { streak: currentStreak + 1, increased: true };
  }

  if (daysSinceLastQuiz === 2) {
    // Grace period (1 missed day) - maintain
    return { streak: currentStreak, increased: false };
  }

  // 2+ missed days - reset
  return { streak: 1, increased: false, reset: true };
}
```

**Date Handling:**
- Uses local date (YYYY-MM-DD format)
- Timezone-aware to prevent edge cases
- Comparison based on calendar days, not 24-hour periods

---

## Frontend Integration

### QuestionsTab Component

**File:** `components/student-desk-v2/tabs/QuestionsTab.tsx`

**Integration Point:** `handleSubmitQuiz` function

**Flow:**
1. User completes quiz → calculates score
2. Calls `trackQuizCompletion(quizId, score, total)`
3. API updates database and returns streak data
4. Toast notification shows streak update (if applicable)

**Toast Messages:**
- **Streak increased:** "🔥 Streak Updated! X day streak! Keep it up!"
- **Streak reset:** "🔄 Streak Reset - Starting fresh with a 1 day streak. Keep going!"
- **Personal best:** "🎉 New Personal Best! X day streak - your longest yet!"
- **Same day:** No toast (silent)

---

### TopBar Component

**File:** `components/layout/TopBar.tsx`

**Display Logic:**
1. **On mount:** Fetch current streak from `profiles` table
2. **Real-time updates:** Subscribe to Supabase changes
3. **Prop override:** Accept `streakCount` prop for testing

**Supabase Realtime:**
```typescript
supabase
  .channel('streak-updates')
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'profiles',
    filter: `id=eq.${userId}`
  }, (payload) => {
    setDisplayStreak(payload.new.study_streak);
  })
  .subscribe();
```

**UI Display:**
- Fire emoji icon (`/images/fire.png`)
- Bold number (e.g., "5")
- Accessible label: "5 day study streak"

---

## User Experience

### Visual Feedback

**TopBar Streak Counter:**
- Always visible across all pages
- Updates in real-time (no refresh needed)
- Motivational visual cue (fire icon)

**Quiz Completion Toasts:**
- **Increased:** Green/success theme with fire emoji
- **Reset:** Neutral theme with reset emoji
- **Personal best:** Celebratory theme with party emoji
- **Silent:** Same day completions (avoid notification fatigue)

### Edge Cases Handled

1. **First quiz ever:** Initializes streak to 1
2. **Null database values:** Defaults to 0, then 1 on first completion
3. **Multiple quizzes/day:** Only first updates streak (idempotent)
4. **Grace period:** Transparent to user (no special notification)
5. **API failure:** Logged silently, doesn't disrupt quiz experience

---

## Testing

### Test Coverage

**See:** `tests/streak-tracking.test.md` for full test suite

**Critical Test Scenarios:**
1. ✅ First quiz ever → streak = 1
2. ✅ Consecutive day → +1 increment
3. ✅ Multiple same day → no change
4. ✅ Grace period (skip 1 day) → maintain
5. ✅ Reset (skip 2+ days) → reset to 1
6. ✅ Longest streak updates correctly
7. ✅ TopBar real-time sync
8. ✅ Error handling and graceful degradation

### Manual Testing Workflow

**Setup:**
1. Apply migration: `psql <db_url> -f migrations/020_add_streak_tracking.sql`
2. Verify columns exist: `\d profiles` in psql
3. Create test user and generate quiz

**Test 1 - Basic Flow:**
```bash
# Reset streak
UPDATE profiles SET study_streak = 0, last_quiz_date = NULL WHERE id = '<user_id>';

# Complete quiz in UI
# Expected: Streak = 1, toast shows "Streak Updated!"
```

**Test 2 - Consecutive Days:**
```bash
# Set yesterday's date
UPDATE profiles SET study_streak = 3, last_quiz_date = CURRENT_DATE - 1 WHERE id = '<user_id>';

# Complete quiz today
# Expected: Streak = 4, toast shows "4 day streak!"
```

**Test 3 - Grace Period:**
```bash
# Set 2 days ago (1 missed day)
UPDATE profiles SET study_streak = 5, last_quiz_date = CURRENT_DATE - 2 WHERE id = '<user_id>';

# Complete quiz today
# Expected: Streak = 5 (maintained), no toast
```

**Test 4 - Reset:**
```bash
# Set 3+ days ago (2+ missed days)
UPDATE profiles SET study_streak = 7, last_quiz_date = CURRENT_DATE - 3 WHERE id = '<user_id>';

# Complete quiz today
# Expected: Streak = 1, toast shows "Streak Reset"
```

---

## Troubleshooting

### Issue: Streak not updating

**Possible Causes:**
1. Migration not applied
2. API endpoint not being called
3. User not authenticated
4. Database permissions issue

**Debug Steps:**
```bash
# 1. Check migration
SELECT column_name FROM information_schema.columns
WHERE table_name = 'profiles' AND column_name = 'study_streak';

# 2. Check API logs
# Look for: "[Streak] User X: ..." logs in console

# 3. Check user profile
SELECT study_streak, last_quiz_date, longest_streak
FROM profiles WHERE id = '<user_id>';

# 4. Test API directly
curl -X POST http://localhost:3001/api/lectures/<jobId>/quizzes/complete \
  -H "Content-Type: application/json" \
  -d '{"quizId":"test","score":100,"total":100,"completedAt":"2025-10-20T12:00:00Z"}'
```

---

### Issue: TopBar shows 0 always

**Possible Causes:**
1. Supabase client import error
2. User not authenticated
3. Real-time subscription not set up

**Debug Steps:**
```javascript
// 1. Check browser console for errors
// Look for: "Error fetching streak" or "Error setting up realtime subscription"

// 2. Verify authentication
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user); // Should not be null

// 3. Test Supabase query manually
const { data } = await supabase
  .from('profiles')
  .select('study_streak')
  .eq('id', user.id)
  .single();
console.log('Profile:', data); // Should return streak value
```

---

### Issue: Real-time updates not working

**Possible Causes:**
1. Supabase Realtime not enabled
2. Channel subscription failed
3. RLS policies blocking updates

**Fix:**
```sql
-- 1. Enable Realtime on profiles table (Supabase Dashboard)
-- Settings → Database → Replication → Enable for "profiles"

-- 2. Check RLS policies allow SELECT
SELECT * FROM profiles WHERE id = auth.uid(); -- Should return data

-- 3. Verify subscription in browser console
// Look for successful subscription message
// supabase-js:realtime: SUBSCRIBED
```

---

### Issue: Grace period not working correctly

**Root Cause:** Date calculation timezone mismatch

**Fix:**
```typescript
// Ensure consistent timezone usage
const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD UTC

// In database, store DATE type (not TIMESTAMP)
// This avoids time-of-day confusion
```

---

## Performance Considerations

### Database Queries

**Per Quiz Completion:**
- 1 SELECT (fetch current streak)
- 1 UPDATE (update streak + date)
- Total: 2 queries

**Optimization:**
- Indexes on `study_streak` and `last_quiz_date` ensure fast lookups
- Single UPDATE statement (no transactions needed for this use case)

### Real-time Subscriptions

**Scalability:**
- Each user subscribes to own profile changes only
- Filter by `id=eq.{userId}` reduces broadcast load
- Supabase handles connection pooling

**Connection Management:**
- Component cleanup properly unsubscribes
- Avoids memory leaks and duplicate subscriptions

---

## Future Enhancements

### Potential Features (Not Implemented Yet)

1. **Leaderboard:**
   - Weekly/monthly top streaks
   - Query: `SELECT id, study_streak FROM profiles ORDER BY study_streak DESC LIMIT 10`

2. **Streak Milestones:**
   - Badges for 7, 30, 100, 365 day streaks
   - Store in `user_badges` table

3. **Streak Reminders:**
   - Daily notification if streak at risk
   - Email/push notification at end of day

4. **Freeze/Vacation Mode:**
   - Allow users to "freeze" streak for planned breaks
   - Store freeze dates in separate table

5. **Analytics:**
   - Track average streak length
   - Identify optimal study times for engagement

6. **Social Features:**
   - Share streak achievements with friends
   - Compete with study groups

---

## API Reference Summary

### Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/lectures/[jobId]/quizzes/complete` | Track quiz completion, update streak |

### Database Tables

| Table | Columns | Purpose |
|-------|---------|---------|
| profiles | `study_streak`, `last_quiz_date`, `longest_streak` | Store streak data |

### Frontend Components

| Component | File | Purpose |
|-----------|------|---------|
| TopBar | `components/layout/TopBar.tsx` | Display streak counter |
| QuestionsTab | `components/student-desk-v2/tabs/QuestionsTab.tsx` | Track completions |

---

## Migration Rollback

If needed, rollback the migration:

```sql
-- Remove indexes
DROP INDEX IF EXISTS idx_profiles_study_streak;
DROP INDEX IF EXISTS idx_profiles_last_quiz_date;

-- Remove columns
ALTER TABLE profiles DROP COLUMN IF EXISTS study_streak;
ALTER TABLE profiles DROP COLUMN IF EXISTS last_quiz_date;
ALTER TABLE profiles DROP COLUMN IF EXISTS longest_streak;
```

---

## Support & Maintenance

### Logging

**API Endpoint Logs:**
```
[Streak] User <id>: First quiz ever, starting streak at 1
[Streak] User <id>: Days since last quiz: 1, Current streak: 3
[Streak] User <id>: Consecutive day! Streak increased to 4
[Streak] User <id>: Grace period used, maintaining streak at 5
[Streak] User <id>: 2 days missed, streak reset to 1
[Streak] User <id>: Successfully updated - Current: X, Longest: Y
```

**Frontend Logs:**
```
Error fetching streak: <error details>
Error in fetchStreak: <error details>
Error setting up realtime subscription: <error details>
Failed to track quiz completion
Error tracking quiz completion: <error details>
```

### Monitoring Queries

**Check streak distribution:**
```sql
SELECT
  study_streak AS streak,
  COUNT(*) AS users
FROM profiles
WHERE study_streak > 0
GROUP BY study_streak
ORDER BY study_streak DESC;
```

**Find highest streaks:**
```sql
SELECT id, study_streak, longest_streak, last_quiz_date
FROM profiles
ORDER BY study_streak DESC
LIMIT 10;
```

**Identify stale streaks (potential data issues):**
```sql
SELECT id, study_streak, last_quiz_date
FROM profiles
WHERE study_streak > 0
  AND last_quiz_date < CURRENT_DATE - INTERVAL '7 days';
```

---

## Changelog

### v1.0.0 (2025-10-20)
- Initial implementation
- Basic streak tracking (0-day, consecutive, grace period, reset)
- TopBar integration with real-time updates
- QuestionsTab integration
- Toast notifications
- Database migration
- Comprehensive test suite
- Documentation

---

## Related Documentation

- [Quiz System Overview](./QUIZ-SYSTEM-OVERVIEW.md) *(if exists)*
- [Gamification Features](./GAMIFICATION-FEATURES.md) *(future)*
- [Testing Guide](../tests/streak-tracking.test.md)

---

**Last Updated:** 2025-10-20
**Maintained By:** QA Test Engineer
