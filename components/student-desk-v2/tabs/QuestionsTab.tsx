'use client';

import { useState, useEffect } from 'react';
import { Plus, Sparkles, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QuizConfigDialog, type QuizConfig } from '../QuizConfigDialog';
import { MultipleChoice } from '../question-handlers/MultipleChoice';
import { TrueFalse } from '../question-handlers/TrueFalse';
import { FillNumber } from '../question-handlers/FillNumber';
import { useToast } from '@/hooks/use-toast';

// Helper function to format seconds to MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

interface Question {
  id: string;
  type: string;
  format?: 'multiple-choice' | 'true-false' | 'fill-number';
  question?: string;
  statement?: string;
  template?: string;
  choices?: string[];
  correctAnswer?: number | boolean;
  answer?: number;
  acceptableRange?: [number, number];
  unit?: string;
  hint?: string;
  feedback?: string;
  difficulty?: string;
  points?: number;
  timestamps?: {
    start: number;
    end: number;
  };
  sourceContext?: string;
}

interface Quiz {
  id: string;
  title: string;
  questions: Question[];
  created_at: string;
  quiz_config?: {
    difficulty?: string;
    numQuestions?: number;
  };
}

interface QuestionsTabProps {
  questions: Question[]; // Legacy prop - will be empty array for new uploads
  jobId: string;
  onSeekToTime?: (timeInSeconds: number) => void; // Callback to seek audio player
}

interface QuizHistoryItem {
  id: string;
  title: string;
  created_at: string;
  quiz_config?: {
    difficulty?: string;
    numQuestions?: number;
  };
}

export function QuestionsTab({ questions: legacyQuestions, jobId, onSeekToTime }: QuestionsTabProps) {
  const [quizzes, setQuizzes] = useState<QuizHistoryItem[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Quiz-taking state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [quizResults, setQuizResults] = useState<{ score: number; total: number; correct: number } | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

  const { toast } = useToast();

  // Fetch quizzes on mount
  useEffect(() => {
    fetchQuizzes(true); // Auto-load first quiz on mount
  }, [jobId]);

  const fetchQuizzes = async (autoLoadFirst: boolean = false) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/lectures/${jobId}/quizzes`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to fetch quizzes:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error(errorData.error || `Failed to fetch quizzes (${response.status})`);
      }

      const response_data = await response.json();
      console.log('✅ Quizzes fetched:', response_data);

      // Handle wrapped response (createSuccessResponse wraps in data property)
      const quizzesList = response_data.data?.quizzes || response_data.quizzes || [];
      setQuizzes(quizzesList);

      // Load the most recent quiz if requested
      if (autoLoadFirst && quizzesList.length > 0) {
        await loadQuiz(quizzesList[0].id);
      }

      return quizzesList; // Return the list for use by callers
    } catch (error) {
      console.error('Error fetching quizzes:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quizzes',
        variant: 'destructive',
      });
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuiz = async (quizId: string) => {
    try {
      const response = await fetch(`/api/lectures/${jobId}/quizzes/${quizId}`);

      if (!response.ok) {
        throw new Error('Failed to load quiz');
      }

      const response_data = await response.json();
      console.log('📝 Quiz loaded:', response_data);

      // Handle wrapped response
      const quizData = response_data.data || response_data;
      setActiveQuiz(quizData);

      // Reset quiz-taking state when loading a new quiz
      setCurrentQuestionIndex(0);
      setUserAnswers({});
      setIsSubmitted(false);
      setQuizResults(null);
      setIsReviewMode(false);
    } catch (error) {
      console.error('Error loading quiz:', error);
      toast({
        title: 'Error',
        description: 'Failed to load quiz',
        variant: 'destructive',
      });
    }
  };

  // Handle answer selection
  const handleAnswerChange = (questionId: string, answer: any) => {
    setUserAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  // Navigate between questions
  const goToNextQuestion = () => {
    if (currentQuestionIndex < (currentQuestions.length - 1)) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const goToPreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  // Submit entire quiz
  const handleSubmitQuiz = async () => {
    if (!activeQuiz) return;

    const questions = activeQuiz.questions;
    let correctCount = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach((question: Question) => {
      const userAnswer = userAnswers[question.id];
      const points = question.points || 10;
      totalPoints += points;

      // Check if answer is correct based on question type
      let isCorrect = false;
      const format = question.format || question.type;

      switch (format) {
        case 'multiple-choice':
          isCorrect = userAnswer === question.correctAnswer;
          break;
        case 'true-false':
          isCorrect = userAnswer === question.correctAnswer;
          break;
        case 'fill-number':
          if (question.acceptableRange && typeof userAnswer === 'number') {
            isCorrect = userAnswer >= question.acceptableRange[0] && userAnswer <= question.acceptableRange[1];
          } else {
            isCorrect = userAnswer === question.answer;
          }
          break;
      }

      if (isCorrect) {
        correctCount++;
        earnedPoints += points;
      }
    });

    setQuizResults({
      score: earnedPoints,
      total: totalPoints,
      correct: correctCount
    });
    setIsSubmitted(true);

    toast({
      title: 'Quiz Submitted!',
      description: `You scored ${earnedPoints}/${totalPoints} points (${correctCount}/${questions.length} correct)`,
    });

    // Track quiz completion for streak
    await trackQuizCompletion(activeQuiz.id, earnedPoints, totalPoints);
  };

  // Track quiz completion for streak
  const trackQuizCompletion = async (quizId: string, score: number, total: number) => {
    try {
      const response = await fetch(`/api/lectures/${jobId}/quizzes/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quizId,
          score,
          total,
          completedAt: new Date().toISOString()
        }),
      });

      if (!response.ok) {
        console.error('Failed to track quiz completion');
        return;
      }

      const data = await response.json();

      // Show streak update notification if streak increased
      if (data.success && data.streak.increased) {
        toast({
          title: '🔥 Streak Updated!',
          description: `${data.streak.current} day streak! Keep it up!`,
        });
      } else if (data.success && data.streak.reset) {
        toast({
          title: '🔄 Streak Reset',
          description: `Starting fresh with a 1 day streak. Keep going!`,
          variant: 'default',
        });
      } else if (data.success && data.streak.longestStreakBroken) {
        toast({
          title: '🎉 New Personal Best!',
          description: `${data.streak.longest} day streak - your longest yet!`,
        });
      }

    } catch (error) {
      console.error('Error tracking quiz completion:', error);
      // Don't show error to user - this is background tracking
    }
  };

  // Finish quiz review and return to quiz list
  const handleFinishReview = () => {
    // Clear active quiz
    setActiveQuiz(null);

    // Reset quiz-taking state
    setCurrentQuestionIndex(0);
    setUserAnswers({});
    setIsSubmitted(false);
    setQuizResults(null);
    setIsReviewMode(false);

    // Refresh quiz list to show completed quiz in history
    fetchQuizzes(false);
  };

  const handleGenerateQuiz = async (config: QuizConfig) => {
    try {
      setIsGenerating(true);

      const response = await fetch(`/api/lectures/${jobId}/quizzes/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate quiz');
      }

      const data = await response.json();
      console.log('📊 Quiz generation response:', data);

      // Handle different response structures (data might be wrapped)
      const quizData = data.data || data;
      const questionCount = quizData.questions?.length || 0;

      toast({
        title: 'Success!',
        description: `Quiz generated with ${questionCount} questions`,
      });

      setShowConfigDialog(false);

      // Refresh quizzes list (don't auto-load, we'll load explicitly)
      const updatedQuizzes = await fetchQuizzes(false);

      // Load the newly generated quiz
      const quizIdToLoad = quizData.quizId || quizData.id;
      console.log('🔄 Loading newly generated quiz:', quizIdToLoad);

      if (quizIdToLoad) {
        await loadQuiz(quizIdToLoad);
      } else if (updatedQuizzes.length > 0) {
        // Fallback: load the most recent quiz (first in list)
        console.warn('⚠️ No quiz ID in response, loading most recent quiz');
        await loadQuiz(updatedQuizzes[0].id);
      }

    } catch (error) {
      console.error('Error generating quiz:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to generate quiz',
        variant: 'destructive',
      });
    } finally {
      setIsGenerating(false);
    }
  };


  // Render question input (controlled, with visual feedback after submission)
  const renderQuestionInput = (question: Question) => {
    const format = question.format || question.type as any;
    const userAnswer = userAnswers[question.id];

    // Calculate if answer is correct (only after submission)
    let isCorrect = false;
    if (isSubmitted) {
      switch (format) {
        case 'multiple-choice':
          isCorrect = userAnswer === question.correctAnswer;
          break;
        case 'true-false':
          isCorrect = userAnswer === question.correctAnswer;
          break;
        case 'fill-number':
          if (question.acceptableRange && typeof userAnswer === 'number') {
            isCorrect = userAnswer >= question.acceptableRange[0] &&
                        userAnswer <= question.acceptableRange[1];
          } else {
            isCorrect = userAnswer === question.answer;
          }
          break;
      }
    }

    switch (format) {
      case 'multiple-choice':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{question.question}</h3>
            <div className="space-y-2">
              {question.choices?.map((choice, index) => {
                const isUserChoice = userAnswer === index;
                const isCorrectChoice = question.correctAnswer === index;
                const showAsCorrect = isSubmitted && isCorrectChoice;
                const showAsWrong = isSubmitted && isUserChoice && !isCorrectChoice;

                return (
                  <label
                    key={index}
                    className={`
                      flex items-start gap-3 p-3 border transition-colors rounded-lg
                      ${!isSubmitted && isUserChoice
                        ? 'border-primary bg-primary/5 cursor-pointer'
                        : !isSubmitted
                        ? 'border-border hover:border-primary/50 hover:bg-muted cursor-pointer'
                        : ''
                      }
                      ${showAsCorrect
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-500 text-green-900 dark:text-green-100'
                        : ''
                      }
                      ${showAsWrong
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-500 text-red-900 dark:text-red-100'
                        : ''
                      }
                      ${isSubmitted ? 'cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={index}
                      checked={isUserChoice}
                      onChange={() => !isSubmitted && handleAnswerChange(question.id, index)}
                      disabled={isSubmitted}
                      className="mt-1 w-4 h-4"
                    />
                    <span className="flex-1">{choice}</span>
                    {showAsCorrect && (
                      <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {showAsWrong && (
                      <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Show correct answer if user was wrong */}
            {isSubmitted && !isCorrect && question.correctAnswer !== undefined && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-500 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <span className="font-medium text-green-900 dark:text-green-100">Correct Answer:</span>
                    <p className="text-green-800 dark:text-green-200 mt-1">{question.choices?.[question.correctAnswer]}</p>
                  </div>
                </div>
              </div>
            )}

            {question.hint && !isSubmitted && (
              <div className="p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 rounded text-sm">
                <span className="font-medium">💡 Hint:</span> {question.hint}
              </div>
            )}
          </div>
        );

      case 'true-false':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{question.statement}</h3>
            <div className="flex gap-3">
              {[true, false].map((value) => {
                const isUserChoice = userAnswer === value;
                const isCorrectChoice = question.correctAnswer === value;
                const showAsCorrect = isSubmitted && isCorrectChoice;
                const showAsWrong = isSubmitted && isUserChoice && !isCorrectChoice;

                return (
                  <label
                    key={value.toString()}
                    className={`
                      flex-1 flex items-center justify-center gap-2 p-4 border transition-colors rounded-lg
                      ${!isSubmitted && isUserChoice
                        ? 'border-primary bg-primary/5 cursor-pointer'
                        : !isSubmitted
                        ? 'border-border hover:border-primary/50 hover:bg-muted cursor-pointer'
                        : ''
                      }
                      ${showAsCorrect
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-500 text-green-900 dark:text-green-100'
                        : ''
                      }
                      ${showAsWrong
                        ? 'bg-red-50 dark:bg-red-950/30 border-red-500 text-red-900 dark:text-red-100'
                        : ''
                      }
                      ${isSubmitted ? 'cursor-not-allowed' : ''}
                    `}
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      checked={isUserChoice}
                      onChange={() => !isSubmitted && handleAnswerChange(question.id, value)}
                      disabled={isSubmitted}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">{value ? 'True' : 'False'}</span>
                    {showAsCorrect && (
                      <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {showAsWrong && (
                      <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </label>
                );
              })}
            </div>

            {/* Show correct answer if user was wrong */}
            {isSubmitted && !isCorrect && (
              <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-500 rounded-lg">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="flex-1">
                    <span className="font-medium text-green-900 dark:text-green-100">Correct Answer:</span>
                    <p className="text-green-800 dark:text-green-200 mt-1">{question.correctAnswer ? 'True' : 'False'}</p>
                  </div>
                </div>
              </div>
            )}

            {question.hint && !isSubmitted && (
              <div className="p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 rounded text-sm">
                <span className="font-medium">💡 Hint:</span> {question.hint}
              </div>
            )}
          </div>
        );

      case 'fill-number':
        return (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">{question.template}</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={userAnswer ?? ''}
                  onChange={(e) => !isSubmitted && handleAnswerChange(question.id, parseFloat(e.target.value))}
                  placeholder="Enter your answer"
                  disabled={isSubmitted}
                  className={`
                    px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary
                    ${isSubmitted
                      ? isCorrect
                        ? 'bg-green-50 dark:bg-green-950/30 border-green-500 text-green-900 dark:text-green-100'
                        : 'bg-red-50 dark:bg-red-950/30 border-red-500 text-red-900 dark:text-red-100'
                      : 'border-border bg-background'
                    }
                  `}
                />
                {question.unit && (
                  <span className="text-muted-foreground">{question.unit}</span>
                )}
                {isSubmitted && isCorrect && (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isSubmitted && !isCorrect && (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              {/* Show correct answer if user was wrong */}
              {isSubmitted && !isCorrect && (
                <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-500 rounded-lg">
                  <div className="flex items-start gap-2">
                    <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="flex-1">
                      <span className="font-medium text-green-900 dark:text-green-100">Correct Answer:</span>
                      <p className="text-green-800 dark:text-green-200 mt-1">
                        {question.answer} {question.unit}
                        {question.acceptableRange && (
                          <span className="text-sm text-green-700 dark:text-green-300 block mt-1">
                            (Acceptable range: {question.acceptableRange[0]} - {question.acceptableRange[1]} {question.unit})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {question.hint && !isSubmitted && (
              <div className="p-3 border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30 rounded text-sm">
                <span className="font-medium">💡 Hint:</span> {question.hint}
              </div>
            )}
          </div>
        );

      default:
        return <div className="text-muted-foreground">Unknown question type</div>;
    }
  };

  // Render question based on type (legacy, for review mode if needed)
  const renderQuestion = (question: Question, index: number) => {
    const format = question.format || question.type as any;
    const commonProps = {
      question: question as any
    };

    switch (format) {
      case 'multiple-choice':
        if (!question.choices || question.correctAnswer === undefined) {
          return (
            <div className="p-4 border border-border rounded-lg bg-card">
              <p className="text-muted-foreground text-sm">
                Error: Multiple choice question missing required fields
              </p>
            </div>
          );
        }
        return <MultipleChoice {...commonProps} />;

      case 'true-false':
        if (!question.statement || question.correctAnswer === undefined) {
          return (
            <div className="p-4 border border-border rounded-lg bg-card">
              <p className="text-muted-foreground text-sm">
                Error: True/false question missing required fields
              </p>
            </div>
          );
        }
        return <TrueFalse {...commonProps} />;

      case 'fill-number':
        if (!question.template || question.answer === undefined) {
          return (
            <div className="p-4 border border-border rounded-lg bg-card">
              <p className="text-muted-foreground text-sm">
                Error: Fill number question missing required fields
              </p>
            </div>
          );
        }
        return <FillNumber {...commonProps} />;

      default:
        return (
          <div className="p-4 border border-border rounded-lg bg-card">
            <p className="text-muted-foreground text-sm">Unknown question type: {format}</p>
          </div>
        );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading quizzes...</p>
        </div>
      </div>
    );
  }

  // Empty state - no quizzes generated yet
  if (quizzes.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <div className="max-w-md text-center space-y-6 p-8">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-semibold">Generate Your First Quiz</h3>
            <p className="text-muted-foreground">
              Create a customized quiz to test your knowledge of this lecture.
              You can choose difficulty, number of questions, and question types.
            </p>
          </div>

          <div className="bg-muted/50 border rounded-lg p-4 space-y-2 text-left">
            <h4 className="font-medium text-sm">Quiz Features:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• 5-10 questions to keep it focused</li>
              <li>• Multiple difficulty levels</li>
              <li>• Hints and detailed feedback</li>
              <li>• Generate multiple quiz attempts</li>
            </ul>
          </div>

          <Button
            onClick={() => setShowConfigDialog(true)}
            size="lg"
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Quiz
          </Button>
        </div>

        <QuizConfigDialog
          open={showConfigDialog}
          onOpenChange={setShowConfigDialog}
          onGenerate={handleGenerateQuiz}
          isGenerating={isGenerating}
        />
      </div>
    );
  }

  // Active quiz view
  const currentQuestions = activeQuiz?.questions || [];
  const totalPoints = currentQuestions.reduce((sum, q) => sum + (q.points || 10), 0);
  const currentQuestion = currentQuestions[currentQuestionIndex];
  const answeredCount = Object.keys(userAnswers).length;
  const canGoNext = currentQuestionIndex < currentQuestions.length - 1;
  const canGoPrevious = currentQuestionIndex > 0;

  return (
    <div className="h-full overflow-y-auto">
        {!activeQuiz ? (
          // Quiz list view (after completing a quiz or on initial load with quizzes)
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold">Quizzes</h2>

              {/* Generate New Quiz Button */}
              <Button
                onClick={() => setShowConfigDialog(true)}
                size="lg"
                className="w-full"
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Generate New Quiz
              </Button>

              {/* Quiz History */}
              {quizzes.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-muted-foreground">Previous Quizzes</h3>
                  <div className="space-y-2">
                    {quizzes.map((quiz) => (
                      <button
                        key={quiz.id}
                        onClick={() => loadQuiz(quiz.id)}
                        className="w-full p-4 text-left border rounded-lg hover:bg-muted hover:border-primary transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="font-medium">{quiz.title}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {new Date(quiz.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </div>
                          </div>
                          {quiz.quiz_config && (
                            <div className="text-xs text-muted-foreground text-right">
                              {quiz.quiz_config.numQuestions && (
                                <div>{quiz.quiz_config.numQuestions} questions</div>
                              )}
                              {quiz.quiz_config.difficulty && (
                                <div className="capitalize">{quiz.quiz_config.difficulty}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : isSubmitted && quizResults && !isReviewMode ? (
          // Results view after submission (summary only)
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            <div className="text-center space-y-4 p-8 border rounded-lg bg-gradient-to-b from-muted/30 to-background">
              <h2 className="text-3xl font-bold">Quiz Complete!</h2>
              <div className="text-6xl font-bold text-primary">
                {Math.round((quizResults.score / quizResults.total) * 100)}%
              </div>
              <div className="space-y-2">
                <p className="text-lg">
                  You scored <span className="font-semibold">{quizResults.score}/{quizResults.total}</span> points
                </p>
                <p className="text-muted-foreground">
                  {quizResults.correct} out of {currentQuestions.length} questions correct
                </p>
              </div>
              <div className="flex gap-3 justify-center pt-4">
                <Button
                  onClick={() => setIsReviewMode(true)}
                  variant="outline"
                  size="lg"
                >
                  Review Answers
                </Button>
                <Button
                  onClick={() => {
                    handleFinishReview();
                    setShowConfigDialog(true);
                  }}
                  size="lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Generate New Quiz
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Header with progress */}
            <div className="space-y-4 pb-6 border-b">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold">{activeQuiz.title}</h2>
                <Button onClick={() => setShowConfigDialog(true)} variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Quiz
                </Button>
              </div>

              {/* Progress bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Question {currentQuestionIndex + 1} of {currentQuestions.length}
                  </span>
                  <span className="text-muted-foreground">
                    {answeredCount}/{currentQuestions.length} answered
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${((currentQuestionIndex + 1) / currentQuestions.length) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Single Question Display */}
            {currentQuestion && (
              <div className="space-y-6">
                <div className="p-6 border rounded-lg">
                  {/* Question header */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-muted-foreground">
                          Question {currentQuestionIndex + 1}
                        </span>
                        {/* Timestamp badge - Source credibility */}
                        {currentQuestion.timestamps && onSeekToTime && (
                          <button
                            onClick={() => onSeekToTime(currentQuestion.timestamps!.start)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-md transition-colors cursor-pointer shadow-sm"
                            title="Jump to this part of the lecture"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="font-semibold">{formatTime(currentQuestion.timestamps.start)}</span>
                            <span className="text-xs opacity-75">Lecture Source</span>
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {currentQuestion.difficulty && (
                          <span className="capitalize">{currentQuestion.difficulty}</span>
                        )}
                        {currentQuestion.points && (
                          <>
                            {currentQuestion.difficulty && <span>•</span>}
                            <span>{currentQuestion.points} pts</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Source context - Quote from lecture (ONLY SHOW AFTER SUBMISSION) */}
                    {isSubmitted && currentQuestion.sourceContext && (
                      <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 border-l-4 border-blue-400 dark:border-blue-600 rounded-r text-sm">
                        <div className="flex items-start gap-2">
                          <svg className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                          </svg>
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">FROM THE LECTURE:</div>
                            <p className="text-foreground italic leading-relaxed">"{currentQuestion.sourceContext}"</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Question content - render based on type */}
                  {renderQuestionInput(currentQuestion)}
                </div>

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4">
                  <Button
                    onClick={goToPreviousQuestion}
                    disabled={!canGoPrevious}
                    variant="outline"
                  >
                    ← Previous
                  </Button>

                  <div className="flex gap-2">
                    {currentQuestionIndex === currentQuestions.length - 1 ? (
                      isSubmitted ? null : (
                        <Button
                          onClick={handleSubmitQuiz}
                          disabled={answeredCount < currentQuestions.length}
                          size="lg"
                        >
                          Submit Quiz
                        </Button>
                      )
                    ) : (
                      <Button
                        onClick={goToNextQuestion}
                        disabled={!canGoNext}
                      >
                        Next →
                      </Button>
                    )}
                  </div>
                </div>

                {/* Completion buttons (shown in review mode after going through all questions) */}
                {isSubmitted && isReviewMode && currentQuestionIndex === currentQuestions.length - 1 && (
                  <div className="flex gap-3 justify-center pt-6 mt-6 border-t">
                    <Button
                      variant="outline"
                      onClick={handleFinishReview}
                      size="lg"
                    >
                      Back to Quizzes
                    </Button>
                    <Button
                      onClick={() => {
                        handleFinishReview();
                        setShowConfigDialog(true);
                      }}
                      size="lg"
                    >
                      <Sparkles className="mr-2 h-5 w-5" />
                      Generate New Quiz
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      {/* Quiz config dialog */}
      <QuizConfigDialog
        open={showConfigDialog}
        onOpenChange={setShowConfigDialog}
        onGenerate={handleGenerateQuiz}
        isGenerating={isGenerating}
      />
    </div>
  );
}
