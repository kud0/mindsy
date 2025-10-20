/**
 * Test suite for Battle Question Generation
 *
 * NOTE: These are integration tests that require:
 * - Valid Supabase connection
 * - Grok API key configured
 * - Test user with completed lectures
 *
 * Run with: npm test -- battle-question-generation
 */

import { generateBattleQuestions } from '@/lib/battles/question-generator';
import { validateBattleQuestion, validateAndSanitizeQuestions } from '@/lib/battles/question-validator';
import { BattleQuestion } from '@/types/database';

describe('Battle Question Generation', () => {
  // Test configuration
  const TEST_USER_ID = 'test-user-id'; // Replace with real test user
  const TEST_FOLDER_ID = 'test-folder-id'; // Replace with folder that has lectures

  describe('generateBattleQuestions', () => {
    it('should generate 5 questions from existing content', async () => {
      const questions = await generateBattleQuestions(
        TEST_USER_ID,
        TEST_FOLDER_ID,
        5
      );

      expect(questions).toHaveLength(5);
      expect(questions[0]).toHaveProperty('id');
      expect(questions[0]).toHaveProperty('question');
      expect(questions[0]).toHaveProperty('options');
      expect(questions[0]).toHaveProperty('correctAnswer');
      expect(questions[0]).toHaveProperty('explanation');
    }, 10000); // 10s timeout

    it('should generate 15 questions with AI fallback', async () => {
      const questions = await generateBattleQuestions(
        TEST_USER_ID,
        TEST_FOLDER_ID,
        15
      );

      expect(questions).toHaveLength(15);

      // All questions should be valid
      questions.forEach(q => {
        expect(validateBattleQuestion(q)).toBe(true);
      });
    }, 30000); // 30s timeout for AI generation

    it('should filter by difficulty', async () => {
      const questions = await generateBattleQuestions(
        TEST_USER_ID,
        TEST_FOLDER_ID,
        10,
        { difficulty: 'medium' }
      );

      expect(questions).toHaveLength(10);

      questions.forEach(q => {
        expect(q.difficulty).toBe('medium');
      });
    }, 20000);

    it('should force AI generation', async () => {
      const questions = await generateBattleQuestions(
        TEST_USER_ID,
        TEST_FOLDER_ID,
        5,
        { forceAI: true }
      );

      expect(questions).toHaveLength(5);

      // AI-generated questions should have explanations
      questions.forEach(q => {
        expect(q.explanation).toBeTruthy();
        expect(q.explanation.length).toBeGreaterThan(20);
      });
    }, 20000);

    it('should handle empty folder', async () => {
      await expect(
        generateBattleQuestions(TEST_USER_ID, 'empty-folder-id', 5)
      ).rejects.toThrow('No completed lectures');
    });
  });

  describe('Question Validation', () => {
    const validQuestion: BattleQuestion = {
      id: 'q1',
      question: 'What is the primary function of mitochondria?',
      options: {
        A: 'Protein synthesis',
        B: 'Energy production (ATP)',
        C: 'DNA replication',
        D: 'Waste removal'
      },
      correctAnswer: 'B',
      topic: 'Cell Biology',
      difficulty: 'easy',
      explanation: 'Mitochondria are the powerhouse of the cell, producing ATP through cellular respiration.'
    };

    it('should validate a valid question', () => {
      expect(validateBattleQuestion(validQuestion)).toBe(true);
    });

    it('should reject question with missing fields', () => {
      const invalid = { ...validQuestion };
      delete (invalid as any).explanation;

      expect(validateBattleQuestion(invalid)).toBe(false);
    });

    it('should reject question with invalid options', () => {
      const invalid = {
        ...validQuestion,
        options: { A: 'Option A', B: 'Option B' } // Missing C and D
      };

      expect(validateBattleQuestion(invalid)).toBe(false);
    });

    it('should reject question with invalid correctAnswer', () => {
      const invalid = {
        ...validQuestion,
        correctAnswer: 'E' // Invalid option
      };

      expect(validateBattleQuestion(invalid)).toBe(false);
    });

    it('should reject question with invalid difficulty', () => {
      const invalid = {
        ...validQuestion,
        difficulty: 'super-hard' // Invalid difficulty
      };

      expect(validateBattleQuestion(invalid as any)).toBe(false);
    });
  });

  describe('Question Sanitization', () => {
    it('should sanitize an array of questions', () => {
      const questions = [
        {
          id: 'q1',
          question: '  What is photosynthesis?  ',
          options: {
            A: ' Option A ',
            B: ' Option B ',
            C: ' Option C ',
            D: ' Option D '
          },
          correctAnswer: 'a', // lowercase
          topic: 'Biology',
          difficulty: 'EASY', // uppercase
          explanation: 'Explanation here'
        },
        {
          id: 'invalid', // Missing required fields
          question: 'Bad question'
        }
      ];

      const sanitized = validateAndSanitizeQuestions(questions);

      expect(sanitized).toHaveLength(1); // Only valid question passes
      expect(sanitized[0].question).toBe('What is photosynthesis?'); // Trimmed
      expect(sanitized[0].correctAnswer).toBe('A'); // Uppercase
      expect(sanitized[0].difficulty).toBe('easy'); // Lowercase
      expect(sanitized[0].options.A).toBe('Option A'); // Trimmed
    });
  });
});

/**
 * Manual test example (not part of Jest suite)
 * Run this manually to test with real data
 */
export async function manualTest() {
  console.log('🧪 Manual Battle Question Generation Test\n');

  try {
    // Replace these with your actual IDs
    const userId = 'YOUR_USER_ID';
    const folderId = 'YOUR_FOLDER_ID';

    console.log('📚 Testing with 5 questions...');
    const questions = await generateBattleQuestions(userId, folderId, 5);

    console.log(`✅ Generated ${questions.length} questions\n`);

    // Display first question
    console.log('Sample Question:');
    console.log('----------------');
    console.log(`ID: ${questions[0].id}`);
    console.log(`Topic: ${questions[0].topic}`);
    console.log(`Difficulty: ${questions[0].difficulty}`);
    console.log(`\nQuestion: ${questions[0].question}`);
    console.log(`\nOptions:`);
    console.log(`  A) ${questions[0].options.A}`);
    console.log(`  B) ${questions[0].options.B}`);
    console.log(`  C) ${questions[0].options.C}`);
    console.log(`  D) ${questions[0].options.D}`);
    console.log(`\nCorrect Answer: ${questions[0].correctAnswer}`);
    console.log(`\nExplanation: ${questions[0].explanation}`);

    if (questions[0].sourceNote) {
      console.log(`\nSource: ${questions[0].sourceNote}`);
    }

    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Uncomment to run manual test:
// manualTest();
