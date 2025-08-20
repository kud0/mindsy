# Migration Checklist: Astro to Next.js

## ⚠️ IMPORTANT: Simplified Architecture
**We're keeping 4 main pages:**
1. **Dashboard** (`/dashboard`) - Overview page
2. **Lectures** (`/dashboard/lectures`) - Combined notes + study organization  
3. **Exam Center** (`/dashboard/exams`) - Exam creation and management
4. **Pomodoro** (`/dashboard/pomodoro`) - Full timer page (accessed via widget expand button)

**NOT migrating:**
- `/dashboard/studies` - Functionality merged into Lectures
- `/dashboard/notes` - Functionality merged into Lectures  
- `/dashboard/performance` - Not used
- `/dashboard/account` - May simplify later

## Phase 1: Foundation ✅
- [x] Initialize Next.js project
- [x] Set up Tailwind CSS 4
- [x] Create components.json for Shadcn/UI
- [x] Install core dependencies (clsx, tailwind-merge, lucide-react)
- [x] Create folder structure (components/ui, lib, hooks, types)
- [x] Copy utils.ts with cn() function
- [x] Create first UI component (Button)

## Phase 2: Core Dependencies 🚧
- [ ] Install Supabase client libraries
  ```bash
  npm install @supabase/supabase-js @supabase/ssr
  ```
- [ ] Copy environment variables from Astro .env
- [ ] Install additional UI dependencies
  ```bash
  npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu
  npm install @radix-ui/react-label @radix-ui/react-tabs
  npm install sonner react-hook-form zod
  ```

## Phase 3: Supabase Setup
- [ ] Copy `/cornellsummaryai/src/lib/supabase-client.ts` → `/lib/supabase/client.ts`
- [ ] Copy `/cornellsummaryai/src/lib/supabase-server.ts` → `/lib/supabase/server.ts`
- [ ] Update imports for Next.js App Router
- [ ] Create middleware for auth protection

## Phase 4: UI Components Migration
### Essential Shadcn/UI Components
- [x] Button
- [ ] Card
- [ ] Dialog
- [ ] Input
- [ ] Label
- [ ] Toast/Toaster
- [ ] Tabs
- [ ] Select
- [ ] Form
- [ ] Dropdown Menu
- [ ] Sheet
- [ ] Badge
- [ ] Alert
- [ ] Progress
- [ ] Skeleton

### Copy Command Helper
```bash
# Quick copy for all UI components (run from project root)
cp cornellsummaryai/src/components/ui/*.tsx components/ui/
# Then update imports from "@/lib/utils" path
```

## Phase 5: Dashboard Components (SIMPLIFIED)
### Priority 1 - Core Layout
- [ ] MainSidebar (UPDATE: Remove Studies Organization menu item)
- [ ] TopBar
- [ ] ModernDashboardLayout (main layout being used)

### Priority 2 - Four Main Pages
#### Dashboard Page
- [ ] DashboardOverview

#### Lectures Page (Combined Notes + Studies)
- [ ] StudiesWithLectures (main component)
- [ ] StudiesManager
- [ ] NoteCard
- [ ] NoteDetailView
- [ ] PdfViewer
- [ ] EnhancedUploadButton

#### Exam Center Page
- [ ] ExamContent (wrapper)
- [ ] ExamDashboard
- [ ] ExamCreator
- [ ] ExamTaker
- [ ] ExamResults

#### Pomodoro Page
- [ ] PomodoroTimer (widget for sidebar + functionality)
- [ ] PomodoroPageWrapper or PomodoroDashboard (full page)
- [ ] useGlobalPomodoro hook

### Priority 3 - Shared Components
- [ ] GlobalSearch
- [ ] TierProgressBar
- [ ] Upload components

## Phase 6: API Routes
### Essential Endpoints
- [ ] `/api/auth/signin` (from `/api/auth/signin.ts`)
- [ ] `/api/auth/signout`
- [ ] `/api/auth/callback`
- [ ] `/api/generate` (main note processing)
- [ ] `/api/notes/[id]` (CRUD operations)
- [ ] `/api/upload` (file upload)
- [ ] `/api/download/[jobId]`

### Stripe Integration
- [ ] `/api/stripe/webhook`
- [ ] `/api/stripe/create-checkout-session`

## Phase 7: Type Definitions
- [ ] Copy `/cornellsummaryai/src/types/database.ts`
- [ ] Create proper TypeScript interfaces for:
  - User profiles
  - Notes
  - Jobs
  - Study nodes
  - Exam system

## Phase 8: Hooks & Utilities
- [ ] Copy custom hooks from `/cornellsummaryai/src/hooks/`
  - useToast
  - useMobile
  - useRealtimeJobs
- [ ] Copy essential utilities from `/cornellsummaryai/src/lib/`
  - file-processing.ts
  - openai-client.ts
  - exam-generator.ts

## Phase 9: Testing & Cleanup
- [ ] Test authentication flow
- [ ] Test note generation
- [ ] Test file upload
- [ ] Remove unused imports
- [ ] Update all import paths
- [ ] Clean up console.logs

## What We're NOT Migrating ❌
- Blog system (`/blog`, `/es/blog`)
- Legacy components (`/legacy`)
- 100+ test scripts in `/scripts`
- Multiple webhook variants
- Spanish localization (unless needed)
- Unused public assets (roadmap images)
- Content collections
- RSS/Sitemap generation

## Helpful Commands

### Find all imports to update
```bash
# Find all @/ imports that need updating
grep -r "@/components" cornellsummaryai/src/
grep -r "@/lib" cornellsummaryai/src/
```

### Quick component copy
```bash
# Copy specific component with dependencies
cp cornellsummaryai/src/components/dashboard/DashboardOverview.tsx components/dashboard/
```

### Environment setup
```bash
# Copy env file
cp cornellsummaryai/.env .env.local
```

## Notes
- Astro uses `.astro` files - these need complete rewrite as Next.js pages/components
- API endpoints change from `.ts` files to `/route.ts` in App Router
- Watch for Astro-specific imports (`astro:content`, etc.)
- Update all relative imports to use Next.js conventions