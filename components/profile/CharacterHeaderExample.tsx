"use client"

/**
 * Example usage of CharacterHeader component
 * This file demonstrates how to integrate CharacterHeader into a profile widget
 */

import React, { useEffect, useState } from 'react';
import { CharacterHeader } from './CharacterHeader';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export function CharacterHeaderExample() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Fetch user data on component mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Handle logout
  const handleLogout = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('Failed to log out');
        console.error('Logout error:', error);
        return;
      }

      toast.success('Logged out successfully');
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Unexpected logout error:', error);
      toast.error('Failed to log out');
    }
  };

  // Handle avatar/name click
  const handleProfileClick = () => {
    router.push('/dashboard/account');
  };

  // Mock stats data - Replace with real data from your backend
  const stats = {
    level: 12,
    xp: 3450,
    xpForNextLevel: 5000,
    xpProgress: (3450 / 5000) * 100, // 69%
    currentStreak: 7,
    title: 'Level 12 Scholar',
    titleColor: 'text-purple-600 dark:text-purple-400',
  };

  // Different title examples based on level
  const getTitleByLevel = (level: number): { title: string; color: string } => {
    if (level >= 30) return { title: `Level ${level} Master`, color: 'text-amber-600 dark:text-amber-400' };
    if (level >= 20) return { title: `Level ${level} Expert`, color: 'text-purple-600 dark:text-purple-400' };
    if (level >= 10) return { title: `Level ${level} Scholar`, color: 'text-blue-600 dark:text-blue-400' };
    return { title: `Level ${level} Student`, color: 'text-gray-600 dark:text-gray-400' };
  };

  if (loading) {
    return (
      <div className="w-full h-32 bg-gray-200 dark:bg-gray-800 rounded-2xl animate-pulse" />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto p-4">
      <CharacterHeader
        user={user}
        stats={stats}
        onLogout={handleLogout}
        onClick={handleProfileClick}
      />

      {/* Example: Different stat configurations */}
      <div className="mt-8 space-y-4">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          Different Stat Configurations
        </h3>

        {/* Beginner - Low Level */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Beginner (Level 5)</p>
          <CharacterHeader
            user={user}
            stats={{
              level: 5,
              xp: 850,
              xpForNextLevel: 1000,
              xpProgress: 85,
              currentStreak: 3,
              ...getTitleByLevel(5)
            }}
            onLogout={handleLogout}
          />
        </div>

        {/* Advanced - Mid Level */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Advanced (Level 25)</p>
          <CharacterHeader
            user={user}
            stats={{
              level: 25,
              xp: 12500,
              xpForNextLevel: 15000,
              xpProgress: 83.3,
              currentStreak: 30,
              ...getTitleByLevel(25)
            }}
            onLogout={handleLogout}
          />
        </div>

        {/* Master - High Level */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">Master (Level 45)</p>
          <CharacterHeader
            user={user}
            stats={{
              level: 45,
              xp: 95000,
              xpForNextLevel: 100000,
              xpProgress: 95,
              currentStreak: 100,
              ...getTitleByLevel(45)
            }}
            onLogout={handleLogout}
          />
        </div>

        {/* No Streak */}
        <div className="space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400">No Active Streak</p>
          <CharacterHeader
            user={user}
            stats={{
              level: 8,
              xp: 1200,
              xpForNextLevel: 2000,
              xpProgress: 60,
              currentStreak: 0, // No streak badge shown
              ...getTitleByLevel(8)
            }}
            onLogout={handleLogout}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Integration Notes:
 *
 * 1. **XP Calculation**:
 *    - Calculate xpProgress as: (currentXP / xpForNextLevel) * 100
 *    - Ensure it's clamped between 0-100
 *
 * 2. **Level Progression**:
 *    - Define your XP curve (linear, exponential, etc.)
 *    - Example linear: Level 1 = 1000 XP, Level 2 = 2000 XP, etc.
 *    - Example exponential: Level N = 1000 * (1.5 ^ N) XP
 *
 * 3. **Title System**:
 *    - Customize titles based on your gamification system
 *    - Options: Level-based, Achievement-based, Custom user-selected
 *    - Color coding helps distinguish rank tiers
 *
 * 4. **Streak System**:
 *    - Track consecutive days of activity
 *    - Badge pulses when streak >= 7 days (milestone)
 *    - Consider adding streak freeze mechanics (like Duolingo)
 *
 * 5. **Responsive Design**:
 *    - Avatar: 64px (mobile) → 80px (desktop)
 *    - Text: Responsive font sizes with md: breakpoint
 *    - Progress bar: 10px (mobile) → 12px (desktop)
 *
 * 6. **Accessibility**:
 *    - Avatar is clickable with keyboard support (Tab + Enter)
 *    - ARIA labels for screen readers
 *    - Focus indicators on interactive elements
 *    - Proper color contrast (WCAG AA compliant)
 */
