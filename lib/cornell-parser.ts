/**
 * Study Guide Parser - Extract structured sections from the new improved study guide format
 * New Structure: Table of Contents → Study Questions → Detailed Explanations → Summary
 */

export interface ParsedCornellNotes {
  cueColumn: string // Now contains study questions
  notesColumn: string // Now contains detailed explanations  
  summarySection: string // Comprehensive summary
  title: string
  tableOfContents?: string // New: extracted TOC
}

export interface StudyQuestion {
  id: number
  question: string
  answer: string
}

/**
 * Parse the new study guide format into structured sections
 * Extracts: Table of Contents, Study Questions, Detailed Explanations, Summary
 */
export function parseCornellNotes(notesContent: string, lectureTitle: string): ParsedCornellNotes {
  let tableOfContents = ''
  let studyQuestions = ''
  let detailedExplanations = ''
  let summarySection = ''

  // Extract Table of Contents section - updated regex for new format
  const tocMatch = notesContent.match(/##\s*(?:Table of Contents|Tabla de Contenidos|Table des Matières|Contenido|TOC)([\s\S]*?)(?=^##|---)/im)
  if (tocMatch) {
    tableOfContents = tocMatch[1].trim()
  }
  
  console.log('🔍 Cornell Parser: TOC extraction:', {
    found: !!tocMatch,
    tocPreview: tableOfContents?.substring(0, 200) + '...'
  })

  // Extract Study Questions section - Updated for new format
  const questionsMatch = notesContent.match(/##\s*(?:Study Questions|Preguntas de Estudio|Preguntas de Examen|Questions d'Étude)([\s\S]*?)(?=<!-- NEW_PAGE -->|^##)/im)
  if (questionsMatch) {
    const rawQuestions = questionsMatch[1].trim()
    
    // Extract individual questions - support multiple formats
    let questionMatches = rawQuestions.match(/###\s*(?:Question|Pregunta)\s*\d+:([^\n]+)/g)
    if (!questionMatches) {
      // Try bullet point format: * Question text
      questionMatches = rawQuestions.match(/^\s*[\*\-]\s*([^\n]+)/gm)
    }
    if (!questionMatches) {
      // Try numbered format: 1. Question text
      questionMatches = rawQuestions.match(/^\s*\d+\.\s*([^\n]+)/gm)
    }
    
    if (questionMatches) {
      studyQuestions = questionMatches
        .map((match, index) => {
          let question = match.replace(/^###\s*(?:Question|Pregunta)\s*\d+:\s*/, '').trim()
          question = question.replace(/^\s*[\*\-\d\.]\s*/, '').trim() // Clean bullet/number
          return `**Q${index + 1}:** ${question}`
        })
        .join('\n\n')
    } else {
      // Fallback: use raw questions section
      studyQuestions = rawQuestions
    }
    
    console.log('🔍 Cornell Parser: Questions extraction:', {
      found: !!questionsMatch,
      questionCount: questionMatches?.length || 0,
      questionsPreview: studyQuestions?.substring(0, 300) + '...'
    })
  }

  // Extract Detailed Explanations section
  const explanationsMatch = notesContent.match(/##\s*(?:Detailed Explanations|Explicaciones Detalladas|Explications Détaillées)([\s\S]*?)(?=<!-- NEW_PAGE -->|^##\s*(?:Summary|Resumen|Résumé))/im)
  if (explanationsMatch) {
    detailedExplanations = explanationsMatch[1].trim()
    
    // Clean up the explanations format
    detailedExplanations = detailedExplanations
      .replace(/###\s*Answer\s*\d+:/g, '####') // Convert Answer headers to H4
      .replace(/###\s*Question\s*\d+:/g, '####') // Convert restated questions to H4
      .trim()
  }

  // Extract Summary section
  const summaryMatch = notesContent.match(/##\s*(?:Summary|Comprehensive Summary|Resumen|Résumé|Key Takeaways)([\s\S]*?)$/im)
  if (summaryMatch) {
    summarySection = summaryMatch[1].trim()
  }

  // Fallback extraction if structured format is not found
  if (!studyQuestions && !detailedExplanations) {
    // Try to extract any question-like content
    const fallbackQuestions = notesContent.match(/(?:^|\n)\s*(?:Question|Q\d+|¿|\?).*?(?=\n|$)/gim)
    if (fallbackQuestions) {
      studyQuestions = fallbackQuestions.join('\n\n')
    }
    
    // Use remaining content as explanations
    let remainingContent = notesContent
    if (tocMatch) remainingContent = remainingContent.replace(tocMatch[0], '')
    if (summaryMatch) remainingContent = remainingContent.replace(summaryMatch[0], '')
    if (fallbackQuestions) {
      fallbackQuestions.forEach(q => remainingContent = remainingContent.replace(q, ''))
    }
    
    detailedExplanations = remainingContent
      .replace(/^#.*$/gm, '') // Remove headers
      .replace(/^\s*-{3,}\s*$/gm, '') // Remove divider lines
      .replace(/<!--.*?-->/g, '') // Remove comments
      .trim()
  }

  return {
    cueColumn: studyQuestions || 'No study questions extracted',
    notesColumn: detailedExplanations || notesContent, // Fallback to full content
    summarySection: summarySection || 'No summary extracted',
    title: lectureTitle,
    tableOfContents: tableOfContents || 'No table of contents extracted'
  }
}

/**
 * Extract individual study questions with their corresponding answers
 * Useful for the student desk UI to display questions/answers separately
 */
export function extractStudyQuestionsAndAnswers(notesContent: string): StudyQuestion[] {
  const questions: StudyQuestion[] = []
  
  // Extract questions from Study Questions section - Updated for new format
  const questionsMatch = notesContent.match(/##\s*(?:Study Questions|Preguntas de Estudio|Preguntas de Examen|Questions d'Étude)([\s\S]*?)(?=<!-- NEW_PAGE -->|^##)/im)
  if (!questionsMatch) return questions

  const questionsSection = questionsMatch[1]
  
  // Try multiple question formats
  let questionMatches = questionsSection.match(/###\s*(?:Question|Pregunta)\s*(\d+):\s*([^\n]+)/g)
  if (!questionMatches) {
    // Try bullet point format: * Question text
    questionMatches = questionsSection.match(/^\s*[\*\-]\s*([^\n]+)/gm)
  }
  if (!questionMatches) {
    // Try numbered format: 1. Question text
    questionMatches = questionsSection.match(/^\s*(\d+)\.\s*([^\n]+)/gm)
  }
  
  if (!questionMatches) return questions

  // Extract answers from Detailed Explanations section
  const explanationsMatch = notesContent.match(/##\s*(?:Detailed Explanations|Explicaciones Detalladas|Explications Détaillées)([\s\S]*?)(?=<!-- NEW_PAGE -->|^##\s*(?:Summary|Resumen|Résumé))/im)
  const explanationsSection = explanationsMatch?.[1] || ''

  questionMatches.forEach((questionMatch, index) => {
    const questionNumber = index + 1
    let questionText = questionMatch
      .replace(/^###\s*(?:Question|Pregunta)\s*\d+:\s*/, '')
      .replace(/^\s*[\*\-\d\.]\s*/, '')
      .trim()
    
    // Find corresponding answer - try multiple patterns
    let answerText = 'No detailed explanation found'
    
    // Try Answer format
    const answerRegex1 = new RegExp(`###\\s*(?:Answer|Respuesta)\\s*${questionNumber}:([\\s\\S]*?)(?=###\\s*(?:Answer|Respuesta)\\s*\\d+:|$)`, 'i')
    const answerMatch1 = explanationsSection.match(answerRegex1)
    
    if (answerMatch1) {
      answerText = answerMatch1[1].trim()
    } else {
      // Try to find answer by question content match
      const questionWords = questionText.split(' ').slice(0, 3).join(' ')
      const answerRegex2 = new RegExp(`(?:.*${questionWords}.*?[\\n\\r]*)([\\s\\S]*?)(?=###|$)`, 'i')
      const answerMatch2 = explanationsSection.match(answerRegex2)
      if (answerMatch2) {
        answerText = answerMatch2[1].trim().substring(0, 500) // Limit length
      }
    }
    
    questions.push({
      id: questionNumber,
      question: questionText,
      answer: answerText
    })
  })

  console.log('🔍 Cornell Parser: Q&A extraction:', {
    questionsFound: questionMatches.length,
    answersFound: questions.filter(q => q.answer !== 'No detailed explanation found').length,
    firstQuestion: questions[0]?.question?.substring(0, 100) + '...',
    firstAnswer: questions[0]?.answer?.substring(0, 100) + '...'
  })

  return questions
}