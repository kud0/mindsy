"use client"

import React, { useState } from 'react';
import { HelpCircle, Clock, BookOpen, Target, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { QuestionsTabProps } from '@/types/lecture-data';

export const QuestionsTab: React.FC<QuestionsTabProps> = ({ questions }) => {
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());

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

  const toggleQuestionDetails = (questionId: string) => {
    setExpandedQuestions(prev => {
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'hard': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'conceptual': return <Target className="w-4 h-4" />;
      case 'recall': return <BookOpen className="w-4 h-4" />;
      case 'application': return <Check className="w-4 h-4" />;
      default: return <HelpCircle className="w-4 h-4" />;
    }
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
      {/* Title */}
      <div className="sticky top-0 bg-white px-4 py-2 z-20 border-b border-gray-100">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-1">
          <HelpCircle className="w-5 h-5" />
          Study Questions
        </h2>
        <p className="text-sm text-gray-600">
          {questions.length} questions • Practice active recall
        </p>
      </div>

      <div className="p-4 space-y-4">
        {questions.map((question, index) => {
          const isAnswerExpanded = expandedAnswers.has(question.id);
          const isDetailsExpanded = expandedQuestions.has(question.id);
          const selectedChoice = selectedAnswers[question.id];

          return (
            <div key={question.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {/* Question Header */}
              <div className="bg-gray-50 p-4 border-b border-gray-200">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">
                      #{index + 1}
                    </span>
                    {getTypeIcon(question.type)}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(question.metadata.difficulty)}`}>
                      {question.metadata.difficulty}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="w-4 h-4" />
                    {question.metadata.timeEstimate} min
                  </div>
                </div>
                
                {/* Setup Context */}
                {question.setup && (
                  <div className="mb-3 p-3 bg-blue-50 rounded text-sm text-blue-800">
                    <strong>Context:</strong> {question.setup}
                  </div>
                )}
              </div>

              {/* Question Content */}
              <div className="p-4">
                {/* Question Text */}
                <div 
                  className="prose prose-gray max-w-none mb-4 text-gray-900 font-medium"
                  dangerouslySetInnerHTML={{ __html: question.question }}
                />

                {/* Multiple Choice Options */}
                {question.choices && question.choices.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {question.choices.map((choice, choiceIndex) => (
                      <button
                        key={choiceIndex}
                        onClick={() => selectChoice(question.id, choiceIndex)}
                        className={`w-full text-left p-3 border rounded-lg transition-colors ${
                          selectedChoice === choiceIndex
                            ? 'border-blue-500 bg-blue-50 text-blue-900'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium ${
                            selectedChoice === choiceIndex
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-gray-300'
                          }`}>
                            {String.fromCharCode(65 + choiceIndex)}
                          </span>
                          {choice}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Show Answer Button */}
                <button
                  onClick={() => toggleAnswer(question.id)}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors mb-4"
                >
                  {isAnswerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isAnswerExpanded ? 'Hide Answer' : 'Show Answer'}
                </button>

                {/* Answer */}
                {isAnswerExpanded && (
                  <div className="border-t border-gray-200 pt-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Check className="w-5 h-5 text-green-600" />
                        <h4 className="font-semibold text-green-800">Answer</h4>
                      </div>
                      <div 
                        className="prose prose-green max-w-none text-sm"
                        dangerouslySetInnerHTML={{ __html: question.correctAnswer }}
                      />
                    </div>

                    {/* Explanation */}
                    {question.feedback.explanation && (
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h4 className="font-semibold text-blue-800 mb-2">Explanation</h4>
                        <p className="text-sm text-blue-700 leading-relaxed">
                          {question.feedback.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Question Details Toggle */}
                <button
                  onClick={() => toggleQuestionDetails(question.id)}
                  className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-700 hover:bg-gray-100 rounded text-sm transition-colors"
                >
                  {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isDetailsExpanded ? 'Hide Details' : 'Show Details'}
                </button>

                {/* Expanded Details */}
                {isDetailsExpanded && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                    {/* Scaffolding Hints */}
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Study Hints</h5>
                      <div className="space-y-2 text-sm">
                        <div><strong>Before:</strong> {question.scaffolding.beforeHint}</div>
                        <div><strong>During:</strong> {question.scaffolding.duringHint}</div>
                        <div><strong>Common Mistake:</strong> {question.scaffolding.commonMistake}</div>
                      </div>
                    </div>

                    {/* Connections */}
                    <div>
                      <h5 className="font-medium text-gray-800 mb-2">Connections</h5>
                      <div className="space-y-2 text-sm">
                        <div><strong>Prerequisites:</strong> {question.connections.prerequisiteKnowledge}</div>
                        <div><strong>Real-world:</strong> {question.connections.realWorldApplication}</div>
                        <div><strong>Exam relevance:</strong> {question.connections.examRelevance}</div>
                      </div>
                    </div>

                    {/* Skills */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">Skills:</span>
                      <span className="text-sm text-gray-600">{question.metadata.skills}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Progress Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-2">Study Progress</h3>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-600">
              Questions answered: {Object.keys(selectedAnswers).length} / {questions.length}
            </span>
            <span className="text-gray-600">
              Answers revealed: {expandedAnswers.size} / {questions.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};