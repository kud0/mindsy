# Distributed Quest System

## 🎯 Overview

The quest system has been **redesigned from a centralized 3-quest widget to a distributed model** where each quest appears in its contextually relevant widget:

- **🍅 Pomodoro Quest** → Lives in Pomodoro Widget
- **📚 Exam Quest** → Lives in Exam Widget
- **⚔️ Social Quest** → Lives in Social Widget

This creates a **more cohesive user experience** where quests are actionable within the context they belong to.

---

## 📐 System Architecture

### Before (Centralized)
```
┌─────────────────────────────┐
│  Profile Widget             │
│  ┌────────────────────────┐ │
│  │ Quest 1: Pomodoro      │ │
│  │ Quest 2: Exam          │ │
│  │ Quest 3: Social        │ │
│  │ Bonus: +200 XP         │ │
│  └────────────────────────┘ │
└─────────────────────────────┘
```

### After (Distributed)
```
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Pomodoro Widget  │  │  Exam Widget     │  │  Social Widget   │
│ ┌──────────────┐ │  │ ┌──────────────┐ │  │ ┌──────────────┐ │
│ │Quest: 4 Pomo │ │  │ │Quest: 20 Qs  │ │  │ │Quest: Battle │ │
│ └──────────────┘ │  │ └──────────────┘ │  │ └──────────────┘ │
│ [Timer Display]  │  │ [Exam List]      │  │ [Friends List]   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

---

## 📊 Database Schema (Unchanged)

The database structure remains the same from `migrations/022_create_activity_tracking.sql`:

```sql
CREATE TABLE daily_quests (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  quest_date DATE DEFAULT CURRENT_DATE,

  -- Quest 1: Pomodoro/Focus
  quest1_type TEXT DEFAULT 'pomodoro',
  quest1_target INTEGER DEFAULT 4,
  quest1_current INTEGER DEFAULT 0,
  quest1_completed BOOLEAN DEFAULT FALSE,
  quest1_xp_reward INTEGER DEFAULT 50,

  -- Quest 2: Learning/Exam
  quest2_type TEXT, -- 'questions', 'battle', 'exam', 'quiz'
  quest2_target INTEGER,
  quest2_current INTEGER DEFAULT 0,
  quest2_completed BOOLEAN DEFAULT FALSE,
  quest2_xp_reward INTEGER DEFAULT 75,

  -- Quest 3: Social
  quest3_type TEXT, -- 'battle_win', 'share_content', 'perfect_score'
  quest3_target INTEGER,
  quest3_current INTEGER DEFAULT 0,
  quest3_completed BOOLEAN DEFAULT FALSE,
  quest3_xp_reward INTEGER DEFAULT 100,

  -- Tracking
  all_completed BOOLEAN DEFAULT FALSE,
  bonus_xp_claimed BOOLEAN DEFAULT FALSE,
  bonus_xp_amount INTEGER DEFAULT 200,

  CONSTRAINT unique_user_quest_date UNIQUE (user_id, quest_date)
);
```

**Automatic Quest Generation**: Quests are generated once per day via `generate_daily_quests()` function.

**Automatic Progress Tracking**: Triggers update quest progress when users:
- Complete pomodoros → `quest1_current++`
- Answer questions/take exams → `quest2_current++`
- Win battles/share content → `quest3_current++`

---

## 🔌 API Endpoints

### Fetch Quests

**All Quests (Legacy)**:
```typescript
GET /api/profile/daily-quests

Response:
{
  success: true,
  data: {
    quests: [
      { id: 1, type: 'pomodoro', title: 'Complete 4 Pomodoros', ... },
      { id: 2, type: 'questions', title: 'Answer 20 Questions', ... },
      { id: 3, type: 'battle_win', title: 'Win a Battle', ... }
    ],
    allCompleted: false,
    bonusXP: 200,
    bonusClaimed: false,
    totalXP: 0
  }
}
```

**Individual Quest (New)**:
```typescript
GET /api/profile/daily-quests?questId=1  // Pomodoro quest
GET /api/profile/daily-quests?questId=2  // Exam quest
GET /api/profile/daily-quests?questId=3  // Social quest

Response:
{
  success: true,
  data: {
    quest: {
      id: 1,
      type: 'pomodoro',
      title: 'Complete 4 Pomodoros',
      target: 4,
      current: 2,
      completed: false,
      xpReward: 50,
      icon: '🍅',
      action: '/dashboard/pomodoro',
      actionLabel: 'Start Pomodoro'
    },
    totalEarnedToday: 0,
    allCompleted: false
  }
}
```

---

## 🎨 Quest Components

### 1. PomodoroQuest
**Location**: `components/profile/PomodoroQuest.tsx`
**Theme**: Tomato red/orange 🍅
**Quest Type**: `quest1` - Pomodoro/focus sessions

**Props**:
```typescript
interface PomodoroQuestProps {
  quest: {
    id: number;
    type: string;
    title: string;
    target: number;
    current: number;
    completed: boolean;
    xpReward: number;
  };
  onComplete?: () => void;
}
```

**Features**:
- Compact tomato-themed design
- Progress bar with red→orange gradient
- Mini confetti on completion (100 pieces, 3s)
- Auto-refresh every 30s

**Integration**:
```tsx
import { PomodoroQuest } from '@/components/profile/PomodoroQuest';

// In PomodoroWidget
const [quest, setQuest] = useState(null);

useEffect(() => {
  async function fetchQuest() {
    const res = await fetch('/api/profile/daily-quests?questId=1');
    const { data } = await res.json();
    setQuest(data.quest);
  }
  fetchQuest();
  const interval = setInterval(fetchQuest, 30000); // Poll every 30s
  return () => clearInterval(interval);
}, []);

return (
  <BaseWidget title="Pomodoro">
    <PomodoroQuest quest={quest} />
    {/* Timer display */}
  </BaseWidget>
);
```

---

### 2. ExamQuest
**Location**: `components/profile/ExamQuest.tsx`
**Theme**: Blue/purple academic 📚
**Quest Type**: `quest2` - Questions/exams/quizzes

**Props**:
```typescript
interface ExamQuestProps {
  quest: {
    id: number;
    type: 'questions' | 'exam' | 'quiz';
    title: string;
    target: number;
    current: number;
    completed: boolean;
    xpReward: number;
  };
  onComplete?: () => void;
  autoRefreshInterval?: number; // default 10000ms
}
```

**Features**:
- Academic blue/purple gradient theme
- Progress bar with blue→purple gradient
- Mini confetti on completion (200 pieces, 3s)
- Auto-refresh every 10s (customizable)
- Icon varies by quest type: 📝 (questions), 📋 (exams), 🎯 (quizzes)

**Integration**:
```tsx
import { ExamQuest } from '@/components/profile/ExamQuest';

// In ExamsWidget
const [quest, setQuest] = useState(null);

useEffect(() => {
  async function fetchQuest() {
    const res = await fetch('/api/profile/daily-quests?questId=2');
    const { data } = await res.json();
    setQuest(data.quest);
  }
  fetchQuest();
  const interval = setInterval(fetchQuest, 10000); // Poll every 10s
  return () => clearInterval(interval);
}, []);

return (
  <BaseWidget title="Exams">
    <ExamQuest quest={quest} onComplete={() => refetchExamStats()} />
    {/* Exam list */}
  </BaseWidget>
);
```

---

### 3. SocialQuest
**Location**: `components/profile/SocialQuest.tsx`
**Theme**: Pink/purple social ⚔️
**Quest Type**: `quest3` - Battles/sharing/social

**Props**:
```typescript
interface SocialQuestProps {
  quest: {
    id: number;
    type: 'battle_win' | 'share_content' | 'perfect_score';
    title: string;
    target: number;
    current: number;
    completed: boolean;
    xpReward: number;
    action?: string;      // Route to navigate
    actionLabel?: string; // Button label
  };
  onComplete?: () => void;
  onActionClick?: (action: string) => void;
}
```

**Features**:
- Pink/purple social theme
- Action buttons ("Challenge Friend", "Share Content")
- Mini confetti on completion (150 pieces, 3s)
- Auto-refresh every 30s
- Click actions navigate to relevant pages

**Integration**:
```tsx
import { SocialQuest } from '@/components/profile/SocialQuest';
import { useRouter } from 'next/navigation';

// In SocialWidget
const [quest, setQuest] = useState(null);
const router = useRouter();

useEffect(() => {
  async function fetchQuest() {
    const res = await fetch('/api/profile/daily-quests?questId=3');
    const { data } = await res.json();
    setQuest(data.quest);
  }
  fetchQuest();
  const interval = setInterval(fetchQuest, 30000);
  return () => clearInterval(interval);
}, []);

const handleActionClick = (action: string) => {
  router.push(action);
};

return (
  <BaseWidget title="Social">
    <SocialQuest
      quest={quest}
      onActionClick={handleActionClick}
    />
    {/* Friends list, battles */}
  </BaseWidget>
);
```

---

## 🔄 Quest Lifecycle

### 1. Generation (Daily at Midnight)
```sql
-- Automatic via Supabase cron or first API call of the day
SELECT generate_daily_quests('user_id');
```

**Quest Types Generated**:
- **Quest 1**: Always `pomodoro` (target: 4)
- **Quest 2**: Random from `['questions', 'battle', 'exam']`
- **Quest 3**: Random from `['battle_win', 'share_content', 'perfect_score']`

### 2. Progress Tracking (Automatic via Triggers)

**Pomodoro Completion**:
```sql
-- Trigger: log_pomodoro_activity
-- When: pomodoro_sessions INSERT/UPDATE with was_completed=true
-- Action: Calls update_quest_progress(user_id, 'pomodoro', 1)
```

**Questions Answered**:
```sql
-- Trigger: log_battle_activity
-- When: battle_participants INSERT
-- Action: Calls update_quest_progress(user_id, 'questions', count)
```

**Exam Taken**:
```sql
-- Trigger: log_exam_activity
-- When: exam_attempts UPDATE to status='completed'
-- Action: Calls update_quest_progress(user_id, 'exam', 1)
```

### 3. Completion & XP Award

**Individual Quest Completion**:
```typescript
// When quest.current >= quest.target
daily_quests.quest1_completed = true;

// XP awarded immediately (via trigger)
user_performance.xp_points += quest1_xp_reward;
```

**All Quests Completed**:
```typescript
// When all 3 quests completed
daily_quests.all_completed = true;

// Note: Bonus XP system currently on hold
// (May be re-implemented differently in future)
```

---

## 🎨 Design Guidelines

### Color Themes
| Widget | Primary Color | Gradient | Icon |
|--------|--------------|----------|------|
| Pomodoro | Tomato Red/Orange | `from-red-500 to-orange-500` | 🍅 |
| Exam | Blue/Purple | `from-blue-500 to-purple-500` | 📚 |
| Social | Pink/Purple | `from-pink-500 to-purple-500` | ⚔️ |

### Component Size
- **Height**: 80-100px (compact)
- **Width**: 100% of parent widget
- **Padding**: 12px (p-3)
- **Border**: 2px solid

### Animations
- **Progress bar fill**: 800ms ease-out
- **Confetti duration**: 3s
- **Entrance**: 300ms fade-up
- **Checkmark**: Spring animation

### Accessibility
- ✅ WCAG 2.1 AA contrast
- ✅ Keyboard navigation
- ✅ Screen reader support
- ✅ Focus indicators
- ✅ Reduced motion support

---

## 📱 Placement Recommendations

### Pomodoro Widget
```
┌────────────────────────────┐
│ Pomodoro Widget            │
│ ┌────────────────────────┐ │ ← Quest at top
│ │ 🍅 Quest: 4 Pomodoros  │ │
│ └────────────────────────┘ │
│                            │
│ ┌────────────────────────┐ │
│ │   25:00   [Start]      │ │ ← Timer
│ └────────────────────────┘ │
└────────────────────────────┘
```

### Exam Widget
```
┌────────────────────────────┐
│ Exams Widget               │
│                            │
│ [Exam List...]             │
│                            │
│ ┌────────────────────────┐ │ ← Quest at bottom
│ │ 📚 Quest: 20 Questions │ │
│ └────────────────────────┘ │
└────────────────────────────┘
```

### Social Widget
```
┌────────────────────────────┐
│ Social Widget              │
│ ┌────────────────────────┐ │ ← Quest at top
│ │ ⚔️ Quest: Win Battle   │ │
│ │ [Challenge Friend →]   │ │
│ └────────────────────────┘ │
│                            │
│ [Friends List...]          │
└────────────────────────────┘
```

---

## 🔧 Implementation Checklist

### Pomodoro Widget
- [ ] Import `PomodoroQuest` component
- [ ] Fetch quest data: `GET /api/profile/daily-quests?questId=1`
- [ ] Set up auto-refresh (30s interval)
- [ ] Place component at top or bottom of widget
- [ ] Test quest completion when pomodoro finishes
- [ ] Verify confetti and toast notifications

### Exam Widget
- [ ] Import `ExamQuest` component
- [ ] Fetch quest data: `GET /api/profile/daily-quests?questId=2`
- [ ] Set up auto-refresh (10s interval)
- [ ] Place component at top or bottom of widget
- [ ] Test quest completion after answering questions/exams
- [ ] Verify confetti and toast notifications

### Social Widget
- [ ] Import `SocialQuest` component
- [ ] Fetch quest data: `GET /api/profile/daily-quests?questId=3`
- [ ] Set up auto-refresh (30s interval)
- [ ] Implement `onActionClick` handler (navigate to battles/share)
- [ ] Place component at top or bottom of widget
- [ ] Test quest completion after battle win/share
- [ ] Verify confetti and toast notifications

---

## 🎯 Benefits of Distributed System

### 1. **Contextual Relevance**
- Quests appear where they're actionable
- Users can immediately act on quest goals
- Reduces cognitive load (no context switching)

### 2. **Better UX Flow**
```
Old: See quest in Profile → Navigate to Pomodoro → Complete task
New: See quest in Pomodoro → Complete task immediately
```

### 3. **Widget Cohesion**
- Each widget becomes self-contained
- Quest adds value to widget content
- Encourages feature discovery

### 4. **Flexibility**
- Easy to customize quest per widget
- Can add widget-specific quest actions
- Independent update cycles

### 5. **Performance**
- Smaller API payloads (single quest vs all 3)
- Parallel loading across widgets
- Reduced ProfileWidget complexity

---

## 📖 Related Documentation

- **API Reference**: `app/api/profile/daily-quests/route.ts`
- **Database Schema**: `migrations/022_create_activity_tracking.sql`
- **Component Docs**:
  - `components/profile/PomodoroQuest.tsx`
  - `components/profile/ExamQuest.tsx`
  - `components/profile/SOCIAL_QUEST_README.md`

---

## 🚀 Migration from Old System

If you have existing code using the old centralized DailyQuests component:

### Old Code:
```tsx
// ProfileWidget.tsx
<DailyQuests
  quests={allQuests}
  allCompleted={allCompleted}
  bonusXP={200}
  onClaimBonus={handleClaimBonus}
/>
```

### New Code:
```tsx
// PomodoroWidget.tsx
<PomodoroQuest quest={pomodoroQuest} />

// ExamsWidget.tsx
<ExamQuest quest={examQuest} />

// SocialWidget.tsx
<SocialQuest quest={socialQuest} />
```

**API Changes**:
```typescript
// Old: Fetch all quests
const res = await fetch('/api/profile/daily-quests');
const { quests } = await res.json();

// New: Fetch individual quest
const res = await fetch('/api/profile/daily-quests?questId=1');
const { quest } = await res.json();
```

---

## ✨ Summary

The **Distributed Quest System** improves user experience by placing quests in their contextually relevant widgets. This creates a more cohesive, actionable, and intuitive learning experience while maintaining the same backend infrastructure and automatic progress tracking.

**Key Takeaway**: **Right quest, right place, right time.** ✅
