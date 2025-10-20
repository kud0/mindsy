// Question Validation and Sanitization

import { BattleQuestion, CorrectAnswerOption } from '@/types/battles';

/**
 * Validate a battle question against required schema
 */
export function validateBattleQuestion(question: any): boolean {
  try {
    // Check required fields
    if (!question.id || typeof question.id !== 'string') {
      console.warn('Invalid question: missing or invalid id');
      return false;
    }

    if (!question.question || typeof question.question !== 'string' || question.question.length < 10) {
      console.warn('Invalid question: missing or too short question text');
      return false;
    }

    // Check options
    if (!question.options || typeof question.options !== 'object') {
      console.warn('Invalid question: missing options');
      return false;
    }

    const requiredOptions = ['A', 'B', 'C', 'D'];
    for (const opt of requiredOptions) {
      if (!question.options[opt] || typeof question.options[opt] !== 'string') {
        console.warn(`Invalid question: missing or invalid option ${opt}`);
        return false;
      }
    }

    // Check correct answer
    if (!question.correctAnswer || !requiredOptions.includes(question.correctAnswer)) {
      console.warn('Invalid question: invalid correctAnswer');
      return false;
    }

    // Check difficulty
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!question.difficulty || !validDifficulties.includes(question.difficulty)) {
      console.warn('Invalid question: invalid difficulty');
      return false;
    }

    // Check topic
    if (!question.topic || typeof question.topic !== 'string') {
      console.warn('Invalid question: missing topic');
      return false;
    }

    // Check explanation
    if (!question.explanation || typeof question.explanation !== 'string' || question.explanation.length < 10) {
      console.warn('Invalid question: missing or too short explanation');
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error validating question:', error);
    return false;
  }
}

/**
 * Shuffle the options of a question and update the correct answer accordingly
 * This prevents the correct answer from always being in the same position
 */
export function shuffleQuestionOptions(question: BattleQuestion): BattleQuestion {
  const options = [
    { key: 'A', value: question.options.A },
    { key: 'B', value: question.options.B },
    { key: 'C', value: question.options.C },
    { key: 'D', value: question.options.D }
  ];

  // Find which option is correct
  const correctIndex = options.findIndex(opt => opt.key === question.correctAnswer);
  const correctValue = options[correctIndex].value;

  // Shuffle the options using Fisher-Yates
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  // Find new position of correct answer
  const newCorrectIndex = options.findIndex(opt => opt.value === correctValue);
  const newCorrectAnswer = ['A', 'B', 'C', 'D'][newCorrectIndex];

  return {
    ...question,
    options: {
      A: options[0].value,
      B: options[1].value,
      C: options[2].value,
      D: options[3].value
    },
    correctAnswer: newCorrectAnswer as CorrectAnswerOption
  };
}

/**
 * Sanitize and normalize a question object
 */
export function sanitizeQuestion(question: any): BattleQuestion {
  // Ensure proper typing and sanitization
  return {
    id: String(question.id).trim(),
    question: String(question.question).trim(),
    options: {
      A: String(question.options.A).trim(),
      B: String(question.options.B).trim(),
      C: String(question.options.C).trim(),
      D: String(question.options.D).trim()
    },
    correctAnswer: question.correctAnswer.toUpperCase() as CorrectAnswerOption,
    topic: String(question.topic).trim(),
    difficulty: question.difficulty.toLowerCase() as 'easy' | 'medium' | 'hard',
    explanation: String(question.explanation).trim(),
    sourceNote: question.sourceNote ? String(question.sourceNote).trim() : undefined
  };
}

/**
 * Validate and sanitize an array of questions
 * Returns only valid questions with shuffled options
 */
export function validateAndSanitizeQuestions(questions: any[]): BattleQuestion[] {
  if (!Array.isArray(questions)) {
    console.warn('❌ Questions is not an array:', typeof questions);
    return [];
  }

  console.log(`🔍 Validating ${questions.length} questions...`);

  const validQuestions: BattleQuestion[] = [];
  let rejected = 0;

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (validateBattleQuestion(q)) {
      try {
        const sanitized = sanitizeQuestion(q);

        // BUGFIX: Shuffle options to randomize correct answer position
        const shuffled = shuffleQuestionOptions(sanitized);

        console.log(`✅ Question ${i} validated and shuffled:`, {
          id: shuffled.id.substring(0, 8),
          originalCorrect: sanitized.correctAnswer,
          shuffledCorrect: shuffled.correctAnswer,
          topic: shuffled.topic
        });

        validQuestions.push(shuffled);
      } catch (error) {
        console.error(`❌ Error sanitizing question ${i}:`, error);
        rejected++;
      }
    } else {
      console.warn(`❌ Question ${i} failed validation:`, {
        hasId: !!q.id,
        hasQuestion: !!q.question,
        hasOptions: !!q.options,
        hasCorrectAnswer: !!q.correctAnswer,
        hasDifficulty: !!q.difficulty,
        hasTopic: !!q.topic,
        hasExplanation: !!q.explanation
      });
      rejected++;
    }
  }

  console.log(`✅ Validation complete: ${validQuestions.length} valid, ${rejected} rejected`);

  return validQuestions;
}

/**
 * Ensure questions have unique IDs (prevent duplicates)
 */
export function ensureUniqueIds(questions: BattleQuestion[]): BattleQuestion[] {
  const seen = new Set<string>();
  const unique: BattleQuestion[] = [];

  for (const q of questions) {
    if (!seen.has(q.id)) {
      seen.add(q.id);
      unique.push(q);
    } else {
      // Generate new ID for duplicate
      const newId = `${q.id}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      unique.push({ ...q, id: newId });
      seen.add(newId);
    }
  }

  return unique;
}

/**
 * Shuffle questions randomly (Fisher-Yates algorithm)
 */
export function shuffleQuestions<T>(questions: T[]): T[] {
  const shuffled = [...questions];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

/**
 * Filter questions by difficulty
 */
export function filterByDifficulty(
  questions: BattleQuestion[],
  difficulty: 'easy' | 'medium' | 'hard'
): BattleQuestion[] {
  return questions.filter(q => q.difficulty === difficulty);
}

/**
 * Filter questions by topics
 */
export function filterByTopics(
  questions: BattleQuestion[],
  topics: string[]
): BattleQuestion[] {
  if (topics.length === 0) return questions;

  const topicsLower = topics.map(t => t.toLowerCase());
  return questions.filter(q =>
    topicsLower.some(topic => q.topic.toLowerCase().includes(topic))
  );
}
