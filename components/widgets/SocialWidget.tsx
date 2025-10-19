'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Bell } from 'lucide-react';
import { BaseWidget } from './BaseWidget';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SocialStats {
  friendCount: number;
  pendingRequestsCount: number;
  unreadNotificationsCount: number;
  recentFriends: Array<{
    id: string;
    user: {
      full_name: string;
      email: string;
    };
  }>;
}

export function SocialWidget() {
  const [stats, setStats] = useState<SocialStats>({
    friendCount: 0,
    pendingRequestsCount: 0,
    unreadNotificationsCount: 0,
    recentFriends: []
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchSocialStats();
  }, []);

  const fetchSocialStats = async () => {
    try {
      // Fetch friends
      const friendsResponse = await fetch('/api/friends');
      const notificationsResponse = await fetch('/api/notifications?unread_only=true');

      const [friendsData, notificationsData] = await Promise.all([
        friendsResponse.ok ? friendsResponse.json() : null,
        notificationsResponse.ok ? notificationsResponse.json() : null
      ]);

      if (friendsData) {
        setStats({
          friendCount: friendsData.friends?.length || 0,
          pendingRequestsCount: friendsData.received_requests?.length || 0,
          unreadNotificationsCount: notificationsData?.unread_count || 0,
          recentFriends: friendsData.friends?.slice(0, 4) || []
        });
      }
    } catch (error) {
      console.error('Failed to fetch social stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || '?';
  };

  return (
    <BaseWidget
      title="Social"
      icon={Users}
      href="/dashboard/social"
      color="text-blue-600"
      bgColor="bg-blue-100"
      loading={loading}
      badge={
        stats.pendingRequestsCount > 0 || stats.unreadNotificationsCount > 0 ? (
          <Badge variant="destructive" className="ml-2">
            {stats.pendingRequestsCount + stats.unreadNotificationsCount}
          </Badge>
        ) : undefined
      }
    >
      {stats.friendCount === 0 && stats.pendingRequestsCount === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <Users className="h-12 w-12 opacity-50 mb-3" />
          <p className="text-sm font-medium">No friends yet</p>
          <p className="text-xs opacity-70 mt-1">Connect with classmates to share notes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stats Overview */}
          <div className="grid grid-cols-3 gap-2">
            <div
              className="flex flex-col items-center p-2 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors"
              onClick={() => router.push('/dashboard/social?tab=friends')}
            >
              <Users className="h-5 w-5 mb-1" />
              <p className="text-lg font-bold">{stats.friendCount}</p>
              <p className="text-xs opacity-70">Friends</p>
            </div>

            <div
              className={cn(
                "flex flex-col items-center p-2 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors relative",
                stats.pendingRequestsCount > 0 && "bg-orange-500/20"
              )}
              onClick={() => router.push('/dashboard/social?tab=friends&subtab=requests')}
            >
              <UserPlus className="h-5 w-5 mb-1" />
              <p className="text-lg font-bold">{stats.pendingRequestsCount}</p>
              <p className="text-xs opacity-70">Requests</p>
              {stats.pendingRequestsCount > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>

            <div
              className={cn(
                "flex flex-col items-center p-2 bg-white/10 rounded-lg cursor-pointer hover:bg-white/20 transition-colors relative",
                stats.unreadNotificationsCount > 0 && "bg-blue-500/20"
              )}
              onClick={() => router.push('/dashboard/social?tab=notifications')}
            >
              <Bell className="h-5 w-5 mb-1" />
              <p className="text-lg font-bold">{stats.unreadNotificationsCount}</p>
              <p className="text-xs opacity-70">Unread</p>
              {stats.unreadNotificationsCount > 0 && (
                <div className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              )}
            </div>
          </div>

          {/* Recent Friends Preview */}
          {stats.recentFriends.length > 0 && (
            <div>
              <p className="text-xs opacity-70 mb-2 font-medium">Recent Friends</p>
              <div className="grid grid-cols-2 gap-2">
                {stats.recentFriends.map((friend) => (
                  <div
                    key={friend.id}
                    className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors cursor-pointer"
                    onClick={() => router.push('/dashboard/social')}
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-semibold text-sm">
                        {getInitial(friend.user.full_name)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {friend.user.full_name || 'Unknown'}
                      </p>
                      <p className="text-xs opacity-60 truncate">
                        {friend.user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </BaseWidget>
  );
}
