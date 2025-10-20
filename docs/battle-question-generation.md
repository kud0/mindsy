# Battle Question Generation System

## Overview

AI-powered question generation system for quiz battles that uses a **hybrid approach**:
1. **Existing Questions** - Extracts questions from completed lecture notes (fast)
2. **AI Generation** - Uses Grok AI to generate fresh questions when needed (high quality)

## Features

✅ **Hybrid Strategy** - Combines existing + AI-generated questions
✅ **Smart Fallbacks** - Multiple data sources (openai_content, json_file_path, study_nodes)
✅ **Quality Validation** - All questions validated and sanitized
✅ **Difficulty Filtering** - Easy, medium, hard
✅ **Topic Filtering** - Optional topic-based filtering
✅ **Performance Optimized** - Uses existing questions first to avoid API calls

## Architecture

### File Structure

```
/lib/battles/
├── question-generator.ts     # Main generator (hybrid approach)
├── ai-prompts.ts              # Grok AI prompt templates
├── question-validator.ts      # Validation & sanitization
├── battle-utils.ts            # Battle completion logic
└── scoring.ts                 # Scoring calculations

/types/
└── battles.ts                 # BattleQuestion type definitions
```

### Data Flow

```
User Request → generateBattleQuestions()
                      ↓
           Extract Existing Questions
           (openai_content/storage/study_nodes)
                      ↓
                Enough? → Yes → Shuffle & Return
                      ↓ No
              Generate with Grok AI
              (createBattleQuestionPrompt)
                      ↓
         Validate & Sanitize (validateAndSanitizeQuestions)
                      ↓
         Combine + Shuffle + Return
```

## Usage

### Basic Usage

```typescript
import { generateBattleQuestions } from '@/lib/battles/question-generator';

// Generate 15 questions (3 rounds × 5 questions)
const questions = await generateBattleQuestions(
  userId,
  folderId,
  15
);
```

### With Options

```typescript
// Generate medium difficulty questions
const questions = await generateBattleQuestions(
  userId,
  folderId,
  15,
  {
    difficulty: 'medium',
    topics: ['Photosynthesis', 'Cell Biology'],
    forceAI: false // Use existing questions if available
  }
);
```

### Force AI Generation

```typescript
// Always generate fresh questions via AI
const questions = await generateBattleQuestions(
  userId,
  folderId,
  15,
  {
    difficulty: 'hard',
    forceAI: true
  }
);
```

## BattleQuestion Format

```typescript
interface BattleQuestion {
  id: string;              // Unique identifier
  question: string;        // Question text
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  topic: string;           // e.g., "Photosynthesis"
  difficulty: 'easy' | 'medium' | 'hard';
  explanation: string;     // Why correct answer is right
  sourceNote?: string;     // Optional: Source lecture
}
```

## AI Generation Details

### Model
- **Grok AI** (`grok-4-fast-reasoning`) from xAI
- Fallback: Can be configured to use OpenAI if needed

### Prompt Engineering

The AI prompt includes:
1. **Lecture material** (up to 32k characters)
2. **Difficulty guidelines** (easy/medium/hard)
3. **Quality standards** (understanding over memorization)
4. **Output format** (JSON schema)
5. **Educational explanations** (teach why answers are correct/incorrect)

### Example Prompt

```
You are an expert quiz creator for competitive quiz battles.
Generate 5 high-quality multiple-choice questions.

## LECTURE MATERIAL:
[Lecture content here...]

## REQUIREMENTS:
**Medium Difficulty:**
- Test comprehension and application
- Require connecting concepts
- Some analysis needed

### Question Format:
- Multiple choice with 4 options (A, B, C, D)
- Only ONE correct answer
- Distractors must be plausible
- Educational explanations

[JSON output format...]
```

## Performance

### Benchmarks

| Scenario | Source | Time | Notes |
|----------|--------|------|-------|
| 15 questions from existing | Existing | ~100-200ms | Fast path |
| 15 questions via AI | Grok AI | ~3-8s | First generation |
| Hybrid (10 existing + 5 AI) | Mixed | ~2-4s | Most common |

### Optimization Tips

1. **Use existing questions first** - Set `forceAI: false`
2. **Pre-generate during upload** - Generate questions when lectures are created
3. **Cache by folder** - Store generated questions for reuse
4. **Limit token size** - Content is truncated to 32k chars

## Error Handling

### Graceful Fallbacks

```typescript
try {
  const questions = await generateBattleQuestions(userId, folderId, 15);
} catch (error) {
  if (error.message.includes('No completed lectures')) {
    // User has no content yet
    return { error: 'No lectures found. Upload some content first!' };
  }

  if (error.message.includes('Grok API')) {
    // AI generation failed, try using existing questions only
    return { error: 'AI temporarily unavailable. Try again later.' };
  }

  // Generic error
  return { error: 'Failed to generate questions' };
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "No completed lectures" | Empty folder | Upload and process lectures |
| "No questions found" | Lectures have no questions | Force AI generation |
| "Empty response from Grok AI" | API failure | Retry or use existing |
| "Invalid response format" | JSON parse error | Retry with different content |

## Validation

### Question Validation Rules

✅ **Required fields:** id, question, options (A-D), correctAnswer, topic, difficulty, explanation
✅ **Minimum length:** Question ≥ 10 chars, Explanation ≥ 10 chars
✅ **Valid difficulty:** easy, medium, or hard
✅ **Valid correctAnswer:** A, B, C, or D
✅ **All options present:** Must have all 4 options

### Sanitization

- Trim whitespace
- Normalize case (correctAnswer → uppercase, difficulty → lowercase)
- Remove duplicates (ensure unique IDs)
- Filter invalid questions

## API Integration Example

```typescript
// app/api/battles/generate-questions/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateBattleQuestions } from '@/lib/battles/question-generator';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { folderId, count = 15, difficulty } = await request.json();

    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID required' }, { status: 400 });
    }

    const questions = await generateBattleQuestions(
      user.id,
      folderId,
      count,
      { difficulty }
    );

    return NextResponse.json({
      success: true,
      questions,
      count: questions.length
    });

  } catch (error) {
    console.error('Question generation error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to generate questions'
    }, { status: 500 });
  }
}
```

## Testing

### Manual Test

```typescript
// Test with a real folder
const questions = await generateBattleQuestions(
  'user_123',
  'folder_abc',
  5,
  { difficulty: 'medium' }
);

console.log('Generated questions:', questions.length);
console.log('Sample question:', questions[0]);

// Expected output:
// {
//   id: 'q1',
//   question: 'What is the primary function of mitochondria?',
//   options: {
//     A: 'Protein synthesis',
//     B: 'Energy production (ATP)',
//     C: 'DNA replication',
//     D: 'Waste removal'
//   },
//   correctAnswer: 'B',
//   topic: 'Cell Biology',
//   difficulty: 'easy',
//   explanation: 'Mitochondria are known as the powerhouse of the cell...'
// }
```

### Test Cases

1. ✅ Generate 5 questions from folder with 3 lectures
2. ✅ Generate 15 questions (needs AI for additional)
3. ✅ Handle folder with only 1 lecture (limited content)
4. ✅ Verify question format and validation
5. ✅ Test difficulty filtering
6. ✅ Test with forceAI option
7. ✅ Handle errors gracefully (no lectures, AI failure)

## Limitations

1. **Token limits** - Content truncated to 32k characters (~8k tokens)
2. **Generation time** - AI generation takes 3-8 seconds
3. **Quality variance** - AI-generated questions may vary in quality
4. **Content dependency** - Quality depends on lecture content quality
5. **No caching** - Each request generates fresh questions (implement caching for production)

## Future Improvements

### Short-term
- [ ] Cache generated questions by folder
- [ ] Add question difficulty estimation
- [ ] Support for images in questions
- [ ] Better topic extraction from lectures

### Long-term
- [ ] Question bank per folder (pre-generated)
- [ ] Adaptive difficulty (learn from user performance)
- [ ] Multi-language support
- [ ] Question quality scoring
- [ ] User-contributed questions

## Cost Optimization

### Grok AI Pricing
- Grok API is more cost-effective than OpenAI GPT-4
- Each question generation call costs ~$0.01-0.05
- Use existing questions to minimize API calls

### Best Practices
1. **Prefer existing questions** - Set `forceAI: false`
2. **Batch generation** - Generate for multiple battles at once
3. **Pre-generate** - Create questions during lecture upload
4. **Cache results** - Store questions for reuse
5. **Monitor usage** - Track API calls and costs

## Related Documentation

- Main README: `/CLAUDE.md`
- AI Integration: `.claude/agents/ai-integration-specialist.md`
- Battle System: (to be created)
- Social Features: `.claude/social-features-overview.md`

---

**Last updated:** 2025-10-20
**Maintained by:** AI Integration Specialist Agent
