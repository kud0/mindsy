/**
 * Structured Content Processor - New way to receive and organize lecture content
 * This replaces the old unstructured approach with a clean, organized system
 */

export interface StructuredLectureContent {
  // Core Information
  title: string
  subject?: string
  date?: string
  duration?: number
  
  // Structured Content Sections
  overview: {
    summary: string
    objectives: string[]
    prerequisites?: string[]
  }
  
  // Main content organized by sections
  sections: LectureSection[]
  
  // Study Materials
  keyPoints: StudyPoint[]
  questions: StudyQuestion[]
  
  // Additional Resources
  resources: {
    originalFiles: FileResource[]
    generatedFiles: FileResource[]
    references?: string[]
  }
}

export interface LectureSection {
  id: string
  title: string
  content: string
  subsections?: {
    title: string
    content: string
    examples?: string[]
    diagrams?: string[]
  }[]
  
  // Section-specific study aids
  keyTerms?: { term: string; definition: string }[]
  examples?: string[]
  formulas?: string[]
}

export interface StudyPoint {
  id: string
  type: 'concept' | 'definition' | 'formula' | 'example' | 'important'
  title: string
  content: string
  section?: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
}

export interface StudyQuestion {
  id: string
  question: string
  type: 'review' | 'practice' | 'critical-thinking' | 'application'
  section?: string
  difficulty: 'basic' | 'intermediate' | 'advanced'
  answer?: string
  hints?: string[]
}

export interface FileResource {
  id: string
  name: string
  type: 'pdf' | 'markdown' | 'text' | 'image' | 'video' | 'audio'
  path: string
  description?: string
  category: 'original' | 'notes' | 'summary' | 'slides' | 'supplementary'
}

/**
 * Content Processing Templates - Different approaches for different input types
 */

// Template 1: AI-Powered Structured Processing
export class AIStructuredProcessor {
  static async processContent(rawContent: string, metadata: { title: string; type: string }): Promise<StructuredLectureContent> {
    // This would integrate with AI to automatically structure content
    const sections = this.extractSections(rawContent)
    const keyPoints = this.extractKeyPoints(rawContent)
    const questions = this.generateQuestions(sections)
    
    return {
      title: metadata.title,
      overview: {
        summary: this.generateSummary(rawContent),
        objectives: this.extractObjectives(rawContent)
      },
      sections,
      keyPoints,
      questions,
      resources: {
        originalFiles: [],
        generatedFiles: []
      }
    }
  }
  
  private static extractSections(content: string): LectureSection[] {
    // Smart section detection
    const sections: LectureSection[] = []
    const lines = content.split('\n')
    
    let currentSection: LectureSection | null = null
    let currentContent: string[] = []
    
    for (const line of lines) {
      // Detect section headers (markdown style or underlined)
      if (line.startsWith('#') || line.match(/^[A-Z][^a-z]*$/) || line.match(/^=+$/)) {
        // Save previous section
        if (currentSection && currentContent.length > 0) {
          currentSection.content = currentContent.join('\n').trim()
          sections.push(currentSection)
        }
        
        // Start new section
        const title = line.replace(/^#+\s*/, '').trim()
        currentSection = {
          id: `section-${sections.length + 1}`,
          title,
          content: ''
        }
        currentContent = []
      } else if (currentSection) {
        currentContent.push(line)
      }
    }
    
    // Add final section
    if (currentSection && currentContent.length > 0) {
      currentSection.content = currentContent.join('\n').trim()
      sections.push(currentSection)
    }
    
    return sections
  }
  
  private static extractKeyPoints(content: string): StudyPoint[] {
    const keyPoints: StudyPoint[] = []
    const lines = content.split('\n')
    
    lines.forEach((line, index) => {
      // Look for bullet points, important statements, definitions
      if (line.match(/^[-•*]\s+/) || line.toLowerCase().includes('important') || line.includes(':')) {
        const cleanPoint = line.replace(/^[-•*]\s+/, '').trim()
        if (cleanPoint.length > 10) {
          keyPoints.push({
            id: `point-${index}`,
            type: line.toLowerCase().includes('definition') ? 'definition' : 'concept',
            title: cleanPoint.split('.')[0] || cleanPoint.substring(0, 50),
            content: cleanPoint,
            difficulty: 'intermediate'
          })
        }
      }
    })
    
    return keyPoints
  }
  
  private static generateQuestions(sections: LectureSection[]): StudyQuestion[] {
    const questions: StudyQuestion[] = []
    
    sections.forEach((section, index) => {
      // Generate questions from section titles
      questions.push({
        id: `q-${index}`,
        question: `Explain the key concepts in "${section.title}"`,
        type: 'review',
        section: section.id,
        difficulty: 'intermediate'
      })
      
      // Generate questions from content
      if (section.content.includes('important') || section.content.includes('key')) {
        questions.push({
          id: `q-${index}-detail`,
          question: `What are the important aspects of ${section.title.toLowerCase()}?`,
          type: 'critical-thinking',
          section: section.id,
          difficulty: 'advanced'
        })
      }
    })
    
    return questions
  }
  
  private static generateSummary(content: string): string {
    // Extract first meaningful paragraph or generate from key sections
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 50)
    return paragraphs.slice(0, 2).join(' ').substring(0, 500) + '...'
  }
  
  private static extractObjectives(content: string): string[] {
    const objectives: string[] = []
    const lines = content.split('\n')
    
    let inObjectivesSection = false
    for (const line of lines) {
      if (line.toLowerCase().includes('objective') || line.toLowerCase().includes('goal')) {
        inObjectivesSection = true
        continue
      }
      
      if (inObjectivesSection && line.match(/^[-•*]\s+/)) {
        objectives.push(line.replace(/^[-•*]\s+/, '').trim())
      } else if (inObjectivesSection && line.trim() === '') {
        inObjectivesSection = false
      }
    }
    
    return objectives
  }
}

// Template 2: Manual Structured Input (for new uploads)
export interface ManualStructuredInput {
  basic: {
    title: string
    summary: string
  }
  
  sections: {
    title: string
    content: string
    keyPoints: string[]
  }[]
  
  studyAids: {
    questions: string[]
    importantConcepts: string[]
    examples: string[]
  }
}

// Template 3: PDF Processing with Structure Detection
export class PDFStructuredProcessor {
  static async processPDF(pdfPath: string): Promise<StructuredLectureContent> {
    // This would integrate with PDF parsing libraries
    // to extract text and detect structure from headings, formatting, etc.
    
    // For now, return a placeholder structure
    return {
      title: 'PDF Lecture',
      overview: {
        summary: 'Processed from PDF',
        objectives: []
      },
      sections: [],
      keyPoints: [],
      questions: [],
      resources: {
        originalFiles: [{
          id: 'original-pdf',
          name: 'Original PDF',
          type: 'pdf',
          path: pdfPath,
          category: 'original'
        }],
        generatedFiles: []
      }
    }
  }
}

/**
 * Database Schema for New Structured Content
 */
export interface StructuredContentDBSchema {
  // Main lecture record
  lectures: {
    id: string
    user_id: string
    title: string
    subject: string
    created_at: string
    updated_at: string
    processing_status: 'pending' | 'processing' | 'completed' | 'failed'
    
    // Overview information
    overview_summary: string
    overview_objectives: string[] // JSON array
    prerequisites?: string[] // JSON array
  }
  
  // Lecture sections (one-to-many)
  lecture_sections: {
    id: string
    lecture_id: string
    title: string
    content: string
    order_index: number
    subsections?: any // JSON for subsections
    key_terms?: any // JSON for key terms
  }
  
  // Study points (one-to-many)
  study_points: {
    id: string
    lecture_id: string
    section_id?: string
    type: 'concept' | 'definition' | 'formula' | 'example' | 'important'
    title: string
    content: string
    difficulty: 'basic' | 'intermediate' | 'advanced'
  }
  
  // Study questions (one-to-many)
  study_questions: {
    id: string
    lecture_id: string
    section_id?: string
    question: string
    type: 'review' | 'practice' | 'critical-thinking' | 'application'
    difficulty: 'basic' | 'intermediate' | 'advanced'
    answer?: string
    hints?: string[] // JSON array
  }
  
  // File resources (one-to-many)
  lecture_resources: {
    id: string
    lecture_id: string
    name: string
    type: 'pdf' | 'markdown' | 'text' | 'image' | 'video' | 'audio'
    file_path: string
    description?: string
    category: 'original' | 'notes' | 'summary' | 'slides' | 'supplementary'
  }
}