"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  GraduationCap,
  Trophy,
  TrendingUp,
  Target,
  Clock,
  Calendar,
  Brain,
  BarChart3,
  Plus,
  History,
  Star,
  Eye
} from 'lucide-react';

interface ExamDashboardProps {
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
    plan: 'free' | 'student' | 'premium';
  };
}

interface UserStats {
  totalExams: number;
  averageScore: number;
  currentStreak: number;
  longestStreak: number;
  recentExams: ExamHistory[];
}

interface ExamHistory {
  id: string;
  folderName: string;
  score: number;
  percentage: number;
  completedAt: string;
  timeSpent: number;
  questionCount: number;
}

export default function ExamDashboard({ user }: ExamDashboardProps) {
  const router = useRouter();
  const [userStats, setUserStats] = useState<UserStats>({
    totalExams: 0,
    averageScore: 0,
    currentStreak: 0,
    longestStreak: 0,
    recentExams: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      // TODO: Replace with actual API call
      // For now, mock data
      setUserStats({
        totalExams: 0,
        averageScore: 0,
        currentStreak: 0,
        longestStreak: 0,
        recentExams: []
      });
      setLoading(false);
    } catch (error) {
      console.error('Error loading exam stats:', error);
      setLoading(false);
    }
  };

  const handleCreateExam = () => {
    router.push('/dashboard/exams/create');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Exam Center
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test your knowledge with AI-generated exams from your notes
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.totalExams}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats.totalExams > 0 ? Math.round(userStats.averageScore) : 0}%
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.currentStreak}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Longest Streak</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats.longestStreak}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Get started with exam practice</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button 
                onClick={handleCreateExam}
                className="h-auto p-6 flex flex-col items-start space-y-2"
              >
                <div className="flex items-center gap-2 w-full">
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Exam</span>
                </div>
                <p className="text-sm text-left opacity-90">
                  Generate practice tests from your lecture notes
                </p>
              </Button>

              <Button 
                variant="outline"
                onClick={() => router.push('/dashboard/exams/history')}
                className="h-auto p-6 flex flex-col items-start space-y-2"
              >
                <div className="flex items-center gap-2 w-full">
                  <History className="w-5 h-5" />
                  <span className="font-medium">Exam History</span>
                </div>
                <p className="text-sm text-left opacity-70">
                  Review your past exam attempts and scores
                </p>
              </Button>
            </CardContent>
          </Card>

          {/* Study Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                Exam Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Practice regularly with short, focused exam sessions
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Review incorrect answers to identify knowledge gaps
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-purple-500 mt-1.5"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Use spaced repetition for better long-term retention
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 mt-1.5"></div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mix different topics to improve critical thinking
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Recent Exams
              </CardTitle>
            </CardHeader>
            <CardContent>
              {userStats.recentExams.length === 0 ? (
                <div className="text-center py-8">
                  <GraduationCap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500 mb-3">No exams taken yet</p>
                  <Button size="sm" onClick={handleCreateExam}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Exam
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userStats.recentExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{exam.folderName}</h4>
                        <p className="text-xs text-gray-500">
                          {exam.questionCount} questions • {Math.round(exam.timeSpent / 60)}m
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={exam.percentage >= 80 ? 'default' : exam.percentage >= 60 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {exam.percentage}%
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => router.push(`/dashboard/exams/review/${exam.id}`)}
                          className="h-8 w-8 p-0"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Chart Placeholder */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Weekly Progress</span>
                  <span>0 / 3 exams</span>
                </div>
                <Progress value={0} className="h-2" />
                <p className="text-xs text-gray-500">
                  Take 3 exams this week to maintain your streak
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}