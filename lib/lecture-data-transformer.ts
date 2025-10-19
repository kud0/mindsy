/**
 * Transforms Cornell Notes format to StudentDesk format
 * Handles the conversion between the current generation format and the UI expectations
 */

import { LectureData } from '@/types/lecture-data';

export interface CornellNotesFormat {
  metadata?: {
    title?: string;
    subject?: string;
    language?: string;
    estimatedStudyTime?: string;
    difficulty?: string;
    topicArea?: string;
    generatedAt?: string;
  };
  tableOfContents?: {
    title?: string;
    items?: Array<{
      title?: string;
      description?: string;
    }>;
  };
  questions?: Array<{
    id?: string;
    question?: string;
    answer?: string;
    type?: string;
    difficulty?: string;
    tags?: string[];
    section?: string;
  }>;
  explanations?: Array<{
    id?: string;

    // NEW SCHEMA (from Grok generateStudentDeskContent)
    concept?: string;
    section?: string;  // Grouping/theme name
    timestamps?: {     // Audio source attribution
      start: number;
      end: number;
    };
    introduction?: string;
    sections?: Array<{
      heading: string;
      content: string;
      points?: string[];
    }>;
    importance?: 'high' | 'medium' | 'low';
    example?: string;

    // OLD SCHEMA (legacy support)
    title?: string;
    content?: string;
    explanation?: string;
    keyPoints?: string[];
    examples?: string[];
  }>;
  summary?: {
    // NEW SCHEMA (from Grok generateStudentDeskContent)
    sections?: Array<{
      heading: string;
      content: string;
      keyPoints?: string[];
    }>;
    mustKnow?: Array<{
      concept: string;
      explanation: string;
    }>;
    commonPitfalls?: Array<{
      pitfall: string;
      explanation: string;
      howToAvoid?: string;
    }>;
    // OLD SCHEMA (legacy)
    overview?: string;
    keyTakeaways?: string[];
    learningObjectives?: string[];
    nextSteps?: string[];
  };
}

/**
 * Transform Cornell Notes format to StudentDesk format
 */
export function transformCornellToStudentDesk(cornellData: CornellNotesFormat): LectureData {
  // Handle empty or invalid data
  if (!cornellData || typeof cornellData !== 'object') {
    return getDefaultLectureData();
  }

  const { metadata = {}, tableOfContents = {}, questions = [], explanations = [], summary = {} } = cornellData;

  // Transform metadata
  const transformedMetadata = {
    title: metadata.title || 'Untitled Lecture',
    difficulty: mapDifficulty(metadata.difficulty),
    estimatedTime: metadata.estimatedStudyTime || '45 minutes',
    subjectDomain: metadata.subject || metadata.topicArea || 'General',
    examImportance: 'medium' as const,
    hook: summary.overview ? summary.overview.substring(0, 100) + '...' : 'Interactive study session'
  };

  // Transform overview (removed coreConceptsList - redundant with Explanations tab)
  const transformedOverview = {
    mainTopic: summary.overview || tableOfContents.items?.[0]?.title || 'Study Session',
    keyObjectives: summary.learningObjectives ||
                   tableOfContents.items?.slice(0, 5).map(item => item.title || '').filter(Boolean) ||
                   ['Understand key concepts', 'Apply learned principles', 'Practice problem solving'],
    coreConceptsList: [] // Removed to avoid duplication with Explanations tab
  };

  // Transform questions - preserve interactive question format
  const transformedQuestions = (questions || []).map((q, index) => {
    const baseQuestion = {
      id: q.id || `q${index + 1}`,
      type: q.type || 'multiple-choice',
      difficulty: mapQuestionDifficulty(q.difficulty),
      points: q.points || calculatePoints(q.difficulty),
      estimatedTime: estimateQuestionTime(q.difficulty),
      hint: q.hint,
      feedback: q.feedback || q.answer || 'Answer explanation will be provided',
      tags: q.tags
    };

    // Handle different question formats
    if (q.type === 'multiple-choice') {
      return {
        ...baseQuestion,
        question: q.question || 'Question not available',
        choices: q.choices || [],
        correctAnswer: q.correctAnswer ?? 0,
        format: 'multiple-choice' as const
      };
    } else if (q.type === 'true-false') {
      return {
        ...baseQuestion,
        statement: q.statement || q.question || 'Statement not available',
        correctAnswer: q.correctAnswer ?? true,
        format: 'true-false' as const
      };
    } else if (q.type === 'fill-number') {
      return {
        ...baseQuestion,
        question: q.question,
        template: q.template || 'The answer is ___',
        answer: q.answer ?? 0,
        acceptableRange: q.acceptableRange,
        unit: q.unit,
        format: 'fill-number' as const
      };
    } else {
      // Fallback for old format or unknown types
      return {
        ...baseQuestion,
        statement: q.question || q.statement || 'Question not available',
        feedback: q.answer || q.feedback || 'Answer not available',
        format: 'multiple-choice' as const
      };
    }
  });

  // Transform explanations
  const transformedExplanations = (explanations || []).map((exp, index) => ({
    id: exp.id || `exp${index + 1}`,

    // NEW SCHEMA (from Grok generateStudentDeskContent) - Priority
    concept: exp.concept || exp.title || 'Key Concept',
    section: exp.section,  // Preserve section grouping
    timestamps: exp.timestamps,  // Preserve audio timestamps
    introduction: exp.introduction,
    sections: exp.sections,

    // OLD SCHEMA - Fallback for legacy data
    explanation: exp.explanation || exp.content || 'Detailed explanation coming soon',
    keyPoints: exp.keyPoints || [],

    importance: exp.importance || determineImportance(index, explanations.length),
    example: exp.example || exp.examples?.[0],

    multiModalExplanation: {
      text: exp.introduction || exp.content || exp.explanation || '',
      visual: 'Diagram representation',
      analogy: exp.sections?.[1]?.content || exp.examples?.[1] || 'Real-world comparison',
      example: exp.example || exp.examples?.[0] || 'Practical example',
      interactiveElement: 'Interactive demonstration'
    },
    depthLevels: {
      eli5: simplifyExplanation(exp.introduction || exp.content || exp.explanation),
      standard: exp.introduction || exp.content || exp.explanation || '',
      advanced: `Advanced: ${exp.introduction || exp.content || exp.explanation || 'Deep dive into the concept'}`
    },
    commonConfusions: [],
    expertPerspective: 'Expert insight on this concept'
  }));

  // Transform summary - prioritize NEW format, fallback to OLD format conversion
  const hasNewFormat = summary.sections && summary.sections.length > 0;

  const transformedSummary = hasNewFormat ? {
    // NEW SCHEMA (from Grok) - Pass through as-is
    sections: summary.sections,
    mustKnow: summary.mustKnow,
    commonPitfalls: summary.commonPitfalls,
    studyPlan: {
      priorities: summary.nextSteps || ['Review notes', 'Practice problems', 'Test understanding'],
      timeAllocation: {
        theory: 40,
        practice: 60
      }
    },
    resources: {
      essential: ['Lecture notes', 'Generated study guide'],
      recommended: ['Additional practice problems', 'Reference materials'],
      practice: ['Self-assessment quizzes', 'Application exercises']
    }
  } : {
    // OLD SCHEMA - Convert from legacy format
    essentialPoints: summary.keyTakeaways ||
                     questions.slice(0, 5).map(q => q.question || '').filter(Boolean) ||
                     ['Review key concepts', 'Practice problems', 'Apply knowledge'],
    examFocus: {
      mustKnow: summary.keyTakeaways?.slice(0, 3) ||
                explanations.slice(0, 3).map(e => e.title || '').filter(Boolean) ||
                ['Core principles', 'Key formulas', 'Important definitions'],
      likelyQuestions: questions.slice(0, 3).map(q => q.question || '').filter(Boolean) ||
                       ['Conceptual understanding questions', 'Application problems', 'Analysis scenarios']
    },
    studyPlan: {
      priorities: summary.nextSteps || ['Review notes', 'Practice problems', 'Test understanding'],
      timeAllocation: {
        theory: 40,
        practice: 60
      }
    },
    resources: {
      essential: ['Lecture notes', 'Generated study guide'],
      recommended: ['Additional practice problems', 'Reference materials'],
      practice: ['Self-assessment quizzes', 'Application exercises']
    }
  };

  // Calculate engagement metrics
  const totalQuestions = transformedQuestions.length;
  const totalPoints = transformedQuestions.reduce((sum, q) => sum + q.points, 0);

  // Build complete lecture data
  const lectureData: LectureData = {
    metadata: transformedMetadata,
    overview: transformedOverview,
    questions: transformedQuestions,
    explanations: transformedExplanations,
    summary: transformedSummary,
    adaptiveFeatures: {
      masteryTracking: {
        currentLevel: 0,
        progressIndicators: ['Questions completed', 'Time spent', 'Accuracy rate']
      },
      personalizedTips: [
        'Focus on understanding core concepts first',
        'Practice with varied problem types',
        'Review explanations for missed questions'
      ]
    },
    assessmentAlignment: {
      examFormat: 'Mixed format assessment',
      keyTopics: transformedOverview.coreConceptsList.slice(0, 5),
      practiceQuestions: totalQuestions
    },
    engagement: {
      quizMetrics: {
        totalQuestions,
        totalPoints,
        passingScore: Math.floor(totalPoints * 0.7)
      },
      achievements: []
    }
  };

  return lectureData;
}

// Helper functions

function mapDifficulty(difficulty?: string): 'beginner' | 'intermediate' | 'advanced' {
  switch (difficulty?.toLowerCase()) {
    case 'beginner':
    case 'basic':
    case 'easy':
      return 'beginner';
    case 'advanced':
    case 'hard':
    case 'difficult':
      return 'advanced';
    default:
      return 'intermediate';
  }
}

function mapQuestionDifficulty(difficulty?: string): 'easy' | 'medium' | 'hard' {
  switch (difficulty?.toLowerCase()) {
    case 'basic':
    case 'easy':
    case 'beginner':
      return 'easy';
    case 'advanced':
    case 'hard':
    case 'difficult':
      return 'hard';
    default:
      return 'medium';
  }
}

function calculatePoints(difficulty?: string): number {
  switch (difficulty?.toLowerCase()) {
    case 'basic':
    case 'easy':
      return 5;
    case 'advanced':
    case 'hard':
      return 15;
    default:
      return 10;
  }
}

function estimateQuestionTime(difficulty?: string): string {
  switch (difficulty?.toLowerCase()) {
    case 'basic':
    case 'easy':
      return '1 minute';
    case 'advanced':
    case 'hard':
      return '5 minutes';
    default:
      return '3 minutes';
  }
}

function determineImportance(index: number, total: number): 'high' | 'medium' | 'low' {
  const position = index / total;
  if (position < 0.3) return 'high';
  if (position < 0.7) return 'medium';
  return 'low';
}

function simplifyExplanation(content?: string): string {
  if (!content) return 'Simple explanation';
  // Take first sentence or first 100 characters
  const firstSentence = content.split('.')[0];
  return firstSentence.length > 100 ? firstSentence.substring(0, 100) + '...' : firstSentence;
}

function getDefaultLectureData(): LectureData {
  return {
    metadata: {
      title: 'Study Session',
      difficulty: 'intermediate',
      estimatedTime: '45 minutes',
      subjectDomain: 'General',
      examImportance: 'medium',
      hook: 'Interactive learning experience'
    },
    overview: {
      mainTopic: 'Educational Content',
      keyObjectives: ['Learn key concepts', 'Practice application', 'Test understanding'],
      coreConceptsList: [] // Removed to avoid duplication
    },
    questions: [],
    explanations: [],
    summary: {
      essentialPoints: ['Review materials', 'Practice problems', 'Apply knowledge'],
      examFocus: {
        mustKnow: ['Core concepts', 'Key principles', 'Important formulas'],
        likelyQuestions: ['Conceptual questions', 'Application problems', 'Analysis tasks']
      },
      studyPlan: {
        priorities: ['Review', 'Practice', 'Test'],
        timeAllocation: { theory: 40, practice: 60 }
      },
      resources: {
        essential: ['Study notes'],
        recommended: ['Practice materials'],
        practice: ['Exercises']
      }
    },
    adaptiveFeatures: {
      masteryTracking: {
        currentLevel: 0,
        progressIndicators: ['Progress tracking enabled']
      },
      personalizedTips: ['Start with the basics', 'Practice regularly']
    },
    assessmentAlignment: {
      examFormat: 'Standard assessment',
      keyTopics: [],
      practiceQuestions: 0
    },
    engagement: {
      quizMetrics: {
        totalQuestions: 0,
        totalPoints: 0,
        passingScore: 0
      },
      achievements: []
    }
  };
}

/**
 * Load and transform data from JSON file path or study guide
 */
export async function loadAndTransformLectureData(
  jsonData: any,
  fallbackToMock: boolean = true
): Promise<LectureData> {
  try {
    if (!jsonData) {
      throw new Error('No JSON data provided');
    }

    // If it's already in StudentDesk format (has the expected structure)
    if (jsonData.metadata && jsonData.overview && jsonData.questions && jsonData.explanations) {
      // Check if it's already properly formatted
      if (jsonData.metadata.difficulty && jsonData.metadata.estimatedTime && jsonData.metadata.subjectDomain) {
        console.log('✅ Data already in StudentDesk format with interactive questions');
        // Check if questions have interactive format
        const hasInteractiveQuestions = jsonData.questions.some((q: any) =>
          q.type === 'multiple-choice' || q.type === 'true-false' || q.type === 'fill-number'
        );
        console.log('📊 Interactive questions detected:', hasInteractiveQuestions);
        return jsonData as LectureData;
      }
    }

    // Otherwise, transform from Cornell Notes format
    console.log('🔄 Transforming Cornell Notes to StudentDesk format');
    return transformCornellToStudentDesk(jsonData);

  } catch (error) {
    console.error('❌ Error transforming lecture data:', error);

    if (fallbackToMock) {
      console.log('⚠️ Falling back to default data');
      return getDefaultLectureData();
    }

    throw error;
  }
}