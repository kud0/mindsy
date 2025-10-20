# Quiz Battles Feature - Complete Overview

## Overview

**Quiz Battles** is a gamified learning feature that allows students to compete head-to-head in quiz competitions using their study materials. The system is designed to be learning-focused (not ranking-focused), encouraging friendly competition between friends.

**Status:** ✅ **FULLY IMPLEMENTED AND FUNCTIONAL**

**Last Updated:** October 20, 2025

---

## Key Features

### Core Functionality
- **Head-to-Head Battles:** 1v1 quiz competitions between friends
- **Multi-Round Format:** 3 rounds per battle, 5 questions per round
- **Async Gameplay:** Players can answer at different times
- **Content-Based:** Questions generated from challenger's study folders
- **Learning-Focused:** No public leaderboards, private statistics only
- **Battle History:** Track wins, losses, draws, and learning insights

### Battle States
- **Pending:** Challenge sent, waiting for opponent to accept
- **Active:** Battle in progress, players answering rounds
- **Completed:** All rounds finished, winner determined
- **Cancelled:** Battle cancelled/declined by either participant

---

## Architecture

### Database Schema

**Tables:**
- `quiz_battles` - Main battle records
- `battle_rounds` - Round data with questions
- `battle_participants` - Player submissions per round
- `battle_stats` - Aggregate statistics per user

**Key Fields:**
- Battle: `created_by`, `opponent_id`, `status`, `source_folder_id`, `rounds_count`, `questions_per_round`, `winner_id`
- Round: `battle_id`, `round_number`, `questions` (JSONB), `started_at`, `completed_at`
- Participant: `battle_id`, `user_id`, `round_number`, `answers`, `score`, `time_taken`

**Migrations:**
- `015_create_quiz_battles.sql` - Initial schema
- `016_fix_battle_delete_policy.sql` - Allow both participants to cancel pending battles
- `017_allow_cancel_active_battles.sql` - Allow forfeiting active battles
- `018_fix_cancelled_completion_timestamp.sql` - Allow cancelled battles to have completed_at

### API Routes

**Battle Management:**
- `POST /api/battles/create` - Create new battle challenge
- `GET /api/battles` - List battles (supports ?status=pending|active|completed)
- `GET /api/battles/[battleId]` - Get battle details with rounds
- `DELETE /api/battles/[battleId]` - Cancel/decline/forfeit battle
- `POST /api/battles/[battleId]/accept` - Accept challenge and generate Round 1

**Gameplay:**
- `POST /api/battles/[battleId]/start-round` - Start a new round (auto-called)
- `POST /api/battles/[battleId]/submit-round` - Submit round answers
- `GET /api/battles/[battleId]/round-results` - Get round results

**Supporting:**
- `GET /api/folders` - Get user's folders for battle creation

---

## Question Generation System

### Hybrid Approach

Questions are generated using a **hybrid system** that combines existing questions with AI generation:

1. **Extract from Existing Content** (Primary)
   - Load user's completed lectures from selected folder
   - Extract questions from JSON files in Supabase Storage
   - Extract questions from `study_nodes` table (legacy format)
   - Validate and sanitize questions

2. **AI Generation** (Fallback)
   - If not enough questions from content
   - Uses **Grok AI** (grok-4-fast-reasoning)
   - Generates questions based on combined lecture content
   - **Language Detection:** Auto-detects content language (Spanish, English, French, German)
   - Generates questions in the same language as source material

### Question Structure

```typescript
{
  id: string;
  question: string;
  options: { A: string; B: string; C: string; D: string; };
  correctAnswer: "A" | "B" | "C" | "D";
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  sourceNote?: string;
}
```

### Question Validation & Shuffling

**Critical Features:**
- ✅ **Option Shuffling:** Questions have their options shuffled using Fisher-Yates algorithm
- ✅ **Answer Tracking:** Correct answer is tracked through shuffling
- ✅ **Validation:** All questions must have 4 options, correct answer, and explanation
- ✅ **Sanitization:** Questions are cleaned and validated before storage

---

## Components

### Pages
- `app/dashboard/battles/[battleId]/page.tsx` - Battle arena page
- Battles tab in `app/dashboard/social/page.tsx` - Battle list and history

### Core Components
- `BattleArena.tsx` - Main battle interface with state machine
- `BattleQuestionView.tsx` - Question display and answer selection
- `BattleRoundResults.tsx` - Results after round submission
- `WaitingForOpponent.tsx` - Waiting state while opponent plays
- `NextRoundReady.tsx` - Transition between rounds
- `BattleResults.tsx` - Final battle results screen

### UI Components
- `BattleChallengeButton.tsx` - Challenge friend button
- `BattleChallengeModal.tsx` - Modal to create challenge
- `BattleInviteCard.tsx` - Pending battle invitation card
- `BattleHistoryTab.tsx` - Battle list with tabs (Pending/Active/Completed)

---

## State Machine (Battle Arena)

### States
```
LOADING → ANSWERING → RESULTS → (WAITING or NEXT_ROUND_READY) → ANSWERING (next round)
                                        ↓
                                   (if last round)
                                        ↓
                                  BATTLE_COMPLETE
```

### State Transition Rules

**CRITICAL RULES:**
1. ✅ **NEVER automatically transition from RESULTS** - Only user action advances
2. ✅ **NEVER call fetchBattle after submission** - Use submission response data
3. ✅ **fetchBattle only sets state when in LOADING** - Otherwise just updates data
4. ✅ **Stable states are protected** - Cannot be overridden without explicit permission

### User Flow

**Round Completion:**
1. User answers questions → Clicks "Submit"
2. **Shows results screen** with ✓/✗ for each question (STAYS HERE)
3. User clicks "Continue" → Checks opponent status
4. **If opponent NOT finished:** Show "Waiting for opponent..."
5. **If opponent finished:** Show "Next Round Ready" with countdown
6. User clicks "Start Round X" → Load next round questions

**Battle Completion:**
1. Both players finish Round 3 (last round)
2. System marks battle as 'completed'
3. Calculates total scores and determines winner
4. Shows final battle results screen

---

## Business Logic

### Scoring System (`lib/battles/scoring.ts`)

**Score Calculation:**
- **1 point per correct answer** (not percentage)
- Example: 3/5 correct = 3 points (not 60%)
- Total: Sum of all round scores (max 15 points for 3 rounds × 5 questions)

**Score Result:**
```typescript
{
  score: number;              // Raw correct count
  correctCount: number;
  incorrectCount: number;
  topicPerformance: Record<string, { correct, total, percentage }>;
  detailedResults: DetailedQuestionResult[];  // Per-question breakdown
}
```

### Winner Determination (`lib/battles/battle-utils.ts`)

```typescript
completeBattle(battleId) {
  // Calculate total scores from all rounds
  // Compare scores:
  //   - Higher score wins
  //   - Equal scores = draw (winner_id = null)
  // Update battle: status='completed', winner_id, completed_at
}
```

### Battle Cancellation Rules

**Pending Battles:**
- Challenger can CANCEL
- Opponent can DECLINE
- Sets `status='cancelled'`, `completed_at=NOW()`

**Active Battles:**
- Either player can FORFEIT
- Opponent automatically wins (`winner_id` set to non-forfeiting player)
- Sets `status='cancelled'`, `completed_at=NOW()`

**RLS Policy:**
```sql
-- Both participants can cancel pending OR active battles
(auth.uid() = created_by OR auth.uid() = opponent_id)
AND (status = 'pending' OR status = 'active')
```

---

## Key Files

### Core Logic
- `lib/battles/question-generator.ts` (413 lines) - Question generation & extraction
- `lib/battles/question-validator.ts` - Question validation & shuffling
- `lib/battles/scoring.ts` - Answer validation & scoring
- `lib/battles/battle-utils.ts` - Battle completion & winner calculation
- `lib/battles/ai-prompts.ts` - Grok AI prompts for question generation

### API Routes
- `app/api/battles/route.ts` - List and filter battles
- `app/api/battles/create/route.ts` - Create challenge
- `app/api/battles/[battleId]/route.ts` - Get details & cancel
- `app/api/battles/[battleId]/accept/route.ts` - Accept & generate Round 1
- `app/api/battles/[battleId]/submit-round/route.ts` - Submit answers & check completion
- `app/api/battles/[battleId]/start-round/route.ts` - Generate next round
- `app/api/folders/route.ts` - Get folders for battle creation

### Components
- `components/battles/BattleArena.tsx` (580+ lines) - Main state machine
- `components/battles/BattleHistoryTab.tsx` - Battle list UI
- `components/battles/BattleRoundResults.tsx` - Results display
- `components/battles/BattleChallengeModal.tsx` - Create challenge UI

### Types
- `types/battles.ts` - TypeScript interfaces
- `types/database.ts` - Database types (Battle, BattleRound, BattleParticipant, etc.)

---

## Recent Bug Fixes

### 1. Scoring Display (Fixed)
**Issue:** Scores showed as percentages (60/15) instead of raw counts (3/15)
**Fix:** Changed `calculateScore()` to return raw count instead of percentage
**Impact:** All score displays now show correct values

### 2. Option Shuffling (Fixed)
**Issue:** All "A" answers were correct - options weren't shuffled
**Fix:** Added `shuffleQuestionOptions()` function with Fisher-Yates algorithm
**Impact:** Correct answers now randomly distributed across A/B/C/D

### 3. Loading State (Fixed)
**Issue:** Got stuck in loading after clicking "Start Next Round"
**Fix:** Added explicit `setState('answering')` after `fetchBattle()` completes
**Impact:** Smooth transitions between rounds

### 4. Round Completion Flow (Fixed)
**Issue:** After submission, showed same round again instead of results
**Fix:** Removed auto-advance timer, made "Continue" button explicit user action
**Impact:** User sees results → clicks Continue → checks opponent → waits or advances

### 5. Battle Completion Detection (Fixed)
**Issue:** After Round 3, showed Round 3 again instead of final results
**Fix:** Store `battleComplete` flag from submission response
**Impact:** Properly transitions to final results screen

### 6. Forfeit Button (Fixed)
**Issue:** Forfeit button didn't do anything
**Fix:** Added actual DELETE API call to `handleDeclineBattle()`
**Impact:** Users can now forfeit active battles

### 7. Cancelled Battle Timestamps (Fixed)
**Issue:** CHECK constraint prevented cancelled battles from having `completed_at`
**Fix:** Updated constraint to allow both 'completed' AND 'cancelled' with timestamp
**Impact:** Forfeits and cancellations now work correctly

---

## Integration Points

### Social Features
- Battles accessible from **Social Hub** → Battles tab
- Challenge friends from **Friends List** → Challenge button
- Real-time notifications for battle invites

### Folder System
- Battle questions sourced from user's **folder content**
- Only challenger needs access to folder
- Opponent doesn't need the study materials

### Notifications
- Battle invitation sent to opponent
- Notifications when opponent accepts/declines
- Round completion notifications (future enhancement)

---

## Configuration

### Battle Settings (Hardcoded)
```typescript
const BATTLE_CONFIG = {
  rounds_count: 3,
  questions_per_round: 5,
  max_total_questions: 15
};
```

### AI Configuration
- **Service:** Grok AI (xAI)
- **Model:** grok-4-fast-reasoning
- **API Key:** `GROK_API_KEY` environment variable
- **Languages:** Spanish, English, French, German (auto-detected)

---

## Testing Checklist

### Battle Creation
- ✅ Challenge friend from friends list
- ✅ Select folder with study content
- ✅ Opponent receives invitation
- ✅ Can cancel before opponent accepts

### Battle Acceptance
- ✅ Accept invitation
- ✅ Round 1 questions generated
- ✅ Both players can enter battle

### Round Gameplay
- ✅ Questions display correctly
- ✅ Answer selection works
- ✅ Submit round → see results (✓/✗)
- ✅ Click "Continue" → wait or advance
- ✅ Opponent status detected (polling every 3s)
- ✅ "Start Next Round" loads Round 2

### Scoring & Completion
- ✅ Scores display as raw counts (3/5, not 60%)
- ✅ Answer validation correct (not all A)
- ✅ After Round 3 → shows final results
- ✅ Winner calculated correctly
- ✅ Battle appears in Completed tab

### Cancellation
- ✅ Decline pending invitation
- ✅ Cancel own pending challenge
- ✅ Forfeit active battle (opponent wins)
- ✅ Cancelled battles don't show in lists

---

## Known Limitations

1. **No Auto-Round Generation:** Next round must be manually triggered by first player to finish current round
2. **No Real-time Updates:** Uses polling (3s interval) instead of WebSockets
3. **No Rematch Feature:** Must create new battle to play again
4. **No Battle History Analytics:** Limited to basic win/loss/draw stats
5. **Language Detection:** Works well but may occasionally misdetect for mixed-language content

---

## Future Enhancements (Not Implemented)

- [ ] Real-time updates via Supabase Realtime subscriptions
- [ ] Battle rematch functionality
- [ ] Configurable rounds/questions per battle
- [ ] Battle history analytics and learning insights
- [ ] Achievement badges for battle milestones
- [ ] Battle tournament system
- [ ] Spectator mode for completed battles
- [ ] Battle statistics widgets on dashboard
- [ ] Mobile app push notifications
- [ ] Battle chat/comments

---

## Troubleshooting

### Common Issues

**Battles not showing:**
- Check RLS policies are applied
- Verify user is participant (created_by or opponent_id)
- Check status filter (cancelled battles excluded by default)

**Questions all correct:**
- Verify option shuffling is enabled
- Check `correctAnswer` field in database
- Ensure `validateAndSanitizeQuestions()` is called

**Stuck in loading:**
- Check state transitions in BattleArena
- Verify `fetchBattle()` completes successfully
- Ensure `setState('answering')` is called after fetch

**Forfeit doesn't work:**
- Verify migration 018 is applied
- Check RLS policy allows DELETE for both participants
- Ensure `handleDeclineBattle()` makes API call

---

## Documentation

**Related Docs:**
- `/docs/FOLDER-MANAGEMENT-SYSTEM.md` - Folder structure used for questions
- `/docs/battle-scoring-bug-fix.md` - Scoring system fix details
- `/docs/battle-round-completion-fix.md` - Round flow fix details
- `/docs/BATTLE-BUG-FIXES.md` - Complete bug fix history

**Migration Files:**
- `migrations/015_create_quiz_battles.sql` - Initial schema (647 lines)
- `migrations/016_fix_battle_delete_policy.sql` - Cancel policy
- `migrations/017_allow_cancel_active_battles.sql` - Forfeit policy
- `migrations/018_fix_cancelled_completion_timestamp.sql` - Timestamp constraint

---

## Summary

The Quiz Battles feature is a **fully functional, learning-focused competitive system** that enables friends to challenge each other using their study materials. It features:

- ✅ Complete battle lifecycle (create → accept → play → complete)
- ✅ Multi-round async gameplay
- ✅ Hybrid question generation (existing + AI)
- ✅ Proper scoring and answer validation
- ✅ Battle history and statistics
- ✅ Cancellation and forfeit support
- ✅ Multi-language support

All major bugs have been identified and fixed. The system is ready for production use.

**Last Major Update:** October 20, 2025 - Fixed all critical bugs (loading, shuffling, forfeit, completion flow)
