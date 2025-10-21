'use client';

import React, { useEffect, useState } from 'react';
import { Users, Swords } from 'lucide-react';
import { BaseWidget } from './BaseWidget';
import { Badge } from '@/components/ui/badge';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SocialQuest } from '@/components/profile/SocialQuest';
import { SocialStatsModal } from './SocialStatsModal';
import { SocialModal } from './SocialModal';

interface QuestData {
  id: number;
  type: 'battle_win' | 'share_content' | 'perfect_score' | 'social';
  title: string;
  target: number;
  current: number;
  completed: boolean;
  xpReward: number;
  action?: string;
  actionLabel?: string;
}

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
  const [quest, setQuest] = useState<QuestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [questError, setQuestError] = useState(false);
  const [statsModalOpen, setStatsModalOpen] = useState(false);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [socialModalTab, setSocialModalTab] = useState<'friends' | 'battles' | 'shared'>('friends');
  const router = useRouter();

  useEffect(() => {
    fetchSocialStats();
    fetchQuest();
  }, []);

  // Auto-refresh quest every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchQuest();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchQuest = async () => {
    try {
      const res = await fetch('/api/profile/daily-quests?questId=3');
      if (!res.ok) {
        throw new Error('Failed to fetch quest');
      }
      const { data } = await res.json();
      setQuest(data?.quest || null);
      setQuestError(false);
    } catch (error) {
      console.error('Failed to fetch social quest:', error);
      setQuestError(true);
      setQuest(null);
    }
  };

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

  const handleQuestAction = (action: string) => {
    router.push(action);
  };

  const handleQuestComplete = () => {
    // Refetch social stats when quest completes
    fetchSocialStats();
  };

  const getInitial = (name: string) => {
    return name?.charAt(0)?.toUpperCase() || '?';
  };

  const getAvatarStyle = (index: number) => {
    const gradients = [
      'bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30',
      'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30',
      'bg-gradient-to-br from-pink-50 to-blue-50 dark:from-pink-900/30 dark:to-blue-900/30'
    ];
    return gradients[index % gradients.length];
  };

  const handleOpenSocialModal = (tab?: 'friends' | 'battles' | 'shared') => {
    if (tab) setSocialModalTab(tab);
    setSocialModalOpen(true);
  };

  return (
    <>
      {/* Social Stats Modal - Quick preview */}
      <SocialStatsModal
        open={statsModalOpen}
        onOpenChange={setStatsModalOpen}
        stats={stats}
      />

      {/* Social Modal - Full featured */}
      <SocialModal
        open={socialModalOpen}
        onOpenChange={setSocialModalOpen}
        initialTab={socialModalTab}
      />

      <BaseWidget
        title="Social"
        iconImage="/images/refer.png"
        onClick={() => handleOpenSocialModal('friends')}
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
        <div className="space-y-3">
          {/* SocialQuest - Daily social quest at top - Always visible */}
          {quest ? (
            <SocialQuest
              quest={quest}
              onActionClick={handleQuestAction}
              onComplete={handleQuestComplete}
              refreshInterval={30000}
            />
          ) : questError ? (
            <div className="rounded-xl p-3 border border-gray-200/50 dark:border-gray-700/50 bg-muted/30">
              <p className="text-xs text-muted-foreground text-center">
                Quest unavailable. Check back tomorrow!
              </p>
            </div>
          ) : (
            <div className="rounded-xl p-3 border border-gray-200/50 dark:border-gray-700/50 bg-muted/30 animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-2" />
              <div className="h-2 bg-muted rounded w-full" />
            </div>
          )}

          {/* Two Primary Cards - Friends and Battles */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Friends Card */}
            <button
              onClick={() => handleOpenSocialModal('friends')}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl",
                "transition-all duration-300 cursor-pointer",
                "border border-gray-200/50 dark:border-gray-700/50",
                "hover:border-purple-200/70 dark:hover:border-purple-700/70",
                "hover:shadow-md hover:shadow-purple-100/20 dark:hover:shadow-purple-900/10",
                "bg-gradient-to-br from-transparent to-purple-50/10 dark:to-purple-950/5",
                "hover:bg-gradient-to-br hover:from-purple-50/20 hover:to-pink-50/10",
                "dark:hover:from-purple-950/10 dark:hover:to-pink-950/5",
                "h-[85px]"
              )}
            >
              <Users className="h-5 w-5 mb-1.5 text-purple-600/70 dark:text-purple-400/70" />
              <p className="text-2xl font-bold leading-none mb-0.5">{stats.friendCount}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {stats.friendCount === 1 ? 'Friend' : 'Friends'}
              </p>
            </button>

            {/* Battles Card */}
            <button
              onClick={() => handleOpenSocialModal('battles')}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-xl",
                "transition-all duration-300 cursor-pointer",
                "border border-gray-200/50 dark:border-gray-700/50",
                "hover:border-purple-200/70 dark:hover:border-purple-700/70",
                "hover:shadow-md hover:shadow-purple-100/20 dark:hover:shadow-purple-900/10",
                "bg-gradient-to-br from-transparent to-purple-50/10 dark:to-purple-950/5",
                "hover:bg-gradient-to-br hover:from-purple-50/20 hover:to-pink-50/10",
                "dark:hover:from-purple-950/10 dark:hover:to-pink-950/5",
                "h-[85px]"
              )}
            >
              <Swords className="h-5 w-5 mb-1.5 text-purple-600/70 dark:text-purple-400/70" />
              <p className="text-2xl font-bold leading-none mb-0.5">{stats.totalBattles}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                {stats.totalBattles === 1 ? 'Battle' : 'Battles'}
              </p>
            </button>
          </div>

          {/* Secondary Info - Friend Requests */}
          {stats.pendingRequestsCount > 0 && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <span className="text-base">📬</span>
              <span>
                {stats.pendingRequestsCount} Friend {stats.pendingRequestsCount === 1 ? 'Request' : 'Requests'}
              </span>
            </div>
          )}

          {/* Recent Friends Avatars - Only show if there are friends */}
          {stats.recentFriends.length > 0 && (
            <div className="flex items-center gap-1.5 px-1">
              <div className="flex -space-x-2">
                {stats.recentFriends.map((friend, index) => (
                  <div
                    key={friend.id}
                    className="group relative"
                    title={friend.user.full_name || 'Unknown'}
                  >
                    <div
                      className={cn(
                        "w-6 h-6 rounded-full flex items-center justify-center",
                        "ring-2 ring-background",
                        "border border-purple-100/50 dark:border-purple-900/30",
                        "transition-transform group-hover:scale-110",
                        "text-[10px] font-semibold text-purple-700 dark:text-purple-300",
                        getAvatarStyle(index)
                      )}
                    >
                      <span>
                        {getInitial(friend.user.full_name)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {stats.friendCount > 3 && (
                <span className="text-[10px] text-muted-foreground">
                  +{stats.friendCount - 3} more
                </span>
              )}
            </div>
          )}
        </div>
      )}
      </BaseWidget>
    </>
  );
}
