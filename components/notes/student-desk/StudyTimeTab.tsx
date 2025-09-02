"use client"

import React from 'react';
import { Clock, BarChart, Calendar, PlayCircle, CheckCircle } from 'lucide-react';
import { StudyTimeTabProps } from '@/types/lecture-data';

export const StudyTimeTab: React.FC<StudyTimeTabProps> = ({ stats, studyPlan }) => {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const getProgressPercentage = (): number => {
    if (stats.estimatedMinutes === 0) return 0;
    return Math.min((stats.completedSessions / Math.ceil(stats.estimatedMinutes / 25)) * 100, 100);
  };

  return (
    <div className="max-w-full">
      {/* Title */}
      <div className="sticky top-0 bg-white px-4 py-2 z-20 border-b border-gray-100">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-1">
          <Clock className="w-5 h-5" />
          Study Time & Progress
        </h2>
        <p className="text-sm text-gray-600">
          Track your learning progress and study schedule
        </p>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Study Statistics */}
        <section>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <BarChart className="w-5 h-5 text-blue-600" />
            Study Statistics
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Estimated Time */}
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-blue-800 mb-1">
                {formatTime(stats.estimatedMinutes)}
              </div>
              <div className="text-sm text-blue-600 font-medium">Estimated Time</div>
              <div className="text-xs text-blue-500 mt-1">Total study duration</div>
            </div>
            
            {/* Completed Sessions */}
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-800 mb-1">
                {stats.completedSessions}
              </div>
              <div className="text-sm text-green-600 font-medium">Study Sessions</div>
              <div className="text-xs text-green-500 mt-1">Sessions completed</div>
            </div>
            
            {/* Progress */}
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-purple-800 mb-1">
                {Math.round(getProgressPercentage())}%
              </div>
              <div className="text-sm text-purple-600 font-medium">Progress</div>
              <div className="text-xs text-purple-500 mt-1">Study completion</div>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Study Progress</span>
              <span>{Math.round(getProgressPercentage())}% Complete</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${getProgressPercentage()}%` }}
              />
            </div>
          </div>
          
          {/* Last Accessed */}
          {stats.lastAccessed && (
            <div className="mt-4 bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>Last studied:</strong> {new Date(stats.lastAccessed).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
            </div>
          )}
        </section>

        {/* Study Plan Timeline */}
        <section>
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-green-600" />
            Personalized Study Plan
          </h3>
          
          <div className="space-y-4">
            {/* Now */}
            <div className="flex items-start gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                <PlayCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-green-800 mb-1">Right Now</h4>
                <p className="text-sm text-green-700 leading-relaxed">
                  {studyPlan.now}
                </p>
              </div>
            </div>

            {/* Tonight */}
            <div className="flex items-start gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">Tonight</h4>
                <p className="text-sm text-blue-700 leading-relaxed">
                  {studyPlan.tonight}
                </p>
              </div>
            </div>

            {/* This Week */}
            <div className="flex items-start gap-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                <Calendar className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-yellow-800 mb-1">This Week</h4>
                <p className="text-sm text-yellow-700 leading-relaxed">
                  {studyPlan.thisWeek}
                </p>
              </div>
            </div>

            {/* Before Exam */}
            <div className="flex items-start gap-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                <BarChart className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-orange-800 mb-1">Before Exam</h4>
                <p className="text-sm text-orange-700 leading-relaxed">
                  {studyPlan.beforeExam}
                </p>
              </div>
            </div>

            {/* Long Term */}
            <div className="flex items-start gap-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center shrink-0 mt-1">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-purple-800 mb-1">Long Term</h4>
                <p className="text-sm text-purple-700 leading-relaxed">
                  {studyPlan.longTerm}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Study Tips */}
        <section className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">💡 Study Tips</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-indigo-400 rounded-full mt-2 shrink-0" />
              <span className="text-gray-700">Use the Pomodoro Technique: 25-minute focused study sessions with 5-minute breaks</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-purple-400 rounded-full mt-2 shrink-0" />
              <span className="text-gray-700">Review material multiple times with increasing intervals for better retention</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-pink-400 rounded-full mt-2 shrink-0" />
              <span className="text-gray-700">Practice active recall by testing yourself without looking at notes</span>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 shrink-0" />
              <span className="text-gray-700">Connect new concepts to existing knowledge for deeper understanding</span>
            </div>
          </div>
        </section>

        {/* Session Tracker */}
        <section className="border-2 border-dashed border-gray-200 p-6 rounded-lg text-center">
          <Clock className="w-8 h-8 text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Start a Study Session</h3>
          <p className="text-sm text-gray-600 mb-4">
            Track your study time and mark progress as you go through the material
          </p>
          <button className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
            Begin Study Session
          </button>
        </section>
      </div>
    </div>
  );
};