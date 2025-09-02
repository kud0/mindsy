// Direct mapper for sample-lecture-3.json - NO EXTRA FIELDS
// Just use what's actually in your JSON, nothing else

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

export function mapDirectJson(json: any): LectureData {
  console.log('🔄 Direct mapping of your JSON structure');
  
  return {
    metadata: {
      title: json.metadata?.title || 'Untitled',
      hook: json.metadata?.title || 'Lecture content',
      difficulty: json.metadata?.difficulty || 'medium',
      estimatedTime: json.metadata?.estimatedTime || '30 minutes',
      surprisingFact: '',
      whyThisMatters: { immediate: '', future: '', intellectual: '' },
      examRelevance: json.metadata?.examImportance || 'medium',
      subjectDomain: json.metadata?.subjectDomain || '',
      learningStyle: 'conceptual'
    },
    
    overview: {
      theBigPicture: json.overview?.mainTopic || '',
      whyCareMatrix: { practical: '', academic: '', personal: '', societal: '' },
      learningPath: {
        startHere: json.overview?.keyObjectives?.[0] || '',
        buildTo: json.overview?.keyObjectives?.[1] || '',
        masterThis: json.overview?.keyObjectives?.[2] || ''
      },
      conceptInventory: {
        prerequisites: '',
        coreIdeas: json.overview?.coreConceptsList || [],
        supportingConcepts: [],
        extensions: []
      },
      studyStrategy: ''
    },
    
    questions: json.questions?.map((q: any) => ({
      id: q.id,
      type: q.type,
      engagementStyle: 'direct',
      cognitiveLevel: q.difficulty,
      setup: '',
      question: q.question,
      format: q.format,
      choices: q.choices,
      correctAnswer: q.correctAnswer,
      answer: q.answer,
      acceptableRange: q.acceptableRange,
      unit: q.unit,
      template: q.template,
      topic: q.topic,
      hint: q.hint,
      feedback: q.feedback,
      difficulty: q.difficulty,
      points: q.points,
      scaffolding: { beforeHint: '', duringHint: '', commonMistake: '' },
      connections: { prerequisiteKnowledge: '', relatedConcepts: '', realWorldApplication: '', examRelevance: '' },
      metadata: { difficulty: q.difficulty, timeEstimate: '5', frequency: 'common', skills: 'analysis' }
    })) || [],
    
    explanations: json.explanations?.map((exp: any) => ({
      id: exp.id,
      concept: exp.concept,
      importance: exp.importance,
      multiModalExplanation: {
        verbal: exp.explanation,
        visual: '',
        mathematical: '',
        analogical: '',
        procedural: '',
        example: exp.example || ''
      },
      depthLevels: { surface: '', working: '', deep: '' },
      commonConfusions: [],
      expertPerspective: exp.explanation,
      studyTips: exp.keyPoints
    })) || [],
    
    summary: {
      synthesis: {
        coreMessage: json.summary?.essentialPoints?.[0] || '',
        keyTakeaways: json.summary?.essentialPoints || [],
        conceptualFramework: '',
        bigPictureConnection: ''
      },
      retention: {
        memoryStrategy: '',
        essentialFormulas: '',
        mustKnowFacts: json.summary?.examFocus?.mustKnow || [],
        understandingCheckpoints: json.summary?.examFocus?.likelyQuestions || []
      },
      application: { immediateUse: '', upcomingRelevance: '', examPreparation: '', realWorldTransfer: '' },
      studyPlan: { now: '', tonight: '', thisWeek: '', beforeExam: '', longTerm: '' },
      resources: { essential: '', practice: '', deeper: '', alternative: '' }
    },
    
    adaptiveFeatures: {
      difficultyAdjustment: { indicators: '', adaptations: '', scaffoldingOptions: '' },
      learningStyleOptions: { visual: '', auditory: '', kinesthetic: '', reading: '' },
      engagementTracking: { progressIndicators: '', strugglePoints: '', masteryMarkers: '' },
      personalization: { interestHooks: '', careerConnections: '', culturalRelevance: '' }
    },
    
    assessmentAlignment: {
      typicalExamFormats: '',
      questionPatterns: '',
      gradingRubrics: '',
      preparationPriority: ''
    }
  };
}

export function mapDirectToTabs(json: any) {
  const data = mapDirectJson(json);
  
  return {
    overview: {
      overview: data.overview,
      metadata: data.metadata
    },
    questions: {
      questions: data.questions
    },
    explanations: {
      explanations: data.explanations
    },
    summary: {
      summary: data.summary
    },
    studyTime: {
      stats: { estimatedMinutes: 30, completedSessions: 0 },
      studyPlan: data.summary.studyPlan
    },
    materials: {
      materials: [],
      resources: data.summary.resources
    },
    title: data.metadata.title,
    difficulty: data.metadata.difficulty,
    estimatedTime: data.metadata.estimatedTime,
    hook: data.metadata.hook
  };
}