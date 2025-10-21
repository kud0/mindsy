"use client"

import React from 'react';
import { ActivityHeatmap, ActivityDay } from './ActivityHeatmap';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Demo component to showcase the ActivityHeatmap
 *
 * This can be used in:
 * - Profile widget
 * - Settings page
 * - Activity dashboard
 * - Stats overview
 */

// Generate realistic demo data
function generateDemoData(): ActivityDay[] {
  const data: ActivityDay[] = [];
  const today = new Date();

  // Patterns to make it look realistic
  const weekdayBoost = [0.5, 1, 1, 1, 1, 0.8, 0.3]; // Mon-Sun multiplier
  const trendingUp = [0.6, 0.7, 0.8, 0.9]; // Week 1-4 multiplier

  for (let i = 27; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateString = date.toISOString().split('T')[0];

    const dayOfWeek = date.getDay();
    const weekIndex = Math.floor((27 - i) / 7);

    // Apply realistic patterns
    const baseFactor = weekdayBoost[dayOfWeek] * trendingUp[weekIndex];

    // Random activity with patterns
    const pomodoros = Math.floor(Math.random() * 6 * baseFactor);
    const questions = Math.floor(Math.random() * 25 * baseFactor);
    const battles = Math.floor(Math.random() * 3 * baseFactor);
    const exams = Math.random() > 0.85 ? 1 : 0; // Exams are rare

    // Calculate score
    const score = pomodoros * 2 + Math.floor(questions / 5) + battles * 3 + exams * 5;

    // Determine intensity
    let intensity: 'none' | 'low' | 'medium' | 'high' = 'none';
    if (score > 0 && score <= 3) intensity = 'low';
    else if (score > 3 && score <= 7) intensity = 'medium';
    else if (score > 7) intensity = 'high';

    data.push({
      date: dateString,
      pomodoros,
      questions,
      battles,
      exams,
      score,
      intensity
    });
  }

  return data;
}

export function ActivityHeatmapDemo() {
  const demoData = generateDemoData();

  // Calculate stats
  const totalActivities = demoData.reduce((sum, day) =>
    sum + day.pomodoros + day.questions + day.battles + day.exams, 0
  );
  const activeDays = demoData.filter(d => d.score > 0).length;
  const totalScore = demoData.reduce((sum, day) => sum + day.score, 0);
  const averageScore = Math.round(totalScore / 28);

  // Calculate streak
  let currentStreak = 0;
  for (let i = demoData.length - 1; i >= 0; i--) {
    if (demoData[i].score > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  const handleDayClick = (date: string) => {
    const dayData = demoData.find(d => d.date === date);
    if (dayData) {
      alert(`
Activity Details for ${date}:

📚 ${dayData.pomodoros} Pomodoro sessions
❓ ${dayData.questions} Questions answered
⚔️ ${dayData.battles} Quiz battles
📝 ${dayData.exams} Exams taken

Total Score: ${dayData.score} points
Intensity: ${dayData.intensity}
      `);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Active Days</CardDescription>
            <CardTitle className="text-3xl">{activeDays}/28</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Current Streak</CardDescription>
            <CardTitle className="text-3xl">
              {currentStreak} 🔥
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Activities</CardDescription>
            <CardTitle className="text-3xl">{totalActivities}</CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Avg Daily Score</CardDescription>
            <CardTitle className="text-3xl">{averageScore}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Heatmap Card */}
      <Card>
        <CardHeader>
          <CardTitle>Activity Heatmap</CardTitle>
          <CardDescription>
            Your learning activity over the last 28 days. Click any day to see details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ActivityHeatmap
            data={demoData}
            onDayClick={handleDayClick}
          />
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-semibold mb-2">Color Legend:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>⬜ <strong>Gray</strong> - No activity (score = 0)</li>
              <li>🟦 <strong>Light Blue</strong> - Low activity (score 1-3)</li>
              <li>🟩 <strong>Medium Green</strong> - Medium activity (score 4-7)</li>
              <li>🟢 <strong>Dark Green</strong> - High activity (score 8+)</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Scoring System:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>📚 Pomodoro session = 2 points</li>
              <li>❓ 5 Questions answered = 1 point</li>
              <li>⚔️ Quiz battle = 3 points</li>
              <li>📝 Exam taken = 5 points</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Interactions:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>🖱️ Hover over any day to see tooltip with details</li>
              <li>👆 Click any day to view full activity breakdown</li>
              <li>⌨️ Use Tab to navigate, Enter to select</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[0, 1, 2, 3].map(weekIndex => {
              const weekStart = weekIndex * 7;
              const weekEnd = weekStart + 7;
              const weekData = demoData.slice(weekStart, weekEnd);
              const weekScore = weekData.reduce((sum, d) => sum + d.score, 0);
              const weekActivities = weekData.reduce((sum, d) =>
                sum + d.pomodoros + d.questions + d.battles + d.exams, 0
              );

              return (
                <div key={weekIndex} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <div className="font-semibold">Week {weekIndex + 1}</div>
                    <div className="text-xs text-muted-foreground">
                      {weekData[0]?.date} to {weekData[6]?.date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{weekScore} points</div>
                    <div className="text-xs text-muted-foreground">
                      {weekActivities} activities
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
