'use client';

import { useRouter } from 'next/navigation';
import { Trophy, TrendingUp, TrendingDown, Swords, BarChart3, Award } from 'lucide-react';

interface RoundSummary {
  round: number;
  userScore: number;
  opponentScore: number;
  totalQuestions: number;
}

interface Battle {
  id: string;
  opponent: {
    id: string;
    full_name: string;
    email: string;
  };
  folder_name: string;
  status: string;
  created_at: string;
}

interface TopicPerformance {
  topic: string;
  correct: number;
  total: number;
}

interface BattleResultsProps {
  battle: Battle;
  userTotalScore: number;
  opponentTotalScore: number;
  rounds: RoundSummary[];
  topicPerformance?: TopicPerformance[];
  weakTopics?: string[];
  strongTopics?: string[];
}

export function BattleResults({
  battle,
  userTotalScore,
  opponentTotalScore,
  rounds,
  topicPerformance = [],
  weakTopics = [],
  strongTopics = []
}: BattleResultsProps) {
  const router = useRouter();

  const totalQuestions = rounds.reduce((sum, r) => sum + r.totalQuestions, 0);
  const userWon = userTotalScore > opponentTotalScore;
  const isDraw = userTotalScore === opponentTotalScore;
  const userPercentage = Math.round((userTotalScore / totalQuestions) * 100);
  const opponentPercentage = Math.round((opponentTotalScore / totalQuestions) * 100);

  const handleChallengeAgain = () => {
    router.push(`/dashboard/social?action=challenge&userId=${battle.opponent.id}`);
  };

  const handleViewHistory = () => {
    router.push('/dashboard/social?tab=battles');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Main Result Card */}
        <div className={`rounded-2xl p-8 border-2 shadow-lg ${
          userWon
            ? 'bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border-green-300'
            : isDraw
            ? 'bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 border-yellow-300'
            : 'bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 border-red-300'
        }`}>
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Trophy className={`w-16 h-16 ${
                userWon ? 'text-green-600' : isDraw ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
            <h1 className="text-5xl font-bold text-gray-900 mb-2">
              {userWon ? 'Victory!' : isDraw ? "It's a Draw!" : 'Defeated'}
            </h1>
            <p className="text-xl text-gray-600">
              {userWon
                ? `You defeated ${battle.opponent.full_name}!`
                : isDraw
                ? `You tied with ${battle.opponent.full_name}!`
                : `${battle.opponent.full_name} won this battle`}
            </p>
          </div>

          {/* Final Score */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">You</p>
              <p className="text-5xl font-bold text-gray-900 mb-1">{userTotalScore}</p>
              <p className="text-sm text-gray-500">out of {totalQuestions}</p>
              <p className="text-2xl font-semibold text-gray-700 mt-2">{userPercentage}%</p>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-5xl font-bold text-gray-300">vs</div>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">{battle.opponent.full_name}</p>
              <p className="text-5xl font-bold text-gray-900 mb-1">{opponentTotalScore}</p>
              <p className="text-sm text-gray-500">out of {totalQuestions}</p>
              <p className="text-2xl font-semibold text-gray-700 mt-2">{opponentPercentage}%</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleChallengeAgain}
              className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              <Swords className="w-5 h-5" />
              Challenge Again
            </button>
            <button
              onClick={handleViewHistory}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <BarChart3 className="w-5 h-5" />
              View History
            </button>
          </div>
        </div>

        {/* Round Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            Round Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Round</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">You</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Opponent</th>
                  <th className="text-center py-3 px-4 font-semibold text-gray-700">Winner</th>
                </tr>
              </thead>
              <tbody>
                {rounds.map((round) => {
                  const roundWon = round.userScore > round.opponentScore;
                  const roundDraw = round.userScore === round.opponentScore;

                  return (
                    <tr key={round.round} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium text-gray-900">Round {round.round}</td>
                      <td className="text-center py-3 px-4">
                        <span className={`font-semibold ${roundWon ? 'text-green-600' : 'text-gray-900'}`}>
                          {round.userScore}/{round.totalQuestions}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`font-semibold ${!roundWon && !roundDraw ? 'text-green-600' : 'text-gray-900'}`}>
                          {round.opponentScore}/{round.totalQuestions}
                        </span>
                      </td>
                      <td className="text-center py-3 px-4">
                        {roundDraw ? (
                          <span className="text-yellow-600 font-medium">Draw</span>
                        ) : roundWon ? (
                          <span className="text-green-600 font-medium">You</span>
                        ) : (
                          <span className="text-red-600 font-medium">Opponent</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Learning Insights */}
        {(weakTopics.length > 0 || strongTopics.length > 0 || topicPerformance.length > 0) && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Award className="w-6 h-6 text-purple-600" />
              Learning Insights
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Strong Topics */}
              {strongTopics.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-900">Strong Topics</h3>
                  </div>
                  <ul className="space-y-1">
                    {strongTopics.map((topic, index) => (
                      <li key={index} className="text-sm text-green-800">
                        • {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Weak Topics */}
              {weakTopics.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-900">Areas to Improve</h3>
                  </div>
                  <ul className="space-y-1">
                    {weakTopics.map((topic, index) => (
                      <li key={index} className="text-sm text-red-800">
                        • {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Topic Performance Details */}
            {topicPerformance.length > 0 && (
              <div className="mt-6">
                <h3 className="font-semibold text-gray-900 mb-3">Performance by Topic</h3>
                <div className="space-y-2">
                  {topicPerformance.map((tp, index) => {
                    const percentage = Math.round((tp.correct / tp.total) * 100);
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{tp.topic}</p>
                          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                            <div
                              className={`h-2 rounded-full ${
                                percentage >= 80
                                  ? 'bg-green-500'
                                  : percentage >= 60
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 whitespace-nowrap">
                          {tp.correct}/{tp.total} ({percentage}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Battle Info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-sm text-gray-500">
          <p>Battle on {battle.folder_name}</p>
          <p className="mt-1">Completed on {new Date(battle.created_at).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
}
