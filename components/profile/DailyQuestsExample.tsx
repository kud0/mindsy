"use client"

import React, { useState } from 'react';
import { DailyQuests, Quest } from './DailyQuests';

/**
 * Example component demonstrating how to use DailyQuests
 *
 * This shows:
 * 1. Sample quest data structure
 * 2. State management for bonus claiming
 * 3. Integration with profile widget
 */
export function DailyQuestsExample() {
  // Example quest data
  const [quests, setQuests] = useState<Quest[]>([
    {
      id: 1,
      type: 'pomodoro',
      title: 'Complete 4 Pomodoros',
      description: 'Focus deeply with timed sessions',
      target: 4,
      current: 4,
      completed: true,
      xpReward: 50,
      icon: '🍅',
      action: '/dashboard/pomodoro',
      actionLabel: 'Start Pomodoro'
    },
    {
      id: 2,
      type: 'questions',
      title: 'Answer 20 Questions',
      description: 'Test your knowledge',
      target: 20,
      current: 14,
      completed: false,
      xpReward: 75,
      icon: '📝',
      action: '/dashboard/study',
      actionLabel: 'Practice Now'
    },
    {
      id: 3,
      type: 'battle',
      title: 'Win a Battle Today',
      description: 'Challenge a friend and win',
      target: 1,
      current: 0,
      completed: false,
      xpReward: 100,
      icon: '⚔️',
      action: '/dashboard/social?tab=battles',
      actionLabel: 'Challenge Friend'
    }
  ]);

  const [bonusClaimed, setBonusClaimed] = useState(false);

  // Check if all quests are completed
  const allCompleted = quests.every(q => q.completed);

  // Bonus XP calculation
  const bonusXP = 200;

  const handleClaimBonus = () => {
    setBonusClaimed(true);
    console.log('Bonus XP claimed!', bonusXP);
    // Here you would typically:
    // 1. Update user XP in database
    // 2. Show success toast
    // 3. Update profile widget
  };

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Daily Quests Demo</h1>

      <DailyQuests
        quests={quests}
        allCompleted={allCompleted}
        bonusXP={bonusXP}
        bonusClaimed={bonusClaimed}
        onClaimBonus={handleClaimBonus}
      />

      {/* Debug info */}
      <div className="mt-8 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs">
        <h3 className="font-semibold mb-2">Debug Info:</h3>
        <pre className="whitespace-pre-wrap">
          {JSON.stringify({
            allCompleted,
            bonusClaimed,
            completedCount: quests.filter(q => q.completed).length,
            totalXP: quests.reduce((sum, q) => sum + (q.completed ? q.xpReward : 0), 0)
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
}

/**
 * Alternative Example: Fresh daily quests (nothing completed)
 */
export function DailyQuestsFreshExample() {
  const quests: Quest[] = [
    {
      id: 1,
      type: 'study',
      title: 'Study for 2 hours',
      description: 'Complete focused study sessions',
      target: 120, // minutes
      current: 45,
      completed: false,
      xpReward: 100,
      icon: '📚',
    },
    {
      id: 2,
      type: 'lecture',
      title: 'Review 3 Lectures',
      description: 'Go through your saved lectures',
      target: 3,
      current: 1,
      completed: false,
      xpReward: 60,
      icon: '🎓',
      action: '/dashboard/lectures',
      actionLabel: 'View Lectures'
    },
    {
      id: 3,
      type: 'exam',
      title: 'Take a Practice Exam',
      description: 'Test yourself on course material',
      target: 1,
      current: 0,
      completed: false,
      xpReward: 150,
      icon: '📋',
      action: '/dashboard/exams',
      actionLabel: 'Start Exam'
    }
  ];

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Fresh Daily Quests</h1>

      <DailyQuests
        quests={quests}
        allCompleted={false}
        bonusXP={250}
        bonusClaimed={false}
        onClaimBonus={() => console.log('Bonus claimed!')}
      />
    </div>
  );
}

/**
 * Alternative Example: All completed, ready for bonus
 */
export function DailyQuestsCompleteExample() {
  const quests: Quest[] = [
    {
      id: 1,
      type: 'pomodoro',
      title: 'Complete 4 Pomodoros',
      description: 'Focus deeply with timed sessions',
      target: 4,
      current: 4,
      completed: true,
      xpReward: 50,
      icon: '🍅',
    },
    {
      id: 2,
      type: 'questions',
      title: 'Answer 20 Questions',
      description: 'Test your knowledge',
      target: 20,
      current: 20,
      completed: true,
      xpReward: 75,
      icon: '📝',
    },
    {
      id: 3,
      type: 'battle',
      title: 'Win a Battle Today',
      description: 'Challenge a friend and win',
      target: 1,
      current: 1,
      completed: true,
      xpReward: 100,
      icon: '⚔️',
    }
  ];

  return (
    <div className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">All Quests Complete!</h1>

      <DailyQuests
        quests={quests}
        allCompleted={true}
        bonusXP={200}
        bonusClaimed={false}
        onClaimBonus={() => alert('🎉 Congratulations! +200 Bonus XP!')}
      />
    </div>
  );
}
