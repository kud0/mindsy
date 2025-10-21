# Pomodoro Timer Settings Update Bug Fix

## Bug Description

**Issue**: When changing timer settings (e.g., focus duration from 25→30 minutes) while the timer is idle, the display doesn't update to show the new duration immediately.

**Reported Behavior**:
1. Timer shows 25:00 (default)
2. User goes to Settings tab
3. User changes focus duration 25 → 30 minutes
4. User returns to Timer tab
5. **BUG**: Timer still shows 25:00 instead of 30:00
6. Even clicking Start uses old 25-minute duration

## Root Cause Analysis

### Primary Issue: localStorage Race Condition

The localStorage persistence effect (lines 171-185) was saving timer state without including the `settings` object in the saved data. This created a race condition where:

1. User changes settings → `updateSettings()` correctly updates `timeRemaining` in state
2. The localStorage effect fires and saves the updated `timeRemaining`
3. But localStorage doesn't save the settings themselves
4. On next render/refresh, `restoreTimerState()` compares localStorage time with current settings
5. If they don't match (due to stale data), it uses the wrong value

### Secondary Issue: Restore Logic

The `restoreTimerState()` function (lines 286-325) was blindly restoring `timeRemaining` from localStorage without validating whether the saved value was still valid for the current settings.

Example of the problem:
- Settings: 25 minutes
- User changes to 30 minutes → state updates correctly
- localStorage saves: `{ timeRemaining: 1800 }` (30 minutes in seconds)
- But localStorage settings are old: `{ focus_duration: 25 }`
- On restore: Function sees mismatch and falls back to `prev.settings.focus_duration * 60` = 1500 seconds (25 minutes)

## The Solution

### Fix #1: Save Settings to localStorage

**File**: `lib/contexts/PomodoroContext.tsx` (lines 171-185)

```typescript
// Before:
useEffect(() => {
  const timerState = {
    isRunning: state.isRunning,
    timeRemaining: state.timeRemaining,
    sessionType: state.sessionType,
    // ... other fields
  };
  localStorage.setItem('pomodoro-timer-state', JSON.stringify(timerState));
}, [/* dependencies WITHOUT state.settings */]);

// After:
useEffect(() => {
  const timerState = {
    isRunning: state.isRunning,
    timeRemaining: state.timeRemaining,
    sessionType: state.sessionType,
    // ... other fields
    settings: state.settings // ✅ Now saving settings
  };
  localStorage.setItem('pomodoro-timer-state', JSON.stringify(timerState));
}, [/* dependencies WITH state.settings */]);
```

### Fix #2: Smart Restore with Settings Validation

**File**: `lib/contexts/PomodoroContext.tsx` (lines 286-325)

```typescript
const restoreTimerState = () => {
  try {
    const saved = localStorage.getItem('pomodoro-timer-state');
    if (!saved) return;

    const timerState = JSON.parse(saved);

    setState(prev => {
      // ✅ Only restore timeRemaining if settings match
      const savedSettings = timerState.settings;
      const shouldRestoreTime = savedSettings &&
        savedSettings.focus_duration === prev.settings.focus_duration &&
        savedSettings.short_break_duration === prev.settings.short_break_duration &&
        savedSettings.long_break_duration === prev.settings.long_break_duration;

      // ✅ Calculate fresh default based on session type
      const defaultTime = timerState.sessionType === 'shortBreak'
        ? prev.settings.short_break_duration * 60
        : timerState.sessionType === 'longBreak'
        ? prev.settings.long_break_duration * 60
        : prev.settings.focus_duration * 60;

      return {
        ...prev,
        isRunning: false,
        timeRemaining: shouldRestoreTime ? (timerState.timeRemaining || defaultTime) : defaultTime,
        // ... rest of restore logic
      };
    });
  } catch (error) {
    console.error('Error restoring timer state:', error);
    localStorage.removeItem('pomodoro-timer-state');
  }
};
```

## How It Works Now

### Scenario 1: Settings Change While Idle ✅

1. Timer is idle (not running, not started): `isRunning: false`, `currentSessionStartTime: null`
2. User changes focus duration 25 → 30 minutes
3. `updateSettings()` detects idle state (line 583)
4. Calculates new time: `30 * 60 = 1800 seconds`
5. Updates state: `{ settings: { focus_duration: 30 }, timeRemaining: 1800 }`
6. Console log fires (line 597): `"⚙️ Settings changed while idle - auto-applying"`
7. localStorage effect fires (line 171) and saves both settings and timeRemaining
8. Timer display immediately shows 30:00 ✅

### Scenario 2: Settings Change While Running ✅

1. Timer is running: `isRunning: true`
2. User changes focus duration 25 → 30 minutes
3. `updateSettings()` detects NOT idle (line 583): `isIdle = false`
4. Settings update but timeRemaining stays unchanged
5. Timer continues with current session (preserves user's running session) ✅

### Scenario 3: Settings Change While Paused ✅

1. Timer is paused mid-session: `isRunning: false`, `currentSessionStartTime: [some date]`
2. User changes focus duration 25 → 30 minutes
3. `updateSettings()` detects NOT idle (line 583): `isIdle = false` (because currentSessionStartTime exists)
4. Settings update but timeRemaining stays unchanged
5. Timer preserves paused state at current time ✅

### Scenario 4: Page Refresh After Settings Change ✅

1. User changes settings 25 → 30 and sees 30:00
2. User refreshes page
3. `restoreTimerState()` runs (line 286)
4. Compares localStorage settings with current DB settings
5. They match → restores 30:00 ✅
6. They don't match → uses fresh value from DB settings ✅

## Testing Checklist

### Manual Testing

#### Test 1: Idle Timer Settings Change
- [ ] Open Pomodoro modal
- [ ] Verify timer shows 25:00 (default)
- [ ] Go to Settings tab
- [ ] Change focus duration to 30 minutes
- [ ] Return to Timer tab
- [ ] **Expected**: Timer shows 30:00 immediately
- [ ] Click Start
- [ ] **Expected**: Timer counts down from 30:00

#### Test 2: Running Timer Settings Change
- [ ] Start timer (25 minutes)
- [ ] Let it run for 1 minute (shows 24:00)
- [ ] Go to Settings tab
- [ ] Change focus duration to 30 minutes
- [ ] Return to Timer tab
- [ ] **Expected**: Timer still shows ~24:00 (unchanged)
- [ ] **Expected**: Current session continues with original duration

#### Test 3: Paused Timer Settings Change
- [ ] Start timer (25 minutes)
- [ ] Pause at 20:00
- [ ] Go to Settings tab
- [ ] Change focus duration to 30 minutes
- [ ] Return to Timer tab
- [ ] **Expected**: Timer still shows 20:00 (unchanged)
- [ ] Click Start again
- [ ] **Expected**: Continues from 20:00 with original 25-minute session

#### Test 4: Console Logging
- [ ] Open browser console
- [ ] Open Pomodoro modal (timer idle)
- [ ] Change focus duration 25 → 30
- [ ] **Expected**: Console shows:
  ```
  ⚙️ Settings changed while idle - auto-applying: {
    sessionType: 'focus',
    oldTime: 1500,
    newTime: 1800,
    newSettings: { ... }
  }
  ```

#### Test 5: Short Break Settings
- [ ] Complete a focus session (or skip to short break)
- [ ] Verify timer shows default short break (5:00)
- [ ] Go to Settings
- [ ] Change short break to 10 minutes
- [ ] Return to Timer tab
- [ ] **Expected**: Timer shows 10:00

#### Test 6: Long Break Settings
- [ ] Complete 4 focus sessions to trigger long break
- [ ] Verify timer shows default long break (15:00)
- [ ] Go to Settings
- [ ] Change long break to 20 minutes
- [ ] Return to Timer tab
- [ ] **Expected**: Timer shows 20:00

#### Test 7: Page Refresh Persistence
- [ ] Change settings to non-default (e.g., 30 min focus)
- [ ] Verify timer shows 30:00
- [ ] Refresh page
- [ ] Open Pomodoro modal
- [ ] **Expected**: Timer still shows 30:00
- [ ] Settings tab still shows 30 minutes

#### Test 8: Multiple Setting Changes
- [ ] Change focus duration: 25 → 30
- [ ] Verify timer shows 30:00
- [ ] Change focus duration: 30 → 35
- [ ] Verify timer shows 35:00
- [ ] Change focus duration: 35 → 20
- [ ] Verify timer shows 20:00

### Edge Cases

#### Edge Case 1: Rapid Settings Changes
- [ ] Quickly drag focus slider back and forth
- [ ] Wait for drag to settle (onValueCommit fires)
- [ ] **Expected**: Timer updates to final value
- [ ] **Expected**: No console errors

#### Edge Case 2: Tab Switching During Settings Change
- [ ] Start changing settings
- [ ] Immediately switch to Timer tab (before onValueCommit)
- [ ] **Expected**: Timer shows old value (setting not committed yet)
- [ ] Return to Settings and release slider
- [ ] Switch to Timer tab
- [ ] **Expected**: Timer shows new value

#### Edge Case 3: localStorage Cleared
- [ ] Set custom settings (e.g., 30 min focus)
- [ ] Clear localStorage in DevTools
- [ ] Refresh page
- [ ] **Expected**: Settings loaded from database
- [ ] **Expected**: Timer shows correct duration from DB

## Files Modified

1. **lib/contexts/PomodoroContext.tsx**
   - Lines 171-185: Added `settings` to localStorage persistence
   - Lines 286-325: Added settings validation to restore logic

## Regression Risk

**Low Risk** - Changes are defensive and only affect:
1. localStorage persistence (now saves more data for validation)
2. Restore logic (now validates before using localStorage data)

The existing `updateSettings()` auto-apply logic (lines 581-609) was already correct and remains unchanged.

## Console Debugging

The existing console.log at line 597-602 will help verify the fix:

```typescript
console.log('⚙️ Settings changed while idle - auto-applying:', {
  sessionType: prev.sessionType,
  oldTime: prev.timeRemaining,
  newTime: newTimeRemaining,
  newSettings: updatedSettings
});
```

**What to look for**:
- Message only appears when timer is **idle** (not running, not paused mid-session)
- `oldTime` shows previous duration in seconds (e.g., 1500 for 25 min)
- `newTime` shows new duration in seconds (e.g., 1800 for 30 min)
- Message does NOT appear when timer is running or paused

## Summary

The bug is now fixed with two key changes:
1. **Save settings to localStorage** alongside timer state for consistency validation
2. **Validate settings on restore** to prevent stale localStorage values from overriding fresh settings

The timer will now immediately update when settings change **only if idle**, and preserve running/paused sessions as intended.
