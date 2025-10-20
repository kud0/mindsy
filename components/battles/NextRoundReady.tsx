'use client';

import { useEffect, useState, useRef } from 'react';
import { ChevronRight, Trophy, Target } from 'lucide-react';

interface NextRoundReadyProps {
  roundNumber: number;
  userTotalScore: number;
  opponentTotalScore: number;
  opponentName: string;
  onStartNextRound: () => void;
  autoAdvanceSeconds?: number;
}

export function NextRoundReady({
  roundNumber,
  userTotalScore,
  opponentTotalScore,
  opponentName,
  onStartNextRound,
  autoAdvanceSeconds = 10
}: NextRoundReadyProps) {
  const [timeUntilNext, setTimeUntilNext] = useState(autoAdvanceSeconds);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const hasAdvancedRef = useRef(false);

  useEffect(() => {
    // Prevent multiple calls to onStartNextRound
    hasAdvancedRef.current = false;

    timerRef.current = setInterval(() => {
      setTimeUntilNext((prev) => {
        if (prev <= 1) {
          // Clear the interval first
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }

          // Only call onStartNextRound once using a ref flag
          if (!hasAdvancedRef.current) {
            hasAdvancedRef.current = true;
            // Use setTimeout to ensure this runs AFTER render completes
            setTimeout(() => {
              onStartNextRound();
            }, 0);
          }

          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [onStartNextRound]);

  const userLeading = userTotalScore > opponentTotalScore;
  const isTied = userTotalScore === opponentTotalScore;

  // Manual button click handler - clears timer and triggers immediately
  const handleManualStart = () => {
    // Clear the auto-advance timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Prevent double-trigger
    if (!hasAdvancedRef.current) {
      hasAdvancedRef.current = true;
      onStartNextRound();
    }
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl border-2 border-purple-200 p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Target className="w-8 h-8 text-purple-600" />
            <h2 className="text-3xl font-bold text-gray-900">
              Round {roundNumber} Ready!
            </h2>
          </div>
          <p className="text-lg text-gray-600">
            Both players have completed the previous round
          </p>
        </div>

        {/* Current Standings */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          <div className={`rounded-xl p-6 border-2 ${
            userLeading
              ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
              : isTied
              ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300'
              : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">Your Score</p>
              {userLeading && <Trophy className="w-5 h-5 text-green-600" />}
            </div>
            <p className="text-4xl font-bold text-gray-900">{userTotalScore}</p>
            <p className="text-xs text-gray-500 mt-1">total points</p>
          </div>

          <div className={`rounded-xl p-6 border-2 ${
            !userLeading && !isTied
              ? 'bg-gradient-to-br from-red-50 to-pink-50 border-red-300'
              : isTied
              ? 'bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-300'
              : 'bg-gradient-to-br from-gray-50 to-gray-100 border-gray-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-gray-600">{opponentName}</p>
              {!userLeading && !isTied && <Trophy className="w-5 h-5 text-red-600" />}
            </div>
            <p className="text-4xl font-bold text-gray-900">{opponentTotalScore}</p>
            <p className="text-xs text-gray-500 mt-1">total points</p>
          </div>
        </div>

        {/* Status Message */}
        <div className="text-center mb-6">
          {isTied && (
            <p className="text-lg font-medium text-yellow-700">
              You're tied! This round could be the tiebreaker.
            </p>
          )}
          {userLeading && (
            <p className="text-lg font-medium text-green-700">
              You're in the lead! Keep it up!
            </p>
          )}
          {!userLeading && !isTied && (
            <p className="text-lg font-medium text-red-700">
              You're behind. Time to make a comeback!
            </p>
          )}
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={handleManualStart}
            className="inline-flex items-center gap-2 px-8 py-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-semibold text-lg shadow-lg hover:shadow-xl"
          >
            Start Round {roundNumber}
            <ChevronRight className="w-6 h-6" />
          </button>
          <p className="text-sm text-gray-500 mt-3">
            Auto-starting in {timeUntilNext} seconds...
          </p>
        </div>
      </div>
    </div>
  );
}
