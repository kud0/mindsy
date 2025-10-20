"use client"

import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import { NotificationDropdown } from './NotificationDropdown';

interface TopBarProps {
  showNotifications?: boolean;
  onLogoClick?: () => void;
  streakCount?: number; // Optional override for streak value
}

export function TopBar({
  showNotifications = true,
  onLogoClick,
  streakCount
}: TopBarProps) {
  const router = useRouter();
  const [displayStreak, setDisplayStreak] = useState(streakCount ?? 0);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    // If streak is provided as prop, use it
    if (streakCount !== undefined) {
      setDisplayStreak(streakCount);
      return;
    }

    // Otherwise, fetch from database
    const fetchStreak = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('study_streak')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error('Error fetching streak:', error);
            setDisplayStreak(0);
          } else if (profile) {
            setDisplayStreak(profile.study_streak || 0);
          }
        }
      } catch (error) {
        console.error('Error in fetchStreak:', error);
        setDisplayStreak(0);
      }
    };

    fetchStreak();

    // Set up real-time subscription for streak updates
    const setupRealtimeSubscription = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const channel = supabase
          .channel('streak-updates')
          .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${user.id}`
          }, (payload: any) => {
            if (payload.new.study_streak !== undefined) {
              setDisplayStreak(payload.new.study_streak);
            }
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up realtime subscription:', error);
      }
    };

    const cleanup = setupRealtimeSubscription();

    return () => {
      cleanup.then(fn => fn?.());
    };
  }, [streakCount]);

  // Fetch and subscribe to notification count
  useEffect(() => {
    const fetchNotificationCount = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          // Fetch unread count
          const { count } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)
            .eq('read', false);

          setUnreadCount(count || 0);
        }
      } catch (error) {
        console.error('Error fetching notification count:', error);
        setUnreadCount(0);
      }
    };

    fetchNotificationCount();

    // Set up real-time subscription for notification updates
    const setupNotificationSubscription = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) return;

        const channel = supabase
          .channel('notification-updates')
          .on('postgres_changes', {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          }, () => {
            // Refetch count on any notification change
            fetchNotificationCount();
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      } catch (error) {
        console.error('Error setting up notification subscription:', error);
      }
    };

    const cleanup = setupNotificationSubscription();

    return () => {
      cleanup.then(fn => fn?.());
    };
  }, []);

  const handleLogoClick = () => {
    if (onLogoClick) {
      onLogoClick();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 md:px-6">
        {/* Left: MINDSY Logo/Text */}
        <div className="flex items-center gap-2">
          <h1
            className="text-xl font-bold text-foreground hover:text-primary transition-colors cursor-pointer"
            onClick={handleLogoClick}
          >
            MINDSY
          </h1>
        </div>

        {/* Right: Streak Counter + Notification Bell */}
        <div className="flex items-center gap-4">
          {/* Streak Counter */}
          <div className="flex items-center gap-2" aria-label={`${displayStreak} day study streak`}>
            <Image
              src="/images/fire.png"
              alt="Streak"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="text-lg font-bold text-foreground">
              {displayStreak}
            </span>
          </div>

          {/* Notification Bell with Dropdown */}
          {showNotifications && (
            <Popover open={notificationOpen} onOpenChange={setNotificationOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative"
                  aria-label={`Notifications ${unreadCount > 0 ? `(${unreadCount} unread)` : ''}`}
                >
                  <Bell className="h-5 w-5" />
                  {/* Notification badge - shows count when there are unread notifications */}
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse"
                      aria-label={`${unreadCount} unread notifications`}
                    >
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="p-0 w-auto border-0 shadow-none bg-transparent rounded-none overflow-visible" align="end">
                <NotificationDropdown onClose={() => setNotificationOpen(false)} />
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </header>
  );
}
