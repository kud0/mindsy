/**
 * Test: Option Shuffling in Battle Questions
 *
 * Purpose: Verify that question options are properly shuffled
 * to prevent the correct answer from always being in position A
 */

import { describe, it, expect } from '@jest/globals';
import { shuffleQuestionOptions } from '@/lib/battles/question-validator';
import { BattleQuestion } from '@/types/database';

describe('Battle Question Option Shuffling', () => {
  const mockQuestion: BattleQuestion = {
    id: 'test-123',
    question: 'What is the capital of France?',
    options: {
      A: 'Paris',
      B: 'London',
      C: 'Berlin',
      D: 'Madrid'
    },
    correctAnswer: 'A',
    topic: 'Geography',
    difficulty: 'easy',
    explanation: 'Paris is the capital of France'
  };

  it('should shuffle options and update correct answer accordingly', () => {
    const shuffled = shuffleQuestionOptions(mockQuestion);

    // Verify the correct answer text is preserved
    const correctOptionText = mockQuestion.options[mockQuestion.correctAnswer];
    const shuffledCorrectText = shuffled.options[shuffled.correctAnswer];

    expect(shuffledCorrectText).toBe(correctOptionText);
    expect(shuffledCorrectText).toBe('Paris');
  });

  it('should produce varied correct answer positions across multiple shuffles', () => {
    const positions = new Set<string>();

    // Shuffle 100 times to test randomization
    for (let i = 0; i < 100; i++) {
      const shuffled = shuffleQuestionOptions(mockQuestion);
      positions.add(shuffled.correctAnswer);
    }

    // With 100 shuffles, we should see at least 3 different positions
    expect(positions.size).toBeGreaterThanOrEqual(3);
    console.log('✅ Correct answer appeared in positions:', Array.from(positions).join(', '));
  });

  it('should maintain all option values after shuffling', () => {
    const shuffled = shuffleQuestionOptions(mockQuestion);

    const originalValues = Object.values(mockQuestion.options).sort();
    const shuffledValues = Object.values(shuffled.options).sort();

    expect(shuffledValues).toEqual(originalValues);
  });

  it('should handle questions where correct answer is not A', () => {
    const questionWithCorrectB: BattleQuestion = {
      ...mockQuestion,
      correctAnswer: 'B'
    };

    const shuffled = shuffleQuestionOptions(questionWithCorrectB);

    // Verify correct answer value is preserved
    const correctValue = questionWithCorrectB.options['B'];
    const shuffledCorrectValue = shuffled.options[shuffled.correctAnswer];

    expect(shuffledCorrectValue).toBe(correctValue);
    expect(shuffledCorrectValue).toBe('London');
  });

  it('should produce different distributions of correct answers', () => {
    const distribution: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

    // Shuffle 1000 times and count distribution
    for (let i = 0; i < 1000; i++) {
      const shuffled = shuffleQuestionOptions(mockQuestion);
      distribution[shuffled.correctAnswer]++;
    }

    console.log('📊 Distribution after 1000 shuffles:', distribution);

    // Each position should appear at least 15% of the time (roughly 25% ± 10%)
    for (const position of ['A', 'B', 'C', 'D']) {
      const percentage = (distribution[position] / 1000) * 100;
      expect(percentage).toBeGreaterThanOrEqual(15);
      expect(percentage).toBeLessThanOrEqual(35);
    }
  });
});

describe('Answer Validation with Shuffled Questions', () => {
  it('should correctly validate answers after shuffling', () => {
    const question: BattleQuestion = {
      id: 'test-456',
      question: 'What is 2 + 2?',
      options: {
        A: '4',
        B: '3',
        C: '5',
        D: '22'
      },
      correctAnswer: 'A',
      topic: 'Math',
      difficulty: 'easy',
      explanation: '2 + 2 equals 4'
    };

    const shuffled = shuffleQuestionOptions(question);

    // Find which position "4" is now in
    const correctPosition = Object.entries(shuffled.options)
      .find(([_, value]) => value === '4')?.[0];

    expect(correctPosition).toBe(shuffled.correctAnswer);

    // Simulate user answering correctly (selecting position with "4")
    const userAnswer = correctPosition;
    const isCorrect = userAnswer === shuffled.correctAnswer;

    expect(isCorrect).toBe(true);
  });
});
