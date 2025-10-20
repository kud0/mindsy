# Daily Fact API - Quick Reference

## API Endpoints

### GET `/api/daily-fact`
Returns the daily study fact for authenticated user.

**Response (Success):**
```json
{
  "success": true,
  "fact": "Did you know? ...",
  "language": "en",
  "dismissed": false,
  "collapsed": false,
  "date": "2025-01-20",
  "generated": true
}
```

**Response (Error):**
```json
{
  "error": "Error message",
  "details": "Technical details"
}
```

### PATCH `/api/daily-fact`
Update fact state (dismiss or collapse).

**Request Body:**
```json
{
  "dismissed": true,  // Optional
  "collapsed": false  // Optional
}
```

**Response:**
```json
{
  "success": true,
  "message": "Daily fact state updated",
  "dismissed": true,
  "collapsed": false
}
```

---

## Status Codes

| Code | Meaning | Action |
|------|---------|--------|
| 200 | Success | Use fact data |
| 401 | Not authenticated | Redirect to login |
| 404 | Profile not found | Check user setup |
| 500 | Server error | Check logs |

---

## Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| "Authentication required" | User not logged in | Log in |
| "Database schema error" | Missing columns | Run migration 021 |
| "No completed lectures found" | User has no lectures | Upload content |
| "AI service authentication failed" | Invalid GROK_API_KEY | Check .env.local |
| "Rate limit exceeded" | Too many API calls | Wait 1 minute |
| "User profile not found" | Profile missing | Check database |

---

## Log Emoji Guide

| Emoji | Meaning | Example |
|-------|---------|---------|
| 🔍 | Request received | `🔍 [Daily Fact API] GET request received` |
| ✅ | Success checkpoint | `✅ [Daily Fact API] User authenticated: user-123` |
| ❌ | Error occurred | `❌ [Daily Fact API] Failed to generate fact` |
| ⚠️ | Warning | `⚠️ [Daily Fact API] No authenticated user found` |
| 💡 | Info (generation) | `💡 [Daily Fact API] Generating new daily fact` |

---

## Database Schema

### Profiles Table Columns

```sql
daily_fact_text      TEXT      -- The fact content
daily_fact_date      DATE      -- When fact was generated
daily_fact_dismissed BOOLEAN   -- User dismissed it
daily_fact_collapsed BOOLEAN   -- User minimized it
daily_fact_language  TEXT      -- Language code (en, es, fr, etc.)
```

### Quick DB Queries

**Check fact:**
```sql
SELECT daily_fact_text, daily_fact_date, daily_fact_language
FROM profiles WHERE user_id = 'user-id';
```

**Reset fact:**
```sql
UPDATE profiles
SET daily_fact_text = NULL, daily_fact_date = NULL, daily_fact_dismissed = false
WHERE user_id = 'user-id';
```

**Check lectures:**
```sql
SELECT COUNT(*) FROM jobs
WHERE user_id = 'user-id' AND status = 'completed';
```

---

## Environment Variables

```bash
# Required for daily fact feature
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
GROK_API_KEY=xai-xxxxxx
```

---

## Test Commands

### Manual API Test

```bash
# Get fact
curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/daily-fact

# Dismiss fact
curl -X PATCH \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"dismissed": true}' \
     http://localhost:3001/api/daily-fact
```

### Get Access Token (Browser Console)

```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log(session.access_token);
```

---

## Troubleshooting Flowchart

```
"Failed to fetch daily fact"
    ↓
Check server logs for emoji prefix
    ↓
┌────────────────────────────────────┐
│ ⚠️ "No authenticated user found"   │ → User not logged in → Log in
├────────────────────────────────────┤
│ ❌ code: '42703' (column missing)  │ → Run migration 021
├────────────────────────────────────┤
│ "No lectures found"                │ → Upload content
├────────────────────────────────────┤
│ "AUTHENTICATION_ERROR"             │ → Check GROK_API_KEY
├────────────────────────────────────┤
│ "RATE_LIMIT_ERROR"                 │ → Wait 1 minute
└────────────────────────────────────┘
```

---

## Performance Benchmarks

| Operation | Expected Time |
|-----------|---------------|
| Cached fact | <100ms |
| New fact generation | 1-3 seconds |
| Dismiss/collapse | <50ms |
| Language detection | <1ms |

---

## Files Reference

| File | Purpose |
|------|---------|
| `app/api/daily-fact/route.ts` | API route implementation |
| `lib/daily-fact-generator.ts` | Fact generation logic |
| `lib/grok-client.ts` | Grok AI integration |
| `lib/language-utils.ts` | Language detection |
| `migrations/021_add_daily_fact.sql` | Database schema |
| `tests/api/daily-fact.test.ts` | Integration tests |
| `tests/lib/daily-fact-generator.test.ts` | Unit tests |
| `docs/DAILY-FACT-DEBUG-GUIDE.md` | Detailed debugging |
| `docs/DAILY-FACT-MANUAL-TEST.md` | Manual testing guide |

---

## Common Tasks

### Reset for Testing

```sql
UPDATE profiles
SET daily_fact_text = NULL,
    daily_fact_date = NULL,
    daily_fact_dismissed = false,
    daily_fact_collapsed = false
WHERE user_id = 'user-id';
```

### Force Regeneration

```sql
UPDATE profiles
SET daily_fact_date = CURRENT_DATE - INTERVAL '1 day'
WHERE user_id = 'user-id';
```

### Check Fact Status

```sql
SELECT
  CASE
    WHEN daily_fact_text IS NULL THEN 'No fact'
    WHEN daily_fact_dismissed THEN 'Dismissed'
    WHEN daily_fact_date != CURRENT_DATE THEN 'Outdated'
    ELSE 'Valid'
  END as status,
  daily_fact_text,
  daily_fact_date
FROM profiles
WHERE user_id = 'user-id';
```

---

## Support Languages

| Code | Language | Example Fact Start |
|------|----------|-------------------|
| en | English | "Did you know?" |
| es | Spanish | "¿Sabías que?" |
| fr | French | "Saviez-vous que?" |
| de | German | "Wusstest du?" |
| it | Italian | "Lo sapevi?" |
| pt | Portuguese | "Você sabia?" |

Detection is automatic based on lecture content.

---

## Quick Debug Checklist

When debugging an issue:

1. [ ] Check server logs (terminal)
2. [ ] Check browser console (F12)
3. [ ] Verify user authenticated
4. [ ] Check database columns exist
5. [ ] Verify GROK_API_KEY set
6. [ ] Check user has lectures
7. [ ] Check fact date vs today
8. [ ] Verify API response status code

---

## Links

- **Detailed Guide:** `docs/DAILY-FACT-DEBUG-GUIDE.md`
- **Manual Testing:** `docs/DAILY-FACT-MANUAL-TEST.md`
- **Fix Summary:** `docs/DAILY-FACT-FIX-SUMMARY.md`
- **Migration:** `migrations/021_add_daily_fact.sql`

---

**Last Updated:** 2025-01-20
