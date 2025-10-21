# Pomodoro Settings Auto-Apply Test Plan

## Problem Statement
When user changes focus time duration in Settings tab (e.g., 25 → 30 minutes), then switches to Timer tab, the timer still shows old duration (25:00) instead of new duration (30:00). User must manually click "Reset" to see the new time.

## Expected Behavior
When settings change and timer is IDLE (not running, not paused mid-session), the timer display should immediately reflect the new duration.

## Test Procedure

### 1. Initial Setup
- [ ] Open Pomodoro modal
- [ ] Verify timer is IDLE (not running, showing 25:00)
- [ ] Open browser DevTools console

### 2. Change Settings
- [ ] Go to Settings tab
- [ ] Change Focus Duration from 25 → 30 minutes
- [ ] Watch for console logs

### 3. Expected Console Logs
Look for this log in console (line 785):
```
⚙️ [updateSettings] Settings changed while idle - auto-applying: {
  sessionType: "focus",
  oldTime: 1500,
  newTime: 1800,
  newSettings: {...}
}
```

### 4. Verify Timer Display
- [ ] Switch to Timer tab
- [ ] Check if timer shows 30:00

### 5. State Investigation
If timer doesn't update, check:
- [ ] Did console log appear? (YES/NO)
- [ ] What does `prev.isRunning` equal?
- [ ] What does `prev.currentSessionStartTime` equal?
- [ ] Is `isIdle` condition being met?

## Root Cause Analysis

### Hypothesis 1: Log appears but UI doesn't update
**Symptoms**: Console shows auto-apply log, but timer still shows 25:00
**Cause**: State updates but UI components don't re-render
**Check**:
- PomodoroModal line 77: `const focusDurationSeconds = (settings?.focus_duration || 25) * 60;`
- PomodoroWidget line 56: `const focusDurationSeconds = (settings?.focus_duration || 25) * 60;`
- These calculate `totalTime` which may not reflect actual `timeRemaining`

### Hypothesis 2: Log doesn't appear
**Symptoms**: No console log at all
**Cause**: `isIdle` condition fails - timer not truly idle
**Check**:
- Line 771: `const isIdle = !prev.isRunning && !prev.currentSessionStartTime;`
- Maybe `currentSessionStartTime` is not null even when timer is idle?

### Hypothesis 3: State restore overrides settings
**Symptoms**: Settings update, then immediately revert
**Cause**: localStorage restore (line 329-368) runs after settings update
**Check**: localStorage `pomodoro-timer-state` may have stale values

## Investigation Steps

### Step 1: Add Debug Logging
Add console.log before isIdle check (line 771):
```typescript
console.log('🔍 [updateSettings] State check:', {
  isRunning: prev.isRunning,
  currentSessionStartTime: prev.currentSessionStartTime,
  timeRemaining: prev.timeRemaining,
  sessionType: prev.sessionType
});
```

### Step 2: Check Component Display Logic
Both PomodoroModal and PomodoroWidget calculate display independently:
- They use `timeLeft` from context
- But also calculate `totalTime` from `settings.focus_duration`
- Progress bar uses: `progress = ((totalTime - safeTimeLeft) / totalTime) * 100`

**Potential Issue**: If `timeLeft` doesn't update, but `settings` does, progress calculation breaks!

### Step 3: Verify State Propagation
Check if `state.timeRemaining` updates trigger re-renders:
- PomodoroModal line 81: `const safeTimeLeft = typeof timeLeft === 'number' && !isNaN(timeLeft) ? timeLeft : focusDurationSeconds;`
- If `timeLeft` is stale, it falls back to `focusDurationSeconds`

## Expected Fix

### If Hypothesis 1 (UI doesn't re-render):
The issue is that components fall back to calculated defaults when `timeLeft` seems invalid.

**Fix**: Ensure `timeRemaining` is always valid when settings change.

### If Hypothesis 2 (isIdle fails):
The issue is that `currentSessionStartTime` persists even when timer is reset.

**Fix**: Ensure `currentSessionStartTime` is null when timer is idle.

### If Hypothesis 3 (localStorage conflicts):
The issue is `restoreTimerState()` runs after `updateSettings()`.

**Fix**: Clear localStorage when settings change, or improve restore logic.

## Test Results

### Console Logs Observed:
```
[PASTE CONSOLE LOGS HERE]
```

### State Values:
- `prev.isRunning`:
- `prev.currentSessionStartTime`:
- `prev.timeRemaining`:
- `isIdle`:

### UI Behavior:
- Timer shows:
- Expected: 30:00
- Actual:

## Conclusion

**Root Cause**: [TO BE DETERMINED]

**Fix Applied**: [TO BE DOCUMENTED]
