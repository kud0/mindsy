'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, Check, X, Loader2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

interface Battle {
  id: string;
  challenger: {
    id: string;
    full_name: string;
    email: string;
    avatar_url: string | null;
  };
  folder_name: string;
  created_at: string;
}

interface BattleInviteCardProps {
  battle: Battle;
  currentUserId?: string; // Add current user ID to determine if challenger or opponent
  onAccept?: (battleId: string) => void;
  onDecline?: (battleId: string) => void;
  isActive?: boolean; // Flag to indicate if this is an active battle (changes UI/messaging)
}

export function BattleInviteCard({ battle, currentUserId, onAccept, onDecline, isActive = false }: BattleInviteCardProps) {
  const router = useRouter();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Determine if current user is the challenger or opponent
  const isChallenger = currentUserId === battle.challenger.id;
  const actionText = isActive ? 'Forfeit' : (isChallenger ? 'Cancel' : 'Decline');

  const handleAccept = async () => {
    try {
      setAccepting(true);

      const response = await fetch(`/api/battles/${battle.id}/accept`, {
        method: 'POST'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept battle');
      }

      toast.success('Battle accepted! Get ready...');

      // Navigate to battle arena
      router.push(`/dashboard/battles/${battle.id}`);

      if (onAccept) {
        onAccept(battle.id);
      }
    } catch (error: any) {
      console.error('Error accepting battle:', error);
      toast.error(error.message || 'Failed to accept battle');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
    // Show confirmation dialog for active battles
    if (isActive && !showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    try {
      setDeclining(true);
      setShowConfirmation(false);

      const response = await fetch(`/api/battles/${battle.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      console.log('🔍 Battle cancel response:', {
        status: response.status,
        ok: response.ok,
        data,
        battleId: battle.id,
        battleStatus: battle.status
      });

      if (!response.ok) {
        console.error('❌ Battle cancel failed:', {
          status: response.status,
          error: data.error,
          fullResponse: data
        });
        throw new Error(data.error || `Failed to ${actionText.toLowerCase()} battle`);
      }

      if (isActive) {
        toast.warning(data.message || 'You forfeited the battle');
      } else {
        toast.info(data.message || `Battle ${actionText.toLowerCase()}d`);
      }

      if (onDecline) {
        onDecline(battle.id);
      }
    } catch (error: any) {
      console.error(`Error ${actionText.toLowerCase()}ing battle:`, error);
      toast.error(error.message || `Failed to ${actionText.toLowerCase()} battle`);
    } finally {
      setDeclining(false);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between gap-4">
          {/* Content */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Challenger Avatar */}
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white font-semibold text-lg">
                {battle.challenger.full_name?.charAt(0)?.toUpperCase() || '?'}
              </span>
            </div>

            {/* Battle Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Swords className="w-4 h-4 text-purple-600" />
                <h4 className="font-semibold text-gray-900">
                  {isActive ? 'Active Battle' : 'Quiz Battle Challenge!'}
                </h4>
              </div>
              <p className="text-sm text-gray-700 mb-2">
                <span className="font-medium">{battle.challenger.full_name}</span>
                {isActive ? ' - Battle in progress' : ' challenged you to a quiz battle'}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <Trophy className="w-3 h-3" />
                  <span>{battle.folder_name}</span>
                </div>
                <span>•</span>
                <span>3 rounds, 5Q each</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleDecline}
              disabled={accepting || declining}
              className="flex items-center gap-1 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={isActive ? 'Forfeit battle' : (isChallenger ? 'Cancel challenge' : 'Decline challenge')}
            >
              {declining ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <X className="w-4 h-4" />
                  {actionText}
                </>
              )}
            </button>
            {!isChallenger && !isActive && (
              <button
                onClick={handleAccept}
                disabled={accepting || declining}
                className="flex items-center gap-1 px-4 py-1.5 bg-purple-600 text-white hover:bg-purple-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Accept challenge"
              >
                {accepting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Accept
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog for Active Battle Forfeit */}
      {showConfirmation && isActive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Forfeit Battle?</h3>
                <p className="text-sm text-gray-600">This action cannot be undone</p>
              </div>
            </div>
            <p className="text-gray-700 mb-6">
              Are you sure you want to forfeit this battle? This will count as a loss and your opponent will be declared the winner.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={declining}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50"
              >
                {declining ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  'Forfeit Battle'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
