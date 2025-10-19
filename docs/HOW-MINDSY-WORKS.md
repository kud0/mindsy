# How Mindsy Works - Simple Overview

## What Mindsy Does
Mindsy helps students by converting their lecture audio into comprehensive study materials automatically.

## The Main Flow (Upload → Study Materials)

### 1. Student Uploads Audio
- Student goes to dashboard
- Uploads an audio file (lecture recording)
- Provides lecture title and subject

### 2. Audio Gets Transcribed (RunPod)
- Audio file goes to RunPod service
- RunPod converts speech to text
- Detects the language automatically
- Sends transcription back via webhook

### 3. Content Generation (Grok AI)
- Takes the transcription text
- Grok AI generates structured study content:
  - Study questions
  - Detailed explanations
  - Comprehensive summary
  - Table of contents

### 4. Content Storage
- Generated content saved to `study_guides` table
- PDF generated from the content
- All files stored in Supabase storage

### 5. Student Views Content (StudentDesk)
- Student clicks on their lecture
- Goes to `/dashboard/lectures/[jobId]/student-desk`
- StudentDesk component shows 4 tabs:
  - Questions tab - Study questions
  - Explanations tab - Detailed notes
  - Summary tab - Key takeaways
  - Transcript tab - Original transcription

## Key Components

### API Endpoints
- `/api/generate` - Main upload handler
- `/api/runpod-webhook` - Receives transcription completion
- `/api/lectures/[jobId]/structured` - Fetches content for StudentDesk

### Data Flow
```
Audio Upload → RunPod Transcription → Webhook → Grok AI Generation → Database → StudentDesk Display
```

### Database Tables
- `jobs` - Tracks processing status
- `study_guides` - Stores generated content
- `user_uploads` - Original audio files
- `generated-notes` - Generated files (JSON, PDF, TXT)

## Current Issue
Some lectures have transcriptions but never triggered Grok AI generation, so they show "no content" when opened.

## Technologies
- **Frontend**: Next.js, React, TypeScript
- **Backend**: Supabase (PostgreSQL)
- **AI Services**:
  - RunPod (transcription)
  - Grok AI / xAI (content generation, model: grok-4-fast-reasoning)
- **Storage**: Supabase Storage