// Flexible data mapper that adapts to different JSON structures
// This system can handle variations in field names, nesting, and data organization

import { 
  LectureData, 
  LectureMetadata, 
  Overview, 
  Question, 
  Explanation, 
  Summary,
  StudyStats,
  StudyMaterial,
  OverviewTabProps,
  QuestionsTabProps,
  ExplanationsTabProps,
  SummaryTabProps,
  StudyTimeTabProps,
  MaterialsTabProps
} from '@/types/lecture-data';

/**
 * Utility functions for flexible field extraction
 */
function extractField(obj: any, ...possibleKeys: string[]): any {
  if (!obj || typeof obj !== 'object') return null;
  
  for (const key of possibleKeys) {
    if (obj[key] !== undefined) {
      return obj[key];
    }
  }
  return null;
}

function extractNestedField(obj: any, path: string, ...alternativePaths: string[]): any {
  const allPaths = [path, ...alternativePaths];
  
  for (const currentPath of allPaths) {
    const keys = currentPath.split('.');
    let current = obj;
    let found = true;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && current[key] !== undefined) {
        current = current[key];
      } else {
        found = false;
        break;
      }
    }
    
    if (found) return current;
  }
  
  return null;
}

/**
 * Smart metadata adaptation
 */
export function adaptMetadata(json: any): LectureMetadata {
  // Try different possible locations for metadata
  const metadata = extractField(json, 'metadata', 'lectureInfo', 'header', 'info') || json;
  
  return {
    title: extractField(metadata, 'title', 'name', 'lectureTitle', 'subject') || 'Untitled Lecture',
    hook: extractField(metadata, 'hook', 'description', 'intro', 'summary') || 'This lecture provides important educational content.',
    difficulty: extractField(metadata, 'difficulty', 'level', 'complexity') || 'intermedio',
    estimatedTime: extractField(metadata, 'estimatedTime', 'duration', 'timeEstimate', 'expectedTime') || '45 minutos',
    surprisingFact: extractField(metadata, 'surprisingFact', 'funFact', 'interestingPoint', 'highlight') || 'This content contains fascinating insights.',
    whyThisMatters: {
      immediate: extractNestedField(metadata, 'whyThisMatters.immediate', 'importance.immediate', 'relevance.now') || 'Helps with immediate understanding.',
      future: extractNestedField(metadata, 'whyThisMatters.future', 'importance.future', 'relevance.later') || 'Builds foundation for future learning.',
      intellectual: extractNestedField(metadata, 'whyThisMatters.intellectual', 'importance.intellectual', 'relevance.academic') || 'Expands intellectual understanding.'
    },
    examRelevance: extractField(metadata, 'examRelevance', 'examImportance', 'testRelevance') || 'importante para exámenes',
    subjectDomain: extractField(metadata, 'subjectDomain', 'subject', 'domain', 'field') || 'Educación General',
    learningStyle: extractField(metadata, 'learningStyle', 'approach', 'methodology') || 'conceptual-práctico'
  };
}

/**
 * Smart overview adaptation with support for different JSON structures
 */
export function adaptOverview(json: any): Overview {
  const overview = extractField(json, 'overview', 'introduction', 'content', 'main') || {};
  
  // Handle direct overview fields or nested structure
  const mainTopic = extractField(overview, 'mainTopic', 'theBigPicture', 'bigPicture', 'mainIdea', 'summary');
  const keyObjectives = extractField(overview, 'keyObjectives', 'objectives', 'goals', 'learningObjectives');
  const coreConceptsList = extractField(overview, 'coreConceptsList', 'coreConcepts', 'keyPoints', 'concepts');
  
  return {
    theBigPicture: mainTopic || 'This lecture covers important educational concepts.',
    whyCareMatrix: {
      practical: extractNestedField(overview, 'whyCareMatrix.practical', 'relevance.practical', 'applications.practical') || 'Practical applications in real world.',
      academic: extractNestedField(overview, 'whyCareMatrix.academic', 'relevance.academic', 'applications.academic') || 'Academic importance and connections.',
      personal: extractNestedField(overview, 'whyCareMatrix.personal', 'relevance.personal', 'applications.personal') || 'Personal growth and understanding.',
      societal: extractNestedField(overview, 'whyCareMatrix.societal', 'relevance.societal', 'applications.societal') || 'Broader societal implications.'
    },
    learningPath: {
      startHere: extractNestedField(overview, 'learningPath.startHere', 'steps.first', 'begin') || (keyObjectives?.[0] || 'Start with basic concepts.'),
      buildTo: extractNestedField(overview, 'learningPath.buildTo', 'steps.middle', 'develop') || (keyObjectives?.[1] || 'Build understanding progressively.'),
      masterThis: extractNestedField(overview, 'learningPath.masterThis', 'steps.final', 'master') || (keyObjectives?.[2] || 'Master the complete concept.')
    },
    conceptInventory: {
      prerequisites: extractNestedField(overview, 'conceptInventory.prerequisites', 'prerequisites', 'requirements') || 'Basic knowledge required.',
      coreIdeas: extractNestedField(overview, 'conceptInventory.coreIdeas', 'coreIdeas', 'mainConcepts', 'keyIdeas') || coreConceptsList || keyObjectives || ['Core educational concepts'],
      supportingConcepts: extractNestedField(overview, 'conceptInventory.supportingConcepts', 'supportingConcepts', 'additionalConcepts') || ['Supporting ideas'],
      extensions: extractNestedField(overview, 'conceptInventory.extensions', 'extensions', 'advanced', 'furtherStudy') || ['Advanced topics']
    },
    studyStrategy: extractField(overview, 'studyStrategy', 'strategy', 'approach', 'method') || 'Study systematically with active engagement.'
  };
}

/**
 * Smart questions adaptation with support for multiple validation formats
 */
export function adaptQuestions(json: any): Question[] {
  // Try different possible locations for questions
  const questions = extractField(json, 'questions', 'questionBank', 'queries', 'assessments', 'exercises') || [];
  
  if (!Array.isArray(questions)) {
    console.warn('Questions data is not an array, returning empty array');
    return [];
  }
  
  return questions.map((q: any, index: number) => {
    // Handle different answer formats for validation
    const format = extractField(q, 'format', 'type', 'answerType') || 'short-answer';
    const correctAnswer = extractField(q, 'correctAnswer', 'answer', 'solution', 'response');
    
    // Build enhanced question object with validation data
    const questionData: Question = {
      id: extractField(q, 'id', 'questionId', 'key') || `q${index + 1}`,
      type: extractField(q, 'type', 'questionType', 'category') || 'quiz',
      engagementStyle: extractField(q, 'engagementStyle', 'style', 'approach') || 'direct',
      cognitiveLevel: extractField(q, 'cognitiveLevel', 'level', 'difficulty') || 'understand',
      setup: extractField(q, 'setup', 'context', 'background', 'scenario') || '',
      question: extractField(q, 'question', 'text', 'prompt', 'query', 'statement') || 'Question not available',
      format: format,
      choices: extractField(q, 'choices', 'options', 'alternatives') || undefined,
      correctAnswer: correctAnswer,
      
      // Enhanced validation support
      ...(format === 'fill-number' && {
        answer: extractField(q, 'answer', 'correctValue'),
        acceptableRange: extractField(q, 'acceptableRange', 'range'),
        unit: extractField(q, 'unit'),
        template: extractField(q, 'template')
      }),
      
      // Enhanced feedback with direct field access
      topic: extractField(q, 'topic', 'subject', 'category') || 'General',
      hint: extractField(q, 'hint', 'clue', 'help') || 'Think about the key concepts.',
      difficulty: extractField(q, 'difficulty', 'level', 'cognitiveLevel') || 'medium',
      points: extractField(q, 'points', 'score', 'value') || 10,
      
      scaffolding: {
        beforeHint: extractNestedField(q, 'scaffolding.beforeHint', 'hints.before', 'help.before') || extractField(q, 'hint') || 'Think about the key concepts.',
        duringHint: extractNestedField(q, 'scaffolding.duringHint', 'hints.during', 'help.during') || 'Consider the relationships between ideas.',
        commonMistake: extractNestedField(q, 'scaffolding.commonMistake', 'mistakes.common', 'errors.typical') || 'Avoid oversimplifying the concept.'
      },
      
      // Use direct feedback field or create structured feedback
      feedback: {
        correct: extractNestedField(q, 'feedback.correct', 'responses.correct') || 'Excellent! You understand the concept.',
        partialCredit: extractNestedField(q, 'feedback.partialCredit', 'responses.partial') || 'Good approach, but consider additional aspects.',
        incorrect: extractNestedField(q, 'feedback.incorrect', 'responses.incorrect') || 'Not quite right. Review the key concepts.',
        explanation: extractField(q, 'feedback', 'explanation', 'reasoning') || 'This concept requires careful consideration of multiple factors.'
      },
      
      connections: {
        prerequisiteKnowledge: extractNestedField(q, 'connections.prerequisiteKnowledge', 'prerequisites', 'requires') || 'Basic understanding needed.',
        relatedConcepts: extractNestedField(q, 'connections.relatedConcepts', 'related', 'connects') || 'Related to other key concepts.',
        realWorldApplication: extractNestedField(q, 'connections.realWorldApplication', 'applications', 'realWorld') || 'Applies in practical situations.',
        examRelevance: extractNestedField(q, 'connections.examRelevance', 'examImportance', 'testRelevance') || 'Important for assessments.'
      },
      
      metadata: {
        difficulty: extractField(q, 'difficulty', 'level') || 'medium',
        timeEstimate: extractNestedField(q, 'metadata.timeEstimate', 'time', 'duration') || '5',
        frequency: extractNestedField(q, 'metadata.frequency', 'importance', 'weight') || 'common',
        skills: extractNestedField(q, 'metadata.skills', 'skills', 'abilities') || 'comprehension, analysis'
      }
    };
    
    return questionData;
  });
}

/**
 * Smart explanations adaptation
 */
export function adaptExplanations(json: any): Explanation[] {
  const explanations = extractField(json, 'explanations', 'details', 'concepts', 'elaborations') || [];
  
  if (!Array.isArray(explanations)) {
    console.warn('Explanations data is not an array, returning empty array');
    return [];
  }
  
  return explanations.map((exp: any, index: number) => ({
    id: extractField(exp, 'id', 'conceptId', 'key') || `exp${index + 1}`,
    concept: extractField(exp, 'concept', 'title', 'name', 'topic') || 'Educational Concept',
    importance: extractField(exp, 'importance', 'why', 'significance') || 'This concept is important for understanding.',
    multiModalExplanation: {
      verbal: extractNestedField(exp, 'multiModalExplanation.verbal', 'explanations.verbal', 'verbal') || 'Verbal explanation of the concept.',
      visual: extractNestedField(exp, 'multiModalExplanation.visual', 'explanations.visual', 'visual') || 'Visual representation helps understanding.',
      mathematical: extractNestedField(exp, 'multiModalExplanation.mathematical', 'explanations.mathematical', 'mathematical') || 'Mathematical relationships involved.',
      analogical: extractNestedField(exp, 'multiModalExplanation.analogical', 'explanations.analogical', 'analogy') || 'Think of it like...',
      procedural: extractNestedField(exp, 'multiModalExplanation.procedural', 'explanations.procedural', 'steps') || 'Step-by-step approach.',
      example: extractNestedField(exp, 'multiModalExplanation.example', 'examples', 'example') || 'For example...'
    },
    depthLevels: {
      surface: extractNestedField(exp, 'depthLevels.surface', 'levels.basic', 'surface') || 'Basic understanding level.',
      working: extractNestedField(exp, 'depthLevels.working', 'levels.working', 'working') || 'Working knowledge level.',
      deep: extractNestedField(exp, 'depthLevels.deep', 'levels.advanced', 'deep') || 'Deep understanding level.'
    },
    commonConfusions: extractField(exp, 'commonConfusions', 'confusions', 'misconceptions') || [],
    expertPerspective: extractField(exp, 'expertPerspective', 'expert', 'professional') || 'Expert insight on this concept.',
    studyTips: extractField(exp, 'studyTips', 'tips', 'advice') || undefined
  }));
}

/**
 * Smart summary adaptation
 */
export function adaptSummary(json: any): Summary {
  const summary = extractField(json, 'summary', 'conclusion', 'wrap-up', 'synthesis') || {};
  
  return {
    synthesis: {
      coreMessage: extractNestedField(summary, 'synthesis.coreMessage', 'message', 'mainPoint') || 'This lecture provides important educational insights.',
      keyTakeaways: extractNestedField(summary, 'synthesis.keyTakeaways', 'takeaways', 'keyPoints') || ['Important educational concepts covered'],
      conceptualFramework: extractNestedField(summary, 'synthesis.conceptualFramework', 'framework', 'structure') || 'Conceptual organization of ideas.',
      bigPictureConnection: extractNestedField(summary, 'synthesis.bigPictureConnection', 'connections', 'integration') || 'Connects to broader educational goals.'
    },
    retention: {
      memoryStrategy: extractNestedField(summary, 'retention.memoryStrategy', 'memory', 'remember') || 'Use active recall and spaced practice.',
      essentialFormulas: extractNestedField(summary, 'retention.essentialFormulas', 'formulas', 'equations') || 'No specific formulas for this content.',
      mustKnowFacts: extractNestedField(summary, 'retention.mustKnowFacts', 'facts', 'essentials') || ['Key facts to remember'],
      understandingCheckpoints: extractNestedField(summary, 'retention.understandingCheckpoints', 'checkpoints', 'selfCheck') || ['Check your understanding']
    },
    application: {
      immediateUse: extractNestedField(summary, 'application.immediateUse', 'immediate', 'now') || 'Apply immediately in current studies.',
      upcomingRelevance: extractNestedField(summary, 'application.upcomingRelevance', 'upcoming', 'future') || 'Relevant for future coursework.',
      examPreparation: extractNestedField(summary, 'application.examPreparation', 'exam', 'test') || 'Important for exam preparation.',
      realWorldTransfer: extractNestedField(summary, 'application.realWorldTransfer', 'realWorld', 'practical') || 'Applies in real-world contexts.'
    },
    studyPlan: {
      now: extractNestedField(summary, 'studyPlan.now', 'immediate', 'today') || 'Review key concepts now.',
      tonight: extractNestedField(summary, 'studyPlan.tonight', 'tonight', 'evening') || 'Practice questions tonight.',
      thisWeek: extractNestedField(summary, 'studyPlan.thisWeek', 'week', 'weekly') || 'Reinforce understanding this week.',
      beforeExam: extractNestedField(summary, 'studyPlan.beforeExam', 'exam', 'test') || 'Final review before exam.',
      longTerm: extractNestedField(summary, 'studyPlan.longTerm', 'longTerm', 'future') || 'Integrate with long-term learning goals.'
    },
    resources: {
      essential: extractNestedField(summary, 'resources.essential', 'essential', 'required') || 'Core materials needed.',
      practice: extractNestedField(summary, 'resources.practice', 'practice', 'exercises') || 'Practice materials available.',
      deeper: extractNestedField(summary, 'resources.deeper', 'advanced', 'additional') || 'Additional resources for deeper study.',
      alternative: extractNestedField(summary, 'resources.alternative', 'alternative', 'other') || 'Alternative learning resources.'
    }
  };
}

/**
 * Main adaptation function that handles any JSON structure
 */
export function adaptAnyJsonStructure(json: any): LectureData {
  console.log('🔄 Adapting JSON structure:', Object.keys(json));
  
  try {
    const adapted: LectureData = {
      metadata: adaptMetadata(json),
      overview: adaptOverview(json),
      questions: adaptQuestions(json),
      explanations: adaptExplanations(json),
      summary: adaptSummary(json),
      adaptiveFeatures: extractField(json, 'adaptiveFeatures') || {
        difficultyAdjustment: { indicators: '', adaptations: '', scaffoldingOptions: '' },
        learningStyleOptions: { visual: '', auditory: '', kinesthetic: '', reading: '' },
        engagementTracking: { progressIndicators: '', strugglePoints: '', masteryMarkers: '' },
        personalization: { interestHooks: '', careerConnections: '', culturalRelevance: '' }
      },
      assessmentAlignment: extractField(json, 'assessmentAlignment') || {
        typicalExamFormats: 'Standard assessment formats',
        questionPatterns: 'Common question patterns',
        gradingRubrics: 'Standard grading criteria',
        preparationPriority: 'Focus on key concepts'
      }
    };
    
    console.log('✅ Successfully adapted JSON structure:', {
      title: adapted.metadata.title,
      questionsCount: adapted.questions.length,
      explanationsCount: adapted.explanations.length
    });
    
    return adapted;
    
  } catch (error) {
    console.error('❌ Error adapting JSON structure:', error);
    throw new Error(`Failed to adapt JSON structure: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Enhanced mapping to component props with flexible structure support
 */
export function mapFlexibleJsonToTabs(
  json: any,
  options?: {
    actualStats?: StudyStats;
    actualMaterials?: StudyMaterial[];
  }
) {
  const adaptedData = adaptAnyJsonStructure(json);
  
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
      stats: options?.actualStats || {
        estimatedMinutes: parseInt(adaptedData.metadata.estimatedTime.match(/\d+/)?.[0] || '45'),
        completedSessions: 0
      },
      studyPlan: adaptedData.summary.studyPlan
    } as StudyTimeTabProps,
    
    materials: {
      materials: options?.actualMaterials || [],
      resources: adaptedData.summary.resources
    } as MaterialsTabProps,
    
    // Additional metadata for the main component
    title: adaptedData.metadata.title,
    difficulty: adaptedData.metadata.difficulty,
    estimatedTime: adaptedData.metadata.estimatedTime,
    hook: adaptedData.metadata.hook
  };
}