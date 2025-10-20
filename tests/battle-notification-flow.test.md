# Battle Notification Flow - Test Plan

**Test Date:** 2025-10-20
**Tester:** QA Test Engineer
**Components Under Test:**
- `components/battles/BattleArena.tsx`
- `components/battles/NextRoundReady.tsx`
- `app/api/battles/[battleId]/submit-round/route.ts`

---

## Test Environment Setup

### Prerequisites
1. Two test user accounts:
   - **User A** (Player 1): test-player1@example.com
   - **User B** (Player 2): test-player2@example.com
2. Users are friends (mutual connection)
3. User A has a folder with lecture content
4. Database migration 019 has been applied
5. Supabase Realtime is enabled

### Setup Steps
```bash
# 1. Apply migration
psql $DATABASE_URL -f migrations/019_add_battle_turn_notifications.sql

# 2. Verify notification types
psql $DATABASE_URL -c "SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE constraint_name = 'notifications_type_check';"

# 3. Check realtime is enabled
# Supabase Dashboard → Database → Replication
# Ensure: quiz_battles, battle_rounds, battle_participants are enabled

# 4. Start development server
npm run dev
```

---

## Test Suite 1: React State Update Fix

### Test 1.1: NextRoundReady Component Renders Without Error

**Steps:**
1. Log in as User A
2. Create battle with User B
3. User B accepts battle
4. Both users complete Round 1
5. Both users click "Continue" to see NextRoundReady screen

**Expected Results:**
- ✅ NextRoundReady screen displays
- ✅ No React errors in console
- ✅ Timer counts down: "Auto-starting in 10 seconds..."
- ✅ Score comparison shows correctly
- ✅ "Start Round 2" button is visible

**Console Check:**
```
❌ Should NOT see:
"Cannot update a component (BattleArena) while rendering a different component"

✅ Should see:
Normal render logs, no errors
```

**Pass Criteria:** No React state update errors

---

### Test 1.2: Auto-Advance Timer Works

**Steps:**
1. Wait on NextRoundReady screen without clicking
2. Observe countdown timer
3. Wait for timer to reach 0

**Expected Results:**
- ✅ Timer counts down: 10 → 9 → 8 → ... → 1 → 0
- ✅ At 0, automatically transitions to Round 2
- ✅ Round 2 questions display
- ✅ No errors or crashes
- ✅ Timer stops after triggering

**Pass Criteria:** Smooth auto-advance after 10 seconds

---

### Test 1.3: Manual Button Click Works

**Steps:**
1. See NextRoundReady screen
2. Immediately click "Start Round 2" button
3. Do not wait for timer

**Expected Results:**
- ✅ Instantly transitions to Round 2
- ✅ Timer stops counting
- ✅ No delay
- ✅ Round 2 questions display
- ✅ No duplicate calls

**Pass Criteria:** Immediate transition without waiting for timer

---

### Test 1.4: No Double-Triggering

**Steps:**
1. See NextRoundReady screen
2. Rapidly click "Start Round 2" button multiple times
3. Observe console logs

**Expected Results:**
- ✅ `handleNextRound` called only once
- ✅ No duplicate state updates
- ✅ Single transition to Round 2
- ✅ Console shows only one fetch call

**Console Check:**
```
✅ Should see (once):
"🎮 [BattleArena] handleNextRound called"

❌ Should NOT see (multiple times):
"🎮 [BattleArena] handleNextRound called"
"🎮 [BattleArena] handleNextRound called"
```

**Pass Criteria:** Single execution despite multiple clicks

---

## Test Suite 2: Notification Flow

### Test 2.1: Player 1 Submits → Player 2 Gets Notification

**Setup:**
- User A (Player 1) and User B (Player 2) in active battle
- Both on Round 1, no submissions yet

**Steps:**
1. **User A:** Answer all 5 questions
2. **User A:** Click "Submit Round"
3. **User B:** Check notifications (header bell icon)

**Expected Results:**
- ✅ User A sees "Round submitted!" toast
- ✅ User A sees "Waiting for opponent..." screen
- ✅ User B receives notification:
  - Type: `battle_turn`
  - Title: "Your turn in Quiz Battle!"
  - Message: "User A completed Round 1. It's your turn to play!"
  - Unread badge appears in header
- ✅ Notification links to `/dashboard/battles/{battleId}`

**Database Check:**
```sql
SELECT
  user_id,
  type,
  title,
  message,
  metadata->>'battle_id' as battle_id,
  metadata->>'round_number' as round,
  read,
  created_at
FROM notifications
WHERE type = 'battle_turn'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output:**
```
user_id: {User B's ID}
type: battle_turn
title: Your turn in Quiz Battle!
message: User A completed Round 1. It's your turn to play!
battle_id: {battleId}
round: 1
read: false
```

**Pass Criteria:** Notification created and visible to User B

---

### Test 2.2: Player 2 Submits → Both Get Round Ready Notification

**Setup:**
- User A submitted Round 1
- User B about to submit Round 1

**Steps:**
1. **User B:** Answer all 5 questions
2. **User B:** Click "Submit Round"
3. **Both users:** Check notifications

**Expected Results:**
- ✅ User B sees "Round submitted!" toast
- ✅ Both users receive notification:
  - Type: `battle_round_ready`
  - Title: "Next Round Ready!"
  - Message: "Round 2 is now available in your battle with [opponent]"
- ✅ Both users can click notification to go to battle
- ✅ Both users see NextRoundReady screen

**Database Check:**
```sql
SELECT
  user_id,
  type,
  title,
  message,
  metadata->>'round_number' as next_round
FROM notifications
WHERE type = 'battle_round_ready'
  AND metadata->>'battle_id' = '{battleId}'
ORDER BY created_at DESC
LIMIT 2;
```

**Expected Output:**
```
Two rows:
1. user_id: {User A's ID}, round: 2
2. user_id: {User B's ID}, round: 2
```

**Pass Criteria:** Both users notified when round becomes available

---

### Test 2.3: Realtime Update - Opponent Submits While Waiting

**Setup:**
- User A submitted Round 1
- User A still on "Waiting for opponent..." screen
- User B about to submit

**Steps:**
1. **User A:** Stay on waiting screen, do NOT refresh
2. **User B:** Submit Round 1 answers
3. **User A:** Observe screen (no manual action)

**Expected Results:**
- ✅ User A sees toast notification: "Opponent submitted their answers!"
- ✅ User A's screen automatically transitions to NextRoundReady
- ✅ No manual refresh needed
- ✅ Transition happens within 1-2 seconds

**Console Check (User A):**
```
✅ Should see:
"🔌 [BattleArena] Realtime subscription status: SUBSCRIBED"
"🔔 [BattleArena] Realtime: New battle_participant submission detected"
"✅ [BattleArena] Opponent finished! Transitioning to next round ready"
```

**Pass Criteria:** Automatic transition via realtime subscription

---

### Test 2.4: Realtime Update - New Round Created

**Setup:**
- User A just submitted Round 1
- User B about to submit Round 1 (last submission triggers Round 2 creation)

**Steps:**
1. **User A:** On NextRoundReady screen (or results)
2. **User B:** Submit Round 1
3. **User A:** Observe screen

**Expected Results:**
- ✅ User A sees toast: "Next round is ready!"
- ✅ Battle data refetches automatically
- ✅ Round 2 questions become available
- ✅ No manual refresh needed

**Console Check (User A):**
```
✅ Should see:
"🔔 [BattleArena] Realtime: New round created"
"📥 [BattleArena] API Response: roundsCount: 2"
```

**Pass Criteria:** Realtime detection of new round

---

### Test 2.5: Fallback Polling When Realtime Fails

**Setup:**
- Simulate realtime failure (disconnect network briefly)

**Steps:**
1. **User A:** Open DevTools → Network tab
2. **User A:** Set network to "Offline" for 3 seconds
3. **User B:** Submit round during offline period
4. **User A:** Set network back to "Online"

**Expected Results:**
- ✅ Realtime subscription disconnects (expected)
- ✅ Fallback polling kicks in (every 5 seconds)
- ✅ Within 5 seconds, User A sees update
- ✅ Toast notification appears
- ✅ Transition to next state

**Console Check (User A):**
```
✅ Should see:
"🔄 [BattleArena] Polling for opponent submission (fallback)..."
"🔄 [BattleArena] Poll result: bothSubmitted: true"
```

**Pass Criteria:** System works without realtime (degraded, but functional)

---

### Test 2.6: Final Round Completion Notifications

**Setup:**
- Battle with 3 rounds
- User A and User B on Round 3 (final)

**Steps:**
1. **User A:** Submit Round 3
2. **User B:** Submit Round 3
3. **Both users:** Check notifications

**Expected Results:**
- ✅ Battle status changes to `completed`
- ✅ Winner determined
- ✅ Both users receive notification:
  - Type: `battle_result`
  - Title: "Battle Completed!"
  - Message: "[Winner Name] won the battle!" or "It's a draw!"
- ✅ Notification links to results page
- ✅ Stats updated in `battle_stats` table

**Database Check:**
```sql
-- Check battle completion
SELECT id, status, winner_id, completed_at
FROM quiz_battles
WHERE id = '{battleId}';

-- Check result notifications
SELECT user_id, type, title, message
FROM notifications
WHERE type = 'battle_result'
  AND metadata->>'battle_id' = '{battleId}'
ORDER BY created_at DESC;
```

**Pass Criteria:** Battle completes, notifications sent, stats updated

---

## Test Suite 3: Edge Cases

### Test 3.1: Notification Deduplication

**Steps:**
1. User A submits Round 1
2. Check User B's notifications
3. User A's submission triggers API again (shouldn't happen, but test)

**Expected Results:**
- ✅ Only ONE `battle_turn` notification for User B
- ✅ No duplicate notifications

**Database Check:**
```sql
SELECT COUNT(*) as notification_count
FROM notifications
WHERE user_id = '{User B ID}'
  AND type = 'battle_turn'
  AND metadata->>'battle_id' = '{battleId}'
  AND metadata->>'round_number' = '1';
```

**Expected:** `notification_count = 1`

**Pass Criteria:** No duplicate notifications

---

### Test 3.2: Cancelled Battle No Notifications

**Steps:**
1. User A creates battle with User B
2. User B declines battle (sets status to `cancelled`)
3. Check notifications

**Expected Results:**
- ✅ User B receives initial challenge notification (type: `battle_challenge`)
- ✅ NO `battle_turn` or `battle_round_ready` notifications
- ✅ Battle status is `cancelled`

**Pass Criteria:** No turn notifications for cancelled battles

---

### Test 3.3: Component Cleanup (Memory Leak Prevention)

**Steps:**
1. User A enters battle page
2. Observe realtime subscription connects
3. User A navigates away (click back button)
4. Check console logs

**Expected Results:**
- ✅ Console shows: "🔌 [BattleArena] Cleaning up Realtime subscription"
- ✅ Supabase channel removed
- ✅ No memory leaks
- ✅ Timers cleared

**Console Check:**
```
✅ Should see:
"🔌 [BattleArena] Cleaning up Realtime subscription"

❌ Should NOT see after leaving page:
"🔔 [BattleArena] Realtime: ..." (any realtime events)
```

**Pass Criteria:** Proper cleanup on component unmount

---

### Test 3.4: Offline User - Notification Persistence

**Steps:**
1. **User B:** Close browser/go offline
2. **User A:** Submit Round 1
3. **User B:** Come back online 1 hour later

**Expected Results:**
- ✅ Notification created in database while User B offline
- ✅ When User B logs in, notification appears
- ✅ Notification is marked unread
- ✅ User B can click notification and go to battle

**Database Check:**
```sql
SELECT
  user_id,
  type,
  message,
  read,
  created_at
FROM notifications
WHERE user_id = '{User B ID}'
  AND type = 'battle_turn'
ORDER BY created_at DESC
LIMIT 1;
```

**Expected:** `read = false`, notification exists

**Pass Criteria:** Notifications persist for offline users

---

## Test Suite 4: Performance & Load

### Test 4.1: Reduced API Calls (Realtime vs Polling)

**Setup:**
- Monitor network traffic

**Test A: Without Realtime (Polling Only)**
1. Disable realtime subscription
2. Wait 1 minute on waiting screen
3. Count API calls

**Expected:** ~20 calls (polling every 3 seconds)

**Test B: With Realtime (Current Implementation)**
1. Enable realtime subscription
2. Wait 1 minute on waiting screen
3. Count API calls

**Expected:** ~12 calls (fallback polling every 5 seconds, but realtime handles updates)

**Pass Criteria:** At least 40% reduction in API calls with realtime

---

### Test 4.2: Multiple Concurrent Battles

**Steps:**
1. Create 5 battles between different user pairs
2. All users submit rounds at same time
3. Check notification delivery

**Expected Results:**
- ✅ All notifications delivered correctly
- ✅ No notification mix-ups (correct recipient)
- ✅ No database deadlocks
- ✅ Realtime subscriptions work for all battles

**Pass Criteria:** System handles concurrent battles without errors

---

## Test Results Summary

| Test ID | Test Name | Status | Notes |
|---------|-----------|--------|-------|
| 1.1 | NextRoundReady renders | ⬜ Pending | |
| 1.2 | Auto-advance timer | ⬜ Pending | |
| 1.3 | Manual button click | ⬜ Pending | |
| 1.4 | No double-triggering | ⬜ Pending | |
| 2.1 | P1 submits → P2 notified | ⬜ Pending | |
| 2.2 | Both submit → round ready | ⬜ Pending | |
| 2.3 | Realtime opponent submit | ⬜ Pending | |
| 2.4 | Realtime new round | ⬜ Pending | |
| 2.5 | Fallback polling | ⬜ Pending | |
| 2.6 | Final round completion | ⬜ Pending | |
| 3.1 | No duplicate notifications | ⬜ Pending | |
| 3.2 | Cancelled battle | ⬜ Pending | |
| 3.3 | Component cleanup | ⬜ Pending | |
| 3.4 | Offline user persistence | ⬜ Pending | |
| 4.1 | Reduced API calls | ⬜ Pending | |
| 4.2 | Concurrent battles | ⬜ Pending | |

**Legend:**
- ⬜ Pending - Not yet tested
- ✅ Pass - Test passed
- ❌ Fail - Test failed
- ⚠️ Warning - Partial pass with issues

---

## Automated Test Script (Optional)

```typescript
// tests/battle-notifications.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Battle Notification Flow', () => {
  test('Player 1 submits → Player 2 gets notification', async ({ page, context }) => {
    // Test implementation
    // 1. Login as Player 1
    // 2. Submit round
    // 3. Open new page as Player 2
    // 4. Check notification badge
    // 5. Assert notification content
  });

  test('Realtime updates work', async ({ page }) => {
    // Test implementation
    // 1. Open battle page
    // 2. Wait for realtime subscription
    // 3. Trigger opponent submission via API
    // 4. Assert toast appears
    // 5. Assert screen transitions
  });
});
```

---

## Debugging Tips

### If Realtime Doesn't Work

1. **Check Supabase Realtime is enabled:**
   ```
   Supabase Dashboard → Settings → API → Realtime
   Ensure: Enabled = true
   ```

2. **Check table replication:**
   ```
   Supabase Dashboard → Database → Replication
   Ensure tables are published: quiz_battles, battle_rounds, battle_participants
   ```

3. **Check browser console:**
   ```
   Should see: "🔌 [BattleArena] Realtime subscription status: SUBSCRIBED"
   Should NOT see: "CHANNEL_ERROR" or "TIMED_OUT"
   ```

4. **Test realtime manually:**
   ```typescript
   const supabase = createClient();
   const channel = supabase
     .channel('test')
     .on('postgres_changes', { event: '*', schema: 'public', table: 'quiz_battles' }, (payload) => {
       console.log('Realtime works:', payload);
     })
     .subscribe();
   ```

### If Notifications Don't Appear

1. **Check notification was created:**
   ```sql
   SELECT * FROM notifications
   WHERE user_id = '{userId}'
   ORDER BY created_at DESC
   LIMIT 5;
   ```

2. **Check notification type is valid:**
   ```sql
   SELECT constraint_name, check_clause
   FROM information_schema.check_constraints
   WHERE constraint_name = 'notifications_type_check';
   ```

3. **Check API logs:**
   ```
   Should see: "🔔 [Battle {id}] Notifying opponent..."
   ```

---

## Conclusion

This test plan covers all critical paths for the battle notification system. Execute these tests in order, marking each as pass/fail. Any failures should be investigated and fixed before production deployment.

**Estimated Testing Time:** 2-3 hours

**Required Resources:**
- 2 test user accounts
- Browser with DevTools
- Database access for verification queries
- Supabase Dashboard access

**Sign-off:**
- [ ] All tests passed
- [ ] Documentation reviewed
- [ ] Ready for production

---

**Test Plan Version:** 1.0
**Last Updated:** 2025-10-20
**Prepared By:** QA Test Engineer
