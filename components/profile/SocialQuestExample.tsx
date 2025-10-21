"use client"

import React, { useState } from 'react';
import { SocialQuest } from './SocialQuest';

/**
 * SocialQuest Example Component
 *
 * Demonstrates the SocialQuest component with different quest types and states.
 * This shows how to integrate the quest into the Social widget.
 */
export function SocialQuestExample() {
  // Simulate different quest states
  const [activeQuestIndex, setActiveQuestIndex] = useState(0);
  const [questStates, setQuestStates] = useState([
    // Quest 1: Battle Win (Incomplete)
    {
      id: 1,
      type: 'battle_win' as const,
      title: 'Win a Battle',
      target: 1,
      current: 0,
      completed: false,
      xpReward: 100,
      action: '/dashboard/social?tab=battles',
      actionLabel: 'Challenge Friend',
    },
    // Quest 2: Share Content (In Progress)
    {
      id: 2,
      type: 'share_content' as const,
      title: 'Share a Lecture',
      target: 1,
      current: 0,
      completed: false,
      xpReward: 50,
      action: '/dashboard/social?tab=shared',
      actionLabel: 'Share Content',
    },
    // Quest 3: Perfect Score (Informational - no action)
    {
      id: 3,
      type: 'perfect_score' as const,
      title: 'Perfect Battle Score',
      target: 1,
      current: 0,
      completed: false,
      xpReward: 150,
    },
    // Quest 4: Completed Quest
    {
      id: 4,
      type: 'battle_win' as const,
      title: 'Win a Battle',
      target: 1,
      current: 1,
      completed: true,
      xpReward: 100,
    },
  ]);

  const currentQuest = questStates[activeQuestIndex];

  const handleQuestComplete = () => {
    console.log('Quest completed! Trigger any side effects here.');
    // In real app: refetch user data, update XP, etc.
  };

  const handleActionClick = (action: string) => {
    console.log('Action clicked:', action);
    // Custom handling - could open modal instead of navigation
  };

  const simulateProgress = () => {
    setQuestStates((prev) => {
      const updated = [...prev];
      const quest = { ...updated[activeQuestIndex] };

      if (!quest.completed && quest.current < quest.target) {
        quest.current += 1;
        if (quest.current >= quest.target) {
          quest.completed = true;
        }
        updated[activeQuestIndex] = quest;
      }

      return updated;
    });
  };

  const resetQuest = () => {
    setQuestStates((prev) => {
      const updated = [...prev];
      updated[activeQuestIndex] = {
        ...updated[activeQuestIndex],
        current: 0,
        completed: false,
      };
      return updated;
    });
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 space-y-6 bg-gray-50 dark:bg-gray-900 rounded-lg">
      <div>
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
          Social Quest Component
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Compact quest display for the Social widget
        </p>
      </div>

      {/* The Social Quest Component */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Daily Social Quest
        </h3>

        <SocialQuest
          quest={currentQuest}
          onComplete={handleQuestComplete}
          onActionClick={handleActionClick}
          refreshInterval={30000}
        />
      </div>

      {/* Controls (for demo purposes) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm space-y-3">
        <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Demo Controls
        </h3>

        {/* Quest Selector */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Select Quest Type:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {questStates.map((quest, index) => (
              <button
                key={quest.id}
                onClick={() => setActiveQuestIndex(index)}
                className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                  activeQuestIndex === index
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {quest.type === 'battle_win' && index === 0 && 'Battle Win'}
                {quest.type === 'share_content' && 'Share Content'}
                {quest.type === 'perfect_score' && 'Perfect Score'}
                {quest.type === 'battle_win' && index === 3 && 'Completed'}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Controls */}
        <div className="flex gap-2">
          <button
            onClick={simulateProgress}
            disabled={currentQuest.completed}
            className="flex-1 px-3 py-2 text-xs font-medium bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors"
          >
            Simulate Progress
          </button>
          <button
            onClick={resetQuest}
            className="flex-1 px-3 py-2 text-xs font-medium bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Reset Quest
          </button>
        </div>

        {/* Current State Display */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md">
          <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
            Progress: {currentQuest.current}/{currentQuest.target} ({Math.round((currentQuest.current / currentQuest.target) * 100)}%)
          </p>
          <p className="text-xs font-mono text-gray-600 dark:text-gray-400">
            Completed: {currentQuest.completed ? '✓' : '✗'}
          </p>
        </div>
      </div>

      {/* Integration Example */}
      <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-4 border border-blue-200 dark:border-blue-900">
        <h3 className="text-xs font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wide mb-2">
          Integration Example
        </h3>
        <pre className="text-[10px] text-blue-800 dark:text-blue-200 overflow-x-auto">
{`// In Social Widget
<SocialQuest
  quest={{
    id: 3,
    type: 'battle_win',
    title: 'Win a Battle',
    target: 1,
    current: 0,
    completed: false,
    xpReward: 100,
    action: '/dashboard/social',
    actionLabel: 'Challenge Friend'
  }}
  onComplete={() => {
    // Refetch stats
  }}
/>`}
        </pre>
      </div>

      {/* Quest Type Documentation */}
      <div className="bg-purple-50 dark:bg-purple-950/30 rounded-lg p-4 border border-purple-200 dark:border-purple-900">
        <h3 className="text-xs font-semibold text-purple-900 dark:text-purple-100 uppercase tracking-wide mb-2">
          Quest Types
        </h3>
        <ul className="space-y-1 text-xs text-purple-800 dark:text-purple-200">
          <li><strong>battle_win:</strong> Win a quiz battle → &quot;Challenge Friend&quot;</li>
          <li><strong>share_content:</strong> Share a lecture → &quot;Share Lecture&quot;</li>
          <li><strong>perfect_score:</strong> Perfect battle score (informational)</li>
          <li><strong>social:</strong> General social activity (varies)</li>
        </ul>
      </div>
    </div>
  );
}

/**
 * How to use in Social Widget:
 *
 * 1. Fetch daily quest from API (or compute from user activity)
 * 2. Pass quest3 (social quest) to SocialQuest component
 * 3. Place at top or bottom of social widget
 * 4. Handle completion callback to refetch user data
 *
 * Example placement in Social Widget:
 * ```tsx
 * <div className="social-widget">
 *   <SocialQuest quest={dailyQuests.quest3} />
 *
 *   <div className="social-stats">
 *     // Friends, battles, etc.
 *   </div>
 *
 *   <div className="social-actions">
 *     // View Friends, Start Battle buttons
 *   </div>
 * </div>
 * ```
 */
