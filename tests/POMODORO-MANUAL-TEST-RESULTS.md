# Pomodoro Timer Settings Update - Manual Test Results

## Test Environment
- **Date**: [To be filled during testing]
- **Browser**: [Chrome/Firefox/Safari]
- **OS**: [macOS/Windows/Linux]
- **Tester**: [Name]

## Pre-Test Setup
- [ ] Clear browser localStorage
- [ ] Clear browser cache
- [ ] Login to Mindsy
- [ ] Navigate to Dashboard

---

## Test 1: Idle Timer Settings Change
**Priority**: 🔴 Critical

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Open Pomodoro modal | Modal opens | | ⬜ |
| 2 | Verify timer display | Shows 25:00 (default) | | ⬜ |
| 3 | Click Settings tab | Settings tab opens | | ⬜ |
| 4 | Change focus duration slider to 30 | Slider updates, shows "30 min" | | ⬜ |
| 5 | Click Timer tab | Timer tab displays | | ⬜ |
| 6 | Check timer display | **Shows 30:00** | | ⬜ |
| 7 | Click Start button | Timer starts counting down | | ⬜ |
| 8 | Verify countdown | Counts from 30:00 to 29:59, 29:58... | | ⬜ |

**Notes**: _______________________________________________

---

## Test 2: Running Timer Settings Change
**Priority**: 🔴 Critical

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Reset timer to 25:00 | Timer shows 25:00 | | ⬜ |
| 2 | Click Start | Timer starts counting down | | ⬜ |
| 3 | Wait until timer shows ~24:00 | Timer at ~24:00 | | ⬜ |
| 4 | Click Settings tab | Settings tab opens | | ⬜ |
| 5 | Change focus duration to 30 | Slider updates to 30 min | | ⬜ |
| 6 | Click Timer tab | Timer tab displays | | ⬜ |
| 7 | Check timer display | **Still shows ~24:00 (unchanged)** | | ⬜ |
| 8 | Let timer continue | Continues countdown from ~24:00 | | ⬜ |

**Notes**: _______________________________________________

---

## Test 3: Paused Timer Settings Change
**Priority**: 🟡 High

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Reset timer to 25:00 | Timer shows 25:00 | | ⬜ |
| 2 | Click Start | Timer starts | | ⬜ |
| 3 | Click Pause at ~20:00 | Timer pauses at ~20:00 | | ⬜ |
| 4 | Click Settings tab | Settings tab opens | | ⬜ |
| 5 | Change focus duration to 30 | Slider updates to 30 min | | ⬜ |
| 6 | Click Timer tab | Timer tab displays | | ⬜ |
| 7 | Check timer display | **Still shows ~20:00 (unchanged)** | | ⬜ |
| 8 | Click Start | Timer resumes from ~20:00 | | ⬜ |

**Notes**: _______________________________________________

---

## Test 4: Console Logging
**Priority**: 🟢 Medium

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Open browser DevTools Console | Console visible | | ⬜ |
| 2 | Clear console | Console empty | | ⬜ |
| 3 | Open Pomodoro modal (timer idle) | Modal opens at 25:00 | | ⬜ |
| 4 | Go to Settings tab | Settings tab opens | | ⬜ |
| 5 | Change focus duration 25 → 30 | Slider updates | | ⬜ |
| 6 | Check console output | Shows log: `⚙️ Settings changed while idle - auto-applying` | | ⬜ |
| 7 | Verify log data | Contains: `oldTime: 1500, newTime: 1800` | | ⬜ |

**Console Output** (copy/paste actual log):
```
[Paste console output here]
```

---

## Test 5: Short Break Settings
**Priority**: 🟡 High

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Reset timer | Timer at 25:00 (focus) | | ⬜ |
| 2 | Click Skip Session | Switches to short break | | ⬜ |
| 3 | Verify timer | Shows 5:00 (default short break) | | ⬜ |
| 4 | Go to Settings | Settings tab opens | | ⬜ |
| 5 | Change short break to 10 min | Slider updates to 10 min | | ⬜ |
| 6 | Go to Timer tab | Timer tab displays | | ⬜ |
| 7 | Check timer display | **Shows 10:00** | | ⬜ |

**Notes**: _______________________________________________

---

## Test 6: Long Break Settings
**Priority**: 🟢 Medium

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Complete/skip 4 focus sessions | Triggers long break | | ⬜ |
| 2 | Verify timer type | Shows "Break Time" at 15:00 | | ⬜ |
| 3 | Go to Settings | Settings tab opens | | ⬜ |
| 4 | Change long break to 20 min | Slider updates to 20 min | | ⬜ |
| 5 | Go to Timer tab | Timer tab displays | | ⬜ |
| 6 | Check timer display | **Shows 20:00** | | ⬜ |

**Notes**: _______________________________________________

---

## Test 7: Page Refresh Persistence
**Priority**: 🔴 Critical

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Open Pomodoro modal | Modal opens | | ⬜ |
| 2 | Change focus to 30 min | Timer updates to 30:00 | | ⬜ |
| 3 | Verify timer shows 30:00 | Timer displays 30:00 | | ⬜ |
| 4 | Close modal | Modal closes | | ⬜ |
| 5 | Refresh page (F5/Cmd+R) | Page reloads | | ⬜ |
| 6 | Open Pomodoro modal again | Modal opens | | ⬜ |
| 7 | Check timer display | **Still shows 30:00** | | ⬜ |
| 8 | Go to Settings tab | Settings tab opens | | ⬜ |
| 9 | Verify focus duration | **Still shows 30 min** | | ⬜ |

**Notes**: _______________________________________________

---

## Test 8: Multiple Sequential Changes
**Priority**: 🟡 High

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Open Pomodoro modal | Timer at 25:00 | | ⬜ |
| 2 | Change focus to 30 min | Timer updates to 30:00 | | ⬜ |
| 3 | Verify timer | Shows 30:00 | | ⬜ |
| 4 | Change focus to 35 min | Timer updates to 35:00 | | ⬜ |
| 5 | Verify timer | Shows 35:00 | | ⬜ |
| 6 | Change focus to 20 min | Timer updates to 20:00 | | ⬜ |
| 7 | Verify timer | Shows 20:00 | | ⬜ |
| 8 | Change focus back to 25 min | Timer updates to 25:00 | | ⬜ |

**Notes**: _______________________________________________

---

## Edge Case Tests

### EC1: Rapid Slider Changes
**Priority**: 🟢 Medium

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Go to Settings tab | Settings opens | | ⬜ |
| 2 | Rapidly drag slider 25→30→35→40 | Slider moves smoothly | | ⬜ |
| 3 | Release at 40 | Slider settles at 40 | | ⬜ |
| 4 | Wait 1 second | No errors | | ⬜ |
| 5 | Go to Timer tab | Timer tab opens | | ⬜ |
| 6 | Verify timer | **Shows 40:00** | | ⬜ |

**Console Errors**: _______________________________________________

---

### EC2: Tab Switching During Settings Change
**Priority**: 🟢 Low

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Go to Settings tab | Settings opens | | ⬜ |
| 2 | Start dragging slider (don't release) | Slider moves with mouse | | ⬜ |
| 3 | Click Timer tab (while still dragging) | Timer tab opens | | ⬜ |
| 4 | Check timer | Shows old value (change not committed) | | ⬜ |
| 5 | Go back to Settings | Settings tab opens | | ⬜ |
| 6 | Drag and release slider at 30 | Slider commits to 30 | | ⬜ |
| 7 | Go to Timer tab | Timer tab opens | | ⬜ |
| 8 | Verify timer | **Shows 30:00** | | ⬜ |

**Notes**: _______________________________________________

---

### EC3: localStorage Cleared
**Priority**: 🟡 High

| Step | Action | Expected Result | Actual Result | Status |
|------|--------|-----------------|---------------|--------|
| 1 | Set focus to 30 min | Timer shows 30:00 | | ⬜ |
| 2 | Open DevTools → Application → localStorage | localStorage visible | | ⬜ |
| 3 | Clear all localStorage | localStorage empty | | ⬜ |
| 4 | Refresh page | Page reloads | | ⬜ |
| 5 | Open Pomodoro modal | Modal opens | | ⬜ |
| 6 | Check timer | **Shows 30:00 (from DB)** | | ⬜ |
| 7 | Go to Settings | Settings tab opens | | ⬜ |
| 8 | Verify setting | Shows 30 min | | ⬜ |

**Notes**: _______________________________________________

---

## Cross-Browser Testing

| Browser | Version | Test 1 | Test 2 | Test 3 | Test 7 | Overall |
|---------|---------|--------|--------|--------|--------|---------|
| Chrome | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Firefox | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Safari | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |
| Edge | ___ | ⬜ | ⬜ | ⬜ | ⬜ | ⬜ |

---

## Bugs Found

### Bug #1
**Severity**: [Critical/High/Medium/Low]
**Description**: _______________________________________________
**Steps to Reproduce**:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

**Expected**: _______________________________________________
**Actual**: _______________________________________________

---

### Bug #2
**Severity**: [Critical/High/Medium/Low]
**Description**: _______________________________________________
**Steps to Reproduce**:
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## Test Summary

**Total Tests**: 11
**Passed**: _____ / 11
**Failed**: _____ / 11
**Blocked**: _____ / 11

**Critical Issues**: _____
**High Issues**: _____
**Medium Issues**: _____
**Low Issues**: _____

**Overall Status**: ⬜ PASS / ⬜ FAIL

**Sign-off**: _______________________________________________
**Date**: _______________________________________________

---

## Notes & Observations

[Add any additional observations, performance notes, or recommendations here]
