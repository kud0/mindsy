# CharacterHeader Integration Guide

## Quick Start

The **CharacterHeader** component is now ready to use in your Mindsy project. Here's how to integrate it into your dashboard.

---

## Component Location

```
/components/profile/CharacterHeader.tsx        # Main component
/components/profile/CharacterHeaderExample.tsx # Usage examples
/components/profile/README.md                  # Full documentation
```

---

## Integration Steps

### Step 1: Import the Component

```tsx
import { CharacterHeader } from '@/components/profile/CharacterHeader';
```

### Step 2: Prepare User Data

```tsx
// Get user from Supabase Auth
const supabase = createClient();
const { data: { user } } = await supabase.auth.getUser();
```

### Step 3: Fetch/Calculate Stats

```tsx
// Example: Fetch from database
const { data: userStats } = await supabase
  .from('user_stats')
  .select('*')
  .eq('user_id', user.id)
  .single();

// Calculate progress percentage
const xpProgress = (userStats.xp / userStats.xp_for_next_level) * 100;

// Determine title based on level
const getTitle = (level: number) => {
  if (level >= 30) return { title: `Level ${level} Master`, color: 'text-amber-600' };
  if (level >= 20) return { title: `Level ${level} Expert`, color: 'text-purple-600' };
  if (level >= 10) return { title: `Level ${level} Scholar`, color: 'text-blue-600' };
  return { title: `Level ${level} Student`, color: 'text-gray-600' };
};

const titleInfo = getTitle(userStats.level);

const stats = {
  level: userStats.level,
  xp: userStats.xp,
  xpForNextLevel: userStats.xp_for_next_level,
  xpProgress: xpProgress,
  currentStreak: userStats.current_streak,
  title: titleInfo.title,
  titleColor: titleInfo.color
};
```

### Step 4: Render the Component

```tsx
<CharacterHeader
  user={user}
  stats={stats}
  onLogout={handleLogout}
  onClick={() => router.push('/dashboard/account')}
/>
```

---

## Complete Example: ProfileWidget Integration

Replace the top section of your existing ProfileWidget with CharacterHeader:

```tsx
"use client"

import React, { useEffect, useState } from 'react';
import { CharacterHeader } from '@/components/profile/CharacterHeader';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function ProfileWidget() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const supabase = createClient();

        // Fetch user
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (!user) return;

        // Fetch user stats
        const { data: userStats } = await supabase
          .from('user_stats')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (userStats) {
          const xpProgress = (userStats.xp / userStats.xp_for_next_level) * 100;
          const titleInfo = getTitleByLevel(userStats.level);

          setStats({
            level: userStats.level,
            xp: userStats.xp,
            xpForNextLevel: userStats.xp_for_next_level,
            xpProgress: Math.min(xpProgress, 100),
            currentStreak: userStats.current_streak,
            title: titleInfo.title,
            titleColor: titleInfo.color
          });
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getTitleByLevel = (level: number) => {
    if (level >= 30) return {
      title: `Level ${level} Master`,
      color: 'text-amber-600 dark:text-amber-400'
    };
    if (level >= 20) return {
      title: `Level ${level} Expert`,
      color: 'text-purple-600 dark:text-purple-400'
    };
    if (level >= 10) return {
      title: `Level ${level} Scholar`,
      color: 'text-blue-600 dark:text-blue-400'
    };
    return {
      title: `Level ${level} Student`,
      color: 'text-gray-600 dark:text-gray-400'
    };
  };

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('Failed to log out');
        return;
      }

      toast.success('Logged out successfully');
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  if (loading) {
    return (
      <div className="h-full w-full rounded-3xl bg-gray-200 dark:bg-gray-800 animate-pulse" />
    );
  }

  return (
    <div className="h-full w-full rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 p-6">
      {/* CharacterHeader - Top 1/3 */}
      {user && stats && (
        <CharacterHeader
          user={user}
          stats={stats}
          onLogout={handleLogout}
          onClick={() => router.push('/dashboard/account')}
        />
      )}

      {/* Activity Rings - Bottom 2/3 */}
      <div className="mt-6">
        {/* Your existing activity rings or other content */}
      </div>
    </div>
  );
}
```

---

## Database Schema Required

Add this to your Supabase database:

```sql
-- Create user_stats table
CREATE TABLE IF NOT EXISTS user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  xp_for_next_level INTEGER DEFAULT 1000,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE user_stats ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own stats"
  ON user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON user_stats FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Function to initialize stats for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_stats (user_id, level, xp, xp_for_next_level, current_streak)
  VALUES (NEW.id, 1, 0, 1000, 0);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create stats on user signup
CREATE TRIGGER on_auth_user_created_stats
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_stats();
```

---

## API Endpoint for XP Updates

Create `/app/api/xp/add/route.ts`:

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { xpToAdd, action } = await request.json();

    // Fetch current stats
    const { data: stats } = await supabase
      .from('user_stats')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!stats) {
      return NextResponse.json({ error: 'Stats not found' }, { status: 404 });
    }

    // Calculate new XP and level
    let newXP = stats.xp + xpToAdd;
    let newLevel = stats.level;
    let xpForNextLevel = stats.xp_for_next_level;

    // Check if leveled up
    while (newXP >= xpForNextLevel) {
      newXP -= xpForNextLevel;
      newLevel++;
      xpForNextLevel = calculateXPForLevel(newLevel + 1);
    }

    // Update stats
    const { error } = await supabase
      .from('user_stats')
      .update({
        xp: newXP,
        level: newLevel,
        xp_for_next_level: xpForNextLevel,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({
      success: true,
      newLevel,
      newXP,
      leveledUp: newLevel > stats.level
    });
  } catch (error) {
    console.error('Error adding XP:', error);
    return NextResponse.json({ error: 'Failed to add XP' }, { status: 500 });
  }
}

// XP progression formula
function calculateXPForLevel(level: number): number {
  // Linear: 1000 * level
  return 1000 * level;

  // Or exponential: 1000 * (1.5 ^ level)
  // return Math.floor(1000 * Math.pow(1.5, level));
}
```

---

## XP Reward System

Award XP for various actions:

```typescript
// Award XP after completing a lecture
const awardXP = async (action: string, amount: number) => {
  const response = await fetch('/api/xp/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ xpToAdd: amount, action })
  });

  const result = await response.json();

  if (result.leveledUp) {
    toast.success(`Level Up! You're now Level ${result.newLevel}!`, {
      duration: 5000,
      // Add confetti animation here
    });
  } else {
    toast.success(`+${amount} XP earned!`);
  }
};

// Example usage
await awardXP('lecture_completed', 100);
await awardXP('quiz_perfect_score', 500);
await awardXP('7_day_streak', 1000);
```

### Suggested XP Rewards

| Action | XP Award | Rationale |
|--------|----------|-----------|
| Upload lecture | 50 | Encourages content creation |
| Complete lecture study | 100 | Primary learning activity |
| Answer quiz question | 10 | Micro-engagement |
| Perfect quiz score (100%) | 500 | Skill mastery |
| Share content with friend | 25 | Social engagement |
| Win quiz battle | 200 | Competitive achievement |
| 3-day study streak | 300 | Consistency reward |
| 7-day study streak | 1000 | Major milestone |
| 30-day study streak | 5000 | Elite dedication |

---

## Streak System Implementation

### Update Streak Function

```sql
CREATE OR REPLACE FUNCTION update_user_streak(p_user_id UUID)
RETURNS void AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INT;
  v_longest_streak INT;
BEGIN
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_date, v_current_streak, v_longest_streak
  FROM user_stats
  WHERE user_id = p_user_id;

  IF v_last_date IS NULL THEN
    -- First activity
    UPDATE user_stats
    SET current_streak = 1,
        longest_streak = 1,
        last_activity_date = CURRENT_DATE
    WHERE user_id = p_user_id;
  ELSIF v_last_date = CURRENT_DATE THEN
    -- Already counted today
    RETURN;
  ELSIF v_last_date = CURRENT_DATE - INTERVAL '1 day' THEN
    -- Consecutive day
    UPDATE user_stats
    SET current_streak = v_current_streak + 1,
        longest_streak = GREATEST(v_longest_streak, v_current_streak + 1),
        last_activity_date = CURRENT_DATE
    WHERE user_id = p_user_id;
  ELSE
    -- Streak broken
    UPDATE user_stats
    SET current_streak = 1,
        last_activity_date = CURRENT_DATE
    WHERE user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
```

### Call on User Activity

```typescript
// In your lecture completion handler
await supabase.rpc('update_user_streak', { p_user_id: user.id });
```

---

## Visual Customization Examples

### Custom Gradient Background

```tsx
<CharacterHeader
  user={user}
  stats={stats}
  onLogout={handleLogout}
  className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40"
/>
```

### Custom Progress Bar (Modify Component)

```tsx
// In CharacterHeader.tsx, find the progress bar div
<div
  className="absolute top-0 left-0 h-full bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 rounded-full transition-all duration-500"
  style={{ width: `${Math.min(stats.xpProgress, 100)}%` }}
/>
```

### Different Title Colors by Achievement

```tsx
const getTitleByAchievement = (user: any) => {
  if (user.achievements?.includes('perfect_100_quizzes')) {
    return { title: 'Quiz Master', color: 'text-amber-600 dark:text-amber-400' };
  }
  if (user.achievements?.includes('30_day_streak')) {
    return { title: 'Streak Legend', color: 'text-orange-600 dark:text-orange-400' };
  }
  return getTitleByLevel(user.level);
};
```

---

## Testing Checklist

- [ ] Component renders with user data
- [ ] Avatar displays correctly (image + fallback)
- [ ] XP progress bar animates smoothly
- [ ] Logout button works and redirects
- [ ] Streak badge shows/hides correctly
- [ ] Click handler navigates to account page
- [ ] Responsive on mobile (320px, 375px, 414px)
- [ ] Responsive on tablet (768px, 1024px)
- [ ] Responsive on desktop (1440px, 1920px)
- [ ] Dark mode colors are correct
- [ ] Keyboard navigation works (Tab, Enter)
- [ ] Screen reader announces content
- [ ] Focus indicators are visible
- [ ] Color contrast meets WCAG AA

---

## Performance Optimization

### Memoize Component

```tsx
import { memo } from 'react';

export const CharacterHeader = memo(({ user, stats, onLogout, onClick }) => {
  // ... component code
}, (prevProps, nextProps) => {
  // Only re-render if stats change
  return (
    prevProps.stats.xp === nextProps.stats.xp &&
    prevProps.stats.currentStreak === nextProps.stats.currentStreak
  );
});
```

### Lazy Load Avatar Image

```tsx
<AvatarImage
  src={user?.user_metadata?.avatar_url}
  alt={displayName}
  loading="lazy"
/>
```

---

## Next Steps

1. ✅ Create CharacterHeader component
2. ⏸ Add user_stats table to database
3. ⏸ Implement XP reward system
4. ⏸ Integrate into ProfileWidget
5. ⏸ Test on mobile devices
6. ⏸ Add confetti animation on level up
7. ⏸ Implement streak milestones (3, 7, 30 days)

---

## Support

- **Component Documentation**: `components/profile/README.md`
- **Example Usage**: `components/profile/CharacterHeaderExample.tsx`
- **Design System**: `docs/WIDGET-DESIGN-SYSTEM.md`

**Questions?** Check the README or review the example file for detailed implementation guidance.
