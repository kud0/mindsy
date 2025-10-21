# Pomodoro Settings Persistence - Quick Fix

**TL;DR**: Table didn't exist. Run migration, deploy code, done.

---

## Fix in 3 Steps

### 1. Run Migration (Supabase SQL Editor)

```sql
-- Copy and paste: /migrations/030_create_pomodoro_settings.sql
-- Creates table + RLS policies + triggers
```

### 2. Deploy Code

```bash
npm run build && npm start
# Or: Deploy to production
```

### 3. Test

1. Open dashboard
2. Change Pomodoro settings
3. Refresh page
4. Settings should persist ✅

---

## What Changed

### Database
- ✅ Created `pomodoro_settings` table
- ✅ Added RLS policies (SELECT, INSERT, UPDATE, DELETE)
- ✅ Auto-update trigger for `updated_at`

### Code (`lib/contexts/PomodoroContext.tsx`)
- ✅ Added row existence check
- ✅ Auto-create row if missing
- ✅ Better error handling
- ✅ User feedback (success/error toasts)
- ✅ Comprehensive logging
- ✅ Verification queries

---

## Console Logs to Expect

### On Settings Update (Success)
```
🔧 [updateSettings] Called with: { focus_duration: 30 }
✅ [updateSettings] Settings successfully saved to database
```

**User sees**: "Settings saved successfully" ✅

### On Page Load
```
📥 [loadUserSettings] Starting to load user settings...
✅ [loadUserSettings] Loaded existing settings: { focus_duration: 30, ... }
```

**User sees**: Settings preserved after refresh ✅

---

## Troubleshooting

### "Table doesn't exist"
→ Run migration `/migrations/030_create_pomodoro_settings.sql`

### "Failed to update settings"
→ Check console for error details
→ Run `/tests/pomodoro/settings-debug.sql` to diagnose

### Settings still revert after refresh
→ Check browser Network tab for failed requests
→ Verify migration ran successfully
→ Check RLS policies are active

---

## Files Modified

1. `/migrations/030_create_pomodoro_settings.sql` - NEW
2. `/lib/contexts/PomodoroContext.tsx` - Enhanced logging + error handling

---

## Full Documentation

- **Detailed Guide**: `/tests/pomodoro/SETTINGS-DEBUG-GUIDE.md`
- **Summary**: `/tests/pomodoro/SETTINGS-FIX-SUMMARY.md`
- **Database Debug**: `/tests/pomodoro/settings-debug.sql`
