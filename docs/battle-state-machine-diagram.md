# Battle Arena State Machine Diagram

## State Flow Visualization

```
┌─────────────────────────────────────────────────────────────────────┐
│                  FIXED BATTLE STATE MACHINE (v2)                     │
│                     NO AUTO-TRANSITIONS FROM RESULTS                 │
└─────────────────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ LOADING │ ◄─── Initial page load
    └────┬────┘
         │
         │ fetchBattle()
         ▼
    ┌──────────┐
    │ANSWERING │ ◄──────────────────────────┐
    └────┬─────┘                            │
         │                                  │
         │ User clicks                      │
         │ "Submit Round"                   │
         ▼                                  │
    ┌─────────┐                            │
    │ RESULTS │ ◄── ALWAYS show results    │
    └────┬────┘     STAYS HERE until       │
         │          user clicks Continue    │
         │                                  │
         │ User MUST click "Continue"       │
         │ (NO auto-timer!)                 │
         ▼                                  │
    ┌─────────────────────┐                │
    │ Check Opponent      │ ◄── Explicit   │
    │ Status              │    user action │
    └──────┬──────────────┘                │
           │                                │
           │                                │
    ┌──────┴──────┐                        │
    │             │                        │
    ▼             ▼                        │
┌─────────┐   ┌──────────────┐            │
│ WAITING │   │NEXT_ROUND_   │            │
│         │   │    READY     │            │
└────┬────┘   └──────┬───────┘            │
     │               │                     │
     │ Poll every 3s │ User clicks         │
     │               │ "Start Round X"     │
     │               │                     │
     │ Opponent      │                     │
     │ finishes      │                     │
     │               │                     │
     └───────┬───────┘                     │
             │                             │
             ├─────────────────────────────┘
             │
             │ (if last round)
             ▼
    ┌───────────────┐
    │BATTLE_COMPLETE│
    └───────────────┘
```

## State Descriptions

### 1. LOADING
- **Entry:** Page loads, component mounts
- **Display:** Loading spinner
- **Exit:** When battle data is fetched → ANSWERING

### 2. ANSWERING
- **Entry:** New round starts, questions available
- **Display:** Question cards with answer options
- **User Actions:** Select answers, submit round
- **Exit:** User submits → RESULTS

### 3. RESULTS ⭐ FIXED
- **Entry:** User just submitted round
- **Display:**
  - Round score comparison (You: X vs Opponent: Y)
  - Detailed question results (✓/✗ for each question)
  - Expandable explanations
  - "Continue" button
  - ~~Countdown timer~~ ❌ REMOVED
- **User Actions:**
  - Click "Continue" → Check opponent status immediately
  - ~~Wait 5s → Auto-check opponent status~~ ❌ REMOVED
- **Exit:** → WAITING or NEXT_ROUND_READY or BATTLE_COMPLETE
- **CRITICAL:** State stays RESULTS until user clicks Continue (no auto-timer!)

### 4. WAITING
- **Entry:** Opponent hasn't finished current round yet
- **Display:**
  - "Waiting for opponent..." message
  - Your score for this round
  - Animated waiting indicator
- **Background:** Poll every 3 seconds for opponent completion
- **Exit:** When opponent finishes → NEXT_ROUND_READY or BATTLE_COMPLETE

### 5. NEXT_ROUND_READY
- **Entry:** Both players finished current round, more rounds exist
- **Display:**
  - "Round X Complete!" message
  - Cumulative scores
  - "Start Round X" button
  - Optional countdown timer
- **User Actions:** Click "Start Round X"
- **Exit:** User clicks button → ANSWERING (next round)

### 6. BATTLE_COMPLETE
- **Entry:** All rounds completed
- **Display:**
  - Winner announcement
  - Final score breakdown
  - Round-by-round results
  - "Back to Battles" button
- **Exit:** Navigate away from battle

## State Transition Guards

### fetchBattle() Protection
```typescript
if (!forceStateUpdate &&
    ['results', 'waiting', 'nextRoundReady', 'battleComplete'].includes(state)) {
  // Update data only, don't change state
  return;
}
```

**Prevents:**
- Auto-transitions when viewing results
- State thrashing during polling
- Unexpected reloads of previous round

**Allows:**
- Explicit transitions via `forceStateUpdate = true`
- Data updates without state changes

## Timing ⭐ UPDATED

| Transition | Time | Type | Status |
|------------|------|------|--------|
| ~~RESULTS → Check Opponent~~ | ~~5s~~ | ~~Auto-timer~~ | ❌ REMOVED |
| RESULTS → Check Opponent | Manual | User click "Continue" | ✅ ONLY WAY |
| WAITING → Check Opponent | 3s | Polling interval | ✅ Active |
| NEXT_ROUND_READY → ANSWERING | Manual | User click "Start Round X" | ✅ Active |

## Error Handling

All state transitions include error handling:
```typescript
try {
  // State transition logic
} catch (error) {
  console.error('Error:', error);
  toast.error('Error message');
  // State remains unchanged on error
}
```

## Console Logging

Each transition is logged for debugging:
- `📊 Submission successful - showing results`
- `🔍 Checking opponent status after results`
- `⏳ Opponent still hasn't submitted - waiting`
- `🔄 Polling for opponent submission...`
- `✅ Opponent finished! Transitioning to next round ready`
- `⚠️ Skipping state update - in stable post-submission state`
- `🏁 Battle completed`
