# Battle Decline/Cancel Functionality Fix

**Date:** 2025-10-20
**Status:** FIXED
**Priority:** HIGH

---

## Problem Summary

Users were unable to decline or cancel pending battle invitations. The error message "Can only cancel pending battles" was appearing even when battles were in pending status.

**Error Details:**
- **Error Message:** "Can only cancel pending battles"
- **Location:** API route `/app/api/battles/[battleId]/route.ts` (DELETE handler)
- **Impact:** Both challengers and opponents could not cancel/decline pending battles

---

## Root Cause Analysis

### 1. Database RLS Policy Issue (PRIMARY CAUSE)

The Row Level Security (RLS) policy on the `quiz_battles` table was too restrictive:

**Before (INCORRECT):**
```sql
-- migrations/015_create_quiz_battles.sql (Line 206-213)
CREATE POLICY "Users can delete pending battles"
  ON quiz_battles
  FOR DELETE
  USING (
    auth.uid() = created_by    -- ❌ ONLY CHALLENGER ALLOWED
    AND status = 'pending'
  );
```

**Problem:**
- Only allowed `created_by` (challenger) to delete
- Prevented `opponent_id` (opponent) from declining
- Database rejected DELETE operations from opponents at the RLS level

**After (CORRECT):**
```sql
-- migrations/016_fix_battle_delete_policy.sql
CREATE POLICY "Users can delete pending battles"
  ON quiz_battles
  FOR DELETE
  USING (
    (auth.uid() = created_by OR auth.uid() = opponent_id)  -- ✅ BOTH ALLOWED
    AND status = 'pending'
  );
```

### 2. Missing UI Differentiation (SECONDARY ISSUE)

The UI component `BattleInviteCard` showed "Decline" for both challengers and opponents:

**Before:**
- Always showed "Decline" button
- No distinction between challenger canceling vs opponent declining
- Showed "Accept" button even for challengers (who can't accept their own challenge)

**After:**
- Shows "Cancel" for challengers
- Shows "Decline" for opponents
- Only shows "Accept" button to opponents

---

## Solution Implementation

### Files Modified

1. **Migration:** `/migrations/016_fix_battle_delete_policy.sql` (NEW)
2. **API Route:** `/app/api/battles/[battleId]/route.ts` (ENHANCED)
3. **API Route:** `/app/api/battles/route.ts` (ENHANCED)
4. **UI Component:** `/components/battles/BattleInviteCard.tsx` (FIXED)
5. **UI Component:** `/components/battles/BattleHistoryTab.tsx` (UPDATED)

---

## Detailed Changes

### 1. Database Migration Fix

**File:** `/migrations/016_fix_battle_delete_policy.sql`

```sql
-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can delete pending battles" ON quiz_battles;

-- Create new policy allowing both participants to cancel/decline
CREATE POLICY "Users can delete pending battles"
  ON quiz_battles
  FOR DELETE
  USING (
    (auth.uid() = created_by OR auth.uid() = opponent_id)
    AND status = 'pending'
  );

COMMENT ON POLICY "Users can delete pending battles" ON quiz_battles IS
  'Allows both challenger and opponent to cancel/decline pending battles. Once accepted (status = active), battles cannot be deleted.';
```

**To Apply:**
Run this SQL in the Supabase dashboard or via CLI:
```bash
psql "$DATABASE_URL" -f migrations/016_fix_battle_delete_policy.sql
```

---

### 2. API Route Enhancements

**File:** `/app/api/battles/[battleId]/route.ts` - DELETE Handler

**Improvements:**
- ✅ Added comprehensive logging at each step
- ✅ Better error messages for different battle statuses
- ✅ Added `completed_at` timestamp when cancelling
- ✅ Structured logging format `[Battle Delete]`
- ✅ Differentiated error messages by status

**Before:**
```typescript
// Only pending battles can be cancelled
if (battle.status !== 'pending') {
  return NextResponse.json(
    { error: 'Can only cancel pending battles' },
    { status: 400 }
  );
}
```

**After:**
```typescript
// Status validation - only pending battles can be cancelled
if (battle.status !== 'pending') {
  const statusMessages: Record<string, string> = {
    active: 'Cannot cancel an active battle. The battle has already started.',
    completed: 'Cannot cancel a completed battle.',
    cancelled: 'This battle has already been cancelled.'
  };

  const errorMessage = statusMessages[battle.status] ||
    `Cannot cancel battle with status: ${battle.status}. Only pending battles can be cancelled.`;

  console.warn('[Battle Delete] Invalid status:', {
    battleId,
    status: battle.status,
    userId: user.id,
    role: isChallenger ? 'challenger' : 'opponent'
  });

  return NextResponse.json({ error: errorMessage }, { status: 400 });
}
```

**Logging Added:**
```typescript
// Log the cancellation attempt
console.log('[Battle Delete] Attempting cancellation:', {
  battleId,
  userId: user.id,
  role: isChallenger ? 'challenger' : 'opponent',
  action: isChallenger ? 'CANCEL' : 'DECLINE',
  status: battle.status
});

// Log success
console.log('[Battle Delete] Success:', {
  battleId,
  userId: user.id,
  action: actionMessage
});
```

---

**File:** `/app/api/battles/route.ts` - GET Handler

**Enhancement:**
- Added `currentUserId` to response for UI to determine user role

```typescript
return NextResponse.json({
  success: true,
  currentUserId: user.id, // ✅ NEW: Include current user ID for UI
  battles: enrichedBattles,
  // ... rest of response
});
```

---

### 3. UI Component Fixes

**File:** `/components/battles/BattleInviteCard.tsx`

**Changes:**

1. **Added `currentUserId` prop:**
```typescript
interface BattleInviteCardProps {
  battle: Battle;
  currentUserId?: string; // ✅ NEW
  onAccept?: (battleId: string) => void;
  onDecline?: (battleId: string) => void;
}
```

2. **Determine user role and action text:**
```typescript
// Determine if current user is the challenger or opponent
const isChallenger = currentUserId === battle.challenger.id;
const actionText = isChallenger ? 'Cancel' : 'Decline';
```

3. **Update button text dynamically:**
```typescript
<button
  onClick={handleDecline}
  title={isChallenger ? 'Cancel challenge' : 'Decline challenge'}
>
  <X className="w-4 h-4" />
  {actionText}  {/* ✅ Shows "Cancel" or "Decline" */}
</button>
```

4. **Hide Accept button for challengers:**
```typescript
{!isChallenger && (  /* ✅ Only show Accept to opponents */
  <button onClick={handleAccept}>
    <Check className="w-4 h-4" />
    Accept
  </button>
)}
```

5. **Dynamic toast messages:**
```typescript
toast.info(data.message || `Battle ${actionText.toLowerCase()}d`);
// Shows: "Battle cancelled" or "Battle declined"
```

---

**File:** `/components/battles/BattleHistoryTab.tsx`

**Changes:**

1. **Track current user ID:**
```typescript
const [currentUserId, setCurrentUserId] = useState<string>('');
```

2. **Extract from API response:**
```typescript
if (data.currentUserId) {
  setCurrentUserId(data.currentUserId);
}
```

3. **Pass to BattleInviteCard:**
```typescript
<BattleInviteCard
  battle={battle}
  currentUserId={currentUserId}  // ✅ NEW
  onAccept={handleAcceptBattle}
  onDecline={handleDeclineBattle}
/>
```

---

## Authorization Logic

### Who Can Cancel/Decline What?

| User Role   | Action   | Status Required | Button Text | Toast Message     |
|-------------|----------|-----------------|-------------|-------------------|
| Challenger  | Cancel   | `pending`       | "Cancel"    | "Battle cancelled"|
| Opponent    | Decline  | `pending`       | "Decline"   | "Battle declined" |
| Challenger  | N/A      | `active`        | (none)      | Error             |
| Opponent    | N/A      | `active`        | (none)      | Error             |

### Status Validation

Only battles with `status = 'pending'` can be cancelled/declined.

**Error Messages by Status:**

| Status      | Error Message                                                |
|-------------|--------------------------------------------------------------|
| `active`    | "Cannot cancel an active battle. The battle has already started." |
| `completed` | "Cannot cancel a completed battle."                         |
| `cancelled` | "This battle has already been cancelled."                   |
| Other       | "Cannot cancel battle with status: {status}. Only pending battles can be cancelled." |

---

## Testing Instructions

### Test Scenario 1: Opponent Declines Challenge

1. **User A** challenges **User B** to a battle
2. **User B** logs in and views pending battles
3. **User B** should see:
   - "Decline" button (NOT "Cancel")
   - "Accept" button
4. **User B** clicks "Decline"
5. **Expected Result:**
   - ✅ Battle status changes to `cancelled`
   - ✅ Toast shows "Battle declined"
   - ✅ Battle removed from pending list
   - ✅ No errors in console

### Test Scenario 2: Challenger Cancels Own Challenge

1. **User A** challenges **User B** to a battle
2. **User A** views their pending battles (battles they created)
3. **User A** should see:
   - "Cancel" button (NOT "Decline")
   - NO "Accept" button
4. **User A** clicks "Cancel"
5. **Expected Result:**
   - ✅ Battle status changes to `cancelled`
   - ✅ Toast shows "Battle cancelled"
   - ✅ Battle removed from pending list
   - ✅ No errors in console

### Test Scenario 3: Cannot Cancel Active Battle

1. **User A** challenges **User B**, **User B** accepts
2. Battle status = `active`
3. Either user tries to cancel via API (manual test)
4. **Expected Result:**
   - ❌ Error: "Cannot cancel an active battle. The battle has already started."
   - ❌ HTTP 400 status code
   - ✅ Battle remains active

### Test Scenario 4: Logging Verification

1. Monitor server logs while testing scenarios 1 & 2
2. **Expected Logs:**
```
[Battle Delete] Attempting cancellation: {
  battleId: '...',
  userId: '...',
  role: 'challenger' | 'opponent',
  action: 'CANCEL' | 'DECLINE',
  status: 'pending'
}

[Battle Delete] Success: {
  battleId: '...',
  userId: '...',
  action: 'Battle cancelled' | 'Battle declined'
}
```

---

## Database Changes

### Before (Query Would Fail for Opponent)

```sql
-- Opponent tries to delete battle
DELETE FROM quiz_battles WHERE id = 'battle-id';

-- RLS Policy evaluates:
-- auth.uid() = created_by  -- FALSE (opponent is not created_by)
-- Result: PERMISSION DENIED
```

### After (Query Succeeds for Both)

```sql
-- Opponent tries to delete battle
DELETE FROM quiz_battles WHERE id = 'battle-id';

-- RLS Policy evaluates:
-- (auth.uid() = created_by OR auth.uid() = opponent_id)  -- TRUE (opponent matches opponent_id)
-- AND status = 'pending'  -- TRUE
-- Result: SUCCESS
```

---

## Common Issues Checklist

- ✅ **RLS Policy Updated:** Both participants can delete
- ✅ **Status Validation:** Only `pending` battles allowed
- ✅ **Authorization Check:** API verifies participant
- ✅ **UI Button Text:** Shows "Cancel" vs "Decline"
- ✅ **Accept Button Hidden:** Challenger can't accept own challenge
- ✅ **Error Messages:** Clear and specific by status
- ✅ **Logging:** Comprehensive for debugging
- ✅ **Toast Messages:** User-friendly feedback
- ✅ **completed_at Set:** Timestamp when cancelled

---

## API Response Examples

### Success Response (Opponent Declines)

```json
{
  "success": true,
  "message": "Battle declined"
}
```

### Success Response (Challenger Cancels)

```json
{
  "success": true,
  "message": "Battle cancelled"
}
```

### Error Response (Already Active)

```json
{
  "error": "Cannot cancel an active battle. The battle has already started."
}
```

### Error Response (Not Participant)

```json
{
  "error": "Not authorized to cancel this battle"
}
```

---

## Deployment Checklist

- [ ] Apply migration `016_fix_battle_delete_policy.sql` to production database
- [ ] Deploy updated API routes
- [ ] Deploy updated UI components
- [ ] Verify RLS policy active: `SELECT * FROM pg_policies WHERE tablename = 'quiz_battles';`
- [ ] Test with real users (challenger + opponent)
- [ ] Monitor server logs for errors
- [ ] Check Supabase dashboard for policy status

---

## Related Files

**Migrations:**
- `/migrations/015_create_quiz_battles.sql` - Original battle system
- `/migrations/016_fix_battle_delete_policy.sql` - Fix for delete policy

**API Routes:**
- `/app/api/battles/[battleId]/route.ts` - Battle detail and delete
- `/app/api/battles/route.ts` - List battles

**Components:**
- `/components/battles/BattleInviteCard.tsx` - Invite card UI
- `/components/battles/BattleHistoryTab.tsx` - Battle list

**Types:**
- `/types/database.ts` - Database schema types

---

## Summary

**What Was Broken:**
1. Database RLS policy only allowed challengers to delete
2. UI showed same button text for both roles
3. Opponents couldn't decline challenges

**What Was Fixed:**
1. ✅ RLS policy allows both challenger and opponent to delete pending battles
2. ✅ UI shows "Cancel" for challenger, "Decline" for opponent
3. ✅ Accept button only shown to opponents
4. ✅ Better error messages and logging
5. ✅ User-friendly toast messages
6. ✅ Proper timestamp tracking

**Testing:**
- Challenger can cancel their own pending challenges
- Opponent can decline pending challenges
- Neither can cancel active/completed battles
- Clear error messages guide users

---

**Document Version:** 1.0
**Last Updated:** 2025-10-20
**Author:** Claude Code (Next.js Fullstack Engineer)
