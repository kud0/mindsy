# Complete Pipeline Flow - Upload to Student Desk

**Last Updated**: 2025-10-17
**Purpose**: Detailed step-by-step flow of the entire processing pipeline

---

## Pipeline Overview

```
User Upload → RunPod Transcription → Grok AI Generation → Database → Student Desk UI
   (5 sec)         (30-120 sec)         (20-60 sec)        (1 sec)      (instant)
```

---

## Stage 1: Upload & Job Creation

### Entry Point: `/api/generate/route.ts`

**Request Body:**
```typescript
{
  audioFilePath: string;        // "user-123/audio.mp3"
  lectureTitle: string;          // "CPE Class 9 - Biomechanics"
  courseSubject?: string;        // "Biomechanics"
  uploadType: 'audio' | 'link' | 'documents';
}
```

**Steps:**

1. **Validate Request** (lines 51-71)
   ```typescript
   if (!body.uploadType) return error('uploadType required');
   if (!body.lectureTitle) return error('lectureTitle required');
   if (uploadType === 'audio' && !audioFilePath) return error();
   ```

2. **Create Job Record** (lines 80-92)
   ```typescript
   const { data: job } = await supabase
     .from('jobs')
     .insert({
       user_id: user.id,
       lecture_title: body.lectureTitle,
       course_subject: body.courseSubject,
       status: 'processing',
       audio_file_path: body.audioFilePath,
       processing_started_at: new Date().toISOString()
     })
     .select()
     .single();

   const jobId = job.job_id;  // UUID
   ```

3. **Create Signed URL** (lines 105-111)
   ```typescript
   const { data: audioSignedUrl } = await supabase.storage
     .from('user-uploads')
     .createSignedUrl(body.audioFilePath, 3600);  // 1 hour expiry

   // Result: https://supabase.../user-uploads/audio.mp3?token=...
   ```

4. **Check Webhook Configuration** (lines 116-120)
   ```typescript
   const { getWebhookConfig } = await import('@/lib/webhook-config');
   const webhookConfig = getWebhookConfig();

   // webhookConfig.isWebhookEnabled: true/false
   // webhookConfig.webhookUrl: "https://your-domain.com/api/runpod-webhook"
   ```

---

## Stage 2A: Transcription (Webhook Mode) - PRODUCTION

**File**: `/api/generate/route.ts` lines 126-162

**Flow:**

1. **Submit to RunPod with Webhook** (lines 129-132)
   ```typescript
   const { jobId: runpodJobId } = await runpodClient.transcribeAudioWithWebhook(
     audioSignedUrl.signedUrl,
     webhookConfig.webhookUrl  // "https://mindsy.com/api/runpod-webhook"
   );

   // Returns immediately with runpodJobId
   // RunPod will call webhook when done
   ```

2. **Update Job Status** (lines 135-142)
   ```typescript
   await supabase
     .from('jobs')
     .update({
       runpod_job_id: runpodJobId,
       status: 'transcribing',
       processing_mode: 'async'
     })
     .eq('job_id', jobId);
   ```

3. **Return to User** (lines 156-162)
   ```typescript
   return {
     jobId,
     message: 'Audio submitted for transcription. Processing in background.',
     status: 'transcribing',
     mode: 'webhook',
     runpodJobId
   };

   // User can now poll /api/lectures/[jobId] for status updates
   ```

### What Happens Next (Async)

**RunPod** processes the audio (30-120 seconds later) and calls:

```
POST https://mindsy.com/api/runpod-webhook
```

---

## Stage 2B: Transcription (Polling Mode) - LOCAL DEV

**File**: `/api/generate/route.ts` lines 164-177

**Flow:**

1. **Update Status** (lines 168-174)
   ```typescript
   await supabase
     .from('jobs')
     .update({
       status: 'transcribing',
       processing_mode: 'sync'
     })
     .eq('job_id', jobId);
   ```

2. **Poll RunPod** (line 176)
   ```typescript
   transcriptionResult = await runpodClient.transcribeAudioWithLanguage(
     audioSignedUrl.signedUrl
   );

   // Blocks until transcription complete
   // Returns: { text, detectedLanguage, languageConfidence }
   ```

3. **Continue to Stage 3** (lines 185-191)
   ```typescript
   const { handleTranscriptionCompletion } = await import('@/lib/content-processor');

   await handleTranscriptionCompletion(jobId, {
     text: transcriptionResult.text,
     detectedLanguage: transcriptionResult.detectedLanguage,
     languageConfidence: transcriptionResult.languageConfidence
   });
   ```

---

## Stage 3: Webhook Receives Transcription

**File**: `/api/runpod-webhook/route.ts`

**Request from RunPod:**
```json
{
  "id": "runpod-job-abc123",
  "status": "COMPLETED",
  "output": {
    "text": "Full transcription text...",
    "segments": [
      {
        "id": 0,
        "start": 0.0,
        "end": 3.5,
        "text": "En esta clase, se aborda..."
      },
      {
        "id": 1,
        "start": 3.5,
        "end": 7.2,
        "text": "la biomecánica y anatomía humana..."
      }
      // ... many more sentence-level segments
    ],
    "language": "es"
  }
}
```

**Steps:**

1. **Validate Webhook** (lines ~40-60)
   ```typescript
   // Check webhook secret if configured
   const webhookSecret = process.env.WEBHOOK_SECRET;
   if (webhookSecret) {
     const authHeader = request.headers.get('authorization');
     if (authHeader !== `Bearer ${webhookSecret}`) {
       return error('Unauthorized');
     }
   }
   ```

2. **Extract RunPod Response** (lines ~70-90)
   ```typescript
   const { id: runpodJobId, status, output } = await request.json();

   if (status !== 'COMPLETED') {
     return error('Job not completed');
   }

   const { text, segments, language } = output;
   ```

3. **Find Internal Job** (lines ~95-110)
   ```typescript
   const { data: job } = await supabase
     .from('jobs')
     .select('*')
     .eq('runpod_job_id', runpodJobId)
     .single();

   if (!job) {
     return error('Job not found');
   }

   const jobId = job.job_id;  // Our internal UUID
   ```

4. **🔥 CRITICAL: Merge Segments into Paragraphs** (lines ~120-180)
   ```typescript
   function mergeSegmentsIntoParagraphs(
     segments: Array<{ id: number; start: number; end: number; text: string }>
   ): Array<{ id: number; start: number; end: number; text: string }> {

     const MIN_CHUNK_DURATION = 20;   // Min 20 seconds per paragraph
     const MAX_CHUNK_DURATION = 60;   // Max 60 seconds per paragraph
     const PAUSE_THRESHOLD = 2.0;     // Split on pauses > 2 seconds

     const merged = [];
     let currentChunk = null;

     for (const segment of segments) {
       if (!currentChunk) {
         // Start new chunk
         currentChunk = { ...segment };
       } else {
         const chunkDuration = segment.end - currentChunk.start;
         const timeSinceLastSegment = segment.start - currentChunk.end;

         // Should we merge or split?
         const shouldMerge =
           chunkDuration < MAX_CHUNK_DURATION &&
           timeSinceLastSegment < PAUSE_THRESHOLD;

         if (shouldMerge) {
           // Merge into current chunk
           currentChunk.end = segment.end;
           currentChunk.text += ' ' + segment.text;
         } else {
           // Save current chunk and start new one
           if (currentChunk.end - currentChunk.start >= MIN_CHUNK_DURATION) {
             merged.push(currentChunk);
           }
           currentChunk = { ...segment };
         }
       }
     }

     // Don't forget last chunk
     if (currentChunk &&
         currentChunk.end - currentChunk.start >= MIN_CHUNK_DURATION) {
       merged.push(currentChunk);
     }

     return merged.map((chunk, idx) => ({ ...chunk, id: idx }));
   }

   // Apply merging
   const paragraphSegments = segments && segments.length > 0
     ? mergeSegmentsIntoParagraphs(segments)
     : null;
   ```

   **Result:**
   ```typescript
   // Before (sentence-level):
   [
     { id: 0, start: 0.0, end: 3.5, text: "En esta clase..." },
     { id: 1, start: 3.5, end: 7.2, text: "se aborda la..." },
     { id: 2, start: 7.2, end: 11.8, text: "biomecánica..." }
     // ... 200+ segments
   ]

   // After (paragraph-level):
   [
     {
       id: 0,
       start: 0.0,
       end: 42.3,
       text: "En esta clase, se aborda la biomecánica... (20-60 sec paragraph)"
     },
     {
       id: 1,
       start: 42.3,
       end: 89.7,
       text: "La columna vertebral incluye... (another paragraph)"
     }
     // ... 10-20 paragraphs total
   ]
   ```

5. **Call Content Processor** (lines ~190-200)
   ```typescript
   const { handleTranscriptionCompletion } = await import('@/lib/content-processor');

   await handleTranscriptionCompletion(jobId, {
     text: output.text,
     segments: paragraphSegments,
     detectedLanguage: language || 'en',
     languageConfidence: output.language_probability || 0.95
   });
   ```

6. **Return Success** (lines ~210-220)
   ```typescript
   return new Response(JSON.stringify({
     success: true,
     message: 'Transcription processed successfully'
   }), {
     status: 200,
     headers: { 'Content-Type': 'application/json' }
   });
   ```

---

## Stage 4: Content Processing Pipeline

**File**: `lib/content-processor.ts`

**Note**: Uses Grok AI (via `lib/grok-client.ts`) for all content generation

### Stage 4.1: Handle Transcription Completion

**Function**: `handleTranscriptionCompletion(jobId, transcriptionData)`

**Steps:**

1. **Check for Duplicates** (lines 74-84)
   ```typescript
   const { data: existingGuide } = await supabase
     .from('study_guides')
     .select('id')
     .eq('job_id', jobId)
     .single();

   if (existingGuide) {
     console.log('Study guide already exists, skipping');
     return;  // Prevent duplicate processing from webhook retries
   }
   ```

2. **Get Job Details** (lines 87-95)
   ```typescript
   const { data: job } = await supabase
     .from('jobs')
     .select('*')
     .eq('job_id', jobId)
     .single();
   ```

3. **Save Transcript to Storage** (lines 99-112)
   ```typescript
   const txtPath = `${jobId}.txt`;
   await supabase.storage
     .from('generated-notes')
     .upload(txtPath, transcriptionData.text, {
       contentType: 'text/plain',
       cacheControl: '3600'
     });
   ```

4. **Update Job with Transcript Data** (lines 115-126)
   ```typescript
   await supabase
     .from('jobs')
     .update({
       txt_file_path: txtPath,
       timestamped_transcript: transcriptionData.segments,  // 🔥 Paragraph segments
       detected_language: transcriptionData.detectedLanguage,
       language_confidence: transcriptionData.languageConfidence,
       transcription_completed_at: new Date().toISOString(),
       status: 'generating',
       updated_at: new Date().toISOString()
     })
     .eq('job_id', jobId);
   ```

5. **Continue to Grok Generation** (lines 137-143)
   ```typescript
   await handleGenerationStage(jobId, transcriptionData, {
     jobId,
     userId: job.user_id,
     lectureTitle: job.lecture_title,
     courseSubject: job.course_subject,
     mode: 'sync'
   });
   ```

---

### Stage 4.2: Grok AI Generation

**Function**: `handleGenerationStage(jobId, transcriptionData, context)`

**Steps:**

1. **Prepare Grok Input** (lines 165-170)
   ```typescript
   const mindsyNotesInput: MindsyNotesInput = {
     transcript: transcriptionData.text,
     lectureTitle: context.lectureTitle,
     courseSubject: context.courseSubject,
     detectedLanguage: transcriptionData.detectedLanguage
   };
   ```

2. **Call Grok AI** (lines 175-180)
   ```typescript
   console.log('🤖 Starting Grok AI generation with StudentDesk format...');

   generationResult = await generateStudentDeskContent(mindsyNotesInput);

   if (!generationResult.success || !generationResult.content) {
     throw new Error(`Grok generation failed: ${generationResult.error}`);
   }
   ```

3. **Continue to Finalization** (lines 183-186)
   ```typescript
   await handleFinalizationStage(jobId, {
     masterContent: generationResult.content,
     metadata: generationResult.content.metadata || {}
   }, context);
   ```

---

### Stage 4.3: Grok AI Generation Details

**File**: `lib/grok-client.ts`

**Function**: `generateStudentDeskContent(input: MindsyNotesInput)`

**Steps:**

1. **Create Prompt** (line 136)
   ```typescript
   const prompt = createStudentDeskPrompt(input);
   ```

2. **Call Grok API** (lines 143-158)
   ```typescript
   const completion = await grok.chat.completions.create({
     model: 'grok-4-fast-reasoning',
     messages: [
       {
         role: 'system',
         content: 'You are a world-class educational AI assistant...'
       },
       {
         role: 'user',
         content: prompt  // 🔥 The massive prompt with schema
       }
     ],
     response_format: { type: "json_object" },
     max_completion_tokens: 35000,
     temperature: 0.7
   });
   ```

3. **Parse Response** (lines 173-189)
   ```typescript
   const generatedContent = completion.choices[0]?.message?.content;

   let studentDeskContent = JSON.parse(generatedContent);

   // Auto-calculate quiz metrics
   if (studentDeskContent.questions) {
     const totalQuestions = studentDeskContent.questions.length;
     const totalPoints = studentDeskContent.questions.reduce(
       (sum, q) => sum + (q.points || 10), 0
     );
     const passingScore = Math.floor(totalPoints * 0.7);

     studentDeskContent.engagement.quizMetrics = {
       totalQuestions,
       totalPoints,
       passingScore
     };
   }

   return {
     success: true,
     content: studentDeskContent
   };
   ```

**Generated Content Structure:**
```json
{
  "metadata": { "title": "...", "difficulty": "...", ... },
  "overview": { "mainTopic": "...", "keyObjectives": [...], ... },
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "¿Cuál es la función primaria del esqueleto axial?",
      "choices": ["...", "...", "...", "..."],
      "correctAnswer": 0,
      "difficulty": "easy",
      "points": 10,
      "hint": "...",
      "feedback": "..."
    }
  ],
  "explanations": [
    {
      "id": "exp1",
      "concept": "Estructura del Esqueleto Axial",  // 🔥 Specific name!
      "introduction": "El esqueleto axial incluye...",  // 🔥 Paragraph
      "sections": [  // 🔥 NEW SCHEMA
        {
          "heading": "Características del Cráneo",
          "content": "El cráneo es principalmente...",
          "points": null
        },
        {
          "heading": "Movimientos de la Columna Vertebral",
          "content": "Los movimientos incluyen...",
          "points": [
            "Flexión: Inclinación hacia adelante",
            "Extensión: Inclinación hacia atrás",
            "Rotación: Giro del tronco"
          ]
        }
      ],
      "importance": "high",
      "example": "Durante la marcha..."
    }
  ],
  "summary": { "essentialPoints": [...], "examFocus": {...} },
  "engagement": { "quizMetrics": {...}, "achievements": [...] }
}
```

---

### Stage 4.4: Finalization

**Function**: `handleFinalizationStage(jobId, generationData, context)`

**Steps:**

1. **Update Status** (line 215)
   ```typescript
   await updateJobStatus(jobId, 'finalizing');
   ```

2. **Save JSON to Storage** (lines 218-224)
   ```typescript
   const jsonPath = `${jobId}.json`;
   await supabase.storage
     .from('generated-notes')
     .upload(jsonPath, JSON.stringify(generationData.masterContent, null, 2), {
       contentType: 'application/json',
       cacheControl: '3600'
     });
   ```

3. **Save Study Guide to Database** (lines 240-259)
   ```typescript
   const studyGuideData = {
     job_id: jobId,
     user_id: context.userId,
     title: context.lectureTitle,
     subject: context.courseSubject || null,
     language: generationData.masterContent.metadata?.language || 'en',
     questions: generationData.masterContent.questions || [],
     explanations: generationData.masterContent.explanations || [],  // 🔥 NEW SCHEMA
     summary: generationData.masterContent.summary || {},
     table_of_contents: generationData.masterContent.overview?.keyObjectives
       ?.join('\n') || '',
     created_at: new Date().toISOString(),
     updated_at: new Date().toISOString()
   };

   const { data: studyGuideRecord } = await supabase
     .from('study_guides')
     .insert(studyGuideData)
     .select()
     .single();
   ```

4. **Mark Job Complete** (lines 270-279)
   ```typescript
   await supabase
     .from('jobs')
     .update({
       json_file_path: jsonPath,
       pdf_file_path: null,  // Skipping PDF for now
       status: 'completed',
       processing_completed_at: new Date().toISOString(),
       updated_at: new Date().toISOString()
     })
     .eq('job_id', jobId);
   ```

5. **Return Success** (lines 289-296)
   ```typescript
   console.log('🎉 PIPELINE COMPLETED!', {
     jobId,
     title: context.lectureTitle,
     files: { json: jsonPath, pdf: null },
     studyGuideId: studyGuideRecord.id
   });

   return {
     success: true,
     files: { json: jsonPath, pdf: null },
     studyGuide: studyGuideRecord
   };
   ```

---

## Stage 5: User Views Student Desk

**File**: `/app/dashboard/lectures/[jobId]/student-desk/page.tsx`

**Steps:**

1. **Fetch Lecture Data** (lines ~40-60)
   ```typescript
   const { data: job } = await supabase
     .from('jobs')
     .select('*, study_guides(*)')
     .eq('job_id', jobId)
     .single();

   if (!job || job.status !== 'completed') {
     return <LoadingOrError />;
   }
   ```

2. **Extract Data** (lines ~70-90)
   ```typescript
   const studyGuide = job.study_guides[0];

   const lectureData = {
     title: job.lecture_title,
     subject: job.course_subject,

     // 🔥 Transcript with paragraph timestamps
     transcript: {
       text: job.txt_file_path ? '...' : null,
       segments: job.timestamped_transcript || null
     },

     // 🔥 Study content (NEW SCHEMA)
     overview: studyGuide.overview || {},
     questions: studyGuide.questions || [],
     explanations: studyGuide.explanations || [],  // NEW format
     summary: studyGuide.summary || {}
   };
   ```

3. **Render Student Desk** (lines ~100-110)
   ```typescript
   return (
     <DashboardWrapper>
       <StudentDesk lectureData={lectureData} jobId={jobId} />
     </DashboardWrapper>
   );
   ```

---

## Stage 6: Student Desk Renders

**File**: `components/student-desk-v2/StudentDesk.tsx`

**Steps:**

1. **Initialize Audio Player** (lines ~50-60)
   ```typescript
   const audioPlayerRef = useRef<PersistentAudioPlayerRef>(null);

   const handleSeekToTime = useCallback((timeInSeconds: number) => {
     if (audioPlayerRef.current) {
       audioPlayerRef.current.seekTo(timeInSeconds);
     }
   }, []);
   ```

2. **Map Explanations** (lines ~120-150)
   ```typescript
   const explanationsData = lectureData.explanations?.map((exp: any) => ({
     id: exp.id || `exp-${Math.random()}`,
     concept: exp.concept || exp.title || 'Unnamed Concept',

     // 🔥 NEW SCHEMA - Priority
     introduction: exp.introduction,
     sections: exp.sections,

     // 🔥 OLD SCHEMA - Fallback
     explanation: exp.explanation,
     keyPoints: exp.keyPoints,

     importance: exp.importance || 'medium',
     example: exp.example
   })) || [];
   ```

3. **Render Tabs** (lines ~200-300)
   ```typescript
   <div className="flex-1 overflow-y-auto">
     {activeTab === 'overview' && (
       <OverviewTab overview={lectureData.overview} />
     )}

     {activeTab === 'questions' && (
       <QuestionsTab questions={lectureData.questions} />
     )}

     {activeTab === 'explanations' && (
       <ExplanationsTab
         explanations={explanationsData}
         itemType="concept"
       />
     )}

     {activeTab === 'transcript' && (
       <TranscriptTab
         transcript={lectureData.transcript}
         onSeekToTime={handleSeekToTime}  // 🔥 Callback
       />
     )}

     {/* Other tabs... */}
   </div>

   {/* 🔥 Persistent Audio Player */}
   <PersistentAudioPlayer
     ref={audioPlayerRef}
     jobId={jobId}
   />
   ```

---

## Stage 7: Explanations Tab Renders

**File**: `components/student-desk-v2/tabs/ExplanationsTab.tsx`

**Rendering Logic:**

```typescript
{explanations.map((explanation, index) => {
  const isExpanded = expandedItems.has(explanation.id);

  return (
    <div key={explanation.id} className="border rounded-lg">
      {/* Header with orange badge */}
      <button onClick={() => toggleExpansion(explanation.id)}>
        <div className="w-8 h-8 bg-orange-500 rounded">
          {index + 1}
        </div>
        <h3>{explanation.concept}</h3>
        {isExpanded ? <ChevronUp /> : <ChevronDown />}
      </button>

      {/* Content - NEW SCHEMA */}
      {isExpanded && explanation.introduction && (
        <>
          {/* Introduction paragraph */}
          <div>{explanation.introduction}</div>

          {/* Subsections with headers */}
          {explanation.sections?.map(section => (
            <div key={section.heading}>
              <h4 className="font-semibold">{section.heading}</h4>
              <div>{section.content}</div>

              {section.points && (
                <ul>
                  {section.points.map(point => (
                    <li>• {point}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </>
      )}

      {/* Content - OLD SCHEMA Fallback */}
      {isExpanded && !explanation.introduction && (
        <div>{explanation.explanation || 'No explanation'}</div>
      )}
    </div>
  );
})}
```

---

## Stage 8: Transcript Tab with Timestamps

**File**: `components/student-desk-v2/tabs/TranscriptTab.tsx`

**Rendering:**

```typescript
{transcript.segments?.map(segment => (
  <div key={segment.id}>
    {/* Clickable timestamp */}
    <button
      onClick={() => handleTimestampClick(segment.start)}
      className="text-blue-600 hover:underline"
    >
      <Clock className="w-3 h-3" />
      {formatTime(segment.start)}  {/* "01:23" */}
    </button>

    {/* Paragraph text (20-60 seconds) */}
    <p className="text-gray-700">
      {segment.text}
    </p>
  </div>
))}
```

**When User Clicks Timestamp:**

```typescript
const handleTimestampClick = (timeInSeconds: number) => {
  if (onSeekToTime) {
    onSeekToTime(timeInSeconds);  // → handleSeekToTime in StudentDesk
  }
};

// In StudentDesk
const handleSeekToTime = useCallback((timeInSeconds: number) => {
  if (audioPlayerRef.current) {
    audioPlayerRef.current.seekTo(timeInSeconds);  // → PersistentAudioPlayer
  }
}, []);

// In PersistentAudioPlayer
useImperativeHandle(ref, () => ({
  seekTo: (timeInSeconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = timeInSeconds;
      audioRef.current.play();
    }
  }
}));
```

---

## Complete Timeline Example

**Upload to Viewing:**

```
T+0s:    User uploads "clase-9.mp3" (45 min audio)
T+1s:    Job created (ID: abc-123)
T+2s:    File uploaded to Supabase Storage
T+3s:    Signed URL created
T+4s:    RunPod job submitted (webhook mode)
T+5s:    API returns to user: "Processing in background"
         User sees: "Transcribing..." in UI

T+45s:   RunPod finishes transcription
         Sends webhook to /api/runpod-webhook

T+46s:   Webhook receives 250 sentence-level segments
T+47s:   Merges into 15 paragraph-level segments (20-60 sec each)
T+48s:   Saves transcript.txt to storage
T+49s:   Updates job: status = 'generating'
         User sees: "Generating study materials..."

T+50s:   Calls Grok generateStudentDeskContent()
T+110s:  Grok returns JSON (60 seconds)
         - 4 explanations (NEW schema with sections)
         - 15 questions (mix of types)
         - Summary and overview

T+111s:  Saves study_guide to database
T+112s:  Saves content.json to storage
T+113s:  Updates job: status = 'completed'
         User sees: "✅ Ready!" in UI

T+114s:  User clicks lecture
T+115s:  Student Desk loads
         - Fetches from database
         - Maps NEW schema to UI components
         - Renders 6 tabs
         - Loads persistent audio player

T+120s:  User clicks transcript timestamp "01:23"
         Audio player seeks to 83 seconds
         Audio plays from that point
         User switches to Explanations tab
         Audio keeps playing (persistent!)

SUCCESS! 🎉
```

---

## Critical Checkpoints

### ✅ Checklist for Each Stage

**Stage 1: Upload**
- [ ] Job created with UUID
- [ ] Audio file in Supabase Storage
- [ ] Signed URL created (60 min expiry)

**Stage 2: Transcription**
- [ ] RunPod job submitted (webhook or poll)
- [ ] Job status = 'transcribing'
- [ ] RunPod job ID saved (for webhook lookup)

**Stage 3: Webhook**
- [ ] Webhook receives COMPLETED status
- [ ] Segments extracted (sentence-level)
- [ ] **Segments merged (paragraph-level)**
- [ ] Internal job found by RunPod ID

**Stage 4.1: Transcript Save**
- [ ] .txt file saved to storage
- [ ] timestamped_transcript saved (paragraphs!)
- [ ] detected_language saved
- [ ] Job status = 'generating'

**Stage 4.2: Grok AI**
- [ ] Prompt created with NEW schema requirements
- [ ] Grok returns valid JSON
- [ ] **Explanations use NEW schema** (introduction + sections)
- [ ] Questions have hints and feedback

**Stage 4.3: Finalization**
- [ ] .json file saved to storage
- [ ] study_guides record created
- [ ] **Explanations saved with NEW structure**
- [ ] Job status = 'completed'

**Stage 5-8: Display**
- [ ] Student Desk fetches data
- [ ] Maps explanations correctly (NEW/OLD)
- [ ] Renders orange numbered badges
- [ ] Transcript shows paragraph chunks
- [ ] Timestamps clickable
- [ ] Audio player persistent across tabs

---

## Common Pipeline Failures

### Failure at Stage 2
```
Error: RunPod timeout
Cause: Audio file too large or slow network
Fix: Increase timeout, check file size limits
```

### Failure at Stage 3
```
Error: Job not found by runpod_job_id
Cause: Job ID mismatch or database lag
Fix: Add retry logic, check database transaction timing
```

### Failure at Stage 4.2
```
Error: Grok returned old schema
Cause: Model ignored instructions
Fix: Make prompt more explicit (done!), add validation
```

### Failure at Display
```
Error: "Key Concept" placeholders shown
Cause: Using old database data
Fix: Upload new file to test new schema
```

---

## Emergency Debugging Commands

```bash
# Check job status
SELECT job_id, status, lecture_title, processing_mode, error_message
FROM jobs
WHERE job_id = 'abc-123';

# Check if study guide exists
SELECT id, title, language,
       jsonb_array_length(questions) as num_questions,
       jsonb_array_length(explanations) as num_explanations
FROM study_guides
WHERE job_id = 'abc-123';

# Check explanation schema
SELECT explanations->>0
FROM study_guides
WHERE job_id = 'abc-123';

# Check if using NEW schema
SELECT
  explanations->0->>'introduction' as has_new_intro,
  explanations->0->>'sections' as has_new_sections,
  explanations->0->>'explanation' as has_old_explanation
FROM study_guides
WHERE job_id = 'abc-123';

# Check transcript segments
SELECT
  jsonb_array_length(timestamped_transcript) as num_segments,
  timestamped_transcript->0->>'start' as first_start,
  timestamped_transcript->0->>'end' as first_end
FROM jobs
WHERE job_id = 'abc-123';
```

---

## Success Indicators

**Pipeline Working Correctly:**
- ✅ Jobs complete in 60-180 seconds (webhook mode)
- ✅ Explanations have specific concept names
- ✅ Explanations have `introduction` and `sections` fields
- ✅ Transcript has 10-30 paragraph segments (not 100+ sentences)
- ✅ Clicking timestamps seeks audio correctly
- ✅ Audio persists across tab changes
- ✅ Orange numbered badges visible
- ✅ Content is rich (not "coming soon")

**Pipeline Broken:**
- ❌ Jobs stuck in 'transcribing' or 'generating'
- ❌ "Key Concept" placeholders everywhere
- ❌ "Detailed explanation coming soon"
- ❌ Transcript has 200+ sentence-level segments
- ❌ Audio plays twice when clicking timestamps
- ❌ Audio stops when changing tabs

---

## Final Notes

This pipeline is **complex** but **well-structured**. Key success factors:

1. **Webhook reliability** - Must handle retries and idempotency
2. **Schema consistency** - OpenAI MUST follow new schema
3. **Segment merging** - Critical for good UX (paragraphs not sentences)
4. **Data mapping** - Bridge between database and UI formats
5. **Error handling** - Graceful degradation at each stage

When debugging, **follow the data flow** from upload to display. Use emoji markers in logs (🚀 🤖 ✅ ❌) to track progress.

Good luck! 🎯
