# Phase 3: Content Sharing - Testing Guide

## What's New in Phase 3

**Copy-Based Content Sharing**: Share lectures with friends! When you share, the recipient gets a **full copy** they own independently.

### Features:
✅ Share button on all lecture pages
✅ Select multiple friends to share with
✅ Add optional message when sharing
✅ Real-time notification when content is shared
✅ "Shared" tab in Social Hub to view sent/received content
✅ Full copy model - recipient owns the content completely

---

## 🎯 Setup Steps

### 1. Run the Migration

In **Supabase SQL Editor**, run:

```sql
-- File: migrations/004_create_shared_content_table.sql
```

Copy and paste the entire content of `migrations/004_create_shared_content_table.sql` and run it.

**Expected result**:
- ✅ Table `shared_content` created
- ✅ RLS policies enabled
- ✅ Notification trigger created

---

## 🧪 Testing Phase 3

### Test 1: Share Button Visible ✓

1. Navigate to any lecture: `/dashboard/lectures/[jobId]/student-desk`
2. Look at the header (top bar)

**✅ Success criteria:**
- Share icon (📤) visible next to lecture title
- Icon is clickable

---

### Test 2: Share Modal Opens ✓

1. Click the share button
2. Modal should appear

**✅ Success criteria:**
- Modal opens with title "Share Lecture"
- Shows lecture title
- Friends list loads (or shows "No friends yet" if none)
- Optional message textarea visible
- "Share" button at bottom

---

### Test 3: Select Friends & Share ✓

**Setup**: Have at least 1 friend (from Phase 1)

**Steps:**
1. Click share button on a lecture
2. Select one or more friends (checkboxes)
3. Add optional message (e.g., "Check this out!")
4. Click "Share with X" button

**✅ Success criteria:**
- Selected friends show blue background + checkmark
- "Share with X" button shows correct count
- Toast: "Shared with X friend(s)!"
- Modal closes

---

### Test 4: Recipient Gets Notification ✓

**Steps (Browser B - friend's account):**
1. Wait 1-2 seconds after sharing
2. Watch notification bell

**✅ Success criteria:**
- 🔔 Notification bell badge updates
- 🔔 Toast: "[Name] shared [Lecture] with you"
- Click bell → See notification
- Click notification → Redirects to shared lecture

---

### Test 5: View Shared Lecture (Recipient) ✓

**Steps (Browser B):**
1. From notification, click to open lecture
2. OR navigate to `/dashboard/lectures`
3. See new lecture with "[Shared]" prefix

**✅ Success criteria:**
- Lecture appears in recipient's dashboard
- Title shows "[Shared] [Original Title]"
- Recipient can view full content
- Recipient can add their own notes
- Recipient owns this copy (can delete, etc.)

---

### Test 6: View Shared Tab (Sent) ✓

**Steps (Browser A - sender):**
1. Navigate to `/dashboard/social`
2. Click "Shared" tab
3. Click "Sent" sub-tab

**✅ Success criteria:**
- See list of sent shares
- Each shows:
  - Recipient name + avatar
  - Lecture title
  - Optional message
  - Date shared
- Click card → Opens original lecture

---

### Test 7: View Shared Tab (Received) ✓

**Steps (Browser B - recipient):**
1. Navigate to `/dashboard/social`
2. Click "Shared" tab
3. Click "Received" sub-tab (default)

**✅ Success criteria:**
- See list of received shares
- Each shows:
  - Sender name + avatar
  - Lecture title
  - Optional message
  - Date received
- Click card → Opens copied lecture

---

### Test 8: Share with Multiple Friends ✓

**Setup**: Have 2+ friends

**Steps:**
1. Share one lecture with 2 friends at once
2. Select both friends in modal
3. Add message
4. Share

**✅ Success criteria:**
- Both friends receive notification
- Both get their own copy
- Shared tab shows 2 separate shares
- Each copy is independent

---

### Test 9: Edit Shared Content (Independence) ✓

**Steps (Browser B - recipient):**
1. Open shared lecture
2. Add personal notes
3. Make changes

**Steps (Browser A - original owner):**
1. Open original lecture
2. Check notes

**✅ Success criteria:**
- Recipient's changes do NOT affect original
- Original owner's content unchanged
- Both copies are fully independent

---

### Test 10: Prevent Duplicate Shares ✓

**Steps:**
1. Share lecture with Friend A
2. Try to share same lecture with Friend A again

**✅ Success criteria:**
- Either: Modal shows "Already shared" indicator
- OR: API returns error: "Already shared with this user"
- No duplicate copies created

---

## 🐛 Troubleshooting

### Issue: Share button not visible

**Cause**: Component not imported
**Fix**: Refresh page, check console for errors

---

### Issue: "Failed to fetch friends" in modal

**Cause**: Friends API not working
**Fix**:
1. Check `/api/friends` endpoint works
2. Verify you have friends (Phase 1)
3. Check browser console

---

### Issue: Share fails silently

**Causes:**
- Migration not run
- Job doesn't exist
- Not friends with recipient

**Fix**:
1. Check console for errors
2. Verify migration 004 ran: `SELECT * FROM shared_content LIMIT 1;`
3. Check RLS policies: `SELECT * FROM pg_policies WHERE tablename = 'shared_content';`
4. Verify friendship exists

---

### Issue: Recipient doesn't get notification

**Causes:**
- Realtime not enabled
- Notification trigger failed

**Fix**:
1. Check Supabase Realtime enabled for `notifications` table
2. Check trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'notify_content_shared_trigger';
   ```
3. Check notifications table:
   ```sql
   SELECT * FROM notifications WHERE type = 'share' ORDER BY created_at DESC LIMIT 5;
   ```

---

### Issue: Shared lecture doesn't appear

**Causes:**
- Job copy failed
- shared_content record not created

**Debug**:
```sql
-- Check shared_content records
SELECT * FROM shared_content ORDER BY shared_at DESC LIMIT 10;

-- Check if job was copied
SELECT job_id, user_id, lecture_title FROM jobs
WHERE lecture_title LIKE '[Shared]%'
ORDER BY created_at DESC LIMIT 10;
```

---

## 📊 Verification Queries

Run these in Supabase SQL Editor:

```sql
-- View all shares
SELECT
  sc.title as shared_lecture,
  p1.full_name as sender,
  p2.full_name as recipient,
  sc.shared_at,
  sc.description
FROM shared_content sc
JOIN profiles p1 ON sc.owner_id = p1.id
JOIN profiles p2 ON sc.recipient_id = p2.id
ORDER BY sc.shared_at DESC;

-- Count shares by user
SELECT
  p.full_name,
  COUNT(CASE WHEN sc.owner_id = p.id THEN 1 END) as sent,
  COUNT(CASE WHEN sc.recipient_id = p.id THEN 1 END) as received
FROM profiles p
LEFT JOIN shared_content sc ON p.id IN (sc.owner_id, sc.recipient_id)
GROUP BY p.id, p.full_name;

-- View copied jobs
SELECT
  j.job_id,
  j.user_id,
  j.lecture_title,
  j.created_at,
  j.metadata->>'shared_from' as original_owner,
  j.metadata->>'original_job_id' as original_job
FROM jobs j
WHERE j.lecture_title LIKE '[Shared]%'
ORDER BY j.created_at DESC;
```

---

## ✅ Success Checklist

- [ ] Migration 004 ran successfully
- [ ] Share button appears on lecture pages
- [ ] Share modal opens and shows friends
- [ ] Can select multiple friends
- [ ] Can add optional message
- [ ] Share completes successfully
- [ ] Recipient gets real-time notification
- [ ] Recipient sees copied lecture in dashboard
- [ ] Shared tab shows sent shares
- [ ] Shared tab shows received shares
- [ ] Both copies are independent (editing one doesn't affect other)
- [ ] Duplicate shares are prevented

---

## 🎉 Phase 3 Complete!

Once all tests pass, you have:
- ✅ **Phase 1**: Friends + Real-time Notifications
- ✅ **Phase 2**: (Skipped for now)
- ✅ **Phase 3**: Content Sharing with Copy Model

---

## 🚀 What's Next?

You can now:
1. **Test Phase 3** thoroughly
2. Go back to **Phase 2: Course Discovery** (find classmates by course)
3. Jump to **Phase 4: Personal Stats & Streaks** (gamification)
4. Polish existing features

---

**Happy sharing! 🎉**
