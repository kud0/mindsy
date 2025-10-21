"use client"

import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface PomodoroQuestProps {
  quest: {
    id: number;
    type: string;
    title: string;
    description?: string;
    target: number;
    current: number;
    completed: boolean;
    xpReward: number;
  };
  onComplete?: () => void;
  className?: string;
}

export function PomodoroQuest({
  quest,
  className
}: PomodoroQuestProps) {
  // Calculate progress
  const progress = Math.min((quest.current / quest.target) * 100, 100);

  // Format progress text
  const formatProgress = (current: number, target: number) => {
    return `(${current}/${target})`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "relative rounded-xl p-2.5 transition-all duration-300",
        quest.completed
          ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900"
          : "bg-muted/30 border border-border hover:border-primary/50",
        className
      )}
    >
      {/* Quest Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          {/* Icon/Checkmark */}
          <div className="flex-shrink-0 mt-0.5">
            {quest.completed ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 25 }}
                className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
              >
                <span className="text-white text-[10px] font-bold">✓</span>
              </motion.div>
            ) : (
              <span className="text-base leading-none">🍅</span>
            )}
          </div>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 mb-0.5">
              <h4 className={cn(
                "text-xs font-semibold truncate",
                quest.completed
                  ? "text-emerald-900 dark:text-emerald-100 line-through"
                  : "text-foreground"
              )}>
                {quest.title}
              </h4>
              {!quest.completed && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatProgress(quest.current, quest.target)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {quest.description || `Complete ${quest.target} Pomodoro sessions today`}
            </p>
          </div>
        </div>

        {/* XP Reward */}
        <div className={cn(
          "flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold",
          quest.completed
            ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
            : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
        )}>
          +{quest.xpReward} XP
        </div>
      </div>

      {/* Progress Bar (only for incomplete quests) */}
      {!quest.completed && (
        <div className="mb-1.5">
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 text-right">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </motion.div>
  );
}
