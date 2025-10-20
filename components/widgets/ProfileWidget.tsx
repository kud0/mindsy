"use client"

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

interface ActivityData {
  study: { completed: number; total: number; color: string };
  exams: { completed: number; total: number; color: string };
  streak: { completed: number; total: number; color: string };
}

export function ProfileWidget() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Mock activity data - Apple style rings
  const activityData: ActivityData = {
    study: { completed: 75, total: 100, color: 'text-red-500' },
    exams: { completed: 60, total: 100, color: 'text-green-500' },
    streak: { completed: 40, total: 100, color: 'text-blue-500' }
  };

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

  const getInitials = (email: string) => {
    if (!email) return 'A';
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  const displayName = user?.user_metadata?.full_name ||
                      user?.email?.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
                      'Alex';

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

  const ActivityRings = () => {
    const size = 120;
    const centerX = size / 2;
    const centerY = size / 2;
    const strokeWidth = 12; // Made thicker
    
    // Ring radii - outer to inner (adjusted for thicker strokes)
    const redRadius = 48;
    const greenRadius = 36;
    const blueRadius = 24;
    
    // Calculate circumferences and offsets
    const redCircumference = 2 * Math.PI * redRadius;
    const greenCircumference = 2 * Math.PI * greenRadius;
    const blueCircumference = 2 * Math.PI * blueRadius;
    
    const redOffset = redCircumference - (activityData.study.completed / 100) * redCircumference;
    const greenOffset = greenCircumference - (activityData.exams.completed / 100) * greenCircumference;
    const blueOffset = blueCircumference - (activityData.streak.completed / 100) * blueCircumference;

    return (
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background rings */}
          <circle
            cx={centerX}
            cy={centerY}
            r={redRadius}
            stroke="rgb(255, 69, 114)"
            strokeWidth={strokeWidth}
            fill="transparent"
            opacity="0.15"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={greenRadius}
            stroke="rgb(101, 206, 100)"
            strokeWidth={strokeWidth}
            fill="transparent"
            opacity="0.15"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={blueRadius}
            stroke="rgb(52, 199, 235)"
            strokeWidth={strokeWidth}
            fill="transparent"
            opacity="0.15"
          />
          
          {/* Progress rings */}
          <circle
            cx={centerX}
            cy={centerY}
            r={redRadius}
            stroke="rgb(255, 69, 114)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={redCircumference}
            strokeDashoffset={redOffset}
            strokeLinecap="round"
            className="drop-shadow-sm"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={greenRadius}
            stroke="rgb(101, 206, 100)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={greenCircumference}
            strokeDashoffset={greenOffset}
            strokeLinecap="round"
            className="drop-shadow-sm"
          />
          <circle
            cx={centerX}
            cy={centerY}
            r={blueRadius}
            stroke="rgb(52, 199, 235)"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={blueCircumference}
            strokeDashoffset={blueOffset}
            strokeLinecap="round"
            className="drop-shadow-sm"
          />
        </svg>
      </div>
    );
  };

  const handleCardClick = () => {
    router.push('/dashboard/account');
  };

  return (
    <div
      className="h-full w-full rounded-3xl bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900 dark:to-blue-800 p-6 flex flex-col justify-between relative overflow-hidden cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleCardClick();
        }
      }}
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-transparent rounded-3xl" />

      {/* Logout Button - Top Right */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // Prevent card click
          handleLogout();
        }}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 transition-all hover:scale-105 group"
        title="Log out"
      >
        <LogOut className="w-4 h-4 text-gray-700 dark:text-gray-200 group-hover:text-red-600" />
      </button>

      {/* Top section - Profile Info */}
      <div className="relative z-10 flex items-center gap-4">
        {/* Profile Photo */}
        <div className="relative">
          <div className={cn(
            "w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden",
            "bg-gradient-to-br from-purple-500 to-pink-500 shadow-lg"
          )}>
            {user?.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt={displayName}
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <span className={user?.user_metadata?.avatar_url ? 'hidden' : ''}>
              {getInitials(user?.email || 'alex@gmail.com')}
            </span>
          </div>
        </div>

        {/* Name and Badge */}
        <div className="flex-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{displayName}</h2>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/30 backdrop-blur-sm border border-white/30">
            <span className="text-xs font-medium text-gray-800 dark:text-gray-200">Mindsy Pro</span>
          </div>
        </div>
      </div>

      {/* Bottom section - Activity Rings */}
      <div className="relative z-10 flex justify-center">
        <div className="scale-90">
          <ActivityRings />
        </div>
      </div>

      {/* Quick Stats Below Badge */}
      <div className="relative z-10 flex items-center justify-center gap-4 text-xs text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-1">
          <span className="font-semibold">{activityData.study.completed}</span>
          <span className="opacity-70">Study</span>
        </div>
        <span className="opacity-50">•</span>
        <div className="flex items-center gap-1">
          <span className="font-semibold">{activityData.exams.completed}</span>
          <span className="opacity-70">Exams</span>
        </div>
        <span className="opacity-50">•</span>
        <div className="flex items-center gap-1">
          <span className="font-semibold">{activityData.streak.completed}</span>
          <span className="opacity-70">Streak</span>
        </div>
      </div>
    </div>
  );
}