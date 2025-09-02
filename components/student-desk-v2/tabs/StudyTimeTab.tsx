import React, { useState, useEffect } from 'react';
import { Clock, Trophy, Target, Award } from 'lucide-react';

interface StudyTimeTabProps {
  engagement: {
    quizMetrics: {
      totalQuestions: string | number;
      totalPoints: string | number;
      passingScore: string | number;
    };
    achievements: Array<{
      id: string;
      name: string;
      points: number;
    }>;
  };
  metadata: {
    title: string;
    estimatedTime: string;
  };
}

export function StudyTimeTab({ engagement, metadata }: StudyTimeTabProps) {
  const [studyStartTime] = useState(() => Date.now());
  const [currentStudyTime, setCurrentStudyTime] = useState(0);

  // Update study time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStudyTime(Math.floor((Date.now() - studyStartTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [studyStartTime]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const formatEstimatedTime = (timeStr: string): string => {
    // Extract number from strings like "30 minutes"
    const match = timeStr.match(/(\d+)/);
    return match ? `${match[1]} min` : timeStr;
  };

  // Parse engagement metrics
  const totalQuestions = typeof engagement.quizMetrics.totalQuestions === 'string' 
    ? parseInt(engagement.quizMetrics.totalQuestions) 
    : engagement.quizMetrics.totalQuestions;
    
  const totalPoints = typeof engagement.quizMetrics.totalPoints === 'string' 
    ? parseInt(engagement.quizMetrics.totalPoints) 
    : engagement.quizMetrics.totalPoints;
    
  const passingScore = typeof engagement.quizMetrics.passingScore === 'string' 
    ? parseInt(engagement.quizMetrics.passingScore) 
    : engagement.quizMetrics.passingScore;

  const passingPercentage = totalPoints > 0 ? Math.round((passingScore / totalPoints) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2 pb-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-gray-900">Study Time & Progress</h2>
        <p className="text-gray-500">Track your learning progress</p>
      </div>

      {/* Current Study Session */}
      <div className="space-y-4">
        <h3 className="text-xl font-medium text-gray-900">Current Session</h3>
        
        <div className="grid gap-4 md:grid-cols-2">
          {/* Study Time */}
          <div className="p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <Clock className="w-5 h-5 text-gray-700" />
              <h4 className="font-medium text-gray-900">Time Studied</h4>
            </div>
            <div className="text-center">
              <div className="text-3xl font-semibold text-gray-900 mb-1">
                {formatTime(currentStudyTime)}
              </div>
              <p className="text-sm text-gray-500">This session</p>
            </div>
          </div>

          {/* Estimated vs Actual */}
          <div className="p-4 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <Target className="w-5 h-5 text-gray-700" />
              <h4 className="font-medium text-gray-900">Progress</h4>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Current:</span>
                <span className="text-sm font-medium text-gray-900">{formatTime(currentStudyTime)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Estimated:</span>
                <span className="text-sm font-medium text-gray-900">{formatEstimatedTime(metadata.estimatedTime)}</span>
              </div>
              <div className="w-full bg-gray-50 border border-gray-200 h-2 mt-2">
                <div 
                  className="bg-gray-900 h-full transition-all duration-300"
                  style={{ 
                    width: `${Math.min(100, (currentStudyTime / (parseInt(metadata.estimatedTime) * 60)) * 100)}%` 
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Metrics */}
      <div className="space-y-4">
        <h3 className="text-xl font-medium text-gray-900">Quiz Overview</h3>
        
        <div className="grid gap-4 md:grid-cols-3">
          {/* Total Questions */}
          <div className="p-4 border border-gray-200 text-center">
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {totalQuestions}
            </div>
            <p className="text-sm text-gray-500">Questions Available</p>
          </div>

          {/* Total Points */}
          <div className="p-4 border border-gray-200 text-center">
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {totalPoints}
            </div>
            <p className="text-sm text-gray-500">Total Points</p>
          </div>

          {/* Passing Score */}
          <div className="p-4 border border-gray-200 text-center">
            <div className="text-2xl font-semibold text-gray-900 mb-1">
              {passingScore}
            </div>
            <p className="text-sm text-gray-500">Passing Score ({passingPercentage}%)</p>
          </div>
        </div>
      </div>

      {/* Achievements */}
      {engagement.achievements && engagement.achievements.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-medium text-gray-900">Achievements</h3>
          
          <div className="space-y-2">
            {engagement.achievements.map((achievement) => (
              <div key={achievement.id} className="p-4 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-gray-700" />
                    <div>
                      <h4 className="font-medium text-gray-900">{achievement.name}</h4>
                      <p className="text-sm text-gray-500">{achievement.points} points earned</p>
                    </div>
                  </div>
                  <Trophy className="w-5 h-5 text-gray-500" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Study Tips */}
      <div className="border-t border-gray-200 pt-6">
        <div className="p-4 border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-3 text-sm">Study Tips for Better Retention</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
              Take breaks every 25-30 minutes (Pomodoro technique)
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
              Review material within 24 hours for better retention
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
              Test your understanding with the quiz questions
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 bg-gray-700 flex-shrink-0 mt-1.5"></span>
              Create connections between concepts from different sections
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}