// Battle System Types

export type BattleDifficulty = 'easy' | 'medium' | 'hard';
export type CorrectAnswerOption = 'A' | 'B' | 'C' | 'D';

export interface BattleQuestion {
  id: string; // UUID
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: CorrectAnswerOption;
  topic: string; // e.g., "Photosynthesis", "Algebra"
  difficulty: BattleDifficulty;
  explanation: string; // Why correct answer is right
  sourceNote?: string; // Optional: Which lecture this came from
}

export interface QuestionGenerationOptions {
  count: number; // Number of questions to generate
  difficulty?: BattleDifficulty; // Filter by difficulty
  topics?: string[]; // Optional: Filter by topics
  maxTokens?: number; // Max context size for AI
}

export interface QuestionGenerationResult {
  success: boolean;
  questions: BattleQuestion[];
  source: 'existing' | 'ai-generated' | 'hybrid';
  metadata?: {
    totalLectures: number;
    existingQuestionsFound: number;
    aiGeneratedCount: number;
    generationTimeMs?: number;
  };
  error?: string;
}

// Internal: Represents lecture content for AI generation
export interface LectureContent {
  jobId: string;
  title: string;
  content: string; // Combined transcript/notes/summary
  questions?: any[]; // Existing questions from OpenAI content
}
