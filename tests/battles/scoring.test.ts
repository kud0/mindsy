/**
 * Tests for battle scoring system
 * Ensures scores are calculated correctly as raw counts, not percentages
 */

import { calculateScore, calculateBattleXP } from '@/lib/battles/scoring';
import { BattleQuestion } from '@/types/database';

describe('Battle Scoring System', () => {
  const mockQuestions: BattleQuestion[] = [
    {
      id: 'q1',
      question: 'What is 2+2?',
      options: { A: '3', B: '4', C: '5', D: '6' },
      correctAnswer: 'B',
      topic: 'Math',
      difficulty: 'easy'
    },
    {
      id: 'q2',
      question: 'What is the capital of France?',
      options: { A: 'London', B: 'Berlin', C: 'Paris', D: 'Madrid' },
      correctAnswer: 'C',
      topic: 'Geography',
      difficulty: 'easy'
    },
    {
      id: 'q3',
      question: 'What is H2O?',
      options: { A: 'Water', B: 'Air', C: 'Fire', D: 'Earth' },
      correctAnswer: 'A',
      topic: 'Science',
      difficulty: 'easy'
    },
    {
      id: 'q4',
      question: 'Who wrote Romeo and Juliet?',
      options: { A: 'Dickens', B: 'Shakespeare', C: 'Austen', D: 'Tolkien' },
      correctAnswer: 'B',
      topic: 'Literature',
      difficulty: 'medium'
    },
    {
      id: 'q5',
      question: 'What year did WWII end?',
      options: { A: '1943', B: '1944', C: '1945', D: '1946' },
      correctAnswer: 'C',
      topic: 'History',
      difficulty: 'medium'
    }
  ];

  describe('calculateScore', () => {
    it('should return raw count, not percentage, for perfect score', () => {
      const answers = {
        q1: 'B',
        q2: 'C',
        q3: 'A',
        q4: 'B',
        q5: 'C'
      };

      const result = calculateScore(answers, mockQuestions);

      // Should be 5 (raw count), NOT 100 (percentage)
      expect(result.score).toBe(5);
      expect(result.correctCount).toBe(5);
      expect(result.incorrectCount).toBe(0);
    });

    it('should return raw count for partial score', () => {
      const answers = {
        q1: 'B', // Correct
        q2: 'A', // Wrong
        q3: 'A', // Correct
        q4: 'A', // Wrong
        q5: 'C'  // Correct
      };

      const result = calculateScore(answers, mockQuestions);

      // Should be 3 (raw count), NOT 60 (percentage)
      expect(result.score).toBe(3);
      expect(result.correctCount).toBe(3);
      expect(result.incorrectCount).toBe(2);
    });

    it('should return 0 for all wrong answers', () => {
      const answers = {
        q1: 'A',
        q2: 'A',
        q3: 'B',
        q4: 'A',
        q5: 'A'
      };

      const result = calculateScore(answers, mockQuestions);

      expect(result.score).toBe(0);
      expect(result.correctCount).toBe(0);
      expect(result.incorrectCount).toBe(5);
    });

    it('should handle case-insensitive answers', () => {
      const answers = {
        q1: 'b', // Lowercase
        q2: 'c',
        q3: 'a',
        q4: 'b',
        q5: 'c'
      };

      const result = calculateScore(answers, mockQuestions);

      expect(result.score).toBe(5);
      expect(result.correctCount).toBe(5);
    });

    it('should handle missing answers', () => {
      const answers = {
        q1: 'B',
        q2: 'C'
        // q3, q4, q5 not answered
      };

      const result = calculateScore(answers, mockQuestions);

      expect(result.score).toBe(2);
      expect(result.correctCount).toBe(2);
      expect(result.incorrectCount).toBe(3);
    });

    it('should calculate topic performance percentages correctly', () => {
      const answers = {
        q1: 'B', // Math - correct
        q2: 'A', // Geography - wrong
        q3: 'A', // Science - correct
        q4: 'B', // Literature - correct
        q5: 'A'  // History - wrong
      };

      const result = calculateScore(answers, mockQuestions);

      expect(result.topicPerformance['Math']).toEqual({
        correct: 1,
        total: 1,
        percentage: 100
      });

      expect(result.topicPerformance['Geography']).toEqual({
        correct: 0,
        total: 1,
        percentage: 0
      });

      expect(result.topicPerformance['Science']).toEqual({
        correct: 1,
        total: 1,
        percentage: 100
      });
    });
  });

  describe('calculateBattleXP', () => {
    it('should calculate XP based on raw score converted to percentage', () => {
      // Perfect score: 5/5 = 100% = 10 XP from score
      const xp = calculateBattleXP(5, false, 1, 5);

      // Base 10 + Score 10 (100% = 10 XP) + Round 5 = 25
      expect(xp).toBe(25);
    });

    it('should add win bonus', () => {
      // 3/5 = 60% = 6 XP from score
      const xp = calculateBattleXP(3, true, 1, 5);

      // Base 10 + Score 6 (60% = 6 XP) + Win 50 + Round 5 = 71
      expect(xp).toBe(71);
    });

    it('should increase XP with round number', () => {
      const round1XP = calculateBattleXP(3, false, 1, 5);
      const round2XP = calculateBattleXP(3, false, 2, 5);
      const round3XP = calculateBattleXP(3, false, 3, 5);

      // Each round adds 5 XP
      expect(round2XP - round1XP).toBe(5);
      expect(round3XP - round2XP).toBe(5);
    });

    it('should handle zero score', () => {
      const xp = calculateBattleXP(0, false, 1, 5);

      // Base 10 + Score 0 + Round 5 = 15
      expect(xp).toBe(15);
    });
  });

  describe('Score aggregation for UI', () => {
    it('should sum correctly across 3 rounds for display', () => {
      // Simulate a 3-round battle
      const round1Score = calculateScore(
        { q1: 'B', q2: 'C', q3: 'A', q4: 'B', q5: 'C' },
        mockQuestions
      ).score;

      const round2Score = calculateScore(
        { q1: 'B', q2: 'A', q3: 'A', q4: 'A', q5: 'C' },
        mockQuestions
      ).score;

      const round3Score = calculateScore(
        { q1: 'A', q2: 'C', q3: 'B', q4: 'B', q5: 'C' },
        mockQuestions
      ).score;

      const totalScore = round1Score + round2Score + round3Score;

      // Round 1: 5/5, Round 2: 3/5, Round 3: 3/5 = 11/15
      expect(round1Score).toBe(5);
      expect(round2Score).toBe(3);
      expect(round3Score).toBe(3);
      expect(totalScore).toBe(11);

      // UI should display: "11/15" ✓
      // NOT: "300/15" ✗ (which would happen with percentage scoring)
    });
  });
});
