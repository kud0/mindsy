import React, { useState } from 'react';

interface TrueFalseProps {
  question: {
    id: string;
    question?: string;
    statement: string;
    correctAnswer: boolean;
    hint?: string;
    feedback?: string;
    difficulty?: string;
    points?: number;
  };
}

export function TrueFalse({ question }: TrueFalseProps) {
  const [selectedValue, setSelectedValue] = useState<boolean | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleSubmit = () => {
    if (selectedValue === null) return;
    
    const correct = selectedValue === question.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const handleReset = () => {
    setSelectedValue(null);
    setShowFeedback(false);
    setIsCorrect(null);
  };

  return (
    <div className="space-y-4">
      {/* Question */}
      <div>
        {question.question && (
          <h3 className="text-lg font-medium text-gray-900 mb-3">{question.question}</h3>
        )}
        
        {/* Statement */}
        <div className="p-4 border border-gray-200 bg-gray-50 mb-4">
          <p className="text-gray-700 leading-relaxed font-medium">{question.statement}</p>
        </div>
        
        {/* True/False Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => !showFeedback && setSelectedValue(true)}
            disabled={showFeedback}
            className={`
              flex-1 py-3 px-4 text-sm font-medium border transition-colors
              ${selectedValue === true 
                ? 'border-black bg-gray-50' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
              ${showFeedback && question.correctAnswer === true 
                ? 'border-black bg-gray-50' 
                : ''
              }
              ${showFeedback && selectedValue === true && question.correctAnswer !== true 
                ? 'border-gray-300 bg-gray-50' 
                : ''
              }
              ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <span>True</span>
              {showFeedback && question.correctAnswer === true && (
                <span className="text-gray-900">✓</span>
              )}
              {showFeedback && selectedValue === true && question.correctAnswer !== true && (
                <span className="text-gray-500">✗</span>
              )}
            </div>
          </button>
          
          <button
            onClick={() => !showFeedback && setSelectedValue(false)}
            disabled={showFeedback}
            className={`
              flex-1 py-3 px-4 text-sm font-medium border transition-colors
              ${selectedValue === false 
                ? 'border-black bg-gray-50' 
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }
              ${showFeedback && question.correctAnswer === false 
                ? 'border-black bg-gray-50' 
                : ''
              }
              ${showFeedback && selectedValue === false && question.correctAnswer !== false 
                ? 'border-gray-300 bg-gray-50' 
                : ''
              }
              ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-center justify-center gap-2">
              <span>False</span>
              {showFeedback && question.correctAnswer === false && (
                <span className="text-gray-900">✓</span>
              )}
              {showFeedback && selectedValue === false && question.correctAnswer !== false && (
                <span className="text-gray-500">✗</span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!showFeedback ? (
          <button
            onClick={handleSubmit}
            disabled={selectedValue === null}
            className={`
              px-4 py-2 text-sm font-medium border transition-colors
              ${selectedValue !== null
                ? 'border-black text-gray-900 hover:bg-gray-50'
                : 'border-gray-200 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium border border-gray-300 text-gray-700 hover:border-gray-600 hover:bg-gray-50 transition-colors"
          >
            Try Again
          </button>
        )}
      </div>

      {/* Hint */}
      {question.hint && !showFeedback && (
        <div className="p-3 border border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-500">
            <span className="font-medium">Hint:</span> {question.hint}
          </p>
        </div>
      )}

      {/* Feedback */}
      {showFeedback && (
        <div className="p-4 border border-gray-200">
          <div className="flex items-start gap-2 mb-2">
            <span className={`text-sm font-medium ${isCorrect ? 'text-gray-900' : 'text-gray-700'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </span>
            {question.points && (
              <span className="text-sm text-gray-500">
                ({isCorrect ? question.points : 0} points)
              </span>
            )}
          </div>
          {question.feedback && (
            <p className="text-sm text-gray-700 leading-relaxed">{question.feedback}</p>
          )}
          {!isCorrect && (
            <p className="text-sm text-gray-700 mt-2">
              The correct answer is: <span className="font-medium">{question.correctAnswer ? 'True' : 'False'}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}