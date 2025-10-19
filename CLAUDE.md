# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with this repository.

## Project Overview

**Mindsy** - AI-powered study platform for processing lectures and generating study materials
- **Framework**: Next.js 15 with App Router, React 19, TypeScript 5
- **Styling**: Tailwind CSS 4, Shadcn/UI components
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Real-time)
- **AI Services**: RunPod (transcription), Grok AI / xAI (content generation)

## Social Features

**Comprehensive social system for students to connect and share study materials.**
- ✅ **Phase 1**: Friends + Real-time Notifications (COMPLETE)
- ✅ **Phase 3**: Content Sharing with Copy Model (COMPLETE)

**📖 Full documentation:** `.claude/social-features-overview.md`

**Quick overview:**
- Bidirectional friend system (mutual friendships)
- Real-time notifications via Supabase Realtime
- Share lectures with friends (full copy model)
- Social widget on dashboard showing stats
- Shared content tab to view sent/received lectures

**Database tables:** `profiles`, `user_connections`, `notifications`, `shared_content`
**See:** `migrations/00[1-4]_*.sql` and `.claude/social-features-overview.md` for details

## Course & Folder Management

**Comprehensive course organization with AI-powered folder generation.**
- ✅ **Course Discovery**: Create/join courses at institutions
- ✅ **AI Folder Generation**: OpenAI (gpt-5) with web search generates folder structures
- ✅ **Manual Folder Management**: Full CRUD operations (create, edit, delete, reorder)
- ✅ **Hierarchical Organization**: Unlimited nesting depth (parent → child → grandchild...)
- ✅ **Cascade Delete**: Deleting parent removes all descendants

**📖 Full documentation:** `docs/FOLDER-MANAGEMENT-SYSTEM.md`

**Quick overview:**
- AI scrapes official university syllabi to create folder structure
- Context menus (3-dot) on all folders for management
- Collapse/expand sections
- Move up/down to reorder siblings
- Section headers (e.g., "Primer curso") are visual separators, not clickable
- Only child folders (e.g., "Biología") are clickable destinations

**Database tables:** `courses`, `course_enrollments`, `user_folders`, `course_templates`
**API routes:** `/api/courses/`, `/api/folders/[folderId]`, `/api/courses/[courseId]/folders/`
**See:** `docs/FOLDER-MANAGEMENT-SYSTEM.md` for complete system documentation

## Development Commands

```bash
npm run dev      # Development server (Turbopack)
npm run build    # Production build
npm start        # Production server
npm run lint     # ESLint
```

## Project Structure

```
/app/              # Next.js App Router pages and layouts
  /api/            # API routes
  /dashboard/      # Protected dashboard pages
  /auth/           # Authentication pages
/components/       # React components
/lib/              # Business logic and utilities
  /supabase/       # Database clients
/types/            # TypeScript definitions
/public/           # Static assets
```

## Core Features

1. **Authentication**: Email/password and OAuth (GitHub)
2. **Course System**: Create/join courses, AI-generated folder structures via OpenAI web search
3. **Folder Management**: Hierarchical organization (create, edit, delete, reorder, nest)
4. **Upload System**: Audio files, YouTube links, documents (PDF/TXT/DOC)
5. **Content Processing**: Transcription → AI Generation → Study Materials
6. **Study Interface**: 4-tab system (Questions, Notes, Summary, Files)

## Key API Routes

### Courses & Folders
- `/api/courses/create` - Create new course
- `/api/courses/[courseId]` - Get/delete course details
- `/api/courses/[courseId]/folders` - GET (list) / POST (create folder)
- `/api/courses/[courseId]/generate-folders` - AI-generate folders from syllabus
- `/api/folders/[folderId]` - PATCH (edit) / DELETE folder

### Content Processing
- `/api/generate` - Main content processing endpoint
- `/api/lectures/[jobId]/structured` - Structured study content
- `/api/upload` - File upload handler
- `/api/runpod-webhook` - Transcription webhook
- `/api/files/view` - Secure file viewing

## Environment Variables

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
RUNPOD_API_KEY=
OPENAI_API_KEY=            # For course folder generation with web search
GROK_API_KEY=              # Primary AI for content generation (xAI)

# Webhooks (Optional for local dev)
WEBHOOK_BASE_URL=          # For ngrok/production
WEBHOOK_SECRET=            # Security token
```

## Development Guidelines

### Code Style
- Use TypeScript strict mode
- Follow existing patterns in the codebase
- Prefer editing existing files over creating new ones
- Keep components under 500 lines

### API Design
- Business logic in `/lib`, not in API routes
- API routes handle HTTP concerns only
- Use proper error handling and validation
- Implement proper authentication checks

### Database
- PostgreSQL with Row Level Security (RLS)
- Type-safe queries with Supabase client
- Key tables: `users`, `courses`, `course_enrollments`, `user_folders`, `notes`, `study_nodes`

## Current Status

✅ **Functional Features:**
- Full authentication system with protected routes
- Course creation and enrollment system
- AI-powered folder generation (OpenAI web search)
- Manual folder management (CRUD, reorder, cascade delete)
- Multi-tab upload dialog (Audio/Link/Documents)
- Hierarchical folder organization (unlimited nesting)
- 4-tab study interface with navigation
- PDF generation and viewing
- Real-time processing status

🚧 **In Progress:**
- Exam generation system
- Pomodoro timer
- Performance optimizations

## Quick Start

1. Clone repository
2. Install dependencies: `npm install`
3. Set up environment variables in `.env.local`
4. Run development server: `npm run dev`
5. Access at `http://localhost:3001`

## Important Notes

- Always check file existence before editing
- Maintain backwards compatibility with existing data
- Test with both new and legacy database schemas
- Keep API responses consistent