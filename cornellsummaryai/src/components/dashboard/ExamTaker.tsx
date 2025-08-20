import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { cn } from '@/lib/utils';
import { 
  Clock, 
  ChevronLeft, 
  ChevronRight,
  Flag,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  Loader2
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
  correctAnswer?: string; // Only shown after submission
  explanation?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sourceNote?: string; // Which note this question comes from
}

interface ExamTakerProps {
  examId: string;
  questions: Question[];
  examTitle: string;
  onComplete: (results: ExamResults) => void;
  onExit: () => void;
}

interface ExamResults {
  score: number;
  percentage: number;
  correct: number;
  incorrect: number;
  answers: Record<string, string>;
  timeSpent: number;
}

export function ExamTaker({ examId, questions, examTitle, onComplete, onExit }: ExamTakerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const { toast } = useToast();

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeSpent(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((Object.keys(answers).length / questions.length) * 100);
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const isFirstQuestion = currentQuestionIndex === 0;

  const handleAnswerSelect = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value
    }));
  };

  const handleFlagToggle = () => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id);
      } else {
        newSet.add(currentQuestion.id);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (!isLastQuestion) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstQuestion) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleJumpToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const handleSubmitExam = async () => {
    // Check if all questions are answered
    const unansweredCount = questions.length - Object.keys(answers).length;
    
    if (unansweredCount > 0 && !showConfirmSubmit) {
      setShowConfirmSubmit(true);
      toast({
        title: "Incomplete Exam",
        description: `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Submit anyway?`,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit exam to API
      const response = await fetch('/api/exam/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          examId,
          answers,
          timeSpent
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit exam');
      }

      // Call onComplete with results
      onComplete(data.results);
    } catch (error) {
      toast({
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "Failed to submit exam",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
      setShowConfirmSubmit(false);
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">{examTitle}</h2>
            <p className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono">{formatTime(timeSpent)}</span>
            </div>
            <Button variant="outline" onClick={onExit}>
              Exit Exam
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Exam Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Progress Bar */}
            <Card>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{Math.round(progress)}% Complete</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
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
                      {flaggedQuestions.has(currentQuestion.id) && (
                        <Badge variant="destructive">
                          <Flag className="h-3 w-3 mr-1" />
                          Flagged
                        </Badge>
                      )}
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
                  <Button
                    variant={flaggedQuestions.has(currentQuestion.id) ? "destructive" : "outline"}
                    size="sm"
                    onClick={handleFlagToggle}
                  >
                    <Flag className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg">{currentQuestion.question}</p>
                
                <RadioGroup
                  value={answers[currentQuestion.id] || ''}
                  onValueChange={handleAnswerSelect}
                >
                  {Object.entries(currentQuestion.options).map(([key, value]) => (
                    <div key={key} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted">
                      <RadioGroupItem value={key} id={`option-${key}`} />
                      <Label 
                        htmlFor={`option-${key}`} 
                        className="flex-1 cursor-pointer text-base"
                      >
                        <span className="font-medium">{key}.</span> {value}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={isFirstQuestion}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>

                  {isLastQuestion ? (
                    <Button
                      onClick={handleSubmitExam}
                      disabled={isSubmitting}
                      className="min-w-32"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Submitting...
                        </>
                      ) : showConfirmSubmit ? (
                        <>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Confirm Submit
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Submit Exam
                        </>
                      )}
                    </Button>
                  ) : (
                    <Button onClick={handleNext}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Question Navigator Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardHeader>
                <CardTitle className="text-sm">Question Navigator</CardTitle>
                <CardDescription>Click to jump to any question</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, index) => {
                    const isAnswered = !!answers[q.id];
                    const isCurrent = index === currentQuestionIndex;
                    const isFlagged = flaggedQuestions.has(q.id);

                    return (
                      <Button
                        key={q.id}
                        variant={isCurrent ? "default" : isAnswered ? "secondary" : "outline"}
                        size="sm"
                        className={cn(
                          "h-10 w-10 p-0 relative",
                          isFlagged && "ring-2 ring-destructive"
                        )}
                        onClick={() => handleJumpToQuestion(index)}
                      >
                        {index + 1}
                        {isAnswered && (
                          <CheckCircle className="h-3 w-3 absolute -top-1 -right-1 text-green-600" />
                        )}
                        {isFlagged && (
                          <Flag className="h-3 w-3 absolute -bottom-1 -right-1 text-destructive" />
                        )}
                      </Button>
                    );
                  })}
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Answered: {Object.keys(answers).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    <span>Unanswered: {questions.length - Object.keys(answers).length}</span>
                  </div>
                  {flaggedQuestions.size > 0 && (
                    <div className="flex items-center gap-2">
                      <Flag className="h-4 w-4 text-destructive" />
                      <span>Flagged: {flaggedQuestions.size}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}