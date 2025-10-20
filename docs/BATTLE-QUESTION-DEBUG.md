# Battle Question Generation - Debug Report

**Status:** Enhanced logging and error handling added
**Date:** 2025-10-20
**Issue:** "Failed to generate questions for battle" error

---

## ✅ CONFIRMED: Battle Questions Use Grok AI

**YES**, the battle question generation system uses **Grok AI (xAI)**, not OpenAI.

### Integration Details

**File:** `/lib/battles/question-generator.ts`
**Function:** `generateQuestionsWithAI()` (lines 221-352)
**AI Service:** Grok AI via OpenAI-compatible SDK

**Configuration:**
```typescript
// Grok client initialized in /lib/grok-client.ts
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,  // ✅ Uses GROK_API_KEY
  baseURL: 'https://api.x.ai/v1'     // ✅ Grok endpoint
});

// Model used for battles
model: 'grok-4-fast-reasoning'
```

**API Endpoint:** `https://api.x.ai/v1/chat/completions`
**Environment Variable:** `GROK_API_KEY`

---

## 🔍 Root Cause Analysis

### Potential Issues

#### Issue 1: Missing GROK_API_KEY ⚠️

**Symptom:** Empty response from AI generation
**Cause:** Environment variable not set
**Fix Applied:** Added validation check at function start

```typescript
// Now checks API key before making request
if (!config.grokApiKey) {
  console.error('❌ GROK_API_KEY environment variable is not set!');
  throw new Error('GROK_API_KEY is required for battle question generation');
}
```

#### Issue 2: Empty Storage Files 📁

**Symptom:** No content extracted from lectures
**Cause:** `json_file_path` exists but file is empty or malformed
**Fix Applied:** Enhanced logging to track content extraction

```typescript
console.log(`✅ Extracted content from: ${job.lecture_title} (${content.length} chars)`);
console.log(`📝 Total lectures with content: ${lectureContents.length}`);
```

#### Issue 3: Invalid Grok API Key 🔑

**Symptom:** 401 Authentication error
**Cause:** API key is set but invalid/expired
**Fix Applied:** Better error detection and reporting

```typescript
if (error?.status === 401 || error?.code === 'invalid_api_key') {
  console.error('🔑 Authentication error - GROK_API_KEY is invalid or missing');
}
```

#### Issue 4: Grok API Rate Limits ⏱️

**Symptom:** 429 Rate limit error
**Cause:** Too many requests to Grok API
**Fix Applied:** Specific logging for rate limits

```typescript
if (error?.status === 429) {
  console.error('⏱️ Rate limit exceeded on Grok API');
}
```

---

## 🛠️ Changes Made

### 1. Enhanced Error Logging (`/lib/battles/question-generator.ts`)

**Lines 236-242:** Added GROK_API_KEY validation
```typescript
// Verify Grok API key is configured
const { config } = await import('@/lib/config');
if (!config.grokApiKey) {
  console.error('❌ GROK_API_KEY environment variable is not set!');
  throw new Error('GROK_API_KEY is required for battle question generation');
}
console.log('✅ Grok API key is configured');
```

**Lines 278-286:** Added detailed request logging
```typescript
console.log('📤 Sending request to Grok AI...', {
  model: 'grok-4-fast-reasoning',
  requestedQuestions: count,
  contentLength: combinedContent.length,
  promptLength: prompt.length
});
console.log('🔑 Using Grok API endpoint: https://api.x.ai/v1');
```

**Lines 329-351:** Enhanced error handling
```typescript
catch (error: any) {
  console.error('❌ Error generating questions with AI:', {
    error,
    message: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
    status: error?.status,
    code: error?.code,
    type: error?.type,
    apiError: error?.error
  });

  // Check for specific Grok API errors
  if (error?.status === 401 || error?.code === 'invalid_api_key') {
    console.error('🔑 Authentication error - GROK_API_KEY is invalid or missing');
  } else if (error?.status === 429) {
    console.error('⏱️ Rate limit exceeded on Grok API');
  } else if (error?.status === 500 || error?.status === 503) {
    console.error('🔧 Grok API service error - try again later');
  }

  return [];
}
```

### 2. Config Validation (`/lib/config.ts`)

**Line 33:** Added GROK_API_KEY to required environment variables
```typescript
if (!config.grokApiKey) missing.push('GROK_API_KEY');
```

### 3. API Route Error Handling (`/app/api/battles/[battleId]/start-round/route.ts`)

**Lines 108-124:** Better feedback when question generation fails
```typescript
const questions = await generateBattleQuestions(...);

if (!questions || questions.length === 0) {
  console.error('❌ Failed to generate questions - received empty array');
  return NextResponse.json(
    { error: 'Failed to generate questions for battle. Please ensure your folder has completed lectures with content, and check that GROK_API_KEY is configured.' },
    { status: 500 }
  );
}

console.log(`✅ Generated ${questions.length} questions successfully`);
```

---

## 🧪 How to Test & Debug

### Step 1: Check Environment Variable

```bash
# In your terminal or .env.local file
echo $GROK_API_KEY

# Should output: xai-xxxxxxxxxxxxx
# If empty, add to .env.local:
GROK_API_KEY=xai-your-actual-key-here
```

### Step 2: Check Server Logs

When creating a battle, watch the server console for these logs:

**Expected Success Flow:**
```
🎮 Battle Question Generation: { userId, folderId, count, difficulty }
📊 Query results: { jobsCount: X }
📚 Found X completed lectures in folder
🔍 Extracted Y existing questions
🎯 Question generation decision: { existingQuestions: Y, requiredCount: Z, needsAI: true }
🤖 Generating Z questions via AI...
🤖 AI Generation - Starting with: { jobsCount: X, requestedCount: Z }
✅ Grok API key is configured
✅ Extracted content from: Lecture 1 (12345 chars)
✅ Extracted content from: Lecture 2 (23456 chars)
📝 Total lectures with content: 2
📦 Combined content: 35801 chars
📤 Sending request to Grok AI...
🔑 Using Grok API endpoint: https://api.x.ai/v1
📥 Received response from Grok AI
✅ AI returned 10 raw questions
✅ After validation: 10 valid questions
✨ AI generated 10 questions
✅ Final: 10 questions (0 existing + 10 AI)
✅ Generated 10 questions successfully
```

**Error Patterns to Look For:**

❌ **Missing API Key:**
```
❌ GROK_API_KEY environment variable is not set!
Error: GROK_API_KEY is required for battle question generation
```
**Fix:** Add `GROK_API_KEY=xai-xxx` to `.env.local`

❌ **Invalid API Key:**
```
❌ Error generating questions with AI: { status: 401, code: 'invalid_api_key' }
🔑 Authentication error - GROK_API_KEY is invalid or missing
```
**Fix:** Verify your Grok API key at https://console.x.ai/

❌ **No Content:**
```
⚠️ No content extracted from: Lecture Title
📝 Total lectures with content: 0
❌ No content available for AI generation from any job
```
**Fix:** Ensure lectures have completed processing and have `json_file_path` in database

❌ **Rate Limit:**
```
❌ Error generating questions with AI: { status: 429 }
⏱️ Rate limit exceeded on Grok API
```
**Fix:** Wait a few minutes before trying again

### Step 3: Verify Folder Has Content

```sql
-- Run in Supabase SQL Editor
SELECT
  j.job_id,
  j.lecture_title,
  j.status,
  j.json_file_path,
  j.user_folder_id
FROM jobs j
WHERE j.user_folder_id = 'your-folder-id'
  AND j.status = 'completed'
ORDER BY j.created_at DESC;
```

**Expected:** At least one row with `status = 'completed'` and `json_file_path` not null

### Step 4: Test Storage File Access

```typescript
// In browser console on dashboard
const response = await fetch('/api/test-storage?folderId=your-folder-id');
const data = await response.json();
console.log(data);
```

### Step 5: Manual Grok API Test

Test your Grok API key directly:

```bash
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer $GROK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-4-fast-reasoning",
    "messages": [
      {"role": "user", "content": "Say hello"}
    ]
  }'
```

**Expected:** JSON response with `choices[0].message.content`
**If error:** Check API key, billing, or Grok service status

---

## 📋 Debugging Checklist

When you get "Failed to generate questions for battle", check in this order:

- [ ] **1. GROK_API_KEY is set** in `.env.local` (restart dev server after adding)
- [ ] **2. Folder has completed lectures** (check database `jobs` table)
- [ ] **3. Lectures have content files** (`json_file_path` column not null)
- [ ] **4. Storage files exist** (check Supabase Storage `generated-notes` bucket)
- [ ] **5. Storage files contain questions** (download and inspect JSON)
- [ ] **6. Grok API key is valid** (test with curl command above)
- [ ] **7. Check server console logs** (look for specific error patterns)
- [ ] **8. Grok API is operational** (check https://status.x.ai/)

---

## 🔧 Common Fixes

### Fix 1: Add GROK_API_KEY

```bash
# .env.local
GROK_API_KEY=xai-your-key-here
```

**Then restart dev server:**
```bash
npm run dev
```

### Fix 2: Regenerate Lecture Content

If storage files are missing or empty:

1. Go to the folder in dashboard
2. Delete and re-upload the lecture
3. Wait for processing to complete
4. Verify `json_file_path` is populated
5. Try creating battle again

### Fix 3: Use Different Folder

If one folder consistently fails:
- Try creating battle from a different folder with completed lectures
- This isolates whether it's a data issue or API issue

### Fix 4: Check Grok Billing

Go to https://console.x.ai/ and verify:
- API key is active
- Account has credits/billing enabled
- No service disruptions

---

## 📊 System Flow

Here's what happens when you create a battle:

```
1. User clicks "Create Battle" → sends POST to /api/battles/create
   ↓
2. Battle created with status='pending' in quiz_battles table
   ↓
3. User accepts → status changes to 'active'
   ↓
4. Frontend calls POST /api/battles/[battleId]/start-round
   ↓
5. Server calls generateBattleQuestions(userId, folderId, count)
   ↓
6. Question generator:
   - Queries jobs table for completed lectures in folder
   - Tries to extract existing questions from storage files
   - If not enough questions, calls Grok AI
   ↓
7. generateQuestionsWithAI():
   - Validates GROK_API_KEY ← NEW CHECK
   - Extracts lecture content from storage
   - Creates AI prompt
   - Calls grok.chat.completions.create() ← GROK API
   - Parses and validates response
   - Returns BattleQuestion[]
   ↓
8. Round created with questions in battle_rounds table
   ↓
9. Questions sent to frontend (without correct answers)
```

**Critical Point:** Step 7 is where failure occurs if:
- GROK_API_KEY is missing/invalid
- Storage files are empty
- Grok API returns error
- Content extraction fails

---

## 🎯 Expected Behavior

### When Folder Has Existing Questions

```typescript
// Logs:
🔍 Extracted 15 existing questions
🎯 Question generation decision: { existingQuestions: 15, requiredCount: 10, needsAI: false }
✅ Using 10 existing questions (523ms)
```

**No Grok API call made** - uses cached questions from storage

### When Folder Needs AI Generation

```typescript
// Logs:
🔍 Extracted 3 existing questions
🎯 Question generation decision: { existingQuestions: 3, requiredCount: 10, needsAI: true }
🤖 Generating 10 questions via AI...
✅ Grok API key is configured
📤 Sending request to Grok AI...
📥 Received response from Grok AI
✅ AI returned 10 raw questions
✅ After validation: 10 valid questions
✅ Final: 10 questions (3 existing + 10 AI)
```

**Grok API called** - generates fresh questions

---

## 🚀 Next Steps

1. **Restart dev server** to load new logging
2. **Try creating a battle** and watch server console
3. **Share the server logs** with the exact error you see
4. **Verify GROK_API_KEY** is in your environment
5. **Test with the curl command** to verify Grok API access

The enhanced logging will now tell you exactly where the failure occurs:
- Missing API key
- Authentication error
- Empty content
- Rate limiting
- API service error

---

## 📝 Technical Notes

### Why Grok Instead of OpenAI for Battles?

**OpenAI** is used for:
- Course folder generation (with web search via Responses API)
- Uses `gpt-5` model

**Grok** is used for:
- Study content generation
- Quiz generation
- Battle question generation
- AI explanations
- Uses `grok-4-fast-reasoning` model

**Reason:** Grok is the primary AI service for all content generation, while OpenAI is specifically for the folder structure web search feature (which requires the Responses API).

### Battle Question Sources

Questions come from two sources:

1. **Existing Questions** (from storage files):
   - Extracted from `generated-notes` bucket
   - Path stored in `jobs.json_file_path`
   - Parsed from JSON structure

2. **AI-Generated Questions** (from Grok):
   - Called when existing questions < required count
   - Uses lecture content as context
   - Returns validated BattleQuestion objects

### Question Validation

All questions (existing + AI) go through `validateAndSanitizeQuestions()`:
- Checks for required fields
- Validates options format
- Normalizes difficulty levels
- Ensures correctAnswer is A, B, C, or D
- Adds unique IDs

---

**File Modified:**
- `/lib/battles/question-generator.ts` (enhanced logging, API key validation)
- `/lib/config.ts` (added GROK_API_KEY validation)
- `/app/api/battles/[battleId]/start-round/route.ts` (better error messages)

**Action Required:**
1. Verify `GROK_API_KEY` is set in `.env.local`
2. Restart dev server: `npm run dev`
3. Try creating a battle
4. Check server console for detailed logs
5. Share logs if error persists
