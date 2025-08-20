# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Mindsy Notes Generator** - A modern Astro-based dashboard application that generates Cornell-style notes from audio recordings and optional PDF files. The application features a comprehensive dashboard with study management, exam generation, Pomodoro timer, and multi-format note output capabilities. Built with React components and Supabase backend for scalable note management and user authentication.

## ⚠️ DEPRECATED & CLEANUP NEEDED

**This codebase contains significant amounts of unused/legacy code that should be cleaned up:**

### Deprecated Components & Pages:
- `src/pages/legacy/` - Old dashboard versions (Spanish & English)
- `src/pages/blog/` - Complete blog system with content collections (minimal use)
- `src/pages/test-callback.astro` - Development testing page
- Multiple webhook variants: `webhook-simple.ts`, `webhook-working.ts`, `trigger-n8n.ts`
- Unused public assets: roadmap images, test HTML files, sample notes
- Obsolete API endpoints for old architecture patterns

### Blog System Status:
- **Blog content collection**: Implemented but contains only 2 sample posts
- **Multi-language blog**: Spanish blog system fully implemented but unused
- **Blog infrastructure**: Complete with RSS, sitemaps, tags, authors - minimal actual content
- **Consider**: Remove entire blog system unless content strategy is planned

## Tech Stack & Architecture

- **Framework**: Astro v5 with SSR (server output mode)
- **Frontend**: React 19 with TypeScript, shadcn/ui components, Tailwind CSS
- **Backend**: Node.js with ES modules, Vercel serverless functions
- **Database**: Supabase (PostgreSQL) with comprehensive schema
- **Authentication**: Supabase Auth with optional GitHub OAuth
- **File Processing**: Direct API integrations (no Tika/Gotenberg dependencies)
- **AI Services**: OpenAI GPT for note generation and exam creation, Google Vision API for OCR
- **Payment**: Stripe integration with webhook automation
- **Storage**: Supabase Storage buckets for user files and generated content
- **Testing**: Vitest with comprehensive test coverage
- **Deployment**: Vercel with optimized build pipeline
- **Internationalization**: English and Spanish (en/es) - fully implemented

## Development Commands

### Essential Commands
```bash
# Start development server
npm run dev

# Build for production (includes environment validation)
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Run tests in CI mode
npm test:run

# Environment validation (run before builds)
npm run validate-env
```

### Testing Commands
```bash
# Run specific test file
npm test -- src/lib/__tests__/file-name.test.ts

# Test API endpoints directly
node scripts/test-api.js health
node scripts/test-api.js generate POST '{"audioFilePath":"test.mp3","lectureTitle":"Test"}'

# Test GitHub OAuth integration
npm run test-github-oauth

# Test UI download functionality end-to-end
npm run test-ui-download
```

### Development Utilities
```bash
# Check server health and service availability
npm run check-server

# Run performance benchmarks
npm run benchmark

# Test various API functionalities
npm run test-api
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

**Required Variables:**
- `PUBLIC_SUPABASE_URL`, `PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` - Supabase configuration
- `OPENAI_KEY` - OpenAI API key (must start with `sk-`)
- `GOOGLE_VISION_API_KEY` - Google Vision API key for OCR functionality
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` - Stripe payment processing
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` - GitHub OAuth (optional)

**Additional Required Variables:**
- `RUNPOD_API_KEY` - RunPod API for Faster Whisper audio transcription

**Optional/Legacy Variables:**
- `TIKA_API_URL` - Apache Tika service endpoint for document text extraction
- `GOTENBERG_API_URL` - Gotenberg service endpoint for PDF generation

## Application Architecture

### Core Processing Pipeline
1. **File Upload** → Supabase Storage (`user-uploads` bucket)
2. **Audio Transcription** → Faster Whisper via RunPod API
3. **Text Extraction** → Google Vision API for images (OCR), Tika for documents
4. **Note Generation** → OpenAI GPT with Cornell Notes formatting
5. **Multi-format Output** → PDF, Markdown, and TXT generation
6. **Storage** → Generated notes stored in `generated-notes` bucket

### Current Active API Endpoints
- `POST /api/generate` - Main note processing endpoint
- `POST /api/process-document` - Document upload and processing
- `GET /api/download/[jobId]` - Download generated notes  
- `GET /api/health` - System health monitoring
- `POST /api/stripe/webhook` - Stripe payment webhook (main handler)
- `GET /api/metrics` - System performance metrics
- `GET /api/notes/search` - Note search functionality
- `POST /api/exam/generate` - Exam generation from notes
- `GET /api/user/tier` - User subscription tier info
- `POST /api/auth/*` - Authentication endpoints
- `GET/POST /api/notes/[jobId]/*` - Note management operations
- `GET/POST /api/folders/*` - Study folder management
- `GET/POST /api/study-nodes/*` - Study organization system

### Current Database Schema (Supabase)
**Core Tables:**
- `profiles` - User accounts with subscription management
- `jobs` - Processing job queue with status tracking  
- `notes` - Generated notes with Cornell format structure
- `usage` - Monthly usage tracking for tier limits
- `subscription_plans` - Available subscription tiers
- `study_nodes` - Hierarchical study organization system
- `note_attachments` - File attachments for notes
- `pomodoro_sessions` - Pomodoro timer tracking
- `exam_attempts` - Exam performance tracking
- `notifications` - User notification system

**Storage Buckets:**
- `user-uploads` - Audio/PDF file uploads
- `generated-notes` - Processed note outputs
- `attachments` - Note attachment files

### Authentication Flow
- Supabase Auth with cookie-based sessions
- GitHub OAuth integration with profile sync
- Server-side session validation in `src/lib/supabase-server.ts`
- Client-side auth state management in `src/stores/auth.ts`

### Current Active Application Structure

**Dashboard Features:**
- **Study Management**: Hierarchical folder/study organization system
- **Note Generation**: Cornell-style notes from audio/PDF with multiple formats
- **Exam System**: AI-generated exams with performance tracking
- **Pomodoro Timer**: Integrated productivity timer with session tracking
- **Search**: Advanced note search with filters and sorting
- **Attachments**: File attachment system for notes
- **Multi-format Output**: PDF, Markdown, and TXT note generation
- **Usage Analytics**: Tier-based limits and usage tracking

### File Structure (Active Components)
```
src/
├── components/
│   ├── dashboard/    # Main React dashboard components
│   │   ├── DashboardOverview.tsx    # Main dashboard page
│   │   ├── StudiesManager.tsx       # Study organization
│   │   ├── ExamCreator.tsx         # Exam generation
│   │   ├── PomodoroTimer.tsx       # Productivity timer
│   │   ├── GlobalSearch.tsx        # Note search
│   │   ├── NoteDetailView.tsx      # Note viewing/editing
│   │   └── [30+ dashboard components]
│   └── ui/           # shadcn/ui component library
├── layouts/
│   ├── ModernDashboardLayout.astro  # Main dashboard layout
│   ├── BaseLayout.astro            # Base page layout
│   └── BlogPostLayout.astro        # Blog layout (unused)
├── lib/              # Core business logic
│   ├── supabase-server.ts          # Server-side DB operations
│   ├── openai-client.ts            # OpenAI GPT integration
│   ├── google-vision-client.ts     # Google Vision OCR client
│   ├── exam-generator.ts           # Exam creation logic
│   ├── file-processing.ts          # File upload/storage
│   └── [20+ utility modules]
├── pages/
│   ├── dashboard/    # Dashboard pages
│   ├── api/         # API endpoints (50+ active endpoints)
│   ├── auth/        # Authentication pages
│   └── blog/        # Blog system (minimal use)
├── stores/          # Nanostores for client state
├── hooks/           # React hooks
└── types/           # TypeScript definitions
```

### Internationalization
- Default locale: English (`en`)
- Supported locales: English, Spanish (`es`)
- Spanish routes: `/es/*` mirror structure
- Language detection and routing in Astro config

## Testing Strategy

### Test Coverage
- Unit tests for all lib modules (`src/lib/__tests__/`)
- Component tests for auth and UI components
- Integration tests for API endpoints
- End-to-end tests for critical workflows
- Performance and benchmark tests

### Key Test Areas
- Authentication flows (email, GitHub OAuth)
- File processing pipeline
- API endpoint validation
- Error handling and recovery
- Cross-browser compatibility
- Spanish localization

## Development Notes

### Error Handling Pattern
All API endpoints use standardized error responses with:
- HTTP status codes
- Error categorization (ErrorCodes enum)
- Detailed error messages and context
- Proper job status updates in database

### Security Considerations
- Input validation and sanitization on all endpoints
- Path traversal protection for file operations
- Authentication required for all protected routes
- Secure file storage with signed URLs
- OAuth integration with validation checks

### Performance Optimizations
- Serverless function timeout configuration (Vercel)
- File processing with streaming where possible
- Efficient database queries with proper indexing
- Caching strategies for generated content
- Comprehensive monitoring and health checks

## External Service Dependencies

### Required Services
- **Supabase**: Database, authentication, file storage, and real-time features
- **OpenAI**: GPT models for note generation and exam creation
- **Google Vision API**: OCR for handwritten text and image processing
- **RunPod**: Faster Whisper API for high-speed audio transcription
- **Stripe**: Payment processing with webhook automation
- **Vercel**: Hosting platform with serverless functions
- **GitHub**: OAuth provider and code repository

### Optional/Legacy Services
- **Apache Tika**: PDF extraction (referenced but implementation unclear)
- **Gotenberg**: PDF generation (referenced but implementation unclear)

### Service Health Monitoring
Use `npm run check-server` to verify all external service connectivity before development or deployment.

## 🧹 RECOMMENDED CLEANUP ACTIONS

### High Priority Cleanup:
1. **Remove Legacy Dashboard**: Delete entire `src/pages/legacy/` directory
2. **Blog System Decision**: Either commit to content strategy or remove `src/pages/blog/`, `src/content/blog*`, RSS feeds
3. **Webhook Cleanup**: Consolidate to single webhook handler, remove `webhook-simple.ts`, `webhook-working.ts`, `trigger-n8n.ts`
4. **Test Files**: Remove development test files like `test-callback.astro`
5. **Public Assets**: Clean up unused images in `public/` (roadmap files, test HTML, sample notes)

### Medium Priority Cleanup:
1. **Unused API Endpoints**: Audit and remove unused API routes
2. **Dead Import References**: Remove unused imports and dependencies
3. **Test Coverage**: Remove tests for removed components
4. **Environment Variables**: Clean up unused environment variable references

### Database Cleanup:
1. **Migration Files**: Consolidate multiple migration files if possible
2. **Unused Tables**: Verify all database tables are actively used
3. **Index Optimization**: Review database indexes for current usage patterns

### Component Cleanup:
1. **Unused UI Components**: Audit shadcn/ui components for actual usage
2. **Legacy Components**: Remove old/unused React components
3. **CSS Cleanup**: Remove unused Tailwind classes and custom CSS

### File Structure Optimization:
```bash
# Recommended deletions:
rm -rf src/pages/legacy/
rm -rf src/pages/blog/ (unless committing to blog strategy)
rm -rf src/content/blog* (unless committing to blog strategy)
rm src/pages/test-callback.astro
rm src/pages/api/webhook-simple.ts
rm src/pages/api/webhook-working.ts  
rm src/pages/api/trigger-n8n.ts
rm public/roadmap-*.png
rm public/og-test.html
rm public/notes-*.md (sample files)
```

## Important Development Guidelines

### Code Patterns & Conventions
- **Error Handling**: Use standardized ErrorCodes enum (src/lib/api-response.ts) for consistent API responses
- **Type Safety**: Leverage TypeScript interfaces defined in src/types/database.ts for Supabase operations
- **Authentication**: Always use requireAuth() from supabase-server.ts for protected endpoints
- **File Operations**: Use file-processing.ts utilities with proper path validation and signed URLs
- **Environment Variables**: Access config through src/lib/config.ts, never directly via process.env

### Key Configuration Files
- **astro.config.mjs**: Vercel adapter, i18n (en/es), markdown plugins, image optimization
- **vitest.config.ts**: Test configuration with jsdom environment and setup files
- **tailwind.config.cjs**: Tailwind configuration with typography plugin
- **vercel.json**: Serverless function timeouts and memory allocation

### Common Debugging Patterns
- Use `npm run check-server` to verify external service connectivity
- Test specific API endpoints with `node scripts/test-api.js [endpoint]`
- For auth issues, check middleware.ts and supabase-server.ts session handling
- Spanish locale testing available via dedicated test scripts in scripts/ directory
- Performance benchmarking available via `npm run benchmark`