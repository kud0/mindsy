"use client"

import React from 'react';
import { ActivityHeatmap, ActivityDay } from './ActivityHeatmap';

/**
 * Example usage of the ActivityHeatmap component
 *
 * This demonstrates how to:
 * 1. Generate sample activity data
 * 2. Calculate intensity levels
 * 3. Handle day clicks
 * 4. Integrate with the Profile Widget
 */

// Helper function to calculate intensity based on score
function calculateIntensity(score: number): 'none' | 'low' | 'medium' | 'high' {
  if (score === 0) return 'none';
  if (score <= 3) return 'low';
  if (score <= 7) return 'medium';
  return 'high';
}

// Generate sample activity data for the last 28 days
function generateSampleData(): ActivityDay[] {
  const data: ActivityDay[] = [];
  const today = new Date();

  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    // Random activity data (you would fetch this from your database)
    const pomodoros = Math.floor(Math.random() * 5);
    const questions = Math.floor(Math.random() * 20);
    const battles = Math.floor(Math.random() * 3);
    const exams = Math.floor(Math.random() * 2);

    // Calculate score (customize this based on your point system)
    const score = pomodoros * 2 + Math.floor(questions / 5) + battles * 3 + exams * 5;

    data.push({
      date: dateString,
      pomodoros,
      questions,
      battles,
      exams,
      score,
      intensity: calculateIntensity(score)
    });
  }

  return data;
}

export function ActivityHeatmapExample() {
  const sampleData = generateSampleData();

  const handleDayClick = (date: string) => {
    console.log('Clicked date:', date);
    // You can open a modal here showing detailed activity for that day
    // Example: router.push(`/dashboard/activity/${date}`)
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6">
      <div className="bg-card rounded-2xl p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-6 text-foreground">Activity Heatmap</h2>
        <ActivityHeatmap
          data={sampleData}
          onDayClick={handleDayClick}
        />
      </div>
    </div>
  );
}

/**
 * INTEGRATION EXAMPLE: Adding to Profile Widget
 *
 * To add the ActivityHeatmap to your ProfileWidget:
 *
 * 1. Fetch real activity data from your database:
 *
 * ```typescript
 * const fetchActivityData = async (userId: string): Promise<ActivityDay[]> => {
 *   const supabase = createClient();
 *
 *   // Example query - adjust based on your schema
 *   const { data, error } = await supabase
 *     .from('user_activity')
 *     .select('date, pomodoros, questions, battles, exams, score')
 *     .eq('user_id', userId)
 *     .gte('date', getDate28DaysAgo())
 *     .order('date', { ascending: true });
 *
 *   if (error) throw error;
 *
 *   return data.map(d => ({
 *     ...d,
 *     intensity: calculateIntensity(d.score)
 *   }));
 * };
 * ```
 *
 * 2. Add to your ProfileWidget component:
 *
 * ```tsx
 * import { ActivityHeatmap } from '@/components/profile/ActivityHeatmap';
 *
 * export function ProfileWidget() {
 *   const [activityData, setActivityData] = useState<ActivityDay[]>([]);
 *
 *   useEffect(() => {
 *     const loadActivity = async () => {
 *       const data = await fetchActivityData(user.id);
 *       setActivityData(data);
 *     };
 *
 *     loadActivity();
 *   }, [user.id]);
 *
 *   return (
 *     <div className="...">
 *       {/* Existing profile content *\/}
 *
 *       {/* Activity Heatmap Section *\/}
 *       <div className="mt-6">
 *         <ActivityHeatmap
 *           data={activityData}
 *           onDayClick={(date) => router.push(`/dashboard/activity/${date}`)}
 *         />
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 *
 * 3. Database schema suggestion (if not already exists):
 *
 * ```sql
 * CREATE TABLE user_activity (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   user_id UUID REFERENCES users(id) ON DELETE CASCADE,
 *   date DATE NOT NULL,
 *   pomodoros INTEGER DEFAULT 0,
 *   questions INTEGER DEFAULT 0,
 *   battles INTEGER DEFAULT 0,
 *   exams INTEGER DEFAULT 0,
 *   score INTEGER DEFAULT 0,
 *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
 *   UNIQUE(user_id, date)
 * );
 *
 * CREATE INDEX idx_user_activity_user_date ON user_activity(user_id, date);
 * ```
 *
 * 4. Track activities in your app:
 *
 * ```typescript
 * // When user completes a pomodoro
 * await incrementActivity(userId, 'pomodoros', 1);
 *
 * // When user answers questions
 * await incrementActivity(userId, 'questions', 5);
 *
 * // When user completes a battle
 * await incrementActivity(userId, 'battles', 1);
 *
 * // When user takes an exam
 * await incrementActivity(userId, 'exams', 1);
 *
 * // Helper function
 * async function incrementActivity(
 *   userId: string,
 *   activityType: 'pomodoros' | 'questions' | 'battles' | 'exams',
 *   amount: number
 * ) {
 *   const today = new Date().toISOString().split('T')[0];
 *
 *   const { data, error } = await supabase
 *     .rpc('increment_activity', {
 *       p_user_id: userId,
 *       p_date: today,
 *       p_activity_type: activityType,
 *       p_amount: amount
 *     });
 *
 *   if (error) throw error;
 *   return data;
 * }
 * ```
 */

// Utility functions for working with activity data

/**
 * Get date string for 28 days ago
 */
export function getDate28DaysAgo(): string {
  const date = new Date();
  date.setDate(date.getDate() - 28);
  return date.toISOString().split('T')[0];
}

/**
 * Calculate weekly totals from activity data
 */
export function calculateWeeklyTotals(data: ActivityDay[]) {
  const weeks = [
    { name: 'W1', total: 0 },
    { name: 'W2', total: 0 },
    { name: 'W3', total: 0 },
    { name: 'W4', total: 0 }
  ];

  data.forEach((day, index) => {
    const weekIndex = Math.floor(index / 7);
    if (weekIndex < 4) {
      weeks[weekIndex].total += day.score;
    }
  });

  return weeks;
}

/**
 * Get the most active day in the dataset
 */
export function getMostActiveDay(data: ActivityDay[]): ActivityDay | null {
  if (data.length === 0) return null;

  return data.reduce((max, day) =>
    day.score > max.score ? day : max
  , data[0]);
}

/**
 * Calculate current streak (consecutive days with activity)
 */
export function calculateCurrentStreak(data: ActivityDay[]): number {
  let streak = 0;

  // Start from most recent day and go backwards
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i].score > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

/**
 * Get activity statistics
 */
export function getActivityStats(data: ActivityDay[]) {
  const totalDays = data.length;
  const activeDays = data.filter(d => d.score > 0).length;
  const totalScore = data.reduce((sum, d) => sum + d.score, 0);
  const averageScore = totalDays > 0 ? Math.round(totalScore / totalDays) : 0;
  const currentStreak = calculateCurrentStreak(data);
  const mostActiveDay = getMostActiveDay(data);

  return {
    totalDays,
    activeDays,
    totalScore,
    averageScore,
    currentStreak,
    mostActiveDay,
    activityRate: totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0
  };
}
