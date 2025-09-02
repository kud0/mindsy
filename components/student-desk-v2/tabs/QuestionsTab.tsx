import React from 'react';
import { MultipleChoice } from '../question-handlers/MultipleChoice';
import { TrueFalse } from '../question-handlers/TrueFalse';
import { FillNumber } from '../question-handlers/FillNumber';

interface Question {
  id: string;
  type: string;
  topic: string;
  question?: string;
  format: 'multiple-choice' | 'true-false' | 'fill-number';
  // Multiple choice fields
  choices?: string[];
  correctAnswer?: number | boolean;
  // True/false fields
  statement?: string;
  // Fill number fields
  template?: string;
  answer?: number;
  acceptableRange?: [number, number];
  unit?: string;
  // Common fields
  hint?: string;
  feedback?: string;
  difficulty?: string;
  points?: number;
}

interface QuestionsTabProps {
  questions: Question[];
}

export function QuestionsTab({ questions }: QuestionsTabProps) {
  if (!questions || questions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">No questions available for this lecture.</p>
        </div>
      </div>
    );
  }

  const renderQuestion = (question: Question, index: number) => {
    const commonProps = {
      key: question.id,
      question: question as any
    };

    switch (question.format) {
      case 'multiple-choice':
        if (!question.choices || question.correctAnswer === undefined) {
          return (
            <div key={question.id} className="p-4 border border-gray-200">
              <p className="text-gray-500 text-sm">
                Error: Multiple choice question missing required fields (choices, correctAnswer)
              </p>
            </div>
          );
        }
        return <MultipleChoice {...commonProps} />;
        
      case 'true-false':
        if (!question.statement || question.correctAnswer === undefined) {
          return (
            <div key={question.id} className="p-4 border border-gray-200">
              <p className="text-gray-500 text-sm">
                Error: True/false question missing required fields (statement, correctAnswer)
              </p>
            </div>
          );
        }
        return <TrueFalse {...commonProps} />;
        
      case 'fill-number':
        if (!question.template || question.answer === undefined) {
          return (
            <div key={question.id} className="p-4 border border-gray-200">
              <p className="text-gray-500 text-sm">
                Error: Fill number question missing required fields (template, answer)
              </p>
            </div>
          );
        }
        return <FillNumber {...commonProps} />;
        
      default:
        return (
          <div key={question.id} className="p-4 border border-gray-200">
            <p className="text-gray-500 text-sm">
              Error: Unsupported question format '{question.format}'
            </p>
          </div>
        );
    }
  };

  // Group questions by difficulty for better organization
  const questionsByDifficulty = questions.reduce((acc, question) => {
    const difficulty = question.difficulty || 'unknown';
    if (!acc[difficulty]) acc[difficulty] = [];
    acc[difficulty].push(question);
    return acc;
  }, {} as Record<string, Question[]>);

  const difficultyOrder = ['easy', 'medium', 'hard', 'unknown'];
  const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-2 pb-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900">Study Questions</h2>
        <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
          <span>{questions.length} questions</span>
          <span>•</span>
          <span>{totalPoints} total points</span>
        </div>
      </div>

      {/* Questions organized by difficulty */}
      <div className="space-y-8">
        {difficultyOrder.map(difficulty => {
          const difficultyQuestions = questionsByDifficulty[difficulty];
          if (!difficultyQuestions || difficultyQuestions.length === 0) return null;

          return (
            <div key={difficulty} className="space-y-4">
              {/* Difficulty header (only if multiple difficulties exist) */}
              {Object.keys(questionsByDifficulty).length > 1 && difficulty !== 'unknown' && (
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium text-gray-900 capitalize">{difficulty} Questions</h3>
                  <div className="flex-1 h-px bg-gray-200"></div>
                  <span className="text-sm text-gray-500">
                    {difficultyQuestions.length} question{difficultyQuestions.length === 1 ? '' : 's'}
                  </span>
                </div>
              )}
              
              {/* Questions */}
              <div className="space-y-6">
                {difficultyQuestions.map((question, index) => (
                  <div key={question.id} className="p-6 border border-gray-200">
                    {/* Question header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">
                          Question {questions.indexOf(question) + 1}
                        </span>
                        {question.topic && (
                          <>
                            <span className="text-gray-light">•</span>
                            <span className="text-sm text-gray-500">{question.topic}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        {question.difficulty && question.difficulty !== 'unknown' && (
                          <span className="capitalize">{question.difficulty}</span>
                        )}
                        {question.points && (
                          <>
                            {question.difficulty && question.difficulty !== 'unknown' && (
                              <span>•</span>
                            )}
                            <span>{question.points} pts</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    {/* Question content */}
                    {renderQuestion(question, index)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}