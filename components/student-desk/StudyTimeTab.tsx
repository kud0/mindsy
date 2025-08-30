"use client"

import React from 'react';
import { Clock } from 'lucide-react';

interface StudyStats {
  minutes: number;
  sessions: number;
}

interface StudyTimeTabProps {
  stats: StudyStats;
}

export const StudyTimeTab: React.FC<StudyTimeTabProps> = ({ stats }) => {
  const formatTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="mb-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Clock className="w-5 h-5" />
          Study Statistics
        </h2>
      </div>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-blue-50">
            <div className="text-2xl font-bold text-blue-600">{formatTime(stats.minutes)}</div>
            <div className="text-sm text-gray-600">Total Study Time</div>
          </div>
          <div className="text-center p-4 bg-green-50">
            <div className="text-2xl font-bold text-green-600">{stats.sessions}</div>
            <div className="text-sm text-gray-600">Study Sessions</div>
          </div>
        </div>
        
        {stats.sessions > 0 && (
          <div className="text-center p-4 bg-purple-50">
            <div className="text-lg font-medium text-purple-600">
              {Math.round(stats.minutes / stats.sessions)} min
            </div>
            <div className="text-sm text-gray-600">Average Session Length</div>
          </div>
        )}
      </div>
    </div>
  );
};