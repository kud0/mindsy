'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface BattleQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: string;
  explanation?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface BattleQuestionViewProps {
  question: BattleQuestion;
  selectedAnswer?: string;
  onAnswerSelect: (questionId: string, answer: string) => void;
  disabled?: boolean;
  showCorrectAnswer?: boolean;
}

export function BattleQuestionView({
  question,
  selectedAnswer,
  onAnswerSelect,
  disabled = false,
  showCorrectAnswer = false
}: BattleQuestionViewProps) {
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'hard': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getOptionClassName = (optionKey: string) => {
    if (!showCorrectAnswer) {
      return 'hover:bg-muted';
    }

    const isCorrect = optionKey === question.correctAnswer;
    const isSelected = optionKey === selectedAnswer;

    if (isCorrect) {
      return 'bg-green-50 border-green-500';
    }
    if (isSelected && !isCorrect) {
      return 'bg-red-50 border-red-500';
    }
    return 'opacity-60';
  };

  return (
    <div className="space-y-4">
      {/* Question Header */}
      <div className="flex items-center gap-2 mb-4">
        <Badge className={getDifficultyColor(question.difficulty)}>
          {question.difficulty}
        </Badge>
        <Badge variant="outline">{question.topic}</Badge>
      </div>

      {/* Question Text */}
      <h3 className="text-xl font-semibold text-gray-900 mb-6">
        {question.question}
      </h3>

      {/* Options */}
      <RadioGroup
        value={selectedAnswer || ''}
        onValueChange={(value) => onAnswerSelect(question.id, value)}
        disabled={disabled}
      >
        {Object.entries(question.options).map(([key, value]) => (
          <div
            key={key}
            className={cn(
              "flex items-center space-x-3 p-4 rounded-lg border-2 transition-all",
              getOptionClassName(key)
            )}
          >
            <RadioGroupItem
              value={key}
              id={`${question.id}-option-${key}`}
              disabled={disabled}
              className={cn(
                showCorrectAnswer && key === question.correctAnswer && "border-green-600",
                showCorrectAnswer && key === selectedAnswer && key !== question.correctAnswer && "border-red-600"
              )}
            />
            <Label
              htmlFor={`${question.id}-option-${key}`}
              className={cn(
                "flex-1 cursor-pointer text-base",
                disabled && "cursor-not-allowed"
              )}
            >
              <span className="font-semibold mr-2">{key}.</span>
              {value}
            </Label>
          </div>
        ))}
      </RadioGroup>

      {/* Explanation (shown after answer) */}
      {showCorrectAnswer && question.explanation && (
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm font-medium text-blue-900 mb-1">Explanation:</p>
          <p className="text-sm text-blue-800">{question.explanation}</p>
        </div>
      )}
    </div>
  );
}
