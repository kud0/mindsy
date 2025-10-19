# Social Features - Master Plan

## Vision

**Goal**: Enable students to connect with classmates and share study materials for missed classes or collaborative learning.

**Philosophy**:
- Primarily for **missed class recovery** (not a social media platform)
- **Hybrid connection model**: Find friends via courses OR direct friend requests
- **Copy-based sharing**: Recipients own their copies completely
- **Soft gamification**: Personal stats and streaks, NO leaderboards

---

## Architecture Decisions

### 1. Friend System: Bidirectional ✅
**Decision**: Mutual friendship required (both users must accept)
- Simpler mental model
- More privacy-focused
- Aligns with "classmates helping classmates"

### 2. Course Discovery: Public ✅
**Decision**: Courses are public directories for finding people
- Search by course code/name
- See who's enrolled
- Send friend requests to classmates
- Courses don't control sharing (friends do)

### 3. Sharing Model: Copy-Based ✅
**Decision**: When sharing, create full duplicate for recipient
- **Pros**: Content persists, recipient has ownership, no dependencies
- **Cons**: Takes storage, updates don't propagate
- **Why**: Students need independent copies they can annotate

### 4. Real-time Updates: Always ✅
**Decision**: Supabase Realtime from day 1
- Friend requests appear instantly
- Notifications in real-time
- No polling needed

### 5. Gamification: Soft ✅
**Decision**: Personal growth only, no competition
- ✅ Daily streaks (consistency)
- ✅ Quiz challenges (self-test)
- ✅ Personal stats (private)
- ❌ NO leaderboards
- ❌ NO public rankings

---

## Complete Implementation Plan

## Phase 1: Friends + Real-time Notifications ✅ COMPLETE

### Goal
Basic friend system with instant notifications

### Database Schema

**profiles:**
```sql
- id (UUID, PK, references auth.users)
- email (TEXT, NOT NULL)
- full_name (TEXT)
- avatar_url (TEXT)
- bio (TEXT)
- institution (TEXT)
- created_at, updated_at
- Auto-created on signup via trigger
- RLS: Publicly readable, users update their own
```

**user_connections:**
```sql
- id (UUID, PK)
- user_id (UUID, NOT NULL, references auth.users)
- friend_id (UUID, NOT NULL, references auth.users)
- status (TEXT: pending, accepted, blocked)
- requested_by (UUID, NOT NULL)
- created_at, updated_at
- UNIQUE (user_id, friend_id)
- CHECK (user_id < friend_id) -- normalized order
- RLS: Users view/manage their connections
```

**notifications:**
```sql
- id (UUID, PK)
- user_id (UUID, NOT NULL, references auth.users)
- type (TEXT: friend_request, friend_accepted, share, achievement, system)
- title (TEXT, NOT NULL)
- message (TEXT, NOT NULL)
- related_id (UUID)
- related_user_id (UUID, references auth.users)
- action_url (TEXT)
- read (BOOLEAN, default false)
- read_at (TIMESTAMPTZ)
- metadata (JSONB)
- created_at
- RLS: Users view/update their own
```

### API Endpoints

- `POST /api/friends/request` - Send friend request
- `GET /api/friends` - List friends (accepted, sent requests, received requests)
- `POST /api/friends/accept/:id` - Accept friend request
- `DELETE /api/friends/:id` - Remove friend or reject request
- `GET /api/friends/search?q=query` - Search users by name/email
- `GET /api/notifications` - List notifications (with filters)
- `PATCH /api/notifications/:id` - Mark as read/unread
- `DELETE /api/notifications/:id` - Delete notification
- `POST /api/notifications/mark-all-read` - Mark all as read

### UI Components

**Pages:**
- `/dashboard/social` - Social Hub (tabs: Friends, Shared, Notifications)

**Components:**
- `FriendsTab.tsx` - Friends management (sub-tabs: Friends, Find Friends, Requests)
- `FriendSearch.tsx` - Search users with debouncing, show connection status
- `FriendCard.tsx` - Display friend with remove button
- `FriendRequestCard.tsx` - Accept/reject requests with user info
- `NotificationBell.tsx` - Real-time bell with Supabase Realtime subscription
- `SocialWidget.tsx` - Dashboard bento box preview

### Real-time Setup

**Required:**
- Enable Supabase Realtime for `notifications` table
- Supabase Dashboard → Database → Replication → Enable

**Implementation:**
```typescript
supabase.channel('notifications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'notifications',
    filter: `user_id=eq.${userId}`
  }, handleNewNotification)
  .subscribe()
```

### User Flow

1. User A searches "john@example.com"
2. Clicks "Add Friend"
3. `user_connections` created (status: pending)
4. Trigger → Notification for User B (real-time)
5. User B clicks Accept
6. Status → accepted
7. Trigger → Notification for User A (real-time)
8. Both see each other in Friends list

---

## Phase 2: Course Discovery ⏭️ PENDING

### Goal
Find classmates by joining courses, then send friend requests

### Database Schema

**courses:**
```sql
- id (UUID, PK)
- code (TEXT, NOT NULL) -- e.g., "CS101", "BIOL201"
- name (TEXT, NOT NULL) -- e.g., "Intro to Computer Science"
- institution (TEXT) -- e.g., "MIT", "Harvard"
- semester (TEXT) -- e.g., "Fall 2025"
- created_by (UUID, references auth.users)
- is_public (BOOLEAN, default true)
- created_at
- UNIQUE (code, institution, semester)
- RLS: Publicly readable
```

**course_enrollments:**
```sql
- id (UUID, PK)
- user_id (UUID, NOT NULL, references auth.users)
- course_id (UUID, NOT NULL, references courses)
- enrolled_at (TIMESTAMPTZ)
- UNIQUE (user_id, course_id)
- RLS: Publicly readable, users manage their enrollments
```

### API Endpoints

- `POST /api/courses` - Create or join course
- `GET /api/courses/search?q=query` - Search public courses
- `GET /api/courses/:id/classmates` - List enrolled students
- `DELETE /api/courses/:id/leave` - Leave course

### UI Components

**New Tab in Social Hub:**
- `CoursesTab.tsx` - Course management
  - Search courses
  - My courses list
  - Classmates directory

### User Flow

1. User searches "BIOL 101 - Fall 2025"
2. Finds course → Clicks "Join"
3. Added to `course_enrollments`
4. Clicks "Classmates" → Sees list
5. Finds "Sarah Chen" → Clicks "Add Friend"
6. Friend request sent (Phase 1 flow)

---

## Phase 3: Content Sharing ✅ COMPLETE

### Goal
Share lectures with friends (full copy model)

### Database Schema

**shared_content:**
```sql
- id (UUID, PK)
- owner_id (UUID, NOT NULL, references auth.users) -- Who shared
- recipient_id (UUID, NOT NULL, references auth.users) -- Who received
- source_job_id (UUID, NOT NULL, references jobs) -- Original lecture
- copied_job_id (UUID, NOT NULL, references jobs) -- New copy
- title (TEXT, NOT NULL)
- description (TEXT) -- Optional message from sender
- shared_at (TIMESTAMPTZ, NOT NULL)
- UNIQUE (owner_id, recipient_id, source_job_id)
- RLS: Users view shares they sent or received
```

### Sharing Logic (Copy-Based)

**When sharing:**
```typescript
1. Fetch original job from jobs table
2. Clone entire job row for recipient:
   - user_id → recipient_id
   - lecture_title → "[Shared] " + original_title
   - Copy: transcript, study_content, audio_file_url, etc.
   - metadata → Add: shared_from, original_job_id
3. Create shared_content record
4. Trigger → Notification for recipient
```

**Result:**
- Recipient owns copy completely
- Can add personal notes
- Can delete without affecting original
- Changes to copy don't affect original

### API Endpoints

- `POST /api/share` - Share lecture with friends
  ```json
  Body: {
    job_id: string,
    friend_ids: string[],
    message?: string
  }
  ```
- `GET /api/share` - Get sent & received shares

### UI Components

**Components:**
- `ShareButton.tsx` - Icon button in lecture header
- `ShareModal.tsx` - Select friends & add message
- `SharedTab.tsx` - View sent/received shares in Social Hub

**Integration:**
- Share button in `StudentDesk.tsx` header (top right)
- "Shared" tab in `/dashboard/social`

### User Flow

1. User A opens lecture
2. Clicks share icon
3. Modal opens → Selects User B + adds message "Missed class notes"
4. Clicks "Share with 1"
5. Backend clones entire job for User B
6. User B gets notification (real-time)
7. Clicks notification → Opens copied lecture
8. Lecture in User B's dashboard: "[Shared] Biology 101"
9. User B can add notes, delete, etc. (full ownership)

---

## Phase 4: Personal Stats & Streaks ⏭️ PENDING

### Goal
Gamification for motivation (personal only, no competition)

### Database Schema

**user_stats:**
```sql
- user_id (UUID, PK, references auth.users)
- current_streak_days (INTEGER, default 0)
- longest_streak_days (INTEGER, default 0)
- last_activity_date (DATE)
- total_study_minutes (INTEGER, default 0)
- quizzes_completed (INTEGER, default 0)
- perfect_quizzes (INTEGER, default 0)
- updated_at (TIMESTAMPTZ)
- RLS: Users view/update their own stats
```

**quiz_attempts:**
```sql
- id (UUID, PK)
- user_id (UUID, NOT NULL, references auth.users)
- job_id (UUID, NOT NULL, references jobs)
- score (INTEGER, NOT NULL)
- total_questions (INTEGER, NOT NULL)
- time_taken_seconds (INTEGER)
- completed_at (TIMESTAMPTZ)
- RLS: Users view their own attempts
```

### API Endpoints

- `GET /api/stats/me` - My personal stats
- `POST /api/stats/activity` - Log activity (update streak)
- `GET /api/quizzes/:jobId/history` - My quiz attempts
- `POST /api/quizzes/:jobId/attempt` - Record quiz result

### UI Components

**Stats Widget (Dashboard):**
- 🔥 Current streak: X days
- ⏱️ Study time this week: X hours
- ✅ Quizzes completed: X
- 🎯 Perfect scores: X

**Stats Page:**
- Calendar heatmap (activity)
- Streak history
- Quiz performance over time
- Study time trends

### Streak Logic

```typescript
async function logActivity(userId: string) {
  const stats = await getUserStats(userId);
  const today = new Date().toISOString().split('T')[0];

  if (stats.last_activity_date === today) {
    return; // Already logged today
  }

  const yesterday = getYesterdayDate();

  if (stats.last_activity_date === yesterday) {
    // Streak continues
    stats.current_streak_days += 1;
    stats.longest_streak_days = Math.max(
      stats.longest_streak_days,
      stats.current_streak_days
    );
  } else {
    // Streak broken
    stats.current_streak_days = 1;
  }

  stats.last_activity_date = today;
  await updateUserStats(stats);
}
```

### User Flow

1. User studies for 30 minutes
2. App calls `POST /api/stats/activity`
3. Streak increments (day 5 → day 6)
4. Dashboard shows 🔥 6-day streak
5. User completes quiz
6. Calls `POST /api/quizzes/:jobId/attempt`
7. Stats update: quizzes_completed++
8. User can view personal progress (private)

**No leaderboards, no public rankings, just personal growth!**

---

## Implementation Order (Timeline)

### ✅ Phase 1 - Friends + Notifications (COMPLETE)
**Time**: 2 weeks
- Week 1: Database, API, RLS
- Week 2: UI components, real-time setup

### ⏭️ Phase 2 - Course Discovery (PENDING)
**Time**: 1 week
- Day 1-2: Database schema
- Day 3-4: API endpoints
- Day 5-7: UI + testing

### ✅ Phase 3 - Content Sharing (COMPLETE)
**Time**: 1.5 weeks
- Week 1: Sharing logic, API
- Week 2: UI components, testing

### ⏭️ Phase 4 - Personal Stats (PENDING)
**Time**: 1 week
- Day 1-2: Database + streak logic
- Day 3-4: API endpoints
- Day 5-7: UI + testing

**Total estimated time**: 5-6 weeks

---

## Migration Files (Execution Order)

1. `001_create_profiles_table.sql` ✅
2. `002_create_user_connections_table.sql` ✅
3. `003_create_notifications_table.sql` ✅
4. `004_create_shared_content_table.sql` ✅
5. `005_create_courses_table.sql` ⏭️
6. `006_create_user_stats_table.sql` ⏭️

All migrations are **idempotent** (safe to run multiple times)

---

## Security Considerations

### Row Level Security (RLS)

**All tables have RLS enabled with strict policies:**

1. **profiles** - Public read, users update own
2. **user_connections** - Users view/manage their connections
3. **notifications** - Users view/update own
4. **shared_content** - Users view shares they're involved in
5. **courses** - Public read (discovery)
6. **course_enrollments** - Public read, users manage own
7. **user_stats** - Users view/update own only
8. **quiz_attempts** - Users view own only

### Privacy Controls

- Users control who they're friends with
- Can block users
- Can unfriend at any time
- Sharing requires mutual friendship
- No forced social features
- Stats are private by default

---

## Performance Optimizations

### Indexes

**user_connections:**
- `idx_user_connections_user_status` - (user_id, status)
- `idx_user_connections_friend_status` - (friend_id, status)

**notifications:**
- `idx_notifications_user_read` - (user_id, read, created_at DESC)

**shared_content:**
- `idx_shared_content_owner` - (owner_id, shared_at DESC)
- `idx_shared_content_recipient` - (recipient_id, shared_at DESC)

**courses:**
- `idx_courses_code` - (code, institution, semester)

**course_enrollments:**
- `idx_enrollments_user` - (user_id)
- `idx_enrollments_course` - (course_id)

### Caching Strategy

- User profiles: Cache in memory (rarely change)
- Friends list: Cache with 5-minute TTL
- Notifications: Real-time (no cache needed)
- Shared content: Cache on client side

---

## Testing Strategy

### Unit Tests

- API endpoints (request/response)
- RLS policies (access control)
- Database triggers (notifications)

### Integration Tests

- Friend request flow end-to-end
- Content sharing flow end-to-end
- Real-time notification delivery

### Manual Testing Checklist

**Phase 1:**
- [ ] Send friend request
- [ ] Accept friend request
- [ ] Real-time notification received
- [ ] Search users
- [ ] Remove friend
- [ ] Reject friend request

**Phase 3:**
- [ ] Share lecture with friend
- [ ] Recipient receives notification
- [ ] Recipient sees copied lecture
- [ ] Both copies are independent
- [ ] Prevent duplicate shares

---

## Future Enhancements (Post-Phase 4)

### Nice-to-Have Features

1. **Group Sharing**
   - Share with multiple friends at once (already done)
   - Share with entire course ✨

2. **Activity Feed**
   - See what friends are studying
   - Recent shares

3. **Study Together**
   - Shared Pomodoro sessions
   - Group study rooms

4. **Achievements**
   - Unlock badges for milestones
   - 7-day streak, 30-day streak, etc.

5. **Profile Enhancements**
   - Custom avatars
   - Bio/about section
   - Major/year

---

## Success Metrics

### Phase 1
- ✅ Users can find and add friends
- ✅ Notifications delivered in < 2 seconds
- ✅ 100% of friend requests work

### Phase 2
- ⏭️ Users can find courses by code
- ⏭️ > 50% of friend requests come from course discovery

### Phase 3
- ✅ Users can share lectures
- ✅ 100% of shares create valid copies
- ✅ No data loss during cloning

### Phase 4
- ⏭️ Users maintain streaks
- ⏭️ > 30% engagement with stats

---

## Known Limitations

1. **Copy-based sharing uses more storage**
   - Tradeoff for independence and ownership
   - Consider cleanup of old shared content

2. **No real-time course updates**
   - Course enrollment is not real-time (acceptable)

3. **No group study features**
   - Focused on 1-on-1 sharing for MVP

4. **No content versioning**
   - Once shared, changes don't sync
   - By design (recipient owns copy)

---

## Documentation Files

### User-Facing
- None yet (will create user guide later)

### Developer-Facing
- `docs/social-phase-1-implementation.md` - Phase 1 details
- `docs/phase-1-testing-checklist.md` - Testing guide
- `docs/phase-3-testing-guide.md` - Phase 3 testing
- `docs/social-features-master-plan.md` - This document
- `.claude/social-features-overview.md` - Context for Claude

---

## Questions & Answers

**Q: Why bidirectional friendships?**
A: Simpler model, more privacy-focused, aligns with classroom collaboration

**Q: Why copy-based sharing instead of references?**
A: Students need independent copies they can annotate without affecting originals

**Q: Why no leaderboards?**
A: Focus on learning and collaboration, not competition

**Q: Can users share with non-friends?**
A: No, must be friends first (prevents spam)

**Q: What happens if original lecture is deleted after sharing?**
A: Recipient's copy persists (full ownership)

**Q: Can recipients re-share?**
A: Yes, they own the copy and can share it

---

**Status**: Phase 1 ✅ | Phase 2 ⏭️ | Phase 3 ✅ | Phase 4 ⏭️

**Last Updated**: 2025-01-18
