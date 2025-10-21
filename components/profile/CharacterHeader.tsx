"use client"

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterHeaderProps {
  user: {
    email: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
    };
  };
  stats: {
    level: number;
    xp: number;
    xpForNextLevel: number;
    xpProgress: number; // Percentage (0-100)
    currentStreak: number;
    title: string;
    titleColor: string; // Tailwind color class (e.g., 'text-purple-600')
  };
  onLogout: () => void;
  onClick?: () => void;
}

export function CharacterHeader({ user, stats, onLogout, onClick }: CharacterHeaderProps) {
  // Get user initials for avatar fallback
  const getInitials = (email: string) => {
    if (!email) return 'U';
    const parts = email.split('@')[0].split('.');
    if (parts.length > 1) {
      return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Display name from user metadata or email
  const displayName = user?.user_metadata?.full_name ||
    user?.email?.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) ||
    'User';

  return (
    <div className="relative w-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/40 dark:to-purple-950/40 rounded-2xl p-4 md:p-5 border border-border/50">
      {/* Logout Button - Top Right */}
      <Button
        onClick={(e) => {
          e.stopPropagation();
          onLogout();
        }}
        variant="ghost"
        size="icon"
        className="absolute top-3 right-3 z-10 h-8 w-8 rounded-full bg-white/50 hover:bg-white/80 dark:bg-black/20 dark:hover:bg-black/40 backdrop-blur-sm border border-border/30 transition-all hover:scale-105 group"
        title="Log out"
      >
        <LogOut className="h-4 w-4 text-gray-700 dark:text-gray-300 group-hover:text-red-600 dark:group-hover:text-red-500 transition-colors" />
      </Button>

      {/* Avatar and Info Section */}
      <div
        className={cn(
          "flex items-center gap-4 mb-4",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
        role={onClick ? "button" : undefined}
        tabIndex={onClick ? 0 : undefined}
        onKeyDown={(e) => {
          if (onClick && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onClick();
          }
        }}
      >
        {/* Avatar with Gradient Background */}
        <div className="relative">
          <div className="p-0.5 rounded-full bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-md">
            <Avatar className="h-16 w-16 md:h-20 md:w-20 border-2 border-white dark:border-gray-900 transition-transform hover:scale-105">
              <AvatarImage
                src={user?.user_metadata?.avatar_url}
                alt={displayName}
              />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xl md:text-2xl font-bold">
                {getInitials(user?.email || '')}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Name and Title */}
        <div className="flex-1 min-w-0 pr-8">
          <h2 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white truncate mb-1">
            {displayName}
          </h2>
          <p className={cn(
            "text-sm md:text-base font-semibold truncate",
            stats.titleColor
          )}>
            {stats.title}
          </p>
        </div>
      </div>

      {/* XP Progress Section */}
      <div className="space-y-2">
        {/* Level and XP Numbers */}
        <div className="flex items-center justify-between text-xs md:text-sm">
          <span className="font-medium text-gray-700 dark:text-gray-300">
            Level {stats.level}
          </span>
          <span className="font-medium text-gray-600 dark:text-gray-400">
            {stats.xp.toLocaleString()} / {stats.xpForNextLevel.toLocaleString()} XP
          </span>
        </div>

        {/* Progress Bar */}
        <div className="relative">
          <Progress
            value={stats.xpProgress}
            className="h-2.5 md:h-3 bg-gray-200 dark:bg-gray-700/50"
          />
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out shadow-sm"
            style={{ width: `${Math.min(stats.xpProgress, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
