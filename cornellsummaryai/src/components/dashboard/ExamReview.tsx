import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle,
  XCircle,
  Trophy,
  Target,
  Home,
  Calendar,
  FileText,
  Eye,
  EyeOff
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
  difficulty: 'easy' | 'medium' | 'hard';
  sourceNote?: string;
}

interface ExamReviewData {
  attemptId: string;
  examTitle: string;
  folderName: string;
  completedAt: string;
  score: number;
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  timeSpent: number;
  totalQuestions: number;
  questions: Question[];
}

interface ExamReviewProps {
  attemptId: string;
  onBack: () => void;
}

export function ExamReview({ attemptId, onBack }: ExamReviewProps) {
  const [reviewData, setReviewData] = useState<ExamReviewData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showExplanations, setShowExplanations] = useState(true);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadExamReview();
  }, [attemptId]);

  const loadExamReview = async () => {
    try {
      const response = await fetch(`/api/exam/review/${attemptId}`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setReviewData(data);
      } else {
        toast({
          title: "Failed to load exam review",
          description: "Could not retrieve exam data",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error loading review",
        description: "An error occurred while loading the exam review",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading exam review...</p>
        </div>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="h-full flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Review Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Could not load the exam review. The exam may not exist or you may not have permission to view it.
            </p>
            <Button onClick={onBack} className="w-full">
              <Home className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = reviewData.questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === reviewData.questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600';
    if (percentage >= 70) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" onClick={onBack}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-xl font-semibold">{reviewData.examTitle}</h2>
              <p className="text-sm text-muted-foreground">
                Review • {reviewData.folderName} • {new Date(reviewData.completedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={cn("text-2xl font-bold", getScoreColor(reviewData.percentage))}>
                {Math.round(reviewData.percentage)}%
              </div>
              <p className="text-xs text-muted-foreground">Score</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {reviewData.correctCount}
              </div>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {reviewData.incorrectCount}
              </div>
              <p className="text-xs text-muted-foreground">Incorrect</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">
                {formatTime(reviewData.timeSpent)}
              </div>
              <p className="text-xs text-muted-foreground">Time</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Review Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Progress Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm">Question {currentQuestionIndex + 1} of {reviewData.questions.length}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowExplanations(!showExplanations)}
                  >
                    {showExplanations ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Hide Explanations
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Show Explanations
                      </>
                    )}
                  </Button>
                </div>
                <Progress 
                  value={((currentQuestionIndex + 1) / reviewData.questions.length) * 100} 
                  className="h-2" 
                />
              </CardContent>
            </Card>

            {/* Question Card */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
                        {currentQuestion.difficulty}
                      </Badge>
                      <Badge variant="outline">{currentQuestion.topic}</Badge>
                      <Badge className={currentQuestion.isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {currentQuestion.isCorrect ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Correct
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Incorrect
                          </>
                        )}
                      </Badge>
                    </div>
                    {currentQuestion.sourceNote && (
                      <p className="text-xs text-muted-foreground">
                        📝 From: {currentQuestion.sourceNote}
                      </p>
                    )}
                    <CardTitle className="text-lg">
                      Question {currentQuestionIndex + 1}
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg">{currentQuestion.question}</p>

                {/* Options */}
                <div className="space-y-3">
                  {Object.entries(currentQuestion.options).map(([key, value]) => {
                    const isUserAnswer = currentQuestion.userAnswer === key;
                    const isCorrectAnswer = currentQuestion.correctAnswer === key;
                    
                    let bgColor = '';
                    let textColor = '';
                    let icon = null;
                    
                    if (isCorrectAnswer) {
                      bgColor = 'bg-green-50 border-green-300';
                      textColor = 'text-green-800';
                      icon = <CheckCircle className="h-4 w-4 text-green-600" />;
                    } else if (isUserAnswer && !isCorrectAnswer) {
                      bgColor = 'bg-red-50 border-red-300';
                      textColor = 'text-red-800';
                      icon = <XCircle className="h-4 w-4 text-red-600" />;
                    } else {
                      bgColor = 'bg-gray-50 border-gray-200';
                      textColor = 'text-gray-700';
                    }

                    return (
                      <div
                        key={key}
                        className={cn(
                          'p-4 border-2 rounded-lg transition-all',
                          bgColor,
                          textColor
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{key}.</span>
                            {icon}
                          </div>
                          <span className="flex-1">{value}</span>
                          {isUserAnswer && (
                            <Badge variant="outline" className="text-xs">
                              Your Answer
                            </Badge>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Explanation */}
                {showExplanations && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Explanation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-blue-800">
                        {currentQuestion.explanation}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Navigation Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Navigation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                    disabled={isFirstQuestion}
                    className="flex-1"
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentQuestionIndex(Math.min(reviewData.questions.length - 1, currentQuestionIndex + 1))}
                    disabled={isLastQuestion}
                    className="flex-1"
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Question Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-1">
                  {reviewData.questions.map((question, index) => (
                    <Button
                      key={question.id}
                      variant={index === currentQuestionIndex ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-8 w-8 p-0 text-xs",
                        question.isCorrect ? "border-green-300" : "border-red-300",
                        index === currentQuestionIndex && (question.isCorrect ? "bg-green-600" : "bg-red-600")
                      )}
                      onClick={() => setCurrentQuestionIndex(index)}
                    >
                      {index + 1}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}