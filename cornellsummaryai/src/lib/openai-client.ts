import OpenAI from 'openai';
import { config } from './config.ts';
import { getLanguageTermsFromText, type LanguageTerms } from './language-utils.ts';

// Initialize OpenAI client with API key from configuration
const openai = new OpenAI({
  apiKey: config.openaiKey,
});

// Import marked for Markdown to HTML conversion
import { marked } from 'marked';

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
  notes?: string;
  error?: string;
  errorCode?: string;
}

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
 * Converts Markdown text to HTML
 * @param markdown - Markdown text to convert
 * @returns HTML string
 */
export async function convertMarkdownToHtml(markdown: string): Promise<string> {
  if (!markdown || markdown.trim().length === 0) {
    return '';
  }

  try {
    return await marked.parse(markdown);
  } catch (error) {
    console.error('Error converting Markdown to HTML:', error);
    // Return escaped HTML as fallback
    return markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
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

    // Create structured prompt - use clean document formatting for store mode
    const prompt = input.formatMode === 'clean-document' 
      ? createCleanDocumentPrompt(input)
      : createCornellNotesPrompt(input);

    // Call OpenAI API with proper error handling
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini', // Use gpt-5-mini for both modes
      messages: [
        {
          role: 'system',
          content: input.formatMode === 'clean-document' 
            ? 'You are a professional document formatter specializing in cleaning and structuring text while preserving all original content. You excel at fixing spacing issues, removing artifacts, and creating beautiful readable documents.'
            : 'You are an expert academic note-taker who creates high-quality Mindsy Notes. Your notes are well-structured, comprehensive, and help students study effectively. You create content that flows directly from cue column to detailed notes without intermediate sections.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      //temperature: 0.3, // Lower temperature for more consistent, structured output
      max_completion_tokens: 80000, // Sufficient for comprehensive Mindsy Notes
    });

    const generatedNotes = completion.choices[0]?.message?.content;

    if (!generatedNotes) {
      return {
        success: false,
        error: 'OpenAI API returned empty response',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    // Process the generated content to remove any unwanted sections
    const processedNotes = processGeneratedContent(generatedNotes);

    return {
      success: true,
      notes: processedNotes
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
 * Create structured prompt template combining transcript and PDF text
 * Formats content for optimal Mindsy Notes generation with table layout
 * Uses language-aware terms for headings
 */
function createCornellNotesPrompt(input: MindsyNotesInput): string {
  const { transcript, pdfText, lectureTitle, detectedLanguage } = input;
  
  // Get language-specific terms from transcript or pdfText
  const textForLanguageDetection = transcript || pdfText || '';
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);
  console.log(`Using language-specific terms for ${language}:`, terms);
  const prompt = `You are a world-class academic assistant and instructional designer. Your mission is to create a comprehensive, 
  standalone study guide from the provided lecture content. The output must be perfectly structured in Markdown.
     The entire document you generate, including all headings, the table of contents, cues, notes, and the summary, MUST be in the same language of the content you are given. 
     Relevance Filtering Rules (Apply Objectively):
    - Focus only on educational content related to the core topic. Include explanations, examples, scientific references, and practical applications.
    - If the speaker discusses personal experiences or background:
  
  - EXCLUDE if it is not relevant to the studies (e.g., unrelated personal anecdotes, off-topic hobbies, or self-promotion without educational tie-in).
  - To decide: Check if the personal content provides objective value like evidence, case studies, or insights that enhance understanding of the topic. If the lecture's main focus is the speaker's experiences 

**CRITICAL RULE:** same language of the content you are given, even the markdowns titles you are given.

---

**Step-by-Step Instructions:**

1.  **Create a ${terms.tableOfContents}:** First, generate a "${terms.tableOfContents}" section. This must be a bulleted list of the main topics and sub-topics covered in the lecture, in chronological order. This provides a high-level overview.

2.  **Generate the Mindsy Notes:**
    *   **${terms.cueColumn}:** Create an insightful "${terms.cueColumn}" section formatted as a structured list suitable for table layout. Generate exam-style questions that test understanding of key concepts. These should be the types of questions students will likely encounter on their exams. Include important terms **bolded** and focus on critical thinking questions that require comprehension, not just memorization. Each question should be concise and exam-focused.
    *   **${terms.detailedNotes}:** For each item in the ${terms.cueColumn}, write detailed, well-structured notes that flow directly from the cue items. Synthesize information from the transcript and PDF. Use bullet points, sub-bullets, and bold text to create a clear hierarchy. **Crucially, explain all concepts as if you are teaching them to someone who missed the lecture entirely.** Define terms and provide necessary context.

3.  **Generate the ${terms.comprehensiveSummary}:** After the detailed notes, insert the page break marker "<!-- NEW_PAGE -->". Then, write the "${terms.comprehensiveSummary}".
    *   **Objective:** This summary MUST function as a standalone study guide. A student should be able to read this section alone and understand all the critical concepts, their connections, and the main conclusions of the lecture.
    *   **Style:** Use a clear, academic, **Expository Style**, like a paper. Write in full, well-structured paragraphs.
    *   **Content:** Define key terms, explain processes, and synthesize the information. Do not just list facts; explain the "why" and "how" that connect them. The summary must be substantial and detailed.

---

**Input Content:**
**Lecture Title:** ${lectureTitle}
**Language:** same language of the content you are given.

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

## Mindsy Notes

### ${terms.cueColumn}
<!-- Generate exam-style questions that test understanding of key concepts. Focus on what students will likely see on exams. --> here some examples:
*   What is the primary function of the **Plantar Fascia** and how does it contribute to locomotion?
*   Compare and contrast the **subtalar** and **talocrural** joints in terms of movement and function.
*   Explain the biomechanical difference between **pronation** and **supination** during gait.
*   Which anatomical structures are responsible for **force distribution** in the foot?
*   Describe the **windlass mechanism** and its clinical significance.
*   ...

<!-- NEW_PAGE -->

### ${terms.detailedNotes}
<!-- Generate the detailed, explanatory notes corresponding to each cue item here. Content flows directly from cue column without intermediate sections. --> here an example:
  #### Primary function of the **Plantar Fascia**
*   The Plantar Fascia is a thick connective tissue band that runs across the bottom of the foot...
*   Its main roles include:
    *   Supporting the medial longitudinal arch.
    *   Absorbing shock during activities like walking and running.

#### Difference between subtalar and talocrural joints
*   **Talocrural Joint:** This is the primary ankle joint, responsible for dorsiflexion (pointing the foot up) and plantarflexion (pointing the foot down).
*   **Subtalar Joint:** Located below the talocrural joint, it is primarily responsible for inversion (turning the sole of the foot inward) and eversion (turning it outward).

#### **Pronation & Supination**
*   **Pronation:** A complex motion involving eversion, abduction, and dorsiflexion of the foot.
*   **Supination:** The opposite motion involving inversion, adduction, and plantarflexion.
*   These movements are crucial for shock absorption and propulsion during gait.
...

<!-- NEW_PAGE -->

## ${terms.comprehensiveSummary}
<!-- Generate the detailed, multi-paragraph expository summary here, written in the detected language. -->

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