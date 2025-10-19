# Social Features - Phase 1 Implementation

## Overview

Phase 1 implements the **Friends system** with **real-time notifications** for Mindsy. This allows students to connect with each other, send friend requests, and receive instant notifications.

## What's Implemented ✅

### 1. Database Schema

Created 3 new tables with full Row Level Security (RLS):

#### **profiles** (`001_create_profiles_table.sql`)
- Stores user profile information (publicly readable)
- Auto-created on user signup via trigger
- Fields: `id`, `email`, `full_name`, `avatar_url`, `bio`, `institution`
- **RLS**: Publicly readable, users can update their own profile

#### **user_connections** (`002_create_user_connections_table.sql`)
- Manages friend relationships (bidirectional)
- Status: `pending`, `accepted`, `blocked`
- Auto-normalizes connection order (user_id < friend_id) to prevent duplicates
- Fields: `user_id`, `friend_id`, `status`, `requested_by`
- **RLS**: Users can view/manage their own connections

#### **notifications** (`003_create_notifications_table.sql`)
- Stores user notifications with real-time support
- Types: `friend_request`, `friend_accepted`, `share`, `achievement`, `system`
- Auto-creates notifications via database triggers
- Fields: `user_id`, `type`, `title`, `message`, `read`, `action_url`
- **RLS**: Users can only view/update their own notifications

### 2. API Endpoints

All endpoints include authentication checks and proper error handling:

#### **Friends Endpoints**
- `POST /api/friends/request` - Send friend request
  ```json
  Body: { "friend_id": "uuid" }
  Response: { "success": true, "connection": {...} }
  ```

- `GET /api/friends` - List friends and requests
  ```json
  Response: {
    "friends": [...],
    "sent_requests": [...],
    "received_requests": [...]
  }
  ```

- `POST /api/friends/accept/:id` - Accept friend request
  ```json
  Response: { "success": true, "connection": {...} }
  ```

- `DELETE /api/friends/:id` - Remove friend or reject request
  ```json
  Response: { "success": true, "message": "..." }
  ```

- `GET /api/friends/search?q=query` - Search users
  ```json
  Response: {
    "users": [{
      "id": "uuid",
      "full_name": "...",
      "email": "...",
      "connection_status": "none|friends|request_sent|..."
    }]
  }
  ```

#### **Notifications Endpoints**
- `GET /api/notifications` - Fetch notifications
  ```
  Query params: ?unread_only=true&limit=50
  Response: { "notifications": [...], "unread_count": 5 }
  ```

- `PATCH /api/notifications/:id` - Mark as read/unread
  ```json
  Body: { "read": true }
  ```

- `DELETE /api/notifications/:id` - Delete notification

- `POST /api/notifications/mark-all-read` - Mark all as read

### 3. UI Components

#### **Social Hub Page** (`/dashboard/social`)
Main social features page with tabs:
- **Friends Tab**: View friends list
- **Notifications Tab**: View notifications (placeholder)

#### **FriendsTab Component**
Three sub-tabs:
- **Friends**: List of accepted friends
- **Find Friends**: Search and send friend requests
- **Requests**: View pending requests (sent & received)

Features:
- Search users by name/email
- Send friend requests
- Accept/reject incoming requests
- Cancel sent requests
- Remove friends

#### **FriendSearch Component**
- Real-time search with debouncing
- Shows connection status for each user:
  - "Add Friend" button for new users
  - "Friends" badge for existing friends
  - "Pending" badge for sent requests
  - "Respond in Requests" for received requests

#### **FriendCard Component**
Displays friend info with "Remove" button

#### **FriendRequestCard Component**
Shows friend requests with:
- **Received**: "Accept" and "Reject" buttons
- **Sent**: "Pending" badge and "Cancel" button

#### **NotificationBell Component** (with Supabase Realtime)
Real-time notification system:
- Bell icon with unread count badge
- Dropdown showing recent notifications
- Click notification to navigate to action URL
- Mark as read/delete notifications
- Auto-updates via Supabase Realtime subscriptions

**Realtime Features:**
- Instant notification delivery (no refresh needed)
- Toast notifications for new items
- Live unread count updates

## How to Use

### 1. Run Database Migrations

Run migrations in order:
```bash
# 1. Profiles table
psql <your-db-url> < migrations/001_create_profiles_table.sql

# 2. User connections table
psql <your-db-url> < migrations/002_create_user_connections_table.sql

# 3. Notifications table
psql <your-db-url> < migrations/003_create_notifications_table.sql
```

Or use Supabase Dashboard → SQL Editor and run each migration file.

### 2. Add NotificationBell to Layout

Add the notification bell to your dashboard layout:

```tsx
// app/dashboard/layout.tsx or components/dashboard/DashboardWrapper.tsx
import { NotificationBell } from '@/components/navigation/NotificationBell';

// In your header/navbar:
<div className="flex items-center gap-4">
  <NotificationBell />
  {/* Other header items */}
</div>
```

### 3. Access Social Hub

Navigate to `/dashboard/social` or add a link in your navigation:

```tsx
<Link href="/dashboard/social">
  <Users className="w-5 h-5" />
  Social
</Link>
```

### 4. Enable Supabase Realtime

Ensure Realtime is enabled for the `notifications` table in Supabase:

1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for `notifications` table

## Architecture Decisions

### Friend System: Bidirectional
- Mutual friendship required (both users must be friends)
- Single connection record per pair (normalized ordering)
- Status field tracks request state

### Sharing Model: Copy-based (Phase 3)
- When sharing content, a full copy is created
- Recipient owns the copy independently
- Original changes don't propagate

### Real-time: Supabase Realtime
- Postgres changes streamed via WebSocket
- Instant notification delivery
- No polling required

### Gamification: Soft (Phase 4+)
- Personal stats only (no leaderboards)
- Streaks and quiz challenges
- Focus on learning, not competition

## Testing the Feature

### Manual Testing Steps

1. **Create two test accounts** (A and B)

2. **Send Friend Request** (Account A):
   - Navigate to `/dashboard/social`
   - Click "Find Friends"
   - Search for Account B
   - Click "Add Friend"
   - ✅ Should show "Pending" status

3. **Receive Notification** (Account B):
   - Notification bell should show badge
   - Click bell → see "New Friend Request"
   - ✅ Toast notification should appear instantly

4. **Accept Request** (Account B):
   - Navigate to `/dashboard/social`
   - Click "Requests" tab
   - See Account A's request
   - Click "Accept"
   - ✅ Should move to Friends list

5. **Verify Friendship** (Account A):
   - Notification bell shows "Friend Request Accepted"
   - Navigate to `/dashboard/social`
   - See Account B in Friends list
   - ✅ Both accounts are now friends

6. **Remove Friend** (Account A):
   - Click "Remove" on Account B
   - Confirm dialog
   - ✅ Account B disappears from list

## Troubleshooting

### "User not found" when sending friend request
- **Cause**: Profiles table not populated
- **Fix**: Ensure profiles trigger is working. Manually insert profile:
  ```sql
  INSERT INTO profiles (id, email, full_name)
  SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', email)
  FROM auth.users
  WHERE id NOT IN (SELECT id FROM profiles);
  ```

### Notifications not appearing in real-time
- **Cause**: Realtime not enabled or subscription failed
- **Fix**:
  1. Check Supabase Replication settings
  2. Check browser console for WebSocket errors
  3. Verify user is authenticated

### Friend request button not working
- **Cause**: RLS policies preventing access
- **Fix**: Verify RLS policies are created:
  ```sql
  SELECT * FROM pg_policies WHERE tablename = 'user_connections';
  ```

### Search returns no results
- **Cause**: Profiles table empty or query too short
- **Fix**: Ensure profiles exist and search query is at least 2 characters

## Performance Considerations

- **Search**: Indexed on `email` and `full_name` columns
- **Notifications**: Indexed on `user_id`, `read`, and `created_at`
- **Connections**: Indexed on `user_id`, `friend_id`, and `status`
- **Real-time**: Single WebSocket connection per client

## Security Features

- **Row Level Security (RLS)** enabled on all tables
- Users can only access their own data
- Profiles are publicly readable (for search)
- Authentication required for all API endpoints
- SQL injection protection via parameterized queries

## Next Steps (Phase 2+)

Phase 1 is complete! Next phases:
- **Phase 2**: Course discovery (find classmates by course)
- **Phase 3**: Copy-based content sharing
- **Phase 4**: Personal stats & streaks
- **Phase 5**: Quiz tracking

## File Structure

```
/app/api/
  /friends/
    route.ts                    # GET (list friends)
    /request/route.ts           # POST (send request)
    /accept/[id]/route.ts       # POST (accept request)
    /[id]/route.ts              # DELETE (remove friend)
    /search/route.ts            # GET (search users)
  /notifications/
    route.ts                    # GET/DELETE
    /[id]/route.ts              # PATCH/DELETE
    /mark-all-read/route.ts     # POST

/app/dashboard/social/
  page.tsx                      # Social Hub page

/components/social/
  FriendsTab.tsx               # Friends management
  FriendSearch.tsx             # User search
  FriendCard.tsx               # Friend display
  FriendRequestCard.tsx        # Request display

/components/navigation/
  NotificationBell.tsx         # Real-time notifications

/migrations/
  001_create_profiles_table.sql
  002_create_user_connections_table.sql
  003_create_notifications_table.sql
```

## Database Schema Diagram

```
┌──────────────┐
│ auth.users   │
└──────────────┘
       │
       │ 1:1 (auto-created on signup)
       ▼
┌──────────────┐
│  profiles    │─────────┐
│              │         │
│ • id         │         │ (publicly readable)
│ • email      │         │
│ • full_name  │         │
│ • avatar_url │         │
└──────────────┘         │
       │                 │
       │                 │
       ▼                 ▼
┌─────────────────────────────┐
│   user_connections          │
│                             │
│ • user_id (FK profiles)     │
│ • friend_id (FK profiles)   │
│ • status (pending/accepted) │
│ • requested_by              │
└─────────────────────────────┘
       │
       │ (triggers create notifications)
       ▼
┌─────────────────────────────┐
│     notifications           │
│                             │
│ • user_id (FK auth.users)   │
│ • type (friend_request...)  │
│ • title                     │
│ • message                   │
│ • read                      │
│ • action_url                │
└─────────────────────────────┘
```

## Support

If you encounter issues:
1. Check browser console for errors
2. Verify database migrations ran successfully
3. Check RLS policies are enabled
4. Ensure Supabase Realtime is enabled

---

**Phase 1 Status**: ✅ Complete
**Next Phase**: Course Discovery (Phase 2)
