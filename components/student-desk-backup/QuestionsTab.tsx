"use client"

import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface Question {
  id: string;
  promptHtml: string;
  choices?: string[];
  answerHtml: string;
}

interface QuestionsTabProps {
  questions: Question[];
}

export const QuestionsTab: React.FC<QuestionsTabProps> = ({ questions }) => {
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});

  const toggleAnswer = (questionId: string) => {
    setExpandedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const selectChoice = (questionId: string, choiceIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: choiceIndex }));
    // Auto-reveal answer after selection
    setExpandedAnswers(prev => new Set(prev).add(questionId));
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No questions generated yet</p>
          <button className="px-6 py-3 bg-blue-600 text-white font-medium min-h-[48px] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Generate Questions
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      {/* Title and Progress bar */}
      <div className="sticky top-0 bg-white px-4 py-2 z-20">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-3">
          <HelpCircle className="w-5 h-5" />
          Study Questions
        </h2>
        
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Questions</span>
          <span>{expandedAnswers.size}/{questions.length} answered</span>
        </div>
        <div className="w-full h-1 bg-gray-200">
          <div 
            className="h-1 bg-blue-600 transition-all duration-300"
            style={{ width: `${(expandedAnswers.size / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="px-4 py-6 space-y-8">
        {questions.map((question, index) => (
          <div key={question.id} className="w-full">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm font-medium text-gray-500">Question {index + 1} of {questions.length}</span>
              <span className="px-2 py-1 text-xs bg-orange-100 text-orange-800">Medium</span>
            </div>
            
            <div 
              className="prose prose-gray max-w-none mb-6 text-lg"
              dangerouslySetInnerHTML={{ __html: question.promptHtml }}
            />
            
            {question.choices && question.choices.length > 0 && (
              <div className="space-y-3 mb-6" role="radiogroup" aria-labelledby={`question-${question.id}`}>
                {question.choices.map((choice, choiceIndex) => {
                  const isSelected = selectedAnswers[question.id] === choiceIndex;
                  return (
                    <button
                      key={choiceIndex}
                      role="radio"
                      aria-checked={isSelected}
                      onClick={() => selectChoice(question.id, choiceIndex)}
                      className={`w-full p-4 text-left min-h-[48px] transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 text-blue-900' 
                          : 'bg-gray-50 hover:bg-gray-100'
                      } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    >
                      {choice}
                    </button>
                  );
                })}
              </div>
            )}
            
            {!question.choices && (
              <button
                onClick={() => toggleAnswer(question.id)}
                className="px-4 py-3 bg-blue-600 text-white font-medium min-h-[48px] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              >
                {expandedAnswers.has(question.id) ? 'Hide Answer' : 'Reveal Answer'}
              </button>
            )}
            
            {expandedAnswers.has(question.id) && (
              <div className="mt-4 p-4 bg-green-50">
                <div 
                  className="prose prose-gray max-w-none"
                  dangerouslySetInnerHTML={{ __html: question.answerHtml }}
                />
                <button className="mt-3 px-3 py-2 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500">
                  View source at 2:34
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom navigation */}
      <div className="sticky bottom-0 bg-white p-4 flex justify-between items-center">
        <button 
          className="px-4 py-3 text-gray-600 font-medium min-h-[48px] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500"
          disabled
        >
          Previous
        </button>
        <span className="text-sm text-gray-600">1 of {questions.length}</span>
        <button className="px-4 py-3 text-blue-600 font-medium min-h-[48px] hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500">
          Next
        </button>
      </div>
    </div>
  );
};