'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ExamCreator } from './ExamCreator';
import { ExamTaker } from './ExamTaker';
import { ExamResults } from './ExamResults';
import { ExamReview } from './ExamReview';
import { cn } from '@/lib/utils';
import { 
  GraduationCap,
  Trophy,
  Target,
  Clock,
  Award,
  Flame,
  Brain,
  History,
  Zap,
  Star,
  Plus,
  Eye,
  Home,
  ChevronRight
} from 'lucide-react';

interface Folder {
  id: string;
  name: string;
  count: number;
}

interface ExamDashboardProps {
  initialFolders?: Folder[];
}

type ViewMode = 'dashboard' | 'create' | 'take' | 'results' | 'review';

interface UserStats {
  totalExams: number;
  averageScore: number;
  currentStreak: number;
  longestStreak: number;
  xpPoints: number;
  level: number;
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

interface ExamData {
  id: string;
  title: string;
  questions: any[];
  questionCount: number;
  difficulty: string;
  folderName: string;
}

export function ExamDashboard({ initialFolders = [] }: ExamDashboardProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [currentExam, setCurrentExam] = useState<ExamData | null>(null);
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    totalExams: 0,
    averageScore: 0,
    currentStreak: 0,
    longestStreak: 0,
    xpPoints: 0,
    level: 1,
    recentExams: []
  });
  const [folders] = useState<Folder[]>(initialFolders);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    try {
      const response = await fetch('/api/exam/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserStats(data);
      } else {
        console.error('Failed to load stats:', response.status);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExamCreated = async (examId: string) => {
    // Load the exam and start taking it
    try {
      const response = await fetch(`/api/exam/${examId}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const exam = await response.json();
        setCurrentExam(exam);
        setViewMode('take');
      }
    } catch (error) {
      console.error('Error loading exam:', error);
    }
  };

  const handleExamComplete = (results: any) => {
    setCurrentExam(prev => prev ? { ...prev, results } : null);
    setViewMode('results');
    loadUserStats(); // Refresh stats
  };

  const handleRetakeExam = () => {
    setViewMode('create');
  };

  const handleGoHome = () => {
    setViewMode('dashboard');
    setCurrentExam(null);
    setReviewAttemptId(null);
  };

  const handleReviewExam = (attemptId: string) => {
    setReviewAttemptId(attemptId);
    setViewMode('review');
  };

  const getStreakColor = (streak: number) => {
    if (streak === 0) return 'text-gray-500';
    if (streak < 3) return 'text-orange-500';
    if (streak < 7) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getLevelProgress = () => {
    const currentLevelXP = (userStats.level - 1) * 1000;
    const nextLevelXP = userStats.level * 1000;
    const progressXP = userStats.xpPoints - currentLevelXP;
    return (progressXP / 1000) * 100;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading exam center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-4">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              <li className="inline-flex items-center">
                <button 
                  onClick={() => setViewMode('dashboard')}
                  className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-muted-foreground dark:hover:text-white"
                >
                  <Home className="w-3 h-3 mr-2.5" />
                  Dashboard
                </button>
              </li>
              <li aria-current="page">
                <div className="flex items-center">
                  <ChevronRight className="w-3 h-3 text-muted-foreground mx-1" />
                  <span className="ml-1 text-sm font-medium text-gray-500 md:ml-2 dark:text-muted-foreground">
                    Exam Center
                  </span>
                </div>
              </li>
            </ol>
          </nav>
        </div>

        {viewMode === 'dashboard' && (
          <>
            {/* Header */}
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-3xl font-bold tracking-tight">Exam Center</h2>
                <p className="text-muted-foreground">
                  Test your knowledge and track your progress
                </p>
              </div>
              <Button onClick={() => setViewMode('create')} size="lg">
                <Plus className="h-4 w-4 mr-2" />
                New Exam
              </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
                  <Flame className={cn("h-4 w-4", getStreakColor(userStats.currentStreak))} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.currentStreak} days</div>
                  <p className="text-xs text-muted-foreground">
                    Best: {userStats.longestStreak} days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(userStats.averageScore)}%</div>
                  <p className="text-xs text-muted-foreground">
                    From {userStats.totalExams} exams
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Level</CardTitle>
                  <Star className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Level {userStats.level}</div>
                  <Progress value={getLevelProgress()} className="h-1 mt-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {userStats.xpPoints % 1000}/1000 XP
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total XP</CardTitle>
                  <Zap className="h-4 w-4 text-purple-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{userStats.xpPoints.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    Experience points earned
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Recent Exams and Quick Actions */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Recent Exams */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Exams
                  </CardTitle>
                  <CardDescription>Your latest exam attempts</CardDescription>
                </CardHeader>
                <CardContent>
                  {userStats.recentExams.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>No exams taken yet</p>
                      <Button 
                        onClick={() => setViewMode('create')} 
                        variant="outline" 
                        className="mt-3"
                      >
                        Take Your First Exam
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {userStats.recentExams.slice(0, 5).map((exam) => (
                        <div
                          key={exam.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex-1">
                            <p className="font-medium">{exam.folderName}</p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                              <span>{exam.questionCount} questions</span>
                              <span>•</span>
                              <span>{Math.floor(exam.timeSpent / 60)}m</span>
                              <span>•</span>
                              <span>{new Date(exam.completedAt).toLocaleDateString()}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={cn(
                                "text-2xl font-bold",
                                exam.percentage >= 70 ? "text-green-600" : "text-red-600"
                              )}>
                                {Math.round(exam.percentage)}%
                              </div>
                              <Badge variant={exam.percentage >= 70 ? "default" : "secondary"}>
                                {exam.percentage >= 70 ? "Passed" : "Failed"}
                              </Badge>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleReviewExam(exam.id)}
                              className="h-8"
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              Review
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Study Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Study Tips
                  </CardTitle>
                  <CardDescription>Recommendations based on your performance</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg bg-accent/30/20">
                    <h4 className="font-medium mb-2">🎯 Focus Areas</h4>
                    <p className="text-sm text-muted-foreground">
                      Based on recent exams, consider reviewing topics where you scored below 70%
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <h4 className="font-medium mb-2">🏆 Keep It Up!</h4>
                    <p className="text-sm text-muted-foreground">
                      {userStats.currentStreak > 0 
                        ? `You're on a ${userStats.currentStreak} day streak! Don't break it!`
                        : "Start a streak by taking an exam today!"}
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-950/20">
                    <h4 className="font-medium mb-2">💡 Pro Tip</h4>
                    <p className="text-sm text-muted-foreground">
                      Review your incorrect answers immediately after each exam for better retention
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Achievements Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Achievements
                </CardTitle>
                <CardDescription>Milestones you've unlocked</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { name: 'First Steps', icon: '🎯', unlocked: userStats.totalExams > 0 },
                    { name: 'Perfectionist', icon: '💯', unlocked: false },
                    { name: 'Speed Demon', icon: '⚡', unlocked: false },
                    { name: 'Streak Master', icon: '🔥', unlocked: userStats.longestStreak >= 7 },
                  ].map((achievement) => (
                    <div
                      key={achievement.name}
                      className={cn(
                        "text-center p-4 rounded-lg border",
                        achievement.unlocked 
                          ? "bg-gradient-to-br from-yellow-50/80 to-orange-50/80 border-yellow-300/50 dark:from-yellow-900/20 dark:to-orange-900/20 dark:border-yellow-500/30" 
                          : "bg-muted/50 border-border opacity-50"
                      )}
                    >
                      <div className="text-3xl mb-2">{achievement.icon}</div>
                      <p className="text-sm font-medium">{achievement.name}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {viewMode === 'create' && (
          <ExamCreator
            folders={folders}
            onExamCreated={handleExamCreated}
          />
        )}

        {viewMode === 'take' && currentExam && (
          <ExamTaker
            examId={currentExam.id}
            questions={currentExam.questions}
            examTitle={currentExam.title}
            onComplete={handleExamComplete}
            onExit={handleGoHome}
          />
        )}

        {viewMode === 'results' && currentExam?.results && (
          <ExamResults
            {...currentExam.results}
            onRetakeExam={handleRetakeExam}
            onGoHome={handleGoHome}
          />
        )}

        {viewMode === 'review' && reviewAttemptId && (
          <ExamReview
            attemptId={reviewAttemptId}
            onBack={handleGoHome}
          />
        )}
      </div>
    </div>
  );
}