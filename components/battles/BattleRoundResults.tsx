'use client';

import { useState } from 'react';
import { Trophy, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { BattleQuestionView } from './BattleQuestionView';
import { DetailedQuestionResult } from '@/lib/battles/scoring';

interface BattleQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: string;
  explanation?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface BattleRoundResultsProps {
  roundNumber: number;
  userScore: number;
  opponentScore: number;
  opponentName: string;
  questions: DetailedQuestionResult[];
  onContinue: () => void;
}

export function BattleRoundResults({
  roundNumber,
  userScore,
  opponentScore,
  opponentName,
  questions,
  onContinue
}: BattleRoundResultsProps) {
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const userWon = userScore > opponentScore;
  const isDraw = userScore === opponentScore;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Round Summary Card */}
      <div className={`rounded-2xl p-6 border-2 ${
        userWon
          ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300'
          : isDraw
          ? 'bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-300'
          : 'bg-gradient-to-r from-red-50 to-pink-50 border-red-300'
      }`}>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className={`w-8 h-8 ${
              userWon ? 'text-green-600' : isDraw ? 'text-yellow-600' : 'text-red-600'
            }`} />
            <h2 className="text-3xl font-bold text-gray-900">
              {userWon ? 'You Won!' : isDraw ? 'Draw!' : 'Opponent Won!'}
            </h2>
          </div>
          <p className="text-lg text-gray-600">Round {roundNumber} Complete</p>
        </div>

        {/* Score Comparison */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">You</p>
            <p className="text-4xl font-bold text-gray-900">{userScore}</p>
            <p className="text-xs text-gray-500">out of {questions.length}</p>
          </div>
          <div className="flex items-center justify-center">
            <div className="text-3xl font-bold text-gray-400">vs</div>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">{opponentName}</p>
            <p className="text-4xl font-bold text-gray-900">{opponentScore}</p>
            <p className="text-xs text-gray-500">out of {questions.length}</p>
          </div>
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <button
            onClick={onContinue}
            className="px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center gap-2 mx-auto text-lg"
          >
            Continue
            <ChevronRight className="w-5 h-5" />
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Click to check opponent status and continue
          </p>
        </div>
      </div>

      {/* Question Review */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Question Review</h3>
        <div className="space-y-4">
          {questions.map((result, index) => {
            const isExpanded = expandedQuestion === result.questionId;

            return (
              <div key={result.questionId} className="border border-gray-200 rounded-lg overflow-hidden">
                {/* Question Summary */}
                <button
                  onClick={() => setExpandedQuestion(isExpanded ? null : result.questionId)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className="font-semibold text-gray-700">Q{index + 1}</span>
                    <p className="text-gray-900 truncate flex-1">{result.question}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {result.isCorrect ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                </button>

                {/* Expanded Question Details */}
                {isExpanded && (
                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <BattleQuestionView
                      question={{
                        id: result.questionId,
                        question: result.question,
                        options: result.options,
                        correctAnswer: result.correctAnswer,
                        explanation: result.explanation,
                        topic: result.topic,
                        difficulty: 'medium'
                      }}
                      selectedAnswer={result.userAnswer || undefined}
                      onAnswerSelect={() => {}}
                      disabled={true}
                      showCorrectAnswer={true}
                    />
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          <span className="font-medium">Your answer:</span>{' '}
                          <span className={result.isCorrect ? 'text-green-600 font-semibold' : 'text-red-600 font-semibold'}>
                            {result.userAnswer || 'Not answered'}
                            {result.isCorrect ? ' ✓' : ' ✗'}
                          </span>
                        </p>
                        {!result.isCorrect && (
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Correct answer:</span>{' '}
                            <span className="text-green-600 font-semibold">
                              {result.correctAnswer}
                            </span>
                          </p>
                        )}
                        {result.explanation && (
                          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-gray-700">
                              <span className="font-medium text-blue-900">Explanation:</span>{' '}
                              {result.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
