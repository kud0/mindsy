"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  GraduationCap, 
  BookOpen, 
  TrendingUp,
  Clock,
  Award,
  FolderTree,
  ArrowRight,
  Plus,
  Brain,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import UploadWidget from '@/components/upload/UploadWidget';

interface DashboardOverviewProps {
  userName: string;
  totalNotes: number;
  totalStudyNodes: number;
  subscriptionTier: string;
}

export default function DashboardOverview({ 
  userName, 
  totalNotes, 
  totalStudyNodes,
  subscriptionTier 
}: DashboardOverviewProps) {
  const router = useRouter();

  const handleNavigate = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Welcome Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {userName}!
          </h1>
          <p className="text-base text-muted-foreground">
            Your personalized learning dashboard
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <UploadWidget variant="card" />

          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-purple-500"
            onClick={() => handleNavigate('/dashboard/lectures')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent/40 dark:bg-accent/50 rounded-lg">
                  <FolderTree className="w-6 h-6 text-foreground" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Organize Studies</h3>
              <p className="text-sm text-muted-foreground">
                Structure your courses & subjects
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-500"
            onClick={() => handleNavigate('/dashboard/exams')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-secondary/10 dark:bg-secondary/20 rounded-lg">
                  <Brain className="w-6 h-6 text-secondary dark:text-secondary" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Practice Exams</h3>
              <p className="text-sm text-muted-foreground">
                Test your knowledge with AI
              </p>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-orange-500"
            onClick={() => handleNavigate('/dashboard/pomodoro')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-accent/10 dark:bg-accent/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-accent dark:text-accent" />
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg mb-1">Pomodoro Timer</h3>
              <p className="text-sm text-muted-foreground">
                Focus with timed study sessions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Stats & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Study Progress Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5" />
                  Your Study Progress
                </CardTitle>
                <CardDescription>
                  Keep up the great work!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{totalNotes}</div>
                    <div className="text-sm text-muted-foreground">Total Notes</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-secondary">{totalStudyNodes}</div>
                    <div className="text-sm text-muted-foreground">Study Folders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-accent">0</div>
                    <div className="text-sm text-muted-foreground">Exams Taken</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-muted-foreground">0</div>
                    <div className="text-sm text-muted-foreground">Study Streak</div>
                  </div>
                </div>

                {/* Weekly Goal Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Weekly Study Goal</span>
                    <span className="font-semibold">0 / 5 days</span>
                  </div>
                  <Progress value={0} className="h-2" />
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>
                  Your latest learning activities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {totalNotes > 0 ? (
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <FileText className="w-5 h-5 text-gray-500" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">You have {totalNotes} notes</p>
                        <p className="text-xs text-gray-500">Continue learning!</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => handleNavigate('/dashboard/lectures')}
                      >
                        View All
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500 mb-3">No recent activity</p>
                      <Button 
                        size="sm"
                        onClick={() => handleNavigate('/dashboard/lectures')}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Create Your First Note
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Stats & Actions */}
          <div className="space-y-6">
            {/* Subscription Status */}
            <Card className={cn(
              "border-2",
              subscriptionTier === 'student' ? 'border-secondary bg-secondary/10 dark:bg-secondary/20' : 'border-muted'
            )}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  Your Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className={cn(
                    "text-2xl font-bold mb-2",
                    subscriptionTier === 'student' ? 'text-secondary' : 'text-muted-foreground'
                  )}>
                    {subscriptionTier === 'student' ? 'Student' : 'Free'} Plan
                  </div>
                  {subscriptionTier === 'free' && (
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleNavigate('/pricing')}
                    >
                      Upgrade to Student
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Study Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Study Tips
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary mt-1.5"></div>
                    <p className="text-sm text-muted-foreground">
                      Review your notes within 24 hours for better retention
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-secondary mt-1.5"></div>
                    <p className="text-sm text-muted-foreground">
                      Use the Pomodoro timer for focused study sessions
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent mt-1.5"></div>
                    <p className="text-sm text-muted-foreground">
                      Take practice exams to identify knowledge gaps
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/dashboard/account')}
                  >
                    <GraduationCap className="w-4 h-4 mr-2" />
                    Account Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => handleNavigate('/help')}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Help & Support
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}