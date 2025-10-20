'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Trophy, Swords, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { BattleInviteCard } from './BattleInviteCard';

interface Battle {
  id: string;
  status: 'pending' | 'active' | 'completed' | 'cancelled';
  challenger: {
    id: string;
    full_name: string;
    email: string;
  };
  opponent: {
    id: string;
    full_name: string;
    email: string;
  };
  folder_name: string;
  current_round?: number;
  total_rounds?: number;
  user_total_score?: number;
  opponent_total_score?: number;
  winner_id?: string;
  created_at: string;
  completed_at?: string;
}

type TabType = 'pending' | 'active' | 'completed';

export function BattleHistoryTab() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabType>('pending');
  const [battles, setBattles] = useState<Battle[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    winRate: 0
  });

  useEffect(() => {
    fetchBattles();
  }, [activeTab]);

  const fetchBattles = async () => {
    try {
      setLoading(true);
      const url = `/api/battles?status=${activeTab}`;
      console.log('🔍 [UI] Fetching battles:', { url, activeTab });

      const response = await fetch(url);
      const data = await response.json();

      console.log('🔍 [UI] API Response:', {
        status: response.status,
        ok: response.ok,
        dataKeys: Object.keys(data || {}),
        battlesLength: data.battles?.length,
        pendingLength: data.pending?.length,
        activeLength: data.active?.length,
        completedLength: data.completed?.length
      });

      if (!response.ok) {
        console.error('❌ [UI] API error:', data);
        throw new Error(data.error || 'Failed to fetch battles');
      }

      console.log('🎮 [UI] Full battle data received:', {
        activeTab,
        totalBattles: data.battles?.length,
        pendingCount: data.pending?.length,
        activeCount: data.active?.length,
        completedCount: data.completed?.length,
        stats: data.stats,
        rawBattles: data.battles?.map((b: Battle) => ({
          id: b.id.substring(0, 8),
          status: b.status,
          challenger: b.challenger?.full_name,
          opponent: b.opponent?.full_name
        }))
      });

      // API already filters by status, so data.battles should already be correct
      // No need for additional filtering since we trust the API
      const battlesToDisplay = data.battles || [];

      console.log('🔍 [UI] Received battles from API:', {
        activeTab,
        battlesCount: battlesToDisplay.length,
        statuses: battlesToDisplay.map((b: Battle) => b.status),
        allMatchTab: battlesToDisplay.every((b: Battle) => b.status === activeTab)
      });

      setBattles(battlesToDisplay);

      // Log what we're displaying
      console.log('📊 [UI] Final display state:', {
        tab: activeTab,
        count: battlesToDisplay.length,
        isEmpty: battlesToDisplay.length === 0,
        battles: battlesToDisplay.map(b => ({
          id: b.id.substring(0, 8),
          status: b.status,
          opponent: b.opponent?.full_name,
          challenger: b.challenger?.full_name
        }))
      });

      if (data.currentUserId) {
        setCurrentUserId(data.currentUserId);
      }
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error: any) {
      console.error('Error fetching battles:', error);
      toast.error(error.message || 'Failed to load battles');
    } finally {
      setLoading(false);
    }
  };

  const handleResumeBattle = (battleId: string) => {
    router.push(`/dashboard/battles/${battleId}`);
  };

  const handleViewResults = (battleId: string) => {
    router.push(`/dashboard/battles/${battleId}`);
  };

  const handleAcceptBattle = (battleId: string) => {
    fetchBattles(); // Refresh list
  };

  const handleDeclineBattle = async (battleId: string) => {
    try {
      const response = await fetch(`/api/battles/${battleId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel battle');
      }

      toast.success(data.message || 'Battle cancelled');
      fetchBattles(); // Refresh list
    } catch (error: any) {
      console.error('Error cancelling battle:', error);
      toast.error(error.message || 'Failed to cancel battle');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-6 h-6 text-purple-600" />
          <h2 className="text-xl font-bold text-gray-900">Battle Stats</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">{stats.total}</p>
            <p className="text-sm text-gray-600">Total Battles</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{stats.wins}</p>
            <p className="text-sm text-gray-600">Wins</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{stats.losses}</p>
            <p className="text-sm text-gray-600">Losses</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-yellow-600">{stats.draws}</p>
            <p className="text-sm text-gray-600">Draws</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">{stats.winRate}%</p>
            <p className="text-sm text-gray-600">Win Rate</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 rounded-t-xl">
        <div className="flex gap-6 px-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
              activeTab === 'pending'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Pending</span>
          </button>

          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
              activeTab === 'active'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Swords className="w-5 h-5" />
            <span className="font-medium">Active</span>
          </button>

          <button
            onClick={() => setActiveTab('completed')}
            className={`flex items-center gap-2 px-1 py-3 border-b-2 transition-colors ${
              activeTab === 'completed'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span className="font-medium">Completed</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          </div>
        ) : battles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Trophy className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-medium text-gray-900">No {activeTab} battles</p>
            <p className="text-sm text-gray-500 mt-1">
              {activeTab === 'pending'
                ? 'Challenge your friends to a quiz battle!'
                : activeTab === 'active'
                ? 'No battles in progress'
                : 'Complete some battles to see your history'}
            </p>
          </div>
        ) : (
          <>
            {/* Pending Battles */}
            {activeTab === 'pending' && (
              <div className="space-y-4">
                {battles.map((battle) => (
                  <BattleInviteCard
                    key={battle.id}
                    battle={{
                      id: battle.id,
                      challenger: battle.challenger,
                      folder_name: battle.folder_name,
                      created_at: battle.created_at,
                      status: battle.status
                    }}
                    currentUserId={currentUserId}
                    onAccept={handleAcceptBattle}
                    onDecline={handleDeclineBattle}
                  />
                ))}
              </div>
            )}

            {/* Active Battles */}
            {activeTab === 'active' && (
              <div className="space-y-4">
                {battles.map((battle) => {
                  const isChallenger = battle.challenger?.id === currentUserId;
                  const opponent = isChallenger ? battle.opponent : battle.challenger;

                  return (
                    <div
                      key={battle.id}
                      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {opponent?.full_name || 'Unknown'}
                            </span>
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                              Active
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            📁 {battle.folder_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Started {new Date(battle.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/dashboard/battles/${battle.id}`)}
                          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors"
                        >
                          Play Battle
                        </button>
                        <button
                          onClick={() => handleDeclineBattle(battle.id)}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                        >
                          Forfeit
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Completed Battles */}
            {activeTab === 'completed' && (
              <div className="space-y-4">
                {battles.map((battle) => {
                  const userWon = battle.winner_id === battle.challenger.id; // Need user ID
                  const isDraw = !battle.winner_id;

                  return (
                    <div
                      key={battle.id}
                      className={`border-2 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                        userWon
                          ? 'bg-green-50 border-green-300'
                          : isDraw
                          ? 'bg-yellow-50 border-yellow-300'
                          : 'bg-red-50 border-red-300'
                      }`}
                      onClick={() => handleViewResults(battle.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            userWon
                              ? 'bg-green-200'
                              : isDraw
                              ? 'bg-yellow-200'
                              : 'bg-red-200'
                          }`}>
                            <Trophy className={`w-5 h-5 ${
                              userWon
                                ? 'text-green-700'
                                : isDraw
                                ? 'text-yellow-700'
                                : 'text-red-700'
                            }`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">
                                vs {battle.opponent.full_name}
                              </h4>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                userWon
                                  ? 'bg-green-200 text-green-800'
                                  : isDraw
                                  ? 'bg-yellow-200 text-yellow-800'
                                  : 'bg-red-200 text-red-800'
                              }`}>
                                {userWon ? 'WON' : isDraw ? 'DRAW' : 'LOST'}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">{battle.folder_name}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                              <span>
                                Score: {battle.user_total_score || 0} - {battle.opponent_total_score || 0}
                              </span>
                              <span>•</span>
                              <span>{new Date(battle.completed_at || battle.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewResults(battle.id);
                          }}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium text-sm"
                        >
                          View Details
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
