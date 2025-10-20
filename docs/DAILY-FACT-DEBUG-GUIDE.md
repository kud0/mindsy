# Daily Fact API - Debugging Guide

## Overview

The Daily Fact API (`/api/daily-fact`) generates and serves AI-powered study facts to users based on their recent lecture content. This guide helps debug common issues.

## Architecture

```
Client Request
    ↓
GET /api/daily-fact
    ↓
1. Authenticate user (Supabase Auth)
    ↓
2. Fetch user profile (daily_fact_* columns)
    ↓
3. Check if fact exists for today
    ↓
4a. Return existing fact (if valid)
    ↓
4b. Generate new fact (if needed)
    ↓
    → Fetch user's recent lectures (jobs table)
    → Detect language from lecture titles
    → Call Grok AI to generate fact
    → Save fact to profile
    ↓
5. Return fact to client
```

## Common Issues & Solutions

### Issue 1: "Authentication required" (401)

**Cause:** User not logged in or session expired.

**Debug Steps:**
1. Check browser cookies - look for Supabase auth tokens
2. Verify user is logged in: `supabase.auth.getUser()`
3. Check session expiration

**Solution:**
```typescript
// Ensure user is logged in before calling API
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  // Redirect to login
  router.push('/auth/signin');
}
```

**Server Logs:**
```
⚠️ [Daily Fact API] No authenticated user found
```

---

### Issue 2: "Database schema error" (500)

**Cause:** Migration `021_add_daily_fact.sql` not run - database columns don't exist.

**Debug Steps:**
1. Check database schema:
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'daily_fact%';
```

2. Expected columns:
   - `daily_fact_text` (TEXT)
   - `daily_fact_date` (DATE)
   - `daily_fact_dismissed` (BOOLEAN)
   - `daily_fact_collapsed` (BOOLEAN)
   - `daily_fact_language` (TEXT)

**Solution:**
```bash
# Run migration on Supabase
psql -h db.your-project.supabase.co \
     -U postgres \
     -d postgres \
     -f migrations/021_add_daily_fact.sql
```

**Server Logs:**
```
❌ [Daily Fact API] Error fetching profile:
{
  error: ...,
  code: '42703',  # PostgreSQL error code for missing column
  message: 'column "daily_fact_text" does not exist'
}
```

---

### Issue 3: "No completed lectures found" (500)

**Cause:** User has no completed lectures in the `jobs` table.

**Debug Steps:**
1. Check user's lectures:
```sql
SELECT job_id, lecture_title, status, created_at
FROM jobs
WHERE user_id = 'user-uuid'
  AND status = 'completed'
ORDER BY created_at DESC
LIMIT 10;
```

2. Verify at least one lecture exists

**Solution:**
- User needs to upload content (audio, YouTube, PDF) first
- Wait for processing to complete (`status = 'completed'`)
- Then daily fact generation will work

**Server Logs:**
```
💡 [Daily Fact API] Generating new daily fact for user: user-123
💡 Generating daily fact for user: user-123
No lectures found for user: user-123
❌ [Daily Fact API] Failed to generate fact: {
  error: 'No lectures found for this user',
  errorCode: undefined
}
```

---

### Issue 4: "AI service authentication failed" (500)

**Cause:** Missing or invalid `GROK_API_KEY` environment variable.

**Debug Steps:**
1. Check environment variables:
```bash
# In .env.local
cat .env.local | grep GROK_API_KEY

# Should output:
GROK_API_KEY=xai-xxxxxxxxxxxxx
```

2. Verify API key is valid at https://x.ai/api

3. Check config loading:
```typescript
import { config } from '@/lib/config';
console.log('Grok API Key exists:', !!config.grokApiKey);
```

**Solution:**
```bash
# Add to .env.local
GROK_API_KEY=your-actual-grok-api-key-here

# Restart dev server
npm run dev
```

**Server Logs:**
```
❌ [Daily Fact API] Failed to generate fact: {
  error: 'Grok authentication failed - check API key',
  errorCode: 'AUTHENTICATION_ERROR'
}
```

---

### Issue 5: "Rate limit exceeded" (500)

**Cause:** Too many requests to Grok API.

**Debug Steps:**
1. Check Grok API dashboard for rate limits
2. Review request frequency

**Solution:**
- Wait for rate limit reset (usually 1 minute)
- Implement request throttling on client
- Cache facts properly (should only generate once per day)

**Server Logs:**
```
Grok daily fact generation error: RateLimitError
❌ [Daily Fact API] Failed to generate fact: {
  error: 'Grok rate limit exceeded - please try again later',
  errorCode: 'RATE_LIMIT_ERROR'
}
```

---

### Issue 6: "User profile not found" (404)

**Cause:** User exists in `auth.users` but not in `profiles` table.

**Debug Steps:**
1. Check profiles table:
```sql
SELECT user_id, username, created_at
FROM profiles
WHERE user_id = 'user-uuid';
```

2. Verify trigger creates profile on signup

**Solution:**
```sql
-- Manually create profile (should be automated by trigger)
INSERT INTO profiles (user_id, username)
VALUES ('user-uuid', 'username');
```

**Server Logs:**
```
✅ [Daily Fact API] User authenticated: user-123
❌ [Daily Fact API] No profile found for user: user-123
```

---

## Testing & Validation

### Manual Testing

1. **Check endpoint directly:**
```bash
# Development
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
     http://localhost:3001/api/daily-fact

# Should return:
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

2. **Check database state:**
```sql
SELECT
  user_id,
  daily_fact_text,
  daily_fact_date,
  daily_fact_dismissed,
  daily_fact_language
FROM profiles
WHERE user_id = 'your-user-id';
```

### Automated Testing

Run unit and integration tests:

```bash
# Run all tests
npm run test

# Run specific test file
npm run test tests/api/daily-fact.test.ts

# Run with coverage
npm run test:coverage
```

---

## Server Logs Reference

### Successful Flow

```
🔍 [Daily Fact API] GET request received
✅ [Daily Fact API] User authenticated: user-123
✅ [Daily Fact API] Profile fetched: {
  hasFactText: false,
  factDate: null,
  dismissed: false,
  collapsed: false,
  language: null
}
💡 [Daily Fact API] Generating new daily fact for user: user-123
💡 Generating daily fact for user: user-123
Found 5 lectures for fact generation
Recent topics: ['Biology 101 (Science)', 'Chemistry Basics (Science)', ...]
Detected language: en
💡 Grok API: Generating daily study fact with grok-4-fast-reasoning {
  topicsCount: 5,
  language: 'en'
}
✅ Grok API daily fact generated in 1234ms
✅ Daily fact saved to user profile
✅ [Daily Fact API] Fact generated successfully
```

### Error Flow (No Lectures)

```
🔍 [Daily Fact API] GET request received
✅ [Daily Fact API] User authenticated: user-123
✅ [Daily Fact API] Profile fetched: { hasFactText: false, ... }
💡 [Daily Fact API] Generating new daily fact for user: user-123
💡 Generating daily fact for user: user-123
No lectures found for user: user-123
❌ [Daily Fact API] Failed to generate fact: {
  error: 'No lectures found for this user',
  errorCode: undefined
}
```

---

## API Response Schema

### Successful Response

```typescript
{
  success: true,
  fact: string,           // 2-3 sentence fact
  language: string,       // 'en', 'es', 'fr', etc.
  dismissed: boolean,     // false
  collapsed: boolean,     // false
  date: string,           // YYYY-MM-DD
  generated: boolean      // true if just generated, false if cached
}
```

### Dismissed Response

```typescript
{
  success: true,
  fact: null,
  dismissed: true,
  collapsed: boolean,
  date: string
}
```

### Error Response

```typescript
{
  error: string,          // User-friendly error message
  details?: string        // Technical details (optional)
}
```

---

## Environment Variables Checklist

Required for daily fact feature:

- [x] `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- [x] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- [x] `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key (bypasses RLS)
- [x] `GROK_API_KEY` - xAI Grok API key

---

## Database Schema Checklist

Verify these columns exist in `profiles` table:

```sql
-- Run this query to verify schema
SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'profiles'
  AND column_name LIKE 'daily_fact%'
ORDER BY column_name;
```

Expected output:
```
column_name           | data_type | column_default | is_nullable
---------------------+-----------+----------------+-------------
daily_fact_collapsed | boolean   | false          | YES
daily_fact_date      | date      | NULL           | YES
daily_fact_dismissed | boolean   | false          | YES
daily_fact_language  | text      | NULL           | YES
daily_fact_text      | text      | NULL           | YES
```

---

## Quick Troubleshooting Checklist

When "Failed to fetch daily fact" appears:

1. **Check user authentication**
   - [ ] User logged in?
   - [ ] Session valid?
   - [ ] Auth cookies present?

2. **Check database schema**
   - [ ] Migration 021 run?
   - [ ] All columns exist?
   - [ ] Profile exists for user?

3. **Check environment variables**
   - [ ] `GROK_API_KEY` set?
   - [ ] `.env.local` loaded?
   - [ ] Server restarted after env changes?

4. **Check user data**
   - [ ] User has completed lectures?
   - [ ] Lectures visible in database?
   - [ ] Status = 'completed'?

5. **Check server logs**
   - [ ] Open browser DevTools > Network
   - [ ] Check terminal for server logs
   - [ ] Look for specific error messages

---

## Support & Resources

- **Migration File:** `migrations/021_add_daily_fact.sql`
- **API Route:** `app/api/daily-fact/route.ts`
- **Generator Logic:** `lib/daily-fact-generator.ts`
- **Grok Client:** `lib/grok-client.ts`
- **Unit Tests:** `tests/lib/daily-fact-generator.test.ts`
- **Integration Tests:** `tests/api/daily-fact.test.ts`

---

## Development Tips

1. **Enable verbose logging:**
```typescript
// In lib/daily-fact-generator.ts
console.log('💡 Generating daily fact for user:', userId);
console.log('Found X lectures for fact generation');
console.log('Recent topics:', recentTopics);
```

2. **Test fact generation manually:**
```typescript
import { generateDailyFact } from '@/lib/daily-fact-generator';

const result = await generateDailyFact('your-user-id');
console.log(result);
```

3. **Reset fact for testing:**
```sql
UPDATE profiles
SET daily_fact_text = NULL,
    daily_fact_date = NULL,
    daily_fact_dismissed = false
WHERE user_id = 'your-user-id';
```

---

## Performance Notes

- Daily fact should only generate **once per day** per user
- Generation takes ~1-3 seconds (Grok API call)
- Cached facts return in <100ms
- Language detection is client-side (fast)

---

## Security Notes

- Service role key bypasses RLS - **only** use server-side
- Never expose `GROK_API_KEY` to client
- Validate user authentication before all operations
- Rate limiting recommended for production
