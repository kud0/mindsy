import OpenAI from 'openai';
import { config } from './config';
import { getLanguageTermsFromText } from './language-utils';

// Initialize OpenAI client with API key from configuration - keep it simple
const openai = new OpenAI({
  apiKey: config.openaiKey,
});

// Export the OpenAI client for use in other modules
export { openai };

// No markdown needed - we only work with JSON

export interface MindsyNotesInput {
  transcript?: string;
  pdfText?: string;
  lectureTitle?: string;
  courseSubject?: string;
  detectedLanguage?: string;
  formatMode?: 'cornell-notes' | 'clean-document' | 'student-desk'; // Extended flag for formatting mode
}

export interface CornellNotesOutput {
  success: boolean;
  masterContent?: {
    metadata: any;
    tableOfContents: any;
    questions: any[];
    explanations: any[];
    summary: any;
  };
  error?: string;
  errorCode?: string;
}

export interface StudentDeskOutput {
  success: boolean;
  content?: {
    metadata: {
      title: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      estimatedTime: string;
      subjectDomain: string;
      examImportance: 'low' | 'medium' | 'high';
    };
    overview: {
      mainTopic: string;
      keyObjectives: string[];
      coreConceptsList: string[];
    };
    questions: Array<{
      id: string;
      type: 'multiple-choice' | 'true-false' | 'fill-number';
      question?: string;
      difficulty?: 'easy' | 'medium' | 'hard';
      points?: number;
      hint?: string;
      feedback?: string;
      // Multiple choice specific
      choices?: string[];
      correctAnswer?: number;
      // True/false specific
      statement?: string;
      correctAnswer?: boolean;
      // Fill number specific
      template?: string;
      answer?: number;
      acceptableRange?: [number, number];
      unit?: string;
    }>;
    explanations: Array<{
      id: string;
      concept: string;  // MUST be specific (e.g., "Estructura del Esqueleto Axial")
      introduction: string;  // Opening paragraph explaining the concept
      sections?: Array<{
        heading: string;
        content: string;  // Paragraph content
        points?: string[];  // Optional bullet points after content
      }>;
      importance: 'high' | 'medium' | 'low';
      example?: string;
    }>;
    summary: {
      essentialPoints: string[];
      examFocus: {
        mustKnow: string[];
        likelyQuestions: string[];
      };
    };
    engagement: {
      quizMetrics: {
        totalQuestions: number;
        totalPoints: number;
        passingScore: number;
      };
      achievements: Array<{
        id: string;
        name: string;
        points: number;
      }>;
    };
  };
  error?: string;
  errorCode?: string;
}

// Removed old streaming functions - now using SSE approach

export interface LightFormattingInput {
  content: string;
  title?: string;
  preservationLevel?: 'verbatim' | 'light';
}

export interface LightFormattingOutput {
  success: boolean;
  notes?: string;
  error?: string;
  errorCode?: string;
}


/**
 * Create JSON-focused prompt for generateMindsyNotes
 */
function createJSONPrompt(input: MindsyNotesInput): string {
  const { transcript, pdfText, lectureTitle, detectedLanguage } = input;
  
  // Get language-specific terms
  const textForLanguageDetection = transcript || pdfText || '';
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);
  
  const content = transcript || pdfText || '';
  const title = lectureTitle || 'Study Session';
  
  // Use full content - no truncation needed
  const truncatedContent = content;
  
  return `Transform this content into a comprehensive study guide. Return a JSON object with this EXACT structure:

## Content to Transform:
**Title:** ${title}
**Content:** ${truncatedContent}

## Language Instructions:
Use ${language} consistently throughout. Use these terms:
- Table of Contents = "${terms.tableOfContents}"
- Questions = "${terms.cueColumn}"
- Explanations = "${terms.detailedNotes}"  
- Summary = "${terms.comprehensiveSummary}"

## Required JSON Output Format:
{
  "metadata": {
    "title": "${title}",
    "subject": "Extract subject area from content",
    "language": "${language}",
    "estimatedStudyTime": "Estimate in minutes",
    "difficulty": "beginner|intermediate|advanced",
    "topicArea": "Main topic area",
    "generatedAt": "${new Date().toISOString()}"
  },
  "tableOfContents": {
    "title": "${terms.tableOfContents}",
    "items": [
      {
        "title": "Main Topic 1",
        "description": "Brief description"
      }
    ]
  },
  "questions": [
    {
      "id": "q1",
      "question": "Complete question testing understanding?",
      "answer": "Clear explanation with key points and practical applications",
      "type": "concept|definition|application|review",
      "difficulty": "basic|intermediate|advanced",
      "tags": ["relevant", "tags"],
      "section": "Related topic section"
    }
  ],
  "explanations": [
    {
      "id": "exp1",
      "title": "Core Concepts",
      "content": "Detailed explanation of main ideas and principles",
      "keyPoints": ["Key insight 1", "Important principle 2"],
      "examples": ["Practical example", "Real-world application"],
      "section": "Main Topic 1"
    }
  ],
  "summary": {
    "overview": "Comprehensive overview in 2-3 paragraphs",
    "keyTakeaways": [
      "Main learning point 1",
      "Essential insight 2",
      "Important conclusion 3"
    ],
    "learningObjectives": [
      "What students should understand",
      "Skills they should develop",
      "Knowledge they should retain"
    ],
    "nextSteps": [
      "Suggested follow-up topics",
      "Practice recommendations"
    ]
  }
}

## Generation Requirements:
1. Create appropriate number of questions based on content depth and complexity (QUALITY OVER QUANTITY - no forced numbers)
2. Create questions for each important matter in the content
3. Use clear, factual answers with key points and practical applications
4. Bold important technical terms within content
5. Use ${language} consistently throughout
6. Return ONLY the JSON object, no additional text`;
}


/**
 * Generate Mindsy Notes from transcript and optional PDF text using OpenAI
 * Combines transcript and PDF content into structured Mindsy Notes format
 */
export async function generateMindsyNotes(input: MindsyNotesInput): Promise<CornellNotesOutput> {
  try {
    // Validate input - require either transcript OR pdfText
    const hasTranscript = input.transcript && input.transcript.trim().length > 0;
    const hasPdfText = input.pdfText && input.pdfText.trim().length > 0;
    
    if (!hasTranscript && !hasPdfText) {
      return {
        success: false,
        error: 'Either transcript (for audio) or pdfText (for documents) is required',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Create JSON-focused prompt
    const prompt = createJSONPrompt(input);

    // Call OpenAI API with JSON mode - no timeout, let OpenAI finish naturally
    console.log('🤖 OpenAI API: No timeout - letting OpenAI finish naturally');
    console.log('📤 Sending request to OpenAI...');
    
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a world-class academic assistant and instructional designer with expertise in cognitive science and learning psychology. Your mission is to create comprehensive, standalone study guides that maximize learning retention and exam success. You combine the depth of a university professor with the clarity of an expert tutor, creating educational content that helps students master complex topics through structured, scientifically-informed approaches to knowledge organization and retrieval practice.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 30000
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ OpenAI API request successful in ${elapsed}ms`);

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return {
        success: false,
        error: 'OpenAI API returned empty response',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    // Parse JSON response
    let masterContent;
    try {
      masterContent = JSON.parse(generatedContent);
      console.log('✅ OpenAI JSON parsed successfully', {
        hasMetadata: !!masterContent.metadata,
        hasQuestions: !!masterContent.questions,
        hasExplanations: !!masterContent.explanations,
        hasSummary: !!masterContent.summary
      });
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI JSON response:', parseError);
      console.error('📄 Raw response:', generatedContent?.substring(0, 200) + '...');
      return {
        success: false,
        error: 'Failed to parse JSON response from OpenAI',
        errorCode: 'JSON_PARSE_ERROR'
      };
    }

    return {
      success: true,
      masterContent: masterContent
    };

  } catch (error) {
    console.error('OpenAI API error:', error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `OpenAI API error: ${error.message}`,
        errorCode: 'OPENAI_API_ERROR'
      };
    }

    // Handle authentication errors
    if (error instanceof OpenAI.AuthenticationError) {
      return {
        success: false,
        error: 'OpenAI authentication failed - check API key',
        errorCode: 'AUTHENTICATION_ERROR'
      };
    }

    // Handle rate limit errors
    if (error instanceof OpenAI.RateLimitError) {
      return {
        success: false,
        error: 'OpenAI rate limit exceeded - please try again later',
        errorCode: 'RATE_LIMIT_ERROR'
      };
    }

    // Handle generic errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Generate structured content for StudentDesk v2 interface
 * Creates comprehensive interactive learning materials with proper question types and explanations
 */
export async function generateStudentDeskContent(input: MindsyNotesInput): Promise<StudentDeskOutput> {
  try {
    // Validate input - require either transcript OR pdfText
    const hasTranscript = input.transcript && input.transcript.trim().length > 0;
    const hasPdfText = input.pdfText && input.pdfText.trim().length > 0;
    
    if (!hasTranscript && !hasPdfText) {
      return {
        success: false,
        error: 'Either transcript (for audio) or pdfText (for documents) is required',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Create StudentDesk-specific prompt
    const prompt = createStudentDeskPrompt(input);

    console.log('🤖 OpenAI API: Generating StudentDesk content with structured format');
    console.log('📤 Sending request to OpenAI...');
    
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a world-class educational AI assistant specialized in creating interactive study materials and comprehensive learning experiences. Your expertise lies in cognitive science, instructional design, and creating content that maximizes student engagement and learning retention through structured, scientifically-informed approaches.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 35000
    });
    
    const elapsed = Date.now() - startTime;
    console.log(`✅ OpenAI API request successful in ${elapsed}ms`);

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return {
        success: false,
        error: 'OpenAI API returned empty response',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    // Parse JSON response
    let studentDeskContent;
    try {
      studentDeskContent = JSON.parse(generatedContent);
      
      // Auto-calculate engagement metrics from questions
      if (studentDeskContent.questions && Array.isArray(studentDeskContent.questions)) {
        const totalQuestions = studentDeskContent.questions.length;
        const totalPoints = studentDeskContent.questions.reduce((sum: number, q: any) => sum + (q.points || 10), 0);
        const passingScore = Math.floor(totalPoints * 0.7);
        
        if (studentDeskContent.engagement && studentDeskContent.engagement.quizMetrics) {
          studentDeskContent.engagement.quizMetrics.totalQuestions = totalQuestions;
          studentDeskContent.engagement.quizMetrics.totalPoints = totalPoints;
          studentDeskContent.engagement.quizMetrics.passingScore = passingScore;
        }
      }
      
      console.log('✅ StudentDesk JSON parsed successfully', {
        hasMetadata: !!studentDeskContent.metadata,
        hasOverview: !!studentDeskContent.overview,
        questionsCount: studentDeskContent.questions?.length || 0,
        explanationsCount: studentDeskContent.explanations?.length || 0,
        hasSummary: !!studentDeskContent.summary,
        hasEngagement: !!studentDeskContent.engagement
      });
    } catch (parseError) {
      console.error('❌ Failed to parse StudentDesk JSON response:', parseError);
      console.error('📄 Raw response:', generatedContent?.substring(0, 200) + '...');
      return {
        success: false,
        error: 'Failed to parse JSON response from OpenAI',
        errorCode: 'JSON_PARSE_ERROR'
      };
    }

    return {
      success: true,
      content: studentDeskContent
    };

  } catch (error) {
    console.error('StudentDesk generation error:', error);

    // Handle specific OpenAI errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `OpenAI API error: ${error.message}`,
        errorCode: 'OPENAI_API_ERROR'
      };
    }

    // Handle authentication errors
    if (error instanceof OpenAI.AuthenticationError) {
      return {
        success: false,
        error: 'OpenAI authentication failed - check API key',
        errorCode: 'AUTHENTICATION_ERROR'
      };
    }

    // Handle rate limit errors
    if (error instanceof OpenAI.RateLimitError) {
      return {
        success: false,
        error: 'OpenAI rate limit exceeded - please try again later',
        errorCode: 'RATE_LIMIT_ERROR'
      };
    }

    // Handle generic errors
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

// Removed generateMindsyNotesWithStreaming - now using SSE approach



/**
 * Process generated Mindsy Notes content to remove unwanted sections
 * Ensures content flows directly from cue column to detailed notes
 */
function processGeneratedContent(content: string): string {
  if (!content) return content;

  // Remove any references to "Note-Taking Area" sections
  let processedContent = content
    // Remove "Note-Taking Area" headers (case insensitive, multiple languages)
    .replace(/###?\s*Note[-\s]*Taking\s*Area\s*/gi, '')
    .replace(/###?\s*Área\s*de\s*Toma\s*de\s*Notas\s*/gi, '')
    .replace(/###?\s*Zone\s*de\s*Prise\s*de\s*Notes\s*/gi, '')
    // Remove any standalone "Note-Taking Area" references
    .replace(/\*\*Note[-\s]*Taking\s*Area\*\*/gi, '')
    .replace(/\*\*Área\s*de\s*Toma\s*de\s*Notas\*\*/gi, '')
    .replace(/\*\*Zone\s*de\s*Prise\s*de\s*Notes\*\*/gi, '')
    // Clean up any double line breaks that might result from removals
    .replace(/\n\n\n+/g, '\n\n')
    // Ensure proper spacing around sections
    .replace(/(\n---\n)/g, '\n\n---\n\n');

  // Ensure cue column items are properly formatted for table layout
  processedContent = formatCueColumnForTable(processedContent);

  return processedContent.trim();
}

/**
 * Format cue column content to be optimized for table layout
 * Ensures each cue item is concise and properly structured
 */
function formatCueColumnForTable(content: string): string {
  // Find the Cue Column section
  const cueColumnMatch = content.match(/(### Cue Column[\s\S]*?)(?=### |$)/);

  if (!cueColumnMatch) return content;

  const cueColumnSection = cueColumnMatch[1];
  const beforeCueColumn = content.substring(0, cueColumnMatch.index!);
  const afterCueColumn = content.substring(cueColumnMatch.index! + cueColumnSection.length);

  // Process cue column items to ensure they're table-friendly
  const processedCueColumn = cueColumnSection
    // Ensure bullet points are properly formatted
    .replace(/^\s*[-*+]\s*/gm, '*   ')
    // Remove any overly long cue items (split them if needed)
    .replace(/\*\s+(.{100,})/g, (match, longItem) => {
      // If a cue item is too long, try to split it at a natural break
      const splitPoint = longItem.indexOf('?');
      if (splitPoint > 20 && splitPoint < 80) {
        return `*   ${longItem.substring(0, splitPoint + 1)}\n*   ${longItem.substring(splitPoint + 1).trim()}`;
      }
      return match;
    });

  return beforeCueColumn + processedCueColumn + afterCueColumn;
}

/**
 * Create structured prompt template for the new improved study guide format
 * Generates: Table of Contents → Study Questions → Detailed Explanations → Summary
 * Uses language-aware terms for headings
 */
function createCornellNotesPrompt(input: MindsyNotesInput): string {
  const { transcript, pdfText, lectureTitle, detectedLanguage } = input;
  
  // Get language-specific terms from transcript or pdfText
  const textForLanguageDetection = transcript || pdfText || '';
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);
  console.log(`Using language-specific terms for ${language}:`, terms);
  
  const prompt = `You are a world-class academic assistant and instructional designer. Your mission is to create a comprehensive, standalone study guide from the provided lecture content. The output must be perfectly structured in Markdown that functions as the ultimate study companion for academic success.

**CRITICAL RULE:** The entire document you generate, including all headings, questions, explanations, and summary, MUST be in the same language as the content you are given (${language}).

**RELEVANCE FILTERING RULES (Apply Objectively):**
- Focus only on educational content related to the core topic. Include explanations, examples, scientific references, and practical applications.
- If the speaker discusses personal experiences or background:
  - EXCLUDE if it is not relevant to the studies (e.g., unrelated personal anecdotes, off-topic hobbies, or self-promotion without educational tie-in).
  - To decide: Check if the personal content provides objective value like evidence, case studies, or insights that enhance understanding of the topic. If the lecture's main focus is the speaker's experiences and they're educationally relevant, include them.

---

**STEP-BY-STEP INSTRUCTIONS:**

1. **Create a ${terms.tableOfContents}:** First, generate a "${terms.tableOfContents}" section. This must be a bulleted list of the main topics and sub-topics covered in the lecture, in chronological order. This provides a high-level overview.

2. **Generate Study Questions:**
   - Create insightful study questions formatted as a structured list suitable for exam preparation
   - Generate exam-style questions that test understanding of key concepts
   - These should be the types of questions students will likely encounter on their exams
   - Include important terms **bolded** and focus on critical thinking questions that require comprehension, not just memorization
   - Each question should be concise and exam-focused
   - Examples of excellent questions:
     * What is the primary function of the **Plantar Fascia** and how does it contribute to locomotion?
     * Compare and contrast the **subtalar** and **talocrural** joints in terms of movement and function.
     * Explain the biomechanical difference between **pronation** and **supination** during gait.
     * Which anatomical structures are responsible for **force distribution** in the foot?
     * Describe the **windlass mechanism** and its clinical significance.

3. **Generate Detailed Explanations:**
   - For each study question, write detailed, well-structured explanations that flow directly from the questions
   - Synthesize information from the transcript and PDF
   - Use bullet points, sub-bullets, and bold text to create a clear hierarchy
   - **Crucially, explain all concepts as if you are teaching them to someone who missed the lecture entirely**
   - Define terms and provide necessary context
   - Example format:
     #### Primary function of the **Plantar Fascia**
     * The Plantar Fascia is a thick connective tissue band that runs across the bottom of the foot...
     * Its main roles include:
       * Supporting the medial longitudinal arch
       * Absorbing shock during activities like walking and running

4. **Generate the ${terms.comprehensiveSummary}:** 
   - After the detailed explanations, write the "${terms.comprehensiveSummary}"
   - **Objective:** This summary MUST function as a standalone study guide. A student should be able to read this section alone and understand all the critical concepts, their connections, and the main conclusions of the lecture.
   - **Style:** Use a clear, academic, **Expository Style**, like a paper. Write in full, well-structured paragraphs.
   - **Content:** Define key terms, explain processes, and synthesize the information. Do not just list facts; explain the "why" and "how" that connect them. The summary must be substantial and detailed.

---

**INPUT CONTENT:**
**Lecture Title:** ${lectureTitle}
**Language:** ${language}

${transcript ? `**Transcript:**\n${transcript}\n` : ''}
${pdfText ? `**Document Text:**\n${pdfText}` : ''}

---

**REQUIRED OUTPUT FORMAT (Follow this structure exactly):**

## ${terms.tableOfContents}
<!-- Generate a bulleted list of the main topics here. -->
*   Topic 1
*   Topic 2
    *   Sub-topic 2.1
*   Topic 3
...

---

## Study Questions
<!-- Generate exam-style questions that test understanding of key concepts. Focus on what students will likely see on exams. -->

1. What is the primary function of the **[Key Term]** and how does it contribute to [relevant process]?
2. Compare and contrast **[Concept A]** and **[Concept B]** in terms of [specific criteria].
3. Explain the [mechanism/process] and its [clinical/practical] significance.
4. Which [structures/elements] are responsible for **[key function]** in [context]?
5. Describe the **[important concept]** and its implications for [application].
...

<!-- NEW_PAGE -->

---

## Detailed Explanations
<!-- Generate the detailed, explanatory content corresponding to each study question here. Content flows directly from questions without intermediate sections. -->

### Answer 1: [Restate the first question]
*   [Clear, comprehensive explanation that teaches the concept from scratch]
*   [Key points with bullet structure]:
    *   [Supporting details and examples]
    *   [Real-world applications or connections]
*   **[Important terms defined and bolded]**
*   [Additional context and connections to broader themes]

### Answer 2: [Restate the second question]
*   [Detailed comparison or analysis]
*   [Structured breakdown of concepts]:
    *   [Specific examples and evidence]
    *   [Practical implications]
*   [Connections to other topics covered]

[...continue with detailed explanations for ALL questions]

<!-- NEW_PAGE -->

---

## ${terms.comprehensiveSummary}
<!-- Generate the detailed, multi-paragraph expository summary here, written in the detected language. This must function as a standalone study guide that synthesizes all key concepts, shows relationships, and provides comprehensive understanding. -->

`;
  return prompt;
}

/**
 * Create structured prompt for StudentDesk v2 interface
 * Generates content for 6-tab layout: Overview, Questions, Explanations, Summary, Study Time, Materials
 */
function createStudentDeskPrompt(input: MindsyNotesInput): string {
  const { transcript, pdfText, lectureTitle, detectedLanguage } = input;
  
  // Get language-specific terms
  const textForLanguageDetection = transcript || pdfText || '';
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);
  
  const content = transcript || pdfText || '';
  const title = lectureTitle || 'Study Session';
  
  return `You are a world-class educational AI assistant specialized in creating interactive study materials. Transform this content into a comprehensive StudentDesk learning experience with structured content for multiple study modes.

## Content to Transform:
**Title:** ${title}
**Content:** ${content}

## Language Instructions:
Use ${language} consistently throughout all content.

## Required JSON Output Format:
{
  "metadata": {
    "title": "${title}",
    "difficulty": "beginner|intermediate|advanced",
    "estimatedTime": "Estimate study time (e.g., '45 minutes')",
    "subjectDomain": "Main subject area from content",
    "examImportance": "low|medium|high"
  },
  "overview": {
    "mainTopic": "Concise overview of the main topic in 2-3 sentences",
    "keyObjectives": [
      "Learning objective 1",
      "Learning objective 2",
      "Learning objective 3"
    ],
    "coreConceptsList": [
      "Core concept 1",
      "Core concept 2", 
      "Core concept 3"
    ]
  },
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "What is the primary function of [key concept]?",
      "choices": [
        "Correct answer with clear description",
        "Plausible distractor based on common misconception A",
        "Plausible distractor based on common misconception B",
        "Plausible distractor based on related but incorrect concept"
      ],
      "correctAnswer": 0,
      "difficulty": "medium",
      "points": 10,
      "hint": "Think about the core purpose and how it relates to [related concept]",
      "feedback": "The correct answer is A because [explanation]. Many students confuse this with [common mistake], but the key difference is [clarification]."
    },
    {
      "id": "q2",
      "type": "true-false",
      "statement": "[Subject] always results in [outcome] when [condition] is present",
      "correctAnswer": true,
      "difficulty": "easy",
      "points": 5,
      "hint": "Consider what happens in [specific scenario]",
      "feedback": "This statement is TRUE because [explanation of the relationship]. This is a fundamental principle in [topic area]."
    },
    {
      "id": "q3",
      "type": "fill-number",
      "question": "Based on the lecture, what was the [measurement/value/year]?",
      "template": "The [measurement] is ___ [units]",
      "answer": 42,
      "acceptableRange": [40, 44],
      "unit": "units",
      "difficulty": "medium",
      "points": 15,
      "hint": "This value was mentioned when discussing [context]. Consider the [relevant formula or relationship]",
      "feedback": "The correct answer is 42 units. This is calculated by [step-by-step explanation]. The acceptable range accounts for rounding."
    },
    {
      "id": "q4",
      "type": "multiple-choice",
      "question": "Which of the following best describes [concept]?",
      "choices": [
        "Accurate and complete definition",
        "Partially correct but missing key element",
        "Common misconception",
        "Confusing with similar but distinct concept"
      ],
      "correctAnswer": 0,
      "difficulty": "hard",
      "points": 15,
      "hint": "Pay attention to the distinction between [X] and [Y]",
      "feedback": "Option A is correct because [detailed explanation]. Option B is tempting but misses [key element]. Options C and D are common mistakes."
    }
  ],
  "explanations": [
    {
      "id": "exp1",
      "concept": "Estructura del Esqueleto Axial",
      "introduction": "El esqueleto axial incluye el cráneo, la columna vertebral y la pelvis. Su función principal es proteger y estabilizar el cuerpo, aunque también permite cierta movilidad. A diferencia de otras articulaciones, como las del hombro, que priorizan la movilidad, el esqueleto axial se caracteriza por su estabilidad.",
      "sections": [
        {
          "heading": "Características del Cráneo",
          "content": "El cráneo es principalmente una estructura protectora, diseñada para resguardar el cerebro. Aunque tiene algo de movilidad en la mandíbula, su función principal es la protección."
        },
        {
          "heading": "Movimientos de la Columna Vertebral",
          "content": "Los movimientos de la columna vertebral incluyen varios tipos de desplazamientos que permiten la flexibilidad del tronco.",
          "points": [
            "Flexión: Inclinación del tronco hacia adelante, permitiendo doblar la espalda",
            "Extensión: Inclinación hacia atrás, arqueando la columna en dirección opuesta",
            "Rotación: Giro del tronco, que ocurre principalmente en la articulación atlanto-occipital"
          ]
        },
        {
          "heading": "Importancia Funcional",
          "content": "El esqueleto axial cumple funciones críticas en la protección de órganos vitales y en el soporte estructural del cuerpo humano."
        }
      ],
      "importance": "high",
      "example": "Durante la marcha, la columna vertebral actúa como un sistema de absorción de impactos mientras permite el movimiento coordinado del tronco."
    }
  ],

CRITICAL RULES FOR EXPLANATIONS (READ CAREFULLY):

1. FORBIDDEN - DO NOT USE THESE:
   ❌ "Key Concept"
   ❌ "Core Concept"
   ❌ "Important Topic"
   ❌ "Concept 1", "Concept 2"
   ❌ "Detailed explanation coming soon"
   ❌ Any placeholder or generic text

2. REQUIRED - YOU MUST USE:
   ✅ Specific concept names from the actual lecture content
   ✅ Real explanations with full paragraphs
   ✅ The NEW schema with "introduction" and "sections" fields
   ✅ DO NOT use old "explanation" or "keyPoints" fields

3. SCHEMA STRUCTURE:
   {
     "concept": "SPECIFIC NAME FROM LECTURE",
     "introduction": "FULL PARAGRAPH explaining the concept",
     "sections": [
       {
         "heading": "Specific Subsection Name",
         "content": "Full paragraph of explanation",
         "points": ["Optional", "Bullet", "Points"]
       }
     ],
     "importance": "high|medium|low",
     "example": "Real-world example"
   }
  "summary": {
    "essentialPoints": [
      "Most critical point for exam success",
      "Key insight that ties concepts together",
      "Important practical application"
    ],
    "examFocus": {
      "mustKnow": [
        "Essential concept 1 for exams",
        "Critical formula or principle",
        "Key terminology with definitions"
      ],
      "likelyQuestions": [
        "Probable exam question format 1",
        "Expected essay topic or analysis question",
        "Common application problem type"
      ]
    }
  },
  "engagement": {
    "quizMetrics": {
      "totalQuestions": "Auto-calculated from questions array",
      "totalPoints": "Sum of all question points",
      "passingScore": "70% of total points"
    },
    "achievements": [
      {
        "id": "ach1",
        "name": "Concept Master",
        "points": 50
      }
    ]
  }
}

## Content Generation Requirements:

1. **Overview Tab Content:**
   - Write mainTopic as a clear, engaging introduction to the subject
   - Create 3-5 specific learning objectives students will achieve
   - List the core concepts that form the foundation of understanding (determine the appropriate number based on lecture complexity and length)

2. **Questions Tab Content:**
   - Determine the optimal number of questions based on lecture content and complexity:
     * Short lectures (10-20 min): 8-12 questions
     * Medium lectures (20-40 min): 12-18 questions
     * Long/complex lectures (40+ min): 18-25 questions
   - Question type distribution (maintain balance):
     * 60% Multiple choice - ideal for conceptual understanding
     * 25% True/False - good for quick fact checking
     * 15% Fill-number - perfect for calculations and specific values
   - Ensure questions test different cognitive levels: recall, comprehension, application, analysis
   - Multiple choice: Create 4 realistic options with plausible distractors based on common misconceptions
   - True/False: Write clear, unambiguous statements that test understanding, not trick questions
   - Fill-number: Include calculations, percentages, dates, or specific quantitative values from content
   - Each question MUST include:
     * A helpful hint that guides without giving away the answer
     * Detailed feedback explaining why the answer is correct and addressing common mistakes
     * Appropriate difficulty level (easy/medium/hard) and point values

3. **Explanations Tab Content (RICH FORMAT REQUIRED):**

   🚨 CRITICAL SCHEMA REQUIREMENTS 🚨

   YOU MUST USE THIS EXACT SCHEMA - DO NOT DEVIATE:
   {
     "concept": "Specific concept name from lecture",
     "introduction": "Opening paragraph (NOT 'explanation' field!)",
     "sections": [
       {
         "heading": "Subsection name",
         "content": "Paragraph content",
         "points": ["Optional bullets"]
       }
     ],
     "importance": "high|medium|low",
     "example": "Real-world example"
   }

   ❌ FORBIDDEN - DO NOT USE THESE FIELDS:
   - "explanation" (OLD SCHEMA - DO NOT USE!)
   - "keyPoints" (OLD SCHEMA - DO NOT USE!)
   - Generic names like "Key Concept", "Core Concept", "Concept 1"

   ✅ REQUIRED - YOU MUST USE:
   - "introduction" field (paragraph text)
   - "sections" array with objects containing "heading", "content", "points"
   - Specific concept names from the actual lecture

   CONTENT REQUIREMENTS:
   - Analyze the lecture content and determine the optimal number of detailed explanations needed:
     * Short lectures (10-20 min): 3-5 explanations for key concepts
     * Medium lectures (20-40 min): 5-10 explanations
     * Long/complex lectures (40+ min): 10-15+ explanations
   - Choose concepts based on importance, complexity, and exam relevance
   - Each explanation MUST have a SPECIFIC, DESCRIPTIVE concept name
     * ✅ GOOD: "Estructura del Esqueleto Axial", "Photosynthesis Process", "Newton's Second Law"
     * ❌ BAD: "Key Concept", "Core Concept", "Concept 1", "Important Topic"
   - Each section needs "heading" (specific subsection name), "content" (paragraph), and optional "points" (bullets)
   - Mix paragraphs and bullet points naturally (like a well-written textbook)
   - Write as if teaching someone who missed the lecture entirely
   - Provide practical examples in the "example" field
   - Assign importance levels: high (exam-critical), medium (important supporting), low (supplementary)

4. **Summary Tab Content:**
   - Identify 4-6 essential points that capture the core learning
   - Create comprehensive exam focus section with must-know concepts
   - Generate likely exam questions based on content emphasis and complexity
   - Ensure summary serves as effective review material

5. **Engagement Metrics:**
   - Calculate quiz metrics based on generated questions
   - Create meaningful achievement milestones related to content mastery

## Quality Standards:
- All content must be in ${language}
- Questions should be exam-quality with clear, unambiguous answers
- Explanations must be detailed enough for independent learning
- Use bold text for **key terms** and important concepts
- Ensure content flows logically and builds understanding progressively
- Generate an appropriate number of questions based on lecture length and complexity (prioritize quality over hitting arbitrary numbers)
- Multiple choice distractors should be plausible but clearly wrong to an informed student
- All questions must have both hints and detailed feedback
- Return ONLY the JSON object, no additional text

Generate the structured content now:`;
}

/**
 * Create a prompt for clean document formatting (Store Notes mode)
 * Focuses on readability and structure without Mindsy Notes format
 */
function createCleanDocumentPrompt(input: MindsyNotesInput): string {
  const { pdfText, lectureTitle, detectedLanguage } = input;
  
  // Get language-specific terms from the text
  const textForLanguageDetection = pdfText || '';
  const { language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);
  
  const prompt = `You are a professional document formatter specializing in creating clean, readable documents. Your task is to take raw extracted text and format it into a well-structured Markdown document while preserving ALL original content.

**CRITICAL RULES:**
- PRESERVE ALL CONTENT: Do not remove, summarize, or change any information
- KEEP EXACT WORDING: Maintain the author's original phrasing and terminology
- ONLY IMPROVE FORMATTING: Add structure, fix spacing, and organize content
- USE PROPER MARKDOWN: Apply correct heading hierarchy, lists, and formatting
- MAINTAIN LANGUAGE: Use the same language as the source content (${language})

**FORMATTING IMPROVEMENTS TO APPLY:**
1. **Title Structure**: Use the provided title "${lectureTitle}" as the main H1 heading
2. **Text Artifact Removal**: Replace ALL plus signs (+) with proper spaces (e.g., "Introduction+to+OM" → "Introduction to OM")
3. **Spacing Cleanup**: Fix spacing issues, remove excessive line breaks, and add proper word separation
4. **Section Headers**: Identify natural content sections and create appropriate H2/H3 headings  
5. **List Formatting**: Convert informal lists to proper Markdown bullet points or numbered lists
6. **Emphasis**: Use **bold** for important terms and *italic* for emphasis where appropriate
7. **Paragraph Structure**: Organize content into logical paragraphs with proper spacing

**CONTENT TO PROCESS:**
${pdfText}

**OUTPUT REQUIREMENTS:**
- Generate a clean, professional Markdown document
- Maintain 100% of the original information
- Improve readability while preserving meaning
- Use proper Markdown syntax throughout
- Ensure the document flows logically from start to finish

Format the content now, keeping every piece of information while making it beautifully readable:`;

  return prompt;
}



/**
 * Validate OpenAI API key configuration
 * Used for health checks and debugging
 */
export function validateOpenAIConfig(): { valid: boolean; error?: string } {
  const apiKey = config.openaiKey;

  if (!apiKey) {
    return {
      valid: false,
      error: 'OPENAI_KEY environment variable is not set'
    };
  }

  if (!apiKey.startsWith('sk-')) {
    return {
      valid: false,
      error: 'OPENAI_KEY appears to be invalid (should start with sk-)'
    };
  }

  return { valid: true };
}

/**
 * Apply light formatting to text content
 * Uses a cheaper model (GPT-4o-mini) for basic structural formatting
 * @param input - Content and formatting preferences
 * @returns Formatted content with minimal AI processing
 */
export async function applyLightFormatting(input: LightFormattingInput): Promise<LightFormattingOutput> {
  try {
    const { content, title, preservationLevel = 'light' } = input;

    if (!content || content.trim().length === 0) {
      return {
        success: false,
        error: 'No content provided for formatting',
        errorCode: 'EMPTY_CONTENT'
      };
    }

    const systemPrompt = preservationLevel === 'verbatim' 
      ? `You are a document formatter. Your task is to take raw text and format it into clean Markdown with NO content changes whatsoever.

CRITICAL RULES:
- DO NOT change, rephrase, or summarize ANY content
- DO NOT add new information or explanations
- ONLY add basic Markdown formatting for structure
- Preserve exact wording, even if informal or contains errors

Apply ONLY these formatting improvements:
1. Add title as H1 (# Title) if provided
2. Identify natural sections and make them H2 (## Section)
3. Convert lists to proper bullet points or numbered lists
4. Format code snippets with backticks
5. Add emphasis (*italic*) or strong (**bold**) for existing emphasis
6. Preserve paragraph breaks and line spacing

Output clean Markdown that preserves the original content exactly.`
      
      : `You are a document formatter. Your task is to take raw text and format it into well-structured Markdown with minimal content changes.

RULES:
- Keep 95%+ of original content unchanged
- Fix only obvious typos or formatting issues
- Add logical structure and formatting
- DO NOT summarize or remove information
- Keep the author's voice and style

Apply these formatting improvements:
1. Add title as H1 (# Title) if provided  
2. Organize content into logical sections with H2/H3 headers
3. Convert lists to proper Markdown lists
4. Format code blocks, quotes, and emphasis properly
5. Fix obvious typos and formatting inconsistencies
6. Add paragraph breaks for readability
7. Preserve important details and context

Output well-formatted Markdown that enhances readability while preserving content.`;

    const userPrompt = title 
      ? `Please format this content with the title "${title}":\n\n${content}`
      : `Please format this content:\n\n${content}`;

    console.log('🤖 Calling OpenAI for light formatting with model: gpt-5-nano');
    console.log('📝 Content length:', content.length, 'characters');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-nano', // New super cheap model for formatting
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_completion_tokens: 20000, // Much higher limit to prevent truncation
    });

    console.log('✅ OpenAI response received');
    console.log('🔍 Full completion object:', JSON.stringify(completion, null, 2));
    console.log('🔍 Response structure:', {
      choices: completion.choices?.length,
      firstChoice: !!completion.choices?.[0],
      message: !!completion.choices?.[0]?.message,
      content: !!completion.choices?.[0]?.message?.content,
      contentType: typeof completion.choices?.[0]?.message?.content,
      contentLength: completion.choices?.[0]?.message?.content?.length
    });

    const formattedContent = completion.choices[0]?.message?.content;
    
    // Check if content might be in a different field or format
    console.log('🔍 Message object details:', {
      messageKeys: Object.keys(completion.choices?.[0]?.message || {}),
      messageContent: completion.choices?.[0]?.message,
      rawContent: completion.choices?.[0]?.message?.content,
      contentPresent: !!completion.choices?.[0]?.message?.content,
      contentLength: completion.choices?.[0]?.message?.content?.length,
      contentPreview: completion.choices?.[0]?.message?.content?.substring(0, 100)
    });

    if (!formattedContent) {
      console.error('❌ Empty response from OpenAI:', {
        completion: completion,
        choices: completion.choices,
        firstChoice: completion.choices?.[0]
      });
      return {
        success: false,
        error: 'No formatted content received from AI',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    console.log(`Light formatting completed: ${formattedContent.length} characters`);

    return {
      success: true,
      notes: formattedContent.trim()
    };

  } catch (error) {
    console.error('Light formatting error:', error);
    
    if (error instanceof Error && error.message.includes('rate limit')) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please try again later.',
        errorCode: 'RATE_LIMIT'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown formatting error',
      errorCode: 'PROCESSING_ERROR'
    };
  }
}