# Daily Fact Feature - QA Test Plan

**Date**: 2025-10-21
**Issue**: Daily fact showing "No daily fact available yet"
**Root Cause**: User dismissed the fact, `dismissed` flag is `TRUE`
**Status**: ✅ **WORKING AS DESIGNED**

---

## 🔍 Investigation Summary

### Current State
- **User**: `ad5f79b7-10d8-49a2-aaff-22a8066d79b6`
- **Date**: `2025-10-21`
- **daily_fact_dismissed**: `TRUE` (this is why no fact shows)
- **Behavior**: API returns `{ dismissed: true, fact: null }`

### Why This Happened
1. User clicked the **X button** on the daily fact box
2. `handleDismiss()` function called (NinjaFactBox.tsx:97-100)
3. PATCH request sent to `/api/daily-fact` with `{ dismissed: true }`
4. Database updated: `daily_fact_dismissed = TRUE`
5. Component renders `null` when dismissed (NinjaFactBox.tsx:114-116)

### This is Expected Behavior ✅
The feature is working correctly! User dismissed the fact for today.

---

## 🛠️ Three Solutions

### **Option A: Reset Dismissed Flag (SQL - For Testing)**

**Use Case**: Immediate testing, manual intervention, debugging

**SQL Command**:
```sql
UPDATE profiles
SET daily_fact_dismissed = FALSE
WHERE id = 'ad5f79b7-10d8-49a2-aaff-22a8066d79b6'::uuid;
```

**Pros**:
- ✅ Instant fix
- ✅ No code changes
- ✅ Good for testing

**Cons**:
- ❌ Manual intervention required
- ❌ Bypasses user intent (they dismissed it)
- ❌ Not a production solution

---

### **Option B: Add Un-Dismiss Button (UX Enhancement)**

**Use Case**: Allow users to bring back dismissed facts on the same day

**Implementation**:
1. See `/tests/daily-fact-undismiss-component.tsx`
2. Two approaches provided:
   - **Floating button** with undo icon
   - **Overlay on ninja** with subtle restore option

**Code Change Required**:
```tsx
// In NinjaFactBox.tsx, line 114-116:

// OLD:
if (dismissed) {
  return null;
}

// NEW:
if (dismissed) {
  return <UndismissButton />;
}
```

**Pros**:
- ✅ User control
- ✅ Reverses accidental dismissals
- ✅ Better UX flexibility

**Cons**:
- ❌ Requires code changes
- ❌ May encourage notification fatigue
- ❌ Adds UI complexity

---

### **Option C: Wait Until Tomorrow (Automatic Reset)**

**Use Case**: Normal production operation

**How It Works**:
1. Tomorrow (2025-10-22), when API checks:
   ```typescript
   const needsNewFact =
     !profile.daily_fact_text ||
     !profile.daily_fact_date ||
     profile.daily_fact_date !== today;  // 2025-10-21 !== 2025-10-22 ✅
   ```
2. `generateDailyFact()` is called
3. Line 97 in `daily-fact-generator.ts` resets:
   ```typescript
   daily_fact_dismissed: false,  // Auto-reset!
   daily_fact_collapsed: false
   ```
4. New fact appears automatically

**Pros**:
- ✅ No intervention needed
- ✅ Clean daily reset
- ✅ Respects user dismissal for the day
- ✅ Aligns with "daily" concept

**Cons**:
- ❌ Requires waiting ~3-6 hours (until 2025-10-22)

---

## 🧪 Comprehensive Test Plan

### Test Suite 1: Dismiss/Undismiss Flow

#### TC-001: User Dismisses Fact
**Steps**:
1. Load dashboard with fact visible
2. Click X button on fact box
3. Observe fact disappears
4. Refresh page
5. Verify fact stays dismissed

**Expected**:
- Fact box removed from DOM
- Database: `daily_fact_dismissed = TRUE`
- API returns: `{ dismissed: true, fact: null }`

**SQL Verification**:
```sql
SELECT daily_fact_dismissed, daily_fact_date
FROM profiles
WHERE id = '[user-id]';
-- Expected: TRUE, 2025-10-21
```

---

#### TC-002: Dismissed Fact Persists Across Sessions
**Steps**:
1. Dismiss fact (TC-001)
2. Log out
3. Log back in
4. Check dashboard

**Expected**:
- Fact remains dismissed
- No ninja visible on dashboard

---

#### TC-003: Auto-Reset at Midnight (Option C)
**Steps**:
1. Dismiss fact today (2025-10-21)
2. Manually update date to yesterday:
   ```sql
   UPDATE profiles
   SET daily_fact_date = '2025-10-20'
   WHERE id = '[user-id]';
   ```
3. Refresh page
4. Check API response

**Expected**:
- New fact generated
- Database: `daily_fact_dismissed = FALSE`
- Fact visible on dashboard

**API Logs to Check**:
```
💡 [Daily Fact API] Generating new daily fact for user: [user-id]
✅ [Daily Fact API] Fact generated successfully
```

---

### Test Suite 2: Collapse/Expand Flow

#### TC-004: Collapse Persists Across Refresh
**Steps**:
1. Load page with fact expanded
2. Click minimize button
3. Observe ninja shrinks to icon
4. Refresh page

**Expected**:
- Fact loads in collapsed state
- Database: `daily_fact_collapsed = TRUE`

---

#### TC-005: Expand Ninja Icon
**Steps**:
1. Start with collapsed ninja
2. Click ninja icon
3. Observe speech bubble appears

**Expected**:
- Smooth animation
- Database: `daily_fact_collapsed = FALSE`

---

### Test Suite 3: Edge Cases

#### TC-006: No Lectures - New User
**Steps**:
1. Create fresh user account
2. No lectures uploaded
3. Load dashboard

**Expected**:
- API returns error: `"No completed lectures found. Upload some content first!"`
- Ninja shows: "Loading your daily fact..." or error message

**API Response**:
```json
{
  "error": "No completed lectures found. Upload some content first!",
  "details": "No lectures found for this user"
}
```

---

#### TC-007: API Failure (No GROK_API_KEY)
**Steps**:
1. Remove `GROK_API_KEY` from environment
2. Force fact generation
3. Check error handling

**Expected**:
- API returns: `"AI service error. Please check GROK_API_KEY environment variable."`
- User sees fallback message

---

#### TC-008: Language Detection
**Steps**:
1. Upload lectures in Spanish
2. Generate daily fact
3. Check `daily_fact_language` in database

**Expected**:
- Fact generated in Spanish
- Database: `daily_fact_language = 'es'`

---

### Test Suite 4: Performance & UX

#### TC-009: Initial Load Speed
**Steps**:
1. Fresh page load
2. Measure time to fact display

**Expected**:
- < 500ms for existing fact
- < 2s for new fact generation

---

#### TC-010: Animation Smoothness
**Steps**:
1. Collapse/expand ninja
2. Dismiss fact
3. Check for janky animations

**Expected**:
- 60fps animations (Framer Motion)
- Smooth transitions

---

## 📊 Test Metrics

### Coverage Checklist
- [x] Dismiss functionality
- [x] Collapse/expand functionality
- [x] Auto-reset at midnight
- [x] No lectures edge case
- [x] API error handling
- [x] Language detection
- [x] Session persistence
- [x] Animation performance

### Priority
- **P0 (Critical)**: TC-001, TC-003, TC-006
- **P1 (High)**: TC-002, TC-004, TC-007
- **P2 (Medium)**: TC-005, TC-008, TC-009
- **P3 (Low)**: TC-010

---

## 🎯 Recommendations

### For Development Team
1. **Current behavior is correct** - no bug fix needed
2. **Consider Option B** (un-dismiss button) if users report accidental dismissals
3. **Document behavior** in user-facing help/FAQ

### For QA Team
1. **Run Test Suite 1** to verify dismiss flow
2. **Test TC-003** to confirm auto-reset works
3. **Monitor user feedback** for UX improvements

### For Product Team
1. **Decision needed**: Should users be able to un-dismiss?
2. **Metrics to track**:
   - Dismissal rate (% of users who dismiss daily facts)
   - Re-engagement rate (% who view facts next day after dismissing)
   - Average time before dismissal

---

## 🔗 Related Files

- **API Route**: `/app/api/daily-fact/route.ts` (lines 92-99: dismiss logic)
- **Component**: `/components/daily-fact/NinjaFactBox.tsx` (lines 97-100, 114-116)
- **Generator**: `/lib/daily-fact-generator.ts` (line 97: auto-reset)
- **Test SQL**: `/tests/daily-fact-investigation.sql`
- **Un-dismiss Component**: `/tests/daily-fact-undismiss-component.tsx`

---

## ✅ Conclusion

**The feature is working as designed.** User dismissed the fact, and it correctly stays dismissed until tomorrow. Three solutions provided based on use case:

- **Testing**: Use SQL reset (Option A)
- **UX Enhancement**: Add un-dismiss button (Option B)
- **Production**: Wait for auto-reset (Option C) ← **RECOMMENDED**

**No code changes required** unless product team decides to implement Option B.
