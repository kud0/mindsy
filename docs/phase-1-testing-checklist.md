# Phase 1 Testing Checklist

Complete this checklist to verify the Friends + Real-time Notifications system is working correctly.

## ✅ Pre-Testing Setup

### 1. Verify Database Tables

Run in Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'user_connections', 'notifications')
ORDER BY table_name;
```

**Expected result**: All 3 tables should appear.

---

### 2. Backfill Profiles for Existing Users

```sql
-- Backfill profiles
INSERT INTO profiles (id, email, full_name, avatar_url)
SELECT
  id,
  email,
  COALESCE(
    raw_user_meta_data->>'full_name',
    raw_user_meta_data->>'name',
    split_part(email, '@', 1)
  ) as full_name,
  raw_user_meta_data->>'avatar_url' as avatar_url
FROM auth.users
WHERE id NOT IN (SELECT id FROM profiles)
ON CONFLICT (id) DO NOTHING;

-- Verify profiles created
SELECT email, full_name FROM profiles;
```

**Expected result**: One profile per user.

---

### 3. Enable Supabase Realtime

1. Go to **Supabase Dashboard** → **Database** → **Replication**
2. Find the `notifications` table
3. Toggle **Enable Replication** to ON
4. Wait for confirmation

**Expected result**: Replication enabled for notifications table.

---

### 4. Start Development Server

```bash
npm run dev
```

Navigate to: `http://localhost:3001`

---

## 🧪 Testing Phase 1 Features

### Test 1: Social Hub Access ✓

1. **Login** to your Mindsy account
2. Navigate to `/dashboard/social`

**✅ Success criteria:**
- Page loads without errors
- Header shows "Social Hub"
- Notification bell appears in top-right
- Three sub-tabs visible: "Friends", "Find Friends", "Requests"

---

### Test 2: User Search ✓

1. Click **"Find Friends"** tab
2. Type a search query (at least 2 characters)
   - Try searching by name
   - Try searching by email

**✅ Success criteria:**
- Search results appear after typing
- Each result shows:
  - User avatar (colored circle with initial)
  - Full name
  - Email address
  - "Add Friend" button
- Results update as you type (debounced)

---

### Test 3: Send Friend Request ✓

**Preparation**: Open Mindsy in two browsers:
- **Browser A**: Your main account
- **Browser B**: A different test account (create if needed)

**Steps (Browser A):**
1. Go to `/dashboard/social` → "Find Friends"
2. Search for Browser B's user (by name or email)
3. Click **"Add Friend"** button
4. Look for toast notification: "Friend request sent!"
5. Button should change to "Pending"

**✅ Success criteria:**
- Friend request sent successfully
- Toast notification appears
- Button updates to "Pending" status
- No console errors

---

### Test 4: Real-time Notification (Browser B) ✓

**⚡ This tests real-time WebSocket delivery!**

**Steps (Browser B - BEFORE accepting request):**
1. Watch the **notification bell** in top-right
2. Wait 1-3 seconds after Browser A sends request

**✅ Success criteria:**
- 🔴 **Red badge appears on bell** (showing "1")
- 🔔 **Toast notification pops up**: "New Friend Request"
- Click bell → dropdown shows notification
- Notification says: "[Name] sent you a friend request"
- Notification is **unread** (blue background)

**❌ If notifications don't appear:**
- Check browser console for errors
- Verify Supabase Realtime is enabled
- Check Network tab for WebSocket connection
- Refresh the page and try again

---

### Test 5: View & Accept Friend Request ✓

**Steps (Browser B):**
1. Click **notification bell** → see request
2. Click notification → redirects to `/dashboard/social?tab=friends`
3. Click **"Requests"** tab
4. See pending request under "Received Requests"
5. Click **"Accept"** button

**✅ Success criteria:**
- Request appears in "Received Requests"
- Shows sender's name, email, and date
- "Accept" and "Reject" buttons visible
- After clicking Accept:
  - Request disappears from "Received Requests"
  - User appears in "Friends" list
  - Toast: "Friend request accepted" (or similar)

---

### Test 6: Real-time Acceptance Notification (Browser A) ✓

**⚡ Test real-time again!**

**Steps (Browser A - AFTER Browser B accepts):**
1. Watch notification bell
2. Should see badge update immediately

**✅ Success criteria:**
- New notification appears instantly
- Says: "[Name] accepted your friend request"
- Friend now appears in "Friends" list (tab)
- No page refresh needed!

---

### Test 7: Friends List ✓

**Steps (Both browsers):**
1. Click **"Friends"** tab in Social Hub
2. View friends list

**✅ Success criteria:**
- Both users see each other in Friends list
- Shows:
  - Avatar
  - Full name
  - Email
  - "Remove" button

---

### Test 8: Mark Notification as Read ✓

**Steps (Browser B):**
1. Click notification bell
2. Click the **checkmark (✓)** on a notification

**✅ Success criteria:**
- Notification background changes (no longer blue)
- Unread count badge decreases
- Notification moves to bottom

---

### Test 9: Delete Notification ✓

**Steps:**
1. Click bell → open dropdown
2. Click **X button** on a notification

**✅ Success criteria:**
- Notification disappears from list
- Unread count updates (if it was unread)

---

### Test 10: Remove Friend ✓

**Steps (Browser A):**
1. Go to "Friends" tab
2. Click **"Remove"** on Browser B's profile
3. Confirm in dialog

**✅ Success criteria:**
- Confirmation dialog appears
- After confirming:
  - Friend disappears from list
  - Friendship deleted in both accounts
- Browser B should no longer see Browser A as friend

---

### Test 11: Reject Friend Request ✓

**Steps:**
1. **Browser A**: Send request to Browser B
2. **Browser B**: Go to "Requests" tab
3. Click **"Reject"** button

**✅ Success criteria:**
- Request disappears from list
- No friendship created
- Browser A can send request again later

---

### Test 12: Cancel Sent Request ✓

**Steps:**
1. **Browser A**: Send request to Browser B
2. **Browser A**: Go to "Requests" tab
3. Under "Sent Requests", click **"Cancel"**

**✅ Success criteria:**
- Request disappears from sent list
- Browser B no longer sees the request
- Can send new request later

---

## 🐛 Troubleshooting

### Issue: "User not found" when sending request

**Cause**: Profiles not created
**Fix**: Run profile backfill SQL (see Step 2 above)

---

### Issue: No real-time notifications

**Possible causes:**

1. **Realtime not enabled**
   - Fix: Enable replication in Supabase Dashboard

2. **WebSocket connection failed**
   - Check browser console for errors
   - Check Network tab → WS (WebSocket)
   - Look for connection to Supabase Realtime

3. **User not authenticated**
   - Ensure you're logged in
   - Check: `supabase.auth.getUser()` in console

4. **RLS policies blocking**
   - Verify policies exist:
     ```sql
     SELECT * FROM pg_policies WHERE tablename = 'notifications';
     ```

---

### Issue: Search returns no results

**Causes:**
- Query too short (< 2 characters)
- No users match search
- Profiles table empty

**Fix**:
- Try exact email address
- Verify profiles exist: `SELECT * FROM profiles;`

---

### Issue: Notification bell doesn't show badge

**Causes:**
- No unread notifications
- API not returning unread count
- Component not rendering

**Debug:**
1. Check API: `GET /api/notifications`
2. Check browser console
3. Verify notifications table has data:
   ```sql
   SELECT * FROM notifications WHERE read = false;
   ```

---

## 📊 Final Verification

Run this SQL to see your testing results:

```sql
-- View all connections
SELECT
  uc.status,
  p1.email as user_email,
  p2.email as friend_email,
  uc.created_at
FROM user_connections uc
JOIN profiles p1 ON uc.user_id = p1.id
JOIN profiles p2 ON uc.friend_id = p2.id
ORDER BY uc.created_at DESC;

-- View all notifications
SELECT
  p.email as recipient,
  n.type,
  n.title,
  n.read,
  n.created_at
FROM notifications n
JOIN profiles p ON n.user_id = p.id
ORDER BY n.created_at DESC
LIMIT 20;

-- Count stats
SELECT
  (SELECT COUNT(*) FROM profiles) as total_profiles,
  (SELECT COUNT(*) FROM user_connections WHERE status = 'accepted') as total_friendships,
  (SELECT COUNT(*) FROM notifications) as total_notifications,
  (SELECT COUNT(*) FROM notifications WHERE read = false) as unread_notifications;
```

---

## ✅ Success Checklist

Check off each item as you complete it:

- [ ] All 3 database tables exist
- [ ] Profiles backfilled for all users
- [ ] Supabase Realtime enabled for notifications
- [ ] Social Hub page loads successfully
- [ ] User search works
- [ ] Friend request sent successfully
- [ ] **Real-time notification received** (Browser B)
- [ ] Friend request accepted
- [ ] **Real-time acceptance notification** (Browser A)
- [ ] Both users appear in each other's Friends list
- [ ] Mark notification as read works
- [ ] Delete notification works
- [ ] Remove friend works
- [ ] Reject friend request works
- [ ] Cancel sent request works

---

## 🎉 Next Steps

Once all tests pass:

1. ✅ **Phase 1 is complete!**
2. Choose next phase:
   - **Phase 2**: Course Discovery
   - **Phase 3**: Content Sharing
   - **Phase 4**: Personal Stats & Streaks

---

## 🆘 Getting Help

If you encounter issues:

1. Check browser console for errors
2. Check Network tab (look for failed API calls)
3. Check Supabase logs (Database → Logs)
4. Verify RLS policies are correct
5. Ensure you're using latest code

**Common errors:**
- `401 Unauthorized` → Not logged in
- `403 Forbidden` → RLS policy blocking
- `404 Not Found` → API route missing
- WebSocket errors → Realtime not enabled

---

**Happy testing! 🚀**
