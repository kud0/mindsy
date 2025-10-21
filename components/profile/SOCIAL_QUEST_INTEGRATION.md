# SocialQuest Integration Guide

Quick guide to integrating the SocialQuest component into the Social widget.

## Step 1: Import the Component

```tsx
import { SocialQuest } from '@/components/profile/SocialQuest';
```

## Step 2: Add to Social Widget

### Option A: At the Top (Recommended)

```tsx
export function SocialWidget() {
  // Your existing social widget code...

  return (
    <div className="social-widget bg-white dark:bg-gray-800 rounded-xl p-4 space-y-4">
      {/* Add SocialQuest at the top */}
      <SocialQuest
        quest={{
          id: 3,
          type: 'battle_win',
          title: 'Win a Battle Today',
          target: 1,
          current: 0,
          completed: false,
          xpReward: 100,
          action: '/dashboard/social?tab=battles',
          actionLabel: 'Challenge Friend',
        }}
        onComplete={() => {
          // Handle quest completion
          console.log('Quest completed!');
        }}
      />

      {/* Your existing social stats cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Friends card */}
        {/* Battles card */}
      </div>

      {/* Your existing action buttons */}
      <div className="flex gap-2">
        {/* View Friends button */}
        {/* Start Battle button */}
      </div>
    </div>
  );
}
```

### Option B: At the Bottom

```tsx
export function SocialWidget() {
  return (
    <div className="social-widget bg-white dark:bg-gray-800 rounded-xl p-4 space-y-4">
      {/* Your existing social stats cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Friends card */}
        {/* Battles card */}
      </div>

      {/* Add SocialQuest at the bottom */}
      <SocialQuest
        quest={{
          id: 3,
          type: 'battle_win',
          title: 'Win a Battle Today',
          target: 1,
          current: 0,
          completed: false,
          xpReward: 100,
          action: '/dashboard/social?tab=battles',
          actionLabel: 'Challenge Friend',
        }}
        onComplete={() => {
          console.log('Quest completed!');
        }}
      />

      {/* Your existing action buttons */}
      <div className="flex gap-2">
        {/* View Friends button */}
        {/* Start Battle button */}
      </div>
    </div>
  );
}
```

## Step 3: Fetch Quest Data from API

### Create API Endpoint

Create `/app/api/quests/daily/route.ts`:

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createRouteHandlerClient({ cookies });

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch daily quests for user
  // This is a simplified example - you'd fetch from your quests table
  const today = new Date().toISOString().split('T')[0];

  // Get user's battle stats for today
  const { data: battles } = await supabase
    .from('battle_participants')
    .select('result')
    .eq('user_id', user.id)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  const wins = battles?.filter(b => b.result === 'win').length || 0;

  // Get shared content count for today
  const { data: shares } = await supabase
    .from('shared_content')
    .select('id')
    .eq('shared_by', user.id)
    .gte('created_at', `${today}T00:00:00`)
    .lte('created_at', `${today}T23:59:59`);

  const shareCount = shares?.length || 0;

  // Construct quest3 (social quest)
  const quest3 = {
    id: 3,
    type: 'battle_win',
    title: 'Win a Battle Today',
    target: 1,
    current: wins,
    completed: wins >= 1,
    xpReward: 100,
    action: '/dashboard/social?tab=battles',
    actionLabel: 'Challenge Friend',
  };

  return NextResponse.json({
    quest1: { /* quest1 data */ },
    quest2: { /* quest2 data */ },
    quest3,
  });
}
```

### Use in Social Widget

```tsx
'use client';

import { useEffect, useState } from 'react';
import { SocialQuest } from '@/components/profile/SocialQuest';

export function SocialWidget() {
  const [quest, setQuest] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchQuest();
  }, []);

  async function fetchQuest() {
    try {
      const res = await fetch('/api/quests/daily');
      const data = await res.json();
      setQuest(data.quest3); // Social quest
    } catch (error) {
      console.error('Failed to fetch quest:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="social-widget bg-white dark:bg-gray-800 rounded-xl p-4">
        <div className="h-20 bg-gray-100 dark:bg-gray-700 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="social-widget bg-white dark:bg-gray-800 rounded-xl p-4 space-y-4">
      {quest && (
        <SocialQuest
          quest={quest}
          onComplete={async () => {
            // Award XP
            await fetch('/api/quests/complete', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ questId: quest.id }),
            });
            // Refetch quest
            fetchQuest();
          }}
        />
      )}

      {/* Rest of widget */}
    </div>
  );
}
```

## Step 4: Quest Completion Handler

Create `/app/api/quests/complete/route.ts`:

```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = createRouteHandlerClient({ cookies });

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { questId } = await request.json();

  // Award XP to user (update profiles table)
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ xp: supabase.raw('xp + 100') }) // Quest reward
    .eq('id', user.id);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to award XP' }, { status: 500 });
  }

  // Optionally: Mark quest as claimed in quests table
  // await supabase.from('daily_quests').update({ claimed: true })...

  return NextResponse.json({ success: true });
}
```

## Step 5: Real-time Updates (Optional)

Use SWR for automatic refetching:

```bash
npm install swr
```

```tsx
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export function SocialWidget() {
  const { data, mutate } = useSWR('/api/quests/daily', fetcher, {
    refreshInterval: 30000, // Auto-refresh every 30 seconds
  });

  return (
    <div className="social-widget bg-white dark:bg-gray-800 rounded-xl p-4 space-y-4">
      {data?.quest3 && (
        <SocialQuest
          quest={data.quest3}
          onComplete={async () => {
            await fetch('/api/quests/complete', {
              method: 'POST',
              body: JSON.stringify({ questId: data.quest3.id }),
            });
            mutate(); // Trigger refetch
          }}
        />
      )}

      {/* Rest of widget */}
    </div>
  );
}
```

## Quest Rotation Logic

To rotate between different social quest types (battle_win, share_content, perfect_score), use a daily rotation:

```typescript
// In /app/api/quests/daily/route.ts

function getDailySocialQuest(userId: string, date: string): Quest {
  // Use date hash to determine quest type
  const dayOfYear = Math.floor(
    (new Date(date).getTime() - new Date(date).getFullYear(), 0, 0).getTime()) / 86400000
  );
  const questIndex = dayOfYear % 3;

  const quests = [
    {
      id: 3,
      type: 'battle_win',
      title: 'Win a Battle Today',
      target: 1,
      xpReward: 100,
      action: '/dashboard/social?tab=battles',
      actionLabel: 'Challenge Friend',
    },
    {
      id: 3,
      type: 'share_content',
      title: 'Share a Lecture',
      target: 1,
      xpReward: 50,
      action: '/dashboard/social?tab=shared',
      actionLabel: 'Share Content',
    },
    {
      id: 3,
      type: 'perfect_score',
      title: 'Perfect Battle Score',
      target: 1,
      xpReward: 150,
      // No action - informational
    },
  ];

  return quests[questIndex];
}
```

## Styling Tips

### Match Social Widget Theme

The component already uses pink/purple gradients to match the social theme. To further customize:

```tsx
<div className="social-widget">
  {/* Add a header with matching colors */}
  <div className="flex items-center gap-2 mb-3">
    <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
      <span className="text-white text-sm">🎯</span>
    </div>
    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
      Daily Social Quest
    </h3>
  </div>

  <SocialQuest quest={quest} />
</div>
```

### Compact Layout

If space is tight, use a more compact wrapper:

```tsx
<div className="social-widget space-y-2"> {/* Reduced spacing */}
  <SocialQuest quest={quest} />
</div>
```

## Testing Checklist

Before deploying:

- [ ] Quest displays correctly in Social widget
- [ ] Action button navigates to correct route
- [ ] Quest completion triggers confetti
- [ ] XP is awarded on completion
- [ ] Quest refetches after completion
- [ ] Progress updates in real-time (or on interval)
- [ ] Dark mode looks correct
- [ ] Mobile responsive (test on small screen)
- [ ] No console errors

## Common Issues

### Quest not updating after battle
**Solution**: Ensure `/api/quests/daily` refetches battle results from database

### Confetti covers entire screen
**Solution**: This is expected - confetti is centered but covers viewport. It's temporary (3s).

### Multiple quests showing
**Solution**: SocialQuest only shows ONE quest (quest3). For multiple quests, use the full DailyQuests component.

## Next Steps

1. Implement `/api/quests/daily` endpoint
2. Implement `/api/quests/complete` endpoint
3. Add SocialQuest to Social widget
4. Test quest completion flow
5. Add real-time updates with SWR or Realtime
6. Track quest completion metrics

---

**Questions?** See `/components/profile/SOCIAL_QUEST_README.md` for full documentation.
