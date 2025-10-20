# Battle Question Generation - Quick Fix Guide

## ✅ YES, Battles Use Grok AI

**Question:** "For the quiz generation battle we are using grok right?"
**Answer:** **YES!** Battle questions are generated using **Grok AI** (`grok-4-fast-reasoning` model).

---

## 🔍 What Was Fixed

Added **enhanced logging and validation** to help debug "Failed to generate questions" error.

### Files Modified:
1. `/lib/battles/question-generator.ts` - Added API key checks and detailed error logging
2. `/lib/config.ts` - Added GROK_API_KEY to validation
3. `/app/api/battles/[battleId]/start-round/route.ts` - Better error messages

---

## 🚨 Most Likely Issue: Missing GROK_API_KEY

### Quick Check:

```bash
# Check if GROK_API_KEY is set
grep GROK_API_KEY .env.local
```

### If Missing, Add It:

```bash
# Add to .env.local
echo "GROK_API_KEY=xai-your-key-here" >> .env.local

# Restart dev server
npm run dev
```

---

## 🧪 Test It Now

1. **Restart your dev server** (important!)
2. **Try creating a battle**
3. **Watch the server console** - you'll now see detailed logs:

**Success logs:**
```
✅ Grok API key is configured
📤 Sending request to Grok AI...
📥 Received response from Grok AI
✅ AI returned 10 raw questions
✅ Generated 10 questions successfully
```

**Error logs will tell you exactly what's wrong:**
```
❌ GROK_API_KEY environment variable is not set!
```
or
```
🔑 Authentication error - GROK_API_KEY is invalid or missing
```
or
```
⏱️ Rate limit exceeded on Grok API
```

---

## 📊 Battle Question Flow

```
User creates battle
  ↓
generateBattleQuestions(userId, folderId, count)
  ↓
1. Extract existing questions from storage files
  ↓
2. If not enough questions → Call Grok AI
  ↓
generateQuestionsWithAI()
  ✓ Check GROK_API_KEY (NEW)
  ✓ Extract lecture content
  ✓ Call Grok API: https://api.x.ai/v1
  ✓ Parse & validate
  ✓ Return questions
```

---

## 🔧 Grok Configuration

**File:** `/lib/grok-client.ts`

```typescript
const grok = new OpenAI({
  apiKey: process.env.GROK_API_KEY,  // ← Must be set
  baseURL: 'https://api.x.ai/v1'     // ← Grok endpoint
});
```

**Model:** `grok-4-fast-reasoning`
**Endpoint:** `https://api.x.ai/v1/chat/completions`
**Env Var:** `GROK_API_KEY`

---

## 📋 Debugging Checklist

If you still get "Failed to generate questions":

1. ✅ **GROK_API_KEY** is in `.env.local`
2. ✅ **Dev server restarted** after adding key
3. ✅ **Folder has completed lectures** (check database)
4. ✅ **Server logs** show detailed error
5. ✅ **Grok API key is valid** (test with curl)

---

## 🧪 Test Grok API Directly

```bash
curl -X POST https://api.x.ai/v1/chat/completions \
  -H "Authorization: Bearer $GROK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "grok-4-fast-reasoning",
    "messages": [{"role": "user", "content": "Say hello"}]
  }'
```

**Expected:** JSON with `choices[0].message.content`

---

## 📖 Full Documentation

See `/docs/BATTLE-QUESTION-DEBUG.md` for:
- Complete technical analysis
- All error patterns
- Debugging strategies
- System architecture
- Testing procedures

---

**Quick Summary:**
- ✅ Battles use Grok AI (confirmed)
- ✅ Added GROK_API_KEY validation
- ✅ Enhanced error logging
- ✅ Better error messages
- 🔧 Action: Check GROK_API_KEY in .env.local and restart server
