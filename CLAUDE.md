# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mindsy is a Next.js 15 application using the App Router architecture, TypeScript, Tailwind CSS 4, and React 19. This is a fresh project created with `create-next-app` using Turbopack for development.

**Backend Services:**
- **Supabase** - Complete backend solution providing:
  - PostgreSQL database
  - File storage
  - Authentication with OAuth support
  - Real-time subscriptions
  - Row Level Security (RLS)

## Development Commands

```bash
# Development server with Turbopack
npm run dev

# Production build with Turbopack  
npm run build

# Start production server
npm start

# Linting
npm run lint
```

## Architecture & Structure

### App Router Structure
- Uses Next.js App Router (not Pages Router)
- Main layout: `app/layout.tsx` - defines root HTML structure with Geist fonts
- Home page: `app/page.tsx` - main landing page component
- Global styles: `app/globals.css` - Tailwind imports with custom CSS variables

### Styling System
- **Tailwind CSS 4** with PostCSS plugin configuration
- CSS custom properties for theming (light/dark mode support)
- Geist Sans and Geist Mono fonts from next/font/google
- CSS variables: `--background`, `--foreground` with dark mode media queries

### TypeScript Configuration  
- Strict mode enabled
- Path aliases: `@/*` maps to root directory
- Next.js plugin integration
- Modern ES2017+ target with bundler module resolution

### Key Technologies
- **Next.js 15** with Turbopack for fast builds
- **React 19** 
- **TypeScript 5**
- **Tailwind CSS 4** with new architecture
- **ESLint** with Next.js and TypeScript extensions
- **Supabase** for backend services (database, auth, storage)

## Development Notes

### File Organization
- All app code in `app/` directory (App Router)
- Static assets in `public/` directory
- TypeScript configuration supports both `.ts` and `.tsx` files

### Styling Patterns
- Uses Tailwind utility classes extensively
- Custom CSS variables for consistent theming
- Dark mode support via `prefers-color-scheme` media queries
- Component-level styling with Tailwind classes

### Build System
- Turbopack enabled for both dev and build commands
- ESLint configuration extends Next.js core web vitals and TypeScript rules
- PostCSS processes Tailwind CSS through `@tailwindcss/postcss` plugin

### Font Loading
- Geist fonts loaded via next/font/google for optimization
- Font variables applied through CSS custom properties
- Antialiasing enabled globally via Tailwind classes

## Migration from Astro

### Migration Status
**Currently migrating from**: Astro/React app in `/cornellsummaryai` folder
**Migration approach**: Simplified 4-page architecture

### ✅ Completed Migration:
- **Authentication System**: Login, signup, OAuth callback, protected routes
- **Landing Page**: Marketing page with auth redirect
- **Dashboard Layout**: DashboardWrapper, MainSidebar, TopBar components
- **All Shadcn/UI Components**: Complete UI component library migrated
- **4 Dashboard Pages**: Dashboard, Lectures, Exams, Pomodoro (placeholder content)
- **Middleware**: Session management and route protection

### Simplified Dashboard Architecture
**4 main pages:**
1. **Dashboard** (`/dashboard`) - Overview with stats
2. **Lectures** (`/dashboard/lectures`) - Combined notes + study organization
3. **Exam Center** (`/dashboard/exams`) - Exam creation and management
4. **Pomodoro** (`/dashboard/pomodoro`) - Full Pomodoro timer page (accessed via widget)

### What to Migrate (Priority Order)
1. **Shadcn/UI components** - All UI components from `/cornellsummaryai/src/components/ui/`
2. **Page-specific components**:
   - Dashboard: `DashboardOverview`
   - Lectures: `StudiesWithLectures`, `StudiesManager`, `NoteDetailView`, `PdfViewer`
   - Exams: `ExamContent`, `ExamDashboard`, `ExamCreator`
   - Pomodoro: `PomodoroTimer` (widget + full page), `PomodoroDashboard`
3. **Supabase integration** - Auth, database client, storage
4. **Essential API logic** - Note generation, file processing, exam system
5. **Type definitions** - Database types, custom interfaces

### What NOT to Migrate
- `/dashboard/studies` page (merged into Lectures)
- `/dashboard/notes` page (merged into Lectures)
- `/dashboard/performance` page (not used)
- `/dashboard/account` page (may simplify later)
- Blog system (barely used)
- Legacy dashboard components
- 100+ test scripts
- Spanish localization (unless needed)

## Supabase Integration

### Authentication Flow
1. **Landing Page** (`/`) - Marketing page, redirects to dashboard if authenticated
2. **Login** (`/auth/login`) - Email/password and GitHub OAuth
3. **OAuth Callback** (`/auth/callback`) - Handles OAuth redirects
4. **Dashboard** (`/dashboard`) - Protected route, requires authentication
5. **Middleware** - Updates session on every request

### Authentication Implementation
- Server-side auth: `lib/supabase/server.ts` (for Server Components)
- Client-side auth: `lib/supabase/client.ts` (for Client Components)
- Middleware: `middleware.ts` + `lib/supabase/middleware.ts`
- Protected routes automatically redirect to login if not authenticated

### Database
- PostgreSQL database with Row Level Security (RLS)
- Type-safe database queries using Supabase client
- Real-time subscriptions for live data updates
- Database migrations managed through Supabase CLI

### Storage
- File uploads and downloads via Supabase Storage
- Bucket-based organization with access policies
- Image optimization and transformation support
- CDN delivery for optimal performance

### Environment Setup
Required environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```