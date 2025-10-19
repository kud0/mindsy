# Student Desk System - Complete Technical Documentation

**Last Updated**: 2025-10-17
**Purpose**: Comprehensive guide to the Student Desk v2 system architecture, data flow, and components

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Data Flow Pipeline](#data-flow-pipeline)
3. [Schema & Interfaces](#schema--interfaces)
4. [Key Components](#key-components)
5. [Recent Critical Changes](#recent-critical-changes)
6. [Common Issues & Solutions](#common-issues--solutions)
7. [Testing Checklist](#testing-checklist)

---

## 1. System Overview

### What is Student Desk v2?

Student Desk is the main learning interface where students interact with AI-generated study materials from lectures (audio/video/documents).

**Core Features:**
- 6 interactive tabs (Overview, Questions, Explanations, Summary, Content Summary, Mind Map)
- Persistent audio player that works across all tabs
- Transcript with clickable timestamps (paragraph-level, 20-60 second chunks)
- Rich explanations with subsections and headers (like textbook chapters)
- Interactive quizzes with multiple question types
- Real-time content generation from Grok AI (xAI)

---

## 2. Data Flow Pipeline

### Upload → Generation → Display Pipeline

```
┌─────────────────┐
│  User Uploads   │
│  Audio/Link/Doc │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  /api/generate/route.ts                 │
│  - Creates job in database              │
│  - Uploads to Supabase Storage          │
│  - Calls RunPod for transcription       │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  RunPod Faster-Whisper API              │
│  - Transcribes audio                    │
│  - Returns timestamped segments         │
│  - Detects language                     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  /api/runpod-webhook/route.ts           │
│  - Receives transcription result        │
│  - Merges segments into paragraphs      │
│    (20-60 sec chunks, like Mindgrasp)   │
│  - Calls content-processor.ts           │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  lib/content-processor.ts               │
│  - Stage 1: handleTranscriptionComplete │
│  - Stage 2: handleGenerationStage       │
│  - Stage 3: handleFinalizationStage     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  lib/grok-client.ts                     │
│  - generateStudentDeskContent()         │
│  - Calls Grok AI with structured prompt │
│  - Returns NEW schema with:             │
│    * introduction + sections            │
│    * NOT old explanation + keyPoints    │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Database: study_guides table           │
│  - Saves questions, explanations, etc   │
│  - JSON columns for structured data     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  /app/dashboard/lectures/[jobId]/       │
│  student-desk/page.tsx                  │
│  - Fetches lecture data                 │
│  - Maps to StudentDesk format           │
│  - Renders StudentDesk component        │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  components/student-desk-v2/            │
│  StudentDesk.tsx                        │
│  - Main UI component                    │
│  - Tab management                       │
│  - Audio player integration             │
└─────────────────────────────────────────┘
```

---

## 3. Schema & Interfaces

### ⚠️ CRITICAL: NEW vs OLD Explanation Schema

**🚨 CURRENT (NEW) SCHEMA** - Use this!

```typescript
interface Explanation {
  id: string;
  concept: string;  // MUST be specific: "Estructura del Esqueleto Axial"
  introduction: string;  // Opening paragraph
  sections?: Array<{
    heading: string;  // "Características del Cráneo"
    content: string;  // Paragraph explanation
    points?: string[];  // Optional bullet points
  }>;
  importance: 'high' | 'medium' | 'low';
  example?: string;
}
```

**❌ LEGACY (OLD) SCHEMA** - Don't use!

```typescript
interface OldExplanation {
  id: string;
  concept: string;
  explanation: string;  // ❌ OLD FIELD
  keyPoints?: string[];  // ❌ OLD FIELD
  importance: 'high' | 'medium' | 'low';
}
```

### Complete StudentDesk Data Structure

```typescript
interface StudentDeskData {
  metadata: {
    title: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    estimatedTime: string;
    subjectDomain: string;
    examImportance: 'low' | 'medium' | 'high';
  };

  overview: {
    mainTopic: string;
    keyObjectives: string[];
    coreConceptsList: string[];
  };

  questions: Array<{
    id: string;
    type: 'multiple-choice' | 'true-false' | 'fill-number';
    question?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    points?: number;
    hint?: string;
    feedback?: string;
    // Type-specific fields...
  }>;

  explanations: Explanation[];  // Use NEW schema above!

  summary: {
    essentialPoints: string[];
    examFocus: {
      mustKnow: string[];
      likelyQuestions: string[];
    };
  };

  // Transcript with timestamps
  transcript?: {
    text?: string;
    segments?: Array<{
      id: number;
      start: number;  // seconds
      end: number;    // seconds
      text: string;   // paragraph (20-60 sec merged)
    }>;
  };
}
```

### Transcript Segment Merging

**Key Constants** (in `runpod-webhook/route.ts` and `runpod-client.ts`):

```typescript
const MIN_CHUNK_DURATION = 20;  // seconds
const MAX_CHUNK_DURATION = 60;  // seconds
const PAUSE_THRESHOLD = 2.0;    // seconds
```

**Merging Logic:**
- Combines sentence-level segments into paragraph-level chunks
- Aims for 20-60 second paragraphs (like Mindgrasp)
- Splits on long pauses (>2s) or max duration
- Makes transcript more readable and clickable

---

## 4. Key Components

### 4.1 Main Student Desk Component

**File**: `components/student-desk-v2/StudentDesk.tsx`

**Key Features:**
- Tab management (6 tabs)
- Persistent audio player with ref-based control
- Data transformation from database format to UI format
- Handles both new and legacy explanation schemas

**Important Refs:**
```typescript
const audioPlayerRef = useRef<PersistentAudioPlayerRef>(null);

// Callback for timestamp clicks
const handleSeekToTime = useCallback((timeInSeconds: number) => {
  if (audioPlayerRef.current) {
    audioPlayerRef.current.seekTo(timeInSeconds);
  }
}, []);
```

### 4.2 Persistent Audio Player

**File**: `components/student-desk-v2/PersistentAudioPlayer.tsx`

**Purpose**: Single audio player that persists across all tabs

**API**:
```typescript
interface PersistentAudioPlayerRef {
  seekTo: (timeInSeconds: number) => void;
}

// Usage
<PersistentAudioPlayer ref={audioPlayerRef} jobId={jobId} />

// Seek from any tab
audioPlayerRef.current?.seekTo(45.5);  // Jump to 45.5 seconds
```

**Features:**
- Playback speed control (0.5x - 2x)
- Progress bar with seek
- Play/pause, skip forward/backward
- Survives tab changes

### 4.3 Explanations Tab

**File**: `components/student-desk-v2/tabs/ExplanationsTab.tsx`

**UI Design** (matches competitor):
- Orange numbered badges (1, 2, 3, 4...)
- Expandable/collapsible cards
- Clean, minimal design
- Subsections with headers inside cards

**Rendering Logic**:
```typescript
// NEW schema rendering
{explanation.introduction && (
  <>
    <div>{explanation.introduction}</div>
    {explanation.sections?.map(section => (
      <div>
        <h4>{section.heading}</h4>
        <div>{section.content}</div>
        {section.points && <ul>{section.points.map(...)}</ul>}
      </div>
    ))}
  </>
)}

// LEGACY fallback
{!explanation.introduction && (
  <div>{explanation.explanation || 'No explanation available'}</div>
)}
```

### 4.4 Transcript Tab

**File**: `components/student-desk-v2/tabs/TranscriptTab.tsx`

**Features:**
- Clickable timestamps (paragraph-level)
- No embedded audio player (uses parent's persistent player)
- Handles both string and structured transcript formats

**Timestamp Click Handler**:
```typescript
const handleTimestampClick = (timeInSeconds: number) => {
  if (onSeekToTime) {
    onSeekToTime(timeInSeconds);  // Calls parent's seekTo
  }
};
```

### 4.5 Grok AI Generation

**Files**:
- `lib/grok-client.ts` - Main generation (uses Grok API from xAI)
- `lib/simple-study-generator.ts` - Alternative path (unused?)

**Function**: `generateStudentDeskContent(input: MindsyNotesInput)`

**Critical Prompt Requirements** (lines ~378-536):

```
🚨 CRITICAL SCHEMA REQUIREMENTS 🚨

YOU MUST USE THIS EXACT SCHEMA - DO NOT DEVIATE:
{
  "concept": "Specific concept name from lecture",
  "introduction": "Opening paragraph (NOT 'explanation' field!)",
  "sections": [
    {
      "heading": "Subsection name",
      "content": "Paragraph content",
      "points": ["Optional bullets"]
    }
  ],
  ...
}

❌ FORBIDDEN - DO NOT USE THESE FIELDS:
- "explanation" (OLD SCHEMA - DO NOT USE!)
- "keyPoints" (OLD SCHEMA - DO NOT USE!)
- Generic names like "Key Concept", "Core Concept"

✅ REQUIRED - YOU MUST USE:
- "introduction" field (paragraph text)
- "sections" array with objects
- Specific concept names from lecture
```

**Why This Matters:**
- AI models sometimes revert to old patterns they learned
- Explicit FORBIDDEN/REQUIRED sections enforce compliance
- Emojis and formatting make instructions unmissable

---

## 5. Recent Critical Changes

### Change Log (Most Recent First)

#### 2025-10-17: Migrated to Grok AI & Made Prompts Bulletproof
**Problem**: Need more flexible AI provider, OpenAI was inconsistently using old schema (`explanation` + `keyPoints`) vs new schema (`introduction` + `sections`)

**Solution**: Migrated to Grok AI (xAI) and added explicit FORBIDDEN/REQUIRED sections with emojis:
- Created new file: `lib/grok-client.ts` (uses Grok API)
- Updated: `lib/content-processor.ts` to use Grok
- Model: `grok-4-fast-reasoning` (fast, powerful)
- Added 🚨 warnings at top of schema section
- Explicit ❌ list of forbidden fields
- Explicit ✅ list of required fields
- Example schema shown directly in prompt

#### 2025-10-17: Redesigned Explanations Tab UI
**Problem**: Ugly placeholder UI, didn't match competitor (Mindgrasp)

**Solution**: Completely redesigned `ExplanationsTab.tsx`:
- Orange numbered badges (clean, minimal)
- Expandable/collapsible cards
- Removed importance-based grouping
- Subsections with headers inside cards
- Supports both new and legacy schemas

#### 2025-10-17: Updated Explanation Schema
**Problem**: Old schema was just bullet points, competitor had rich textbook-style content

**Solution**: Created new schema with:
- `introduction`: Opening paragraph
- `sections`: Array of subsections with headers, content, optional bullet points
- Mix of paragraphs and bullets (like textbook chapters)
- Legacy fallback support in UI

#### 2025-10-17: Implemented Persistent Audio Player
**Problem**: Clicking transcript timestamps played duplicate audio, player didn't persist across tabs

**Solution**:
- Created `PersistentAudioPlayer.tsx` component
- Ref-based control with `seekTo()` method
- Removed duplicate audio elements from tabs
- Audio now persists when switching tabs

#### 2025-10-17: Added Paragraph-Level Timestamps
**Problem**: Transcript was sentence-level (like speech-to-text), competitor had paragraph-level chunks

**Solution**: Implemented `mergeSegmentsIntoParagraphs()`:
- Combines sentence segments into 20-60 second paragraphs
- Splits on long pauses (>2s) or max duration
- Applied in both webhook and polling paths
- More readable, better UX

---

## 6. Common Issues & Solutions

### Issue 1: "Key Concept" Placeholders Everywhere

**Symptoms:**
- Explanations show "Key Concept" instead of actual concept names
- Content shows "Detailed explanation coming soon"
- Using old `explanation` and `keyPoints` fields

**Root Cause:**
- AI model reverting to old patterns
- Prompt not explicit enough

**Solution:**
1. Check `lib/grok-client.ts` line ~378-536
2. Ensure FORBIDDEN/REQUIRED sections are present
3. Test with new upload (old data won't auto-update)

### Issue 2: Transcript Timestamps Not Working

**Symptoms:**
- Clicking timestamp doesn't seek audio
- Audio plays but in wrong location

**Root Cause:**
- Missing `onSeekToTime` callback
- Audio player ref not connected

**Solution:**
1. Check `StudentDesk.tsx` has `audioPlayerRef`
2. Verify `handleSeekToTime` callback passed to TranscriptTab
3. Ensure PersistentAudioPlayer exposes `seekTo()` method

### Issue 3: Audio Plays Twice When Clicking Timestamp

**Symptoms:**
- Two audio streams play simultaneously
- Can't control one of them

**Root Cause:**
- Duplicate audio elements (one in tab, one persistent)

**Solution:**
- Remove `<audio>` tags from individual tabs
- Use only PersistentAudioPlayer component
- Pass callbacks for playback control

### Issue 4: Data Not Saving to Database

**Symptoms:**
- Generation succeeds but data missing in UI
- Database shows null or empty fields

**Root Cause:**
- Schema mismatch between OpenAI output and database
- Data transformation error

**Solution:**
1. Check `lib/content-processor.ts` lines 240-253
2. Verify study guide data structure matches database schema
3. Check for JSON parsing errors in logs

### Issue 5: Old Schema Data Still Showing

**Symptoms:**
- New uploads work but old data shows legacy format

**Root Cause:**
- Database still has old data
- UI fallback rendering legacy format

**Solution:**
- This is expected! UI supports both formats
- Old data won't auto-update to new schema
- Only new uploads use new schema
- Consider migration script if needed

---

## 7. Testing Checklist

### Before Claiming "It Works"

- [ ] **Upload Audio File**
  - File uploads successfully
  - Job created in database
  - Transcription completes

- [ ] **Check Transcript**
  - Transcript visible in UI
  - Timestamps are paragraph-level (20-60 sec)
  - Clicking timestamp seeks audio player
  - Audio player updates position

- [ ] **Check Audio Player**
  - Player shows in UI (sticky at bottom)
  - Play/pause works
  - Speed control works (0.5x - 2x)
  - Seek bar works
  - Player persists when changing tabs

- [ ] **Check Explanations Tab**
  - Shows specific concept names (NOT "Key Concept")
  - Shows introduction paragraphs
  - Shows subsections with headers
  - Has expandable/collapsible cards
  - Orange numbered badges visible
  - Content is real (NOT "Detailed explanation coming soon")

- [ ] **Check Questions Tab**
  - Questions are exam-style
  - Mix of question types (multiple choice, true/false, fill-number)
  - Hints and feedback present
  - Questions make sense for the content

- [ ] **Check Overview Tab**
  - Main topic summary visible
  - Learning objectives listed
  - Core concepts listed

- [ ] **Check Summary Tab**
  - Essential points listed
  - Exam focus section present
  - Must-know concepts listed

- [ ] **Cross-Tab Functionality**
  - Audio keeps playing when switching tabs
  - Can seek from transcript tab
  - Audio position preserved
  - No duplicate audio playback

### Test with Different Content Types

- [ ] **Short lecture** (10-20 min)
  - Generates 3-5 explanations
  - Appropriate number of questions

- [ ] **Medium lecture** (20-40 min)
  - Generates 5-10 explanations
  - More comprehensive coverage

- [ ] **Long lecture** (40+ min)
  - Generates 10-15+ explanations
  - Thorough question coverage

- [ ] **Spanish content**
  - Detects language correctly
  - All content in Spanish
  - No English mixed in

---

## 8. Key Files Reference

### Core Application Flow
```
app/api/generate/route.ts              - Entry point for uploads
app/api/runpod-webhook/route.ts        - Receives transcriptions
lib/content-processor.ts               - 3-stage pipeline orchestrator
lib/grok-client.ts                     - Grok AI generation (MAIN)
lib/simple-study-generator.ts          - Alternative generator
lib/runpod-client.ts                   - RunPod API wrapper
lib/config.ts                          - Configuration (incl. GROK_API_KEY)
```

### UI Components
```
components/student-desk-v2/
  StudentDesk.tsx                      - Main container
  PersistentAudioPlayer.tsx            - Audio player
  SecondaryTabs.tsx                    - Tab navigation
  SegmentedControl.tsx                 - Tab switcher

  tabs/
    OverviewTab.tsx                    - Overview content
    QuestionsTab.tsx                   - Interactive quiz
    ExplanationsTab.tsx                - Rich explanations (RECENTLY UPDATED)
    TranscriptTab.tsx                  - Clickable transcript
    ContentSummaryTab.tsx              - Summary view
    MindMapTab.tsx                     - Mind map (placeholder)
```

### Database
```
Supabase Tables:
  jobs                                 - Processing jobs
  study_guides                         - Generated content
  user_files                           - Uploaded files

Storage Buckets:
  user-uploads                         - Raw uploads
  generated-notes                      - JSON/PDF outputs
```

---

## 9. Future Improvements Needed

### Known Issues
1. **Mind Map tab** is placeholder - needs implementation
2. **PDF generation** disabled (doesn't work on Vercel)
3. **No migration script** for old data to new schema
4. **Grok AI consistency** monitor for regressions
5. **No retry logic** if Grok generates wrong schema

### Feature Requests
1. **Regenerate** button for individual explanations
2. **Edit mode** for manual corrections
3. **Export** functionality (PDF, Word, etc.)
4. **Study sessions** with progress tracking
5. **Flashcards** generation from explanations
6. **Quiz mode** with scoring and feedback

---

## 10. Emergency Debugging

### If Everything is Broken

1. **Check Logs**
   ```bash
   # In browser console
   Look for OpenAI API errors
   Check for JSON parse errors

   # In terminal running dev server
   Look for 🚀 🤖 ✅ ❌ emojis in logs
   ```

2. **Check Database**
   ```sql
   -- Check if job exists
   SELECT * FROM jobs WHERE job_id = 'xxx';

   -- Check if study guide saved
   SELECT * FROM study_guides WHERE job_id = 'xxx';

   -- Check transcript segments
   SELECT timestamped_transcript FROM jobs WHERE job_id = 'xxx';
   ```

3. **Check File Storage**
   ```
   Supabase Dashboard > Storage
   - user-uploads: Check audio file uploaded
   - generated-notes: Check JSON file saved
   ```

4. **Test Grok AI Directly**
   ```typescript
   // In lib/grok-client.ts
   console.log('📤 PROMPT:', prompt);  // Add before API call
   console.log('📥 RESPONSE:', generatedContent);  // Add after
   ```

### Common Error Messages

```
"Could not find the 'detected_language' column"
→ Run database migration: migrations/add_timestamped_transcript.sql

"transcript.substring is not a function"
→ Transcript format changed, update StudentDesk.tsx

"Key prop spreading warning"
→ Remove key from commonProps in QuestionsTab.tsx

"Grok returned empty response"
→ Check API key (GROK_API_KEY), rate limits, model availability
```

---

## Final Notes

**REMEMBER:**
- Always test with NEW uploads to see changes
- Old data in database won't auto-update
- UI supports both old and new schemas (backward compatible)
- Grok AI prompts need to be VERY explicit (use emojis, examples)
- Check logs with emoji markers (🚀 🤖 ✅ ❌) for easy debugging
- Using Grok AI (xAI) with model `grok-4-fast-reasoning`

**When Starting Fresh:**
1. Read this document top to bottom
2. Check recent git commits for context
3. Test with one upload end-to-end
4. Verify each tab works before claiming success

Good luck! 🚀
