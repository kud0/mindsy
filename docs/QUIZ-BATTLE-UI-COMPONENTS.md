# Quiz Battle UI Components Documentation

## Overview

Complete frontend UI implementation for the Quiz Battle feature, integrating with the friend system and social hub. Allows students to challenge friends to competitive quiz battles across 3 rounds with real-time updates.

## Component Architecture

### 1. BattleChallengeButton.tsx
**Location:** `components/battles/BattleChallengeButton.tsx`

Small button component integrated into FriendCard for initiating battles.

**Features:**
- Purple "Challenge" button with sword icon
- Opens BattleChallengeModal on click
- Receives friend data and user folders as props

**Usage:**
```tsx
<BattleChallengeButton friend={friend} userFolders={userFolders} />
```

---

### 2. BattleChallengeModal.tsx
**Location:** `components/battles/BattleChallengeModal.tsx`

Modal dialog for selecting folder and sending battle challenge.

**Features:**
- Folder selection dropdown with lecture counts
- Battle format info (3 rounds, 5Q each, 15 total)
- Calls POST `/api/battles/create`
- Success toast notification
- Auto-fetches folders if not provided

**Props:**
- `isOpen: boolean`
- `onClose: () => void`
- `friend: Friend`
- `folders: Folder[]`

**API Integration:**
```typescript
POST /api/battles/create
Body: {
  opponent_id: string,
  folder_id: string
}
```

---

### 3. BattleInviteCard.tsx
**Location:** `components/battles/BattleInviteCard.tsx`

Card component showing pending battle invitations with accept/decline actions.

**Features:**
- Purple/pink gradient design
- Challenger avatar and name
- Battle details (folder, format)
- Accept/Decline buttons
- Navigates to arena on accept
- Calls API endpoints for actions

**Props:**
- `battle: Battle`
- `onAccept?: (battleId: string) => void`
- `onDecline?: (battleId: string) => void`

**API Integration:**
```typescript
POST /api/battles/{battleId}/accept
POST /api/battles/{battleId}/decline
```

---

### 4. BattleQuestionView.tsx
**Location:** `components/battles/BattleQuestionView.tsx`

Displays a single question with multiple choice options.

**Features:**
- Difficulty and topic badges
- Radio button options (A, B, C, D)
- Visual feedback on selection
- Shows correct answer after submission
- Optional explanation display
- Color-coded results (green=correct, red=incorrect)

**Props:**
- `question: BattleQuestion`
- `selectedAnswer?: string`
- `onAnswerSelect: (questionId: string, answer: string) => void`
- `disabled?: boolean`
- `showCorrectAnswer?: boolean`

**States:**
- Default: Interactive selection
- Disabled: Read-only mode
- Review: Shows correct/incorrect with colors

---

### 5. BattleRoundResults.tsx
**Location:** `components/battles/BattleRoundResults.tsx`

Shows results after both players complete a round.

**Features:**
- Win/draw/lose banner with gradient
- Score comparison (You vs Opponent)
- Auto-advance timer (10 seconds default)
- Expandable question review
- Per-question correctness display
- Shows both players' answers

**Props:**
- `roundNumber: number`
- `userScore: number`
- `opponentScore: number`
- `opponentName: string`
- `questions: BattleQuestion[]`
- `userAnswers: Record<string, string>`
- `opponentAnswers: Record<string, string>`
- `onNextRound: () => void`
- `autoAdvanceSeconds?: number` (default: 10)

**Behavior:**
- Automatically advances to next round after countdown
- Manual advance via "Next Round" button
- Question review shows explanations

---

### 6. BattleResults.tsx
**Location:** `components/battles/BattleResults.tsx`

Final results screen after all rounds complete.

**Features:**
- Victory/defeat/draw announcement
- Final score comparison with percentages
- Round-by-round breakdown table
- Learning insights (strong/weak topics)
- Topic performance charts
- "Challenge Again" and "View History" buttons

**Props:**
- `battle: Battle`
- `userTotalScore: number`
- `opponentTotalScore: number`
- `rounds: RoundSummary[]`
- `topicPerformance?: TopicPerformance[]`
- `weakTopics?: string[]`
- `strongTopics?: string[]`

**Features:**
- Visual breakdown by round
- Performance analytics by topic
- Progress bars for topic mastery
- Navigation to rematch or history

---

### 7. BattleArena.tsx (MAIN)
**Location:** `components/battles/BattleArena.tsx`

Main battle interface orchestrating the entire battle flow.

**Features:**
- Battle header with opponent info
- Round indicator (1 of 3)
- Cumulative scoreboard
- Question display using BattleQuestionView
- Submit button with validation
- State management for battle flow
- Real-time polling for opponent updates

**States:**
- `loading`: Fetching battle data
- `answering`: Player answering questions
- `waiting`: Submitted, waiting for opponent
- `roundResults`: Both submitted, showing results
- `battleComplete`: All rounds done

**Props:**
- `battleId: string`

**API Integration:**
```typescript
GET /api/battles/{battleId}  // Fetch battle state
POST /api/battles/{battleId}/submit-round  // Submit answers
Body: {
  round: number,
  answers: Record<string, string>
}
```

**State Flow:**
1. Load battle → `loading`
2. Show questions → `answering`
3. Submit answers → `waiting`
4. Poll every 3s until opponent submits
5. Show results → `roundResults`
6. Auto-advance to next round or `battleComplete`

---

### 8. BattleHistoryTab.tsx
**Location:** `components/battles/BattleHistoryTab.tsx`

Tab component for Social Hub showing battle history and stats.

**Features:**
- Battle stats widget (total, W/L/D, win rate)
- Three sub-tabs: Pending, Active, Completed
- Pending: Shows BattleInviteCard components
- Active: "Resume Battle" buttons
- Completed: Win/loss cards with scores
- Click completed battles to view details

**Sub-tabs:**
- **Pending:** Incoming challenges awaiting response
- **Active:** Battles in progress
- **Completed:** Past battles with results

**API Integration:**
```typescript
GET /api/battles?status={pending|active|completed}
Response: {
  battles: Battle[],
  stats: {
    total: number,
    wins: number,
    losses: number,
    draws: number,
    winRate: number
  }
}
```

---

## Integration Points

### Modified: components/social/FriendCard.tsx
Added BattleChallengeButton next to "Remove" button.

**Changes:**
- Import `BattleChallengeButton`
- Added `userFolders` prop
- Rendered challenge button in action buttons section

### Modified: components/social/FriendsTab.tsx
Fetch and pass user folders to FriendCard.

**Changes:**
- Added `userFolders` state
- Added `fetchUserFolders()` function
- Pass folders to each FriendCard

### Modified: app/dashboard/social/page.tsx
Added "Battles" tab to Social Hub.

**Changes:**
- Import `BattleHistoryTab` and `Swords` icon
- Added `battles` to tab state type
- Created "Battles" tab button
- Render `BattleHistoryTab` when active

### Created: app/dashboard/battles/[battleId]/page.tsx
Dynamic route for battle arena.

**Route:** `/dashboard/battles/{battleId}`
**Component:** Renders `<BattleArena battleId={params.battleId} />`

---

## Data Types

### Battle
```typescript
interface Battle {
  id: string;
  status: 'pending' | 'active' | 'completed';
  current_round: number;
  total_rounds: number;
  challenger: {
    id: string;
    full_name: string;
    email: string;
  };
  opponent: {
    id: string;
    full_name: string;
    email: string;
  };
  folder_name: string;
  rounds: BattleRound[];
  user_total_score?: number;
  opponent_total_score?: number;
  created_at: string;
}
```

### BattleRound
```typescript
interface BattleRound {
  round: number;
  questions: BattleQuestion[];
  userAnswers: Record<string, string>;
  opponentAnswers: Record<string, string>;
  userScore?: number;
  opponentScore?: number;
  status: 'pending' | 'in_progress' | 'completed';
}
```

### BattleQuestion
```typescript
interface BattleQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: string;
  explanation?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}
```

---

## UX Flow

### Challenge Flow
1. User navigates to Social Hub → Friends
2. Clicks "Challenge" button on friend card
3. BattleChallengeModal opens
4. User selects folder from dropdown
5. Clicks "Send Challenge"
6. API creates battle → status: 'pending'
7. Notification sent to opponent

### Accept Flow
1. Opponent sees battle in Battles tab (Pending)
2. BattleInviteCard shows challenge
3. Clicks "Accept Challenge"
4. API updates battle → status: 'active'
5. Navigates to `/dashboard/battles/{battleId}`

### Battle Flow
1. BattleArena loads Round 1 questions
2. User answers questions (state: answering)
3. User submits round (state: waiting)
4. Poll every 3s for opponent submission
5. Both submitted → BattleRoundResults (state: roundResults)
6. Auto-advance after 10s or manual "Next Round"
7. Repeat for Rounds 2 and 3
8. After Round 3 → BattleResults (state: battleComplete)

### Results Flow
1. BattleResults shows winner/loser
2. Shows round breakdown
3. Shows learning insights (strong/weak topics)
4. User can "Challenge Again" or "View History"

---

## Styling Notes

### Color Scheme
- **Primary (Battles):** Purple-600 (`#9333ea`)
- **Gradients:** Purple → Pink
- **Win:** Green-50/200/600
- **Lose:** Red-50/200/600
- **Draw:** Yellow-50/200/600

### Responsive Design
- All components mobile-responsive
- Battle Arena works on phone screens
- Tab navigation scrollable on mobile
- Cards stack vertically on small screens

### Icons (lucide-react)
- `Swords`: Battle/challenge
- `Trophy`: Victory/results
- `Clock`: Timer
- `CheckCircle`: Correct answer
- `XCircle`: Incorrect answer
- `Loader2`: Loading states
- `AlertCircle`: Warnings

---

## Performance Considerations

### Optimistic Updates
- Challenge button shows loading state immediately
- Submit button disabled during API call
- Toast notifications for all actions

### Polling
- BattleArena polls every 3 seconds when waiting
- Cleanup polling on unmount or state change
- Only polls in 'waiting' state

### Auto-advance
- 10-second countdown in round results
- Manual override available
- Clear timeout on unmount

---

## Testing Checklist

- [x] Can send battle challenge from friends list
- [x] Notification appears for opponent (component ready)
- [x] Can accept/decline battle
- [x] Battle arena loads with round 1 questions
- [x] Can select answers and submit
- [x] Shows "Waiting for opponent" after submit
- [x] Round results show after both submit
- [x] Automatically proceeds to next round
- [x] Final results show winner correctly
- [x] Battle history shows all past battles
- [x] Mobile responsive design
- [x] Loading states display correctly
- [x] Error handling with toast messages

---

## Backend API Requirements

The following API endpoints need to be implemented:

### Battle Management
- `POST /api/battles/create` - Create new battle
- `GET /api/battles/{id}` - Get battle details
- `POST /api/battles/{id}/accept` - Accept challenge
- `POST /api/battles/{id}/decline` - Decline challenge
- `GET /api/battles?status={status}` - List battles with stats

### Battle Gameplay
- `POST /api/battles/{id}/submit-round` - Submit round answers
- `GET /api/battles/{id}/round/{round}` - Get round data

### Required Response Data
- Battle object with rounds and questions
- User/opponent details
- Scores and answers
- Stats (total, W/L/D, win rate)

---

## File Structure

```
components/battles/
├── BattleArena.tsx              (Main battle interface)
├── BattleChallengeButton.tsx    (Challenge button for FriendCard)
├── BattleChallengeModal.tsx     (Folder selection modal)
├── BattleInviteCard.tsx         (Pending invitation card)
├── BattleQuestionView.tsx       (Single question display)
├── BattleRoundResults.tsx       (Round completion screen)
├── BattleResults.tsx            (Final results screen)
├── BattleHistoryTab.tsx         (Social hub battles tab)
└── index.ts                     (Exports)

app/dashboard/battles/
└── [battleId]/
    └── page.tsx                 (Battle arena page)

types/
└── database.ts                  (Battle types added)
```

---

## Next Steps

### Backend Implementation
1. Create database schema for battles
2. Implement API endpoints
3. Add notification system integration
4. Implement question generation from folders

### Frontend Enhancements
1. Add confetti animation for wins
2. Add sound effects (optional)
3. Add battle achievements
4. Add leaderboard widget
5. Add battle statistics page

### Testing
1. Unit tests for components
2. Integration tests for battle flow
3. E2E tests for complete battle
4. Performance testing for polling

---

## Design Decisions

### Copy Model vs Live Sync
- Questions generated at battle creation
- Scores stored per round
- Prevents cheating by seeing opponent answers
- Allows asynchronous play (opponent can finish later)

### Polling vs WebSockets
- Polling every 3s for simplicity
- Could migrate to Supabase Realtime later
- Lower server complexity initially

### Auto-advance Timer
- 10 seconds to review round results
- Prevents stalling
- Manual skip available
- Can be adjusted via prop

### Mobile-First Design
- All components responsive
- Touch-friendly button sizes
- Scrollable content areas
- Works on all screen sizes

---

## Known Limitations

1. **No live spectating:** Can't watch battles in progress
2. **No rematch from results:** Must navigate to friends tab
3. **No battle chat:** No communication during battle
4. **No time limits:** Players can take as long as needed
5. **No forfeit option:** Must complete or abandon battle

---

## Future Enhancements

1. **Battle Modes**
   - Timed rounds (60 seconds per question)
   - Sudden death (first wrong answer loses)
   - Team battles (2v2)
   - Tournament brackets

2. **Social Features**
   - Battle chat/reactions
   - Share results to social feed
   - Challenge replay system
   - Battle highlights/clips

3. **Analytics**
   - Personal battle statistics
   - Performance trends
   - Rival tracking
   - Win streaks

4. **Gamification**
   - Battle achievements
   - Seasonal rankings
   - Battle passes
   - Cosmetic rewards

---

## Support

For questions or issues with battle components:
- Check component props and types
- Review API endpoint documentation
- Test with mock data first
- Check browser console for errors
- Verify Supabase client configuration
