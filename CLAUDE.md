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

## Quiz Battles (Gamified Learning)

**Head-to-head quiz competitions between friends using study materials.**
- ✅ **Battle System**: Full lifecycle (create → accept → play → complete) (COMPLETE)
- ✅ **Multi-Round Gameplay**: 3 rounds, 5 questions each, async play (COMPLETE)
- ✅ **Question Generation**: Hybrid system (existing + Grok AI) with language detection (COMPLETE)
- ✅ **Battle Management**: Create, accept, decline, forfeit with proper state machine (COMPLETE)

**📖 Full documentation:** `.claude/quiz-battles-overview.md`

**Quick overview:**
- Challenge friends from friends list to quiz battles
- Questions sourced from challenger's folder content
- Async gameplay - players answer at different times
- Proper answer shuffling (A/B/C/D randomization)
- Learning-focused - private stats, no public leaderboards
- Battle history with wins, losses, draws

**Database tables:** `quiz_battles`, `battle_rounds`, `battle_participants`, `battle_stats`
**API routes:** `/api/battles/`, `/api/battles/create`, `/api/battles/[battleId]/`, `/api/battles/[battleId]/accept`, `/api/battles/[battleId]/submit-round`
**See:** `migrations/015-018_*.sql` and `.claude/quiz-battles-overview.md` for complete details

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

## Active Course System

**Swipeable widget showing current courses with deadlines and progress tracking.**
- ✅ **Active Course Selection**: Set 1-2 courses as active (max enforced at DB level)
- ✅ **Year/Semester Selection**: Choose which parent folder is currently active
- ✅ **Progress Tracking**: Recursive calculation for active folder tree
- ✅ **Deadline Display**: Next essay/assignment (≤14 days) + next exam (always shown)
- ✅ **Swipeable Widget**: Framer Motion interface with arrow navigation

**📖 Full documentation:** `docs/ACTIVE-COURSE-SYSTEM.md`

**Quick overview:**
- Max 2 active courses enforced by database trigger
- Must select year/semester folder when activating (e.g., "Primer curso", "Segundo curso")
- Widget shows swipeable cards with progress bars and upcoming deadlines
- Color-coded urgency: Red (≤2 days), Amber (2-5 days), Purple (5-7 days), Blue (exams)
- Progress calculated only for active folder + descendants

**Database tables:** `course_enrollments` (with `active_folder_id`), `study_sessions` (with deadline fields)
**Migrations:** `023_add_active_course_support.sql`, `024_add_deadline_support.sql`, `026_fix_active_folder_logic.sql`
**API routes:** `/api/enrollments/my-courses?active=true`, `/api/enrollments/[enrollmentId]`, `/api/schedule/upcoming-deadlines`, `/api/courses/[courseId]/year-folders`, `/api/courses/[courseId]/progress`
**Components:** `CoursesWidget.tsx`, `ActiveCourseCard.tsx`, `YearSelectorDialog.tsx`
**See:** `docs/ACTIVE-COURSE-SYSTEM.md` for complete system documentation

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
2. **Social System**: Friends, notifications, content sharing, quiz battles
3. **Course System**: Create/join courses, AI-generated folder structures via OpenAI web search
4. **Folder Management**: Hierarchical organization (create, edit, delete, reorder, nest)
5. **Active Courses**: Set 1-2 active courses with year/semester selection and deadline tracking
6. **Upload System**: Audio files, YouTube links, documents (PDF/TXT/DOC)
7. **Content Processing**: Transcription → AI Generation → Study Materials
8. **Study Interface**: 4-tab system (Questions, Notes, Summary, Files)
9. **Quiz Battles**: Head-to-head competitions with friends using study materials

## Key API Routes

### Courses & Folders
- `/api/courses/create` - Create new course
- `/api/courses/[courseId]` - Get/delete course details
- `/api/courses/[courseId]/folders` - GET (list) / POST (create folder)
- `/api/courses/[courseId]/generate-folders` - AI-generate folders from syllabus
- `/api/courses/[courseId]/year-folders` - GET top-level folders for year/semester selection
- `/api/courses/[courseId]/progress` - GET progress for active folder tree
- `/api/folders/[folderId]` - PATCH (edit) / DELETE folder

### Active Courses & Deadlines
- `/api/enrollments/my-courses` - GET all enrollments (supports `?active=true`)
- `/api/enrollments/[enrollmentId]` - PATCH to activate/deactivate and set active folder
- `/api/schedule/upcoming-deadlines` - GET next deadline and next exam for course

### Content Processing
- `/api/generate` - Main content processing endpoint
- `/api/lectures/[jobId]/structured` - Structured study content
- `/api/upload` - File upload handler
- `/api/runpod-webhook` - Transcription webhook
- `/api/files/view` - Secure file viewing

### Quiz Battles
- `/api/battles` - GET list battles (supports ?status=pending|active|completed)
- `/api/battles/create` - POST create battle challenge
- `/api/battles/[battleId]` - GET battle details, DELETE cancel/forfeit
- `/api/battles/[battleId]/accept` - POST accept challenge & generate Round 1
- `/api/battles/[battleId]/submit-round` - POST submit round answers
- `/api/folders` - GET user folders for battle creation

## Environment Variables

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI Services
RUNPOD_API_KEY=
OPENAI_API_KEY=            # For course folder generation with web search
GROK_API_KEY=              # Primary AI for content generation & battle questions (xAI)

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
- Key tables: `users`, `profiles`, `courses`, `course_enrollments`, `user_folders`, `notes`, `study_nodes`, `study_sessions`, `user_connections`, `notifications`, `shared_content`, `quiz_battles`, `battle_rounds`, `battle_participants`
- Active course system uses: `course_enrollments.is_active_course`, `course_enrollments.active_folder_id`, `study_sessions.is_deadline`, `study_sessions.deadline_type`

## Current Status

✅ **Functional Features:**
- Full authentication system with protected routes
- Social system (friends, notifications, content sharing)
- **Quiz Battles** (head-to-head competitions, fully functional)
- **Active Course System** (max 2 active, year/semester selection, deadline tracking)
- Course creation and enrollment system
- AI-powered folder generation (OpenAI web search)
- Manual folder management (CRUD, reorder, cascade delete)
- Multi-tab upload dialog (Audio/Link/Documents)
- Hierarchical folder organization (unlimited nesting)
- 4-tab study interface with navigation
- PDF generation and viewing
- Real-time processing status
- Swipeable dashboard widget with progress and deadlines

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