# Daily Fact API - Manual Testing Guide

Since the project doesn't have a test framework configured yet, use this guide to manually test the daily fact API.

## Prerequisites

1. **Development server running:**
   ```bash
   npm run dev
   ```

2. **Environment variables set:**
   ```bash
   # Check .env.local has:
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-key
   GROK_API_KEY=your-grok-key
   ```

3. **Database migration run:**
   ```sql
   -- Run migrations/021_add_daily_fact.sql on Supabase
   ```

4. **User authenticated:**
   - Log in through the app
   - Get access token from browser cookies or dev tools

## Test Cases

### Test 1: Get Daily Fact (First Time)

**Expected:** Generate new fact for user with lectures

**Steps:**

1. Get your access token:
   ```javascript
   // In browser console (on any authenticated page)
   const { data: { session } } = await window.supabase.auth.getSession();
   console.log('Token:', session.access_token);
   ```

2. Call API:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:3001/api/daily-fact
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "fact": "Did you know? [fascinating fact related to your lectures]",
     "language": "en",
     "dismissed": false,
     "collapsed": false,
     "date": "2025-01-20",
     "generated": true
   }
   ```

4. **Check Server Logs:**
   ```
   🔍 [Daily Fact API] GET request received
   ✅ [Daily Fact API] User authenticated: user-123
   ✅ [Daily Fact API] Profile fetched: { hasFactText: false, ... }
   💡 [Daily Fact API] Generating new daily fact for user: user-123
   💡 Generating daily fact for user: user-123
   Found 5 lectures for fact generation
   Recent topics: [...]
   💡 Grok API: Generating daily study fact...
   ✅ Grok API daily fact generated in 1234ms
   ✅ Daily fact saved to user profile
   ✅ [Daily Fact API] Fact generated successfully
   ```

---

### Test 2: Get Daily Fact (Second Time - Cached)

**Expected:** Return same fact (cached, not regenerated)

**Steps:**

1. Call API again (immediately after Test 1):
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:3001/api/daily-fact
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "fact": "[same fact as before]",
     "language": "en",
     "dismissed": false,
     "collapsed": false,
     "date": "2025-01-20",
     "generated": false  // ← Notice: false (not regenerated)
   }
   ```

3. **Check Server Logs:**
   ```
   🔍 [Daily Fact API] GET request received
   ✅ [Daily Fact API] User authenticated: user-123
   ✅ [Daily Fact API] Profile fetched: { hasFactText: true, factDate: '2025-01-20', ... }
   ✅ [Daily Fact API] Returning existing fact for today
   ```

4. **Verify:** Response should be instant (<100ms)

---

### Test 3: Dismiss Fact

**Expected:** Mark fact as dismissed

**Steps:**

1. Call PATCH endpoint:
   ```bash
   curl -X PATCH \
        -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"dismissed": true}' \
        http://localhost:3001/api/daily-fact
   ```

2. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Daily fact state updated",
     "dismissed": true
   }
   ```

3. Call GET again:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:3001/api/daily-fact
   ```

4. **Expected Response:**
   ```json
   {
     "success": true,
     "fact": null,  // ← Dismissed, so fact is null
     "dismissed": true,
     "collapsed": false,
     "date": "2025-01-20"
   }
   ```

---

### Test 4: Collapse Fact

**Expected:** Mark fact as collapsed (minimized)

**Steps:**

1. Reset dismissed state first:
   ```bash
   curl -X PATCH \
        -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"dismissed": false}' \
        http://localhost:3001/api/daily-fact
   ```

2. Collapse fact:
   ```bash
   curl -X PATCH \
        -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -d '{"collapsed": true}' \
        http://localhost:3001/api/daily-fact
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "message": "Daily fact state updated",
     "collapsed": true
   }
   ```

4. Call GET:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:3001/api/daily-fact
   ```

5. **Expected Response:**
   ```json
   {
     "success": true,
     "fact": "[your fact]",
     "language": "en",
     "dismissed": false,
     "collapsed": true,  // ← Collapsed state preserved
     "date": "2025-01-20",
     "generated": false
   }
   ```

---

### Test 5: Regenerate Next Day

**Expected:** Generate new fact when date changes

**Steps:**

1. Manually update date in database to yesterday:
   ```sql
   UPDATE profiles
   SET daily_fact_date = CURRENT_DATE - INTERVAL '1 day'
   WHERE user_id = 'your-user-id';
   ```

2. Call API:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:3001/api/daily-fact
   ```

3. **Expected Response:**
   ```json
   {
     "success": true,
     "fact": "[new fact, different from before]",
     "language": "en",
     "dismissed": false,
     "collapsed": false,
     "date": "2025-01-20",  // ← Today's date
     "generated": true      // ← Regenerated
   }
   ```

4. **Check Server Logs:**
   ```
   ✅ [Daily Fact API] Profile fetched: { hasFactText: true, factDate: '2025-01-19', ... }
   💡 [Daily Fact API] Generating new daily fact for user: ...
   ```

---

### Test 6: Error - No Authentication

**Expected:** Return 401 error

**Steps:**

1. Call API without token:
   ```bash
   curl http://localhost:3001/api/daily-fact
   ```

2. **Expected Response:**
   ```json
   {
     "error": "Authentication required"
   }
   ```

3. **Status Code:** 401

4. **Server Logs:**
   ```
   🔍 [Daily Fact API] GET request received
   ⚠️ [Daily Fact API] No authenticated user found
   ```

---

### Test 7: Error - No Lectures

**Expected:** Return error about missing lectures

**Steps:**

1. Test with user who has NO lectures:
   ```sql
   -- Check user's lectures
   SELECT COUNT(*) FROM jobs
   WHERE user_id = 'your-user-id' AND status = 'completed';
   -- Should be 0
   ```

2. Call API:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:3001/api/daily-fact
   ```

3. **Expected Response:**
   ```json
   {
     "error": "No completed lectures found. Upload some content first!",
     "details": "No lectures found for this user"
   }
   ```

4. **Server Logs:**
   ```
   💡 [Daily Fact API] Generating new daily fact for user: ...
   💡 Generating daily fact for user: ...
   No lectures found for user: ...
   ❌ [Daily Fact API] Failed to generate fact: {
     error: 'No lectures found for this user',
     errorCode: undefined
   }
   ```

---

### Test 8: Error - Missing Database Columns

**Expected:** Return schema error

**Steps:**

1. Remove column (temporarily):
   ```sql
   ALTER TABLE profiles DROP COLUMN daily_fact_text;
   ```

2. Call API:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:3001/api/daily-fact
   ```

3. **Expected Response:**
   ```json
   {
     "error": "Database schema error - daily fact columns may not exist. Please run migration 021_add_daily_fact.sql",
     "details": "column \"daily_fact_text\" does not exist"
   }
   ```

4. **Server Logs:**
   ```
   ❌ [Daily Fact API] Error fetching profile: {
     error: ...,
     code: '42703',
     message: 'column "daily_fact_text" does not exist',
     ...
   }
   ```

5. **Restore column:**
   ```sql
   -- Re-run migration
   \i migrations/021_add_daily_fact.sql
   ```

---

### Test 9: Error - Invalid Grok API Key

**Expected:** Return authentication error

**Steps:**

1. Temporarily break API key:
   ```bash
   # In .env.local
   GROK_API_KEY=invalid-key-12345
   ```

2. Restart dev server:
   ```bash
   npm run dev
   ```

3. Reset fact in database:
   ```sql
   UPDATE profiles
   SET daily_fact_text = NULL, daily_fact_date = NULL
   WHERE user_id = 'your-user-id';
   ```

4. Call API:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:3001/api/daily-fact
   ```

5. **Expected Response:**
   ```json
   {
     "error": "AI service authentication failed. Please verify GROK_API_KEY.",
     "details": "Grok authentication failed - check API key"
   }
   ```

6. **Server Logs:**
   ```
   Grok daily fact generation error: AuthenticationError
   ❌ [Daily Fact API] Failed to generate fact: {
     error: 'Grok authentication failed - check API key',
     errorCode: 'AUTHENTICATION_ERROR'
   }
   ```

7. **Restore API key:**
   ```bash
   # Fix .env.local with correct key
   GROK_API_KEY=xai-your-real-key

   # Restart server
   npm run dev
   ```

---

### Test 10: Language Detection

**Expected:** Detect language from lecture titles

**Steps:**

1. Create Spanish lecture:
   ```sql
   INSERT INTO jobs (user_id, lecture_title, course_subject, status)
   VALUES ('your-user-id', 'Introducción a la Biología', 'Ciencias', 'completed');
   ```

2. Reset fact:
   ```sql
   UPDATE profiles
   SET daily_fact_text = NULL, daily_fact_date = NULL
   WHERE user_id = 'your-user-id';
   ```

3. Call API:
   ```bash
   curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
        http://localhost:3001/api/daily-fact
   ```

4. **Expected Response:**
   ```json
   {
     "success": true,
     "fact": "¿Sabías que...? [Spanish fact]",
     "language": "es",  // ← Spanish detected
     "dismissed": false,
     "collapsed": false,
     "date": "2025-01-20",
     "generated": true
   }
   ```

5. **Server Logs:**
   ```
   Found 1 lectures for fact generation
   Recent topics: ['Introducción a la Biología (Ciencias)']
   Detected language: es
   💡 Grok API: Generating daily study fact with grok-4-fast-reasoning {
     topicsCount: 1,
     language: 'es'
   }
   ```

---

## Database Verification

### Check Fact in Database

```sql
SELECT
  user_id,
  daily_fact_text,
  daily_fact_date,
  daily_fact_dismissed,
  daily_fact_collapsed,
  daily_fact_language
FROM profiles
WHERE user_id = 'your-user-id';
```

**Expected Output:**
```
user_id    | daily_fact_text                        | daily_fact_date | daily_fact_dismissed | daily_fact_collapsed | daily_fact_language
-----------+----------------------------------------+-----------------+---------------------+---------------------+--------------------
user-123   | Did you know? Mitochondria are...      | 2025-01-20      | false               | false               | en
```

### Reset Fact for Testing

```sql
-- Reset all fact data
UPDATE profiles
SET
  daily_fact_text = NULL,
  daily_fact_date = NULL,
  daily_fact_dismissed = false,
  daily_fact_collapsed = false,
  daily_fact_language = NULL
WHERE user_id = 'your-user-id';
```

---

## Browser Testing (React Component)

If you're testing the UI component that displays the fact:

### Test in Browser Console

```javascript
// 1. Call API directly
const response = await fetch('/api/daily-fact', {
  headers: {
    'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token
  }
});
const data = await response.json();
console.log('Daily fact:', data);

// 2. Check component state (if using React DevTools)
// Find component in React DevTools and inspect state

// 3. Trigger actions
// Click dismiss button, check if PATCH is called
// Network tab should show:
// PATCH /api/daily-fact with body: {"dismissed": true}
```

---

## Performance Testing

### Test Response Times

```bash
# Time the API request
time curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
          http://localhost:3001/api/daily-fact

# Expected:
# - Cached fact: <100ms
# - New fact generation: 1-3 seconds (Grok API)
```

### Check Grok API Performance

Look for this log:
```
✅ Grok API daily fact generated in 1234ms
```

**Good:** 500ms - 2000ms
**Acceptable:** 2000ms - 5000ms
**Slow:** >5000ms (check API rate limits or network)

---

## Test Checklist

Use this checklist to verify all functionality:

- [ ] **Test 1:** First-time fact generation works
- [ ] **Test 2:** Cached fact returns instantly
- [ ] **Test 3:** Dismiss fact works
- [ ] **Test 4:** Collapse fact works
- [ ] **Test 5:** New fact generated next day
- [ ] **Test 6:** 401 error when not authenticated
- [ ] **Test 7:** Error message for no lectures
- [ ] **Test 8:** Schema error detected properly
- [ ] **Test 9:** Grok API auth error handled
- [ ] **Test 10:** Language detection works
- [ ] **Database:** Fact saved correctly
- [ ] **Performance:** Cached <100ms, Generated 1-3s
- [ ] **Logs:** All emoji prefixes showing

---

## Troubleshooting

### Issue: "Cannot read properties of null"

**Check:**
```javascript
// In browser console
const { data: { user } } = await supabase.auth.getUser();
console.log('User:', user);  // Should not be null
```

### Issue: "Network request failed"

**Check:**
1. Dev server running? `npm run dev`
2. Correct port? `http://localhost:3001`
3. CORS headers? (should be fine for same-origin)

### Issue: Fact not updating in UI

**Check:**
1. React component refetching data?
2. Cache invalidation working?
3. Browser console for errors

---

## Next Steps

Once all manual tests pass, consider:

1. **Add automated testing:**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom
   ```

2. **Run the test files:**
   ```bash
   npm run test tests/api/daily-fact.test.ts
   npm run test tests/lib/daily-fact-generator.test.ts
   ```

3. **Set up CI/CD:** Run tests on every commit

---

For detailed debugging help, see: `docs/DAILY-FACT-DEBUG-GUIDE.md`
