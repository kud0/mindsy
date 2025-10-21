"use client"

import React, { useEffect, useState } from 'react';
import { GraduationCap, Plus, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BaseWidget } from './BaseWidget';
import { Progress } from '@/components/ui/progress';
import { ExamQuest } from '@/components/profile/ExamQuest';

interface ExamAttempt {
  id: string;
  examTitle: string;
  percentage: number;
  completedAt: string;
}

interface ExamStats {
  totalExams: number;
  averageScore: number;
  currentStreak: number;
  longestStreak: number;
  xpPoints: number;
  level: number;
  recentExams: ExamAttempt[];
}

export function ExamsWidget() {
  const [stats, setStats] = useState<ExamStats>({
    totalExams: 0,
    averageScore: 0,
    currentStreak: 0,
    longestStreak: 0,
    xpPoints: 0,
    level: 1,
    recentExams: []
  });
  const [loading, setLoading] = useState(true);
  const [quest, setQuest] = useState<any>(null);

  useEffect(() => {
    fetchExamStats();
  }, []);

  useEffect(() => {
    const fetchQuest = async () => {
      try {
        const res = await fetch('/api/profile/daily-quests?questId=2');
        const { data } = await res.json();
        setQuest(data?.quest || null);
      } catch (error) {
        console.error('Failed to fetch exam quest:', error);
      }
    };

    fetchQuest();

    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchQuest, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchExamStats = async () => {
    try {
      const response = await fetch('/api/exam/stats');
      if (response.ok) {
        const data = await response.json();
        setStats({
          totalExams: data.totalExams || 0,
          averageScore: data.averageScore || 0,
          currentStreak: data.currentStreak || 0,
          longestStreak: data.longestStreak || 0,
          xpPoints: data.xpPoints || 0,
          level: data.level || 1,
          recentExams: data.recentExams || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch exam stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <BaseWidget
      title="Exams"
      iconImage="/images/graduation.png"
      href="/dashboard/exams"
      color="text-green-600 dark:text-green-400"
      bgColor="bg-green-100 dark:bg-green-900/30"
      loading={loading}
      actions={
        <Button 
          variant="ghost"
          size="icon"
          onClick={() => window.location.href = '/dashboard/exams'}
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      }
    >
      {stats.totalExams === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <img
            src="/images/graduation.png"
            alt="Graduation"
            className="w-12 h-12 opacity-50 mb-3 object-contain"
          />
          <p className="text-sm text-muted-foreground">No exams yet</p>
          <p className="text-xs text-muted-foreground mt-1">Create your first exam to get started</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 rounded-lg ">
              <p className="text-lg font-bold text-primary">{stats.totalExams}</p>
              <p className="text-xs text-muted-foreground">Exams</p>
            </div>
            <div className="p-2 rounded-lg ">
              <p className="text-lg font-bold text-primary">{stats.averageScore}%</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </div>
            <div className="p-2 rounded-lg ">
              <p className="text-lg font-bold text-primary">L{stats.level}</p>
              <p className="text-xs text-muted-foreground">{stats.xpPoints} XP</p>
            </div>
          </div>

          {/* Performance Progress */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Performance</span>
              <span className="font-medium">{stats.averageScore}%</span>
            </div>
            <Progress value={stats.averageScore} className="h-2" />
          </div>

          {/* Recent Exam or Achievement */}
          {stats.recentExams.length > 0 ? (
            <div className="p-3 rounded-lg ">
              <p className="text-sm font-medium truncate">
                {stats.recentExams[0].examTitle}
              </p>
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-muted-foreground">
                  {new Date(stats.recentExams[0].completedAt).toLocaleDateString()}
                </span>
                <span className="text-xs font-medium text-primary">
                  {stats.recentExams[0].percentage}%
                </span>
              </div>
            </div>
          ) : stats.averageScore >= 80 ? (
            <div className="flex items-center justify-center p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
              <Trophy className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mr-2" />
              <span className="text-sm font-medium">Great Performance!</span>
            </div>
          ) : null}

          {/* Streak indicator */}
          {stats.currentStreak > 0 && (
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                🔥 {stats.currentStreak} day streak
              </p>
            </div>
          )}

          {/* ExamQuest - placed at bottom */}
          {quest && <ExamQuest quest={quest} onComplete={fetchExamStats} />}
        </div>
      )}
    </BaseWidget>
  );
}