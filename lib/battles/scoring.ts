import { BattleQuestion } from '@/types/database';

export interface DetailedQuestionResult {
  questionId: string;
  question: string;
  userAnswer: string | null;
  correctAnswer: string;
  isCorrect: boolean;
  explanation?: string;
  topic: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

export interface ScoreResult {
  score: number; // Raw correct count (0-5 for 5 questions)
  correctCount: number;
  incorrectCount: number;
  topicPerformance: Record<string, { correct: number; total: number; percentage: number }>;
  detailedResults: DetailedQuestionResult[];
}

/**
 * Calculate score based on user answers and correct answers
 * @param answers - User's answers (questionId -> answer)
 * @param questions - Battle questions with correct answers
 * @returns Score result with breakdown (score is raw correct count, not percentage)
 */
export function calculateScore(
  answers: Record<string, string>,
  questions: BattleQuestion[]
): ScoreResult {
  let correctCount = 0;
  let incorrectCount = 0;
  const topicPerformance: Record<string, { correct: number; total: number; percentage: number }> = {};
  const detailedResults: DetailedQuestionResult[] = [];

  // Process each question
  for (const question of questions) {
    const userAnswer = answers[question.id]?.toUpperCase();
    const correctAnswer = question.correctAnswer.toUpperCase();
    const topic = question.topic || 'General';
    const isCorrect = userAnswer === correctAnswer;

    // LOGGING: Track answer validation for debugging
    console.log('🔍 Validating answer:', {
      questionId: question.id.substring(0, 8),
      questionPreview: question.question.substring(0, 50) + '...',
      userAnswer,
      correctAnswer,
      isCorrect,
      topic
    });

    // Initialize topic tracking
    if (!topicPerformance[topic]) {
      topicPerformance[topic] = { correct: 0, total: 0, percentage: 0 };
    }

    topicPerformance[topic].total++;

    // Check if answer is correct
    if (isCorrect) {
      correctCount++;
      topicPerformance[topic].correct++;
    } else {
      incorrectCount++;
      console.log('❌ Incorrect answer:', {
        questionId: question.id.substring(0, 8),
        userSelected: userAnswer,
        shouldBe: correctAnswer,
        userOptionText: question.options[userAnswer as keyof typeof question.options] || 'N/A',
        correctOptionText: question.options[correctAnswer as keyof typeof question.options]
      });
    }

    // Add detailed result
    detailedResults.push({
      questionId: question.id,
      question: question.question,
      userAnswer: answers[question.id] || null,
      correctAnswer: question.correctAnswer,
      isCorrect,
      explanation: question.explanation,
      topic: question.topic,
      options: question.options
    });
  }

  // Calculate percentages for each topic
  for (const topic in topicPerformance) {
    const performance = topicPerformance[topic];
    performance.percentage = performance.total > 0
      ? Math.round((performance.correct / performance.total) * 100)
      : 0;
  }

  // Return raw correct count as score (not percentage)
  // This makes it easier to display in UI as "X/5" per round
  // and aggregate across rounds as "X/15" for 3 rounds
  const score = correctCount;

  return {
    score,
    correctCount,
    incorrectCount,
    topicPerformance,
    detailedResults
  };
}

/**
 * Compare two players' performances
 */
export function comparePerformances(
  player1Score: number,
  player2Score: number,
  player1Time: number,
  player2Time: number
): {
  winner: 'player1' | 'player2' | 'tie';
  scoreDifference: number;
  timeDifference: number;
} {
  const scoreDifference = player1Score - player2Score;

  // Determine winner based on score
  let winner: 'player1' | 'player2' | 'tie';
  if (scoreDifference > 0) {
    winner = 'player1';
  } else if (scoreDifference < 0) {
    winner = 'player2';
  } else {
    // Tie on score - use time as tiebreaker (faster is better)
    if (player1Time < player2Time) {
      winner = 'player1';
    } else if (player1Time > player2Time) {
      winner = 'player2';
    } else {
      winner = 'tie';
    }
  }

  return {
    winner,
    scoreDifference: Math.abs(scoreDifference),
    timeDifference: Math.abs(player1Time - player2Time)
  };
}

/**
 * Calculate XP earned from battle performance
 * @param score - Raw correct count (0-5 for 5 questions)
 * @param won - Whether the player won the round
 * @param roundNumber - Current round number
 * @param totalQuestions - Total questions in the round (default 5)
 */
export function calculateBattleXP(
  score: number,
  won: boolean,
  roundNumber: number,
  totalQuestions: number = 5
): number {
  let xp = 0;

  // Base XP for participation
  xp += 10;

  // XP for score (convert to percentage first)
  const percentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;
  xp += Math.floor(percentage / 10); // 1 XP per 10% score

  // Bonus for winning
  if (won) {
    xp += 50;
  }

  // Bonus for completing later rounds (battle progression)
  xp += roundNumber * 5;

  return xp;
}
