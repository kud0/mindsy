# Mindsy - Complete System Overview for Claude

**Last Updated**: 2025-10-17 (Updated with On-Demand Quiz Generation)
**Purpose**: Comprehensive guide for Claude Code to understand how Mindsy works

---

## 🎯 What is Mindsy?

Mindsy is an AI-powered study platform that converts lecture recordings (audio/video/documents) into comprehensive, interactive study materials. Students upload their lecture recordings, and Mindsy automatically generates:

- **On-Demand Quizzes** - Generate customized quizzes (5-10 questions) anytime you need them
- **Rich Explanations** - Detailed, textbook-style explanations of every concept
- **Smart Summaries** - Key takeaways, must-know concepts, common pitfalls
- **Clickable Transcripts** - Paragraph-level transcripts with timestamps
- **Persistent Audio Player** - Listen while studying across all tabs

**Key Change (2025-10-17)**: Quizzes are now generated **on-demand** instead of automatically during upload. This makes initial processing faster (~30-40 seconds saved) and gives students control over quiz customization.

---

## 🏗️ Architecture Overview

### Tech Stack

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Shadcn/UI components

**Backend:**
- Supabase (PostgreSQL database)
- Supabase Auth (email/password, OAuth)
- Supabase Storage (file storage)
- Supabase Real-time (for status updates)

**AI Services:**
- **RunPod**: Audio transcription (Faster-Whisper model)
- **Grok AI (xAI)**: Content generation (model: `grok-4-fast-reasoning`)
  - Initial content: Explanations, summary, overview (NO questions)
  - On-demand: Quiz generation with customization

**Deployment:**
- Vercel (frontend + API routes)
- Supabase Cloud (database + storage)

**Important Constraints:**
- ❌ Cannot use Puppeteer on Vercel (serverless environment limitation)
- ✅ PDF generation disabled for now (exploring alternatives)

---

## 📊 Complete Data Flow

### The Full Pipeline (Upload → Student Desk)

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. USER UPLOADS LECTURE                                             │
│    - Audio file (MP3, WAV, etc.)                                    │
│    - YouTube link                                                   │
│    - Documents (PDF, TXT, DOC)                                      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. API ROUTE: /api/generate                                         │
│    - Creates job record in database                                 │
│    - Uploads file to Supabase Storage                               │
│    - Creates signed URL (60 min expiry)                             │
│    - Submits to RunPod for transcription                            │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. RUNPOD TRANSCRIPTION (30-120 seconds)                            │
│    - Faster-Whisper model processes audio                           │
│    - Returns full transcript text                                   │
│    - Returns timestamped segments (sentence-level)                  │
│    - Detects language automatically                                 │
│    - Calls webhook when complete                                    │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. WEBHOOK: /api/runpod-webhook                                     │
│    - Receives transcription from RunPod                             │
│    - Merges sentence segments into paragraph chunks (20-60 sec)     │
│    - Saves transcript.txt to storage                                │
│    - Updates job status: transcribing → generating                  │
│    - Triggers content generation                                    │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. CONTENT PROCESSOR: lib/content-processor.ts                      │
│    Stage 1: handleTranscriptionCompletion()                         │
│      - Saves transcript to storage                                  │
│      - Updates job with transcript data                             │
│                                                                      │
│    Stage 2: handleGenerationStage()                                 │
│      - Calls Grok AI for content generation                         │
│      - Waits for response (20-60 seconds)                           │
│                                                                      │
│    Stage 3: handleFinalizationStage()                               │
│      - Saves JSON to storage                                        │
│      - Saves study_guide to database                                │
│      - Marks job as completed                                       │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. GROK AI GENERATION: lib/grok-client.ts                           │
│    - Model: grok-4-fast-reasoning                                   │
│    - Input: transcript, title, subject, language                    │
│    - Output: Structured JSON with:                                  │
│      * metadata (difficulty, time, subject)                         │
│      * overview (objectives, core concepts)                         │
│      * explanations (detailed concept breakdowns)                   │
│      * summary (must-know, common pitfalls)                         │
│    - NOTE: Questions are NO LONGER generated here (see step 9)      │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. DATABASE: Supabase PostgreSQL                                    │
│    Tables:                                                           │
│    - jobs: Processing status tracking                               │
│    - study_guides: Generated content (questions, explanations, etc) │
│    - user_files: File organization metadata                         │
│    - users: User accounts and auth                                  │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. STUDENT DESK UI: /dashboard/lectures/[jobId]/student-desk        │
│    - Fetches lecture data from database                             │
│    - Maps data to UI components                                     │
│    - Renders 6 interactive tabs                                     │
│    - Persistent audio player across all tabs                        │
│    - Questions tab shows "Generate Quiz" if no quizzes exist        │
└────────────────────┬────────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. ON-DEMAND QUIZ GENERATION (when user requests)                   │
│    - User clicks "Generate Quiz" in Questions tab                   │
│    - QuizConfigDialog opens for customization:                      │
│      * Difficulty: easy, medium, hard                               │
│      * Questions: 5-10 (slider)                                     │
│      * Types: multiple-choice, true/false, fill-number              │
│      * Focus topics: optional specific topics                       │
│    - API: POST /api/lectures/[jobId]/quizzes/generate               │
│    - Grok generates customized quiz (15-30 seconds)                 │
│    - Quiz saved to `quizzes` table                                  │
│    - User can generate multiple quizzes, view history, delete old   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Key Files & Their Roles

### API Routes (app/api/)

```
/api/generate/route.ts
  - Main entry point for uploads
  - Creates job, uploads to storage
  - Submits to RunPod transcription
  - Handles webhook vs polling modes

/api/runpod-webhook/route.ts
  - Receives transcription completion from RunPod
  - Merges segments into paragraphs
  - Triggers content generation pipeline

/api/lectures/[jobId]/route.ts
  - Fetches job status and progress
  - Used by UI for polling updates

/api/lectures/[jobId]/structured/route.ts
  - Fetches complete study guide data
  - Returns formatted data for Student Desk

/api/lectures/[jobId]/quizzes/generate/route.ts (NEW)
  - POST: Generate customized quiz on-demand
  - Validates: difficulty, numQuestions (5-10), questionTypes
  - Calls generateQuiz() from grok-client
  - Saves to quizzes table

/api/lectures/[jobId]/quizzes/route.ts (NEW)
  - GET: List all quizzes for a lecture
  - Returns quiz metadata (title, config, question count)

/api/lectures/[jobId]/quizzes/[quizId]/route.ts (NEW)
  - GET: Fetch specific quiz with all questions
  - DELETE: Remove a quiz
```

### Core Business Logic (lib/)

```
lib/content-processor.ts
  - 3-stage async pipeline orchestrator
  - Stage 1: Transcription handling
  - Stage 2: Grok AI generation
  - Stage 3: Finalization (save to DB)

lib/grok-client.ts
  - Grok AI integration (xAI API)
  - generateStudentDeskContent() - main function (NO questions)
  - generateQuiz() - NEW on-demand quiz generation (5-10 questions)
  - Creates structured prompts
  - Handles JSON response parsing
  - Model: grok-4-fast-reasoning

lib/runpod-client.ts
  - RunPod API wrapper
  - transcribeAudioWithWebhook() - async mode
  - transcribeAudioWithLanguage() - sync mode
  - Handles Faster-Whisper API

lib/config.ts
  - Environment variables configuration
  - API keys (GROK_API_KEY, RUNPOD_API_KEY)
  - Service URLs

lib/supabase/
  - server.ts - Server-side Supabase client
  - client.ts - Client-side Supabase client
  - middleware.ts - Auth middleware
```

### UI Components (components/)

```
components/student-desk-v2/
  StudentDesk.tsx
    - Main container component
    - Tab management (6 tabs)
    - Audio player ref management
    - Data transformation from DB → UI

  PersistentAudioPlayer.tsx
    - Single audio player for all tabs
    - Ref-based control (seekTo method)
    - Speed control (0.5x - 2x)
    - Survives tab changes

  QuizConfigDialog.tsx (NEW)
    - Modal for quiz customization
    - Difficulty selector (Easy/Medium/Hard)
    - Question count slider (5-10)
    - Question type checkboxes
    - Optional focus topics input

  QuizHistory.tsx (NEW)
    - Sidebar showing all quiz attempts
    - Quiz metadata (difficulty, date, questions)
    - Active quiz indicator
    - Delete quiz functionality

  SecondaryTabs.tsx
    - Tab navigation component
    - Active state management

  tabs/
    OverviewTab.tsx - Learning objectives, core concepts
    QuestionsTab.tsx - On-demand quiz interface (COMPLETELY REFACTORED)
      * Empty state: "Generate Your First Quiz"
      * Quiz display with history sidebar
      * Generate new quiz button
      * Switch between quiz attempts
    ExplanationsTab.tsx - Rich textbook-style content
    TranscriptTab.tsx - Clickable paragraph-level transcript
    SummaryTab.tsx - Key takeaways, must-know concepts
    ContentSummaryTab.tsx - Brief overview
    MindMapTab.tsx - Visual mind map (placeholder)
```

### Pages (app/)

```
app/page.tsx - Landing page
app/dashboard/page.tsx - Main dashboard (lectures list)
app/dashboard/lectures/[jobId]/student-desk/page.tsx - Student Desk view
app/auth/login/page.tsx - Login page
app/auth/signup/page.tsx - Signup page
```

---

## 🗄️ Database Schema

### Main Tables

**jobs**
```sql
- job_id (uuid, primary key)
- user_id (uuid, foreign key → users)
- lecture_title (text)
- course_subject (text, nullable)
- status (text: processing|transcribing|generating|finalizing|completed|failed)
- audio_file_path (text)
- txt_file_path (text)
- json_file_path (text)
- pdf_file_path (text, nullable)
- runpod_job_id (text, nullable)
- timestamped_transcript (jsonb) - paragraph segments with timestamps
- detected_language (text)
- language_confidence (float)
- processing_mode (text: sync|async)
- error_message (text, nullable)
- processing_started_at (timestamp)
- transcription_completed_at (timestamp)
- processing_completed_at (timestamp)
- created_at (timestamp)
- updated_at (timestamp)
```

**study_guides**
```sql
- id (uuid, primary key)
- job_id (uuid, foreign key → jobs)
- user_id (uuid, foreign key → users)
- title (text)
- subject (text, nullable)
- language (text)
- questions (jsonb) - EMPTY ARRAY [] (questions moved to quizzes table)
- explanations (jsonb) - array of explanation objects
- summary (jsonb) - summary object
- table_of_contents (text)
- created_at (timestamp)
- updated_at (timestamp)
```

**quizzes** (NEW - Added 2025-10-17)
```sql
- id (uuid, primary key)
- job_id (uuid, foreign key → jobs)
- user_id (uuid, foreign key → users)
- title (text) - "Quiz #1", "Quiz #2", etc.
- questions (jsonb) - array of question objects (max 10)
- quiz_config (jsonb) - { difficulty, numQuestions, questionTypes, focusTopics }
- created_at (timestamp)
- updated_at (timestamp)
```

**users** (managed by Supabase Auth)
```sql
- id (uuid, primary key)
- email (text)
- encrypted_password (text)
- created_at (timestamp)
- updated_at (timestamp)
```

**user_files**
```sql
- file_id (uuid, primary key)
- user_id (uuid, foreign key → users)
- file_name (text)
- file_type (text)
- file_size (integer)
- storage_path (text)
- parent_folder_id (uuid, nullable)
- created_at (timestamp)
```

### Storage Buckets

**user-uploads**
- Original uploaded files (audio, documents)
- Path format: `{userId}/{filename}`

**generated-notes**
- Generated files (transcript.txt, content.json)
- Path format: `{jobId}.txt`, `{jobId}.json`

---

## 🔑 Critical Schemas & Interfaces

### StudentDesk Content Schema (NEW SCHEMA)

```typescript
interface StudentDeskContent {
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

  explanations: Array<{
    id: string;
    concept: string;  // SPECIFIC name (e.g., "Vertebral Column Structure")
    section: string;  // Logical grouping (e.g., "Anatomical Foundations")
    timestamps: {
      start: number;  // seconds
      end: number;    // seconds
    };
    introduction: string;  // 🔥 NEW SCHEMA - Opening paragraph
    sections?: Array<{    // 🔥 NEW SCHEMA - Subsections
      heading: string;
      content: string;
      points?: string[];
    }>;
    importance: 'high' | 'medium' | 'low';
    example?: string;
  }>;

  summary: {
    sections: Array<{
      heading: string;
      content: string;
      keyPoints?: string[];
    }>;
    mustKnow: Array<{
      concept: string;
      explanation: string;
    }>;
    commonPitfalls: Array<{
      pitfall: string;
      explanation: string;
      howToAvoid?: string;
    }>;
  };

  engagement: {
    quizMetrics: {
      totalQuestions: number;
      totalPoints: number;
      passingScore: number;
    };
    achievements: Array<{
      id: string;
      name: string;
      points: number;
    }>;
  };
}
```

### ⚠️ OLD SCHEMA (Legacy Support)

```typescript
// UI still supports this for backward compatibility
interface OldExplanation {
  concept: string;
  explanation: string;  // ❌ DEPRECATED - use introduction instead
  keyPoints?: string[]; // ❌ DEPRECATED - use sections instead
}
```

---

## 🔄 Processing Modes

### Webhook Mode (Production)

**When**: `WEBHOOK_BASE_URL` is set in environment
**How**:
1. Upload → Create job → Submit to RunPod with webhook URL
2. Return immediately to user (status: transcribing)
3. RunPod calls webhook when done
4. Webhook continues pipeline asynchronously
5. User polls for status updates

**Advantages**: Scalable, doesn't block requests, handles long processing

### Polling Mode (Local Development)

**When**: `WEBHOOK_BASE_URL` is not set
**How**:
1. Upload → Create job → Submit to RunPod
2. Wait for RunPod completion (blocking)
3. Continue to Grok AI generation (blocking)
4. Return when complete

**Advantages**: Simpler to debug, works without public URL

---

## 🎨 UI Architecture (Student Desk)

### Tab System

```
┌─────────────────────────────────────────────────────────────────┐
│ Student Desk - [Lecture Title]                                  │
├─────────────────────────────────────────────────────────────────┤
│ [Overview] [Questions] [Explanations] [Summary] [Content] [Map] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Tab Content (scrollable)                                       │
│                                                                  │
│  - Overview: Learning objectives, core concepts                 │
│  - Questions: Interactive quiz with hints/feedback              │
│  - Explanations: Rich textbook-style explanations               │
│  - Summary: Key takeaways, must-know concepts                   │
│  - Content: Brief overview                                      │
│  - Map: Mind map visualization (placeholder)                    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│ [Persistent Audio Player - always visible]                      │
│ ▶ Pause | ◀◀ Back | ▶▶ Forward | [Progress Bar] | Speed: 1.0x │
└─────────────────────────────────────────────────────────────────┘
```

### Explanations Tab Design

**UI Pattern**: Expandable cards with orange numbered badges

```
┌────────────────────────────────────────────────────────────┐
│ ╭───╮  Vertebral Column Structure                     ∨   │
│ │ 1 │  Anatomical Foundations                              │
│ ╰───╯                                                       │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ The vertebral column is a complex structure...      │   │
│ │                                                      │   │
│ │ ## Structural Components                            │   │
│ │ The vertebral column consists of...                 │   │
│ │ • Component 1                                       │   │
│ │ • Component 2                                       │   │
│ └─────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ ╭───╮  Spinal Movement Mechanics                      >   │
│ │ 2 │  Movement Principles                                 │
│ ╰───╯  [Collapsed]                                         │
└────────────────────────────────────────────────────────────┘
```

### Transcript Tab Design

**UI Pattern**: Paragraph chunks with clickable timestamps

```
┌────────────────────────────────────────────────────────────┐
│ [🕐 00:23]                                                  │
│ En esta clase, se aborda la biomecánica y anatomía        │
│ humana, enfocándose en la estructura del esqueleto...     │
│                                                            │
│ [🕐 01:05]                                                  │
│ La columna vertebral incluye el cráneo, la columna       │
│ vertebral y la caja torácica. El cráneo es...            │
└────────────────────────────────────────────────────────────┘
```

**Click timestamp → Audio player seeks to that time**

---

## 🚨 Critical Implementation Details

### 1. Paragraph-Level Transcript Merging

**Why**: RunPod returns sentence-level segments (3-7 seconds each). This creates 100-200+ segments for a lecture. We merge these into paragraph-level chunks (20-60 seconds) for better UX.

**Where**: `app/api/runpod-webhook/route.ts` and `lib/runpod-client.ts`

**Logic**:
```typescript
const MIN_CHUNK_DURATION = 20;  // Min 20 seconds per paragraph
const MAX_CHUNK_DURATION = 60;  // Max 60 seconds per paragraph
const PAUSE_THRESHOLD = 2.0;    // Split on pauses > 2 seconds

function mergeSegmentsIntoParagraphs(segments) {
  // Combines sentence segments into paragraph chunks
  // Respects natural pauses and duration limits
  // Returns 10-30 paragraph segments instead of 100-200 sentences
}
```

### 2. Grok AI Prompt Engineering

**Critical**: The prompt MUST be extremely explicit about the schema to prevent the model from reverting to old patterns.

**Location**: `lib/grok-client.ts` lines 378-536

**Key Elements**:
- 🚨 Visual warnings at top
- ❌ Explicit FORBIDDEN fields list
- ✅ Explicit REQUIRED fields list
- Example schema inline
- Detailed instructions for each field

### 3. Persistent Audio Player

**Challenge**: Audio must persist across tab changes without restarting

**Solution**: Ref-based control pattern

```typescript
// In StudentDesk.tsx
const audioPlayerRef = useRef<PersistentAudioPlayerRef>(null);

// Pass callback to tabs
const handleSeekToTime = (timeInSeconds: number) => {
  audioPlayerRef.current?.seekTo(timeInSeconds);
};

// Transcript tab calls this when timestamp clicked
<TranscriptTab onSeekToTime={handleSeekToTime} />

// Audio player component
<PersistentAudioPlayer ref={audioPlayerRef} jobId={jobId} />
```

### 4. Dual Schema Support

**Why**: Database has old data with legacy schema, new data uses new schema

**Solution**: UI checks for both schemas and renders accordingly

```typescript
// In ExplanationsTab.tsx
{explanation.introduction ? (
  // NEW SCHEMA - render introduction + sections
  <NewSchemaRender explanation={explanation} />
) : (
  // OLD SCHEMA - render explanation + keyPoints
  <OldSchemaRender explanation={explanation} />
)}
```

---

## ⚙️ Environment Variables

### Required

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# AI Services
RUNPOD_API_KEY=xxx
GROK_API_KEY=xai-xxx

# Webhooks (Production only)
WEBHOOK_BASE_URL=https://mindsy.com
WEBHOOK_SECRET=xxx
```

### Optional

```bash
# Debug
RUNPOD_DEBUG_MODE=true

# Alternative AI (not used currently)
OPENAI_KEY=sk-xxx
```

---

## 🔍 Debugging Guide

### Check Processing Status

```sql
-- Check job status
SELECT job_id, lecture_title, status, processing_mode, error_message
FROM jobs
WHERE job_id = 'xxx';

-- Check if study guide created
SELECT id, title, language,
       jsonb_array_length(questions) as num_questions,
       jsonb_array_length(explanations) as num_explanations
FROM study_guides
WHERE job_id = 'xxx';

-- Check transcript segments
SELECT jsonb_array_length(timestamped_transcript) as num_segments,
       timestamped_transcript->0->>'start' as first_start,
       timestamped_transcript->0->>'end' as first_end
FROM jobs
WHERE job_id = 'xxx';
```

### Common Issues

**Issue**: Job stuck in 'transcribing'
- Check RunPod webhook is configured correctly
- Check webhook secret matches
- Look for errors in webhook endpoint logs

**Issue**: Job stuck in 'generating'
- Check Grok API key is valid
- Check rate limits
- Look for Grok API errors in logs

**Issue**: "Key Concept" placeholders in explanations
- Using old schema or Grok reverted to old pattern
- Check prompt in grok-client.ts
- Only affects new uploads (old data won't auto-update)

**Issue**: Transcript timestamps not working
- Check `onSeekToTime` callback is passed correctly
- Check audio player ref is connected
- Check audio file exists in storage

---

## 📈 Success Metrics

### Pipeline Working Correctly:
- ✅ Jobs complete in 60-180 seconds (webhook mode)
- ✅ Explanations have specific concept names (NOT "Key Concept")
- ✅ Explanations have `introduction` and `sections` fields
- ✅ Transcript has 10-30 paragraph segments (not 100+ sentences)
- ✅ Clicking timestamps seeks audio correctly
- ✅ Audio persists across tab changes
- ✅ Content is rich and detailed

### Pipeline Broken:
- ❌ Jobs stuck in 'transcribing' or 'generating'
- ❌ "Key Concept" placeholders everywhere
- ❌ "Detailed explanation coming soon"
- ❌ Transcript has 200+ sentence-level segments
- ❌ Audio plays twice when clicking timestamps
- ❌ Audio stops when changing tabs

---

## 🚀 Recent Major Changes

### 2025-10-17: On-Demand Quiz Generation System

**Major Feature**: Completely redesigned quiz system from automatic to on-demand generation.

**Why This Change**:
- **Faster Uploads**: Save ~30-40 seconds by not generating quizzes during initial processing
- **User Control**: Students decide when they need quizzes and can customize them
- **Multiple Attempts**: Generate different quiz variations for practice
- **Better UX**: Not overwhelming students with automatic quizzes they might not need

**What Changed**:

1. **Backend Changes**:
   - Created new `quizzes` table in database
   - Added `generateQuiz()` function to grok-client.ts
   - Removed questions from initial Grok prompt (faster generation)
   - Created 3 new API endpoints for quiz management
   - Modified content-processor to save empty questions array

2. **Frontend Changes**:
   - Created QuizConfigDialog component (customization UI)
   - Created QuizHistory component (sidebar for quiz attempts)
   - Completely refactored QuestionsTab component
   - Added empty state with "Generate Quiz" button
   - Added quiz switching and deletion functionality

3. **Quiz Configuration Options**:
   - **Difficulty**: Easy, Medium, Hard
   - **Question Count**: 5-10 (slider to prevent overwhelming)
   - **Question Types**: Multiple choice, True/False, Fill in number
   - **Focus Topics**: Optional specific topics to emphasize

4. **User Flow**:
   ```
   Upload Lecture (faster now!)
       ↓
   Open Questions Tab
       ↓
   See "Generate Your First Quiz" button
       ↓
   Click → Configure (difficulty, count, types)
       ↓
   Generate (Grok AI - 15-30 seconds)
       ↓
   View Quiz + History Sidebar
       ↓
   Generate More Quizzes (different configs)
       ↓
   Switch Between Quizzes
       ↓
   Delete Old Quizzes
   ```

5. **Database Schema**:
   - New `quizzes` table with RLS policies
   - `study_guides.questions` now always empty array
   - Each quiz stores its config for reproducibility

### 2025-10-17: Earlier Changes

### Earlier: Migrated from OpenAI to Grok AI
- **Why**: More flexible AI provider, cost optimization
- **Changes**:
  - Created `lib/grok-client.ts`
  - Updated `lib/content-processor.ts` to use Grok
  - Added `GROK_API_KEY` to config
  - Model: `grok-4-fast-reasoning`
  - Now used for both initial content AND on-demand quizzes

### Earlier: Redesigned Explanations Tab
- **Why**: Old UI was ugly, didn't match competitors
- **Changes**:
  - Orange numbered badges (clean, minimal)
  - Expandable/collapsible cards
  - Removed importance-based grouping
  - Supports both new and legacy schemas

### Earlier: Implemented Persistent Audio Player
- **Why**: Audio was playing twice, didn't persist across tabs
- **Changes**:
  - Created `PersistentAudioPlayer.tsx`
  - Ref-based control with `seekTo()` method
  - Removed duplicate audio elements from tabs

### Earlier: Updated Explanation Schema
- **Why**: Competitor had richer content, we had just bullet points
- **Changes**:
  - NEW: `introduction` (paragraph) + `sections` (subsections with headers)
  - OLD: `explanation` (text) + `keyPoints` (bullets)
  - UI supports both for backward compatibility

### 5. Paragraph-Level Timestamps
- **Why**: Sentence-level was too granular (like speech-to-text)
- **Changes**:
  - Merge sentences into 20-60 second paragraphs
  - Better readability
  - More natural click targets

---

## 📚 Additional Documentation

For more detailed documentation, see:

- `docs/PIPELINE-COMPLETE-FLOW.md` - Detailed pipeline walkthrough
- `docs/STUDENT-DESK-SYSTEM.md` - Student Desk architecture
- `docs/HOW-MINDSY-WORKS.md` - Simple overview
- `CLAUDE.md` - Project instructions for Claude Code

---

## 🎯 Development Workflow

### When Making Changes:

1. **Read relevant docs first** - Understand the system
2. **Test with NEW uploads** - Old data won't auto-update
3. **Check logs** - Look for emoji markers (🚀 🤖 ✅ ❌)
4. **Verify database** - Check data saved correctly
5. **Test all tabs** - Ensure nothing breaks
6. **Check audio player** - Verify playback works

### When Debugging:

1. **Start from the API** - Check if job created
2. **Follow the pipeline** - Upload → Transcribe → Generate → Display
3. **Check each stage** - Look for errors in logs
4. **Verify data structure** - Ensure schema matches expectations
5. **Test with simple cases** - Short lectures are easier to debug

---

## 🔮 Future Improvements

### Planned Features:
1. Mind Map tab implementation
2. PDF generation (find Vercel-compatible solution)
3. Regenerate button for individual sections
4. Edit mode for manual corrections
5. Export functionality (PDF, Word, etc.)
6. Study sessions with progress tracking
7. Flashcards generation
8. **Quiz scoring and grading system** (track completion, scores)
9. **Quiz analytics** (time spent, performance trends)
10. **Quiz sharing** (share quizzes with classmates)

### Technical Debt:
1. Migration script for old schema data
2. Retry logic for AI generation failures
3. Better error handling and user feedback
4. Performance optimization for large lectures
5. Caching strategy for frequently accessed data
6. **Quiz history pagination** (if user generates 50+ quizzes)

---

## 💡 Key Principles

1. **Always test with new uploads** - Old data doesn't auto-update
2. **Be explicit with AI prompts** - Models need VERY clear instructions
3. **Support backward compatibility** - Don't break old data
4. **Log with emojis** - Makes debugging SO much easier
5. **Keep audio player persistent** - Don't restart on tab change
6. **Merge timestamps into paragraphs** - Better UX than sentences
7. **Use NEW schema for explanations** - Rich content > bullet points
8. **On-demand over automatic** - Give users control when possible
9. **Max 10 questions per quiz** - Keep students focused, not overwhelmed
10. **Generate fast, process faster** - Optimize initial upload speed

---

**Remember**: This is a complex system with many moving parts. When in doubt, follow the data flow from upload to display, checking each stage along the way.

Good luck! 🚀
