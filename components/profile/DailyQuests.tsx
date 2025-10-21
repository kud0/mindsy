"use client"

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/lib/hooks/useWindowSize';

export interface Quest {
  id: number;
  type: string;
  title: string;
  description: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
  icon: string; // emoji
  action?: string; // route
  actionLabel?: string;
}

export interface DailyQuestsProps {
  quests: Quest[];
  allCompleted: boolean;
  bonusXP: number;
  bonusClaimed: boolean;
  onClaimBonus?: () => void;
}

export function DailyQuests({
  quests,
  allCompleted,
  bonusXP,
  bonusClaimed,
  onClaimBonus
}: DailyQuestsProps) {
  const router = useRouter();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);

  const handleClaimBonus = () => {
    setShowConfetti(true);
    onClaimBonus?.();

    // Stop confetti after 5 seconds
    setTimeout(() => {
      setShowConfetti(false);
    }, 5000);
  };

  const handleActionClick = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(action);
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const formatProgress = (current: number, target: number) => {
    return `(${current}/${target})`;
  };

  return (
    <div className="space-y-3">
      {/* Confetti animation */}
      <AnimatePresence>
        {showConfetti && (
          <Confetti
            width={width}
            height={height}
            recycle={false}
            numberOfPieces={500}
            gravity={0.3}
            colors={['#9333EA', '#A855F7', '#7C3AED', '#C084FC', '#E9D5FF']}
          />
        )}
      </AnimatePresence>

      {/* Bonus XP Banner */}
      <AnimatePresence>
        {allCompleted && !bonusClaimed && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="relative overflow-hidden rounded-2xl"
          >
            {/* Animated gradient background */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-400"
              animate={{
                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "linear"
              }}
              style={{ backgroundSize: '200% 100%' }}
            />

            {/* Pulsing glow effect */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
              animate={{
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            />

            {/* Content */}
            <div className="relative px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <motion.span
                  className="text-2xl"
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  🎁
                </motion.span>
                <div>
                  <p className="text-sm font-bold text-gray-900">All Quests Complete!</p>
                  <p className="text-xs font-medium text-gray-800">+{bonusXP} Bonus XP!</p>
                </div>
              </div>
              <Button
                onClick={handleClaimBonus}
                size="sm"
                className="bg-white hover:bg-gray-50 text-amber-600 font-semibold shadow-md h-8 px-3 text-xs"
              >
                <Sparkles className="w-3 h-3 mr-1" />
                Claim Reward
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quests List */}
      <div className="space-y-3">
        {quests.map((quest, index) => {
          const progress = calculateProgress(quest.current, quest.target);

          return (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
              className={cn(
                "relative rounded-xl p-3 transition-all duration-300",
                quest.completed
                  ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900"
                  : "bg-muted/30 border border-border hover:border-primary/50"
              )}
            >
              {/* Quest Header */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-start gap-2 flex-1 min-w-0">
                  {/* Icon/Checkmark */}
                  <div className="flex-shrink-0 mt-0.5">
                    {quest.completed ? (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500, damping: 25 }}
                        className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center"
                      >
                        <span className="text-white text-xs font-bold">✓</span>
                      </motion.div>
                    ) : (
                      <span className="text-lg leading-none">{quest.icon}</span>
                    )}
                  </div>

                  {/* Title and Description */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2 mb-0.5">
                      <h4 className={cn(
                        "text-sm font-semibold truncate",
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
                      {quest.description}
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
                <div className="mb-2">
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

              {/* Action Button (optional) */}
              {quest.action && quest.actionLabel && !quest.completed && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleActionClick(quest.action!, e)}
                  className="w-full h-8 mt-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
                >
                  {quest.actionLabel}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Progress Summary */}
      <div className="flex items-center justify-between pt-2 px-1 text-xs text-muted-foreground">
        <span>
          {quests.filter(q => q.completed).length} of {quests.length} completed
        </span>
        <span className="font-semibold text-purple-600 dark:text-purple-400">
          {quests.reduce((sum, q) => sum + (q.completed ? q.xpReward : 0), 0)} XP earned
        </span>
      </div>
    </div>
  );
}
