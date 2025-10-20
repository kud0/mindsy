'use client';

import { useState, useEffect } from 'react';
import { Loader2, Trophy, Swords, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { BattleQuestionView } from './BattleQuestionView';
import { BattleRoundResults } from './BattleRoundResults';
import { BattleResults } from './BattleResults';
import { WaitingForOpponent } from './WaitingForOpponent';
import { NextRoundReady } from './NextRoundReady';
import { DetailedQuestionResult } from '@/lib/battles/scoring';

interface BattleQuestion {
  id: string;
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer?: string;
  explanation?: string;
  topic: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface BattleRound {
  round: number;
  questions: BattleQuestion[];
  userAnswers: Record<string, string>;
  opponentAnswers: Record<string, string>;
  userScore?: number;
  opponentScore?: number;
  status: 'pending' | 'in_progress' | 'completed';
}

interface Battle {
  id: string;
  status: 'pending' | 'active' | 'completed';
  current_round: number;
  total_rounds: number;
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
  rounds: BattleRound[];
  user_total_score?: number;
  opponent_total_score?: number;
  created_at: string;
}

type BattleState =
  | 'loading'
  | 'answering'
  | 'results'
  | 'waiting'
  | 'nextRoundReady'
  | 'battleComplete';

interface RoundSubmissionResult {
  score: number;
  correctCount: number;
  detailedResults: DetailedQuestionResult[];
  opponentScore?: number;
  battleComplete?: boolean;
}

interface BattleArenaProps {
  battleId: string;
}

export function BattleArena({ battleId }: BattleArenaProps) {
  const [battle, setBattle] = useState<Battle | null>(null);
  const [state, setState] = useState<BattleState>('loading');
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null);
  const [roundStartTime, setRoundStartTime] = useState<number>(Date.now());
  const [lastSubmissionResult, setLastSubmissionResult] = useState<RoundSubmissionResult | null>(null);

  // Fetch battle data
  useEffect(() => {
    fetchBattle();
  }, [battleId]);

  // === SUPABASE REALTIME ===
  // Subscribe to battle updates for real-time notifications
  useEffect(() => {
    const supabase = createClient();

    console.log('🔌 [BattleArena] Setting up Realtime subscription for battle:', battleId);

    const channel = supabase
      .channel(`battle:${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_participants',
          filter: `battle_id=eq.${battleId}`
        },
        (payload) => {
          console.log('🔔 [BattleArena] Realtime: New battle_participant submission detected', payload);

          // Refetch battle data when opponent submits
          toast.info('Opponent submitted their answers!');
          checkOpponentCompletion();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'battle_rounds',
          filter: `battle_id=eq.${battleId}`
        },
        (payload) => {
          console.log('🔔 [BattleArena] Realtime: New round created', payload);

          // Refetch battle when new round is added
          toast.info('Next round is ready!');
          fetchBattle(false);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quiz_battles',
          filter: `id=eq.${battleId}`
        },
        (payload) => {
          console.log('🔔 [BattleArena] Realtime: Battle status updated', payload);

          // Refetch when battle completes
          if ((payload.new as any).status === 'completed') {
            toast.success('Battle completed!');
            fetchBattle(false);
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 [BattleArena] Realtime subscription status:', status);
      });

    return () => {
      console.log('🔌 [BattleArena] Cleaning up Realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [battleId]);

  // Poll for opponent submission when waiting (BACKUP - Realtime is primary)
  useEffect(() => {
    if (state === 'waiting') {
      // Still keep polling as fallback in case realtime fails
      const interval = setInterval(async () => {
        console.log('🔄 [BattleArena] Polling for opponent submission (fallback)...');
        await checkOpponentCompletion();
      }, 5000); // Poll every 5 seconds (less frequent since realtime is primary)
      setPollInterval(interval);
    } else if (pollInterval) {
      clearInterval(pollInterval);
      setPollInterval(null);
    }

    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [state]);

  // REMOVED: Auto-advance timer - user must click Continue button

  const fetchBattle = async (allowStateChange = true) => {
    try {
      console.log('🎮 [BattleArena] Fetching battle:', battleId, { currentState: state, allowStateChange });

      const response = await fetch(`/api/battles/${battleId}`);
      const data = await response.json();

      console.log('📥 [BattleArena] API Response:', {
        success: data.success,
        hasBattle: !!data.battle,
        roundsCount: data.rounds?.length,
        currentRound: data.currentRound,
        battleStatus: data.battle?.status
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch battle');
      }

      // Transform API response to match component interface
      const transformedBattle = transformBattleData(data);

      console.log('🔄 [BattleArena] Transformed battle:', {
        id: transformedBattle.id,
        status: transformedBattle.status,
        current_round: transformedBattle.current_round,
        roundsCount: transformedBattle.rounds?.length,
        firstRoundQuestions: transformedBattle.rounds?.[0]?.questions?.length
      });

      setBattle(transformedBattle);

      // CRITICAL: Only change state if explicitly allowed AND we're in 'loading' state
      // This prevents state from reverting after submission
      const stableStates = ['results', 'waiting', 'nextRoundReady', 'battleComplete'];

      if (!allowStateChange) {
        console.log('⏸️ [BattleArena] State change blocked - just updated battle data');
        return;
      }

      if (stableStates.includes(state)) {
        console.log('⚠️ [BattleArena] In stable state, refusing to change state:', state);
        return;
      }

      // Only update state if we're in 'loading' or 'answering'
      if (state === 'loading') {
        // DEFENSE-IN-DEPTH: Always check battle status first
        if (transformedBattle.status === 'completed' || transformedBattle.status === 'cancelled') {
          console.log('🏁 [BattleArena] Battle finished (status:', transformedBattle.status, ')');
          setState('battleComplete');
        } else {
          const currentRound = transformedBattle.rounds[transformedBattle.current_round - 1];

          console.log('🎯 [BattleArena] Current round analysis:', {
            roundNumber: transformedBattle.current_round,
            hasCurrentRound: !!currentRound,
            currentRoundQuestions: currentRound?.questions?.length,
            currentRoundStatus: currentRound?.status,
            hasUserAnswers: !!currentRound?.userAnswers && Object.keys(currentRound.userAnswers).length > 0
          });

          if (!currentRound) {
            console.warn('⚠️ [BattleArena] No current round found - staying in loading state');
            setState('loading');
          } else if (!currentRound.userAnswers || Object.keys(currentRound.userAnswers).length === 0) {
            console.log('📝 [BattleArena] Ready to answer questions');
            setState('answering');
            setCurrentAnswers({});
            setRoundStartTime(Date.now());
          }
        }
      }
    } catch (error: any) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error('❌ [BattleArena] Error fetching battle:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      toast.error((error as any).message || 'Failed to load battle');
    }
  };

  // Transform API response to match component interface
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformBattleData = (apiData: any): Battle => {
    const { battle, rounds = [] } = apiData;

    // Get current user ID from battle data
    const currentUserId = battle.challenger?.id || battle.created_by;

    // Transform rounds from API format to component format
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const transformedRounds: BattleRound[] = rounds.map((round: any) => {
      // Get submissions for this round
      const userSubmission = round.userSubmitted;

      return {
        round: round.round_number,
        questions: round.questions || [],
        userAnswers: {}, // Will be populated from battle_participants if needed
        opponentAnswers: {}, // Will be populated from battle_participants if needed
        userScore: round.userScore,
        opponentScore: round.opponentScore,
        status: round.bothSubmitted ? 'completed' : (userSubmission ? 'in_progress' : 'pending')
      };
    });

    return {
      id: battle.id,
      status: battle.status,
      current_round: battle.current_round || 1,
      total_rounds: battle.rounds_count,
      challenger: battle.challenger,
      opponent: battle.opponent,
      folder_name: battle.folder_name || 'Unknown Folder',
      rounds: transformedRounds,
      user_total_score: apiData.userProgress?.totalScore || 0,
      opponent_total_score: 0, // Calculate from rounds if needed
      created_at: battle.created_at
    };
  };

  const checkOpponentCompletion = async () => {
    if (!battle) return;

    try {
      const response = await fetch(`/api/battles/${battleId}`);
      const data = await response.json();

      if (!response.ok) {
        return; // Silent fail during polling
      }

      const transformedBattle = transformBattleData(data);
      const currentRound = transformedBattle.rounds[transformedBattle.current_round - 1];

      console.log('🔄 [BattleArena] Poll result:', {
        roundStatus: currentRound?.status,
        bothSubmitted: currentRound?.status === 'completed'
      });

      // Update battle data
      setBattle(transformedBattle);

      // Check if opponent has now finished
      if (currentRound?.status === 'completed') {
        console.log('✅ [BattleArena] Opponent finished! Transitioning to next round ready');
        toast.success('Opponent finished! Get ready for the next round.');

        if (transformedBattle.status === 'completed' || transformedBattle.current_round >= transformedBattle.total_rounds) {
          setState('battleComplete');
        } else {
          setState('nextRoundReady');
        }
      }
    } catch (error: any) {
      console.error('❌ [BattleArena] Error polling opponent status:', error);
    }
  };

  const handleContinueFromResults = async () => {
    if (!battle) return;

    console.log('👉 [BattleArena] User clicked Continue from results');

    // Check if we stored a battleComplete flag from submission
    if (lastSubmissionResult?.battleComplete) {
      console.log('🏁 [BattleArena] Battle complete (from submission flag)');
      setState('battleComplete');
      return;
    }

    try {
      // Fetch latest battle state to check opponent
      const response = await fetch(`/api/battles/${battleId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check battle status');
      }

      const transformedBattle = transformBattleData(data);
      setBattle(transformedBattle);

      const currentRound = transformedBattle.rounds[transformedBattle.current_round - 1];

      console.log('🔍 [BattleArena] Opponent status check:', {
        roundStatus: currentRound?.status,
        bothSubmitted: currentRound?.status === 'completed',
        battleStatus: transformedBattle.status,
        battleComplete: transformedBattle.status === 'completed',
        currentRound: transformedBattle.current_round,
        totalRounds: transformedBattle.total_rounds
      });

      // DEFENSE-IN-DEPTH: Check battle status first (most reliable)
      if (transformedBattle.status === 'completed' || transformedBattle.status === 'cancelled') {
        console.log('🏁 [BattleArena] Battle is complete (status:', transformedBattle.status, ')');
        setState('battleComplete');
      } else if (currentRound?.status === 'completed') {
        // Both players have submitted
        if (transformedBattle.current_round < transformedBattle.total_rounds) {
          console.log('✅ [BattleArena] Both submitted, next round available');
          setState('nextRoundReady');
        } else {
          // This is the last round and both submitted
          console.log('🏁 [BattleArena] Last round completed - battle should be complete');
          setState('battleComplete');
        }
      } else {
        console.log('⏳ [BattleArena] Opponent hasn\'t submitted yet - waiting');
        setState('waiting');
      }
    } catch (error: any) {
      console.error('❌ [BattleArena] Error checking opponent status:', error);
      toast.error('Failed to check battle status');
    }
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setCurrentAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmitRound = async () => {
    if (!battle) return;

    const currentRound = battle.rounds[battle.current_round - 1];
    const totalQuestions = currentRound.questions.length;
    const answeredCount = Object.keys(currentAnswers).length;

    if (answeredCount < totalQuestions) {
      const unanswered = totalQuestions - answeredCount;
      if (!confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) {
        return;
      }
    }

    try {
      setSubmitting(true);

      // Calculate time taken in seconds
      const timeTaken = Math.floor((Date.now() - roundStartTime) / 1000);

      // Format answers to ensure they're strings
      const formattedAnswers: Record<string, string> = {};
      Object.entries(currentAnswers).forEach(([questionId, answer]) => {
        formattedAnswers[questionId] = String(answer);
      });

      console.log('📤 [BattleArena] Submitting round:', {
        roundNumber: battle.current_round,
        answersCount: Object.keys(formattedAnswers).length,
        timeTaken
      });

      const response = await fetch(`/api/battles/${battleId}/submit-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundNumber: battle.current_round,
          answers: formattedAnswers,
          timeTaken: timeTaken
        })
      });

      const data = await response.json();

      console.log('📥 [BattleArena] Submit response:', {
        success: data.success,
        score: data.score,
        bothSubmitted: data.bothSubmitted,
        nextRoundReady: data.nextRoundReady,
        battleComplete: data.battleComplete
      });

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit round');
      }

      // Store submission result for results view
      setLastSubmissionResult({
        score: data.score,
        correctCount: data.correctCount,
        detailedResults: data.detailedResults,
        opponentScore: data.opponentScore,
        battleComplete: data.battleComplete // Store battle complete flag
      });

      toast.success(`Round submitted! You got ${data.correctCount} correct.`);

      // ALWAYS show results first and STOP
      console.log('📊 [BattleArena] Submission successful - showing results');
      setState('results');

      // DO NOT call fetchBattle - it causes state to revert
      // DO NOT auto-transition - user must click Continue
      console.log('⏸️ [BattleArena] Staying in results state - waiting for user to click Continue');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      console.error('Error submitting round:', error);
      toast.error(error.message || 'Failed to submit round');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextRound = async () => {
    if (!battle) {
      console.warn('⚠️ [BattleArena] handleNextRound called but no battle loaded');
      return;
    }

    console.log('🎮 [BattleArena] handleNextRound called:', {
      currentState: state,
      currentRound: battle.current_round,
      totalRounds: battle.total_rounds,
      battleStatus: battle.status
    });

    // Clear previous round data
    setCurrentAnswers({});
    setRoundStartTime(Date.now());
    setLastSubmissionResult(null);

    // Transition to loading, then fetch will set to answering
    console.log('🔄 [BattleArena] Loading next round...');
    setState('loading');

    try {
      await fetchBattle(true);

      // BUGFIX: Explicitly transition to 'answering' after fetch completes
      // fetchBattle might not transition state if conditions aren't met
      console.log('✅ [BattleArena] Battle fetched, transitioning to answering state');
      setState('answering');
    } catch (error) {
      console.error('❌ [BattleArena] Error loading next round:', error);
      toast.error('Failed to load next round');
    }
  };

  if (state === 'loading' || !battle) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading battle arena...</p>
        </div>
      </div>
    );
  }

  const currentRound = battle.rounds[battle.current_round - 1];
  const isChallenger = battle.challenger.id === battle.challenger.id; // Need user ID from context
  const opponent = isChallenger ? battle.opponent : battle.challenger;

  // Calculate cumulative scores
  const completedRounds = battle.rounds.filter(r => r.status === 'completed');
  const userCumulativeScore = completedRounds.reduce((sum, r) => sum + (r.userScore || 0), 0);
  const opponentCumulativeScore = completedRounds.reduce((sum, r) => sum + (r.opponentScore || 0), 0);

  console.log('🎯 [BattleArena] Render state:', {
    state,
    hasCurrentRound: !!currentRound,
    questionsCount: currentRound?.questions?.length,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    questions: currentRound?.questions?.map((q: any) => ({
      id: q.id,
      hasQuestion: !!q.question,
      hasOptions: !!q.options,
      optionsCount: q.options ? Object.keys(q.options).length : 0
    }))
  });

  // Show final results
  if (state === 'battleComplete') {
    return (
      <BattleResults
        battle={{
          id: battle.id,
          opponent,
          folder_name: battle.folder_name,
          status: battle.status,
          created_at: battle.created_at
        }}
        userTotalScore={battle.user_total_score || userCumulativeScore}
        opponentTotalScore={battle.opponent_total_score || opponentCumulativeScore}
        rounds={battle.rounds.map(r => ({
          round: r.round,
          userScore: r.userScore || 0,
          opponentScore: r.opponentScore || 0,
          totalQuestions: r.questions.length
        }))}
      />
    );
  }

  // Show next round ready screen
  if (state === 'nextRoundReady') {
    return (
      <div className="min-h-screen bg-gray-50">
        <NextRoundReady
          roundNumber={battle.current_round + 1}
          userTotalScore={userCumulativeScore}
          opponentTotalScore={opponentCumulativeScore}
          opponentName={opponent.full_name}
          onStartNextRound={handleNextRound}
          autoAdvanceSeconds={10}
        />
      </div>
    );
  }

  // Show round results
  if (state === 'results' && lastSubmissionResult) {
    return (
      <div className="min-h-screen bg-gray-50">
        <BattleRoundResults
          roundNumber={battle.current_round}
          userScore={lastSubmissionResult.score}
          opponentScore={lastSubmissionResult.opponentScore || 0}
          opponentName={opponent.full_name}
          questions={lastSubmissionResult.detailedResults}
          onContinue={handleContinueFromResults}
        />
      </div>
    );
  }

  // Show waiting for opponent
  if (state === 'waiting') {
    return (
      <div className="min-h-screen bg-gray-50">
        <WaitingForOpponent
          opponentName={opponent.full_name}
          roundNumber={battle.current_round}
          userScore={lastSubmissionResult?.score}
        />
      </div>
    );
  }

  const allQuestionsAnswered = Object.keys(currentAnswers).length === currentRound.questions.length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Battle Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            {/* Opponent Info */}
            <div className="flex items-center gap-3">
              <Swords className="w-6 h-6 text-purple-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">vs {opponent.full_name}</h1>
                <p className="text-sm text-gray-500">{battle.folder_name}</p>
              </div>
            </div>

            {/* Round Info */}
            <div className="text-right">
              <p className="text-sm text-gray-600">
                Round {battle.current_round} of {battle.total_rounds}
              </p>
              <p className="text-xs text-gray-500">
                {currentRound.questions.length} questions
              </p>
            </div>
          </div>

          {/* Scoreboard */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-gray-600 mb-1">Your Score</p>
              <p className="text-2xl font-bold text-gray-900">{userCumulativeScore}/15</p>
              <div className="text-xs text-gray-500 mt-1">
                Rounds: {completedRounds.map(r => r.userScore).join('-')}
                {battle.current_round <= battle.total_rounds && '-?'}
              </div>
            </div>
            <div className="bg-gradient-to-r from-pink-50 to-red-50 rounded-lg p-3 border border-pink-200">
              <p className="text-xs text-gray-600 mb-1">Opponent</p>
              <p className="text-2xl font-bold text-gray-900">{opponentCumulativeScore}/15</p>
              <div className="text-xs text-gray-500 mt-1">
                Rounds: {completedRounds.map(r => r.opponentScore).join('-')}
                {battle.current_round <= battle.total_rounds && '-?'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <>
          {/* Questions */}
          <div className="space-y-6">
            {currentRound.questions.map((question, index) => (
              <div key={question.id} className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="mb-4">
                  <span className="text-sm font-semibold text-purple-600">
                    Question {index + 1} of {currentRound.questions.length}
                  </span>
                </div>
                <BattleQuestionView
                  question={question}
                  selectedAnswer={currentAnswers[question.id]}
                  onAnswerSelect={handleAnswerSelect}
                  disabled={submitting}
                />
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="mt-6 bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">
                  Answered: {Object.keys(currentAnswers).length} / {currentRound.questions.length}
                </p>
                {!allQuestionsAnswered && (
                  <p className="text-xs text-yellow-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    Some questions are unanswered
                  </p>
                )}
              </div>
              <button
                onClick={handleSubmitRound}
                disabled={submitting || Object.keys(currentAnswers).length === 0}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Trophy className="w-5 h-5" />
                    Submit Round
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      </div>
    </div>
  );
}
