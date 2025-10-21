"use client"

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CharacterHeader } from '@/components/profile/CharacterHeader';
import { ActivityHeatmap, ActivityDay } from '@/components/profile/ActivityHeatmap';
import { Skeleton } from '@/components/ui/skeleton';

interface ProfileStats {
  level: number;
  xp: number;
  xpForNextLevel: number;
  xpProgress: number;
  currentStreak: number;
  title: string;
  titleColor: string;
}

export function ProfileWidget() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [heatmapData, setHeatmapData] = useState<ActivityDay[]>([]);

  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingHeatmap, setLoadingHeatmap] = useState(true);

  const [statsError, setStatsError] = useState(false);
  const [heatmapError, setHeatmapError] = useState(false);

  const router = useRouter();

  // Fetch user data
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
        toast.error('Failed to load user profile');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, []);

  // Fetch all profile data in parallel
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        // Fetch both endpoints in parallel
        const [statsRes, heatmapRes] = await Promise.allSettled([
          fetch('/api/profile/stats'),
          fetch('/api/profile/activity-heatmap')
        ]);

        // Handle stats response
        if (statsRes.status === 'fulfilled' && statsRes.value.ok) {
          const statsData = await statsRes.value.json();
          if (statsData.success) {
            setStats(statsData.data);
          } else {
            setStatsError(true);
          }
        } else {
          setStatsError(true);
        }

        // Handle heatmap response
        if (heatmapRes.status === 'fulfilled' && heatmapRes.value.ok) {
          const heatmapResult = await heatmapRes.value.json();
          if (heatmapResult.success) {
            setHeatmapData(heatmapResult.data);
          } else {
            setHeatmapError(true);
          }
        } else {
          setHeatmapError(true);
        }
      } catch (error) {
        console.error('Error fetching profile data:', error);
        toast.error('Failed to load profile data');
        setStatsError(true);
        setHeatmapError(true);
      } finally {
        setLoadingStats(false);
        setLoadingHeatmap(false);
      }
    };

    if (!loadingUser) {
      fetchProfileData();
    }
  }, [loadingUser]);

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

  // Handle account page navigation
  const handleAccountClick = () => {
    router.push('/dashboard/account');
  };

  // Handle heatmap day click
  const handleDayClick = (date: string) => {
    // TODO: Open modal/sheet with detailed activity for that day
    toast.info(`Activity details for ${date}`, {
      description: 'Detailed view coming soon!',
    });
  };

  // Default stats for error state
  const defaultStats: ProfileStats = {
    level: 1,
    xp: 0,
    xpForNextLevel: 100,
    xpProgress: 0,
    currentStreak: 0,
    title: 'Novice',
    titleColor: 'text-gray-600',
  };

  return (
    <div className="h-full w-full rounded-3xl bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 p-5 flex flex-col gap-3 overflow-auto">
      {/* Section 1: Character Header */}
      {loadingUser || loadingStats ? (
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-8 w-24 mx-auto" />
        </div>
      ) : statsError || !user ? (
        <div className="rounded-2xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-4 text-center">
          <p className="text-sm text-red-600 dark:text-red-400 mb-2">
            Failed to load profile stats
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-xs text-red-700 dark:text-red-300 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      ) : (
        <CharacterHeader
          user={user}
          stats={stats || defaultStats}
          onLogout={handleLogout}
          onClick={handleAccountClick}
        />
      )}

      {/* Divider */}
      <div className="h-px bg-gradient-to-r from-transparent via-gray-300 dark:via-gray-700 to-transparent" />

      {/* Section 2: Activity Heatmap */}
      {loadingHeatmap ? (
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-7 gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((j) => (
              <Skeleton key={j} className="aspect-square w-full rounded-md" />
            ))}
          </div>
        </div>
      ) : heatmapError ? (
        <div className="rounded-2xl border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30 p-4 text-center">
          <p className="text-sm text-yellow-600 dark:text-yellow-400">
            Activity data unavailable
          </p>
        </div>
      ) : (
        <ActivityHeatmap data={heatmapData} onDayClick={handleDayClick} />
      )}
    </div>
  );
}
