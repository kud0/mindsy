# Social Features Documentation

## Overview

Mindsy has a complete social system that allows students to connect with classmates and share study materials. The system is built on three phases:

- ✅ **Phase 1**: Friends + Real-time Notifications (COMPLETE)
- ✅ **Phase 2A**: Course Discovery + Templates MVP (COMPLETE)
- ✅ **Phase 3**: Content Sharing (COMPLETE)
- ⏭️ **Phase 2B**: Advanced Course Features (PENDING)
- ⏭️ **Phase 4**: Personal Stats & Streaks (PENDING)

---

## Phase 1: Friends + Real-time Notifications

### Database Tables

#### `profiles` (001_create_profiles_table.sql)
```sql
- id (UUID, references auth.users)
- email (TEXT)
- full_name (TEXT)
- avatar_url (TEXT)
- bio (TEXT)
- institution (TEXT)
- Auto-created on user signup via trigger
- Publicly readable (for search/discovery)
```

#### `user_connections` (002_create_user_connections_table.sql)
```sql
- id (UUID)
- user_id (UUID, references auth.users)
- friend_id (UUID, references auth.users)
- status (TEXT: pending, accepted, blocked)
- requested_by (UUID)
- Bidirectional friendship (mutual)
- Auto-normalized order (user_id < friend_id)
- Unique constraint prevents duplicates
```

#### `notifications` (003_create_notifications_table.sql)
```sql
- id (UUID)
- user_id (UUID)
- type (TEXT: friend_request, friend_accepted, share, achievement, system)
- title (TEXT)
- message (TEXT)
- read (BOOLEAN)
- related_id (UUID)
- related_user_id (UUID)
- action_url (TEXT)
- metadata (JSONB)
- Auto-creates notifications via database triggers
```

### API Endpoints

**Friends:**
- `POST /api/friends/request` - Send friend request
- `GET /api/friends` - List friends (accepted, sent, received)
- `POST /api/friends/accept/:id` - Accept request
- `DELETE /api/friends/:id` - Remove friend or reject request
- `GET /api/friends/search?q=query` - Search users by name/email

**Notifications:**
- `GET /api/notifications` - List notifications
- `PATCH /api/notifications/:id` - Mark as read/unread
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/mark-all-read` - Mark all as read

### UI Components

**Location:** `components/social/`, `components/navigation/`

**Key Components:**
- `FriendsTab.tsx` - Friends management (search, requests, list)
- `FriendSearch.tsx` - Search users with connection status
- `FriendCard.tsx` - Friend display with remove button
- `FriendRequestCard.tsx` - Accept/reject friend requests
- `NotificationBell.tsx` - Real-time notification bell with Supabase Realtime
- `SocialWidget.tsx` - Dashboard preview (friend count, requests, notifications)

**Pages:**
- `/dashboard/social` - Social Hub main page with tabs

### Real-time Features

**Supabase Realtime subscriptions:**
```typescript
// Notifications table - instant delivery via WebSocket
supabase.channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, handleNewNotification)
```

**Required Setup:**
- Enable Supabase Realtime for `notifications` table
- Database → Replication → Enable for `notifications`

---

## Phase 3: Content Sharing

### Database Tables

#### `shared_content` (004_create_shared_content_table.sql)
```sql
- id (UUID)
- owner_id (UUID, references auth.users) - Who shared
- recipient_id (UUID, references auth.users) - Who received
- source_job_id (UUID, references jobs) - Original lecture
- copied_job_id (UUID, references jobs) - New copy for recipient
- title (TEXT)
- description (TEXT) - Optional message from sender
- shared_at (TIMESTAMPTZ)
- Unique constraint: (owner_id, recipient_id, source_job_id)
- Prevents duplicate shares
```

### Sharing Model: Copy-Based

**When user shares a lecture:**
1. Entire `jobs` row is cloned for recipient
2. New job has `[Shared]` prefix in title
3. `metadata` field includes `shared_from` and `original_job_id`
4. Recipient gets full ownership of the copy
5. Changes to copy don't affect original

**Benefits:**
- Recipient owns content completely
- Can delete without affecting original
- Can add personal notes independently
- Content persists even if original deleted

### API Endpoints

**Sharing:**
- `POST /api/share` - Share lecture with friends
  ```json
  Body: {
    job_id: string,
    friend_ids: string[],
    message?: string
  }
  ```
- `GET /api/share` - Get all shares (sent & received)
  ```json
  Response: {
    sent: SharedContent[],
    received: SharedContent[]
  }
  ```

**Sharing Logic:**
1. Validates friendships
2. Checks for duplicate shares (re-shares delete old copy first)
3. Clones entire job record (all columns except system fields)
4. Copies JSON storage file: `{source_job_id}.json` → `{copied_job_id}.json`
5. Updates `json_file_path` in copied job to point to new file
6. Creates `shared_content` record
7. Trigger auto-creates notification for recipient

### UI Components

**Location:** `components/share/`

**Key Components:**
- `ShareButton.tsx` - Share icon button (appears in lecture header)
- `ShareModal.tsx` - Modal to select friends & add message
- `SharedTab.tsx` - View sent/received shares in Social Hub

**Integration:**
- Share button added to `StudentDesk.tsx` header
- "Shared" tab in `/dashboard/social`

### Notifications

**When content is shared:**
```
Trigger: notify_content_shared()
→ Creates notification for recipient
→ Type: 'share'
→ Title: 'New Shared Content'
→ Message: '[Name] shared "[Lecture]" with you'
→ Action URL: /dashboard/lectures/[copied_job_id]
```

---

## Dashboard Integration

### Social Widget (Bento Box)

**Location:** `components/widgets/SocialWidget.tsx`

**Displays:**
- Friend count
- Pending friend requests (with red pulse if > 0)
- Unread notifications count
- Recent friends preview (up to 4)

**Position:** Dashboard bento grid (replaced Essay widget)

**Clickable sections:**
- Friends → `/dashboard/social?tab=friends`
- Requests → `/dashboard/social?tab=friends&subtab=requests`
- Notifications → `/dashboard/social?tab=notifications`

---

## Security (Row Level Security)

**All tables have RLS enabled:**

### profiles
- SELECT: Publicly readable (for search)
- UPDATE: Users can update their own profile
- INSERT: Users can insert their own profile

### user_connections
- SELECT: Users can view connections where they're involved
- INSERT: Users can create requests (as requester)
- UPDATE: Users can update their connections
- DELETE: Users can delete their connections

### notifications
- SELECT: Users can view only their notifications
- UPDATE: Users can update only their notifications
- DELETE: Users can delete only their notifications
- INSERT: System can create (for triggers)

### shared_content
- SELECT: Users can view shares they sent or received
- INSERT: Users can create shares (as owner)
- DELETE: Users can delete shares they created

---

## Key Implementation Details

### Friend Request Flow

1. **Send Request:**
   - User A searches for User B
   - Clicks "Add Friend"
   - `POST /api/friends/request` with `friend_id`
   - Creates `user_connections` record (status: pending)
   - Trigger creates notification for User B

2. **Accept Request:**
   - User B receives notification
   - Clicks "Accept" in Requests tab
   - `POST /api/friends/accept/:id`
   - Updates status to "accepted"
   - Trigger creates "accepted" notification for User A

3. **Real-time:**
   - User A's notification bell updates instantly
   - Both users appear in each other's Friends list

### Content Sharing Flow

1. **Share Lecture:**
   - User A opens lecture
   - Clicks share icon (top right)
   - Modal opens with friends list
   - Selects friends + optional message
   - `POST /api/share` clones job for each recipient
   - Storage file copied: `generated-notes/{original}.json` → `generated-notes/{copy}.json`

2. **Receive Share:**
   - User B gets real-time notification
   - Clicks notification → redirects to copied lecture
   - Lecture appears in their dashboard with `[Shared]` prefix
   - Can view in "Shared" tab (Received)

3. **Loading Shared Content:**
   - API endpoints use service role client for storage access
   - Bypasses RLS to download JSON files for shared content
   - Content loads from `json_file_path` field in copied job

4. **Independence:**
   - User B can add personal notes
   - User B can delete their copy
   - User A's original unaffected

---

## Testing Guides

**Full documentation:**
- `docs/phase-1-testing-checklist.md` - Friends & notifications
- `docs/phase-3-testing-guide.md` - Content sharing

**Quick Test:**
1. Create two accounts (Browser A & B)
2. Send friend request (A → B)
3. Accept request (B)
4. Verify real-time notifications work
5. Share lecture (A → B)
6. Verify B receives copy in dashboard

---

## Common Issues & Solutions

### No real-time notifications
**Fix:** Enable Supabase Realtime for `notifications` table

### "User not found" when sending friend request
**Fix:** Run profile backfill:
```sql
INSERT INTO profiles (id, email, full_name, avatar_url)
SELECT id, email, COALESCE(
  raw_user_meta_data->>'full_name',
  raw_user_meta_data->>'name',
  split_part(email, '@', 1)
), raw_user_meta_data->>'avatar_url'
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;
```

### Shared lecture doesn't appear
**Check:**
```sql
-- Verify shared_content record exists
SELECT * FROM shared_content ORDER BY shared_at DESC LIMIT 5;

-- Verify copied job exists
SELECT * FROM jobs WHERE lecture_title LIKE '[Shared]%' ORDER BY created_at DESC LIMIT 5;
```

### "Failed to Load Lecture" when recipient opens shared content
**Problem:** Recipient sees "Failed to Load Lecture" error when opening shared lectures.

**Root Cause:** API endpoints were using regular Supabase client to download JSON files from storage, which is blocked by Row Level Security (RLS) for content copied from another user.

**Solution:** Use service role client to bypass RLS when downloading storage files.

**Fixed Files:**
1. `/app/api/lectures/[jobId]/route.ts` (line 96-99)
2. `/app/api/lectures/[jobId]/structured/route.ts` (line 86-91)

**Code Pattern:**
```typescript
// ❌ WRONG: Uses regular client (blocked by RLS)
const { data: jsonFile } = await supabase.storage
  .from('generated-notes')
  .download(job.json_file_path)

// ✅ CORRECT: Uses service role client (bypasses RLS)
const serviceClient = createServiceRoleClient()
const { data: jsonFile } = await serviceClient.storage
  .from('generated-notes')
  .download(job.json_file_path)
```

**Why This Works:**
- Share API correctly copies JSON file to storage with new job_id
- Copied job has correct `json_file_path` pointing to the new file
- Service role client has admin access to all storage files
- Recipient can now load shared content without permission errors

---

## Phase 2A: Course Discovery + Templates MVP

### Overview
Institution-specific course discovery with community-voted folder templates. Students can join courses, create/vote on folder templates, and discover classmates.

### Database Tables

#### `courses` (005_create_courses_table.sql)
```sql
- id (UUID)
- course_code (TEXT) - e.g., "CS 101", "MATH 201"
- course_name (TEXT) - Optional full name
- institution (TEXT) - e.g., "Stanford University"
- semester (TEXT) - Optional (e.g., "Fall 2024")
- description (TEXT)
- created_by (UUID, references auth.users)
- Unique index: (course_code, institution, COALESCE(semester, ''))
```

#### `course_enrollments` (006_create_course_enrollments_table.sql)
```sql
- id (UUID)
- user_id (UUID, references auth.users)
- course_id (UUID, references courses)
- enrolled_at (TIMESTAMPTZ)
- is_active (BOOLEAN) - For soft delete (unenroll)
- Trigger: notify_course_enrollment() - Notifies classmates when someone joins
```

#### `course_templates` (007_create_course_templates_table.sql)
```sql
- id (UUID)
- course_id (UUID, references courses)
- created_by (UUID, references auth.users)
- template_name (TEXT) - e.g., "Weekly Structure (12 weeks)"
- folder_structure (JSONB) - {folders: [{name: "Week 1"}, ...]}
- description (TEXT)
- vote_count (INTEGER) - Cached count, updated by triggers
- is_recommended (BOOLEAN) - TRUE for highest voted
- Validation: folder_structure must have 'folders' array
```

#### `template_votes` (008_create_template_votes_table.sql)
```sql
- id (UUID)
- template_id (UUID, references course_templates)
- user_id (UUID, references auth.users)
- voted_at (TIMESTAMPTZ)
- Unique constraint: (template_id, user_id)
- Triggers: recalculate_template_votes() - Auto-updates vote counts
```

#### `user_folders` (009_create_user_folders_table.sql)
```sql
- id (UUID)
- user_id (UUID, references auth.users)
- course_id (UUID, references courses) - Optional link
- parent_folder_id (UUID, references user_folders) - For nesting
- folder_name (TEXT)
- folder_order (INTEGER)
- created_from_template_id (UUID) - Tracks origin
```

### API Endpoints

**Courses API** (`/app/api/courses/`)
- `POST /api/courses` - Search existing courses
- `POST /api/courses/create` - Create new course
- `GET /api/courses/:id` - Course details + templates + students
- `POST /api/courses/:id/enroll` - Enroll (with optional template_id)
- `DELETE /api/courses/:id/enroll` - Unenroll (soft delete)
- `GET /api/courses/:id/students` - List classmates (requires enrollment)

**Templates API** (`/app/api/templates/`)
- `POST /api/templates` - Create new template
- `GET /api/templates/:id` - Template details (preview)
- `POST /api/templates/:id/vote` - Toggle vote
- `POST /api/templates/:id/apply` - Create folders from template

### UI Components

**Location:** `components/courses/`, `components/widgets/`

**Key Components:**
- `CourseDiscoveryModal.tsx` - Search/create courses
- `CourseDetailsModal.tsx` - View course, templates, enroll
- `TemplateBuilder.tsx` - Create folder templates (flat list)
- `TemplateCard.tsx` - Display template with voting
- `CoursesWidget.tsx` - Dashboard widget showing enrolled courses

### User Flows

**1. Create First Course:**
1. Click "Join a Course" in CoursesWidget
2. Enter course code (e.g., "CS 101") + institution
3. Search → No results found
4. Click "Create This Course"
5. Auto-enrolled in new course
6. Optionally create first template

**2. Join Existing Course:**
1. Search for course code + institution
2. See existing courses with student count + templates
3. Click course → CourseDetailsModal opens
4. View available templates (sorted by votes)
5. Select template (optional)
6. Click "Join Course" or "Join & Use Template"
7. Folders created automatically if template selected

**3. Create & Vote on Templates:**
1. Open enrolled course details
2. Click "Propose New Template"
3. Add folders in TemplateBuilder
4. Submit template (starts with 0 votes)
5. Other students vote → vote count increases
6. Highest voted template gets ⭐ "Recommended" badge

**4. Discover Classmates:**
1. View course details
2. Switch to "Students" tab (requires enrollment)
3. See all enrolled students
4. View friend status for each student
5. Send friend requests to classmates

### Key Features

**Institution-Specific:**
- CS 101 at Stanford ≠ CS 101 at MIT
- Unique index prevents duplicate courses per institution

**Community Voting:**
- Students vote on best templates
- Highest voted = "Recommended" (⭐ badge)
- Vote counts auto-updated via database triggers

**Template Application:**
- Creates folders automatically from template JSON
- Supports merge mode (add to existing folders)
- Tracks origin (created_from_template_id)

**Classmate Discovery:**
- See all students in same course
- View friendship status
- Enables targeted friend requests

### MVP Limitations

**Simplified for MVP:**
- Templates are flat folder lists (no nesting yet)
- Templates are immutable after creation
- No template versioning
- Manual course entry only (no autocomplete)
- Basic search (no fuzzy matching)

---

## Future Phases (Not Implemented)

### Phase 2B: Advanced Course Features
- Nested folder templates (parent/child relationships)
- Template editing and versioning
- Course autocomplete/suggestions
- Bulk classmate friend requests
- Import courses from syllabus/LMS
- Template analytics (usage stats)
- Course recommendations based on institution

### Phase 4: Personal Stats & Streaks
- `user_stats` table - Daily streaks, study time
- `quiz_attempts` table - Quiz performance history
- Streak tracking (🔥 X days)
- Personal achievements (no leaderboards)
- Study time tracking

---

## Migration Files

**Order:**
1. `001_create_profiles_table.sql`
2. `002_create_user_connections_table.sql`
3. `003_create_notifications_table.sql`
4. `004_create_shared_content_table.sql`

**All are idempotent** - safe to run multiple times

---

## File Locations

```
/migrations/
  001_create_profiles_table.sql
  002_create_user_connections_table.sql
  003_create_notifications_table.sql
  004_create_shared_content_table.sql

/app/api/
  /friends/ - Friend request endpoints
  /notifications/ - Notification endpoints
  /share/ - Content sharing endpoints

/components/
  /social/ - Friends, search, shared content components
  /share/ - Share button & modal
  /navigation/NotificationBell.tsx
  /widgets/SocialWidget.tsx
  /dashboard/DashboardHeader.tsx

/docs/
  phase-1-testing-checklist.md
  phase-3-testing-guide.md
  social-phase-1-implementation.md
```

---

## Important Notes

- **Bidirectional friendships**: Both users must be friends (mutual)
- **Copy-based sharing**: Recipient owns the copy completely
- **Real-time required**: Enable Supabase Realtime for notifications
- **Profile creation**: Auto-created on signup via trigger
- **RLS enabled**: All tables have Row Level Security
- **No leaderboards**: Social features focus on collaboration, not competition

---

**Status:** Phase 1 ✅ | Phase 2A ✅ | Phase 3 ✅ | Phase 2B ⏭️ | Phase 4 ⏭️
