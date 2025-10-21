# ActivityHeatmap Component

A GitHub-style calendar heatmap component for visualizing user activity over the last 28 days, following the Mindsy Widget Design System.

## Features

- **28-day calendar view** (4 weeks × 7 days)
- **Color-coded intensity levels** based on activity score
- **Interactive tooltips** showing detailed daily breakdown
- **Responsive design** that scales on mobile
- **Dark mode support** with proper color schemes
- **Accessibility compliant** (WCAG 2.1 AA)
- **Keyboard navigation** with Tab + Enter
- **Click handlers** for detailed activity modals

## Installation

The component is already created at `/components/profile/ActivityHeatmap.tsx` and ready to use.

### Dependencies

- `@radix-ui/react-tooltip` (already installed via Shadcn/UI)
- `@/components/ui/tooltip` (Shadcn Tooltip component)
- `@/lib/utils` (cn utility function)

## Usage

### Basic Usage

```tsx
import { ActivityHeatmap } from '@/components/profile/ActivityHeatmap';

function MyComponent() {
  const activityData = [
    {
      date: '2025-10-15',
      pomodoros: 2,
      questions: 15,
      battles: 1,
      exams: 0,
      score: 5,
      intensity: 'medium'
    },
    // ... more days
  ];

  return (
    <ActivityHeatmap
      data={activityData}
      onDayClick={(date) => console.log('Clicked:', date)}
    />
  );
}
```

### Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `data` | `ActivityDay[]` | Yes | Array of activity data for the last 28 days |
| `onDayClick` | `(date: string) => void` | No | Callback when a day is clicked |

### ActivityDay Interface

```typescript
interface ActivityDay {
  date: string;        // ISO format (YYYY-MM-DD)
  pomodoros: number;   // Number of pomodoro sessions
  questions: number;   // Number of questions answered
  battles: number;     // Number of quiz battles
  exams: number;       // Number of exams taken
  score: number;       // Total activity score
  intensity: 'none' | 'low' | 'medium' | 'high';
}
```

## Intensity Levels

The heatmap uses 4 color intensity levels:

| Intensity | Score Range | Color | Description |
|-----------|-------------|-------|-------------|
| `none` | 0 | Gray | No activity |
| `low` | 1-3 | Light Blue | Low activity |
| `medium` | 4-7 | Medium Green | Medium activity |
| `high` | 8+ | Dark Green | High activity |

### Calculating Intensity

```typescript
function calculateIntensity(score: number): 'none' | 'low' | 'medium' | 'high' {
  if (score === 0) return 'none';
  if (score <= 3) return 'low';
  if (score <= 7) return 'medium';
  return 'high';
}
```

### Scoring System (Suggested)

```typescript
const score =
  pomodoros * 2 +           // 2 points per pomodoro
  Math.floor(questions / 5) + // 1 point per 5 questions
  battles * 3 +              // 3 points per battle
  exams * 5;                 // 5 points per exam
```

## Integration Example

### Step 1: Create Database Table

```sql
CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  pomodoros INTEGER DEFAULT 0,
  questions INTEGER DEFAULT 0,
  battles INTEGER DEFAULT 0,
  exams INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX idx_user_activity_user_date ON user_activity(user_id, date);
```

### Step 2: Fetch Activity Data

```typescript
async function fetchActivityData(userId: string): Promise<ActivityDay[]> {
  const supabase = createClient();
  const date28DaysAgo = new Date();
  date28DaysAgo.setDate(date28DaysAgo.getDate() - 28);

  const { data, error } = await supabase
    .from('user_activity')
    .select('date, pomodoros, questions, battles, exams, score')
    .eq('user_id', userId)
    .gte('date', date28DaysAgo.toISOString().split('T')[0])
    .order('date', { ascending: true });

  if (error) throw error;

  return (data || []).map(d => ({
    ...d,
    intensity: calculateIntensity(d.score)
  }));
}
```

### Step 3: Track Activities

```typescript
// Increment activity when user completes actions
async function incrementActivity(
  userId: string,
  activityType: 'pomodoros' | 'questions' | 'battles' | 'exams',
  amount: number
) {
  const today = new Date().toISOString().split('T')[0];
  const supabase = createClient();

  const { data, error } = await supabase
    .from('user_activity')
    .upsert(
      {
        user_id: userId,
        date: today,
        [activityType]: amount
      },
      {
        onConflict: 'user_id,date',
        ignoreDuplicates: false
      }
    );

  if (error) throw error;
  return data;
}
```

### Step 4: Add to Profile Widget

```tsx
import { ActivityHeatmap, ActivityDay } from '@/components/profile/ActivityHeatmap';
import { useState, useEffect } from 'react';

export function ProfileWidget() {
  const [activityData, setActivityData] = useState<ActivityDay[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadActivity = async () => {
      try {
        const data = await fetchActivityData(user.id);
        setActivityData(data);
      } catch (error) {
        console.error('Failed to load activity:', error);
      } finally {
        setLoading(false);
      }
    };

    loadActivity();
  }, [user.id]);

  return (
    <div className="rounded-3xl bg-card p-6">
      {/* Existing profile content */}

      {/* Activity Heatmap */}
      <div className="mt-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ActivityHeatmap
            data={activityData}
            onDayClick={(date) => router.push(`/dashboard/activity/${date}`)}
          />
        )}
      </div>
    </div>
  );
}
```

## Design System Compliance

The ActivityHeatmap follows the Mindsy Widget Design System:

- ✅ **Color Palette**: Uses gray (none), blue (low), green (medium/high)
- ✅ **Spacing**: 2px gap between cells, proper padding
- ✅ **Typography**: 12px labels, hierarchy maintained
- ✅ **Accessibility**: WCAG 2.1 AA compliant, keyboard navigation
- ✅ **Responsive**: Scales properly on mobile (320px+)
- ✅ **Touch Targets**: Proper sizing for mobile (min 44px)
- ✅ **Dark Mode**: Full dark mode support
- ✅ **Interactive States**: Hover, focus, active states

## Accessibility Features

- **Semantic HTML**: Uses `<button>` for interactive elements
- **ARIA Labels**: Each day has descriptive `aria-label`
- **Keyboard Navigation**: Tab to navigate, Enter/Space to click
- **Focus Indicators**: Visible purple ring on focus
- **Screen Reader**: Announces date and activity count
- **Color Contrast**: All colors meet WCAG AA standards

## Customization

### Change Color Scheme

Edit the `INTENSITY_COLORS` object in `ActivityHeatmap.tsx`:

```typescript
const INTENSITY_COLORS = {
  none: {
    bg: 'bg-gray-200 dark:bg-gray-700',
    hover: 'hover:bg-gray-300 dark:hover:bg-gray-600',
    border: 'border-gray-300 dark:border-gray-600'
  },
  // ... customize other levels
};
```

### Change Score Thresholds

Modify the `calculateIntensity` function:

```typescript
function calculateIntensity(score: number): 'none' | 'low' | 'medium' | 'high' {
  if (score === 0) return 'none';
  if (score <= 5) return 'low';    // Changed from 3
  if (score <= 10) return 'medium'; // Changed from 7
  return 'high';
}
```

### Change Grid Size

Modify the constants at the top of the file:

```typescript
const TOTAL_DAYS = 35; // 5 weeks instead of 4
const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5'];
```

## Utility Functions

The example file includes helpful utility functions:

- `getDate28DaysAgo()` - Get start date for queries
- `calculateWeeklyTotals()` - Get total score per week
- `getMostActiveDay()` - Find highest activity day
- `calculateCurrentStreak()` - Count consecutive active days
- `getActivityStats()` - Get comprehensive statistics

## Troubleshooting

### Days not showing activity

Make sure your data array covers the full 28 days. The component will auto-fill missing days with empty activity.

### Tooltip not appearing

Ensure `TooltipProvider` is wrapping the component (it's included by default).

### Dark mode colors incorrect

Check that your Tailwind config includes dark mode support:

```js
// tailwind.config.ts
module.exports = {
  darkMode: 'class', // or 'media'
  // ...
}
```

### Click handler not working

Make sure you're passing the `onDayClick` prop:

```tsx
<ActivityHeatmap
  data={data}
  onDayClick={(date) => handleClick(date)}
/>
```

## Examples

See `ActivityHeatmapExample.tsx` for:
- Sample data generation
- Integration patterns
- Database setup
- Tracking implementation
- Statistics calculations

## Performance

- **Rendering**: Optimized for 28 days (4 weeks)
- **Memory**: Lightweight, minimal state
- **Re-renders**: Only re-renders when data changes
- **Tooltips**: Lazy-loaded, rendered on demand

## Future Enhancements

Potential improvements for future versions:

- [ ] Configurable time ranges (14, 28, 60, 90 days)
- [ ] Export to image functionality
- [ ] Custom color schemes per activity type
- [ ] Animation on data load
- [ ] Comparison mode (current vs previous period)
- [ ] Activity goal overlays
- [ ] Weekly/monthly views

## Support

For issues or questions:
1. Check the example file: `ActivityHeatmapExample.tsx`
2. Review Widget Design System: `docs/WIDGET-DESIGN-SYSTEM.md`
3. Check Shadcn/UI Tooltip docs: https://ui.shadcn.com/docs/components/tooltip

---

**Component Location**: `/components/profile/ActivityHeatmap.tsx`
**Example Location**: `/components/profile/ActivityHeatmapExample.tsx`
**Version**: 1.0.0
**Last Updated**: 2025-10-21

---

# DailyQuests Component

A beautiful, gamified daily quests component for the Mindsy Profile Widget that follows the Widget Design System.

## Features

- ✅ **Quest Progress Tracking**: Visual progress bars with smooth animations
- ✅ **Completion Checkmarks**: Animated green checkmarks for completed quests
- ✅ **XP Rewards Display**: Clear XP rewards for each quest
- ✅ **Bonus XP Banner**: Animated gold gradient banner when all quests completed
- ✅ **Optional Quick Actions**: Action buttons to navigate to relevant pages
- ✅ **Confetti Animation**: Celebration confetti when claiming bonus
- ✅ **Responsive Design**: Mobile-first, works on all screen sizes
- ✅ **Dark Mode Support**: Fully themed for light and dark modes
- ✅ **Accessibility**: Proper ARIA labels, keyboard navigation, semantic HTML
- ✅ **Micro-interactions**: Smooth hover states, animated progress fills

## Installation

### Install Dependencies

```bash
npm install react-confetti
```

## Usage

### Basic Example

```typescript
import { DailyQuests, Quest } from '@/components/profile/DailyQuests';

const quests: Quest[] = [
  {
    id: 1,
    type: 'pomodoro',
    title: 'Complete 4 Pomodoros',
    description: 'Focus deeply with timed sessions',
    target: 4,
    current: 2,
    completed: false,
    xpReward: 50,
    icon: '🍅',
    action: '/dashboard/pomodoro',
    actionLabel: 'Start Pomodoro'
  },
  {
    id: 2,
    type: 'questions',
    title: 'Answer 20 Questions',
    description: 'Test your knowledge',
    target: 20,
    current: 14,
    completed: false,
    xpReward: 75,
    icon: '📝'
  }
];

function ProfileWidget() {
  const [bonusClaimed, setBonusClaimed] = useState(false);
  const allCompleted = quests.every(q => q.completed);

  return (
    <DailyQuests
      quests={quests}
      allCompleted={allCompleted}
      bonusXP={200}
      bonusClaimed={bonusClaimed}
      onClaimBonus={() => setBonusClaimed(true)}
    />
  );
}
```

## Props

### `DailyQuestsProps`

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `quests` | `Quest[]` | Yes | Array of quest objects |
| `allCompleted` | `boolean` | Yes | Whether all quests are completed |
| `bonusXP` | `number` | Yes | Bonus XP amount for completing all quests |
| `bonusClaimed` | `boolean` | Yes | Whether bonus has been claimed |
| `onClaimBonus` | `() => void` | No | Callback when bonus is claimed |

### `Quest` Interface

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | `number` | Yes | Unique quest identifier |
| `type` | `string` | Yes | Quest type (e.g., 'pomodoro', 'questions', 'battle') |
| `title` | `string` | Yes | Quest title |
| `description` | `string` | Yes | Quest description |
| `target` | `number` | Yes | Target value to complete |
| `current` | `number` | Yes | Current progress value |
| `completed` | `boolean` | Yes | Completion status |
| `xpReward` | `number` | Yes | XP reward amount |
| `icon` | `string` | Yes | Emoji icon |
| `action` | `string` | No | Navigation route (e.g., '/dashboard/pomodoro') |
| `actionLabel` | `string` | No | Action button label (e.g., 'Start Pomodoro') |

## Design Guidelines

### Colors (from Widget Design System)

- **Primary Purple**: `#9333EA` - Progress bars, action buttons
- **Success Green**: `#10B981` - Completed states, checkmarks
- **Bonus Gold**: `#F59E0B` → `#FCD34D` - Bonus banner gradient

### Spacing

- Component padding: `12px` (gap between quests)
- Quest card padding: `12px` (p-3)
- Progress bar height: `8px` (h-2)
- Button height: `32px` (h-8)

### Animations

- Quest entrance: Stagger animation (0.1s delay each)
- Progress bar fill: 0.8s ease-out
- Checkmark: Spring animation (scale 0 → 1)
- Bonus banner: Gradient sweep + pulsing glow
- Confetti: 5 seconds, 500 pieces, purple theme

## Quest States

### Incomplete Quest
- Shows emoji icon
- Progress bar with percentage
- Current/target ratio (e.g., "14/20")
- Purple XP badge
- Optional action button

### Completed Quest
- Animated green checkmark
- Strikethrough title
- Green background/border
- Green XP badge
- No progress bar

### All Completed
- Gold gradient bonus banner appears
- Pulsing glow animation
- "Claim Reward" button
- Confetti animation on claim

**Component Location**: `/components/profile/DailyQuests.tsx`
**Example Location**: `/components/profile/DailyQuestsExample.tsx`
**Version**: 1.0.0
**Last Updated**: 2025-10-21
