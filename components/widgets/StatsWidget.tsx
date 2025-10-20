"use client"

import React, { useEffect, useState } from 'react';
import { TrendingUp, BookOpen, Award, TrendingUp as TrendingUpIcon } from 'lucide-react';
import { BaseWidget } from './BaseWidget';
import { Progress } from '@/components/ui/progress';

export function StatsWidget() {
  const [stats, setStats] = useState({
    totalStudyHours: 0,
    weeklyGoal: 20,
    completedLectures: 0,
    averageScore: 0,
    streak: 0,
    lecturesTrend: 0,
    scoreTrend: 0
  });

  useEffect(() => {
    // Mock data - will connect to real data later
    setStats({
      totalStudyHours: 12.5,
      weeklyGoal: 20,
      completedLectures: 8,
      averageScore: 85,
      streak: 5,
      lecturesTrend: 3,  // +3 from last week
      scoreTrend: 5       // +5% from last week
    });
  }, []);

  const weeklyProgress = (stats.totalStudyHours / stats.weeklyGoal) * 100;

  return (
    <BaseWidget
      title="Study Stats"
      iconImage="/images/statistics.png"
      href="/dashboard"
      color="text-blue-600 dark:text-blue-400"
      bgColor="bg-blue-100 dark:bg-blue-900/30"
    >
      <div className="space-y-4">
        {/* Weekly Goal Progress - Now Primary Metric */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground font-medium">Weekly Goal</span>
            <span className="font-semibold">{stats.totalStudyHours}h / {stats.weeklyGoal}h</span>
          </div>
          <Progress
            value={weeklyProgress}
            className="h-3 bg-muted/50"
          />
          <p className="text-xs text-muted-foreground text-right">
            {Math.round(weeklyProgress)}% complete
          </p>
        </div>

        {/* Stats Grid - Side by Side Cards */}
        <div className="grid grid-cols-2 gap-3">
          {/* Lectures Card */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              {stats.lecturesTrend > 0 && (
                <div className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                  <TrendingUpIcon className="h-3 w-3" />
                  <span className="text-[10px] font-medium">+{stats.lecturesTrend}</span>
                </div>
              )}
            </div>
            <p className="text-2xl font-bold mb-0.5">{stats.completedLectures}</p>
            <p className="text-xs text-muted-foreground">Lectures</p>
            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">
              This week
            </p>
          </div>

          {/* Average Score Card */}
          <div className="p-3 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center justify-between mb-2">
              <Award className="h-4 w-4 text-muted-foreground" />
              {stats.scoreTrend > 0 && (
                <div className="flex items-center gap-0.5 text-green-600 dark:text-green-400">
                  <TrendingUpIcon className="h-3 w-3" />
                  <span className="text-[10px] font-medium">+{stats.scoreTrend}%</span>
                </div>
              )}
            </div>
            <p className="text-2xl font-bold mb-0.5">{stats.averageScore}%</p>
            <p className="text-xs text-muted-foreground">Avg Score</p>
            <p className="text-[10px] text-green-600 dark:text-green-400 mt-1">
              Improving
            </p>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
}