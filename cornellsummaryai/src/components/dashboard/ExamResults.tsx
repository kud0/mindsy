import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { 
  Trophy,
  Target,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Award,
  Flame,
  Brain,
  BarChart3,
  RefreshCw,
  Home,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
  explanation: string;
  topic: string;
  difficulty: string;
  sourceNote?: string; // Which note this question comes from
}

interface Achievement {
  type: string;
  name: string;
  description: string;
}

interface ExamResultsProps {
  score: number;
  percentage: number;
  correct: number;
  incorrect: number;
  timeSpent: number;
  questions: Question[];
  performanceByTopic: Record<string, { correct: number; total: number }>;
  achievements?: Achievement[];
  onRetakeExam?: () => void;
  onGoHome?: () => void;
}

export function ExamResults({
  score,
  percentage,
  correct,
  incorrect,
  timeSpent,
  questions,
  performanceByTopic,
  achievements = [],
  onRetakeExam,
  onGoHome
}: ExamResultsProps) {
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const isPassing = percentage >= 70;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getGrade = (percentage: number): { grade: string; color: string } => {
    if (percentage >= 90) return { grade: 'A', color: 'text-green-600' };
    if (percentage >= 80) return { grade: 'B', color: 'text-blue-600' };
    if (percentage >= 70) return { grade: 'C', color: 'text-yellow-600' };
    if (percentage >= 60) return { grade: 'D', color: 'text-orange-600' };
    return { grade: 'F', color: 'text-red-600' };
  };

  const toggleQuestionExpansion = (questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const { grade, color: gradeColor } = getGrade(percentage);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header Result Card */}
      <Card className={cn(
        "relative overflow-hidden",
        isPassing ? "bg-gradient-to-br from-green-50 to-emerald-50" : "bg-gradient-to-br from-red-50 to-orange-50"
      )}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-4">
            {isPassing ? (
              <Trophy className="h-16 w-16 text-yellow-500" />
            ) : (
              <Target className="h-16 w-16 text-gray-500" />
            )}
          </div>
          <CardTitle className="text-3xl">
            {isPassing ? 'Congratulations!' : 'Keep Practicing!'}
          </CardTitle>
          <CardDescription className="text-lg">
            {isPassing ? 'You passed the exam!' : 'You can do better next time!'}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {/* Score Display */}
          <div className="flex justify-center items-baseline gap-2">
            <span className={cn("text-7xl font-bold", gradeColor)}>
              {Math.round(percentage)}%
            </span>
            <span className={cn("text-4xl font-bold", gradeColor)}>
              {grade}
            </span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-4 pt-4">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">{correct}</p>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div className="text-center">
              <XCircle className="h-8 w-8 text-red-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">{incorrect}</p>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
            <div className="text-center">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">{score}</p>
              <p className="text-sm text-muted-foreground">Points</p>
            </div>
            <div className="text-center">
              <Clock className="h-8 w-8 text-blue-600 mx-auto mb-1" />
              <p className="text-2xl font-bold">{formatTime(timeSpent)}</p>
              <p className="text-sm text-muted-foreground">Time</p>
            </div>
          </div>

          {/* Achievements */}
          {achievements.length > 0 && (
            <div className="pt-4 border-t">
              <h3 className="text-sm font-medium mb-3">🎉 New Achievements Unlocked!</h3>
              <div className="flex flex-wrap justify-center gap-2">
                {achievements.map((achievement, index) => (
                  <Badge key={index} variant="default" className="py-1.5 px-3">
                    <Award className="h-3 w-3 mr-1" />
                    {achievement.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-center gap-3 pt-4">
            {onRetakeExam && (
              <Button onClick={onRetakeExam} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Retake Exam
              </Button>
            )}
            {onGoHome && (
              <Button onClick={onGoHome}>
                <Home className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="review">Review Answers</TabsTrigger>
          <TabsTrigger value="topics">Topic Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Overall Performance</span>
                  <span className="font-medium">{Math.round(percentage)}%</span>
                </div>
                <Progress value={percentage} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Average Time per Question</p>
                  <p className="text-2xl font-bold">
                    {Math.round(timeSpent / questions.length)}s
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Accuracy Rate</p>
                  <p className="text-2xl font-bold">
                    {Math.round((correct / questions.length) * 100)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Question Review</CardTitle>
              <CardDescription>
                Review all questions and their correct answers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {questions.map((question, index) => {
                const isExpanded = expandedQuestions.has(question.id);
                
                return (
                  <div
                    key={question.id}
                    className={cn(
                      "border rounded-lg p-4",
                      question.isCorrect ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"
                    )}
                  >
                    <div 
                      className="flex items-start justify-between cursor-pointer"
                      onClick={() => toggleQuestionExpansion(question.id)}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-medium">Question {index + 1}</span>
                          {question.isCorrect ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Correct
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-800">
                              <XCircle className="h-3 w-3 mr-1" />
                              Incorrect
                            </Badge>
                          )}
                          <Badge variant="outline">{question.topic}</Badge>
                        </div>
                        {question.sourceNote && (
                          <p className="text-xs text-muted-foreground mb-1">
                            📝 From: {question.sourceNote}
                          </p>
                        )}
                        <p className="text-sm">{question.question}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t space-y-3">
                        <div className="space-y-2">
                          {Object.entries(question.options).map(([key, value]) => {
                            const isUserAnswer = question.userAnswer === key;
                            const isCorrectAnswer = question.correctAnswer === key;
                            
                            return (
                              <div
                                key={key}
                                className={cn(
                                  "p-2 rounded-lg text-sm",
                                  isCorrectAnswer && "bg-green-100 border border-green-300",
                                  isUserAnswer && !isCorrectAnswer && "bg-red-100 border border-red-300",
                                  !isUserAnswer && !isCorrectAnswer && "bg-gray-50"
                                )}
                              >
                                <span className="font-medium">{key}.</span> {value}
                                {isCorrectAnswer && (
                                  <Badge className="ml-2 bg-green-600">Correct Answer</Badge>
                                )}
                                {isUserAnswer && !isCorrectAnswer && (
                                  <Badge className="ml-2 bg-red-600">Your Answer</Badge>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-sm font-medium mb-1">Explanation:</p>
                          <p className="text-sm text-muted-foreground">{question.explanation}</p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance by Topic</CardTitle>
              <CardDescription>
                See which topics need more practice
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(performanceByTopic).map(([topic, stats]) => {
                const topicPercentage = (stats.correct / stats.total) * 100;
                const performanceLevel = 
                  topicPercentage >= 80 ? 'excellent' :
                  topicPercentage >= 60 ? 'good' :
                  topicPercentage >= 40 ? 'needs-practice' :
                  'weak';

                return (
                  <div key={topic} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{topic}</span>
                        <Badge 
                          variant={performanceLevel === 'excellent' ? 'default' : 'secondary'}
                          className={cn(
                            performanceLevel === 'excellent' && "bg-green-100 text-green-800",
                            performanceLevel === 'good' && "bg-blue-100 text-blue-800",
                            performanceLevel === 'needs-practice' && "bg-yellow-100 text-yellow-800",
                            performanceLevel === 'weak' && "bg-red-100 text-red-800"
                          )}
                        >
                          {stats.correct}/{stats.total} correct
                        </Badge>
                      </div>
                      <span className="text-sm font-medium">
                        {Math.round(topicPercentage)}%
                      </span>
                    </div>
                    <Progress 
                      value={topicPercentage} 
                      className={cn(
                        "h-2",
                        performanceLevel === 'excellent' && "[&>div]:bg-green-500",
                        performanceLevel === 'good' && "[&>div]:bg-blue-500",
                        performanceLevel === 'needs-practice' && "[&>div]:bg-yellow-500",
                        performanceLevel === 'weak' && "[&>div]:bg-red-500"
                      )}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}