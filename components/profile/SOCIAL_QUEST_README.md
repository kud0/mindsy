# SocialQuest Component

A compact, animated daily quest component designed specifically for the Social widget. Shows real-time progress, action buttons, and celebration effects when quests are completed.

## Overview

The SocialQuest component displays a single social-themed daily quest inline within the Social widget. It's optimized for compactness while maintaining visual appeal and interactivity.

## Features

- ✨ **Compact Design**: Fits seamlessly at the top or bottom of Social widget
- 🎯 **Real-time Progress**: Auto-updates quest progress on configurable interval
- 🎊 **Celebration Effects**: Mini confetti animation when quest completes
- 🔔 **Toast Notifications**: Automatic success notification with XP earned
- 🎨 **Social Theme**: Pink/purple gradient matching social feature colors
- ⚡ **Action Buttons**: Quick navigation to complete quest (e.g., "Challenge Friend")
- 🌙 **Dark Mode**: Full dark mode support with proper contrast
- ♿ **Accessible**: Proper ARIA labels and keyboard navigation

## Visual Design

### Incomplete Quest
```
┌─────────────────────────────────────┐
│ 🎯 Win a Battle          +100 XP    │
│ (0/1)                                │
│ ▓░░░░░░░░░ 0%                        │
│ [Challenge Friend →]                 │
└─────────────────────────────────────┘
```

### Completed Quest
```
┌─────────────────────────────────────┐
│ ✅ Win a Battle          +100 XP    │
│ ✨ Quest completed!                 │
└─────────────────────────────────────┘
```

## Installation

The component is already set up in `/components/profile/SocialQuest.tsx`.

### Dependencies

All dependencies are already installed:
- `framer-motion` - Animations
- `react-confetti` - Celebration effects
- `sonner` - Toast notifications
- `lucide-react` - Icons

## Usage

### Basic Example

```tsx
import { SocialQuest } from '@/components/profile/SocialQuest';

export function SocialWidget() {
  const [quest, setQuest] = useState({
    id: 3,
    type: 'battle_win',
    title: 'Win a Battle',
    target: 1,
    current: 0,
    completed: false,
    xpReward: 100,
    action: '/dashboard/social?tab=battles',
    actionLabel: 'Challenge Friend',
  });

  return (
    <div className="social-widget space-y-4">
      {/* Social Quest at top */}
      <SocialQuest
        quest={quest}
        onComplete={() => {
          console.log('Quest completed!');
          // Refetch user stats, update XP, etc.
        }}
      />

      {/* Rest of social widget content */}
      <div className="social-stats">
        {/* Friends, battles stats */}
      </div>
    </div>
  );
}
```

### With Custom Action Handler

```tsx
<SocialQuest
  quest={quest}
  onComplete={() => {
    // Update user XP
    updateUserXP(quest.xpReward);
    // Refetch daily quests
    refetchQuests();
  }}
  onActionClick={(action) => {
    // Custom handling instead of direct navigation
    if (action.includes('battles')) {
      // Open battle creation modal
      openBattleModal();
    } else {
      // Default navigation
      router.push(action);
    }
  }}
  refreshInterval={15000} // Refresh every 15 seconds
/>
```

### With Server-Side Quest Data

```tsx
'use client';

import { SocialQuest } from '@/components/profile/SocialQuest';
import { useEffect, useState } from 'react';

export function SocialWidget() {
  const [quest, setQuest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchQuest() {
      try {
        const res = await fetch('/api/quests/daily');
        const data = await res.json();
        // Extract quest3 (social quest) from daily quests
        setQuest(data.quest3);
      } catch (error) {
        console.error('Failed to fetch quest:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchQuest();
  }, []);

  if (loading) {
    return <div className="h-20 bg-gray-100 animate-pulse rounded-lg" />;
  }

  if (!quest) {
    return null;
  }

  return (
    <div className="social-widget">
      <SocialQuest
        quest={quest}
        onComplete={async () => {
          // Award XP on backend
          await fetch('/api/quests/complete', {
            method: 'POST',
            body: JSON.stringify({ questId: quest.id }),
          });
          // Refetch quest data
          fetchQuest();
        }}
      />

      {/* Rest of widget */}
    </div>
  );
}
```

## Props

### SocialQuestProps

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `quest` | `QuestObject` | ✅ Yes | - | Quest data object |
| `onComplete` | `() => void` | ❌ No | - | Callback when quest completes |
| `onActionClick` | `(action: string) => void` | ❌ No | - | Custom action handler |
| `refreshInterval` | `number` | ❌ No | `30000` | Auto-refresh interval (ms) |

### Quest Object

```typescript
{
  id: number;                 // Unique quest ID
  type: QuestType;            // Quest category
  title: string;              // Quest display title
  target: number;             // Goal to complete (e.g., 1 battle)
  current: number;            // Current progress (0-target)
  completed: boolean;         // Completion status
  xpReward: number;           // XP earned on completion
  action?: string;            // Navigation route (optional)
  actionLabel?: string;       // Button label (optional)
}
```

### Quest Types

```typescript
type QuestType =
  | 'battle_win'      // Win a quiz battle
  | 'share_content'   // Share a lecture with friend
  | 'perfect_score'   // Get perfect score in battle
  | 'social';         // General social activity
```

## Quest Type Examples

### 1. Battle Win Quest

```tsx
{
  id: 1,
  type: 'battle_win',
  title: 'Win a Battle',
  target: 1,
  current: 0,
  completed: false,
  xpReward: 100,
  action: '/dashboard/social?tab=battles',
  actionLabel: 'Challenge Friend',
}
```

**When to use**: Daily quest to encourage battle participation
**Action**: Navigates to battles tab where user can create a challenge

### 2. Share Content Quest

```tsx
{
  id: 2,
  type: 'share_content',
  title: 'Share a Lecture',
  target: 1,
  current: 0,
  completed: false,
  xpReward: 50,
  action: '/dashboard/social?tab=shared',
  actionLabel: 'Share Content',
}
```

**When to use**: Encourage content sharing between friends
**Action**: Opens shared content tab or share modal

### 3. Perfect Score Quest

```tsx
{
  id: 3,
  type: 'perfect_score',
  title: 'Perfect Battle Score',
  target: 1,
  current: 0,
  completed: false,
  xpReward: 150,
  // No action - informational only
}
```

**When to use**: Achievement-based quest with no direct action
**Action**: None (no button shown)

## Styling & Customization

### Color Scheme

The component uses a pink/purple gradient to match the social theme:

**Incomplete State:**
- Background: `from-pink-50 to-purple-50` (light) / `from-pink-950/30 to-purple-950/30` (dark)
- Border: `border-pink-200` (light) / `border-pink-900/50` (dark)
- Progress bar: `from-pink-500 to-purple-600`
- Action button: `from-pink-500 to-purple-600`

**Completed State:**
- Background: `from-emerald-50 to-green-50` (light) / `from-emerald-950/30 to-green-950/30` (dark)
- Border: `border-emerald-300` (light) / `border-emerald-800` (dark)
- Checkmark: `from-emerald-500 to-green-600`

### Custom Styling

You can wrap the component and apply custom classes:

```tsx
<div className="custom-quest-wrapper">
  <SocialQuest quest={quest} />
</div>
```

Or modify the component directly for your needs.

## Integration with Social Widget

### Recommended Placement

**Option 1: Top of Widget** (Recommended)
```tsx
<div className="social-widget p-4 space-y-4">
  {/* Quest at top - prime visibility */}
  <SocialQuest quest={quest} />

  <div className="social-stats grid grid-cols-2 gap-3">
    {/* Friends, Battles cards */}
  </div>

  <div className="social-actions">
    {/* View Friends, Start Battle buttons */}
  </div>
</div>
```

**Option 2: Bottom of Widget**
```tsx
<div className="social-widget p-4 space-y-4">
  <div className="social-stats grid grid-cols-2 gap-3">
    {/* Friends, Battles cards */}
  </div>

  {/* Quest at bottom - subtle encouragement */}
  <SocialQuest quest={quest} />

  <div className="social-actions">
    {/* View Friends, Start Battle buttons */}
  </div>
</div>
```

### Responsive Behavior

The component is fully responsive:
- **Mobile (< 640px)**: Full width, compact padding
- **Tablet (640-1024px)**: Maintains compact design
- **Desktop (> 1024px)**: Same as mobile (designed for widget, not full-page)

## Performance

### Auto-Refresh

The component auto-refreshes progress every `refreshInterval` ms (default: 30 seconds).

**Note**: The current implementation shows a visual refresh indicator. In production, you should:
1. Implement actual data fetching in the refresh handler
2. Use SWR or React Query for automatic refetching
3. Or use Supabase Realtime subscriptions for live updates

### Example with SWR

```tsx
import useSWR from 'swr';

function SocialWidget() {
  const { data: quest, mutate } = useSWR('/api/quests/daily', fetcher, {
    refreshInterval: 30000, // Auto-refresh every 30s
  });

  return (
    <SocialQuest
      quest={quest?.quest3}
      onComplete={() => {
        mutate(); // Refetch quest data
      }}
    />
  );
}
```

## Accessibility

The component follows WCAG 2.1 AA standards:

- ✅ **Keyboard Navigation**: Action button is keyboard-accessible
- ✅ **Focus Indicators**: Visible focus states on interactive elements
- ✅ **Color Contrast**: All text meets 4.5:1 contrast ratio
- ✅ **Screen Readers**: Proper semantic HTML and ARIA labels
- ✅ **Animations**: Respects `prefers-reduced-motion`

## Testing

### Manual Testing Checklist

- [ ] Quest displays correctly when incomplete
- [ ] Progress bar updates when `current` changes
- [ ] Action button navigates correctly
- [ ] Completion triggers confetti effect
- [ ] Toast notification appears on completion
- [ ] Completed state shows checkmark and message
- [ ] Auto-refresh indicator appears (subtle dot)
- [ ] Dark mode renders correctly
- [ ] Responsive on mobile, tablet, desktop

### Example Test (Jest + React Testing Library)

```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { SocialQuest } from './SocialQuest';

test('renders incomplete quest with action button', () => {
  const quest = {
    id: 1,
    type: 'battle_win',
    title: 'Win a Battle',
    target: 1,
    current: 0,
    completed: false,
    xpReward: 100,
    action: '/dashboard/social',
    actionLabel: 'Challenge Friend',
  };

  render(<SocialQuest quest={quest} />);

  expect(screen.getByText('Win a Battle')).toBeInTheDocument();
  expect(screen.getByText('+100 XP')).toBeInTheDocument();
  expect(screen.getByText('Challenge Friend')).toBeInTheDocument();
});

test('calls onActionClick when button clicked', () => {
  const mockActionClick = jest.fn();
  const quest = { /* ... */ };

  render(<SocialQuest quest={quest} onActionClick={mockActionClick} />);

  fireEvent.click(screen.getByText('Challenge Friend'));

  expect(mockActionClick).toHaveBeenCalledWith('/dashboard/social');
});
```

## Troubleshooting

### Quest doesn't update

**Problem**: Quest progress doesn't reflect real-time changes
**Solution**: Ensure you're refetching quest data after user actions. Use SWR's `mutate()` or React Query's `invalidateQueries()`.

### Confetti doesn't show

**Problem**: Confetti animation not visible on completion
**Solution**: Check that `useWindowSize` hook is working. Confetti needs window dimensions.

### Action button not navigating

**Problem**: Clicking action button does nothing
**Solution**:
1. Check that `action` and `actionLabel` are provided in quest object
2. Verify `onActionClick` handler or ensure router is available
3. Check browser console for navigation errors

### Dark mode colors incorrect

**Problem**: Component looks wrong in dark mode
**Solution**: Ensure your app has dark mode configured with Tailwind's `dark:` variant support.

## Future Enhancements

Potential improvements for future iterations:

1. **Real-time Updates**: Supabase Realtime subscription for live quest progress
2. **Quest Rotation**: Multiple quests with carousel navigation
3. **Customizable Themes**: Allow different color schemes per quest type
4. **Micro-animations**: More subtle hover/tap animations
5. **Sound Effects**: Optional completion sound (toggle in settings)
6. **Quest History**: "View Past Quests" to see completion streak
7. **Bonus Challenges**: Rare "super quests" with higher rewards

## Related Components

- **DailyQuests** (`/components/profile/DailyQuests.tsx`) - Full quest list component
- **SocialWidget** - Parent widget containing this quest
- **ActivityHeatmap** - Shows daily activity streak

## Support

For questions or issues, check:
1. This README
2. Example file: `/components/profile/SocialQuestExample.tsx`
3. Main quest types: `/components/profile/types.ts`
4. Widget Design System: `/docs/WIDGET-DESIGN-SYSTEM.md`

---

**Built with**:
Mindsy Widget Design System | Next.js 15 | React 19 | Tailwind CSS 4 | Framer Motion
