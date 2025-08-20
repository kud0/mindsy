import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Trophy,
  AlertTriangle,
  Calendar,
  Folder,
  Brain,
  Zap,
  Timer,
  Award,
  BookOpen,
  Home,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight
} from 'lucide-react';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

interface PerformanceProps {
  onNavigate?: (path: string) => void;
  desktopSidebarOpen?: boolean;
  onDesktopSidebarToggle?: () => void;
}

interface PerformanceData {
  totalExams: number;
  averageScore: number;
  totalTimeSpent: number;
  scoreTrends: Array<{
    date: string;
    score: number;
    folderName: string;
  }>;
  folderPerformance: Array<{
    folder: string;
    attempts: number;
    averageScore: number;
    bestScore: number;
    averageTimePerQuestion: number;
    totalQuestions: number;
  }>;
  topicPerformance: Array<{
    topic: string;
    accuracy: number;
    correct: number;
    total: number;
  }>;
  difficultyAnalysis: {
    easy: { correct: number; total: number };
    medium: { correct: number; total: number };
    hard: { correct: number; total: number };
  };
  timeAnalysis: {
    averageTimePerQuestion: number;
    fastestExam: { time: number; folder: string; date: string } | null;
    slowestExam: { time: number; folder: string; date: string } | null;
  };
  weeklyPerformance: Array<{
    week: string;
    exams: number;
    averageScore: number;
  }>;
  improvementAreas: Array<{
    topic: string;
    accuracy: number;
    correct: number;
    total: number;
  }>;
}

export function Performance({ onNavigate, desktopSidebarOpen, onDesktopSidebarToggle }: PerformanceProps) {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      const response = await fetch('/api/exam/performance', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setPerformanceData(data);
      } else {
        toast({
          title: "Failed to load performance data",
          description: "Could not retrieve performance analytics",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error loading performance",
        description: "An error occurred while loading performance data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDifficultyAccuracy = (difficulty: 'easy' | 'medium' | 'hard') => {
    const data = performanceData?.difficultyAnalysis[difficulty];
    return data && data.total > 0 ? (data.correct / data.total) * 100 : 0;
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading performance data...</p>
        </div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              No Performance Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Take some exams to see your performance analytics here.
            </p>
            <Button onClick={() => onNavigate?.('/dashboard/exams')} className="w-full">
              <Target className="h-4 w-4 mr-2" />
              Take Your First Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="container max-w-7xl mx-auto p-6 space-y-6">
        {/* Breadcrumb with Sidebar Toggle */}
        <div className="flex items-center gap-4">
          {onDesktopSidebarToggle && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDesktopSidebarToggle}
              className="h-8 w-8 hover:bg-accent hidden lg:flex flex-shrink-0"
              title={desktopSidebarOpen ? "Close sidebar" : "Open sidebar"}
            >
              {desktopSidebarOpen ? (
                <PanelLeftClose className="h-4 w-4" />
              ) : (
                <PanelLeftOpen className="h-4 w-4" />
              )}
            </Button>
          )}

          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  className="cursor-pointer flex items-center gap-1"
                  onClick={() => onNavigate?.('/dashboard/new')}
                >
                  <Home className="h-4 w-4" />
                  Dashboard
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  className="cursor-pointer"
                  onClick={() => onNavigate?.('/dashboard/exams')}
                >
                  Exam Center
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                <BreadcrumbPage>Performance</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Performance Analytics</h2>
            <p className="text-muted-foreground">
              Detailed insights into your exam performance and learning progress
            </p>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exams</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceData.totalExams}</div>
              <p className="text-xs text-muted-foreground">
                Completed successfully
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={cn("text-2xl font-bold", getScoreColor(performanceData.averageScore))}>
                {Math.round(performanceData.averageScore)}%
              </div>
              <p className="text-xs text-muted-foreground">
                Across all exams
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Study Time</CardTitle>
              <Timer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Math.round(performanceData.totalTimeSpent / 3600)}h
              </div>
              <p className="text-xs text-muted-foreground">
                {formatTime(performanceData.timeAnalysis.averageTimePerQuestion)}/question avg
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Improvement Areas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{performanceData.improvementAreas.length}</div>
              <p className="text-xs text-muted-foreground">
                Topics to focus on
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics */}
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="topics">By Topic</TabsTrigger>
            <TabsTrigger value="folders">By Folder</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Difficulty Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Difficulty Analysis
                  </CardTitle>
                  <CardDescription>Performance by question difficulty</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(['easy', 'medium', 'hard'] as const).map(difficulty => {
                    const accuracy = getDifficultyAccuracy(difficulty);
                    const data = performanceData.difficultyAnalysis[difficulty];
                    
                    return (
                      <div key={difficulty} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize font-medium">{difficulty}</span>
                          <span className={getScoreColor(accuracy)}>{Math.round(accuracy)}%</span>
                        </div>
                        <Progress value={accuracy} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {data.correct} correct out of {data.total} questions
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Time Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Time Analysis
                  </CardTitle>
                  <CardDescription>Your exam timing patterns</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Avg per Question</p>
                      <p className="text-2xl font-bold">
                        {formatTime(performanceData.timeAnalysis.averageTimePerQuestion)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Total Study Time</p>
                      <p className="text-2xl font-bold">
                        {Math.round(performanceData.totalTimeSpent / 3600)}h
                      </p>
                    </div>
                  </div>
                  
                  {performanceData.timeAnalysis.fastestExam && (
                    <div className="pt-2 border-t">
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <Zap className="h-4 w-4" />
                        <span>Fastest: {performanceData.timeAnalysis.fastestExam.folder}</span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-6">
                        {formatTime(performanceData.timeAnalysis.fastestExam.time)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Improvement Areas */}
            {performanceData.improvementAreas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    Focus Areas
                  </CardTitle>
                  <CardDescription>Topics that need more attention</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {performanceData.improvementAreas.map(area => (
                      <div key={area.topic} className="p-4 border rounded-lg bg-yellow-50 dark:bg-yellow-950">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-sm">{area.topic}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(area.accuracy)}%
                          </Badge>
                        </div>
                        <Progress value={area.accuracy} className="h-1 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {area.correct}/{area.total} correct
                        </p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="topics" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Topic Performance
                </CardTitle>
                <CardDescription>How well you perform in different topics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.topicPerformance
                    .sort((a, b) => b.accuracy - a.accuracy)
                    .map(topic => (
                      <div key={topic.topic} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <h4 className="font-medium">{topic.topic}</h4>
                          <p className="text-sm text-muted-foreground">
                            {topic.correct} correct out of {topic.total} questions
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className={cn("text-lg font-bold", getScoreColor(topic.accuracy))}>
                              {Math.round(topic.accuracy)}%
                            </div>
                          </div>
                          <div className="w-20">
                            <Progress value={topic.accuracy} className="h-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="folders" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  Folder Performance
                </CardTitle>
                <CardDescription>Performance breakdown by study folder</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {performanceData.folderPerformance
                    .sort((a, b) => b.averageScore - a.averageScore)
                    .map(folder => (
                      <div key={folder.folder} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-medium">{folder.folder}</h4>
                            <p className="text-sm text-muted-foreground">
                              {folder.attempts} exams • {folder.totalQuestions} questions
                            </p>
                          </div>
                          <div className="text-right">
                            <div className={cn("text-xl font-bold", getScoreColor(folder.averageScore))}>
                              {Math.round(folder.averageScore)}%
                            </div>
                            <p className="text-xs text-muted-foreground">avg</p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Best Score</p>
                            <p className="font-bold text-green-600">{Math.round(folder.bestScore)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Avg Time/Question</p>
                            <p className="font-bold">{formatTime(folder.averageTimePerQuestion)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Weekly Performance
                </CardTitle>
                <CardDescription>Your performance trends over the past 8 weeks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {performanceData.weeklyPerformance.map((week, index) => (
                    <div key={week.week} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{week.week}</h4>
                        <p className="text-sm text-muted-foreground">{week.exams} exams taken</p>
                      </div>
                      <div className="flex items-center gap-3">
                        {week.exams > 0 ? (
                          <>
                            <div className={cn("text-lg font-bold", getScoreColor(week.averageScore))}>
                              {Math.round(week.averageScore)}%
                            </div>
                            <div className="w-20">
                              <Progress value={week.averageScore} className="h-2" />
                            </div>
                          </>
                        ) : (
                          <div className="text-muted-foreground">No exams</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}