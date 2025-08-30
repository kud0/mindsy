"use client"

import React, { useEffect, useState } from 'react';
import { TrendingUp, BookOpen, Clock, Award } from 'lucide-react';
import { BaseWidget } from './BaseWidget';
import { Progress } from '@/components/ui/progress';

export function StatsWidget() {
  const [stats, setStats] = useState({
    totalStudyHours: 0,
    weeklyGoal: 20,
    completedLectures: 0,
    averageScore: 0,
    streak: 0
  });

  useEffect(() => {
    // Mock data - will connect to real data later
    setStats({
      totalStudyHours: 12.5,
      weeklyGoal: 20,
      completedLectures: 8,
      averageScore: 85,
      streak: 5
    });
  }, []);

  const weeklyProgress = (stats.totalStudyHours / stats.weeklyGoal) * 100;

  return (
    <BaseWidget
      title="Study Stats"
      icon={TrendingUp}
      href="/dashboard"
      color="text-blue-600 dark:text-blue-400"
      bgColor="bg-blue-100 dark:bg-blue-900/30"
    >
      <div className="space-y-4">
        {/* Weekly Goal Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Weekly Goal</span>
            <span className="font-medium">{stats.totalStudyHours}h / {stats.weeklyGoal}h</span>
          </div>
          <Progress value={weeklyProgress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg ">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-3 w-3 text-muted-foreground" />
              <p className="text-lg font-bold">{stats.completedLectures}</p>
            </div>
            <p className="text-xs text-muted-foreground">Lectures</p>
          </div>
          <div className="p-3 rounded-lg ">
            <div className="flex items-center gap-2 mb-1">
              <Award className="h-3 w-3 text-muted-foreground" />
              <p className="text-lg font-bold">{stats.averageScore}%</p>
            </div>
            <p className="text-xs text-muted-foreground">Avg Score</p>
          </div>
        </div>

        {/* Streak */}
        {stats.streak > 0 && (
          <div className="flex items-center justify-center p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
            <span className="text-2xl mr-2">🔥</span>
            <div>
              <p className="text-sm font-medium">{stats.streak} Day Streak!</p>
              <p className="text-xs text-muted-foreground">Keep it going!</p>
            </div>
          </div>
        )}
      </div>
    </BaseWidget>
  );
}