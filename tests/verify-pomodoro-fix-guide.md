# Quick Verification Guide for Pomodoro Settings Fix

## Before Testing

1. **Clear localStorage** to ensure fresh state:
   ```javascript
   // Run in browser console
   localStorage.removeItem('pomodoro-timer-state');
   location.reload();
   ```

2. **Open browser console** to watch for logs

---

## Test Procedure (2 minutes)

### Test 1: Settings Auto-Apply When Idle ✅

**This is the main bug fix**

1. Open Pomodoro modal (click Pomodoro widget on dashboard)
2. Verify timer shows **25:00** and is NOT running
3. Click **Settings** tab
4. Drag **Focus Duration** slider from **25 → 30** minutes
5. **Wait 1 second** for DB update
6. Click **Timer** tab

**✅ Expected Result:**
- Timer immediately shows **30:00**
- No need to click Reset
- Console shows:
  ```
  ⚙️ [updateSettings] Settings changed while idle - auto-applying: {
    sessionType: "focus",
    oldTime: 1500,
    newTime: 1800,
    ...
  }
  ```

**❌ Before Fix:**
- Timer still showed **25:00**
- Had to click Reset to see **30:00**

---

### Test 2: Settings Don't Interrupt Running Timer ✅

1. Open Pomodoro modal
2. Click **Play** to start timer
3. Let it run for a few seconds
4. Click **Settings** tab
5. Change Focus Duration to **40 minutes**
6. Click **Timer** tab

**✅ Expected Result:**
- Timer continues counting down from where it was
- Settings update does NOT reset active timer
- Console does NOT show auto-apply log (because timer is running)

---

### Test 3: Settings Don't Reset Paused Timer ✅

1. Open Pomodoro modal
2. Click **Play** to start timer
3. Let it run for ~10 seconds
4. Click **Pause**
5. Note current time (e.g., 24:50)
6. Click **Settings** tab
7. Change Focus Duration to **35 minutes**
8. Click **Timer** tab

**✅ Expected Result:**
- Timer still shows same time as when paused (e.g., 24:50)
- Settings update does NOT reset paused session
- Can resume from where you left off

---

## Console Logs to Look For

### When changing settings while IDLE:
```
🔧 [updateSettings] Called with: { focus_duration: 30 }
🔧 [updateSettings] Auth check: { hasUser: true, userId: "..." }
🔧 [updateSettings] Existing settings check: { exists: true, ... }
🔧 [updateSettings] Preparing update: {...}
⚙️ [updateSettings] Settings changed while idle - auto-applying: {
  sessionType: "focus",
  oldTime: 1500,
  newTime: 1800,
  newSettings: {...}
}
🔧 [updateSettings] Starting database update...
✅ [updateSettings] Settings successfully saved to database
```

### When changing settings while RUNNING or PAUSED:
```
🔧 [updateSettings] Called with: { focus_duration: 30 }
...
⏸️ [updateSettings] Timer active/paused - not changing timeRemaining
🔧 [updateSettings] Starting database update...
✅ [updateSettings] Settings successfully saved to database
```

---

## Quick Debug Commands

### Check localStorage state:
```javascript
const state = JSON.parse(localStorage.getItem('pomodoro-timer-state'));
console.log('isRunning:', state.isRunning);
console.log('currentSessionStartTime:', state.currentSessionStartTime);
console.log('timeRemaining:', state.timeRemaining);
console.log('sessionType:', state.sessionType);
```

**After fix, on fresh load:**
- `isRunning: false`
- `currentSessionStartTime: null` ← This should be null!
- `timeRemaining: 1500` (or whatever duration is set)

### Check React state (React DevTools):
1. Install React DevTools extension
2. Open DevTools → Components tab
3. Search for "PomodoroProvider"
4. Check state values:
   - `state.isRunning` → `false` when idle
   - `state.currentSessionStartTime` → `null` when idle
   - `state.timeRemaining` → should match settings

---

## What the Fix Changed

**File:** `/lib/contexts/PomodoroContext.tsx`
**Function:** `restoreTimerState()` (line 329-373)

**Change:**
```typescript
// BEFORE (buggy):
currentSessionStartTime: timerState.currentSessionStartTime
  ? new Date(timerState.currentSessionStartTime)
  : null,

// AFTER (fixed):
const shouldRestoreSessionStart = false; // Never restore session start
currentSessionStartTime: shouldRestoreSessionStart
  ? (timerState.currentSessionStartTime ? new Date(timerState.currentSessionStartTime) : null)
  : null,
```

**Why this fixes it:**
- `currentSessionStartTime` is now ALWAYS `null` on page load
- This makes timer truly "idle" (not "paused")
- Auto-apply logic can run: `const isIdle = !prev.isRunning && !prev.currentSessionStartTime;`
- Timer updates immediately when settings change

---

## Expected Behavior Summary

| Scenario | Timer State | Settings Change | Expected Behavior |
|----------|-------------|-----------------|-------------------|
| **Idle** (not running, no session) | `isRunning: false`<br>`currentSessionStartTime: null` | 25 → 30 min | ✅ Timer shows 30:00 immediately |
| **Running** | `isRunning: true`<br>`currentSessionStartTime: Date` | 25 → 30 min | ✅ Timer keeps running, no change |
| **Paused** (mid-session) | `isRunning: false`<br>`currentSessionStartTime: Date` | 25 → 30 min | ✅ Timer keeps paused time, no change |
| **After Reset** | `isRunning: false`<br>`currentSessionStartTime: null` | 25 → 30 min | ✅ Timer shows 30:00 immediately |

---

## If Test Fails

### If timer still shows 25:00 after settings change:

1. **Check console logs** - Do you see the auto-apply log?
   - **YES** → State is updating but UI isn't rendering. Check React DevTools.
   - **NO** → Auto-apply logic isn't running. Check `isIdle` condition.

2. **Check localStorage:**
   ```javascript
   const state = JSON.parse(localStorage.getItem('pomodoro-timer-state'));
   console.log('currentSessionStartTime:', state.currentSessionStartTime);
   ```
   - If not `null`, the fix didn't apply or localStorage has stale data
   - Clear localStorage and refresh: `localStorage.removeItem('pomodoro-timer-state'); location.reload();`

3. **Check React state:**
   - React DevTools → PomodoroProvider → state.currentSessionStartTime
   - Should be `null` when idle
   - If not null, the restore function didn't apply the fix

4. **Check if code was saved:**
   - Verify `/lib/contexts/PomodoroContext.tsx` line 354 has: `const shouldRestoreSessionStart = false;`
   - If not, the fix wasn't applied

---

## Success Criteria

✅ Timer updates immediately when changing settings while idle
✅ Console shows auto-apply log with correct old/new times
✅ No need to click Reset button
✅ Running timer is NOT interrupted by settings change
✅ Paused timer is NOT reset by settings change

---

**Estimated Testing Time:** 2-3 minutes
**Complexity:** Low
**Risk:** None (fix is isolated to restore logic)
