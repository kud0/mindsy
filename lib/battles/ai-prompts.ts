// AI Prompts for Quiz Battle Question Generation

import { BattleDifficulty } from '@/types/battles';

export interface BattlePromptInput {
  lectureContent: string;
  count: number;
  difficulty?: BattleDifficulty;
  topics?: string[];
  language?: string; // Detected or specified language for questions
}

/**
 * Generate AI prompt for battle question generation
 */
export function createBattleQuestionPrompt(input: BattlePromptInput): string {
  const { lectureContent, count, difficulty = 'medium', topics = [], language } = input;

  const difficultyGuidelines = {
    easy: `
**Easy Difficulty:**
- Test basic facts and definitions
- Straightforward recall questions
- Clear, unambiguous answers
- Example: "What is the primary function of mitochondria?"
`,
    medium: `
**Medium Difficulty:**
- Test comprehension and application
- Require connecting concepts
- Some analysis needed
- Example: "How does photosynthesis relate to cellular respiration?"
`,
    hard: `
**Hard Difficulty:**
- Test synthesis and critical thinking
- Require deep understanding
- Multi-step reasoning or complex scenarios
- Example: "Given these conditions, which process would be affected and why?"
`
  };

  const topicsFilter = topics.length > 0
    ? `\n**TOPIC FILTER:**\nFocus questions on these specific topics:\n${topics.map(t => `- ${t}`).join('\n')}\n`
    : '';

  const languageInstruction = language
    ? `\n## 🌍 LANGUAGE REQUIREMENT:\n**CRITICAL:** Generate ALL questions, options, and explanations in **${language}**.\n- Match the language of the source material\n- Do NOT translate to English unless source is English\n- Keep technical terms in their original language\n- Use natural phrasing for the detected language\n`
    : '\n## 🌍 LANGUAGE REQUIREMENT:\n**CRITICAL:** Generate questions in the SAME language as the source material provided below.\n';

  return `You are an expert quiz creator for competitive quiz battles. Generate ${count} high-quality multiple-choice questions from this study material.
${languageInstruction}

## LECTURE MATERIAL:
${lectureContent}

## REQUIREMENTS:

${difficultyGuidelines[difficulty]}

### Question Format:
- **Multiple choice with 4 options** (A, B, C, D)
- **Only ONE correct answer**
- **Distractors must be plausible** but clearly incorrect to someone who understands the material
- **Questions must be answerable** from the provided content only
- **Clear and unambiguous** - no trick questions
- **Educational explanations** that teach why the answer is correct

### Quality Standards:
1. **Test understanding, not memorization**
2. **Vary question types**: definitions, applications, comparisons, scenarios
3. **Cover diverse topics** from the material proportionally
4. **Explanations should educate**: Explain why correct answer is right AND why others are wrong
5. **Real-world context when possible**: Make questions relatable

${topicsFilter}

## REQUIRED JSON OUTPUT FORMAT:
{
  "questions": [
    {
      "id": "q1",
      "question": "Clear, specific question text?",
      "options": {
        "A": "First option",
        "B": "Second option",
        "C": "Third option",
        "D": "Fourth option"
      },
      "correctAnswer": "A",
      "topic": "Specific topic from lecture",
      "difficulty": "${difficulty}",
      "explanation": "The correct answer is A because [detailed explanation]. B is incorrect because [reason]. C is wrong because [reason]. D is not correct because [reason]."
    }
  ]
}

## CRITICAL RULES:
✅ Generate EXACTLY ${count} questions (no more, no less)
✅ All questions at **${difficulty}** difficulty level
✅ Base questions ONLY on provided material
✅ Ensure options A, B, C, D are distinct and clear
✅ Explanations must be educational (2-3 sentences minimum)
✅ Assign specific topics to help students identify weak areas
✅ Avoid negatively worded questions ("Which is NOT...")
✅ Test concepts, not trivial details

Return ONLY the JSON object. No additional text or commentary.`;
}

/**
 * Validation schema for battle questions
 */
export const BATTLE_QUESTION_SCHEMA = {
  type: 'object',
  required: ['id', 'question', 'options', 'correctAnswer', 'topic', 'difficulty', 'explanation'],
  properties: {
    id: { type: 'string', minLength: 1 },
    question: { type: 'string', minLength: 10 },
    options: {
      type: 'object',
      required: ['A', 'B', 'C', 'D'],
      properties: {
        A: { type: 'string', minLength: 1 },
        B: { type: 'string', minLength: 1 },
        C: { type: 'string', minLength: 1 },
        D: { type: 'string', minLength: 1 }
      }
    },
    correctAnswer: {
      type: 'string',
      enum: ['A', 'B', 'C', 'D']
    },
    topic: { type: 'string', minLength: 1 },
    difficulty: {
      type: 'string',
      enum: ['easy', 'medium', 'hard']
    },
    explanation: { type: 'string', minLength: 10 }
  }
};
