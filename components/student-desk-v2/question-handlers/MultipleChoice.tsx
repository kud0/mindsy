import React, { useState } from 'react';

interface MultipleChoiceProps {
  question: {
    id: string;
    question: string;
    choices: string[];
    correctAnswer: number;
    hint?: string;
    feedback?: string;
    difficulty?: string;
    points?: number;
  };
}

export function MultipleChoice({ question }: MultipleChoiceProps) {
  const [selectedChoice, setSelectedChoice] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const handleSubmit = () => {
    if (selectedChoice === null) return;
    
    const correct = selectedChoice === question.correctAnswer;
    setIsCorrect(correct);
    setShowFeedback(true);
  };

  const handleReset = () => {
    setSelectedChoice(null);
    setShowFeedback(false);
    setIsCorrect(null);
  };

  return (
    <div className="space-y-4">
      {/* Question */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-3">{question.question}</h3>
        
        {/* Choices */}
        <div className="space-y-2">
          {question.choices.map((choice, index) => (
            <label
              key={index}
              className={`
                flex items-start gap-3 p-3 border cursor-pointer transition-colors
                ${selectedChoice === index 
                  ? 'border-black bg-gray-lightest' 
                  : 'border-gray-light hover:border-gray-medium hover:bg-gray-lightest'
                }
                ${showFeedback && index === question.correctAnswer 
                  ? 'border-black bg-gray-lightest' 
                  : ''
                }
                ${showFeedback && selectedChoice === index && index !== question.correctAnswer 
                  ? 'border-gray-medium bg-gray-lightest' 
                  : ''
                }
              `}
            >
              <input
                type="radio"
                name={`question-${question.id}`}
                value={index}
                checked={selectedChoice === index}
                onChange={() => !showFeedback && setSelectedChoice(index)}
                disabled={showFeedback}
                className="mt-1 w-4 h-4 text-gray-900 border-gray-medium focus:ring-1 focus:ring-black"
              />
              <span className="text-gray-dark leading-relaxed">{choice}</span>
              {showFeedback && index === question.correctAnswer && (
                <span className="ml-auto text-gray-900 text-sm font-medium">✓</span>
              )}
              {showFeedback && selectedChoice === index && index !== question.correctAnswer && (
                <span className="ml-auto text-gray-medium text-sm font-medium">✗</span>
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {!showFeedback ? (
          <button
            onClick={handleSubmit}
            disabled={selectedChoice === null}
            className={`
              px-4 py-2 text-sm font-medium border transition-colors
              ${selectedChoice !== null
                ? 'border-black text-gray-900 hover:bg-gray-lightest'
                : 'border-gray-light text-gray-medium cursor-not-allowed'
              }
            `}
          >
            Submit Answer
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium border border-gray-medium text-gray-dark hover:border-gray-dark hover:bg-gray-lightest transition-colors"
          >
            Try Again
          </button>
        )}
      </div>

      {/* Hint */}
      {question.hint && !showFeedback && (
        <div className="p-3 border border-gray-light bg-gray-lightest">
          <p className="text-sm text-gray-medium">
            <span className="font-medium">Hint:</span> {question.hint}
          </p>
        </div>
      )}

      {/* Feedback */}
      {showFeedback && (
        <div className="p-4 border border-gray-light">
          <div className="flex items-start gap-2 mb-2">
            <span className={`text-sm font-medium ${isCorrect ? 'text-gray-900' : 'text-gray-dark'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
            </span>
            {question.points && (
              <span className="text-sm text-gray-medium">
                ({isCorrect ? question.points : 0} points)
              </span>
            )}
          </div>
          {question.feedback && (
            <p className="text-sm text-gray-dark leading-relaxed">{question.feedback}</p>
          )}
          {!isCorrect && (
            <p className="text-sm text-gray-dark mt-2">
              The correct answer is: <span className="font-medium">{question.choices[question.correctAnswer]}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}