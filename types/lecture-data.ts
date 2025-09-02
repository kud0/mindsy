// TypeScript interfaces generated from sample-lecture.json structure
// This defines the exact data contract for the StudentDesk component

export interface LectureMetadata {
  title: string;
  hook: string;
  difficulty: 'fácil' | 'intermedio' | 'avanzado';
  estimatedTime: string;
  surprisingFact: string;
  whyThisMatters: {
    immediate: string;
    future: string;
    intellectual: string;
  };
  examRelevance: string;
  subjectDomain: string;
  learningStyle: string;
}

export interface WhyCareMatrix {
  practical: string;
  academic: string;
  personal: string;
  societal: string;
}

export interface LearningPath {
  startHere: string;
  buildTo: string;
  masterThis: string;
  connectionsMap: string;
}

export interface ConceptInventory {
  prerequisites: string;
  coreIdeas: string[];
  supportingConcepts: string[];
  extensions: string[];
}

export interface Overview {
  theBigPicture: string;
  whyCareMatrix: WhyCareMatrix;
  learningPath: LearningPath;
  conceptInventory: ConceptInventory;
  studyStrategy: string;
}

export interface QuestionScaffolding {
  beforeHint: string;
  duringHint: string;
  commonMistake: string;
}

export interface QuestionFeedback {
  correct: string;
  partialCredit: string;
  incorrect: string;
  explanation: string;
}

export interface QuestionConnections {
  prerequisiteKnowledge: string;
  relatedConcepts: string;
  realWorldApplication: string;
  examRelevance: string;
}

export interface QuestionMetadata {
  difficulty: 'easy' | 'medium' | 'hard';
  timeEstimate: string;
  frequency: string;
  skills: string;
}

export interface Question {
  id: string;
  type: 'conceptual' | 'recall' | 'analysis' | 'application' | 'clinical' | 'procedural' | 'synthesis';
  engagementStyle: string;
  cognitiveLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  setup: string;
  question: string;
  format: 'short-answer' | 'essay' | 'multiple-choice';
  choices?: string[];
  correctAnswer: string;
  scaffolding: QuestionScaffolding;
  feedback: QuestionFeedback;
  connections: QuestionConnections;
  metadata: QuestionMetadata;
}

export interface MultiModalExplanation {
  verbal: string;
  visual: string;
  mathematical: string;
  analogical: string;
  procedural: string;
  example: string;
}

export interface DepthLevels {
  surface: string;
  working: string;
  deep: string;
}

export interface CommonConfusion {
  confusion: string;
  clarification: string;
}

export interface Explanation {
  id: string;
  concept: string;
  importance: string;
  multiModalExplanation: MultiModalExplanation;
  depthLevels: DepthLevels;
  commonConfusions: CommonConfusion[];
  expertPerspective: string;
  studyTips?: string;
}

export interface SynthesisData {
  coreMessage: string;
  keyTakeaways: string[];
  conceptualFramework: string;
  bigPictureConnection: string;
}

export interface RetentionData {
  memoryStrategy: string;
  essentialFormulas: string;
  mustKnowFacts: string[];
  understandingCheckpoints: string[];
}

export interface ApplicationData {
  immediateUse: string;
  upcomingRelevance: string;
  examPreparation: string;
  realWorldTransfer: string;
}

export interface StudyPlanData {
  now: string;
  tonight: string;
  thisWeek: string;
  beforeExam: string;
  longTerm: string;
}

export interface ResourcesData {
  essential: string;
  practice: string;
  deeper: string;
  alternative: string;
}

export interface Summary {
  synthesis: SynthesisData;
  retention: RetentionData;
  application: ApplicationData;
  studyPlan: StudyPlanData;
  resources: ResourcesData;
}

export interface DifficultyAdjustment {
  indicators: string;
  adaptations: string;
  scaffoldingOptions: string;
}

export interface LearningStyleOptions {
  visual: string;
  auditory: string;
  kinesthetic: string;
  reading: string;
}

export interface EngagementTracking {
  progressIndicators: string;
  strugglePoints: string;
  masteryMarkers: string;
}

export interface Personalization {
  interestHooks: string;
  careerConnections: string;
  culturalRelevance: string;
}

export interface AdaptiveFeatures {
  difficultyAdjustment: DifficultyAdjustment;
  learningStyleOptions: LearningStyleOptions;
  engagementTracking: EngagementTracking;
  personalization: Personalization;
}

export interface AssessmentAlignment {
  typicalExamFormats: string;
  questionPatterns: string;
  gradingRubrics: string;
  preparationPriority: string;
}

// Main lecture data structure
export interface LectureData {
  metadata: LectureMetadata;
  overview: Overview;
  questions: Question[];
  explanations: Explanation[];
  summary: Summary;
  adaptiveFeatures: AdaptiveFeatures;
  assessmentAlignment: AssessmentAlignment;
}

// Derived interfaces for component props
export interface StudyStats {
  estimatedMinutes: number;
  completedSessions: number;
  lastAccessed?: string;
}

export interface StudyMaterial {
  id: string;
  name: string;
  type: string;
  url: string;
  size: string;
}

// Component-specific interfaces
export interface OverviewTabProps {
  overview: Overview;
  metadata: LectureMetadata;
}

export interface QuestionsTabProps {
  questions: Question[];
}

export interface ExplanationsTabProps {
  explanations: Explanation[];
}

export interface SummaryTabProps {
  summary: Summary;
}

export interface StudyTimeTabProps {
  stats: StudyStats;
  studyPlan: StudyPlanData;
}

export interface MaterialsTabProps {
  materials: StudyMaterial[];
  resources: ResourcesData;
}