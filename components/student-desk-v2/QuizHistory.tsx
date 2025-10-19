'use client';

import { formatDistanceToNow } from 'date-fns';
import { Trash2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface QuizHistoryItem {
  id: string;
  title: string;
  questionCount: number;
  created_at: string;
  quiz_config?: {
    difficulty?: string;
    numQuestions?: number;
  };
}

interface QuizHistoryProps {
  quizzes: QuizHistoryItem[];
  activeQuizId?: string;
  onSelectQuiz: (quizId: string) => void;
  onDeleteQuiz: (quizId: string) => void;
}

export function QuizHistory({
  quizzes,
  activeQuizId,
  onSelectQuiz,
  onDeleteQuiz,
}: QuizHistoryProps) {
  if (quizzes.length === 0) {
    return null;
  }

  return (
    <div className="w-64 border-l bg-muted/30">
      <div className="border-b p-4">
        <h3 className="font-semibold text-sm">Quiz History</h3>
        <p className="text-xs text-muted-foreground mt-1">
          {quizzes.length} {quizzes.length === 1 ? 'quiz' : 'quizzes'}
        </p>
      </div>

      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="p-2 space-y-1">
          {quizzes.map((quiz) => {
            const isActive = activeQuizId === quiz.id;
            const difficulty = quiz.quiz_config?.difficulty || 'medium';
            const questionCount = quiz.questionCount || quiz.quiz_config?.numQuestions || 0;

            return (
              <div
                key={quiz.id}
                className={`
                  group relative rounded-lg border p-3 cursor-pointer transition-all
                  ${isActive
                    ? 'bg-primary/10 border-primary shadow-sm'
                    : 'bg-background hover:bg-muted/50 hover:border-muted-foreground/20'
                  }
                `}
                onClick={() => onSelectQuiz(quiz.id)}
              >
                {/* Active Indicator */}
                {isActive && (
                  <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-sm truncate">
                        {quiz.title}
                      </h4>
                      {isActive && (
                        <CheckCircle2 className="h-3 w-3 text-primary flex-shrink-0" />
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className={`
                          inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                          ${difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : ''}
                          ${difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300' : ''}
                          ${difficulty === 'hard' ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : ''}
                        `}
                      >
                        {difficulty}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {questionCount} {questionCount === 1 ? 'question' : 'questions'}
                      </span>
                    </div>

                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(quiz.created_at), { addSuffix: true })}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteQuiz(quiz.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
