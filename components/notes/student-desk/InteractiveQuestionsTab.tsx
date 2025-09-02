"use client"

import React, { useState, useCallback } from 'react';
import { 
  HelpCircle, 
  Clock, 
  BookOpen, 
  Target, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  Zap, 
  Trophy, 
  Star,
  Timer,
  Brain,
  TrendingUp
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { QuestionsTabProps } from '@/types/lecture-data';

export const InteractiveQuestionsTab: React.FC<QuestionsTabProps> = ({ questions }) => {
  const [expandedAnswers, setExpandedAnswers] = useState<Set<string>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, any>>({});
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(new Set());
  const [confidenceRatings, setConfidenceRatings] = useState<Record<string, number>>({});
  const [studyTimes, setStudyTimes] = useState<Record<string, number>>({});
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [completedQuestions, setCompletedQuestions] = useState<Set<string>>(new Set());
  const [showCelebration, setShowCelebration] = useState<string | null>(null);
  const [answerValidation, setAnswerValidation] = useState<Record<string, { isCorrect: boolean; feedback: string }>>({});

  const toggleAnswer = useCallback((questionId: string) => {
    setExpandedAnswers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
        // Stop timing when hiding answer
        if (questionStartTimes[questionId]) {
          const timeSpent = Date.now() - questionStartTimes[questionId];
          setStudyTimes(prev => ({ 
            ...prev, 
            [questionId]: (prev[questionId] || 0) + timeSpent 
          }));
          setQuestionStartTimes(prev => {
            const newTimes = { ...prev };
            delete newTimes[questionId];
            return newTimes;
          });
        }
      } else {
        newSet.add(questionId);
        // Start timing when showing answer
        setQuestionStartTimes(prev => ({ ...prev, [questionId]: Date.now() }));
      }
      return newSet;
    });
  }, [questionStartTimes]);

  const toggleQuestionDetails = useCallback((questionId: string) => {
    setExpandedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  }, []);

  // Function to validate answers based on question format
  const validateAnswer = useCallback((question: any, userAnswer: any) => {
    const { format, correctAnswer, answer, acceptableRange } = question;
    
    switch (format) {
      case 'multiple-choice':
        const isCorrect = userAnswer === correctAnswer;
        return {
          isCorrect,
          feedback: isCorrect ? String(question.feedback || 'Correct!') : `Incorrect. The correct answer is "${question.choices[correctAnswer]}". ${String(question.feedback || '')}`
        };
      
      case 'true-false':
        const isTrueFalseCorrect = userAnswer === correctAnswer;
        return {
          isCorrect: isTrueFalseCorrect,
          feedback: isTrueFalseCorrect ? String(question.feedback || 'Correct!') : `Incorrect. The correct answer is ${correctAnswer ? 'True' : 'False'}. ${String(question.feedback || '')}`
        };
      
      case 'fill-number':
        const numericAnswer = parseFloat(userAnswer);
        const expectedAnswer = answer || correctAnswer;
        
        if (isNaN(numericAnswer)) {
          return {
            isCorrect: false,
            feedback: 'Please enter a valid number.'
          };
        }
        
        let isNumberCorrect = false;
        if (acceptableRange && Array.isArray(acceptableRange) && acceptableRange.length >= 2) {
          isNumberCorrect = numericAnswer >= acceptableRange[0] && numericAnswer <= acceptableRange[1];
        } else {
          isNumberCorrect = Math.abs(numericAnswer - expectedAnswer) < 0.1;
        }
        
        return {
          isCorrect: isNumberCorrect,
          feedback: isNumberCorrect ? String(question.feedback || 'Correct!') : `Incorrect. The correct answer is ${expectedAnswer}${question.unit ? ' ' + question.unit : ''}. ${String(question.feedback || '')}`
        };
      
      default:
        return {
          isCorrect: false,
          feedback: 'Answer format not supported for validation.'
        };
    }
  }, []);

  const selectChoice = useCallback((questionId: string, choiceIndex: number) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    setSelectedAnswers(prev => ({ ...prev, [questionId]: choiceIndex }));
    
    // Validate the answer
    const validation = validateAnswer(question, choiceIndex);
    setAnswerValidation(prev => ({ ...prev, [questionId]: validation }));
    
    setExpandedAnswers(prev => new Set(prev).add(questionId));
    
    // Mark as completed and show celebration (different for correct/incorrect)
    setCompletedQuestions(prev => new Set(prev).add(questionId));
    setShowCelebration(questionId);
    setTimeout(() => setShowCelebration(null), validation.isCorrect ? 2000 : 1500);
    
    // Start timing
    if (!questionStartTimes[questionId]) {
      setQuestionStartTimes(prev => ({ ...prev, [questionId]: Date.now() }));
    }
  }, [questions, questionStartTimes, validateAnswer]);

  const selectTrueFalse = useCallback((questionId: string, value: boolean) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    setSelectedAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Validate the answer
    const validation = validateAnswer(question, value);
    setAnswerValidation(prev => ({ ...prev, [questionId]: validation }));
    
    setExpandedAnswers(prev => new Set(prev).add(questionId));
    
    // Mark as completed and show celebration
    setCompletedQuestions(prev => new Set(prev).add(questionId));
    setShowCelebration(questionId);
    setTimeout(() => setShowCelebration(null), validation.isCorrect ? 2000 : 1500);
    
    // Start timing
    if (!questionStartTimes[questionId]) {
      setQuestionStartTimes(prev => ({ ...prev, [questionId]: Date.now() }));
    }
  }, [questions, questionStartTimes, validateAnswer]);

  const handleNumberInput = useCallback((questionId: string, value: string) => {
    const question = questions.find(q => q.id === questionId);
    if (!question) return;
    
    setSelectedAnswers(prev => ({ ...prev, [questionId]: value }));
    
    // Only validate if we have a complete number
    if (value.trim() !== '') {
      const validation = validateAnswer(question, value);
      setAnswerValidation(prev => ({ ...prev, [questionId]: validation }));
      
      setExpandedAnswers(prev => new Set(prev).add(questionId));
      
      // Mark as completed and show celebration
      setCompletedQuestions(prev => new Set(prev).add(questionId));
      setShowCelebration(questionId);
      setTimeout(() => setShowCelebration(null), validation.isCorrect ? 2000 : 1500);
      
      // Start timing
      if (!questionStartTimes[questionId]) {
        setQuestionStartTimes(prev => ({ ...prev, [questionId]: Date.now() }));
      }
    }
  }, [questions, questionStartTimes, validateAnswer]);

  const setConfidence = useCallback((questionId: string, confidence: number) => {
    setConfidenceRatings(prev => ({ ...prev, [questionId]: confidence }));
  }, []);

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

  const formatStudyTime = (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
  };

  const getCompletionPercentage = () => {
    return Math.round((completedQuestions.size / questions.length) * 100);
  };

  const getTotalPoints = () => {
    return completedQuestions.size * 10 + 
           Object.values(confidenceRatings).reduce((sum, rating) => sum + rating, 0);
  };

  if (!questions || questions.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-gray-600 mb-4">No questions generated yet</p>
          <Button className="px-6 py-3 bg-blue-600 text-white font-medium min-h-[48px] hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
            Generate Questions
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-full">
      {/* Enhanced Title with Progress */}
      <div className="sticky top-0 bg-white px-4 py-3 z-20 border-b border-gray-100">
        <div className="flex items-center justify-between mb-2">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Brain className="w-5 h-5 text-purple-600" />
            Interactive Questions
          </h2>
          <div className="flex items-center gap-2 text-sm">
            <Trophy className="w-4 h-4 text-yellow-600" />
            <span className="font-medium text-yellow-700">
              {getTotalPoints()} pts
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
          <span>{questions.length} questions • {completedQuestions.size} completed</span>
          <div className="flex items-center gap-1">
            <TrendingUp className="w-4 h-4" />
            <span>Engagement Mode Active</span>
          </div>
        </div>
        
        <Progress value={getCompletionPercentage()} className="h-2" />
        <p className="text-xs text-gray-500 mt-1">
          {getCompletionPercentage()}% completed • Practice active recall
        </p>
      </div>

      <div className="p-4 space-y-4">
        {questions.map((question, index) => {
          const isAnswerExpanded = expandedAnswers.has(question.id);
          const isDetailsExpanded = expandedQuestions.has(question.id);
          const selectedChoice = selectedAnswers[question.id];
          const confidence = confidenceRatings[question.id] || 0;
          const studyTime = studyTimes[question.id] || 0;
          const isCompleted = completedQuestions.has(question.id);
          const showingCelebration = showCelebration === question.id;
          const validation = answerValidation[question.id];
          const isCorrect = validation?.isCorrect;
          const hasAnswered = selectedChoice !== undefined && selectedChoice !== '';

          return (
            <div key={question.id} className={`border border-gray-200 rounded-lg overflow-hidden transition-all ${
              isCompleted ? 'ring-1 ring-green-200 bg-green-50/30' : ''
            } ${showingCelebration ? 'animate-pulse bg-green-100' : ''}`}>
              
              {/* Question Header with Enhanced Features */}
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
                    {isCompleted && (
                      <div className="flex items-center gap-1">
                        <Check className="w-4 h-4 text-green-600" />
                        <Star className="w-4 h-4 text-yellow-500" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Timer className="w-4 h-4" />
                    <span>{question.metadata.timeEstimate} min</span>
                    {studyTime > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Studied: {formatStudyTime(studyTime)}
                      </span>
                    )}
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

                {/* Question Input Based on Format */}
                {question.format === 'multiple-choice' && question.choices && question.choices.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {question.choices.map((choice, choiceIndex) => (
                      <button
                        key={choiceIndex}
                        onClick={() => selectChoice(question.id, choiceIndex)}
                        className={`w-full text-left p-3 border rounded-lg transition-all ${
                          selectedChoice === choiceIndex
                            ? 'border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <span className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all ${
                            selectedChoice === choiceIndex
                              ? 'border-blue-500 bg-blue-500 text-white'
                              : 'border-gray-300'
                          }`}>
                            {String.fromCharCode(65 + choiceIndex)}
                          </span>
                          {choice}
                          {selectedChoice === choiceIndex && showingCelebration && (
                            <Zap className="w-4 h-4 text-yellow-500 animate-bounce ml-auto" />
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {/* True/False Options */}
                {question.format === 'true-false' && (
                  <div className="space-y-2 mb-4">
                    <button
                      onClick={() => selectTrueFalse(question.id, true)}
                      className={`w-full text-left p-3 border rounded-lg transition-all ${
                        selectedChoice === true
                          ? 'border-green-500 bg-green-50 text-green-900 ring-1 ring-green-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all ${
                          selectedChoice === true
                            ? 'border-green-500 bg-green-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          ✓
                        </span>
                        True / Verdadero
                        {selectedChoice === true && showingCelebration && (
                          <Zap className="w-4 h-4 text-yellow-500 animate-bounce ml-auto" />
                        )}
                      </span>
                    </button>
                    
                    <button
                      onClick={() => selectTrueFalse(question.id, false)}
                      className={`w-full text-left p-3 border rounded-lg transition-all ${
                        selectedChoice === false
                          ? 'border-red-500 bg-red-50 text-red-900 ring-1 ring-red-200'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all ${
                          selectedChoice === false
                            ? 'border-red-500 bg-red-500 text-white'
                            : 'border-gray-300'
                        }`}>
                          ✗
                        </span>
                        False / Falso
                        {selectedChoice === false && showingCelebration && (
                          <Zap className="w-4 h-4 text-yellow-500 animate-bounce ml-auto" />
                        )}
                      </span>
                    </button>
                  </div>
                )}

                {/* Number Input */}
                {question.format === 'fill-number' && (
                  <div className="mb-4">
                    <div className="space-y-2">
                      {question.template && (
                        <p className="text-sm text-gray-600 mb-2">{question.template}</p>
                      )}
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          placeholder="Enter number"
                          value={selectedChoice || ''}
                          onChange={(e) => handleNumberInput(question.id, e.target.value)}
                          className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {question.unit && (
                          <span className="text-sm font-medium text-gray-600">
                            {question.unit}
                          </span>
                        )}
                        {selectedChoice !== undefined && selectedChoice !== '' && showingCelebration && (
                          <Zap className="w-5 h-5 text-yellow-500 animate-bounce" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Confidence Rating */}
                {hasAnswered && (
                  <div className="mb-4 p-3 bg-purple-50 rounded-lg">
                    <label className="block text-sm font-medium text-purple-800 mb-2">
                      How confident are you in this answer?
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <button
                          key={rating}
                          onClick={() => setConfidence(question.id, rating)}
                          className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium transition-all ${
                            confidence >= rating
                              ? 'border-purple-500 bg-purple-500 text-white'
                              : 'border-gray-300 hover:border-purple-300'
                          }`}
                        >
                          {rating}
                        </button>
                      ))}
                      <span className="ml-2 text-sm text-purple-700">
                        {confidence === 0 ? 'Not rated' : 
                         confidence <= 2 ? 'Low confidence' :
                         confidence <= 4 ? 'Medium confidence' : 'High confidence'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Show Answer Button */}
                <Button
                  onClick={() => toggleAnswer(question.id)}
                  variant={isAnswerExpanded ? "outline" : "default"}
                  className="flex items-center gap-2 mb-4"
                >
                  {isAnswerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isAnswerExpanded ? 'Hide Answer' : 'Show Answer'}
                  {!isAnswerExpanded && <Zap className="w-4 h-4 ml-1" />}
                </Button>

                {/* Answer with Real Validation Feedback */}
                {isAnswerExpanded && (
                  <div className="border-t border-gray-200 pt-4">
                    {hasAnswered && validation ? (
                      <div className={`border rounded-lg p-4 mb-4 ${
                        isCorrect 
                          ? 'bg-green-50 border-green-200' 
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center gap-2 mb-2">
                          {isCorrect ? (
                            <>
                              <Check className="w-5 h-5 text-green-600" />
                              <h4 className="font-semibold text-green-800">🎉 Correct!</h4>
                            </>
                          ) : (
                            <>
                              <span className="w-5 h-5 text-red-600 font-bold text-xl">✗</span>
                              <h4 className="font-semibold text-red-800">Not quite right</h4>
                            </>
                          )}
                          <div className="flex items-center gap-1 ml-auto">
                            {isCorrect && confidence > 0 && (
                              <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded">
                                +{confidence} confidence pts
                              </span>
                            )}
                            <span className={`text-xs px-2 py-1 rounded ${
                              isCorrect 
                                ? 'bg-green-200 text-green-800' 
                                : 'bg-red-200 text-red-800'
                            }`}>
                              {isCorrect ? '+10 pts' : '0 pts'}
                            </span>
                          </div>
                        </div>
                        
                        {/* Show user's answer and correct answer */}
                        <div className="space-y-2 text-sm mb-3">
                          <div>
                            <span className="font-medium">Your answer: </span>
                            <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                              {question.format === 'multiple-choice' ? question.choices[selectedChoice] :
                               question.format === 'true-false' ? (selectedChoice ? 'True' : 'False') :
                               selectedChoice}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div>
                              <span className="font-medium">Correct answer: </span>
                              <span className="text-green-700">
                                {question.format === 'multiple-choice' ? question.choices[question.correctAnswer] :
                                 question.format === 'true-false' ? (question.correctAnswer ? 'True' : 'False') :
                                 (question.answer || question.correctAnswer)}
                                {question.unit ? ` ${question.unit}` : ''}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {/* Feedback message */}
                        <div className={`text-sm leading-relaxed ${
                          isCorrect ? 'text-green-700' : 'text-red-700'
                        }`}>
                          {validation.feedback}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                        <div className="flex items-center gap-2 mb-2">
                          <HelpCircle className="w-5 h-5 text-blue-600" />
                          <h4 className="font-semibold text-blue-800">Answer & Explanation</h4>
                        </div>
                        <div className="space-y-2 text-sm text-blue-700">
                          <div>
                            <span className="font-medium">Correct answer: </span>
                            {question.format === 'multiple-choice' ? question.choices[question.correctAnswer] :
                             question.format === 'true-false' ? (question.correctAnswer ? 'True' : 'False') :
                             (question.answer || question.correctAnswer)}
                            {question.unit ? ` ${question.unit}` : ''}
                          </div>
                          {(question.feedback || question.hint) && (
                            <div>
                              <span className="font-medium">Explanation: </span>
                              {String(question.feedback || question.hint || '')}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Enhanced Question Details Toggle */}
                <Button
                  onClick={() => toggleQuestionDetails(question.id)}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-700"
                >
                  {isDetailsExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {isDetailsExpanded ? 'Hide Study Hints' : 'Show Study Hints'}
                </Button>

                {/* Enhanced Expanded Details */}
                {isDetailsExpanded && (
                  <div className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg space-y-4">
                    {/* Scaffolding Hints */}
                    <div className="bg-white p-3 rounded-md">
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                        <Brain className="w-4 h-4 text-purple-600" />
                        Study Strategy
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div><strong>Before thinking:</strong> {question.scaffolding.beforeHint}</div>
                        <div><strong>While solving:</strong> {question.scaffolding.duringHint}</div>
                        <div><strong>Common pitfall:</strong> {question.scaffolding.commonMistake}</div>
                      </div>
                    </div>

                    {/* Connections */}
                    <div className="bg-white p-3 rounded-md">
                      <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-blue-600" />
                        Learning Connections
                      </h5>
                      <div className="space-y-2 text-sm">
                        <div><strong>Prerequisites:</strong> {question.connections.prerequisiteKnowledge}</div>
                        <div><strong>Real-world use:</strong> {question.connections.realWorldApplication}</div>
                        <div><strong>Exam importance:</strong> {question.connections.examRelevance}</div>
                      </div>
                    </div>

                    {/* Skills Development */}
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-700 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        Skills practiced:
                      </span>
                      <span className="text-gray-600">{question.metadata.skills}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Enhanced Progress Summary */}
        <div className="mt-6 p-6 bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 rounded-lg">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Study Progress & Achievements
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{completedQuestions.size}</div>
              <div className="text-sm text-gray-600">Questions Completed</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{getTotalPoints()}</div>
              <div className="text-sm text-gray-600">Total Points</div>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <div className="text-2xl font-bold text-green-600">{getCompletionPercentage()}%</div>
              <div className="text-sm text-gray-600">Progress</div>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Questions answered:</span>
              <span className="font-medium">{Object.keys(selectedAnswers).length} / {questions.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Answers revealed:</span>
              <span className="font-medium">{expandedAnswers.size} / {questions.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Average confidence:</span>
              <span className="font-medium">
                {Object.keys(confidenceRatings).length > 0 
                  ? Math.round(Object.values(confidenceRatings).reduce((a, b) => a + b, 0) / Object.keys(confidenceRatings).length * 10) / 10
                  : 'Not rated'
                }
              </span>
            </div>
          </div>
          
          {completedQuestions.size === questions.length && (
            <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg text-center">
              <Trophy className="w-6 h-6 mx-auto mb-2" />
              <p className="font-semibold">🎉 All questions completed!</p>
              <p className="text-sm">You earned {getTotalPoints()} total points. Great work!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};