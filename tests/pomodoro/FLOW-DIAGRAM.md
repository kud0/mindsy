# Pomodoro Settings - Before vs After Flow

## BEFORE (Broken) 🔴

```
User moves slider (25 → 30)
  ↓
onValueCommit fires
  ↓
updateSettings({ focus_duration: 30 })
  ↓
Fire-and-forget async update (in .then())
  ↓
Database UPDATE fails silently ❌
(Table doesn't exist!)
  ↓
No error shown to user ❌
  ↓
Local state updates to 30 ✅
(User thinks it worked)
  ↓
------- User refreshes page -------
  ↓
loadUserSettings()
  ↓
Database SELECT fails silently ❌
  ↓
Falls back to DEFAULT_SETTINGS
  ↓
Slider shows 25 again 🔴
(User frustrated: "It didn't save!")
```

---

## AFTER (Fixed) ✅

```
User moves slider (25 → 30)
  ↓
onValueCommit fires
  ↓
updateSettings({ focus_duration: 30 })
  ↓
📥 Log: "Called with: { focus_duration: 30 }"
  ↓
Check auth: User authenticated? ✅
  ↓
📥 Log: "Auth check: { hasUser: true, userId: '...' }"
  ↓
Check if settings row exists
SELECT * FROM pomodoro_settings WHERE user_id = ...
  ↓
📥 Log: "Existing settings check: { exists: true, ... }"
  ↓
┌──────────────────────────────────────┐
│ If row doesn't exist:                │
│   1. Create default row              │
│   2. Merge with new settings         │
│   3. INSERT into database            │
│   4. Show success toast              │
│   5. Update local state              │
│   6. Return early                    │
└──────────────────────────────────────┘
  ↓
Row exists → Prepare UPDATE
  ↓
📥 Log: "Preparing update: { oldSettings: {...}, newSettings: {...} }"
  ↓
Execute UPDATE query
UPDATE pomodoro_settings
SET focus_duration = 30, updated_at = NOW()
WHERE user_id = ...
  ↓
📥 Log: "Database update result: { success: true, rowsAffected: 1 }"
  ↓
┌──────────────────────────────────────┐
│ Error Handling:                      │
│                                      │
│ If error:                            │
│   - Log full error details           │
│   - Show toast: "Failed to update"   │
│   - Rollback local state             │
│                                      │
│ If 0 rows affected:                  │
│   - Log warning                      │
│   - Show toast: "No rows affected"   │
│                                      │
│ If success:                          │
│   - Show toast: "Settings saved" ✅  │
│   - Verify with SELECT query         │
│   - Update local state               │
└──────────────────────────────────────┘
  ↓
📥 Log: "✅ Settings successfully saved to database"
  ↓
Verification SELECT query
SELECT * FROM pomodoro_settings WHERE user_id = ...
  ↓
📥 Log: "Verification check: { matches: true }"
  ↓
Local state updates to 30 ✅
  ↓
User sees: "Settings saved successfully" ✅
  ↓
------- User refreshes page -------
  ↓
loadUserSettings()
  ↓
📥 Log: "Starting to load user settings..."
  ↓
Check auth: User authenticated? ✅
  ↓
📥 Log: "Auth check: { hasUser: true, userId: '...' }"
  ↓
Execute SELECT query
SELECT * FROM pomodoro_settings WHERE user_id = ...
  ↓
📥 Log: "Database query result: { hasData: true, data: { focus_duration: 30, ... } }"
  ↓
Database returns: { focus_duration: 30, ... } ✅
  ↓
📥 Log: "✅ Loaded existing settings: { focus_duration: 30, ... }"
  ↓
Update local state with database values
  ↓
Slider shows 30 ✅
  ↓
User happy: "It saved!" 🎉
```

---

## Key Differences

| Aspect | Before (Broken) | After (Fixed) |
|--------|----------------|---------------|
| **Error Handling** | Silent failures ❌ | Loud errors with user feedback ✅ |
| **Logging** | Minimal console logs | Comprehensive step-by-step logs ✅ |
| **Row Creation** | Assumes row exists | Auto-creates if missing ✅ |
| **Verification** | No verification | SELECT query to verify ✅ |
| **User Feedback** | No success message | Success toast ✅ |
| **Rollback** | No rollback on error | Reverts local state if DB fails ✅ |
| **Database Table** | Doesn't exist ❌ | Exists with RLS ✅ |
| **Async Handling** | Fire-and-forget `.then()` | Proper `await` ✅ |

---

## Database Schema

### Before
```
❌ Table: pomodoro_settings
   (doesn't exist)
```

### After
```
✅ Table: pomodoro_settings

Columns:
  - user_id              UUID PRIMARY KEY
  - focus_duration       INTEGER (1-120)
  - short_break_duration INTEGER (1-60)
  - long_break_duration  INTEGER (1-120)
  - auto_start_breaks    BOOLEAN
  - auto_start_focus     BOOLEAN
  - sound_enabled        BOOLEAN
  - daily_goal           INTEGER (0-50)
  - created_at           TIMESTAMPTZ
  - updated_at           TIMESTAMPTZ

RLS Policies:
  ✅ SELECT - Users can view own settings
  ✅ INSERT - Users can create own settings
  ✅ UPDATE - Users can update own settings
  ✅ DELETE - Users can delete own settings

Triggers:
  ✅ Auto-update updated_at on UPDATE
```

---

## Error Handling Flow

```
updateSettings() called
  ↓
Try-Catch Block
  ↓
┌─────────────────────────────────────────────┐
│ Possible Errors:                            │
│                                             │
│ 1. No authenticated user                    │
│    → Show: "You must be logged in"          │
│    → Return early                           │
│                                             │
│ 2. Table doesn't exist                      │
│    → Log: "relation does not exist"         │
│    → Show: "Failed to update: {error}"      │
│    → Return early                           │
│                                             │
│ 3. RLS policy blocks update                 │
│    → Log: "row-level security policy"       │
│    → Show: "Failed to update: {error}"      │
│    → Rollback local state                   │
│                                             │
│ 4. No rows affected                         │
│    → Log: "Update succeeded, 0 rows"        │
│    → Show: "Settings update failed"         │
│                                             │
│ 5. Network error                            │
│    → Catch in outer try-catch               │
│    → Log full stack trace                   │
│    → Show: "Unexpected error: {message}"    │
│                                             │
│ Success Path:                               │
│    → Show: "Settings saved successfully" ✅ │
│    → Verify with SELECT                     │
│    → Update local state                     │
└─────────────────────────────────────────────┘
```

---

## Console Log Legend

| Emoji | Meaning | Example |
|-------|---------|---------|
| 🔧 | Debug info | `🔧 [updateSettings] Called with: {...}` |
| 📥 | Data loading | `📥 [loadUserSettings] Starting...` |
| ✅ | Success | `✅ Settings successfully saved` |
| ❌ | Error | `❌ Database update failed` |
| ⚠️ | Warning | `⚠️ No settings found, creating...` |
| ⚙️ | State change | `⚙️ Settings changed while idle` |
| ⏸️ | Skipped action | `⏸️ Timer active - not changing time` |

---

## Testing Path

```
1. Open DevTools Console
   ↓
2. Navigate to Dashboard
   ↓
3. Open Pomodoro Settings
   ↓
4. Move slider: 25 → 30
   ↓
5. Check console logs:
   ✅ "🔧 [updateSettings] Called with: { focus_duration: 30 }"
   ✅ "✅ Settings successfully saved to database"
   ↓
6. Verify toast appears:
   ✅ "Settings saved successfully"
   ↓
7. Refresh page
   ↓
8. Check console logs:
   ✅ "📥 [loadUserSettings] Starting..."
   ✅ "✅ Loaded existing settings: { focus_duration: 30 }"
   ↓
9. Verify slider position:
   ✅ Shows 30 (not reverted to 25)
   ↓
10. Test complete! ✅
```
