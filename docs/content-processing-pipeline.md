# Content Processing Pipeline Architecture

## Overview

The content processing pipeline transforms raw audio files into structured study materials through a multi-stage asynchronous architecture that supports both webhooks and polling modes.

## Pipeline Stages

```
Audio Upload → Transcription → AI Generation → Finalization → Completion
     ↓              ↓              ↓              ↓             ↓
  uploading    transcribing    generating    finalizing    completed
```

### Stage 1: Upload Processing
- **Status**: `uploading` → `transcribing`
- **Process**: Audio file upload and RunPod transcription job submission
- **Modes**: 
  - **Sync**: Uses polling with exponential backoff (2s → 4s → 8s → 16s → 30s)
  - **Async**: Uses webhooks for instant notification when complete

### Stage 2: Transcription
- **Service**: RunPod Whisper API
- **Input**: Audio file URL
- **Output**: Transcribed text + detected language
- **Duration**: 30 seconds - 10 minutes depending on audio length

### Stage 3: AI Generation  
- **Status**: `transcribing` → `generating`
- **Service**: OpenAI GPT (currently sync, webhook support planned)
- **Input**: Transcript + metadata
- **Output**: Structured study materials (questions, explanations, summary)
- **Duration**: 1-3 minutes depending on content length

### Stage 4: Finalization
- **Status**: `generating` → `finalizing` → `completed`
- **Process**: PDF generation, file storage, database saves
- **Outputs**:
  - PDF study guide
  - JSON structured data
  - TXT transcript
  - Database study guide record

## Architecture Components

### Core Libraries

#### `/lib/content-processor.ts`
- **Purpose**: Multi-stage pipeline orchestration
- **Functions**:
  - `handleTranscriptionCompletion()` - Stage 1 → 2
  - `handleGenerationStage()` - Stage 2 → 3  
  - `handleFinalizationStage()` - Stage 3 → 4
- **Features**: 
  - Status management
  - Error handling with rollback
  - Mode detection (sync/async)

#### `/lib/pdf-generator.ts`
- **Purpose**: PDF generation from study materials
- **Features**:
  - Beautiful responsive design
  - Multi-language support
  - Local/production optimization
  - Structured content layout

### API Endpoints

#### `/api/generate`
- **Purpose**: Main entry point for content processing
- **Flow**:
  ```
  1. Create job record
  2. Upload audio to storage  
  3. Submit to RunPod (webhook or polling)
  4. If polling: continue full pipeline
  5. If webhook: return job ID and wait
  ```

#### `/api/runpod-webhook`  
- **Purpose**: Receive RunPod transcription results
- **Flow**:
  ```
  1. Receive POST from RunPod
  2. Extract transcription data
  3. Call content-processor.handleTranscriptionCompletion()
  4. Continue pipeline from Stage 2
  ```

#### `/api/openai-webhook` (Future)
- **Purpose**: Receive OpenAI generation results  
- **Status**: Planned for true async OpenAI processing

## Processing Modes

### Synchronous Mode (Polling)
- **When**: No webhook URL configured
- **Flow**: `/api/generate` handles entire pipeline synchronously
- **Pros**: Simple, no external dependencies
- **Cons**: Timeouts on long jobs, resource intensive

### Asynchronous Mode (Webhooks)
- **When**: Webhook URL configured (production or ngrok for dev)
- **Flow**: 
  1. `/api/generate` submits job and returns immediately
  2. `/api/runpod-webhook` continues pipeline when ready
  3. Future: `/api/openai-webhook` for OpenAI results
- **Pros**: No timeouts, scalable, efficient
- **Cons**: More complex, requires proper URL setup

## Job Status Progression

```javascript
// Complete job status enum (matches database)
type JobStatus = 
  | 'pending'        // Initial state after upload
  | 'processing'     // General processing (legacy)
  | 'transcribing'   // RunPod processing audio  
  | 'generating'     // OpenAI creating study materials
  | 'finalizing'     // PDF/storage/database operations
  | 'completed'      // All processing finished
  | 'failed'         // Error at any stage
  | 'cached';        // Content retrieved from cache
```

**Typical Flow:**
```
pending → processing → transcribing → generating → finalizing → completed
                    ↓
                  failed (at any stage)
```

## Database Schema

### Jobs Table (Final Schema)
```sql
jobs (
  job_id: uuid PRIMARY KEY,
  user_id: uuid REFERENCES users(id),
  lecture_title: text NOT NULL,
  course_subject: text,
  
  -- Status and Processing
  status: job_status_enum DEFAULT 'pending', -- pending, processing, transcribing, generating, finalizing, completed, failed, cached
  processing_mode: text DEFAULT 'sync', -- 'sync' | 'async'
  error_message: text,
  
  -- File Paths
  audio_file_path: text,
  txt_file_path: text,
  json_file_path: text, -- Raw OpenAI JSON response
  output_pdf_path: text, -- Final generated PDF
  md_file_path: text,    -- Legacy markdown file
  pdf_file_path: text,   -- Additional PDF input
  
  -- External Job IDs
  runpod_job_id: text, -- For webhook correlation
  
  -- Metadata
  audio_duration_minutes: numeric,
  duration_minutes: integer,
  file_size_mb: integer,
  study_node_id: uuid REFERENCES study_nodes(id),
  
  -- Review System
  marked_for_review: boolean DEFAULT false,
  review_reason: text,
  
  -- Timestamps
  processing_started_at: timestamp,
  processing_completed_at: timestamp,
  created_at: timestamp DEFAULT now(),
  updated_at: timestamp DEFAULT now()
)
```

### Study Guides Table  
```sql
study_guides (
  id: uuid PRIMARY KEY,
  job_id: uuid REFERENCES jobs(job_id),
  user_id: uuid REFERENCES users(id),
  title: text,
  subject: text,
  language: text,
  questions: jsonb,
  explanations: jsonb,
  summary: jsonb,
  table_of_contents: text,
  created_at: timestamp,
  updated_at: timestamp
)
```

## Error Handling

### Failure Points
1. **Audio Upload**: File size, format, or storage issues
2. **RunPod Transcription**: Service timeout, quota limits, API errors
3. **OpenAI Generation**: Rate limits, content policy, API errors  
4. **PDF Generation**: Memory limits, Chromium issues
5. **Database Operations**: Connection, constraint violations

### Recovery Strategy
```javascript
// Each stage handles its own errors and updates job status
try {
  await processStage();
} catch (error) {
  await updateJobStatus(jobId, 'failed', error.message);
  throw error; // Let caller handle notification
}
```

## Configuration

### Environment Variables
```bash
# Webhook Configuration
WEBHOOK_BASE_URL=https://your-app.com  # Production
WEBHOOK_BASE_URL=https://abc.ngrok.io  # Development with ngrok

# Service APIs
RUNPOD_API_KEY=your_runpod_key
OPENAI_KEY=your_openai_key

# Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

### Webhook Setup for Development
```bash
# Terminal 1: Start ngrok
./scripts/start-ngrok.sh

# Terminal 2: Set webhook URL
echo "WEBHOOK_BASE_URL=https://abc123.ngrok.io" >> .env.local

# Terminal 3: Start Next.js
npm run dev
```

## Monitoring & Debugging

### Log Structure
```
🚀 Stage X: Starting [operation] for job: [jobId]
✅ Stage X: [operation] completed successfully  
❌ Stage X: [operation] failed - [error details]
```

### Key Metrics
- **Processing Time**: Track duration of each stage
- **Success Rate**: Monitor failures by stage and cause
- **Queue Length**: Watch for backlog in async mode
- **Resource Usage**: Memory/CPU during PDF generation

## Migration History

### Database Schema Updates
```sql
-- Migration 1: Add webhook support
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'transcribing';
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'generating'; 
ALTER TYPE job_status ADD VALUE IF NOT EXISTS 'finalizing';

-- Migration 2: Add file storage
ALTER TABLE jobs ADD COLUMN json_file_path TEXT;

-- Migration 3: Add indexes
CREATE INDEX IF NOT EXISTS idx_jobs_runpod_job_id ON jobs(runpod_job_id);
```

## Future Enhancements

### OpenAI Webhooks
- Implement `/api/openai-webhook` endpoint
- Add OpenAI webhook job submission
- True end-to-end async processing

### Queue System
- Redis/BullMQ for job queuing
- Retry logic with exponential backoff
- Priority handling for paid users

### Real-time Updates
- WebSocket connections for live status
- Server-sent events for progress updates
- Real-time dashboard for job monitoring

## Testing Strategy

### Unit Tests
```bash
# Test individual pipeline stages
npm test lib/content-processor.test.ts
npm test lib/pdf-generator.test.ts
```

### Integration Tests  
```bash
# Test complete pipeline flows
npm test api/generate.integration.test.ts
npm test api/runpod-webhook.integration.test.ts
```

### Load Testing
```bash
# Test concurrent job processing
npm run test:load
```

## Deployment Considerations

### Production Checklist
- [ ] Webhook URLs configured correctly
- [ ] RunPod API keys active
- [ ] OpenAI API keys with sufficient quota
- [ ] Supabase storage buckets configured
- [ ] PDF generation memory limits appropriate
- [ ] Error monitoring (Sentry, etc.) enabled

### Scaling Points
1. **Concurrent Jobs**: Limited by OpenAI rate limits
2. **PDF Generation**: Memory-intensive, consider separate service
3. **File Storage**: Monitor Supabase storage quotas
4. **Database**: Index job_id and user_id columns properly