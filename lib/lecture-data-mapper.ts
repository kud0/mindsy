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
 * Gets mock lecture data for testing (from sample-lecture.json)
 */
export async function getMockLectureData(): Promise<LectureData> {
  try {
    const response = await fetch('/data/student-desk/sample-lecture.json');
    if (!response.ok) {
      throw new Error('Failed to load mock data');
    }
    const data = await response.json();
    
    if (!validateLectureData(data)) {
      throw new Error('Invalid lecture data structure');
    }
    
    return data;
  } catch (error) {
    console.error('Error loading mock lecture data:', error);
    throw error;
  }
}