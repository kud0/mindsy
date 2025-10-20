# Battle Round Completion Flow - Fixed

## Problem

After submitting a battle round, the same round would reload instead of showing results. This was caused by:

1. **Auto-advance timer**: A 5-second timer automatically transitioned from 'results' state
2. **fetchBattle() called after submission**: Line 425 called `fetchBattle(false)` which re-evaluated state
3. **State machine instability**: No protection against reverting to 'answering' state

## Solution

Implemented a **stable, explicit state machine** with strict transition rules.

### State Transition Rules

```
LOADING → (fetch complete) → ANSWERING
ANSWERING → (submit) → RESULTS (STOP HERE)
RESULTS → (user clicks Continue) → CHECK_OPPONENT_STATUS
CHECK_OPPONENT_STATUS → WAITING or NEXT_ROUND_READY
WAITING → (poll detects opponent done) → NEXT_ROUND_READY
NEXT_ROUND_READY → (user clicks Start Round X) → ANSWERING (next round)
```

### Critical Changes

#### 1. Removed Auto-Advance Timer (BattleArena.tsx)

**Before:**
```typescript
// Auto-advance from results to waiting/next round after 5 seconds
useEffect(() => {
  if (state === 'results') {
    const timer = setTimeout(() => {
      checkOpponentStatusAfterResults();
    }, 5000);
    return () => clearTimeout(timer);
  }
}, [state]);
```

**After:**
```typescript
// REMOVED: Auto-advance timer - user must click Continue button
```

#### 2. Removed fetchBattle() Call After Submission (BattleArena.tsx)

**Before (Line 425):**
```typescript
toast.success(`Round submitted! You got ${data.correctCount} correct.`);
setState('results');
await fetchBattle(false); // ❌ This caused state to revert!
```

**After:**
```typescript
toast.success(`Round submitted! You got ${data.correctCount} correct.`);

// ALWAYS show results first and STOP
console.log('📊 [BattleArena] Submission successful - showing results');
setState('results');

// DO NOT call fetchBattle - it causes state to revert
// DO NOT auto-transition - user must click Continue
console.log('⏸️ [BattleArena] Staying in results state - waiting for user to click Continue');
```

#### 3. Protected Stable States in fetchBattle() (BattleArena.tsx)

**Before:**
```typescript
const fetchBattle = async (forceStateUpdate = false) => {
  // Always tried to determine state from battle data
  // This could override current state
}
```

**After:**
```typescript
const fetchBattle = async (allowStateChange = true) => {
  // ...fetch data and update battle...

  // CRITICAL: Only change state if explicitly allowed AND we're in 'loading' state
  const stableStates = ['results', 'waiting', 'nextRoundReady', 'battleComplete'];

  if (!allowStateChange) {
    console.log('⏸️ [BattleArena] State change blocked - just updated battle data');
    return;
  }

  if (stableStates.includes(state)) {
    console.log('⚠️ [BattleArena] In stable state, refusing to change state:', state);
    return;
  }

  // Only update state if we're in 'loading'
  if (state === 'loading') {
    // Determine state based on battle data
  }
}
```

#### 4. Created handleContinueFromResults() (BattleArena.tsx)

Renamed `checkOpponentStatusAfterResults()` to `handleContinueFromResults()` to make it explicit that this is a user action handler:

```typescript
const handleContinueFromResults = async () => {
  console.log('👉 [BattleArena] User clicked Continue from results');

  // Check if battle is complete
  if (lastSubmissionResult?.battleComplete) {
    setState('battleComplete');
    return;
  }

  // Fetch latest battle state to check opponent
  const response = await fetch(`/api/battles/${battleId}`);
  const data = await response.json();

  const transformedBattle = transformBattleData(data);
  setBattle(transformedBattle);

  const currentRound = transformedBattle.rounds[transformedBattle.current_round - 1];

  if (currentRound?.status === 'completed') {
    // Both players submitted
    setState('nextRoundReady');
  } else {
    // Opponent hasn't submitted yet
    setState('waiting');
  }
};
```

#### 5. Updated BattleRoundResults Component

**Interface Change:**
```typescript
// Before
interface BattleRoundResultsProps {
  onNextRound: () => void;
  autoAdvanceSeconds?: number;
}

// After
interface BattleRoundResultsProps {
  onContinue: () => void;
  // Removed autoAdvanceSeconds
}
```

**Removed Auto-Timer:**
```typescript
// Before
const [timeUntilNext, setTimeUntilNext] = useState(autoAdvanceSeconds);

useEffect(() => {
  const timer = setInterval(() => {
    setTimeUntilNext((prev) => prev <= 1 ? 0 : prev - 1);
  }, 1000);
  return () => clearInterval(timer);
}, []);

// After
// No timer state, no countdown effect
```

**Updated Continue Button:**
```typescript
// Before
<button onClick={onNextRound}>Continue</button>
<p>Checking opponent status in {timeUntilNext}s...</p>

// After
<button onClick={onContinue}>Continue</button>
<p>Click to check opponent status and continue</p>
```

### Files Modified

1. **components/battles/BattleArena.tsx**
   - Removed auto-advance timer useEffect
   - Removed fetchBattle() call after submission
   - Made fetchBattle() respect stable states
   - Created handleContinueFromResults()
   - Updated BattleRoundResults props

2. **components/battles/BattleRoundResults.tsx**
   - Removed autoAdvanceSeconds prop
   - Removed countdown timer state and effect
   - Changed onNextRound to onContinue
   - Updated button text and description

## Testing

After the fix, the flow should be:

1. **Submit Round 1** → Click "Submit Round"
2. **See Results Screen** → Shows questions with ✓/✗, scores, "Continue" button
3. **Screen Stays on Results** → No automatic reload or transition
4. **Click "Continue"** → Checks opponent status
5. **Either:**
   - "Waiting for opponent..." screen (if opponent not done)
   - "Next Round Ready" screen (if opponent done)
6. **Click "Start Round 2"** → Load Round 2 questions
7. **Repeat for all rounds**

## Key Principles

1. **No automatic state transitions after submission**
2. **User action required to continue (button click)**
3. **Never call fetchBattle after submission**
4. **fetchBattle respects stable post-submission states**
5. **Explicit state transitions only**

## State Machine Guarantees

- ✅ **SUBMISSION → RESULTS → STAYS THERE** until user clicks Continue
- ✅ **No automatic timers** that change state
- ✅ **Stable states cannot be overridden** by fetchBattle
- ✅ **Only user actions** trigger state transitions from results/waiting/nextRoundReady
