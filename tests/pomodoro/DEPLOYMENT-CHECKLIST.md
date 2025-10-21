# Pomodoro Settings Fix - Deployment Checklist

**Fix Version**: 1.0
**Date**: 2025-10-21
**Issue**: Settings don't persist to database

---

## Pre-Deployment Checklist

### 1. Code Review
- [x] Migration file created and reviewed
- [x] PomodoroContext.tsx changes reviewed
- [x] Error handling implemented
- [x] Logging added
- [x] User feedback (toasts) added
- [x] Documentation written

### 2. Local Testing (Development)
- [ ] Migration runs without errors
- [ ] Table created successfully
- [ ] RLS policies active
- [ ] Settings update works
- [ ] Settings persist after refresh
- [ ] Success toasts appear
- [ ] Error toasts appear (test edge cases)
- [ ] Console logs are comprehensive
- [ ] No TypeScript errors
- [ ] No ESLint warnings

### 3. Database Backup (Production)
- [ ] Backup current database schema
- [ ] Backup production data
- [ ] Note rollback procedure

---

## Deployment Steps

### STEP 1: Deploy Database Changes

#### A. Open Supabase SQL Editor
1. Log into Supabase dashboard
2. Navigate to SQL Editor
3. Create new query

#### B. Execute Migration
1. Copy contents of: `/migrations/030_create_pomodoro_settings.sql`
2. Paste into SQL Editor
3. **Review carefully before running**
4. Click "Run"
5. Wait for completion

#### C. Verify Migration Success
```sql
-- Should return TRUE
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'pomodoro_settings'
);

-- Should return 10
SELECT COUNT(*)
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'pomodoro_settings';

-- Should return 4 (SELECT, INSERT, UPDATE, DELETE)
SELECT COUNT(*)
FROM pg_policies
WHERE tablename = 'pomodoro_settings';
```

✅ **Expected Output**:
- Table exists: `true`
- Column count: `10`
- Policy count: `4`

❌ **If Failed**:
- Check error messages
- Verify permissions
- Try running migration line-by-line

---

### STEP 2: Deploy Code Changes

#### A. Build Application
```bash
npm run build
```

✅ **Expected**: No errors, successful build

❌ **If Failed**:
- Check TypeScript errors
- Fix linting issues
- Rebuild

#### B. Test Locally (One More Time)
```bash
npm run dev
```

1. Navigate to `http://localhost:3001`
2. Open Pomodoro settings
3. Change focus duration: 25 → 30
4. Check console: Should see `✅ Settings successfully saved`
5. Refresh page
6. Verify: Focus duration still 30

✅ **If Success**: Proceed to production deployment

❌ **If Failed**: Debug with console logs, do NOT deploy

#### C. Deploy to Production
```bash
# For Vercel
vercel --prod

# OR commit and push (if auto-deploy is enabled)
git add .
git commit -m "fix: pomodoro settings persistence (table creation + error handling)"
git push origin main
```

---

### STEP 3: Post-Deployment Validation

#### A. Run Validation Script
In Supabase SQL Editor:
```sql
-- Copy and paste: /tests/pomodoro/validate-fix.sql
-- This runs 10 automated tests
```

✅ **Expected**: All 10 steps pass with ✅

❌ **If Failed**: Check which step failed, investigate

#### B. Manual UI Testing

**Test Case 1: New User (No Settings Row)**
1. Create new test account or clear settings
2. Navigate to dashboard
3. Open Pomodoro widget settings
4. Change focus duration: 25 → 30
5. **Expected**: Toast "Settings saved successfully" ✅
6. Refresh page
7. **Expected**: Focus duration still 30 ✅

**Test Case 2: Existing User (Has Settings Row)**
1. User who already has settings
2. Change short break: 5 → 10
3. **Expected**: Toast "Settings saved successfully" ✅
4. Refresh page
5. **Expected**: Short break still 10 ✅

**Test Case 3: Multiple Settings Changes**
1. Change focus: 25 → 30
2. Change short break: 5 → 7
3. Change long break: 15 → 20
4. Toggle sound: ON → OFF
5. **Expected**: All toasts appear ✅
6. Refresh page
7. **Expected**: All changes persist ✅

**Test Case 4: Error Handling (Simulate Failure)**
1. Temporarily disable RLS policy in Supabase
2. Try to change settings
3. **Expected**: Error toast appears ❌
4. Re-enable RLS policy
5. Try again
6. **Expected**: Success toast appears ✅

#### C. Check Console Logs

**On Settings Update** (should see):
```
🔧 [updateSettings] Called with: { focus_duration: 30 }
🔧 [updateSettings] Auth check: { hasUser: true, ... }
🔧 [updateSettings] Existing settings check: { exists: true, ... }
✅ [updateSettings] Settings successfully saved to database
```

**On Page Load** (should see):
```
📥 [loadUserSettings] Starting to load user settings...
✅ [loadUserSettings] Loaded existing settings: { focus_duration: 30, ... }
```

#### D. Check Database Directly

```sql
-- Check settings are being saved
SELECT
  user_id,
  focus_duration,
  short_break_duration,
  long_break_duration,
  updated_at
FROM pomodoro_settings
ORDER BY updated_at DESC
LIMIT 10;
```

✅ **Expected**: Recent updates visible, `updated_at` timestamps recent

---

## Post-Deployment Monitoring

### Day 1: Watch for Issues
- [ ] Check error monitoring (Sentry, etc.)
- [ ] Monitor user feedback
- [ ] Review server logs
- [ ] Check Supabase logs for errors

### Week 1: Gather Data
- [ ] How many users have settings?
- [ ] Are updates succeeding?
- [ ] Any error patterns?

### Query for Monitoring:
```sql
-- Users with settings
SELECT COUNT(DISTINCT user_id) FROM pomodoro_settings;

-- Recent updates
SELECT COUNT(*) FROM pomodoro_settings
WHERE updated_at > NOW() - INTERVAL '24 hours';

-- Common settings
SELECT
  focus_duration,
  COUNT(*) as user_count
FROM pomodoro_settings
GROUP BY focus_duration
ORDER BY user_count DESC;
```

---

## Rollback Plan (If Needed)

### If Critical Issues Arise:

#### Option 1: Revert Code Only (Keep Table)
```bash
git revert <commit-hash>
git push origin main
```

This keeps the table but reverts to old code (settings won't save but app won't break).

#### Option 2: Drop Table (Nuclear - Loses Data!)
```sql
-- ⚠️ WARNING: This deletes all user settings!
DROP TABLE IF EXISTS pomodoro_settings CASCADE;
```

Only use if table is causing critical errors.

#### Option 3: Disable RLS Temporarily
```sql
-- Emergency: Allow all operations (security risk!)
ALTER TABLE pomodoro_settings DISABLE ROW LEVEL SECURITY;

-- Later: Re-enable
ALTER TABLE pomodoro_settings ENABLE ROW LEVEL SECURITY;
```

Only use for debugging, re-enable ASAP.

---

## Success Metrics

### Immediate (Day 1)
- ✅ Migration deployed without errors
- ✅ No user reports of broken Pomodoro timer
- ✅ Settings persist across page refreshes
- ✅ Success toasts appear
- ✅ No increase in error rates

### Short-term (Week 1)
- ✅ 90%+ of active users have settings row
- ✅ No RLS policy violations
- ✅ Update queries succeeding
- ✅ Positive user feedback on persistence

### Long-term (Month 1)
- ✅ Settings persistence working reliably
- ✅ No data corruption issues
- ✅ Performance remains stable
- ✅ Users customizing settings more frequently

---

## Communication Plan

### To Users (If Needed):
```
We've fixed an issue where Pomodoro timer settings weren't saving correctly.
Your settings should now persist across sessions. If you experience any issues,
please clear your browser cache and try again.
```

### To Team:
```
Deployed fix for Pomodoro settings persistence:
- Created missing database table
- Added comprehensive error handling
- Improved user feedback with toasts
- Added detailed logging for debugging

All tests passing. Monitor for issues over next 24-48 hours.
```

---

## Files Deployed

| File | Type | Status |
|------|------|--------|
| `/migrations/030_create_pomodoro_settings.sql` | NEW | ✅ Ready |
| `/lib/contexts/PomodoroContext.tsx` | MODIFIED | ✅ Ready |
| `/tests/pomodoro/*.md` | DOCS | ✅ For reference |
| `/tests/pomodoro/*.sql` | TOOLS | ✅ For testing |

---

## Documentation Links

- **Quick Fix**: `/tests/pomodoro/QUICK-FIX.md`
- **Full Summary**: `/tests/pomodoro/SETTINGS-FIX-SUMMARY.md`
- **Debug Guide**: `/tests/pomodoro/SETTINGS-DEBUG-GUIDE.md`
- **Flow Diagram**: `/tests/pomodoro/FLOW-DIAGRAM.md`
- **Validation Script**: `/tests/pomodoro/validate-fix.sql`
- **Debug Script**: `/tests/pomodoro/settings-debug.sql`

---

## Sign-Off

**Deployed by**: _________________
**Date**: _________________
**Migration Executed**: [ ] Yes [ ] No
**Code Deployed**: [ ] Yes [ ] No
**Validation Tests Passed**: [ ] Yes [ ] No
**User Testing Complete**: [ ] Yes [ ] No

**Notes**:
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

**Status**: ⬜ Not Started | 🟡 In Progress | ✅ Complete | ❌ Failed
