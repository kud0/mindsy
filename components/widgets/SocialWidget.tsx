'use client';

import React, { useEffect, useState } from 'react';
import { Users, Swords } from 'lucide-react';
import { BaseWidget } from './BaseWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SocialStats {
  friendCount: number;
  pendingRequestsCount: number;
  battleWins: number;
  battleLosses: number;
  battleDraws: number;
  totalBattles: number;
  recentFriends: Array<{
    id: string;
    user: {
      full_name: string;
      email: string;
      avatar_url: string | null;
    };
  }>;
}

export function SocialWidget() {
  const [stats, setStats] = useState<SocialStats>({
    friendCount: 0,
    pendingRequestsCount: 0,
    battleWins: 0,
    battleLosses: 0,
    battleDraws: 0,
    totalBattles: 0,
    recentFriends: []
  });
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchSocialStats();
  }, []);

  const fetchSocialStats = async () => {
    try {
      // Fetch all social data in parallel
      const [friendsResponse, battlesResponse] = await Promise.all([
        fetch('/api/friends'),
        fetch('/api/battles')
      ]);

      const [friendsData, battlesData] = await Promise.all([
        friendsResponse.ok ? friendsResponse.json() : null,
        battlesResponse.ok ? battlesResponse.json() : null
      ]);

      const battleStats = battlesData?.stats || {};
      const totalBattles = (battleStats.wins || 0) + (battleStats.losses || 0) + (battleStats.draws || 0);

      setStats({
        friendCount: friendsData?.friends?.length || 0,
        pendingRequestsCount: friendsData?.received_requests?.length || 0,
        battleWins: battleStats.wins || 0,
        battleLosses: battleStats.losses || 0,
        battleDraws: battleStats.draws || 0,
        totalBattles,
        recentFriends: friendsData?.friends?.slice(0, 3) || []
      });
    } catch (error) {
      console.error('Failed to fetch social stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getInitial = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || '?';
  };

  const getAvatarColor = (index: number) => {
    const colors = [
      'bg-violet-100 text-violet-700 border-violet-200',
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-pink-100 text-pink-700 border-pink-200'
    ];
    return colors[index % colors.length];
  };

  return (
    <BaseWidget
      title="Social"
      iconImage="/images/refer.png"
      href="/dashboard/social"
      loading={loading}
      badge={
        stats.pendingRequestsCount > 0 ? (
          <Badge variant="destructive" className="ml-2">
            {stats.pendingRequestsCount}
          </Badge>
        ) : undefined
      }
    >
      {stats.friendCount === 0 && stats.pendingRequestsCount === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center py-6">
          <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-200 flex items-center justify-center mb-3">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-sm font-semibold mb-1">Start Connecting</p>
          <p className="text-xs text-muted-foreground">
            Find friends to share notes and compete in quiz battles
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Two Primary Cards - Friends and Battles */}
          <div className="grid grid-cols-2 gap-3">
            {/* Friends Card */}
            <button
              onClick={() => router.push('/dashboard/social?tab=friends')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-200",
                "bg-blue-50/90 backdrop-blur-xl border border-blue-200/60",
                "hover:bg-blue-100/90 hover:border-blue-300/70 hover:shadow-lg hover:shadow-blue-100/50",
                "hover:scale-[1.02] active:scale-[0.98]",
                "h-[100px] relative overflow-hidden"
              )}
            >
              <Users className="h-6 w-6 mb-2 text-blue-600" />
              <p className="text-3xl font-bold leading-none mb-1 text-blue-900">{stats.friendCount}</p>
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                {stats.friendCount === 1 ? 'Friend' : 'Friends'}
              </p>
            </button>

            {/* Battles Card */}
            <button
              onClick={() => router.push('/dashboard/social?tab=battles')}
              className={cn(
                "flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-200",
                "bg-purple-50/90 backdrop-blur-xl border border-purple-200/60",
                "hover:bg-purple-100/90 hover:border-purple-300/70 hover:shadow-lg hover:shadow-purple-100/50",
                "hover:scale-[1.02] active:scale-[0.98]",
                "h-[100px] relative overflow-hidden"
              )}
            >
              <Swords className="h-6 w-6 mb-2 text-purple-600" />
              <p className="text-3xl font-bold leading-none mb-1 text-purple-900">{stats.totalBattles}</p>
              <p className="text-xs font-medium text-purple-700 uppercase tracking-wide">
                {stats.totalBattles === 1 ? 'Battle' : 'Battles'}
              </p>
            </button>
          </div>

          {/* Secondary Info - Friend Requests */}
          {stats.pendingRequestsCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <span className="text-lg">📬</span>
              <span>
                {stats.pendingRequestsCount} Friend {stats.pendingRequestsCount === 1 ? 'Request' : 'Requests'}
              </span>
            </div>
          )}

          {/* Recent Friends Avatars - Only show if there are friends */}
          {stats.recentFriends.length > 0 && (
            <div className="flex items-center gap-2 px-1">
              <div className="flex -space-x-2">
                {stats.recentFriends.map((friend, index) => (
                  <div
                    key={friend.id}
                    className="group relative"
                    title={friend.user.full_name || 'Unknown'}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center ring-2 ring-background border",
                        "transition-transform group-hover:scale-110 group-hover:z-10",
                        getAvatarColor(index)
                      )}
                    >
                      <span className="font-semibold text-xs">
                        {getInitial(friend.user.full_name)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {stats.friendCount > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{stats.friendCount - 3} more
                </span>
              )}
            </div>
          )}

          {/* CTA Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/social?tab=friends')}
              className="flex-1 h-10 text-sm"
            >
              View Friends
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/dashboard/social?tab=battles')}
              className="flex-1 h-10 text-sm"
            >
              Start Battle
            </Button>
          </div>
        </div>
      )}
    </BaseWidget>
  );
}
