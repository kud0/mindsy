# Pomodoro Settings Bug - Deep Analysis

## Code Flow Analysis

### When Settings Change (focus 25 → 30 min):

**Step 1: User adjusts slider in Settings tab**
- `PomodoroModal.tsx` line 316: `onValueCommit={([value]) => updateSettings({ focus_duration: value })}`
- This calls `updateSettings({ focus_duration: 30 })`

**Step 2: updateSettings() executes (PomodoroContext.tsx line 616-806)**
```typescript
// Line 687-799
setState(prev => {
  const updatedSettings = {
    ...prev.settings,
    ...newSettings,  // focus_duration: 30
    updated_at: new Date().toISOString()
  };

  // Line 771: Check if timer is IDLE
  const isIdle = !prev.isRunning && !prev.currentSessionStartTime;

  let newTimeRemaining = prev.timeRemaining;

  if (isIdle) {
    // Line 777-778: Timer is IDLE - recalculate time
    if (prev.sessionType === 'focus') {
      newTimeRemaining = updatedSettings.focus_duration * 60; // 30 * 60 = 1800
    }

    // Line 785: Console log SHOULD appear
    console.log('⚙️ [updateSettings] Settings changed while idle - auto-applying:', {
      sessionType: prev.sessionType,
      oldTime: prev.timeRemaining,  // 1500
      newTime: newTimeRemaining,     // 1800
      newSettings: updatedSettings
    });
  }

  // Line 795-799: Return new state
  return {
    ...prev,
    settings: updatedSettings,
    timeRemaining: newTimeRemaining  // 1800
  };
});
```

**Step 3: State updates propagate**
- React re-renders components that depend on `usePomodoro()`
- `PomodoroModal` should receive updated `timeLeft = 1800`

**Step 4: User switches to Timer tab**
- Tab changes in `PomodoroModal.tsx`
- Timer display should show `formatTime(1800)` = "30:00"

## Potential Issues

### Issue 1: Settings tab uses local state
- `PomodoroModal.tsx` line 38-50: Local state for sliders
- `onValueCommit` updates global settings
- Local state syncs via `useEffect` (line 44-51)

**Could this cause a problem?** No, because `onValueCommit` definitely calls `updateSettings()`.

### Issue 2: Timer might restore from localStorage
- `PomodoroContext.tsx` line 171-185: Saves to localStorage on every state change
- `restoreTimerState()` line 329-368: Restores on mount

**Could this cause a problem?** Possibly! If:
1. Settings change → state updates → localStorage saves
2. Component unmounts/remounts
3. `restoreTimerState()` runs
4. Line 340-343: Checks if settings match

Let's trace line 340-343:
```typescript
const shouldRestoreTime = savedSettings &&
  savedSettings.focus_duration === prev.settings.focus_duration &&
  savedSettings.short_break_duration === prev.settings.short_break_duration &&
  savedSettings.long_break_duration === prev.settings.long_break_duration;
```

**AH HA!** This is checking `prev.settings` which is the OLD settings (before DB load completes)!

### Issue 3: Settings load is async
- `updateSettings()` updates DB asynchronously (line 702-767)
- But state update is synchronous (line 687-800)
- The DB update happens in an IIFE `(async () => { ... })()`

**Timeline:**
1. `updateSettings()` called
2. `setState()` runs immediately → `timeRemaining = 1800`, `settings.focus_duration = 30`
3. Async DB update starts
4. React re-renders
5. localStorage saves (line 171-185) with NEW state
6. DB update completes
7. Toast appears

**So far so good...**

### Issue 4: Real-time subscription may overwrite
- Line 127-140: Subscribes to settings changes
- When UPDATE happens in DB, it triggers `loadUserSettings()`
- `loadUserSettings()` line 222-299

**WAIT! This is the bug!**

When `updateSettings()` saves to DB (line 710-723), it triggers:
1. Real-time subscription (line 131-140)
2. Calls `loadUserSettings()` (line 138)
3. `loadUserSettings()` fetches from DB
4. Updates state with DB data (line 252-255)
5. **BUT**: It only updates `settings`, NOT `timeRemaining`!

```typescript
// Line 252-255
setState(prev => ({
  ...prev,
  settings: data  // Only updates settings!
}));
```

**This doesn't reset timeRemaining!** So that's not the issue either...

### Issue 5: The ACTUAL bug

Let me check what happens when `loadUserSettings()` is called from the real-time subscription AFTER `updateSettings()` completes:

**Scenario:**
1. `updateSettings()` runs → sets `timeRemaining = 1800`, `settings.focus_duration = 30`
2. DB update succeeds
3. Real-time subscription fires → calls `loadUserSettings()`
4. `loadUserSettings()` line 252: `setState(prev => ({ ...prev, settings: data }))`
5. This creates a NEW state object with updated `settings`
6. **Does this trigger a re-render that breaks things?**

No, because it's using `...prev`, so `timeRemaining` is preserved.

## Hypothesis: User Experience Flow

Let me reconsider the user's actual steps:

1. User opens Pomodoro modal → **Timer tab active** (default)
2. Timer shows 25:00 (idle)
3. User switches to **Settings tab**
4. User drags slider 25 → 30
5. `onValueCommit` fires → `updateSettings({ focus_duration: 30 })`
6. Console log appears (if idle)
7. User switches back to **Timer tab**
8. **BUG**: Timer still shows 25:00

**Why?** Let me check if there's some display caching or memoization:

Looking at `PomodoroModal.tsx` line 81:
```typescript
const safeTimeLeft = typeof timeLeft === 'number' && !isNaN(timeLeft) ? timeLeft : focusDurationSeconds;
```

`timeLeft` comes from line 23: `const { timeLeft, ...} = usePomodoro();`

And line 77:
```typescript
const focusDurationSeconds = (settings?.focus_duration || 25) * 60;
```

**AH! Here's the issue:**

If `timeLeft` is `1500` (25 minutes) and settings update to `30` minutes:
- `focusDurationSeconds = 30 * 60 = 1800`
- `safe TimeLeft = 1500` (because timeLeft IS a valid number)
- `totalTime = 1800` (from focusDurationSeconds)
- `progress = ((1800 - 1500) / 1800) * 100 = 16.67%`

**The progress bar shows wrong progress!**

But the display shows `formatTime(safeTimeLeft)` which is `formatTime(1500)` = "25:00"

**SO THE BUG IS**: `timeLeft` is not updating when settings change!

This means the context's `state.timeRemaining` is not updating, which means the `updateSettings()` auto-apply logic is NOT running.

## Final Diagnosis

The auto-apply logic exists (line 771-793) but is NOT executing. Why?

**Check the condition**: `const isIdle = !prev.isRunning && !prev.currentSessionStartTime;`

If this returns `false`, then auto-apply won't happen.

**Most likely cause**: `prev.currentSessionStartTime` is NOT null even when timer appears idle.

Let me check the `resetTimer()` function (line 583-610):

```typescript
// Line 599-605
return {
  ...prev,
  isRunning: false,
  timeRemaining: prev.settings.focus_duration * 60,
  sessionType: 'focus',
  currentSessionStartTime: null,  // ✅ Sets to null
  currentSessionNote: '',
  currentLectureStudyStart: null
};
```

Reset DOES set `currentSessionStartTime = null`.

**But what if the user has never clicked Reset?**

If the timer loads from localStorage (line 329-368) with a stale `currentSessionStartTime`, it could persist!

Looking at line 356:
```typescript
currentSessionStartTime: timerState.currentSessionStartTime ? new Date(timerState.currentSessionStartTime) : null,
```

If localStorage has a non-null `currentSessionStartTime` from a previous session, it RESTORES it!

**THIS IS THE BUG!**

## Root Cause Confirmed

When the app loads:
1. `restoreTimerState()` runs
2. Reads `currentSessionStartTime` from localStorage (from previous session)
3. Sets `currentSessionStartTime = new Date("2025-10-21T...")` (non-null)
4. Timer appears "idle" (isRunning = false) but is technically "paused" (has session start time)
5. `isIdle` check fails because `currentSessionStartTime !== null`
6. Auto-apply doesn't run
7. User must manually reset to clear `currentSessionStartTime`

## Solution

Fix `restoreTimerState()` to not restore `currentSessionStartTime` if the timer is not running.

OR

Fix the `isIdle` check to only look at `isRunning`.

OR

Clear `currentSessionStartTime` in localStorage when timer completes or is abandoned.
