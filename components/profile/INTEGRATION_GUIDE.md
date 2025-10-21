# ActivityHeatmap Integration Guide

This guide shows you how to integrate the ActivityHeatmap component into your Mindsy Profile Widget.

## Quick Start (3 Steps)

### Step 1: Import the Component

Add to your `ProfileWidget.tsx`:

```typescript
import { ActivityHeatmap, ActivityDay } from '@/components/profile/ActivityHeatmap';
```

### Step 2: Add State & Data Fetching

```typescript
const [activityData, setActivityData] = useState<ActivityDay[]>([]);
const [loadingActivity, setLoadingActivity] = useState(true);

useEffect(() => {
  const fetchActivity = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return;

      // Fetch last 28 days of activity
      const date28DaysAgo = new Date();
      date28DaysAgo.setDate(date28DaysAgo.getDate() - 28);

      const { data, error } = await supabase
        .from('user_activity')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', date28DaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: true });

      if (error) throw error;

      // Map to ActivityDay format
      const formattedData: ActivityDay[] = (data || []).map(d => ({
        date: d.date,
        pomodoros: d.pomodoros || 0,
        questions: d.questions || 0,
        battles: d.battles || 0,
        exams: d.exams || 0,
        score: d.score || 0,
        intensity: calculateIntensity(d.score || 0)
      }));

      setActivityData(formattedData);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  fetchActivity();
}, []);

// Helper function
function calculateIntensity(score: number): 'none' | 'low' | 'medium' | 'high' {
  if (score === 0) return 'none';
  if (score <= 3) return 'low';
  if (score <= 7) return 'medium';
  return 'high';
}
```

### Step 3: Add to JSX

Add this section to your ProfileWidget render, below the activity rings:

```tsx
{/* Activity Heatmap Section */}
<div className="relative z-10 mt-6">
  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
    Activity History
  </h3>
  {loadingActivity ? (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
    </div>
  ) : (
    <ActivityHeatmap
      data={activityData}
      onDayClick={(date) => {
        // Optional: Navigate to detailed activity view
        router.push(`/dashboard/activity/${date}`);
      }}
    />
  )}
</div>
```

## Complete Example

Here's a complete modified ProfileWidget with the heatmap integrated:

```tsx
"use client"

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { LogOut, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ActivityHeatmap, ActivityDay } from '@/components/profile/ActivityHeatmap';

export function ProfileWidget() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<ActivityDay[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchUserAndActivity = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);

        if (!user) return;

        // Fetch activity data
        const date28DaysAgo = new Date();
        date28DaysAgo.setDate(date28DaysAgo.getDate() - 28);

        const { data, error } = await supabase
          .from('user_activity')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', date28DaysAgo.toISOString().split('T')[0])
          .order('date', { ascending: true });

        if (error) {
          console.error('Activity fetch error:', error);
        } else {
          const formattedData: ActivityDay[] = (data || []).map(d => ({
            date: d.date,
            pomodoros: d.pomodoros || 0,
            questions: d.questions || 0,
            battles: d.battles || 0,
            exams: d.exams || 0,
            score: d.score || 0,
            intensity: calculateIntensity(d.score || 0)
          }));
          setActivityData(formattedData);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
        setLoadingActivity(false);
      }
    };

    fetchUserAndActivity();
  }, []);

  const calculateIntensity = (score: number): 'none' | 'low' | 'medium' | 'high' => {
    if (score === 0) return 'none';
    if (score <= 3) return 'low';
    if (score <= 7) return 'medium';
    return 'high';
  };

  // ... rest of your ProfileWidget code (getInitials, displayName, handleLogout, ActivityRings, etc.)

  return (
    <div
      className="h-full w-full rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 p-6 flex flex-col justify-between relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={() => router.push('/dashboard/account')}
      role="button"
      tabIndex={0}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent rounded-3xl" />

      {/* Logout Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleLogout();
        }}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 transition-all hover:scale-105 group"
        title="Log out"
      >
        <LogOut className="w-4 h-4 text-gray-700 dark:text-gray-200 group-hover:text-red-600" />
      </button>

      {/* Profile Info Section */}
      <div className="relative z-10 flex items-center gap-4">
        {/* Avatar */}
        <div className="relative">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden",
            "bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg"
          )}>
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover rounded-full"
              />
            ) : null}
            <span className={user?.user_metadata?.avatar_url ? 'hidden' : ''}>
              {getInitials(user?.email || '')}
            </span>
          </div>
        </div>

        {/* Name and Badge */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {displayName}
          </h2>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/30 backdrop-blur-sm border border-white/30">
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">
              Mindsy Pro
            </span>
          </div>
        </div>
      </div>

      {/* Activity Rings */}
      <div className="relative z-10 flex justify-center">
        <div className="scale-90">
          <ActivityRings />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="relative z-10 flex items-center justify-center gap-4 text-xs text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-1">
          <span className="font-semibold">{activityData.study.completed}</span>
          <span className="opacity-70">Study</span>
        </div>
        <span className="opacity-50">•</span>
        <div className="flex items-center gap-1">
          <span className="font-semibold">{activityData.exams.completed}</span>
          <span className="opacity-70">Exams</span>
        </div>
        <span className="opacity-50">•</span>
        <div className="flex items-center gap-1">
          <span className="font-semibold">{activityData.streak.completed}</span>
          <span className="opacity-70">Streak</span>
        </div>
      </div>

      {/* NEW: Activity Heatmap Section */}
      <div className="relative z-10 mt-6 pt-4 border-t border-white/20">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-3">
          Activity History
        </h3>
        {loadingActivity ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
          </div>
        ) : (
          <ActivityHeatmap
            data={activityData}
            onDayClick={(date) => {
              console.log('View activity for:', date);
              // Optional: Navigate to detailed view
              // router.push(`/dashboard/activity/${date}`);
            }}
          />
        )}
      </div>
    </div>
  );
}
```

## Database Setup

### Step 1: Create Activity Table

Run this SQL in your Supabase SQL Editor:

```sql
-- Create user_activity table
CREATE TABLE IF NOT EXISTS user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
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

-- Create index for faster queries
CREATE INDEX idx_user_activity_user_date
  ON user_activity(user_id, date DESC);

-- Enable Row Level Security
ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own activity"
  ON user_activity
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
  ON user_activity
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own activity"
  ON user_activity
  FOR UPDATE
  USING (auth.uid() = user_id);
```

### Step 2: Create Helper Function (Optional)

This function helps increment activity values:

```sql
CREATE OR REPLACE FUNCTION increment_activity(
  p_user_id UUID,
  p_date DATE,
  p_activity_type TEXT,
  p_amount INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_score INTEGER;
BEGIN
  -- Calculate new score based on activity type
  v_score := CASE p_activity_type
    WHEN 'pomodoros' THEN p_amount * 2
    WHEN 'questions' THEN p_amount / 5
    WHEN 'battles' THEN p_amount * 3
    WHEN 'exams' THEN p_amount * 5
    ELSE 0
  END;

  -- Insert or update activity record
  INSERT INTO user_activity (user_id, date, pomodoros, questions, battles, exams, score)
  VALUES (
    p_user_id,
    p_date,
    CASE WHEN p_activity_type = 'pomodoros' THEN p_amount ELSE 0 END,
    CASE WHEN p_activity_type = 'questions' THEN p_amount ELSE 0 END,
    CASE WHEN p_activity_type = 'battles' THEN p_amount ELSE 0 END,
    CASE WHEN p_activity_type = 'exams' THEN p_amount ELSE 0 END,
    v_score
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    pomodoros = user_activity.pomodoros +
      CASE WHEN p_activity_type = 'pomodoros' THEN p_amount ELSE 0 END,
    questions = user_activity.questions +
      CASE WHEN p_activity_type = 'questions' THEN p_amount ELSE 0 END,
    battles = user_activity.battles +
      CASE WHEN p_activity_type = 'battles' THEN p_amount ELSE 0 END,
    exams = user_activity.exams +
      CASE WHEN p_activity_type = 'exams' THEN p_amount ELSE 0 END,
    score = user_activity.score + v_score,
    updated_at = NOW();
END;
$$;
```

## Tracking Activities

### When User Completes a Pomodoro

```typescript
async function trackPomodoroComplete(userId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  await supabase.rpc('increment_activity', {
    p_user_id: userId,
    p_date: today,
    p_activity_type: 'pomodoros',
    p_amount: 1
  });
}
```

### When User Answers Questions

```typescript
async function trackQuestionsAnswered(userId: string, count: number) {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  await supabase.rpc('increment_activity', {
    p_user_id: userId,
    p_date: today,
    p_activity_type: 'questions',
    p_amount: count
  });
}
```

### When User Completes Battle

```typescript
async function trackBattleComplete(userId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  await supabase.rpc('increment_activity', {
    p_user_id: userId,
    p_date: today,
    p_activity_type: 'battles',
    p_amount: 1
  });
}
```

### When User Takes Exam

```typescript
async function trackExamComplete(userId: string) {
  const supabase = createClient();
  const today = new Date().toISOString().split('T')[0];

  await supabase.rpc('increment_activity', {
    p_user_id: userId,
    p_date: today,
    p_activity_type: 'exams',
    p_amount: 1
  });
}
```

## Customization Options

### Change Time Range

To show 60 days instead of 28:

```typescript
// In ActivityHeatmap.tsx
const TOTAL_DAYS = 60; // Change from 28
const WEEKS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6', 'W7', 'W8']; // Add more weeks
```

### Adjust Scoring

Change the scoring formula in your tracking functions:

```typescript
const score =
  pomodoros * 3 +           // Changed from 2
  Math.floor(questions / 3) + // Changed from 5
  battles * 4 +              // Changed from 3
  exams * 10;                // Changed from 5
```

### Modify Intensity Thresholds

```typescript
function calculateIntensity(score: number): 'none' | 'low' | 'medium' | 'high' {
  if (score === 0) return 'none';
  if (score <= 5) return 'low';    // Changed from 3
  if (score <= 10) return 'medium'; // Changed from 7
  return 'high';
}
```

## Testing

### Generate Test Data

Use the demo component to generate sample data:

```typescript
import { ActivityHeatmapDemo } from '@/components/profile/ActivityHeatmapDemo';

// In your test page
<ActivityHeatmapDemo />
```

### Manual Testing Checklist

- [ ] Heatmap renders with correct dates
- [ ] Colors match intensity levels
- [ ] Tooltips show on hover
- [ ] Click handler works
- [ ] Dark mode displays correctly
- [ ] Mobile responsive (320px+)
- [ ] Keyboard navigation works (Tab + Enter)
- [ ] Accessibility labels present

## Troubleshooting

### "No activity" for all days

**Problem**: Database table is empty or not fetching correctly

**Solution**:
1. Check if `user_activity` table exists in Supabase
2. Verify RLS policies allow SELECT
3. Check browser console for errors
4. Test query in Supabase SQL Editor

### Colors not showing in dark mode

**Problem**: Tailwind dark mode classes not working

**Solution**:
1. Ensure `darkMode: 'class'` in `tailwind.config.ts`
2. Check that `<html className="dark">` is set
3. Verify dark: variants are included in config

### Dates are wrong timezone

**Problem**: ISO dates converting to wrong timezone

**Solution**: Always use `.toISOString().split('T')[0]` for date-only strings

## Performance Tips

1. **Cache activity data**: Use SWR or React Query
2. **Lazy load**: Only fetch when widget is visible
3. **Debounce updates**: Don't refetch on every activity
4. **Optimize queries**: Use proper indexes in database

## Next Steps

After integration:

1. Add analytics tracking for heatmap interactions
2. Create detailed activity modal (on day click)
3. Add activity export/share functionality
4. Implement streak notifications
5. Add weekly email summaries

---

**Need Help?**
- Check `/components/profile/README.md` for full documentation
- See `/components/profile/ActivityHeatmapExample.tsx` for code examples
- Review `/components/profile/ActivityHeatmapDemo.tsx` for live demo

**Files Created**:
- ✅ `/components/profile/ActivityHeatmap.tsx` - Main component
- ✅ `/components/profile/ActivityHeatmapExample.tsx` - Usage examples
- ✅ `/components/profile/ActivityHeatmapDemo.tsx` - Live demo
- ✅ `/components/profile/README.md` - Full documentation
- ✅ `/components/profile/INTEGRATION_GUIDE.md` - This file
