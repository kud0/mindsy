# Battle Round Completion UX Specification

**Document Version:** 1.0
**Date:** 2025-10-20
**Author:** Student Desk UX Designer
**Status:** Ready for Implementation

---

## Executive Summary

This document specifies the complete user experience flow for battle round completion, addressing the critical UX issue where users currently see the same round repeated after submission instead of receiving immediate feedback and appropriate next steps.

**Current Problem:** After submitting answers, users are shown the same questions again with no feedback, creating confusion and a poor experience.

**Solution:** Implement a clear 4-state flow with immediate feedback, intelligent waiting states, and smooth transitions between rounds.

---

## 1. Flow Diagram

```
[USER PLAYING ROUND 1]
        |
        | User answers all questions
        | Clicks "Submit Round"
        ↓
[IMMEDIATE RESULTS VIEW] ← YOU ARE HERE (new state)
        |
        | System checks: Has opponent submitted?
        ↓
    ┌───────────────────┐
    |                   |
    NO                 YES
    |                   |
    ↓                   ↓
[WAITING STATE]    [NEXT ROUND READY STATE]
    |                   |
    | Poll/Realtime     | User clicks "Start Round 2"
    | Wait for          | or auto-advance in 5s
    | opponent          |
    |                   |
    └─────────→ When opponent finishes
                ↓
        [NEXT ROUND READY STATE]
                |
                | User proceeds
                ↓
        [USER PLAYING ROUND 2]
                |
                | Repeat process...
                ↓
        [BATTLE COMPLETE VIEW]
```

---

## 2. State Definitions

### State 1: Playing Round (`state === 'answering'`)
**When:** User is actively selecting answers to questions
**Components:** BattleQuestionView (existing)
**Duration:** Variable (user-controlled)

### State 2: Immediate Results (`state === 'results'`) **NEW**
**When:** Immediately after submission, before checking opponent status
**Components:** BattleImmediateResults (new component)
**Duration:** 2-3 seconds (then auto-transition to waiting or ready)

### State 3: Waiting for Opponent (`state === 'waiting'`)
**When:** User submitted, opponent has NOT submitted
**Components:** Enhanced waiting view (update existing)
**Duration:** Variable (until opponent submits)

### State 4: Next Round Ready (`state === 'ready'`)
**When:** BOTH players have submitted current round
**Components:** BattleNextRoundReady (new component)
**Duration:** 5 seconds auto-advance OR user clicks button

### State 5: Round Results Review (`state === 'roundResults'`)
**When:** User wants to review completed round in detail
**Components:** BattleRoundResults (existing, needs updates)
**Duration:** User-controlled (via "Next Round" button)

---

## 3. Detailed State Specifications

## State 2: Immediate Results View (NEW CRITICAL STATE)

### Purpose
Provide instant gratification and feedback immediately after submission, before any waiting occurs.

### Visual Design

#### Layout Structure (Mobile-First)
```
┌─────────────────────────────────────┐
│  [Back Arrow]    Round 1 Results    │ ← Header
├─────────────────────────────────────┤
│                                     │
│   ┌───────────────────────────┐    │
│   │  Your Score: 3/5          │    │ ← Score Card
│   │  ★★★☆☆                    │    │
│   │  60% Correct              │    │
│   └───────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Q1: [Question text...]     │   │ ← Question List
│  │ Your answer: B ✓           │   │   (Collapsed View)
│  │ [Correct!]                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Q2: [Question text...]     │   │
│  │ Your answer: C ✗           │   │
│  │ Correct: A                 │   │
│  └─────────────────────────────┘   │
│                                     │
│  [... Q3, Q4, Q5 ...]              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ ⏳ Checking opponent...    │   │ ← Status
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Component Specifications

#### Score Card
```tsx
<div className="bg-gradient-to-r from-purple-50 to-blue-50
                rounded-2xl p-6 border-2 border-purple-200
                shadow-lg mx-4 my-4">
  {/* Large Score Display */}
  <div className="text-center mb-4">
    <h2 className="text-5xl font-bold text-gray-900 mb-2">
      {userScore}/{totalQuestions}
    </h2>
    <div className="flex justify-center gap-1 mb-3">
      {/* Star Rating (5 stars, filled based on score) */}
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          className={i < starsFilled ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'}
          size={32}
        />
      ))}
    </div>
    <p className="text-lg text-gray-600">
      {percentage}% Correct
    </p>
  </div>

  {/* Performance Badge */}
  <div className="flex justify-center">
    <Badge className={performanceBadgeColor}>
      {performanceText} {/* "Excellent!", "Good!", "Keep Going!" */}
    </Badge>
  </div>
</div>
```

**Performance Thresholds:**
- 5/5 (100%): "Perfect! 🎯" - Gold badge
- 4/5 (80%): "Excellent! 🌟" - Green badge
- 3/5 (60%): "Good Job! 👍" - Blue badge
- 2/5 (40%): "Keep Going! 💪" - Orange badge
- 0-1/5 (0-20%): "Try Again! 📚" - Purple badge

#### Question Review List
```tsx
<div className="space-y-3 px-4">
  {questions.map((question, index) => {
    const userAnswer = answers[question.id];
    const isCorrect = userAnswer === question.correctAnswer;

    return (
      <div
        key={question.id}
        className={cn(
          "rounded-xl p-4 border-2 transition-all",
          isCorrect
            ? "bg-green-50 border-green-500"
            : "bg-red-50 border-red-500"
        )}
      >
        {/* Question Header */}
        <div className="flex items-start gap-3 mb-2">
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold",
            isCorrect ? "bg-green-500 text-white" : "bg-red-500 text-white"
          )}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-900 font-medium line-clamp-2">
              {question.question}
            </p>
          </div>
          <div className="flex-shrink-0">
            {isCorrect ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
          </div>
        </div>

        {/* Answer Details */}
        <div className="ml-11 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600">Your answer:</span>
            <span className={cn(
              "text-sm font-bold",
              isCorrect ? "text-green-700" : "text-red-700"
            )}>
              {userAnswer || "Not answered"}
            </span>
          </div>

          {!isCorrect && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-600">Correct:</span>
              <span className="text-sm font-bold text-green-700">
                {question.correctAnswer}
              </span>
            </div>
          )}
        </div>

        {/* Tap to expand for explanation (optional) */}
        <button
          onClick={() => toggleExpanded(question.id)}
          className="ml-11 mt-2 text-xs text-purple-600 font-medium"
        >
          {expanded ? "Hide" : "Show"} explanation →
        </button>
      </div>
    );
  })}
</div>
```

#### Loading Footer
```tsx
<div className="px-4 py-6 text-center">
  <div className="inline-flex items-center gap-2 text-gray-600">
    <Loader2 className="w-5 h-5 animate-spin" />
    <span className="text-sm">Checking opponent status...</span>
  </div>
</div>
```

### Interaction Behavior

**On Mount:**
1. Animate score counter from 0 to final score (0.5s duration)
2. Animate stars filling one by one (0.2s delay each)
3. Fade in question list items sequentially (0.1s delay each)
4. After 2 seconds, check opponent status and auto-transition

**Touch Targets:**
- Question cards: 48px minimum height
- Expand/collapse buttons: 44x44px tap area
- All interactive elements: 8px spacing minimum

### Accessibility

**Screen Reader Announcements:**
```
"Round submitted. Your score: 3 out of 5 questions correct. 60 percent."
"Question 1: Correct. Your answer: B"
"Question 2: Incorrect. Your answer was C, correct answer is A"
```

**Focus Management:**
- Auto-focus on score heading on mount
- Tab order: Score → Q1 → Q2 → Q3 → Q4 → Q5

**Color Contrast:**
- Green success: #059669 (700) on #ECFDF5 (50) = 7.2:1 ✓
- Red error: #DC2626 (600) on #FEF2F2 (50) = 8.1:1 ✓
- All text: Minimum 4.5:1 ratio

---

## State 3: Waiting for Opponent (ENHANCED)

### Purpose
Keep user engaged while waiting, without causing frustration. Show clear status that it's opponent's turn.

### Visual Design

#### Layout Structure
```
┌─────────────────────────────────────┐
│  [Back Arrow]    Round 1            │
├─────────────────────────────────────┤
│                                     │
│   ┌───────────────────────────┐    │
│   │    ⏳ Waiting...          │    │ ← Primary Status
│   │                           │    │
│   │    [Animated Dots]        │    │
│   └───────────────────────────┘    │
│                                     │
│   ┌───────────────────────────┐    │
│   │  Sarah is still playing   │    │ ← Opponent Status
│   │  Round 1                  │    │
│   └───────────────────────────┘    │
│                                     │
│   ┌───────────────────────────┐    │
│   │  Your Performance         │    │ ← Your Score
│   │  3/5 correct (60%)        │    │   (Read-only)
│   │  ★★★☆☆                    │    │
│   └───────────────────────────┘    │
│                                     │
│   ┌───────────────────────────┐    │
│   │  Overall Battle Standings │    │ ← Battle Progress
│   │  You: 3 pts               │    │
│   │  Sarah: ? pts             │    │
│   │                           │    │
│   │  Round 2 & 3 remaining    │    │
│   └───────────────────────────┘    │
│                                     │
│   [View Your Answers] (optional)   │ ← Secondary Action
│                                     │
└─────────────────────────────────────┘
```

### Component Specifications

#### Waiting Animation
```tsx
<div className="flex flex-col items-center justify-center py-12 px-4">
  {/* Animated Icon */}
  <div className="relative mb-6">
    <div className="absolute inset-0 bg-purple-200 rounded-full animate-ping opacity-25" />
    <div className="relative bg-purple-100 p-6 rounded-full">
      <Clock className="w-12 h-12 text-purple-600 animate-pulse" />
    </div>
  </div>

  {/* Status Text */}
  <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
    Waiting for {opponentName}
  </h2>

  <p className="text-gray-600 text-center mb-4">
    They're still answering Round {roundNumber}
  </p>

  {/* Animated Dots */}
  <div className="flex gap-2">
    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
          style={{ animationDelay: '0ms' }} />
    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
          style={{ animationDelay: '150ms' }} />
    <span className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"
          style={{ animationDelay: '300ms' }} />
  </div>
</div>
```

#### Your Performance Card (Read-only)
```tsx
<div className="mx-4 mb-4 bg-white rounded-xl border-2 border-gray-200 p-4">
  <h3 className="text-sm font-semibold text-gray-700 mb-3">
    Your Round {roundNumber} Performance
  </h3>

  <div className="flex items-center justify-between">
    <div>
      <p className="text-3xl font-bold text-gray-900 mb-1">
        {userScore}/{totalQuestions}
      </p>
      <p className="text-sm text-gray-600">
        {percentage}% Correct
      </p>
    </div>

    <div className="flex gap-1">
      {/* Star rating (read-only) */}
      {renderStars(userScore, totalQuestions)}
    </div>
  </div>
</div>
```

#### Battle Standings Card
```tsx
<div className="mx-4 mb-4 bg-gradient-to-r from-purple-50 to-pink-50
                rounded-xl border-2 border-purple-200 p-4">
  <h3 className="text-sm font-semibold text-gray-700 mb-3">
    Overall Battle
  </h3>

  <div className="grid grid-cols-2 gap-4 mb-3">
    <div className="text-center">
      <p className="text-xs text-gray-600 mb-1">You</p>
      <p className="text-2xl font-bold text-gray-900">{userTotalScore}</p>
    </div>
    <div className="text-center">
      <p className="text-xs text-gray-600 mb-1">{opponentName}</p>
      <p className="text-2xl font-bold text-gray-400">?</p>
      <p className="text-xs text-gray-500">Still playing</p>
    </div>
  </div>

  <div className="pt-3 border-t border-purple-200">
    <p className="text-xs text-gray-600 text-center">
      {remainingRounds} round{remainingRounds !== 1 ? 's' : ''} remaining
    </p>
  </div>
</div>
```

#### Optional: View Answers Button
```tsx
<div className="px-4">
  <button
    onClick={() => setShowAnswers(!showAnswers)}
    className="w-full py-3 px-4 border-2 border-purple-300 text-purple-700
               rounded-xl font-medium hover:bg-purple-50 transition-colors
               flex items-center justify-center gap-2"
  >
    <Eye className="w-5 h-5" />
    {showAnswers ? 'Hide' : 'Review'} Your Answers
  </button>
</div>

{/* Expandable Section */}
{showAnswers && (
  <div className="px-4 mt-4 space-y-2">
    {/* Same question review list from Immediate Results */}
    {/* But in collapsed, read-only format */}
  </div>
)}
```

### Polling Strategy

**Hybrid Approach (Recommended):**
1. **Initial Check:** Immediately on entering waiting state
2. **Polling:** Every 3 seconds for first 30 seconds
3. **Fallback:** Every 5 seconds thereafter
4. **Real-time (Bonus):** If Supabase Realtime available, subscribe to battle_participants table

**Implementation:**
```tsx
useEffect(() => {
  if (state !== 'waiting') return;

  let pollCount = 0;
  const checkOpponent = async () => {
    const data = await fetchBattleStatus();
    if (data.bothSubmitted) {
      setState('ready');
      clearInterval(interval);
    }
    pollCount++;
  };

  // Initial check
  checkOpponent();

  // Polling (3s for first 10 checks, then 5s)
  const interval = setInterval(
    checkOpponent,
    pollCount < 10 ? 3000 : 5000
  );

  return () => clearInterval(interval);
}, [state]);
```

### Accessibility

**Screen Reader:**
```
"Waiting for Sarah to finish Round 1. Your score: 3 out of 5. Checking status every 3 seconds."
```

**ARIA Live Region:**
```tsx
<div role="status" aria-live="polite" aria-atomic="true">
  {opponentName} is still playing Round {roundNumber}
</div>
```

---

## State 4: Next Round Ready (NEW)

### Purpose
Celebrate round completion, show comparative results, and provide clear path to continue.

### Visual Design

#### Layout Structure
```
┌─────────────────────────────────────┐
│       Round 1 Complete! 🎉         │ ← Celebratory Header
├─────────────────────────────────────┤
│                                     │
│   ┌───────────────────────────┐    │
│   │   You    vs   Sarah       │    │ ← Head-to-Head
│   │    3          4           │    │   Comparison
│   │   ★★★☆☆      ★★★★☆        │    │
│   └───────────────────────────┘    │
│                                     │
│   ┌───────────────────────────┐    │
│   │  Sarah leads by 1 point!  │    │ ← Status Message
│   └───────────────────────────┘    │
│                                     │
│   ┌───────────────────────────┐    │
│   │  Overall Standings        │    │ ← Running Total
│   │                           │    │
│   │  You: 3                   │    │
│   │  Sarah: 4                 │    │
│   │                           │    │
│   │  2 rounds to go!          │    │
│   └───────────────────────────┘    │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  [Start Round 2] ➜        │  │ ← Primary CTA
│  └──────────────────────────────┘  │
│                                     │
│  Auto-starting in 5s...             │ ← Auto-advance
│                                     │
│  [Review Answers] (link)            │ ← Secondary Action
│                                     │
└─────────────────────────────────────┘
```

### Component Specifications

#### Header Animation
```tsx
<div className="text-center py-6 px-4 bg-gradient-to-r from-purple-500 to-pink-500">
  <h1 className="text-3xl font-bold text-white mb-2 animate-bounce-in">
    Round {roundNumber} Complete!
    <span className="inline-block animate-spin-slow ml-2">🎉</span>
  </h1>
  <p className="text-purple-100">
    Both players submitted
  </p>
</div>
```

#### Head-to-Head Comparison
```tsx
<div className="mx-4 my-6 bg-white rounded-2xl border-2 border-gray-200
                shadow-lg p-6">
  <div className="grid grid-cols-2 gap-8">
    {/* User */}
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-2">You</p>
      <div className={cn(
        "text-5xl font-bold mb-2",
        userScore > opponentScore ? "text-green-600" :
        userScore < opponentScore ? "text-red-600" : "text-gray-900"
      )}>
        {userScore}
      </div>
      <div className="flex justify-center gap-1">
        {renderStars(userScore, totalQuestions)}
      </div>
    </div>

    {/* VS Divider */}
    <div className="col-span-full flex items-center justify-center -my-3">
      <div className="bg-gray-100 px-4 py-1 rounded-full">
        <span className="text-sm font-bold text-gray-500">VS</span>
      </div>
    </div>

    {/* Opponent */}
    <div className="text-center">
      <p className="text-sm text-gray-600 mb-2">{opponentName}</p>
      <div className={cn(
        "text-5xl font-bold mb-2",
        opponentScore > userScore ? "text-green-600" :
        opponentScore < userScore ? "text-red-600" : "text-gray-900"
      )}>
        {opponentScore}
      </div>
      <div className="flex justify-center gap-1">
        {renderStars(opponentScore, totalQuestions)}
      </div>
    </div>
  </div>

  {/* Winner/Status Banner */}
  <div className="mt-6 pt-6 border-t-2 border-gray-200">
    {userScore > opponentScore && (
      <div className="bg-green-50 border-2 border-green-300 rounded-lg p-3 text-center">
        <p className="text-green-800 font-semibold flex items-center justify-center gap-2">
          <Trophy className="w-5 h-5" />
          You won this round!
        </p>
      </div>
    )}
    {opponentScore > userScore && (
      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-3 text-center">
        <p className="text-amber-800 font-semibold flex items-center justify-center gap-2">
          <Swords className="w-5 h-5" />
          {opponentName} won this round
        </p>
      </div>
    )}
    {userScore === opponentScore && (
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 text-center">
        <p className="text-blue-800 font-semibold">
          Round tied!
        </p>
      </div>
    )}
  </div>
</div>
```

#### Overall Standings
```tsx
<div className="mx-4 mb-6 bg-gradient-to-r from-purple-50 to-blue-50
                rounded-xl border-2 border-purple-200 p-5">
  <h3 className="text-sm font-semibold text-gray-700 mb-4 text-center">
    Overall Battle Standings
  </h3>

  <div className="flex items-center justify-between mb-4">
    <div className="flex-1 text-center">
      <p className="text-xs text-gray-600 mb-1">You</p>
      <p className="text-3xl font-bold text-gray-900">{userTotalScore}</p>
    </div>

    <div className="px-4">
      <div className="h-12 w-px bg-gray-300" />
    </div>

    <div className="flex-1 text-center">
      <p className="text-xs text-gray-600 mb-1">{opponentName}</p>
      <p className="text-3xl font-bold text-gray-900">{opponentTotalScore}</p>
    </div>
  </div>

  {/* Lead Indicator */}
  {scoreDifference !== 0 && (
    <div className="text-center text-sm text-gray-600">
      {userTotalScore > opponentTotalScore ? 'You lead' : `${opponentName} leads`} by{' '}
      <span className="font-bold text-purple-700">{Math.abs(scoreDifference)}</span>
      {Math.abs(scoreDifference) === 1 ? ' point' : ' points'}
    </div>
  )}

  {/* Remaining Rounds */}
  <div className="mt-4 pt-4 border-t border-purple-200 text-center">
    <p className="text-xs text-gray-600">
      {remainingRounds} round{remainingRounds !== 1 ? 's' : ''} remaining • Best of {totalRounds}
    </p>
  </div>
</div>
```

#### Primary CTA
```tsx
<div className="px-4 mb-4">
  <button
    onClick={handleStartNextRound}
    className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 to-pink-600
               text-white rounded-xl font-bold text-lg shadow-lg
               hover:shadow-xl transform hover:scale-[1.02]
               active:scale-[0.98] transition-all
               flex items-center justify-center gap-3"
  >
    Start Round {nextRoundNumber}
    <ChevronRight className="w-6 h-6" />
  </button>
</div>

{/* Auto-advance Timer */}
<div className="text-center mb-4">
  <p className="text-sm text-gray-500">
    Auto-starting in{' '}
    <span className="font-bold text-purple-600">{countdown}s</span>
  </p>

  {/* Optional: Progress bar */}
  <div className="max-w-xs mx-auto mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
    <div
      className="h-full bg-purple-600 transition-all duration-1000"
      style={{ width: `${(countdown / 5) * 100}%` }}
    />
  </div>
</div>
```

#### Secondary Action
```tsx
<div className="px-4 pb-6">
  <button
    onClick={() => setState('roundResults')}
    className="w-full py-3 px-4 border-2 border-gray-300 text-gray-700
               rounded-xl font-medium hover:bg-gray-50 transition-colors
               flex items-center justify-center gap-2"
  >
    <FileText className="w-5 h-5" />
    Review All Answers
  </button>
</div>
```

### Auto-Advance Behavior

**Countdown Timer:**
- Starts at 5 seconds
- Updates every 1 second
- Visual countdown + progress bar
- User can click "Start Round" to skip countdown
- On 0: Automatically call `handleStartNextRound()`

**Implementation:**
```tsx
const [countdown, setCountdown] = useState(5);

useEffect(() => {
  if (state !== 'ready') return;

  const timer = setInterval(() => {
    setCountdown((prev) => {
      if (prev <= 1) {
        clearInterval(timer);
        handleStartNextRound();
        return 0;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, [state]);
```

### Accessibility

**Screen Reader:**
```
"Round 1 complete. Your score: 3 out of 5. Sarah's score: 4 out of 5. Sarah leads by 1 point. Overall: You 3, Sarah 4. Auto-starting Round 2 in 5 seconds."
```

**Keyboard Navigation:**
- Auto-focus on "Start Round 2" button
- Tab order: Start → Review → (other elements)
- Spacebar/Enter to activate buttons

---

## State 5: Round Results Review (EXISTING - Enhancements)

### Purpose
Allow users to deeply review all questions, answers, and explanations.

### Enhancements Needed

**Current Implementation:** Good foundation (BattleRoundResults.tsx)

**Recommended Improvements:**

1. **Mobile Optimization:**
   - Reduce font sizes slightly for mobile
   - Ensure question cards stack properly
   - Make expand/collapse more obvious

2. **Performance Stats:**
   - Add topic breakdown: "Biology: 2/3, Chemistry: 1/2"
   - Show time taken (if available)

3. **Navigation:**
   - Add "Back to Battle" button to return to 'ready' state
   - Breadcrumb: "Battle > Round 1 Results"

4. **Comparison:**
   - Show opponent's answers side-by-side (optional toggle)
   - Highlight questions where both got it wrong/right

**Example Enhancement:**
```tsx
{/* Topic Performance */}
<div className="mb-4 p-4 bg-blue-50 rounded-lg">
  <h4 className="text-sm font-semibold text-gray-700 mb-2">
    Topic Performance
  </h4>
  <div className="space-y-1">
    {topicStats.map(topic => (
      <div key={topic.name} className="flex justify-between text-sm">
        <span className="text-gray-600">{topic.name}</span>
        <span className="font-medium">
          {topic.correct}/{topic.total} ({topic.percentage}%)
        </span>
      </div>
    ))}
  </div>
</div>
```

---

## 4. Component Architecture Recommendation

### Recommended Structure: Hybrid Approach

**Why Hybrid:**
- Keeps BattleArena as state manager (existing pattern)
- Creates focused components for new states
- Minimizes refactoring of existing code
- Clear separation of concerns

### Component Hierarchy
```
BattleArena (State Machine)
├── BattleQuestionView (existing - no changes)
├── BattleImmediateResults (NEW)
│   ├── ScoreCard
│   ├── QuestionReviewList
│   └── LoadingFooter
├── WaitingForOpponent (ENHANCED - currently inline)
│   ├── WaitingAnimation
│   ├── PerformanceCard
│   └── BattleStandings
├── BattleNextRoundReady (NEW)
│   ├── HeadToHeadComparison
│   ├── OverallStandings
│   ├── StartRoundButton
│   └── ReviewAnswersButton
├── BattleRoundResults (existing - minor enhancements)
└── BattleResults (existing - no changes)
```

### Updated State Machine in BattleArena

```tsx
type BattleState =
  | 'loading'
  | 'answering'      // Playing round
  | 'results'        // NEW: Immediate results after submit
  | 'waiting'        // Waiting for opponent
  | 'ready'          // NEW: Next round ready
  | 'roundResults'   // Detailed review
  | 'battleComplete' // Final results

// State Variables
const [state, setState] = useState<BattleState>('loading');
const [showDetailedResults, setShowDetailedResults] = useState(false);
const [countdown, setCountdown] = useState(5);
```

### Flow Logic
```tsx
const handleSubmitRound = async () => {
  // ... existing validation ...

  const response = await fetch(`/api/battles/${battleId}/submit-round`, {
    method: 'POST',
    body: JSON.stringify({ roundNumber, answers, timeTaken })
  });

  const data = await response.json();

  // NEW: Immediately show results
  setState('results');

  // Store submission data for results view
  setLastSubmission({
    score: data.score,
    correctCount: data.correctCount,
    incorrectCount: data.incorrectCount,
    topicPerformance: data.topicPerformance
  });

  // After 2 seconds, check opponent status
  setTimeout(() => {
    if (data.bothSubmitted) {
      setState('ready'); // Both submitted → Ready state
    } else {
      setState('waiting'); // Still waiting → Waiting state
    }
  }, 2000);
};
```

### Render Logic
```tsx
return (
  <div className="min-h-screen bg-gray-50">
    {/* Header (shared across states) */}
    <BattleHeader
      battle={battle}
      opponent={opponent}
      state={state}
    />

    {/* State-based Content */}
    {state === 'loading' && <LoadingView />}

    {state === 'answering' && (
      <BattleQuestionView
        questions={currentRound.questions}
        answers={currentAnswers}
        onAnswerSelect={handleAnswerSelect}
        onSubmit={handleSubmitRound}
        submitting={submitting}
      />
    )}

    {state === 'results' && (
      <BattleImmediateResults
        roundNumber={battle.current_round}
        score={lastSubmission.score}
        totalQuestions={currentRound.questions.length}
        questions={currentRound.questions}
        userAnswers={currentAnswers}
        topicPerformance={lastSubmission.topicPerformance}
      />
    )}

    {state === 'waiting' && (
      <WaitingForOpponent
        opponentName={opponent.full_name}
        roundNumber={battle.current_round}
        userScore={lastSubmission.score}
        totalQuestions={currentRound.questions.length}
        userTotalScore={userCumulativeScore}
        remainingRounds={battle.total_rounds - battle.current_round}
        questions={currentRound.questions}
        userAnswers={currentAnswers}
      />
    )}

    {state === 'ready' && (
      <BattleNextRoundReady
        roundNumber={battle.current_round}
        nextRoundNumber={battle.current_round + 1}
        userScore={currentRound.userScore}
        opponentScore={currentRound.opponentScore}
        opponentName={opponent.full_name}
        userTotalScore={userCumulativeScore}
        opponentTotalScore={opponentCumulativeScore}
        remainingRounds={battle.total_rounds - battle.current_round}
        totalRounds={battle.total_rounds}
        onStartNextRound={handleNextRound}
        onReviewAnswers={() => setState('roundResults')}
      />
    )}

    {state === 'roundResults' && (
      <BattleRoundResults
        {...existingProps}
        onBackToBattle={() => setState('ready')}
      />
    )}

    {state === 'battleComplete' && (
      <BattleResults {...existingProps} />
    )}
  </div>
);
```

---

## 5. API Interaction Pattern

### Current API Endpoints (Analysis)

**`POST /api/battles/[battleId]/submit-round`**
- ✅ Already returns: `score`, `correctCount`, `incorrectCount`, `topicPerformance`
- ✅ Already returns: `bothSubmitted` boolean
- ✅ Already returns: `opponentScore` (if both submitted)
- ✅ Already generates next round automatically
- **No changes needed**

**`GET /api/battles/[battleId]`**
- ✅ Returns enriched rounds with `bothSubmitted`, `userScore`, `opponentScore`
- ✅ Returns current round status
- **No changes needed**

### Interaction Flow

**1. Submit Round:**
```tsx
// User clicks "Submit Round"
const response = await fetch(`/api/battles/${battleId}/submit-round`, {
  method: 'POST',
  body: JSON.stringify({
    roundNumber: currentRound,
    answers: userAnswers,
    timeTaken: timeInSeconds
  })
});

const data = await response.json();
// {
//   success: true,
//   score: 3,
//   correctCount: 3,
//   incorrectCount: 2,
//   topicPerformance: { Biology: { correct: 2, total: 3, percentage: 66.67 } },
//   bothSubmitted: false
// }

// Show immediate results
setState('results');
setLastSubmission(data);

// After 2s, transition to waiting or ready
setTimeout(() => {
  setState(data.bothSubmitted ? 'ready' : 'waiting');
}, 2000);
```

**2. Poll for Opponent (if waiting):**
```tsx
// In 'waiting' state, poll every 3-5 seconds
const checkOpponentStatus = async () => {
  const response = await fetch(`/api/battles/${battleId}`);
  const data = await response.json();

  const currentRound = data.rounds.find(
    r => r.round_number === battle.current_round
  );

  if (currentRound.bothSubmitted) {
    // Opponent finished!
    setState('ready');
    fetchBattle(); // Refresh full battle data
  }
};

// Poll every 3 seconds
const interval = setInterval(checkOpponentStatus, 3000);
```

**3. Start Next Round:**
```tsx
// User clicks "Start Round 2"
// No API call needed - just transition state
setState('answering');
setCurrentRound(currentRound + 1);
setCurrentAnswers({});
fetchBattle(); // Refresh to get next round's questions
```

### Real-time Enhancement (Optional)

**Supabase Realtime Subscription:**
```tsx
useEffect(() => {
  if (state !== 'waiting') return;

  const subscription = supabase
    .channel(`battle:${battleId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'battle_participants',
        filter: `battle_id=eq.${battleId}`
      },
      (payload) => {
        // Opponent submitted!
        if (payload.new.round_number === battle.current_round) {
          setState('ready');
          fetchBattle();
        }
      }
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}, [state, battleId, battle.current_round]);
```

**Recommendation:** Implement polling first (simpler), add Realtime as enhancement.

---

## 6. State Management Approach

### Required State Variables

```tsx
// In BattleArena component
interface BattleArenaState {
  // Existing
  battle: Battle | null;
  state: BattleState;
  currentAnswers: Record<string, string>;
  submitting: boolean;
  pollInterval: NodeJS.Timeout | null;
  roundStartTime: number;

  // NEW
  lastSubmission: {
    score: number;
    correctCount: number;
    incorrectCount: number;
    topicPerformance: Record<string, TopicStats>;
  } | null;

  countdown: number; // For auto-advance in 'ready' state
  showDetailedAnswers: boolean; // For expandable sections
}
```

### State Transitions

```tsx
// State Machine Logic
const transitionTo = (newState: BattleState, data?: any) => {
  console.log(`[Battle] ${state} → ${newState}`);

  // Cleanup on exit
  switch (state) {
    case 'waiting':
      // Clear polling interval
      if (pollInterval) clearInterval(pollInterval);
      break;
    case 'ready':
      // Clear countdown
      setCountdown(5);
      break;
  }

  // Setup on entry
  switch (newState) {
    case 'results':
      // Store submission data
      if (data) setLastSubmission(data);
      // Auto-transition after 2s
      setTimeout(() => {
        transitionTo(data.bothSubmitted ? 'ready' : 'waiting');
      }, 2000);
      break;

    case 'waiting':
      // Start polling
      startPolling();
      break;

    case 'ready':
      // Start countdown
      startCountdown();
      break;

    case 'answering':
      // Reset answers
      setCurrentAnswers({});
      setRoundStartTime(Date.now());
      break;
  }

  setState(newState);
};
```

---

## 7. User Feedback at Each Step

### Loading States

**Initial Load:**
```tsx
<Loader2 className="animate-spin" />
<p>Loading battle arena...</p>
```

**Submitting Round:**
```tsx
<button disabled>
  <Loader2 className="animate-spin" />
  Submitting answers...
</button>
```

**Checking Opponent:**
```tsx
<Loader2 className="animate-spin" />
<p>Checking opponent status...</p>
```

### Success States

**Submission Success:**
```tsx
toast.success('Round submitted!', {
  description: `You scored ${score} out of ${total}`,
  duration: 3000
});
```

**Round Won:**
```tsx
<div className="bg-green-50 border-green-300">
  <Trophy className="text-green-600" />
  <p>You won this round!</p>
</div>
```

**Opponent Finished:**
```tsx
toast.info(`${opponentName} finished!`, {
  description: 'Moving to next round...',
  duration: 2000
});
```

### Error States

**Network Error:**
```tsx
<div className="bg-red-50 border-red-300 rounded-lg p-4">
  <AlertCircle className="text-red-600" />
  <p className="text-red-800 font-medium">Connection lost</p>
  <p className="text-red-700 text-sm">
    Check your internet connection
  </p>
  <button onClick={retrySubmit}>Retry</button>
</div>
```

**Timeout Error:**
```tsx
toast.error('Request timeout', {
  description: 'Taking longer than expected. Please wait...',
  action: {
    label: 'Retry',
    onClick: () => retrySubmit()
  }
});
```

**Already Submitted Error:**
```tsx
toast.warning('Already submitted', {
  description: 'You\'ve already submitted this round',
  duration: 4000
});
```

### Empty States

**No Questions:**
```tsx
<div className="text-center p-8">
  <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
  <p className="text-gray-600">No questions available</p>
  <button onClick={fetchBattle}>Refresh</button>
</div>
```

---

## 8. Edge Cases & Error Handling

### Edge Case 1: Network Failure During Submit

**Scenario:** User submits answers, request fails

**Handling:**
```tsx
try {
  const response = await fetch('/api/battles/submit', { ... });
  if (!response.ok) throw new Error('Network error');
  // ... success flow
} catch (error) {
  setState('answering'); // Revert to answering state
  toast.error('Submission failed', {
    description: 'Your answers were not submitted. Please try again.',
    action: {
      label: 'Retry',
      onClick: handleSubmitRound
    }
  });

  // Optionally: Store answers locally
  localStorage.setItem(`battle_${battleId}_round_${round}_backup`,
    JSON.stringify(currentAnswers)
  );
}
```

### Edge Case 2: Opponent Disconnects/Abandons

**Scenario:** User waiting, opponent never submits

**Handling:**
- After 5 minutes of waiting: Show forfeit option
- After 10 minutes: Auto-forfeit opponent (award win)

```tsx
useEffect(() => {
  if (state !== 'waiting') return;

  const waitTime = Date.now() - submissionTime;

  if (waitTime > 5 * 60 * 1000) { // 5 minutes
    setShowForfeitOption(true);
  }

  if (waitTime > 10 * 60 * 1000) { // 10 minutes
    // Auto-forfeit opponent
    handleOpponentForfeit();
  }
}, [state, submissionTime]);

// UI
{showForfeitOption && (
  <div className="mx-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
    <p className="text-yellow-800 text-sm mb-2">
      {opponentName} hasn't responded in 5 minutes
    </p>
    <button onClick={handleClaimForfeit}>
      Claim Forfeit & Win Battle
    </button>
  </div>
)}
```

### Edge Case 3: Rapid State Changes (Race Condition)

**Scenario:** Opponent submits while user viewing results

**Handling:**
```tsx
// Use ref to track current state
const stateRef = useRef(state);
useEffect(() => { stateRef.current = state; }, [state]);

const handleTransition = (newState: BattleState) => {
  // Ignore stale transitions
  if (stateRef.current !== state) {
    console.warn('Ignoring stale transition');
    return;
  }
  setState(newState);
};
```

### Edge Case 4: Page Refresh Mid-Battle

**Scenario:** User refreshes browser during battle

**Handling:**
```tsx
// On component mount
useEffect(() => {
  fetchBattle().then(data => {
    // Reconstruct state from server data
    const currentRound = data.rounds[data.currentRound - 1];

    if (data.battle.status === 'completed') {
      setState('battleComplete');
    } else if (currentRound.bothSubmitted) {
      setState('ready');
    } else if (currentRound.userSubmitted) {
      setState('waiting');
    } else {
      setState('answering');
    }
  });
}, []);
```

### Edge Case 5: Stale Data After Polling

**Scenario:** Polling returns old data, opponent actually finished

**Handling:**
```tsx
// Add timestamp validation
const fetchBattleStatus = async () => {
  const response = await fetch(`/api/battles/${battleId}?t=${Date.now()}`);
  const data = await response.json();

  // Validate data freshness
  if (data.battle.updated_at < lastKnownUpdate) {
    console.warn('Stale data, retrying...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    return fetchBattleStatus();
  }

  return data;
};
```

### Edge Case 6: Both Players Submit Simultaneously

**Scenario:** Both players submit within same second

**Handling:**
- API handles this correctly (database constraint prevents double-insert)
- Client receives `bothSubmitted: true`
- Both clients transition to 'ready' state
- No special handling needed (server-side is authoritative)

### Edge Case 7: Last Round Completion

**Scenario:** User submits final round (Round 3)

**Handling:**
```tsx
if (data.battleComplete) {
  // Skip 'ready' state, go straight to final results
  setState('battleComplete');

  // Show different message
  toast.success('Battle Complete!', {
    description: data.userWon
      ? 'Congratulations! You won!'
      : data.isDraw
      ? 'It\'s a draw!'
      : `${opponentName} won this time`,
    duration: 5000
  });
}
```

---

## 9. Performance Considerations

### Minimize Re-renders

**Memoize Expensive Components:**
```tsx
const BattleImmediateResults = memo(({ ... }) => {
  // Component logic
}, (prev, next) => {
  // Only re-render if score or questions change
  return prev.score === next.score &&
         prev.questions.length === next.questions.length;
});
```

### Optimize Polling

**Exponential Backoff:**
```tsx
let pollInterval = 3000; // Start at 3s
let pollCount = 0;

const poll = () => {
  fetchBattleStatus();
  pollCount++;

  // Increase interval after 10 attempts
  if (pollCount > 10) {
    pollInterval = Math.min(pollInterval * 1.5, 10000); // Max 10s
  }

  setTimeout(poll, pollInterval);
};
```

### Lazy Load Components

```tsx
const BattleRoundResults = lazy(() =>
  import('./BattleRoundResults')
);

// In render
<Suspense fallback={<LoadingSpinner />}>
  {state === 'roundResults' && <BattleRoundResults />}
</Suspense>
```

### Prefetch Next Round Data

```tsx
// While in 'ready' state, prefetch next round
useEffect(() => {
  if (state === 'ready' && battle.current_round < battle.total_rounds) {
    // Warm up cache
    fetch(`/api/battles/${battleId}`).catch(() => {});
  }
}, [state]);
```

---

## 10. Accessibility Checklist

### Screen Reader Support

- ✅ All images have alt text
- ✅ ARIA labels on icon-only buttons
- ✅ Live regions for status updates
- ✅ Proper heading hierarchy (h1 → h2 → h3)
- ✅ Form labels associated with inputs

### Keyboard Navigation

- ✅ All interactive elements focusable
- ✅ Logical tab order
- ✅ Focus visible (outline)
- ✅ Enter/Space to activate buttons
- ✅ Escape to dismiss modals

### Color Contrast

- ✅ Text: Minimum 4.5:1 ratio
- ✅ Large text: Minimum 3:1 ratio
- ✅ Icons: Minimum 3:1 ratio
- ✅ Don't rely on color alone (use icons + text)

### Touch Targets

- ✅ Minimum 44x44px tap area
- ✅ Adequate spacing (8px minimum)
- ✅ No overlapping targets

### Motion & Animation

- ✅ Respect `prefers-reduced-motion`
```tsx
const prefersReducedMotion = useMediaQuery(
  '(prefers-reduced-motion: reduce)'
);

<div className={prefersReducedMotion ? '' : 'animate-bounce'}>
```

---

## 11. Testing Scenarios

### Unit Tests

**State Transitions:**
```tsx
describe('BattleArena State Machine', () => {
  it('transitions from answering to results after submit', async () => {
    const { result } = renderHook(() => useBattleState());

    await act(async () => {
      await result.current.submitRound();
    });

    expect(result.current.state).toBe('results');
  });

  it('transitions to waiting if opponent not finished', async () => {
    mockAPI.submitRound.mockResolvedValue({ bothSubmitted: false });

    const { result } = renderHook(() => useBattleState());
    await act(async () => {
      await result.current.submitRound();
    });

    // Wait for auto-transition
    await waitFor(() => {
      expect(result.current.state).toBe('waiting');
    }, { timeout: 3000 });
  });
});
```

### Integration Tests

**Complete Round Flow:**
```tsx
it('completes full round flow: play → results → waiting → ready → next round', async () => {
  render(<BattleArena battleId="test-123" />);

  // Answer questions
  fireEvent.click(screen.getByText('Option A'));
  // ... answer all 5

  // Submit
  fireEvent.click(screen.getByText('Submit Round'));

  // Should show results
  await waitFor(() => {
    expect(screen.getByText(/Your Score: \d\/5/)).toBeInTheDocument();
  });

  // Mock opponent finishing
  mockAPI.getBattle.mockResolvedValue({
    rounds: [{ bothSubmitted: true, userScore: 3, opponentScore: 4 }]
  });

  // Should auto-transition to ready
  await waitFor(() => {
    expect(screen.getByText('Start Round 2')).toBeInTheDocument();
  }, { timeout: 5000 });

  // Start next round
  fireEvent.click(screen.getByText('Start Round 2'));

  // Should show questions
  expect(screen.getByText('Question 1 of 5')).toBeInTheDocument();
});
```

### E2E Tests (Playwright)

**Two-Player Battle:**
```ts
test('two players complete a round', async ({ browser }) => {
  const context1 = await browser.newContext();
  const context2 = await browser.newContext();

  const page1 = await context1.newPage();
  const page2 = await context2.newPage();

  // Player 1: Login and start battle
  await page1.goto('/battles/test-battle');
  await page1.click('text=Option A');
  await page1.click('text=Submit Round');
  await page1.waitForSelector('text=Waiting for');

  // Player 2: Join and submit
  await page2.goto('/battles/test-battle');
  await page2.click('text=Option B');
  await page2.click('text=Submit Round');

  // Both should see "Next Round Ready"
  await page1.waitForSelector('text=Start Round 2');
  await page2.waitForSelector('text=Start Round 2');
});
```

---

## 12. Mobile Optimization

### Responsive Breakpoints

```tsx
// Tailwind config
screens: {
  'xs': '375px',  // iPhone SE
  'sm': '640px',  // Standard mobile
  'md': '768px',  // Tablets
  'lg': '1024px', // Desktop
}
```

### Touch Gestures

**Swipe to Dismiss Results:**
```tsx
const handleSwipe = useSwipe({
  onSwipeUp: () => {
    // Skip to next state faster
    if (state === 'results') transitionTo('waiting');
  }
});

<div {...handleSwipe}>
  <BattleImmediateResults />
</div>
```

**Pull to Refresh (Waiting State):**
```tsx
const handlePullToRefresh = usePullToRefresh({
  onRefresh: async () => {
    await fetchBattleStatus();
  }
});
```

### Viewport Optimization

**Prevent Zoom on Input Focus:**
```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
```

**Safe Area Padding:**
```tsx
<div className="pb-safe"> {/* iOS safe area */}
  <BattleFooter />
</div>
```

### Performance

**Reduce Animations on Low-End Devices:**
```tsx
const isLowEndDevice = useMemo(() => {
  return navigator.hardwareConcurrency <= 2 ||
         navigator.deviceMemory <= 2;
}, []);

<div className={isLowEndDevice ? '' : 'animate-bounce'}>
```

---

## 13. Implementation Checklist

### Phase 1: Core Flow (Priority 1)
- [ ] Create `BattleImmediateResults` component
- [ ] Add 'results' state to BattleArena
- [ ] Update `handleSubmitRound` to show results first
- [ ] Add auto-transition logic (results → waiting/ready)
- [ ] Store `lastSubmission` data in state
- [ ] Test: Submit → See results → Auto-transition

### Phase 2: Enhanced Waiting (Priority 1)
- [ ] Create `WaitingForOpponent` component
- [ ] Extract inline waiting view to new component
- [ ] Add performance card (read-only score)
- [ ] Add battle standings card
- [ ] Add optional "Review Answers" expansion
- [ ] Improve polling logic (3s → 5s backoff)
- [ ] Test: Submit → Results → Waiting → Poll

### Phase 3: Next Round Ready (Priority 1)
- [ ] Create `BattleNextRoundReady` component
- [ ] Add 'ready' state to state machine
- [ ] Build head-to-head comparison UI
- [ ] Build overall standings card
- [ ] Implement countdown timer (5s auto-advance)
- [ ] Add "Start Round X" button
- [ ] Add "Review Answers" button → roundResults
- [ ] Test: Both submit → Ready → Auto-advance

### Phase 4: Polish & UX (Priority 2)
- [ ] Add animations (score counter, stars, transitions)
- [ ] Add haptic feedback (mobile vibration)
- [ ] Add sound effects (optional, with mute toggle)
- [ ] Improve loading states (skeleton screens)
- [ ] Add toast notifications
- [ ] Test: Complete flow feels smooth

### Phase 5: Error Handling (Priority 2)
- [ ] Handle network errors during submit
- [ ] Handle opponent disconnect (forfeit after 10min)
- [ ] Handle stale data in polling
- [ ] Handle page refresh mid-battle
- [ ] Add retry mechanisms
- [ ] Test: All error scenarios

### Phase 6: Accessibility (Priority 2)
- [ ] Add ARIA labels and live regions
- [ ] Test keyboard navigation
- [ ] Test screen reader (VoiceOver/TalkBack)
- [ ] Verify color contrast (WCAG AA)
- [ ] Add focus management
- [ ] Test with reduced motion preference

### Phase 7: Performance (Priority 3)
- [ ] Memoize components
- [ ] Optimize polling (exponential backoff)
- [ ] Add Suspense for lazy loading
- [ ] Prefetch next round data
- [ ] Test on low-end devices

### Phase 8: Real-time (Priority 3 - Optional)
- [ ] Implement Supabase Realtime subscription
- [ ] Add fallback to polling if Realtime fails
- [ ] Test hybrid polling + Realtime
- [ ] Measure latency improvement

---

## 14. Success Metrics

### User Experience
- ✅ Users see immediate feedback within 200ms of submit
- ✅ Waiting state clearly indicates opponent status
- ✅ Auto-advance reduces clicks by 50%
- ✅ Zero confusion about "why am I seeing same questions"

### Performance
- ✅ State transitions under 100ms
- ✅ Polling overhead under 1KB per request
- ✅ Component render time under 16ms (60fps)
- ✅ Page load under 2s on 3G

### Engagement
- ✅ Battle completion rate increases by 30%
- ✅ Average time-to-next-round under 10s
- ✅ Opponent wait time feels acceptable
- ✅ Users report satisfaction with flow

---

## 15. Future Enhancements

### V1.1: Rich Feedback
- Confetti animation on round win
- Personalized encouragement messages
- Streak tracking ("3 rounds in a row!")
- Achievement badges

### V1.2: Social Features
- Share round results to friends
- Spectator mode (watch battle in real-time)
- Battle replay viewer
- Leaderboards

### V1.3: Advanced UX
- Voice announcements (optional)
- Dark mode optimizations
- Gesture controls (swipe between states)
- Offline mode (save progress, sync later)

---

## Appendix A: File Structure

```
/components/battles/
├── BattleArena.tsx (main state machine - UPDATE)
├── BattleQuestionView.tsx (existing - no changes)
├── BattleImmediateResults.tsx (NEW)
├── WaitingForOpponent.tsx (NEW)
├── BattleNextRoundReady.tsx (NEW)
├── BattleRoundResults.tsx (existing - minor updates)
├── BattleResults.tsx (existing - no changes)
└── battle-utils.ts (shared helpers)

/lib/battles/
├── types.ts (TypeScript interfaces)
├── state-machine.ts (state transition logic)
└── polling.ts (polling utilities)
```

---

## Appendix B: Type Definitions

```typescript
// types.ts
export type BattleState =
  | 'loading'
  | 'answering'
  | 'results'
  | 'waiting'
  | 'ready'
  | 'roundResults'
  | 'battleComplete';

export interface LastSubmission {
  score: number;
  correctCount: number;
  incorrectCount: number;
  topicPerformance: Record<string, TopicStats>;
  timestamp: number;
}

export interface TopicStats {
  correct: number;
  total: number;
  percentage: number;
}

export interface BattleStateData {
  state: BattleState;
  battle: Battle | null;
  currentAnswers: Record<string, string>;
  lastSubmission: LastSubmission | null;
  countdown: number;
  showDetailedAnswers: boolean;
}
```

---

## Document Changelog

**v1.0 - 2025-10-20**
- Initial UX specification
- Defined 5 states: answering, results, waiting, ready, roundResults
- Created detailed wireframes and component specs
- Established polling strategy and API patterns
- Documented edge cases and error handling
- Created implementation checklist

---

**END OF SPECIFICATION**

This specification is ready for handoff to the implementation team. All states, transitions, components, and edge cases are documented with mobile-first design principles at the core.
