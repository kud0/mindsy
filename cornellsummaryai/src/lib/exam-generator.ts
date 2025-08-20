/**
 * Exam Generator from Mindsy Notes
 * Extracts questions and answers from structured Mindsy notes JSON/Markdown
 */

import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_KEY
});

export interface CornellNote {
  id: string;
  title: string;
  content: string; // Markdown content with structured sections
  cueColumn?: string[];
  detailedNotes?: string[];
  summary?: string;
  createdAt: Date;
}

export interface ExamQuestion {
  id: string;
  type: 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer';
  question: string;
  options?: string[]; // For multiple choice
  correctAnswer: string | string[];
  explanation: string;
  topic: string;
  difficulty: 1 | 2 | 3 | 4 | 5;
  sourceNoteId: string;
  sourceSection: 'cue' | 'notes' | 'summary';
  confidence: 'high' | 'medium' | 'low';
}

export interface GeneratedExam {
  id: string;
  title: string;
  folderId: string;
  questions: ExamQuestion[];
  totalPoints: number;
  estimatedTime: number; // in minutes
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed';
  topics: string[];
  sourceNotes: string[]; // Note IDs used
  createdAt: Date;
}

/**
 * Parse Mindsy Notes Markdown to extract structured content
 */
function parseCornellNotes(markdown: string): {
  tableOfContents: string[];
  cueQuestions: string[];
  detailedNotes: string[];
  summary: string;
} {
  const sections = {
    tableOfContents: [] as string[],
    cueQuestions: [] as string[],
    detailedNotes: [] as string[],
    summary: ''
  };

  // Extract Table of Contents
  const tocMatch = markdown.match(/## (?:Table of Contents|Tabla de Contenidos|目录)([\s\S]*?)(?=##|$)/i);
  if (tocMatch) {
    sections.tableOfContents = tocMatch[1]
      .split('\n')
      .filter(line => line.trim().startsWith('*') || line.trim().startsWith('-'))
      .map(line => line.replace(/^[*-]\s*/, '').trim());
  }

  // Extract Cue Column Questions
  const cueMatch = markdown.match(/## (?:Cue Column|Columna de Señales|提示栏)([\s\S]*?)(?=##|$)/i);
  if (cueMatch) {
    sections.cueQuestions = cueMatch[1]
      .split('\n')
      .filter(line => line.includes('?') || line.match(/^[*-]\s*\*\*/))
      .map(line => line.replace(/^[*-]\s*/, '').replace(/\*\*/g, '').trim());
  }

  // Extract Detailed Notes
  const notesMatch = markdown.match(/## (?:Detailed Notes|Notas Detalladas|详细笔记)([\s\S]*?)(?=##|<!-- NEW_PAGE -->|$)/i);
  if (notesMatch) {
    sections.detailedNotes = notesMatch[1]
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.trim());
  }

  // Extract Summary
  const summaryMatch = markdown.match(/## (?:Comprehensive Summary|Resumen Completo|综合摘要)([\s\S]*?)$/i);
  if (summaryMatch) {
    sections.summary = summaryMatch[1].trim();
  }

  return sections;
}

/**
 * Extract Q&A pairs directly from Mindsy notes structure
 */
function extractDirectQAPairs(parsedNotes: ReturnType<typeof parseCornellNotes>): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  
  // Mindsy notes have cue questions that correspond to detailed notes
  parsedNotes.cueQuestions.forEach((cueQuestion, index) => {
    if (cueQuestion.includes('?')) {
      // Find corresponding answer in detailed notes
      // Usually, the detailed notes follow the same order as cue questions
      const relevantNotes = parsedNotes.detailedNotes.slice(
        index * 3, // Approximate - each cue might have ~3 lines of notes
        (index + 1) * 3
      ).join(' ');

      questions.push({
        id: `direct-${index}`,
        type: 'short_answer',
        question: cueQuestion,
        correctAnswer: relevantNotes || 'See detailed notes',
        explanation: `This answer is derived from the detailed notes section corresponding to this cue question.`,
        topic: parsedNotes.tableOfContents[Math.floor(index / 3)] || 'General',
        difficulty: 3,
        sourceNoteId: '',
        sourceSection: 'cue',
        confidence: 'high',
        options: undefined
      });
    }
  });

  return questions;
}

/**
 * Generate multiple choice questions from key concepts
 */
async function generateMultipleChoiceQuestions(
  parsedNotes: ReturnType<typeof parseCornellNotes>,
  count: number = 10
): Promise<ExamQuestion[]> {
  const prompt = `
Based on these Mindsy Notes, generate ${count} multiple choice questions.

Table of Contents: ${parsedNotes.tableOfContents.join(', ')}

Cue Questions: 
${parsedNotes.cueQuestions.slice(0, 20).join('\n')}

Summary:
${parsedNotes.summary.slice(0, 1500)}

For each question, provide in this exact JSON format:
[
  {
    "question": "Clear, specific question text",
    "options": ["A) First option", "B) Second option", "C) Third option", "D) Fourth option"],
    "correctAnswer": "A",
    "explanation": "Why this is correct based on the notes",
    "topic": "Topic from table of contents",
    "difficulty": 3
  }
]

Rules:
1. Questions must be directly answerable from the provided content
2. Include plausible distractors that are clearly wrong
3. Vary difficulty levels (1-5)
4. Cover different topics proportionally
5. Make options concise and clear
`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert exam creator. Generate questions ONLY from the provided content.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) return [];

    const parsed = JSON.parse(response);
    const questions = Array.isArray(parsed) ? parsed : parsed.questions || [];

    return questions.map((q: any, index: number) => ({
      id: `mc-${index}`,
      type: 'multiple_choice' as const,
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation,
      topic: q.topic,
      difficulty: q.difficulty || 3,
      sourceNoteId: '',
      sourceSection: 'summary' as const,
      confidence: 'medium' as const
    }));
  } catch (error) {
    console.error('Error generating multiple choice questions:', error);
    return [];
  }
}

/**
 * Generate True/False questions from facts in the notes
 */
function generateTrueFalseQuestions(parsedNotes: ReturnType<typeof parseCornellNotes>): ExamQuestion[] {
  const questions: ExamQuestion[] = [];
  
  // Extract factual statements from summary
  const sentences = parsedNotes.summary
    .split('.')
    .filter(s => s.trim().length > 20 && !s.includes('?'));

  sentences.slice(0, 10).forEach((sentence, index) => {
    const isTrue = Math.random() > 0.5;
    
    let questionStatement = sentence.trim();
    if (!isTrue) {
      // Negate or modify the statement to make it false
      questionStatement = negateStatement(questionStatement);
    }

    questions.push({
      id: `tf-${index}`,
      type: 'true_false',
      question: `True or False: ${questionStatement}`,
      correctAnswer: isTrue ? 'True' : 'False',
      explanation: isTrue 
        ? `This statement is directly from the notes.`
        : `This statement has been modified. The correct version is: "${sentence.trim()}"`,
      topic: parsedNotes.tableOfContents[0] || 'General',
      difficulty: 2,
      sourceNoteId: '',
      sourceSection: 'summary',
      confidence: 'high',
      options: ['True', 'False']
    });
  });

  return questions;
}

/**
 * Helper function to negate or modify a statement
 */
function negateStatement(statement: string): string {
  const negations = [
    { find: /is/g, replace: 'is not' },
    { find: /are/g, replace: 'are not' },
    { find: /can/g, replace: 'cannot' },
    { find: /will/g, replace: 'will not' },
    { find: /increases/g, replace: 'decreases' },
    { find: /higher/g, replace: 'lower' },
    { find: /more/g, replace: 'less' },
    { find: /all/g, replace: 'none' },
    { find: /always/g, replace: 'never' },
  ];

  // Apply a random negation
  const negation = negations[Math.floor(Math.random() * negations.length)];
  if (statement.match(negation.find)) {
    return statement.replace(negation.find, negation.replace);
  }

  // If no pattern matches, just add "not" after the first verb
  return statement.replace(/(\w+s?\s+)/, '$1not ');
}

/**
 * Main function to generate an exam from Mindsy notes
 */
export async function generateExamFromNotes(
  notes: CornellNote[],
  options: {
    questionCount?: number;
    difficulty?: 'easy' | 'medium' | 'hard' | 'mixed';
    questionTypes?: Array<'multiple_choice' | 'true_false' | 'short_answer'>;
    folderId: string;
  }
): Promise<GeneratedExam> {
  const {
    questionCount = 20,
    difficulty = 'mixed',
    questionTypes = ['multiple_choice', 'true_false'],
    folderId
  } = options;

  const allQuestions: ExamQuestion[] = [];

  // Process each note
  for (const note of notes) {
    const parsed = parseCornellNotes(note.content);
    
    // Extract direct Q&A pairs (highest confidence)
    if (questionTypes.includes('short_answer')) {
      const directQA = extractDirectQAPairs(parsed);
      allQuestions.push(...directQA.map(q => ({ ...q, sourceNoteId: note.id })));
    }

    // Generate True/False questions
    if (questionTypes.includes('true_false')) {
      const tfQuestions = generateTrueFalseQuestions(parsed);
      allQuestions.push(...tfQuestions.map(q => ({ ...q, sourceNoteId: note.id })));
    }

    // Generate Multiple Choice questions
    if (questionTypes.includes('multiple_choice')) {
      const mcQuestions = await generateMultipleChoiceQuestions(
        parsed, 
        Math.ceil(questionCount / notes.length)
      );
      allQuestions.push(...mcQuestions.map(q => ({ ...q, sourceNoteId: note.id })));
    }
  }

  // Select and balance questions
  const selectedQuestions = selectAndBalanceQuestions(allQuestions, questionCount, difficulty);

  // Extract unique topics
  const topics = [...new Set(selectedQuestions.map(q => q.topic))];

  return {
    id: `exam-${Date.now()}`,
    title: `Exam - ${notes.map(n => n.title).join(', ')}`,
    folderId,
    questions: selectedQuestions,
    totalPoints: selectedQuestions.length * 5, // 5 points per question
    estimatedTime: Math.ceil(selectedQuestions.length * 1.5), // 1.5 minutes per question
    difficulty,
    topics,
    sourceNotes: notes.map(n => n.id),
    createdAt: new Date()
  };
}

/**
 * Select and balance questions based on difficulty and distribution
 */
function selectAndBalanceQuestions(
  allQuestions: ExamQuestion[],
  targetCount: number,
  difficulty: 'easy' | 'medium' | 'hard' | 'mixed'
): ExamQuestion[] {
  // Filter by difficulty if specified
  let filtered = allQuestions;
  
  if (difficulty !== 'mixed') {
    const difficultyMap = {
      easy: [1, 2],
      medium: [2, 3, 4],
      hard: [4, 5]
    };
    filtered = allQuestions.filter(q => 
      difficultyMap[difficulty].includes(q.difficulty)
    );
  }

  // Shuffle and select
  const shuffled = filtered.sort(() => Math.random() - 0.5);
  
  // Ensure variety in question types
  const selected: ExamQuestion[] = [];
  const typeGroups = new Map<string, ExamQuestion[]>();
  
  shuffled.forEach(q => {
    if (!typeGroups.has(q.type)) {
      typeGroups.set(q.type, []);
    }
    typeGroups.get(q.type)!.push(q);
  });

  // Distribute evenly across types
  const typesCount = typeGroups.size;
  const perType = Math.floor(targetCount / typesCount);
  
  typeGroups.forEach(questions => {
    selected.push(...questions.slice(0, perType));
  });

  // Fill remaining slots
  if (selected.length < targetCount) {
    const remaining = shuffled.filter(q => !selected.includes(q));
    selected.push(...remaining.slice(0, targetCount - selected.length));
  }

  return selected.slice(0, targetCount);
}

/**
 * Calculate exam score
 */
export function calculateExamScore(
  exam: GeneratedExam,
  userAnswers: Map<string, string>
): {
  score: number;
  percentage: number;
  correct: number;
  incorrect: number;
  byTopic: Map<string, { correct: number; total: number }>;
  feedback: string[];
} {
  let correct = 0;
  let incorrect = 0;
  const byTopic = new Map<string, { correct: number; total: number }>();
  const feedback: string[] = [];

  exam.questions.forEach(question => {
    const userAnswer = userAnswers.get(question.id);
    const isCorrect = userAnswer === question.correctAnswer;
    
    if (isCorrect) {
      correct++;
    } else {
      incorrect++;
      feedback.push(`Q: ${question.question}\nYour answer: ${userAnswer}\nCorrect answer: ${question.correctAnswer}\nExplanation: ${question.explanation}`);
    }

    // Track by topic
    if (!byTopic.has(question.topic)) {
      byTopic.set(question.topic, { correct: 0, total: 0 });
    }
    const topicStats = byTopic.get(question.topic)!;
    topicStats.total++;
    if (isCorrect) topicStats.correct++;
  });

  const score = correct * 5; // 5 points per question
  const percentage = (correct / exam.questions.length) * 100;

  return {
    score,
    percentage,
    correct,
    incorrect,
    byTopic,
    feedback
  };
}