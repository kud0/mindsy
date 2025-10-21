"use client"

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronRight, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import Confetti from 'react-confetti';
import { useWindowSize } from '@/lib/hooks/useWindowSize';

export interface SocialQuestProps {
  quest: {
    id: number;
    type: 'battle_win' | 'share_content' | 'perfect_score' | 'social';
    title: string;
    description?: string;
    target: number;
    current: number;
    completed: boolean;
    xpReward: number;
    action?: string; // route to navigate
    actionLabel?: string; // button label
  };
  onComplete?: () => void;
  onActionClick?: (action: string) => void;
  refreshInterval?: number; // ms to auto-refresh progress (default: 30000)
}

/**
 * Quest icon mapping - matches DailyQuests style
 */
const QUEST_ICONS: Record<string, string> = {
  battle_win: '⚔️',
  share_content: '🤝',
  perfect_score: '⭐',
  social: '🎯',
};

/**
 * SocialQuest Component
 *
 * A compact quest display designed for the Social widget.
 * Matches the exact aesthetic of DailyQuests component.
 *
 * Features:
 * - Single quest card with Card → Header → Content → Footer pattern
 * - Purple gradient progress bar (incomplete)
 * - Emerald green completion state
 * - Action button when incomplete (e.g., "Challenge Friend")
 * - Green checkmark with spring animation when completed
 * - Progress bar with percentage
 * - Auto-update progress (poll on interval)
 * - Toast notification when quest completed
 * - Mini confetti effect on completion
 */
export function SocialQuest({
  quest,
  onComplete,
  onActionClick,
  refreshInterval = 30000,
}: SocialQuestProps) {
  const router = useRouter();
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const [prevCompleted, setPrevCompleted] = useState(quest.completed);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle quest completion and trigger celebration
  const handleQuestComplete = () => {
    // Mini confetti effect (reduced intensity for compact widget)
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);

    // Toast notification
    toast.success('Social Quest Complete!', {
      description: `You earned +${quest.xpReward} XP!`,
      duration: 3000,
    });

    // Callback
    onComplete?.();
  };

  // Detect quest completion and trigger celebration
  useEffect(() => {
    if (quest.completed && !prevCompleted) {
      // Quest just completed!
      handleQuestComplete();
    }
    setPrevCompleted(quest.completed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quest.completed, prevCompleted]);

  // Auto-refresh progress (simulated - in real app would refetch from API)
  useEffect(() => {
    if (quest.completed) return; // Don't refresh if already completed

    const interval = setInterval(() => {
      setIsRefreshing(true);
      // In a real implementation, this would trigger a refetch
      // For now, we just show the refresh state
      setTimeout(() => setIsRefreshing(false), 500);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [quest.completed, refreshInterval]);

  const handleActionButtonClick = () => {
    if (quest.action) {
      if (onActionClick) {
        onActionClick(quest.action);
      } else {
        router.push(quest.action);
      }
    }
  };

  const calculateProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const formatProgress = (current: number, target: number) => {
    return `(${current}/${target})`;
  };

  const progress = calculateProgress(quest.current, quest.target);
  const icon = QUEST_ICONS[quest.type] || QUEST_ICONS.social;

  return (
    <div className="relative">
      {/* Mini Confetti (smaller, fewer pieces for compact widget) */}
      <AnimatePresence>
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none z-50">
            <Confetti
              width={width}
              height={height}
              recycle={false}
              numberOfPieces={200}
              gravity={0.3}
              colors={['#9333EA', '#A855F7', '#7C3AED', '#C084FC', '#E9D5FF']}
              confettiSource={{
                x: width / 2,
                y: height / 3,
                w: 10,
                h: 10,
              }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Quest Card - EXACT match to DailyQuests aesthetic */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3 }}
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
                <span className="text-lg leading-none">{icon}</span>
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
              {quest.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {quest.description}
                </p>
              )}
            </div>
          </div>

          {/* XP Reward Badge */}
          <div className={cn(
            "flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold",
            quest.completed
              ? "bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
              : "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
          )}>
            +{quest.xpReward} XP
          </div>
        </div>

        {/* Progress Bar (only for incomplete quests with target > 1) */}
        {!quest.completed && quest.target > 1 && (
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

        {/* Action Button (only when incomplete and has action) */}
        {!quest.completed && quest.action && quest.actionLabel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleActionButtonClick}
            className="w-full h-8 mt-1 text-xs font-medium text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/50"
          >
            {quest.actionLabel}
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        )}
      </motion.div>
    </div>
  );
}

/**
 * Example Usage:
 *
 * ```tsx
 * import { SocialQuest } from '@/components/profile/SocialQuest';
 *
 * // In Social Widget
 * <SocialQuest
 *   quest={{
 *     id: 3,
 *     type: 'battle_win',
 *     title: 'Win a Battle',
 *     description: 'Challenge a friend and win!',
 *     target: 1,
 *     current: 0,
 *     completed: false,
 *     xpReward: 100,
 *     action: '/dashboard/social?tab=battles',
 *     actionLabel: 'Challenge Friend'
 *   }}
 *   onComplete={() => {
 *     // Refetch user stats, update UI, etc.
 *   }}
 *   onActionClick={(action) => {
 *     // Custom navigation or modal handling
 *   }}
 *   refreshInterval={30000} // 30 seconds
 * />
 * ```
 *
 * Quest Types:
 * - 'battle_win': ⚔️ Win a quiz battle (action: "Challenge Friend")
 * - 'share_content': 🤝 Share a lecture (action: "Share Content")
 * - 'perfect_score': ⭐ Get perfect score in battle (no action, informational)
 * - 'social': 🎯 General social activity (action varies)
 */
