# Pomodoro Settings Persistence Debug Guide

## Problem Description

Pomodoro settings don't persist to database when changed. After page refresh, settings revert to old values.

## Root Cause Analysis

The `pomodoro_settings` table likely doesn't exist in the database, or RLS policies are preventing updates.

## Solution

1. **Run Migration**: Create the `pomodoro_settings` table
2. **Verify Setup**: Check table structure and RLS policies
3. **Test with Logging**: Use comprehensive console logs to debug

---

## Step 1: Run the Migration

Execute this migration in Supabase SQL Editor:

**File**: `/migrations/030_create_pomodoro_settings.sql`

This migration will:
- ✅ Create `pomodoro_settings` table with proper schema
- ✅ Set up RLS policies for user access
- ✅ Add auto-update trigger for `updated_at`
- ✅ Initialize settings for existing users with Pomodoro sessions

---

## Step 2: Verify Database Setup

Run the debug SQL script:

**File**: `/tests/pomodoro/settings-debug.sql`

Expected results:
```sql
-- Step 1: Table exists
true

-- Step 2: Columns
user_id                  | uuid      | NO  | (no default)
focus_duration           | integer   | NO  | 25
short_break_duration     | integer   | NO  | 5
long_break_duration      | integer   | NO  | 15
auto_start_breaks        | boolean   | NO  | false
auto_start_focus         | boolean   | NO  | false
sound_enabled            | boolean   | NO  | true
daily_goal               | integer   | NO  | 8
created_at               | timestamptz | NO  | now()
updated_at               | timestamptz | NO  | now()

-- Step 5: RLS Policies (should show 4 policies)
Users can view their own pomodoro settings
Users can insert their own pomodoro settings
Users can update their own pomodoro settings
Users can delete their own pomodoro settings
```

---

## Step 3: Test Settings Update with Logging

### A. Open Browser Console

1. Navigate to dashboard with Pomodoro widget
2. Open DevTools (F12 or Cmd+Option+I)
3. Go to Console tab

### B. Change Settings

1. Open Pomodoro settings (gear icon)
2. Move "Focus Duration" slider from 25 → 30 minutes
3. Release slider (triggers `onValueCommit`)

### C. Check Console Logs

You should see this sequence:

```
🔧 [updateSettings] Called with: { focus_duration: 30 }
🔧 [updateSettings] Auth check: { hasUser: true, userId: "abc-123-...", authError: null }
🔧 [updateSettings] Existing settings check: { exists: true, existingSettings: {...}, fetchError: null }
🔧 [updateSettings] Preparing update: { oldSettings: {...}, newSettings: {...}, updatedSettings: {...} }
🔧 [updateSettings] Starting database update...
🔧 [updateSettings] UPDATE payload: { table: "pomodoro_settings", whereClause: {...}, data: {...} }
🔧 [updateSettings] Database update result: { success: true, updateData: [...], rowsAffected: 1 }
✅ [updateSettings] Settings successfully saved to database
🔧 [updateSettings] Verification check: { verifyData: {...}, matches: true }
⚙️ [updateSettings] Settings changed while idle - auto-applying: { sessionType: "focus", newTime: 1800, ... }
```

### D. Verify Persistence

1. Refresh the page
2. Check console for load sequence:

```
📥 [loadUserSettings] Starting to load user settings...
📥 [loadUserSettings] Auth check: { hasUser: true, userId: "..." }
📥 [loadUserSettings] Database query result: { hasData: true, data: { focus_duration: 30, ... } }
✅ [loadUserSettings] Loaded existing settings: { focus_duration: 30, ... }
```

3. Verify slider shows 30 minutes (not reverted to 25)

---

## Common Issues and Solutions

### Issue 1: Table Doesn't Exist

**Symptom**:
```
❌ relation "pomodoro_settings" does not exist
```

**Solution**: Run migration `030_create_pomodoro_settings.sql`

### Issue 2: No Row for User

**Symptom**:
```
⚠️ [updateSettings] No settings found, creating new row...
✅ [updateSettings] Settings created and saved
```

**Solution**: This is expected for new users. Settings are auto-created.

### Issue 3: RLS Policy Blocking Update

**Symptom**:
```
❌ [updateSettings] Database update failed
Error: new row violates row-level security policy
```

**Solution**: Check RLS policies allow UPDATE for user's own row:
```sql
SELECT * FROM pg_policies WHERE tablename = 'pomodoro_settings';
```

### Issue 4: 0 Rows Affected

**Symptom**:
```
⚠️ [updateSettings] Update succeeded but affected 0 rows
```

**Solution**: WHERE clause isn't matching any rows. Verify `user_id` matches:
```sql
SELECT user_id FROM pomodoro_settings WHERE user_id = 'YOUR_USER_ID';
```

### Issue 5: Settings Revert After Refresh

**Symptom**:
- Update appears successful
- After refresh, old values return

**Solution**:
1. Check `updated_at` timestamp in database to confirm update
2. Verify localStorage isn't overriding database values
3. Check browser console for `loadUserSettings` logs

---

## Manual Database Verification

If logging doesn't reveal the issue, manually check database:

```sql
-- Get your user ID (run while logged in)
SELECT auth.uid();

-- Check your settings
SELECT * FROM pomodoro_settings WHERE user_id = auth.uid();

-- Update manually to test
UPDATE pomodoro_settings
SET focus_duration = 35
WHERE user_id = auth.uid();

-- Verify update worked
SELECT focus_duration FROM pomodoro_settings WHERE user_id = auth.uid();
-- Should return: 35
```

If manual UPDATE works but UI update doesn't:
- Problem is in frontend code
- Check browser Network tab for failed requests
- Verify Supabase client is initialized correctly

---

## Expected Behavior After Fix

✅ **Settings Update Flow**:
1. User moves slider → `onValueCommit` fires
2. `updateSettings()` called with new value
3. Database UPDATE executes successfully
4. Success toast shows: "Settings saved successfully"
5. Local state updates immediately
6. Timer recalculates if idle

✅ **Settings Load Flow**:
1. User refreshes page
2. `loadUserSettings()` fetches from database
3. Settings match last saved values
4. Slider positions reflect database values

---

## Testing Checklist

- [ ] Migration `030_create_pomodoro_settings.sql` executed
- [ ] Table `pomodoro_settings` exists
- [ ] Table has correct columns (10 total)
- [ ] RLS policies exist (4 policies)
- [ ] User has a row in `pomodoro_settings`
- [ ] Manual UPDATE query works
- [ ] Settings update shows success toast
- [ ] Settings update logs show "✅ Settings successfully saved"
- [ ] Page refresh preserves updated settings
- [ ] Timer recalculates when settings change (if idle)

---

## Files Modified

1. `/migrations/030_create_pomodoro_settings.sql` - **NEW** table creation
2. `/lib/contexts/PomodoroContext.tsx` - Enhanced logging in:
   - `loadUserSettings()` (lines 222-299)
   - `updateSettings()` (lines 573-763)
3. `/tests/pomodoro/settings-debug.sql` - **NEW** diagnostic queries
4. `/tests/pomodoro/SETTINGS-DEBUG-GUIDE.md` - **THIS FILE**

---

## Contact

If settings still don't persist after following this guide:
1. Share complete console logs (from load → update → refresh)
2. Share database query results from `settings-debug.sql`
3. Verify Supabase connection is working (check other features)
