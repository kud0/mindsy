// Simple data mapper specifically for sample-lecture-3.json structure
// This mapper directly maps your JSON fields without complex transformations

import { 
  LectureData, 
  LectureMetadata, 
  Overview, 
  Question, 
  Explanation, 
  Summary,
  OverviewTabProps,
  QuestionsTabProps,
  ExplanationsTabProps,
  SummaryTabProps,
  StudyTimeTabProps,
  MaterialsTabProps
} from '@/types/lecture-data';

/**
 * Simple metadata mapping for your JSON structure
 */
function mapSimpleMetadata(json: any): LectureMetadata {
  const metadata = json.metadata || {};
  
  return {
    title: metadata.title || 'Untitled Lecture',
    hook: `Learn about ${metadata.subjectDomain || 'this topic'} in ${metadata.estimatedTime || '30 minutes'}`,
    difficulty: metadata.difficulty || 'intermediate',
    estimatedTime: metadata.estimatedTime || '30 minutes',
    surprisingFact: 'This lecture contains valuable insights from expert instruction.',
    whyThisMatters: {
      immediate: `Understanding ${metadata.subjectDomain || 'this content'} helps with current studies.`,
      future: 'Builds foundation for advanced topics in the field.',
      intellectual: 'Develops analytical thinking and subject expertise.'
    },
    examRelevance: metadata.examImportance || 'medium',
    subjectDomain: metadata.subjectDomain || 'General Education',
    learningStyle: 'conceptual-practical'
  };
}

/**
 * Simple overview mapping for your JSON structure
 */
function mapSimpleOverview(json: any): Overview {
  const overview = json.overview || {};
  
  return {
    theBigPicture: overview.mainTopic || 'This lecture covers important concepts in the field.',
    whyCareMatrix: {
      practical: 'Apply these concepts in real-world situations and problem-solving.',
      academic: 'Essential knowledge for exams and further coursework.',
      personal: 'Develop deeper understanding and analytical skills.',
      societal: 'Contribute to broader understanding in the field.'
    },
    learningPath: {
      startHere: overview.keyObjectives?.[0] || 'Begin with fundamental concepts.',
      buildTo: overview.keyObjectives?.[1] || 'Develop understanding progressively.',
      masterThis: overview.keyObjectives?.[2] || 'Master the complete topic.'
    },
    conceptInventory: {
      prerequisites: 'Basic knowledge in the subject area.',
      coreIdeas: overview.coreConceptsList || overview.keyObjectives || ['Core concepts from the lecture'],
      supportingConcepts: ['Supporting details and examples from instruction'],
      extensions: ['Advanced applications and connections']
    },
    studyStrategy: 'Study systematically using active recall and spaced practice.'
  };
}

/**
 * Simple questions mapping for your JSON structure
 */
function mapSimpleQuestions(json: any): Question[] {
  const questions = json.questions || [];
  
  return questions.map((q: any) => ({
    id: q.id,
    type: q.type || 'quiz',
    engagementStyle: 'direct',
    cognitiveLevel: q.difficulty || 'understand',
    setup: '',
    question: q.question,
    format: q.format,
    choices: q.choices,
    correctAnswer: q.correctAnswer,
    
    // Handle different question formats
    ...(q.format === 'fill-number' && {
      answer: q.answer,
      acceptableRange: q.acceptableRange,
      unit: q.unit,
      template: q.template
    }),
    
    // Simple fields from your JSON
    topic: q.topic,
    hint: q.hint,
    feedback: q.feedback, // Simple string, not object!
    difficulty: q.difficulty,
    points: q.points,
    
    // Create minimal required structure for component compatibility
    scaffolding: {
      beforeHint: q.hint || 'Think about the key concepts.',
      duringHint: 'Consider the relationships between ideas.',
      commonMistake: 'Avoid oversimplifying the concept.'
    },
    
    connections: {
      prerequisiteKnowledge: 'Basic understanding needed.',
      relatedConcepts: `Related to ${q.topic || 'core concepts'}.`,
      realWorldApplication: 'Applies in practical situations.',
      examRelevance: 'Important for assessments.'
    },
    
    metadata: {
      difficulty: q.difficulty || 'medium',
      timeEstimate: '5',
      frequency: 'common',
      skills: 'comprehension, analysis'
    }
  }));
}

/**
 * Simple explanations mapping for your JSON structure
 */
function mapSimpleExplanations(json: any): Explanation[] {
  const explanations = json.explanations || [];
  
  return explanations.map((exp: any) => ({
    id: exp.id,
    concept: exp.concept,
    importance: exp.importance || 'high',
    
    // Simple explanation structure - use your actual content
    multiModalExplanation: {
      verbal: exp.explanation || 'Explanation of the concept.',
      visual: exp.visual || 'Visual aids help understand this concept.',
      mathematical: exp.mathematical || 'No mathematical content.',
      analogical: exp.example || 'Think of it in practical terms.',
      procedural: exp.keyPoints?.[0] || 'Step-by-step approach.',
      example: exp.example || 'For example...'
    },
    
    depthLevels: {
      surface: exp.keyPoints?.[0] || 'Basic understanding level.',
      working: exp.keyPoints?.[1] || 'Working knowledge level.',
      deep: exp.explanation || 'Deep understanding level.'
    },
    
    commonConfusions: [],
    expertPerspective: exp.explanation || 'Expert insight on this concept.',
    studyTips: exp.keyPoints || undefined
  }));
}

/**
 * Simple summary mapping for your JSON structure
 */
function mapSimpleSummary(json: any): Summary {
  const summary = json.summary || {};
  
  return {
    synthesis: {
      coreMessage: summary.essentialPoints?.[0] || 'This lecture provides important educational insights.',
      keyTakeaways: summary.essentialPoints || ['Key concepts from the lecture'],
      conceptualFramework: 'Organized approach to understanding the topic.',
      bigPictureConnection: 'Connects to broader educational goals.'
    },
    retention: {
      memoryStrategy: 'Use active recall and spaced practice.',
      essentialFormulas: 'Key formulas and relationships to remember.',
      mustKnowFacts: summary.examFocus?.mustKnow || ['Essential facts from the lecture'],
      understandingCheckpoints: summary.examFocus?.likelyQuestions || ['Check your understanding regularly']
    },
    application: {
      immediateUse: 'Apply immediately in current studies.',
      upcomingRelevance: 'Relevant for future coursework.',
      examPreparation: 'Important for exam preparation.',
      realWorldTransfer: 'Applies in real-world contexts.'
    },
    studyPlan: {
      now: 'Review key concepts now.',
      tonight: 'Practice questions tonight.',
      thisWeek: 'Reinforce understanding this week.',
      beforeExam: 'Final review before exam.',
      longTerm: 'Integrate with long-term learning goals.'
    },
    resources: {
      essential: 'Core materials needed.',
      practice: 'Practice materials available.',
      deeper: 'Additional resources for deeper study.',
      alternative: 'Alternative learning resources.'
    }
  };
}

/**
 * Main function to adapt your simple JSON structure
 */
export function adaptSimpleLectureJson(json: any): LectureData {
  console.log('🔄 Adapting simple JSON structure:', Object.keys(json));
  
  try {
    const adapted: LectureData = {
      metadata: mapSimpleMetadata(json),
      overview: mapSimpleOverview(json),
      questions: mapSimpleQuestions(json),
      explanations: mapSimpleExplanations(json),
      summary: mapSimpleSummary(json),
      adaptiveFeatures: {
        difficultyAdjustment: { indicators: '', adaptations: '', scaffoldingOptions: '' },
        learningStyleOptions: { visual: '', auditory: '', kinesthetic: '', reading: '' },
        engagementTracking: { progressIndicators: '', strugglePoints: '', masteryMarkers: '' },
        personalization: { interestHooks: '', careerConnections: '', culturalRelevance: '' }
      },
      assessmentAlignment: {
        typicalExamFormats: 'Standard assessment formats',
        questionPatterns: 'Common question patterns',
        gradingRubrics: 'Standard grading criteria',
        preparationPriority: 'Focus on key concepts'
      }
    };
    
    console.log('✅ Successfully adapted simple JSON structure:', {
      title: adapted.metadata.title,
      questionsCount: adapted.questions.length,
      explanationsCount: adapted.explanations.length
    });
    
    return adapted;
    
  } catch (error) {
    console.error('❌ Error adapting simple JSON structure:', error);
    throw new Error(`Failed to adapt JSON structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Map to component props for your simple structure
 */
export function mapSimpleLectureToTabs(json: any) {
  const adaptedData = adaptSimpleLectureJson(json);
  
  return {
    overview: {
      overview: adaptedData.overview,
      metadata: adaptedData.metadata
    } as OverviewTabProps,
    
    questions: {
      questions: adaptedData.questions
    } as QuestionsTabProps,
    
    explanations: {
      explanations: adaptedData.explanations
    } as ExplanationsTabProps,
    
    summary: {
      summary: adaptedData.summary
    } as SummaryTabProps,
    
    studyTime: {
      stats: {
        estimatedMinutes: parseInt(adaptedData.metadata.estimatedTime.match(/\d+/)?.[0] || '30'),
        completedSessions: 0
      },
      studyPlan: adaptedData.summary.studyPlan
    } as StudyTimeTabProps,
    
    materials: {
      materials: [],
      resources: adaptedData.summary.resources
    } as MaterialsTabProps,
    
    // Additional metadata for the main component
    title: adaptedData.metadata.title,
    difficulty: adaptedData.metadata.difficulty,
    estimatedTime: adaptedData.metadata.estimatedTime,
    hook: adaptedData.metadata.hook
  };
}