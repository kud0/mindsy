"use client"

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/lib/hooks/useWindowSize';

export interface ExamQuestData {
  id: number;
  type: 'questions' | 'exam' | 'quiz';
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
}

export interface ExamQuestProps {
  quest: ExamQuestData;
  onComplete?: () => void;
  autoRefreshInterval?: number; // milliseconds, default 10000 (10s)
}

/**
 * ExamQuest Component
 *
 * A compact quest display for the Exam widget showing daily learning goals.
 * Displays progress for questions/exams/quizzes with real-time updates.
 *
 * Features:
 * - Progress bar with purple gradient (matching DailyQuests theme)
 * - Green checkmark when completed
 * - Mini confetti effect on completion
 * - Auto-refresh progress
 * - Toast notification on completion
 *
 * @example
 * <ExamQuest
 *   quest={{
 *     id: 2,
 *     type: 'questions',
 *     title: 'Answer 20 Questions',
 *     description: 'Test your knowledge',
 *     target: 20,
 *     current: 14,
 *     completed: false,
 *     xpReward: 75
 *   }}
 *   onComplete={() => console.log('Quest completed!')}
 * />
 */
export function ExamQuest({
  quest,
  onComplete,
  autoRefreshInterval = 10000
}: ExamQuestProps) {
  const { toast } = useToast();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const [hasShownToast, setHasShownToast] = useState(quest.completed);
  const [localQuest, setLocalQuest] = useState(quest);

  // Handle quest completion
  useEffect(() => {
    if (localQuest.completed && !hasShownToast) {
      // Show confetti
      setShowConfetti(true);
      setTimeout(() => {
        setShowConfetti(false);
      }, 3000);

      // Show toast notification
      toast({
        title: "Quest Complete! 🎉",
        description: `${localQuest.title} - Earned ${localQuest.xpReward} XP!`,
        duration: 4000,
      });

      setHasShownToast(true);
      onComplete?.();
    }
  }, [localQuest.completed, hasShownToast, toast, onComplete, localQuest.title, localQuest.xpReward]);

  // Auto-refresh quest progress (optional polling)
  useEffect(() => {
    if (!autoRefreshInterval || localQuest.completed) return;

    const interval = setInterval(() => {
      // In a real implementation, you would fetch updated quest data from API
      // For now, we just update from props
      setLocalQuest(quest);
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, localQuest.completed, quest]);

  // Update local state when prop changes
  useEffect(() => {
    setLocalQuest(quest);
  }, [quest]);

  const progress = Math.min((localQuest.current / localQuest.target) * 100, 100);

  // Quest icon based on type
  const getIcon = () => {
    switch (localQuest.type) {
      case 'questions':
        return '📝';
      case 'exam':
        return '📋';
      case 'quiz':
        return '🎯';
      default:
        return '🎯';
    }
  };

  const formatProgress = (current: number, target: number) => {
    return `(${current}/${target})`;
  };

  return (
    <>
      {/* Confetti animation */}
      <AnimatePresence>
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={200}
            gravity={0.25}
            colors={['#9333EA', '#A855F7', '#7C3AED', '#C084FC', '#E9D5FF']}
          />
        )}
      </AnimatePresence>

      {/* Quest Card */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
        className={cn(
          "relative rounded-xl p-3 transition-all duration-300",
          localQuest.completed
            ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900"
            : "bg-muted/30 border border-border hover:border-primary/50"
        )}
      >
        {/* Quest Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {/* Icon/Checkmark */}
            <div className="flex-shrink-0 mt-0.5">
              {localQuest.completed ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                >
                  <span className="text-white text-xs font-bold">✓</span>
                </motion.div>
              ) : (
                <span className="text-lg leading-none">{getIcon()}</span>
              )}
            </div>

            {/* Title and Description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-0.5">
                <h4 className={cn(
                  "text-sm font-semibold truncate",
                  localQuest.completed
                    ? "text-emerald-900 dark:text-emerald-100 line-through"
                    : "text-foreground"
                )}>
                  {localQuest.title}
                </h4>
                {!localQuest.completed && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatProgress(localQuest.current, localQuest.target)}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {localQuest.description}
              </p>
            </div>
          </div>

          {/* XP Reward */}
          <div className={cn(
            "flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold",
            localQuest.completed
              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          )}>
            +{localQuest.xpReward} XP
          </div>
        </div>

        {/* Progress Bar (only for incomplete quests) */}
        {!localQuest.completed && (
          <div className="mb-0">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {Math.round(progress)}%
            </p>
          </div>
        )}
      </motion.div>
    </>
  );
}

/**
 * Helper hook to fetch quest data from API
 * Use this in parent components to manage quest state
 */
export function useExamQuest(questType: 'questions' | 'exam' | 'quiz' = 'questions') {
  const [quest, setQuest] = useState<ExamQuestData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuest = async () => {
      try {
        // TODO: Replace with actual API endpoint
        // const response = await fetch(`/api/quests/daily?type=${questType}`);
        // const data = await response.json();

        // Mock data for now
        const mockQuest: ExamQuestData = {
          id: 2,
          type: questType,
          title: questType === 'questions'
            ? 'Answer 20 Questions'
            : questType === 'exam'
            ? 'Take 1 Exam'
            : 'Complete 1 Quiz',
          description: questType === 'questions'
            ? 'Test your knowledge'
            : questType === 'exam'
            ? 'Complete a full exam'
            : 'Finish a practice quiz',
          target: questType === 'questions' ? 20 : 1,
          current: questType === 'questions' ? 14 : 0,
          completed: false,
          xpReward: questType === 'questions' ? 75 : questType === 'exam' ? 150 : 100,
        };

        setQuest(mockQuest);
      } catch (error) {
        console.error('Failed to fetch quest:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchQuest();
  }, [questType]);

  const refetch = async () => {
    // Refetch quest data
    setLoading(true);
    // ... fetch logic
    setLoading(false);
  };

  return { quest, loading, refetch };
}
