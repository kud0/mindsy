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
  formatMode?: 'cornell-notes' | 'clean-document'; // New flag for formatting mode
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