/**
 * Content Parser - Extract structured information from lecture content
 * Supports both Markdown and plain text content
 */

export interface ParsedContent {
  questions: string[]
  summary: string
  keyPoints: string[]
  cleanContent: string
}

export function parseContentIntelligently(content: string): ParsedContent {
  if (!content) {
    return {
      questions: [],
      summary: 'No content available',
      keyPoints: [],
      cleanContent: 'No content available'
    }
  }

  // Split content into lines for processing
  const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0)
  
  const questions: string[] = []
  const keyPoints: string[] = []
  let summary = ''
  const contentSections: string[] = []
  
  let currentSection = ''
  let inSummarySection = false
  let inKeyPointsSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const nextLine = lines[i + 1] || ''
    
    // Detect section headers (markdown ## or ### style, or underlined)
    const isHeader = line.startsWith('#') || line.startsWith('##') || line.startsWith('###') || 
                     nextLine.match(/^[-=]{3,}$/) || 
                     line.match(/^[A-Z][^a-z]*$/) // ALL CAPS headers
    
    // Check for summary-related sections
    const isSummarySection = line.toLowerCase().includes('summary') ||
                            line.toLowerCase().includes('conclusion') ||
                            line.toLowerCase().includes('takeaway') ||
                            line.toLowerCase().includes('key takeaway')
    
    // Check for key points sections
    const isKeyPointsSection = line.toLowerCase().includes('key') ||
                              line.toLowerCase().includes('important') ||
                              line.toLowerCase().includes('main points') ||
                              line.toLowerCase().includes('highlights')
    
    if (isHeader) {
      // Save previous section
      if (currentSection) {
        if (inSummarySection) {
          summary += currentSection + '\n'
        } else if (inKeyPointsSection) {
          // Extract bullet points from this section
          const bullets = extractBulletPoints(currentSection)
          keyPoints.push(...bullets)
        } else {
          contentSections.push(currentSection)
        }
      }
      
      // Start new section
      currentSection = line + '\n'
      inSummarySection = isSummarySection
      inKeyPointsSection = isKeyPointsSection
      
      // Extract questions from headers
      if (line.includes('?') || line.toLowerCase().includes('question')) {
        questions.push(cleanText(line))
      }
      
    } else {
      currentSection += line + '\n'
      
      // Extract questions from content
      if (line.includes('?')) {
        questions.push(cleanText(line))
      }
      
      // Extract bullet points and numbered lists
      if (line.match(/^[-•*]\s+/) || line.match(/^\d+\.\s+/) || line.match(/^[a-zA-Z]\.\s+/)) {
        const point = cleanText(line.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, '').replace(/^[a-zA-Z]\.\s+/, ''))
        if (point.length > 10) { // Only meaningful points
          keyPoints.push(point)
        }
      }
    }
  }
  
  // Process final section
  if (currentSection) {
    if (inSummarySection) {
      summary += currentSection
    } else if (inKeyPointsSection) {
      const bullets = extractBulletPoints(currentSection)
      keyPoints.push(...bullets)
    } else {
      contentSections.push(currentSection)
    }
  }
  
  // Generate summary if none found
  if (!summary.trim()) {
    summary = generateSummaryFromContent(contentSections.join('\n'))
  }
  
  // Generate questions if none found
  if (questions.length === 0) {
    questions.push(...generateQuestionsFromContent(contentSections.join('\n')))
  }
  
  // Remove duplicates and clean up
  const uniqueQuestions = [...new Set(questions)].filter(q => q.length > 10).slice(0, 10)
  const uniqueKeyPoints = [...new Set(keyPoints)].filter(p => p.length > 10).slice(0, 15)
  const cleanContent = contentSections.join('\n\n').trim()
  
  return {
    questions: uniqueQuestions,
    summary: summary.trim() || 'Summary not available',
    keyPoints: uniqueKeyPoints,
    cleanContent: cleanContent || content
  }
}

function extractBulletPoints(text: string): string[] {
  const lines = text.split('\n')
  const bullets: string[] = []
  
  for (const line of lines) {
    if (line.match(/^[-•*]\s+/) || line.match(/^\d+\.\s+/)) {
      const point = cleanText(line.replace(/^[-•*]\s+/, '').replace(/^\d+\.\s+/, ''))
      if (point.length > 10) {
        bullets.push(point)
      }
    }
  }
  
  return bullets
}

function generateSummaryFromContent(content: string): string {
  // Extract first few meaningful sentences
  const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20).slice(0, 3)
  return sentences.join('. ').trim() + '.'
}

function generateQuestionsFromContent(content: string): string[] {
  const questions: string[] = []
  
  // Extract section headers as questions
  const lines = content.split('\n')
  for (const line of lines) {
    if (line.startsWith('#') || line.match(/^[A-Z][^a-z]*$/)) {
      const header = cleanText(line.replace(/^#+\s*/, ''))
      if (header.length > 5) {
        questions.push(`What is ${header.toLowerCase()}?`)
      }
    }
  }
  
  return questions.slice(0, 5)
}

function cleanText(text: string): string {
  return text
    .replace(/^#+\s*/, '') // Remove markdown headers
    .replace(/^\d+\.\s*/, '') // Remove numbers
    .replace(/^[-•*]\s*/, '') // Remove bullets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

// PDF-specific parsing (if we get PDF text content)
export function parsePDFContent(pdfText: string): ParsedContent {
  // Similar logic but adapted for PDF text extraction patterns
  return parseContentIntelligently(pdfText)
}

// Markdown-specific parsing
export function parseMarkdownContent(markdown: string): ParsedContent {
  return parseContentIntelligently(markdown)
}