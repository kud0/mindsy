import OpenAI from 'openai';
import { config } from './config';
import { getLanguageTermsFromText } from './language-utils';
import { generateMindsyNotes, type MindsyNotesInput } from './openai-client';

const openai = new OpenAI({
  apiKey: config.openaiKey,
});

/**
 * Master content structure - single source of truth for all formats
 */
export interface MasterContent {
  metadata: {
    title: string;
    subject?: string;
    language: string;
    estimatedStudyTime: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    topicArea: string;
    generatedAt: string;
  };
  
  tableOfContents: {
    title: string;
    items: {
      title: string;
      description: string;
      page?: number; // For PDF references
    }[];
  };
  
  questions: {
    id: string;
    question: string;
    answer: string;
    type: 'concept' | 'definition' | 'application' | 'review';
    difficulty: 'basic' | 'intermediate' | 'advanced';
    tags: string[];
    section?: string; // Which TOC section this belongs to
  }[];
  
  explanations: {
    id: string;
    title: string;
    content: string;
    keyPoints: string[];
    examples?: string[];
    section?: string; // Which TOC section this belongs to
  }[];
  
  summary: {
    overview: string;
    keyTakeaways: string[];
    learningObjectives: string[];
    nextSteps?: string[];
  };
  
  originalTranscript: string;
}

/**
 * Student Desk Format - Optimized for interactive learning
 */
export interface StudentDeskFormat {
  metadata: MasterContent['metadata'];
  tableOfContents: string[]; // Simple list for quick rendering
  questions: {
    id: string;
    question: string;
    answer: string;
    type: string;
    difficulty: string;
  }[];
  explanations: {
    title: string;
    content: string;
  }[];
  summary: MasterContent['summary'];
}

/**
 * Markdown Format - Perfect for TipTap editing
 */
export interface MarkdownFormat {
  content: string; // Full markdown content
  frontmatter: {
    title: string;
    subject?: string;
    language: string;
    difficulty: string;
    estimatedTime: string;
    generatedAt: string;
  };
}

/**
 * PDF Format - Beautiful reading layout
 */
export interface PDFFormat {
  html: string; // Ready for PDF generation with CSS
  title: string;
  metadata: MasterContent['metadata'];
}

export interface MultiFormatInput {
  transcript?: string;
  pdfText?: string;
  lectureTitle?: string;
  courseSubject?: string;
  detectedLanguage?: string;
}

export interface MultiFormatOutput {
  success: boolean;
  masterContent?: MasterContent;
  formats?: {
    studentDesk: StudentDeskFormat;
    markdown: MarkdownFormat;
    pdf: PDFFormat;
    transcript: string;
  };
  error?: string;
  errorCode?: string;
}

/**
 * Create a simplified, reliable structured markdown prompt
 */
function createSimplifiedPrompt(input: MultiFormatInput): string {
  const { transcript, pdfText, lectureTitle, detectedLanguage } = input;
  
  // Get language-specific terms
  const textForLanguageDetection = transcript || pdfText || '';
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);
  
  const content = transcript || pdfText || '';
  const title = lectureTitle || 'Study Session';
  
  return `Transform this content into a comprehensive study guide using this EXACT structured format.

## Content to Transform:
**Title:** ${title}
**Content:** ${content}

## Language Instructions:
Use ${language} consistently. Use these terms:
- ${terms.tableOfContents}
- ${terms.cueColumn}
- ${terms.detailedNotes}
- ${terms.comprehensiveSummary}

## Required Output Format:
Follow this EXACT structure:

---STUDY_GUIDE_START---

### METADATA
Title: ${title}
Subject: [Extract from content]
Language: ${language}
Difficulty: [beginner/intermediate/advanced]
Study Time: [estimated time]

### ${terms.tableOfContents}
- Topic 1: [Description]
- Topic 2: [Description] 
- Topic 3: [Description]
- Topic 4: [Description]
- Topic 5: [Description]

### ${terms.cueColumn}

Q1: [Complete question testing understanding?]
A1: * [Clear, direct explanation] * [Key supporting point] * **[Important term defined]** * [Practical application]

Q2: [What is the key term or concept?]
A2: * **Definición:** [precise technical definition] * [Key characteristics] * [Practical relevance]

Q3: [How would you apply this knowledge?] 
A3: * [Specific application method] * [Key considerations] * [Expected outcomes] * [Practical examples]

Q4: [Question reviewing important points?]
A4: * [Main concept] * [Supporting evidence] * [Connections to other topics] * [Key takeaways]

Q5: [Complex conceptual question?]
A5: * [Core principle] * [Underlying mechanism] * **[Technical terms defined]** * [Real-world implications]

[Continue with appropriate number of questions based on content length]

### ${terms.detailedNotes}

SECTION: Core Concepts
CONTENT: [Detailed explanation of main ideas and principles]
KEY_POINTS: [Point 1] | [Point 2] | [Point 3]

SECTION: Key Examples
CONTENT: [Practical examples illustrating concepts]
KEY_POINTS: [Example 1] | [Example 2] | [Application]

SECTION: Important Details
CONTENT: [Additional context and background information]  
KEY_POINTS: [Detail 1] | [Detail 2] | [Context]

### ${terms.comprehensiveSummary}

OVERVIEW: [2-3 paragraphs comprehensive overview]

KEY_TAKEAWAYS: [Takeaway 1] | [Takeaway 2] | [Takeaway 3] | [Takeaway 4] | [Takeaway 5]

LEARNING_OBJECTIVES: [What students should understand] | [Skills to develop] | [Knowledge to retain]

---STUDY_GUIDE_END---

Generate educational content with concise, factual answers. Create appropriate number of varied questions based on content depth and length.`;
}

/**
 * Generate the master content structure using OpenAI with the good Cornell Notes prompt
 */
async function generateMasterContent(input: MultiFormatInput): Promise<MasterContent | null> {
  const { transcript, pdfText, lectureTitle, detectedLanguage } = input;
  
  // Get language-specific terms
  const textForLanguageDetection = transcript || pdfText || '';
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);
  
  const content = transcript || pdfText || '';
  const title = lectureTitle || 'Study Session';
  
  const prompt = `You are a world-class academic assistant and instructional designer with expertise in cognitive science and learning psychology. Your mission is to create comprehensive, standalone study guides that maximize learning retention and exam success. You combine the depth of a university professor with the clarity of an expert tutor, creating educational content that helps students master complex topics through structured, scientifically-informed approaches to knowledge organization and retrieval practice.

## Content to Transform:
**Title:** ${title}
**Content:** ${content}

## Language Instructions:
Use ${language} consistently throughout. Use these terms:
- Table of Contents = "${terms.tableOfContents}"
- Questions = "${terms.cueColumn}"
- Explanations = "${terms.detailedNotes}"  
- Summary = "${terms.comprehensiveSummary}"

## Required Output Format:
Return a JSON object with this EXACT structure (no additional text):

{
  "metadata": {
    "title": "${title}",
    "subject": "Subject area from content",
    "language": "${language}",
    "estimatedStudyTime": "30-45 minutes",
    "difficulty": "intermediate",
    "topicArea": "Main topic area",
    "generatedAt": "${new Date().toISOString()}"
  },
  "tableOfContents": {
    "title": "${terms.tableOfContents}",
    "items": [
      {
        "title": "Main Topic 1",
        "description": "Brief description of what this covers"
      },
      {
        "title": "Main Topic 2", 
        "description": "Brief description of what this covers"
      }
    ]
  },
  "questions": [
    {
      "id": "q1",
      "question": "Complete question that tests understanding?",
      "answer": "* Clear explanation * Key supporting point * **Important term defined** * Practical application"
    }
  ],
  "explanations": [
    {
      "id": "exp1",
      "title": "Core Concepts",
      "content": "Detailed explanation of the main ideas and principles covered in this section",
      "keyPoints": [
        "Key insight 1",
        "Important principle 2",
        "Critical understanding 3"
      ],
      "examples": [
        "Practical example 1",
        "Real-world application 2"
      ],
      "section": "Main Topic 1"
    }
  ],
  "summary": {
    "overview": "Comprehensive overview of the entire content in 2-3 paragraphs",
    "keyTakeaways": [
      "Main learning point 1",
      "Essential insight 2",
      "Important conclusion 3"
    ],
    "learningObjectives": [
      "What students should understand after studying",
      "Skills they should be able to demonstrate",
      "Knowledge they should retain"
    ],
    "nextSteps": [
      "Suggested follow-up topics",
      "Practice recommendations"
    ]
  },
  "originalTranscript": "${content.substring(0, 1000)}..."
}

## Generation Requirements:
1. Create appropriate number of questions based on content length and complexity (quality over quantity)
2. Use format: * [key point] * [supporting detail] * **[defined terms]** * [applications]  
3. Keep each bullet point concise and factual, avoid long narratives
4. Bold important technical terms and definitions
5. Use ${language} consistently throughout
6. Focus on comprehension and practical application
7. Return only valid JSON - no additional text

Generate comprehensive educational content that will work perfectly across interactive learning, editing, and reading formats.

CRITICAL: 
- Ensure all JSON strings are properly escaped
- No line breaks inside string values  
- Use \\n for newlines in content
- Keep answer length reasonable (150-250 words max)
- Return only the JSON object, no other text`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini', 
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Create comprehensive study materials with clear structure and detailed explanations.'
        },
        {
          role: 'user',
          content: createSimplifiedPrompt(input)
        }
      ],
      max_completion_tokens: 80000
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      console.error('OpenAI returned empty response');
      return null;
    }

    // Parse structured markdown instead of JSON
    const masterContent = parseStructuredResponse(responseContent, {
      title: input.lectureTitle || 'Study Session',
      language: detectedLanguage || 'en'
    });
    
    if (!masterContent) {
      console.error('Failed to parse structured response');
      return null;
    }

    console.log('✅ Master Content Generated:', {
      questionsCount: masterContent.questions.length,
      explanationsCount: masterContent.explanations?.length || 0,
      tocItems: masterContent.tableOfContents?.items?.length || 0,
      language: masterContent.metadata?.language
    });

    return masterContent;

  } catch (error) {
    console.error('Error generating master content:', error);
    return null;
  }
}

/**
 * Parse markdown notes from generateMindsyNotes into MasterContent structure
 */
function parseMarkdownToMasterContent(markdown: string, input: MultiFormatInput): MasterContent | null {
  try {
    const { lectureTitle, courseSubject, detectedLanguage } = input;
    const { language } = getLanguageTermsFromText(input.transcript || input.pdfText || '', detectedLanguage);
    
    // Extract table of contents
    const tocMatch = markdown.match(/## (?:Tabla de Contenidos|Table of Contents)([\s\S]*?)(?=##|---)/);
    const tocItems = tocMatch ? 
      tocMatch[1].split('\n')
        .filter(line => line.trim().startsWith('*'))
        .map(line => {
          const text = line.replace(/^\*\s+/, '').trim();
          return {
            title: text.split(':')[0] || text,
            description: text.split(':')[1]?.trim() || ''
          };
        }) : [];
    
    // Extract questions and answers
    const questions: any[] = [];
    const explanations: any[] = [];
    
    // Find Study Questions section
    const questionsMatch = markdown.match(/## Study Questions([\s\S]*?)(?=##|---)/);
    if (questionsMatch) {
      const questionLines = questionsMatch[1].split('\n')
        .filter(line => line.match(/^\d+\./));
      
      questionLines.forEach((q, idx) => {
        const questionText = q.replace(/^\d+\.\s*/, '').trim();
        questions.push({
          id: `q${idx + 1}`,
          question: questionText,
          answer: '', // Will be filled from explanations
          type: 'concept',
          difficulty: 'intermediate',
          tags: [],
          section: tocItems[0]?.title || 'General'
        });
      });
    }
    
    // Find Detailed Explanations section
    const explanationsMatch = markdown.match(/## Detailed Explanations([\s\S]*?)(?=##|---)/);
    if (explanationsMatch) {
      const answerSections = explanationsMatch[1].split(/### Answer \d+:/);
      
      answerSections.forEach((section, idx) => {
        if (idx === 0 || !section.trim()) return;
        
        const lines = section.split('\n').filter(line => line.trim());
        const title = lines[0] || `Answer ${idx}`;
        const content = lines.slice(1).join('\n');
        
        // Update the corresponding question's answer
        if (questions[idx - 1]) {
          questions[idx - 1].answer = content
            .replace(/^\*\s+/gm, '')
            .replace(/\n/g, ' ')
            .trim();
        }
        
        // Extract key points from bullet points
        const keyPoints = lines
          .filter(line => line.trim().startsWith('*'))
          .map(line => line.replace(/^\*\s+/, '').trim());
        
        explanations.push({
          id: `exp${idx}`,
          title: title.replace(/[\[\]]/g, ''),
          content: content.replace(/^\*\s+/gm, '').trim(),
          keyPoints: keyPoints.slice(0, 5),
          examples: [],
          section: tocItems[Math.min(idx - 1, tocItems.length - 1)]?.title || 'General'
        });
      });
    }
    
    // Extract summary
    const summaryMatch = markdown.match(/## (?:Resumen Integral|Comprehensive Summary)([\s\S]*?)$/);
    const summaryText = summaryMatch ? summaryMatch[1].trim() : '';
    
    // Parse summary paragraphs for overview
    const summaryParagraphs = summaryText.split('\n\n').filter(p => p.trim() && !p.startsWith('#'));
    const overview = summaryParagraphs.join('\n\n');
    
    // Create master content
    const masterContent: MasterContent = {
      metadata: {
        title: lectureTitle || 'Study Guide',
        subject: courseSubject,
        language: language,
        estimatedStudyTime: '30-45 minutes',
        difficulty: 'intermediate',
        topicArea: courseSubject || 'General',
        generatedAt: new Date().toISOString()
      },
      tableOfContents: {
        title: language === 'es' ? 'Tabla de Contenidos' : 'Table of Contents',
        items: tocItems.length > 0 ? tocItems : [
          { title: 'Introduction', description: 'Overview and key concepts' },
          { title: 'Main Content', description: 'Core material and explanations' },
          { title: 'Summary', description: 'Key takeaways and conclusions' }
        ]
      },
      questions: questions.length > 0 ? questions : [{
        id: 'q1',
        question: 'What are the main concepts covered in this lecture?',
        answer: 'The lecture covers the key topics outlined in the table of contents.',
        type: 'concept',
        difficulty: 'intermediate',
        tags: ['overview'],
        section: 'General'
      }],
      explanations: explanations.length > 0 ? explanations : [{
        id: 'exp1',
        title: 'Main Concepts',
        content: overview || 'This lecture covers important concepts that build foundational understanding.',
        keyPoints: ['Key concept 1', 'Key concept 2', 'Key concept 3'],
        examples: [],
        section: 'General'
      }],
      summary: {
        overview: overview || 'This lecture provides comprehensive coverage of the topic.',
        keyTakeaways: [
          'Understanding of core concepts',
          'Practical applications',
          'Critical thinking skills'
        ],
        learningObjectives: [
          'Master fundamental concepts',
          'Apply knowledge to real scenarios',
          'Develop analytical skills'
        ],
        nextSteps: []
      },
      originalTranscript: input.transcript || input.pdfText || ''
    };
    
    return masterContent;
    
  } catch (error) {
    console.error('Error parsing markdown to master content:', error);
    return null;
  }
}

/**
 * Transform master content to Student Desk format
 */
function transformToStudentDesk(master: MasterContent): StudentDeskFormat {
  return {
    metadata: master.metadata,
    tableOfContents: master.tableOfContents.items.map(item => `${item.title}: ${item.description}`),
    questions: master.questions.map(q => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      type: q.type,
      difficulty: q.difficulty
    })),
    explanations: master.explanations.map(exp => ({
      title: exp.title,
      content: exp.content
    })),
    summary: master.summary
  };
}

/**
 * Transform master content to Markdown format (for TipTap editing)
 */
function transformToMarkdown(master: MasterContent): MarkdownFormat {
  const { metadata, tableOfContents, questions, explanations, summary } = master;
  
  let markdown = `# ${metadata.title}\n\n`;
  
  // Table of Contents
  markdown += `## ${tableOfContents.title}\n\n`;
  tableOfContents.items.forEach(item => {
    markdown += `- **${item.title}**: ${item.description}\n`;
  });
  markdown += '\n---\n\n';
  
  // Questions Section
  markdown += `## ${metadata.language === 'es' ? 'Preguntas de Estudio' : 'Study Questions'}\n\n`;
  questions.forEach((q, index) => {
    markdown += `### ${metadata.language === 'es' ? 'Pregunta' : 'Question'} ${index + 1}: [${q.type.toUpperCase()}] [${q.difficulty.toUpperCase()}]\n`;
    markdown += `${q.question}\n\n`;
    markdown += `**${metadata.language === 'es' ? 'Respuesta' : 'Answer'}:** ${q.answer}\n\n`;
    if (q.section) {
      markdown += `*${metadata.language === 'es' ? 'Sección' : 'Section'}: ${q.section}*\n\n`;
    }
    markdown += '---\n\n';
  });
  
  // Explanations Section  
  markdown += `## ${metadata.language === 'es' ? 'Explicaciones Detalladas' : 'Detailed Explanations'}\n\n`;
  explanations.forEach(exp => {
    markdown += `### ${exp.title}\n\n`;
    markdown += `${exp.content}\n\n`;
    
    if (exp.keyPoints.length > 0) {
      markdown += `**${metadata.language === 'es' ? 'Puntos Clave' : 'Key Points'}:**\n`;
      exp.keyPoints.forEach(point => {
        markdown += `- ${point}\n`;
      });
      markdown += '\n';
    }
    
    if (exp.examples && exp.examples.length > 0) {
      markdown += `**${metadata.language === 'es' ? 'Ejemplos' : 'Examples'}:**\n`;
      exp.examples.forEach(example => {
        markdown += `- ${example}\n`;
      });
      markdown += '\n';
    }
    markdown += '---\n\n';
  });
  
  // Summary Section
  markdown += `## ${metadata.language === 'es' ? 'Resumen Integral' : 'Comprehensive Summary'}\n\n`;
  markdown += `### ${metadata.language === 'es' ? 'Resumen General' : 'Overview'}\n`;
  markdown += `${summary.overview}\n\n`;
  
  markdown += `### ${metadata.language === 'es' ? 'Puntos Clave' : 'Key Takeaways'}\n`;
  summary.keyTakeaways.forEach(takeaway => {
    markdown += `- ${takeaway}\n`;
  });
  markdown += '\n';
  
  markdown += `### ${metadata.language === 'es' ? 'Objetivos de Aprendizaje' : 'Learning Objectives'}\n`;
  summary.learningObjectives.forEach(objective => {
    markdown += `- ${objective}\n`;
  });
  markdown += '\n';
  
  if (summary.nextSteps && summary.nextSteps.length > 0) {
    markdown += `### ${metadata.language === 'es' ? 'Próximos Pasos' : 'Next Steps'}\n`;
    summary.nextSteps.forEach(step => {
      markdown += `- ${step}\n`;
    });
  }
  
  return {
    content: markdown,
    frontmatter: {
      title: metadata.title,
      subject: metadata.subject,
      language: metadata.language,
      difficulty: metadata.difficulty,
      estimatedTime: metadata.estimatedStudyTime,
      generatedAt: metadata.generatedAt
    }
  };
}

/**
 * Transform master content to PDF format (beautiful HTML for PDF generation)
 */
function transformToPDF(master: MasterContent): PDFFormat {
  const { metadata, tableOfContents, questions, explanations, summary } = master;
  
  let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${metadata.title}</title>
  <style>
    body { font-family: 'Inter', sans-serif; line-height: 1.6; color: #333; }
    h1 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #1e40af; margin-top: 30px; }
    h3 { color: #374151; }
    .toc-item { margin-bottom: 10px; }
    .question-box { background: #f8fafc; border-left: 4px solid #3b82f6; padding: 20px; margin: 20px 0; }
    .answer-box { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 10px; }
    .explanation-box { background: #fefce8; border: 1px solid #facc15; padding: 20px; border-radius: 8px; margin: 15px 0; }
    .key-points { background: #f0fdf4; padding: 15px; border-radius: 8px; }
    .summary-box { background: #fdf2f8; border: 1px solid #f472b6; padding: 20px; border-radius: 8px; }
    .metadata { font-size: 0.9em; color: #6b7280; margin-bottom: 30px; }
    .page-break { page-break-before: always; }
  </style>
</head>
<body>
  <h1>${metadata.title}</h1>
  
  <div class="metadata">
    <strong>${metadata.language === 'es' ? 'Tema' : 'Subject'}:</strong> ${metadata.subject || 'General'} |
    <strong>${metadata.language === 'es' ? 'Tiempo de Estudio' : 'Study Time'}:</strong> ${metadata.estimatedStudyTime} |
    <strong>${metadata.language === 'es' ? 'Dificultad' : 'Difficulty'}:</strong> ${metadata.difficulty}
  </div>
  
  <h2>${tableOfContents.title}</h2>
  ${tableOfContents.items.map(item => 
    `<div class="toc-item"><strong>${item.title}</strong>: ${item.description}</div>`
  ).join('')}
  
  <div class="page-break"></div>
  
  <h2>${metadata.language === 'es' ? 'Preguntas de Estudio' : 'Study Questions'}</h2>
  ${questions.map((q, index) => `
    <div class="question-box">
      <h3>${metadata.language === 'es' ? 'Pregunta' : 'Question'} ${index + 1}</h3>
      <p><strong>${q.question}</strong></p>
      <div class="answer-box">
        <strong>${metadata.language === 'es' ? 'Respuesta' : 'Answer'}:</strong><br>
        ${q.answer}
      </div>
    </div>
  `).join('')}
  
  <div class="page-break"></div>
  
  <h2>${metadata.language === 'es' ? 'Explicaciones Detalladas' : 'Detailed Explanations'}</h2>
  ${explanations.map(exp => `
    <div class="explanation-box">
      <h3>${exp.title}</h3>
      <p>${exp.content}</p>
      ${exp.keyPoints.length > 0 ? `
        <div class="key-points">
          <strong>${metadata.language === 'es' ? 'Puntos Clave' : 'Key Points'}:</strong>
          <ul>${exp.keyPoints.map(point => `<li>${point}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>
  `).join('')}
  
  <div class="page-break"></div>
  
  <div class="summary-box">
    <h2>${metadata.language === 'es' ? 'Resumen Integral' : 'Comprehensive Summary'}</h2>
    
    <h3>${metadata.language === 'es' ? 'Resumen General' : 'Overview'}</h3>
    <p>${summary.overview}</p>
    
    <h3>${metadata.language === 'es' ? 'Puntos Clave' : 'Key Takeaways'}</h3>
    <ul>${summary.keyTakeaways.map(takeaway => `<li>${takeaway}</li>`).join('')}</ul>
    
    <h3>${metadata.language === 'es' ? 'Objetivos de Aprendizaje' : 'Learning Objectives'}</h3>
    <ul>${summary.learningObjectives.map(objective => `<li>${objective}</li>`).join('')}</ul>
    
    ${summary.nextSteps && summary.nextSteps.length > 0 ? `
      <h3>${metadata.language === 'es' ? 'Próximos Pasos' : 'Next Steps'}</h3>
      <ul>${summary.nextSteps.map(step => `<li>${step}</li>`).join('')}</ul>
    ` : ''}
  </div>
</body>
</html>`;
  
  return {
    html,
    title: metadata.title,
    metadata
  };
}

/**
 * Main function: Generate all formats from single input
 */
export async function generateAllFormats_OLD(input: MultiFormatInput): Promise<MultiFormatOutput> {
  try {
    console.log('🚀 Multi-Format Generator: Starting generation...');
    
    // Validate input
    const hasTranscript = input.transcript && input.transcript.trim().length > 0;
    const hasPdfText = input.pdfText && input.pdfText.trim().length > 0;
    
    if (!hasTranscript && !hasPdfText) {
      return {
        success: false,
        error: 'Either transcript or PDF text is required',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Step 1: Generate master content structure
    const masterContent = await generateMasterContent(input);
    if (!masterContent) {
      return {
        success: false,
        error: 'Failed to generate master content',
        errorCode: 'MASTER_GENERATION_FAILED'
      };
    }

    // Step 2: Transform to all formats
    const studentDesk = transformToStudentDesk(masterContent);
    const markdown = transformToMarkdown(masterContent);
    const pdf = transformToPDF(masterContent);
    const transcript = input.transcript || input.pdfText || '';

    console.log('✅ Multi-Format Generator: All formats generated successfully', {
      questionsCount: masterContent.questions.length,
      explanationsCount: masterContent.explanations.length,
      tocItems: masterContent.tableOfContents.items.length,
      markdownLength: markdown.content.length,
      htmlLength: pdf.html.length
    });

    return {
      success: true,
      masterContent,
      formats: {
        studentDesk,
        markdown,
        pdf,
        transcript
      }
    };

  } catch (error) {
    console.error('Multi-format generation failed:', error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'GENERATION_ERROR'
    };
  }
}

/**
 * Parse structured markdown response into MasterContent
 */
function parseStructuredResponse(response: string, metadata: { title: string; language: string }): MasterContent | null {
  try {
    const startMarker = '---STUDY_GUIDE_START---';
    const endMarker = '---STUDY_GUIDE_END---';
    
    const startIndex = response.indexOf(startMarker);
    const endIndex = response.indexOf(endMarker);
    
    if (startIndex === -1 || endIndex === -1) {
      console.error('Study guide markers not found');
      return null;
    }
    
    const content = response.substring(startIndex + startMarker.length, endIndex).trim();
    
    // Parse metadata
    const metadataMatch = content.match(/### METADATA\n([\s\S]*?)(?=###|$)/);
    let parsedMetadata = {
      title: metadata.title,
      language: metadata.language,
      subject: 'General',
      difficulty: 'intermediate' as const,
      estimatedStudyTime: '30-45 minutes',
      topicArea: 'Study Guide',
      generatedAt: new Date().toISOString()
    };
    
    if (metadataMatch) {
      const metaLines = metadataMatch[1].split('\n').filter(line => line.trim());
      metaLines.forEach(line => {
        if (line.includes('Subject:')) parsedMetadata.subject = line.split('Subject:')[1].trim();
        if (line.includes('Difficulty:')) parsedMetadata.difficulty = line.split('Difficulty:')[1].trim() as any;
        if (line.includes('Study Time:')) parsedMetadata.estimatedStudyTime = line.split('Study Time:')[1].trim();
      });
    }
    
    // Parse table of contents
    const tocPattern = new RegExp(`### [^\\n]*(?:Tabla de Contenidos|Table of Contents)[^\\n]*\\n((?:- .+\\n?)+)`, 'i');
    const tocMatch = content.match(tocPattern);
    const tableOfContents = {
      title: metadata.language === 'es' ? 'Tabla de Contenidos' : 'Table of Contents',
      items: tocMatch?.[1]?.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map((line, index) => {
          const cleaned = line.replace(/^-\s*/, '').trim();
          const parts = cleaned.split(':');
          return {
            title: parts[0]?.trim() || `Topic ${index + 1}`,
            description: parts[1]?.trim() || 'Description'
          };
        }) || []
    };
    
    // Parse questions and answers
    const questionsPattern = new RegExp(`### [^\\n]*(?:Preguntas de Examen|Study Questions)[^\\n]*\\n([\\s\\S]*?)(?=###|$)`, 'i');
    const questionsMatch = content.match(questionsPattern);
    const questions: any[] = [];
    
    if (questionsMatch) {
      const questionsText = questionsMatch[1];
      const qaPairs = questionsText.match(/Q(\d+):\s*([^\n]+)\nA\1:\s*([^Q]+?)(?=Q\d+|$)/g);
      
      if (qaPairs) {
        qaPairs.forEach((pair, index) => {
          const match = pair.match(/Q(\d+):\s*([^\n]+)\nA\1:\s*([^Q]+)/);
          if (match) {
            questions.push({
              id: `q${index + 1}`,
              question: match[2].trim(),
              answer: match[3].trim(),
              type: 'review', // Default type since we removed difficulty tags
              difficulty: 'intermediate', // Default difficulty
              tags: ['study'],
              section: tableOfContents.items[index % tableOfContents.items.length]?.title
            });
          }
        });
      }
    }
    
    // Parse explanations
    const explanationsPattern = new RegExp(`### [^\\n]*(?:Notas Detalladas|Detailed Notes)[^\\n]*\\n([\\s\\S]*?)(?=###|$)`, 'i');
    const explanationsMatch = content.match(explanationsPattern);
    const explanations: any[] = [];
    
    if (explanationsMatch) {
      const explanationsText = explanationsMatch[1];
      const sections = explanationsText.match(/SECTION:\s*([^\n]+)\nCONTENT:\s*([^K]+?)KEY_POINTS:\s*([^\n]+)/g);
      
      if (sections) {
        sections.forEach((section, index) => {
          const match = section.match(/SECTION:\s*([^\n]+)\nCONTENT:\s*([^K]+?)KEY_POINTS:\s*([^\n]+)/);
          if (match) {
            explanations.push({
              id: `exp${index + 1}`,
              title: match[1].trim(),
              content: match[2].trim(),
              keyPoints: match[3].split('|').map(p => p.trim()).filter(p => p),
              section: tableOfContents.items[index % tableOfContents.items.length]?.title
            });
          }
        });
      }
    }
    
    // Parse summary
    const summaryPattern = new RegExp(`### [^\\n]*(?:Resumen|Summary)[^\\n]*\\n([\\s\\S]*?)$`, 'i');
    const summaryMatch = content.match(summaryPattern);
    let summary = {
      overview: 'No summary available',
      keyTakeaways: [] as string[],
      learningObjectives: [] as string[],
      nextSteps: [] as string[]
    };
    
    if (summaryMatch) {
      const summaryText = summaryMatch[1];
      
      const overviewMatch = summaryText.match(/OVERVIEW:\s*([^K]+?)(?=KEY_TAKEAWAYS|LEARNING_OBJECTIVES|$)/);
      if (overviewMatch) summary.overview = overviewMatch[1].trim();
      
      const takeawaysMatch = summaryText.match(/KEY_TAKEAWAYS:\s*([^L]+?)(?=LEARNING_OBJECTIVES|$)/);
      if (takeawaysMatch) {
        summary.keyTakeaways = takeawaysMatch[1].split('|').map(t => t.trim()).filter(t => t);
      }
      
      const objectivesMatch = summaryText.match(/LEARNING_OBJECTIVES:\s*([^$]+)/);
      if (objectivesMatch) {
        summary.learningObjectives = objectivesMatch[1].split('|').map(o => o.trim()).filter(o => o);
      }
    }
    
    const masterContent: MasterContent = {
      metadata: parsedMetadata,
      tableOfContents,
      questions,
      explanations,
      summary,
      originalTranscript: response.substring(0, 1000) + '...'
    };
    
    console.log('✅ Parsed structured content:', {
      questionsCount: questions.length,
      explanationsCount: explanations.length,
      tocItems: tableOfContents.items.length
    });
    
    return masterContent;
    
  } catch (error) {
    console.error('Error parsing structured response:', error);
    return null;
  }
}