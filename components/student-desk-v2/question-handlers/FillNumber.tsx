import React, { useState } from 'react';

interface FillNumberProps {
  question: {
    id: string;
    question?: string;
    template: string;
    answer: number;
    acceptableRange?: [number, number];
    unit?: string;
    hint?: string;
    feedback?: string;
    difficulty?: string;
    points?: number;
  };
}

export function FillNumber({ question }: FillNumberProps) {
  const [userInput, setUserInput] = useState('');
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const validateAnswer = (input: string): boolean => {
    const userNumber = parseFloat(input);
    if (isNaN(userNumber)) return false;
    
    if (question.acceptableRange) {
      return userNumber >= question.acceptableRange[0] && userNumber <= question.acceptableRange[1];
    } else {
      return userNumber === question.answer;
    }
  };

  const handleSubmit = () => {
    if (!userInput.trim()) return;
    
    const correct = validateAnswer(userInput);
    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const handleReset = () => {
    setUserInput('');
    setShowFeedback(false);
    setIsCorrect(null);
  };

  // Replace placeholder in template with input field
  const renderTemplate = () => {
    const parts = question.template.split('___');
    if (parts.length === 2) {
      return (
        <div className="flex items-center gap-2 text-lg">
          <span className="text-gray-700">{parts[0]}</span>
          <div className="relative">
            <input
              type="number"
              value={userInput}
              onChange={(e) => !showFeedback && setUserInput(e.target.value)}
              disabled={showFeedback}
              placeholder="?"
              className={`
                w-20 px-2 py-1 text-center border-b-2 border-t-0 border-l-0 border-r-0 bg-transparent
                focus:outline-none focus:border-black transition-colors
                ${showFeedback 
                  ? isCorrect 
                    ? 'border-black text-gray-900' 
                    : 'border-gray-300 text-gray-700'
                  : 'border-gray-300'
                }
              `}
              step="any"
            />
            {question.unit && (
              <span className="absolute -right-8 top-1 text-sm text-gray-500">
                {question.unit}
              </span>
            )}
          </div>
          <span className="text-gray-700">{parts[1]}</span>
          {showFeedback && isCorrect && (
            <span className="text-gray-900 text-lg">✓</span>
          )}
          {showFeedback && !isCorrect && (
            <span className="text-gray-500 text-lg">✗</span>
          )}
        </div>
      );
    } else {
      // Fallback if template doesn't have expected format
      return (
        <div className="space-y-2">
          <p className="text-gray-700">{question.template}</p>
          <div className="relative inline-block">
            <input
              type="number"
              value={userInput}
              onChange={(e) => !showFeedback && setUserInput(e.target.value)}
              disabled={showFeedback}
              placeholder="Enter answer"
              className={`
                w-32 px-3 py-2 border focus:outline-none focus:border-black transition-colors
                ${showFeedback 
                  ? isCorrect 
                    ? 'border-black' 
                    : 'border-gray-300'
                  : 'border-gray-200'
                }
              `}
              step="any"
            />
            {question.unit && (
              <span className="ml-2 text-sm text-gray-500">{question.unit}</span>
            )}
          </div>
        </div>
      );
    }
  };

  return (
    <div className="space-y-4">
      {/* Question */}
      {question.question && (
        <h3 className="text-lg font-medium text-gray-900 mb-3">{question.question}</h3>
      )}
      
      {/* Template with Input */}
      <div className="p-4 border border-gray-200 bg-gray-50">
        {renderTemplate()}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!showFeedback ? (
          <button
            onClick={handleSubmit}
            disabled={!userInput.trim()}
            className={`
              px-4 py-2 text-sm font-medium border transition-colors
              ${userInput.trim()
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
            <div className="text-sm text-gray-700 mt-2">
              <p>
                The correct answer is: <span className="font-medium">{question.answer}</span>
                {question.unit && <span className="text-gray-500"> {question.unit}</span>}
              </p>
              {question.acceptableRange && (
                <p className="text-xs text-gray-500 mt-1">
                  (Acceptable range: {question.acceptableRange[0]} - {question.acceptableRange[1]})
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}