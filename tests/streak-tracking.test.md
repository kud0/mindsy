# Streak Tracking System - Test Suite

## Test Environment Setup

Before running tests, ensure:
1. Database migration `020_add_streak_tracking.sql` has been applied
2. Test user account exists in the system
3. Test lecture with generated quizzes is available

## Test Scenarios

### Test 1: First Quiz Ever

**Scenario:** User completes their first quiz
**Expected Result:** Streak = 1

**Steps:**
1. Reset user profile: `UPDATE profiles SET study_streak = 0, last_quiz_date = NULL, longest_streak = 0 WHERE id = '<user_id>';`
2. Complete a quiz via the QuestionsTab
3. Verify response from `/api/lectures/[jobId]/quizzes/complete`

**Expected Response:**
```json
{
  "success": true,
  "streak": {
    "current": 1,
    "previous": 0,
    "increased": true,
    "reset": false,
    "longest": 1,
    "longestStreakBroken": true,
    "lastQuizDate": "2025-10-20"
  }
}
```

**Verification:**
```sql
SELECT study_streak, last_quiz_date, longest_streak
FROM profiles
WHERE id = '<user_id>';
-- Expected: study_streak = 1, last_quiz_date = today, longest_streak = 1
```

---

### Test 2: Consecutive Day Completion

**Scenario:** User completes quiz on consecutive days
**Expected Result:** Streak increments by 1

**Steps:**
1. Set initial state:
   ```sql
   UPDATE profiles
   SET study_streak = 3,
       last_quiz_date = CURRENT_DATE - INTERVAL '1 day',
       longest_streak = 3
   WHERE id = '<user_id>';
   ```
2. Complete a quiz today
3. Verify streak increases to 4

**Expected Response:**
```json
{
  "success": true,
  "streak": {
    "current": 4,
    "previous": 3,
    "increased": true,
    "reset": false,
    "longest": 4,
    "longestStreakBroken": true
  }
}
```

**UI Verification:**
- Toast notification shows: "🔥 Streak Updated! 4 day streak! Keep it up!"
- TopBar updates to show 4

---

### Test 3: Multiple Quizzes Same Day

**Scenario:** User completes 2+ quizzes on the same day
**Expected Result:** Streak stays the same

**Steps:**
1. Set initial state:
   ```sql
   UPDATE profiles
   SET study_streak = 5,
       last_quiz_date = CURRENT_DATE,
       longest_streak = 5
   WHERE id = '<user_id>';
   ```
2. Complete first quiz (streak should stay at 5)
3. Complete second quiz (streak should still be 5)

**Expected Response (both times):**
```json
{
  "success": true,
  "streak": {
    "current": 5,
    "previous": 5,
    "increased": false,
    "reset": false,
    "longest": 5,
    "longestStreakBroken": false
  }
}
```

**UI Verification:**
- No streak update toast shown
- TopBar still shows 5

---

### Test 4: Grace Period (Skip 1 Day)

**Scenario:** User skips 1 day, completes quiz on day 3
**Expected Result:** Streak maintains (grace period)

**Steps:**
1. Set initial state (quiz completed 2 days ago):
   ```sql
   UPDATE profiles
   SET study_streak = 7,
       last_quiz_date = CURRENT_DATE - INTERVAL '2 days',
       longest_streak = 10
   WHERE id = '<user_id>';
   ```
2. Complete a quiz today
3. Verify streak stays at 7 (grace period used)

**Expected Response:**
```json
{
  "success": true,
  "streak": {
    "current": 7,
    "previous": 7,
    "increased": false,
    "reset": false,
    "longest": 10,
    "longestStreakBroken": false
  }
}
```

**UI Verification:**
- No special toast (grace period silent)
- TopBar shows 7

---

### Test 5: Streak Reset (Skip 2+ Days)

**Scenario:** User skips 2 or more days
**Expected Result:** Streak resets to 1

**Steps:**
1. Set initial state (quiz completed 3 days ago):
   ```sql
   UPDATE profiles
   SET study_streak = 12,
       last_quiz_date = CURRENT_DATE - INTERVAL '3 days',
       longest_streak = 12
   WHERE id = '<user_id>';
   ```
2. Complete a quiz today
3. Verify streak resets to 1

**Expected Response:**
```json
{
  "success": true,
  "streak": {
    "current": 1,
    "previous": 12,
    "increased": false,
    "reset": true,
    "longest": 12,
    "longestStreakBroken": false
  }
}
```

**UI Verification:**
- Toast shows: "🔄 Streak Reset - Starting fresh with a 1 day streak. Keep going!"
- TopBar updates to 1

---

### Test 6: Longest Streak Update

**Scenario:** User breaks their personal record
**Expected Result:** longest_streak updates

**Steps:**
1. Set initial state:
   ```sql
   UPDATE profiles
   SET study_streak = 9,
       last_quiz_date = CURRENT_DATE - INTERVAL '1 day',
       longest_streak = 9
   WHERE id = '<user_id>';
   ```
2. Complete quiz to reach streak of 10
3. Verify longest_streak = 10

**Expected Response:**
```json
{
  "success": true,
  "streak": {
    "current": 10,
    "previous": 9,
    "increased": true,
    "reset": false,
    "longest": 10,
    "longestStreakBroken": true
  }
}
```

**UI Verification:**
- Toast shows: "🎉 New Personal Best! 10 day streak - your longest yet!"
- TopBar updates to 10

---

### Test 7: TopBar Real-Time Updates

**Scenario:** Verify TopBar displays correct value and updates in real-time
**Expected Result:** Streak value syncs across tabs/components

**Steps:**
1. Open dashboard in browser tab
2. Note current streak value in TopBar
3. Complete a quiz in QuestionsTab
4. Verify TopBar updates without page refresh (Supabase Realtime)

**Manual Verification:**
- Check browser console for logs: `[Streak] User X: Consecutive day! Streak increased to Y`
- Verify no errors in network tab
- Confirm TopBar shows updated value immediately

---

### Test 8: API Error Handling

**Scenario:** Test robustness when API fails
**Expected Result:** User experience unaffected, error logged

**Steps:**
1. Temporarily break the API (e.g., invalid Supabase credentials)
2. Complete a quiz
3. Verify quiz submission succeeds but streak tracking fails gracefully

**Expected Behavior:**
- Quiz results still display
- No error toast shown to user
- Console logs error: "Failed to track quiz completion"
- User can continue using app normally

---

### Test 9: Edge Case - Null Values

**Scenario:** User profile has null values for streak columns
**Expected Result:** System handles gracefully

**Steps:**
1. Set null values:
   ```sql
   UPDATE profiles
   SET study_streak = NULL,
       last_quiz_date = NULL,
       longest_streak = NULL
   WHERE id = '<user_id>';
   ```
2. Complete a quiz
3. Verify defaults apply (0 or 1 as appropriate)

**Expected Response:**
```json
{
  "success": true,
  "streak": {
    "current": 1,
    "previous": 0,
    "increased": true,
    "reset": false,
    "longest": 1,
    "longestStreakBroken": true
  }
}
```

---

### Test 10: Database Migration Verification

**Scenario:** Verify migration applied correctly
**Expected Result:** All columns exist with proper types and indexes

**SQL Checks:**
```sql
-- Check columns exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN ('study_streak', 'last_quiz_date', 'longest_streak');

-- Expected output:
-- study_streak    | integer | YES | 0
-- last_quiz_date  | date    | YES | NULL
-- longest_streak  | integer | YES | 0

-- Check indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'profiles'
AND indexname LIKE '%streak%';

-- Expected:
-- idx_profiles_study_streak
-- idx_profiles_last_quiz_date

-- Check column comments
SELECT
    col_description('profiles'::regclass, attnum) AS description,
    attname AS column_name
FROM pg_attribute
WHERE attrelid = 'profiles'::regclass
AND attname IN ('study_streak', 'last_quiz_date', 'longest_streak');
```

---

## Performance Tests

### Test 11: Concurrent Quiz Completions

**Scenario:** Multiple users complete quizzes simultaneously
**Expected Result:** No race conditions or data corruption

**Steps:**
1. Create 3 test users
2. Have all 3 complete quizzes at the same time
3. Verify each user's streak updated independently

**Verification:**
```sql
SELECT id, study_streak, last_quiz_date, longest_streak
FROM profiles
WHERE id IN ('<user1>', '<user2>', '<user3>');
```

---

### Test 12: Large Streak Values

**Scenario:** Test with extreme streak values
**Expected Result:** System handles large numbers correctly

**Steps:**
1. Set streak to 365 days
2. Complete quiz to increment to 366
3. Verify no overflow or display issues

**Manual Verification:**
- TopBar displays "366" correctly (no truncation)
- Database stores value as integer (not exceeding limits)

---

## Regression Tests

### Test 13: Existing Quiz Functionality

**Scenario:** Ensure streak tracking doesn't break quiz core features
**Expected Result:** All quiz features work as before

**Checklist:**
- [ ] Quiz generation still works
- [ ] Question display renders correctly
- [ ] Answer submission calculates score properly
- [ ] Results screen shows accurate percentage
- [ ] Toast notifications for quiz results appear
- [ ] Multiple quiz types (MC, T/F, Fill) all work

---

### Test 14: Backward Compatibility

**Scenario:** Verify old profiles without streak data work
**Expected Result:** Migration sets defaults, no errors occur

**Steps:**
1. Find/create profile created before migration
2. Complete a quiz
3. Verify streak initializes to 1 (not error)

---

## Summary Checklist

Run all tests and mark complete:

- [ ] Test 1: First quiz ever → streak = 1
- [ ] Test 2: Consecutive day → streak increments
- [ ] Test 3: Multiple quizzes same day → no change
- [ ] Test 4: Grace period (skip 1 day) → maintains
- [ ] Test 5: Skip 2+ days → reset to 1
- [ ] Test 6: Longest streak updates correctly
- [ ] Test 7: TopBar real-time updates work
- [ ] Test 8: API errors handled gracefully
- [ ] Test 9: Null values handled correctly
- [ ] Test 10: Migration verified in database
- [ ] Test 11: Concurrent completions work
- [ ] Test 12: Large streak values supported
- [ ] Test 13: Existing quiz features unaffected
- [ ] Test 14: Backward compatibility maintained

---

## Test Execution Log

**Date:** ___________
**Tester:** ___________
**Environment:** Development / Staging / Production

| Test # | Status | Notes |
|--------|--------|-------|
| 1      | [ ]    |       |
| 2      | [ ]    |       |
| 3      | [ ]    |       |
| 4      | [ ]    |       |
| 5      | [ ]    |       |
| 6      | [ ]    |       |
| 7      | [ ]    |       |
| 8      | [ ]    |       |
| 9      | [ ]    |       |
| 10     | [ ]    |       |
| 11     | [ ]    |       |
| 12     | [ ]    |       |
| 13     | [ ]    |       |
| 14     | [ ]    |       |

**Issues Found:**
-

**Overall Result:** PASS / FAIL
