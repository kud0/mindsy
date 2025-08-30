# Upload Architecture Documentation

## Overview
This document describes the clean, single-flow upload architecture for Mindsy after removing duplicate components.

## ✅ Clean Upload Flow

### 1. **Frontend Components**
```
/components/upload/
├── UploadWidget.tsx    - Main upload trigger (button/card variants)
└── UploadDialog.tsx    - Multi-tab upload dialog (Audio/Link/Documents)
```

### 2. **API Routes**
```
/app/api/
├── upload/route.ts     - Handles file uploads to Supabase Storage
└── generate/route.ts   - Processes content with AI and generates formats
```

### 3. **Processing Libraries**
```
/lib/
├── openai-client.ts         - OpenAI integration
├── multi-format-generator.ts - Creates all formats (PDF, Markdown, JSON)
├── runpod-client.ts         - Audio transcription
└── gotenberg-client.ts      - PDF generation from HTML
```

## 📊 Data Flow

```mermaid
graph TD
    A[User Clicks Upload] --> B[UploadWidget]
    B --> C[UploadDialog Opens]
    C --> D{Upload Type}
    D -->|Audio| E[Upload to Supabase]
    D -->|Link| F[Extract Content]
    D -->|Documents| G[Upload Documents]
    E --> H[/api/upload]
    F --> H
    G --> H
    H --> I[/api/generate]
    I --> J[RunPod Transcription]
    J --> K[OpenAI Processing]
    K --> L[Generate All Formats]
    L --> M[Beautiful PDF with CSS]
    L --> N[Markdown]
    L --> O[JSON Structure]
    M --> P[Save to study_guides]
    N --> P
    O --> P
    P --> Q[Real-time Update]
    Q --> R[Lecture Card Appears]
    R --> S[Processing Badge]
    S --> T[Completed]
```

## 🎨 PDF Styling

The PDF generation uses beautiful CSS styling defined in `/lib/multi-format-generator.ts`:

```css
body { 
  font-family: 'Inter', sans-serif; 
  line-height: 1.6; 
  color: #333; 
}

h1 { 
  color: #1e40af; 
  border-bottom: 3px solid #3b82f6; 
  padding-bottom: 10px; 
}

.question-box { 
  background: #f8fafc; 
  border-left: 4px solid #3b82f6; 
  padding: 20px; 
  margin: 20px 0; 
}

.answer-box { 
  background: #f0f9ff; 
  padding: 15px; 
  border-radius: 8px; 
  margin-top: 10px; 
}
```

## 🔄 Real-time Updates

The lectures page (`StudiesWithLectures.tsx`) uses the `useRealtimeJobs` hook to:
1. Listen for new job insertions
2. Update job status (processing → completed)
3. Show toast notifications
4. Update lecture cards in real-time

## 📁 Database Tables

### jobs
- Stores upload jobs and processing status
- Contains file paths and metadata
- Real-time subscriptions for status updates

### study_guides
- Stores generated content (questions, explanations, summary)
- Clean JSON structure
- Linked to jobs table

### notes (legacy)
- Old table for backward compatibility
- Being phased out

## 🚀 Upload Dialog Features

### Three Upload Tabs:
1. **Audio** - MP3, WAV, M4A files up to 500MB
2. **Link** - YouTube, podcast, article URLs
3. **Documents** - PDF, TXT, DOC, DOCX up to 50MB each

### Key Features:
- Drag & drop support
- Audio preview player
- Multi-file document upload
- Progress tracking
- Auto-close on success
- Error handling with retry options

## ⚠️ Removed Components

The following duplicate components have been removed:
- `StructuredUploadDialog.tsx` - Duplicate dialog
- `EnhancedUploadWidget.tsx` - Duplicate widget
- `EnhancedUploadButton.tsx` - Unused button
- `/api/upload-structured` - Incomplete endpoint
- `structured-content-processor.ts` - Unused processor
- `/cornellsummaryai` folder - Old migration code

## 🎯 Best Practices

1. **Single Source of Truth**: One upload flow, one API endpoint
2. **Clean Separation**: Upload → Process → Generate → Display
3. **Real-time Feedback**: Immediate updates via Supabase subscriptions
4. **Error Recovery**: Graceful handling with user-friendly messages
5. **Progressive Enhancement**: Start simple, enhance with features

## 🔧 Maintenance Tips

1. All upload logic is in `UploadDialog.tsx`
2. All processing logic is in `/api/generate`
3. All PDF styling is in `multi-format-generator.ts`
4. All real-time updates use `useRealtimeJobs` hook

## 📝 Future Improvements

- [ ] Add upload queue for multiple files
- [ ] Implement retry mechanism for failed jobs
- [ ] Add upload progress to global state
- [ ] Cache transcriptions for duplicate files
- [ ] Add bulk upload functionality