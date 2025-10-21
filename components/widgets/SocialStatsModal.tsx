"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Users, Swords } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface SocialStatsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: {
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
  };
}

export function SocialStatsModal({ open, onOpenChange, stats }: SocialStatsModalProps) {
  const router = useRouter();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "h-[80vh] rounded-t-3xl",
          "bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50",
          "dark:from-blue-950/40 dark:via-purple-950/40 dark:to-pink-950/40",
          "dark:backdrop-blur-2xl",
          "border-t border-gray-200/50 dark:border-white/10",
          "shadow-2xl dark:shadow-black/50"
        )}
      >
        <SheetHeader className="border-b border-gray-200/50 dark:border-gray-700/50 pb-4">
          <SheetTitle className="text-2xl font-bold">
            Social Stats
          </SheetTitle>
          <SheetDescription className="text-muted-foreground">
            Your friends and battle history
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6 overflow-y-auto max-h-[calc(80vh-200px)] pb-6">
          {/* Stats Summary Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Friends Card */}
            <div className={cn(
              "p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50",
              "bg-gradient-to-br from-transparent to-purple-50/10 dark:to-purple-950/5"
            )}>
              <Users className="h-5 w-5 mb-2 text-purple-600/70 dark:text-purple-400/70" />
              <p className="text-2xl font-bold">{stats.friendCount}</p>
              <p className="text-xs text-muted-foreground uppercase">Friends</p>
            </div>

            {/* Battles Card */}
            <div className={cn(
              "p-4 rounded-xl border border-gray-200/50 dark:border-gray-700/50",
              "bg-gradient-to-br from-transparent to-purple-50/10 dark:to-purple-950/5"
            )}>
              <Swords className="h-5 w-5 mb-2 text-purple-600/70 dark:text-purple-400/70" />
              <p className="text-2xl font-bold">{stats.totalBattles}</p>
              <p className="text-xs text-muted-foreground uppercase">Battles</p>
            </div>
          </div>

          {/* Battle Stats Breakdown */}
          {stats.totalBattles > 0 ? (
            <div className="p-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-muted/30">
              <h3 className="text-sm font-semibold mb-3">Battle Record</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    {stats.battleWins}
                  </p>
                  <p className="text-xs text-muted-foreground">Wins</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-gray-600 dark:text-gray-400">
                    {stats.battleDraws}
                  </p>
                  <p className="text-xs text-muted-foreground">Draws</p>
                </div>
                <div>
                  <p className="text-lg font-bold text-red-600 dark:text-red-400">
                    {stats.battleLosses}
                  </p>
                  <p className="text-xs text-muted-foreground">Losses</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-muted/30 text-center">
              <Swords className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No battles yet. Challenge a friend!
              </p>
            </div>
          )}

          {/* Recent Friends List */}
          <div>
            <h3 className="text-sm font-semibold mb-3">Recent Friends</h3>
            {stats.recentFriends.length > 0 ? (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {stats.recentFriends.slice(0, 5).map((friend) => (
                  <div
                    key={friend.id}
                    className={cn(
                      "flex items-center gap-3 p-2 rounded-lg",
                      "border border-gray-200/30 dark:border-gray-700/30",
                      "hover:bg-purple-50/20 dark:hover:bg-purple-950/10",
                      "transition-colors"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center",
                      "bg-gradient-to-br from-blue-50 to-purple-50",
                      "dark:from-blue-900/30 dark:to-purple-900/30",
                      "border border-purple-100/50 dark:border-purple-900/30",
                      "text-xs font-semibold text-purple-700 dark:text-purple-300"
                    )}>
                      {friend.user.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {friend.user.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {friend.user.email}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-muted/30 text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  No friends yet. Start connecting!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white/80 via-white/60 to-transparent dark:from-gray-950/80 dark:via-gray-950/60 backdrop-blur-sm border-t border-gray-200/50 dark:border-gray-700/50">
          <div className="flex gap-3">
            <Button
              onClick={() => {
                router.push('/dashboard/social?tab=friends');
                onOpenChange(false);
              }}
              className="flex-1"
              variant="outline"
            >
              View All Friends
            </Button>
            <Button
              onClick={() => {
                router.push('/dashboard/social?tab=battles');
                onOpenChange(false);
              }}
              className="flex-1"
            >
              Start Battle
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
