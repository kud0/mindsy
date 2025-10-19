// Data mapper utility to convert JSON lecture data to component props
// This replaces the complex API parsing logic with clean, predictable mappings

import { 
  LectureData, 
  OverviewTabProps, 
  QuestionsTabProps, 
  ExplanationsTabProps, 
  SummaryTabProps, 
  StudyTimeTabProps, 
  MaterialsTabProps,
  StudyStats,
  StudyMaterial
} from '@/types/lecture-data';

/**
 * Converts estimated time string to minutes
 */
function parseEstimatedTime(timeString: string): number {
  const match = timeString.match(/(\d+)\s*minutos?/i);
  return match ? parseInt(match[1]) : 45; // default 45 minutes
}

/**
 * Maps lecture data to Overview tab props
 */
export function mapToOverviewProps(lectureData: LectureData): OverviewTabProps {
  return {
    overview: lectureData.overview,
    metadata: lectureData.metadata
  };
}

/**
 * Maps lecture data to Questions tab props
 */
export function mapToQuestionsProps(lectureData: LectureData): QuestionsTabProps {
  return {
    questions: lectureData.questions
  };
}

/**
 * Maps lecture data to Explanations tab props
 */
export function mapToExplanationsProps(lectureData: LectureData): ExplanationsTabProps {
  return {
    explanations: lectureData.explanations
  };
}

/**
 * Maps lecture data to Summary tab props
 */
export function mapToSummaryProps(lectureData: LectureData): SummaryTabProps {
  return {
    summary: lectureData.summary
  };
}

/**
 * Maps lecture data to Study Time tab props
 */
export function mapToStudyTimeProps(lectureData: LectureData, actualStats?: StudyStats): StudyTimeTabProps {
  const estimatedMinutes = parseEstimatedTime(lectureData.metadata.estimatedTime);
  
  const stats: StudyStats = actualStats || {
    estimatedMinutes,
    completedSessions: 0,
    lastAccessed: undefined
  };

  return {
    stats,
    studyPlan: lectureData.summary.studyPlan
  };
}

/**
 * Maps lecture data to Materials tab props
 */
export function mapToMaterialsProps(lectureData: LectureData, actualMaterials?: StudyMaterial[]): MaterialsTabProps {
  // Generate mock materials from resources if no actual materials provided
  const materials: StudyMaterial[] = actualMaterials || [
    {
      id: 'essential-1',
      name: 'Apuntes de clase.pdf',
      type: 'pdf',
      url: '#',
      size: '2.5 MB'
    },
    {
      id: 'practice-1', 
      name: 'Ejercicios prácticos.pdf',
      type: 'pdf',
      url: '#',
      size: '1.8 MB'
    }
  ];

  return {
    materials,
    resources: lectureData.summary.resources
  };
}

/**
 * Main mapper function that converts full lecture data to all tab props
 */
export function mapLectureDataToTabs(
  lectureData: LectureData,
  options?: {
    actualStats?: StudyStats;
    actualMaterials?: StudyMaterial[];
  }
) {
  return {
    overview: mapToOverviewProps(lectureData),
    questions: mapToQuestionsProps(lectureData),
    explanations: mapToExplanationsProps(lectureData),
    summary: mapToSummaryProps(lectureData),
    studyTime: mapToStudyTimeProps(lectureData, options?.actualStats),
    materials: mapToMaterialsProps(lectureData, options?.actualMaterials),
    
    // Additional metadata for the main component
    title: lectureData.metadata.title,
    difficulty: lectureData.metadata.difficulty,
    estimatedTime: lectureData.metadata.estimatedTime,
    hook: lectureData.metadata.hook
  };
}

/**
 * Loads lecture data from JSON file or API
 */
export async function loadLectureData(source: string | LectureData): Promise<LectureData> {
  if (typeof source === 'object') {
    return source; // Already parsed data
  }

  // Load from file path or URL
  if (source.startsWith('/') || source.startsWith('http')) {
    const response = await fetch(source);
    if (!response.ok) {
      throw new Error(`Failed to load lecture data: ${response.status}`);
    }
    return response.json();
  }

  throw new Error(`Invalid lecture data source: ${source}`);
}

/**
 * Validates that lecture data matches expected structure
 */
export function validateLectureData(data: any): data is LectureData {
  return (
    data &&
    typeof data === 'object' &&
    data.metadata &&
    data.overview &&
    Array.isArray(data.questions) &&
    Array.isArray(data.explanations) &&
    data.summary &&
    data.adaptiveFeatures &&
    data.assessmentAlignment
  );
}

/**
 * Gets mock lecture data for testing (returns hardcoded sample data)
 */
export async function getMockLectureData(): Promise<LectureData> {
  // Return hardcoded sample data instead of fetching from file
  const sampleData: LectureData = {
    metadata: {
      title: "Introduction to Machine Learning",
      subjectDomain: "Computer Science",
      difficulty: "intermediate",
      estimatedTime: "45 minutes",
      examImportance: "high",
      hook: "Discover how machines learn from data"
    },
    overview: {
      mainTopic: "Machine Learning Fundamentals",
      keyObjectives: [
        "Understand supervised vs unsupervised learning",
        "Learn about common ML algorithms",
        "Apply ML concepts to real-world problems"
      ],
      coreConceptsList: [
        "Training data",
        "Model evaluation",
        "Feature engineering",
        "Overfitting and underfitting"
      ]
    },
    questions: [
      {
        id: "q1",
        statement: "What is the main difference between supervised and unsupervised learning?",
        feedback: "Supervised learning uses labeled data to train models, while unsupervised learning finds patterns in unlabeled data.",
        difficulty: "medium",
        points: 10,
        estimatedTime: "2 minutes"
      },
      {
        id: "q2",
        statement: "Explain what overfitting means in machine learning.",
        feedback: "Overfitting occurs when a model learns the training data too well, including noise and outliers, resulting in poor generalization to new data.",
        difficulty: "medium",
        points: 10,
        estimatedTime: "3 minutes"
      }
    ],
    explanations: [
      {
        id: "exp1",
        concept: "Types of Machine Learning",
        importance: "high",
        explanation: "Machine learning can be categorized into three main types: supervised learning (learning from labeled examples), unsupervised learning (finding patterns in unlabeled data), and reinforcement learning (learning through interaction with an environment).",
        keyPoints: ["Supervised uses labeled data", "Unsupervised finds patterns", "Reinforcement learns through interaction"],
        example: "Spam detection is supervised learning, customer segmentation is unsupervised",
        multiModalExplanation: {
          text: "Machine learning types explanation",
          visual: "Diagram showing three ML types",
          analogy: "Like learning to cook with recipes (supervised) vs experimenting (unsupervised)",
          example: "Email spam filtering",
          interactiveElement: "Try classifying examples"
        },
        depthLevels: {
          eli5: "Computers can learn in different ways",
          standard: "Three main types of machine learning",
          advanced: "Mathematical foundations of ML paradigms"
        },
        commonConfusions: [],
        expertPerspective: "Understanding the right type for your problem is crucial"
      },
      {
        id: "exp2",
        concept: "Model Evaluation Metrics",
        importance: "high",
        explanation: "Common metrics include accuracy, precision, recall, and F1-score for classification problems, and MSE, RMSE, and R² for regression problems.",
        keyPoints: ["Accuracy measures overall correctness", "Precision measures positive prediction quality", "Recall measures completeness"],
        example: "In medical diagnosis, high recall is critical to not miss any cases",
        multiModalExplanation: {
          text: "Evaluation metrics explanation",
          visual: "Confusion matrix visualization",
          analogy: "Like grading a test with different scoring methods",
          example: "Medical test evaluation",
          interactiveElement: "Calculate metrics from confusion matrix"
        },
        depthLevels: {
          eli5: "Ways to measure how good a model is",
          standard: "Different metrics for different problems",
          advanced: "Statistical significance and confidence intervals"
        },
        commonConfusions: [],
        expertPerspective: "Choose metrics that align with business objectives"
      }
    ],
    summary: {
      essentialPoints: [
        "Machine learning enables computers to learn from data",
        "Three main types: supervised, unsupervised, reinforcement",
        "Model evaluation is crucial for performance assessment",
        "Feature engineering improves model performance"
      ],
      examFocus: {
        mustKnow: [
          "Definition and types of machine learning",
          "Common algorithms and their applications",
          "Evaluation metrics and their interpretation"
        ],
        likelyQuestions: [
          "Compare and contrast different ML algorithms",
          "Explain the bias-variance tradeoff",
          "Describe cross-validation techniques"
        ]
      },
      studyPlan: {
        priorities: [
          "Review core ML concepts",
          "Practice with algorithm implementations",
          "Work through example problems"
        ],
        timeAllocation: {
          theory: 40,
          practice: 60
        }
      },
      resources: {
        essential: ["Course textbook chapters 1-3", "Lecture slides"],
        recommended: ["Andrew Ng's ML course", "Hands-On Machine Learning book"],
        practice: ["Kaggle competitions", "Google Colab notebooks"]
      }
    },
    adaptiveFeatures: {
      masteryTracking: {
        currentLevel: 0,
        progressIndicators: ["Questions answered", "Time spent", "Accuracy rate"]
      },
      personalizedTips: [
        "Focus on understanding algorithms conceptually before diving into math",
        "Practice with real datasets to solidify understanding"
      ]
    },
    assessmentAlignment: {
      examFormat: "Multiple choice and short answer",
      keyTopics: ["ML fundamentals", "Algorithm selection", "Model evaluation"],
      practiceQuestions: 10
    },
    engagement: {
      quizMetrics: {
        totalQuestions: 10,
        totalPoints: 100,
        passingScore: 70
      },
      achievements: []
    }
  };
  
  return sampleData;
}