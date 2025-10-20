'use client';

import { Loader2, Clock } from 'lucide-react';

interface WaitingForOpponentProps {
  opponentName: string;
  roundNumber: number;
  userScore?: number;
}

export function WaitingForOpponent({
  opponentName,
  roundNumber,
  userScore
}: WaitingForOpponentProps) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl border-2 border-purple-200 p-8 text-center">
        {/* Animated Loader */}
        <div className="mb-6">
          <Loader2 className="w-16 h-16 text-purple-600 animate-spin mx-auto" />
        </div>

        {/* Main Message */}
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Waiting for {opponentName}
        </h2>
        <p className="text-gray-600 mb-6">
          You've submitted your answers for Round {roundNumber}.
        </p>

        {/* User Score Display */}
        {userScore !== undefined && (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-4 mb-6 border border-blue-200">
            <p className="text-sm text-gray-600 mb-1">Your Round {roundNumber} Score</p>
            <p className="text-3xl font-bold text-gray-900">{userScore}/5</p>
          </div>
        )}

        {/* Waiting Animation */}
        <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
          <Clock className="w-4 h-4" />
          <span>Waiting for opponent to finish</span>
          <span className="inline-flex gap-1">
            <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
            <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
          </span>
        </div>

        {/* Info Text */}
        <p className="text-xs text-gray-400 mt-4">
          Results will appear automatically when {opponentName} finishes
        </p>
      </div>
    </div>
  );
}
