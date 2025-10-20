import OpenAI from 'openai';
import { config } from './config';
import { getLanguageTermsFromText } from './language-utils';

// Initialize Grok client (OpenAI-compatible API)
const grok = new OpenAI({
  apiKey: config.grokApiKey,
  baseURL: 'https://api.x.ai/v1',
});

// Export the Grok client for use in other modules
export { grok };

export interface MindsyNotesInput {
  transcript?: string;
  pdfText?: string;
  lectureTitle?: string;
  courseSubject?: string;
  detectedLanguage?: string;
  formatMode?: 'cornell-notes' | 'clean-document' | 'student-desk';
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

export interface QuizGenerationInput {
  transcript: string;
  lectureTitle: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number; // 5-10 range
  questionTypes: ('multiple-choice' | 'true-false' | 'fill-number')[];
  focusTopics?: string[];
  detectedLanguage?: string;
}

export interface QuizGenerationOutput {
  success: boolean;
  questions?: Array<{
    id: string;
    type: 'multiple-choice' | 'true-false' | 'fill-number';
    question?: string;
    difficulty?: 'easy' | 'medium' | 'hard';
    points?: number;
    hint?: string;
    feedback?: string;
    choices?: string[];
    correctAnswer?: number | boolean;
    statement?: string;
    template?: string;
    answer?: number;
    acceptableRange?: [number, number];
    unit?: string;
    timestamps?: {
      start: number;
      end: number;
    };
    sourceContext?: string;
  }>;
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
    explanations: Array<{
      id: string;
      concept: string;
      section: string;
      timestamps: {
        start: number;
        end: number;
      };
      introduction: string;
      sections?: Array<{
        heading: string;
        content: string;
        points?: string[];
      }>;
      importance: 'high' | 'medium' | 'low';
      example?: string;
    }>;
    summary: {
      sections: Array<{
        heading: string;
        content: string;
        keyPoints?: string[];
      }>;
      mustKnow: Array<{
        concept: string;
        explanation: string;
      }>;
      commonPitfalls: Array<{
        pitfall: string;
        explanation: string;
        howToAvoid?: string;
      }>;
    };
  };
  error?: string;
  errorCode?: string;
}

/**
 * Generate structured content for StudentDesk v2 interface using Grok
 * Creates comprehensive interactive learning materials
 */
export async function generateStudentDeskContent(input: MindsyNotesInput): Promise<StudentDeskOutput> {
  try {
    // Validate input
    const hasTranscript = input.transcript && input.transcript.trim().length > 0;
    const hasPdfText = input.pdfText && input.pdfText.trim().length > 0;

    if (!hasTranscript && !hasPdfText) {
      return {
        success: false,
        error: 'Either transcript (for audio) or pdfText (for documents) is required',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Create StudentDesk-specific prompt (reusing same prompts as OpenAI)
    const prompt = createStudentDeskPrompt(input);

    console.log('🤖 Grok API: Generating StudentDesk content with grok-4-fast-reasoning');
    console.log('📤 Sending request to Grok...');

    const startTime = Date.now();

    const completion = await grok.chat.completions.create({
      model: 'grok-4-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are a world-class educational AI assistant specialized in creating comprehensive learning materials. Your primary mission is to create detailed, thorough explanations that teach students every concept from the lecture. The explanations section is the CORE LEARNING CONTENT where students will learn everything - treat it like writing a textbook chapter, not a summary. Be comprehensive, detailed, and ensure no concept is missed. Your expertise lies in cognitive science, instructional design, and creating content that maximizes deep understanding and learning retention.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 35000,
      temperature: 0.7
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Grok API request successful in ${elapsed}ms`);

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return {
        success: false,
        error: 'Grok API returned empty response',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    // Parse JSON response
    let studentDeskContent;
    try {
      studentDeskContent = JSON.parse(generatedContent);

      console.log('✅ Grok JSON parsed successfully', {
        hasMetadata: !!studentDeskContent.metadata,
        hasOverview: !!studentDeskContent.overview,
        explanationsCount: studentDeskContent.explanations?.length || 0,
        hasSummary: !!studentDeskContent.summary
      });
    } catch (parseError) {
      console.error('❌ Failed to parse Grok JSON response:', parseError);
      console.error('📄 Raw response:', generatedContent?.substring(0, 200) + '...');
      return {
        success: false,
        error: 'Failed to parse JSON response from Grok',
        errorCode: 'JSON_PARSE_ERROR'
      };
    }

    return {
      success: true,
      content: studentDeskContent
    };

  } catch (error) {
    console.error('Grok generation error:', error);

    // Handle specific API errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `Grok API error: ${error.message}`,
        errorCode: 'GROK_API_ERROR'
      };
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return {
        success: false,
        error: 'Grok authentication failed - check API key',
        errorCode: 'AUTHENTICATION_ERROR'
      };
    }

    if (error instanceof OpenAI.RateLimitError) {
      return {
        success: false,
        error: 'Grok rate limit exceeded - please try again later',
        errorCode: 'RATE_LIMIT_ERROR'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Generate Mindsy Notes using Grok
 */
export async function generateMindsyNotes(input: MindsyNotesInput): Promise<CornellNotesOutput> {
  try {
    const hasTranscript = input.transcript && input.transcript.trim().length > 0;
    const hasPdfText = input.pdfText && input.pdfText.trim().length > 0;

    if (!hasTranscript && !hasPdfText) {
      return {
        success: false,
        error: 'Either transcript (for audio) or pdfText (for documents) is required',
        errorCode: 'INVALID_INPUT'
      };
    }

    const prompt = createJSONPrompt(input);

    console.log('🤖 Grok API: Generating Mindsy Notes with grok-4-fast-reasoning');
    console.log('📤 Sending request to Grok...');

    const startTime = Date.now();

    const completion = await grok.chat.completions.create({
      model: 'grok-4-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are a world-class academic assistant and instructional designer with expertise in cognitive science and learning psychology. Your mission is to create comprehensive, standalone study guides that maximize learning retention and exam success.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 30000,
      temperature: 0.7
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Grok API request successful in ${elapsed}ms`);

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return {
        success: false,
        error: 'Grok API returned empty response',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    let masterContent;
    try {
      masterContent = JSON.parse(generatedContent);
      console.log('✅ Grok JSON parsed successfully');
    } catch (parseError) {
      console.error('❌ Failed to parse Grok JSON response:', parseError);
      return {
        success: false,
        error: 'Failed to parse JSON response from Grok',
        errorCode: 'JSON_PARSE_ERROR'
      };
    }

    return {
      success: true,
      masterContent: masterContent
    };

  } catch (error) {
    console.error('Grok API error:', error);

    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `Grok API error: ${error.message}`,
        errorCode: 'GROK_API_ERROR'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

// Prompt generation functions (reusing same logic as OpenAI)
function createJSONPrompt(input: MindsyNotesInput): string {
  const { transcript, pdfText, lectureTitle, detectedLanguage } = input;

  const textForLanguageDetection = transcript || pdfText || '';
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);

  const content = transcript || pdfText || '';
  const title = lectureTitle || 'Study Session';

  return `Transform this content into a comprehensive study guide. Return a JSON object with this EXACT structure:

## Content to Transform:
**Title:** ${title}
**Content:** ${content}

## Language Instructions:
Use ${language} consistently throughout.

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
  "questions": [...],
  "explanations": [...],
  "summary": {...}
}

Generate appropriate number of questions based on content depth. Return ONLY the JSON object.`;
}

function createStudentDeskPrompt(input: MindsyNotesInput): string {
  const { transcript, pdfText, lectureTitle, detectedLanguage } = input;

  const textForLanguageDetection = transcript || pdfText || '';
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);

  const content = transcript || pdfText || '';
  const title = lectureTitle || 'Study Session';

  return `You are a world-class educational AI assistant. Transform this lecture into comprehensive learning materials.

## IMPORTANT CONTEXT:
The "explanations" array is the PRIMARY LEARNING SECTION where students learn everything from the lecture.
Think of it like writing a textbook chapter - detailed, thorough, teaching every concept.
Do NOT summarize - students who missed class should learn everything from your explanations.

## GROUPING STRATEGY:
Think hierarchically about the lecture's organization:
- Identify the MAJOR THEMES or BIG IDEAS that naturally emerge from the content
- Section names represent broad topic areas that encompass multiple related concepts
- A "section" is a meaningful grouping - if a section contains only one concept, it's not a group, it's just a label
- Group related concepts together under their common theme
- Think: "What are the major topics this lecture covers?" not "How many sections should I make?"
Example: Instead of giving each individual anatomy structure its own section, recognize that they're all part of broader themes like "Structural Anatomy", "Movement Mechanics", "Clinical Considerations"

## Content to Transform:
**Title:** ${title}
**Content:** ${content}

## Language: ${language}

## Required JSON Output Format:
{
  "metadata": {
    "title": "${title}",
    "difficulty": "beginner|intermediate|advanced",
    "estimatedTime": "45 minutes",
    "subjectDomain": "Main subject area",
    "examImportance": "low|medium|high"
  },
  "overview": {
    "mainTopic": "Clear overview in 2-3 sentences",
    "keyObjectives": ["Objective 1", "Objective 2", "Objective 3"],
    "coreConceptsList": ["Concept 1", "Concept 2"]
  },
  "explanations": [
    {
      "id": "exp1",
      "concept": "First distinct concept from lecture (SPECIFIC name, e.g., 'Vertebral Column Structure')",
      "section": "Logical section/theme name based on lecture flow (e.g., 'Anatomical Foundations', 'Clinical Applications')",
      "timestamps": {"start": 120, "end": 350},
      "introduction": "Comprehensive opening paragraph (2-4 sentences) explaining what this concept is",
      "sections": [
        {
          "heading": "Definition & Context",
          "content": "2-3 paragraphs providing detailed definition, background, and context",
          "points": ["Key detail 1", "Key detail 2", "Key detail 3"]
        },
        {
          "heading": "How It Works / Mechanism",
          "content": "2-3 paragraphs explaining the process, mechanism, or how it functions",
          "points": ["Step/aspect 1", "Step/aspect 2"]
        },
        {
          "heading": "Clinical/Practical Significance",
          "content": "1-2 paragraphs on why this matters, applications, or implications",
          "points": ["Application 1", "Application 2"]
        }
      ],
      "importance": "high",
      "example": "Detailed real-world example with specific numbers/scenarios from lecture"
    }
    // REPEAT FOR EVERY DISTINCT CONCEPT - analyze entire transcript, create as many as needed
  ],
  "summary": {
    "sections": [
      {
        "heading": "Main Topic/Concept Name",
        "content": "Brief paragraph explanation (2-3 sentences)",
        "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
      }
    ],
    "mustKnow": [
      {
        "concept": "Critical Concept Name",
        "explanation": "Clear explanation of why this is essential for exams and understanding"
      }
    ],
    "commonPitfalls": [
      {
        "pitfall": "Common Mistake or Misconception",
        "explanation": "Why students often get this wrong or confused",
        "howToAvoid": "Practical tip on how to remember/understand correctly"
      }
    ]
  }
}

CRITICAL RULES FOR EXPLANATIONS (PRIMARY LEARNING CONTENT):

**Core Mission:**
- The "explanations" array is WHERE STUDENTS LEARN - this is the most important section
- Analyze the ENTIRE lecture transcript thoroughly - do NOT miss any concept
- Create ONE explanation per DISTINCT concept, topic, or subtopic mentioned
- Each explanation must be comprehensive enough to learn the concept WITHOUT the transcript

**Dynamic Structure (NO HARDCODED NUMBERS):**
- Analyze the lecture's natural flow and identify logical content sections/themes
- Create BROAD, meaningful sections that group multiple related concepts together
- Section names should describe major themes or topic areas (e.g., "Structural Foundations", "Clinical Applications")
- Number of explanations: determined by concepts present (varies by lecture complexity)
- Number of sections: determined by major themes present (varies by lecture structure)
- A section is a GROUP - if it contains only one concept, it defeats the purpose of grouping
- Think hierarchically: What are the BIG IDEAS/THEMES? Group specific concepts under those
- Focus on natural topic clusters, not on hitting any target number
- Let the content dictate the structure - be organic, not formulaic

**Timestamps (Source Attribution):**
- For each explanation, identify where in the transcript that concept is discussed
- "start": approximate second when concept begins (estimate from transcript flow)
- "end": approximate second when concept discussion ends
- This allows students to jump to the audio source for more context

**Quality Standards:**
- Think: "Would a student who missed class fully understand this from my explanation?"
- Minimum 3 sections per explanation (Definition, Mechanism/Process, Significance)
- Use SPECIFIC concept names from lecture (NOT generic like "Key Concept")
- Include specific examples, numbers, terms, and details from the lecture
- Quality and comprehensiveness over arbitrary limits

OTHER RULES:
- Summary: Brief overview organized by main topics (NOT detailed teaching)
- Must-know concepts: Identify 3-5 critical concepts for exam focus
- Common pitfalls: Include 2-4 typical mistakes with avoidance tips
- All content in ${language}
- NOTE: Quizzes will be generated separately on-demand, so do NOT include questions in this response

Return ONLY the JSON object, no additional text.`;
}

/**
 * Generate quiz questions on-demand using Grok
 * Creates customized quiz based on user preferences (difficulty, question count, types)
 */
export async function generateQuiz(input: QuizGenerationInput): Promise<QuizGenerationOutput> {
  try {
    // Validate input
    if (!input.transcript || input.transcript.trim().length === 0) {
      return {
        success: false,
        error: 'Transcript is required for quiz generation',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Validate numQuestions is 5-10
    if (input.numQuestions < 5 || input.numQuestions > 10) {
      return {
        success: false,
        error: 'Number of questions must be between 5 and 10',
        errorCode: 'INVALID_QUESTION_COUNT'
      };
    }

    // Validate at least one question type is selected
    if (!input.questionTypes || input.questionTypes.length === 0) {
      return {
        success: false,
        error: 'At least one question type must be selected',
        errorCode: 'NO_QUESTION_TYPES'
      };
    }

    // Create quiz-specific prompt
    const prompt = createQuizPrompt(input);

    console.log('📝 Grok API: Generating quiz with grok-4-fast-reasoning', {
      difficulty: input.difficulty,
      numQuestions: input.numQuestions,
      questionTypes: input.questionTypes,
      hasFocusTopics: !!input.focusTopics && input.focusTopics.length > 0
    });
    console.log('📤 Sending quiz generation request to Grok...');

    const startTime = Date.now();

    const completion = await grok.chat.completions.create({
      model: 'grok-4-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational assessment designer. Your mission is to create high-quality, exam-style quiz questions that test deep understanding and critical thinking. Focus on creating questions that are clear, unambiguous, and pedagogically sound.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 10000,
      temperature: 0.8
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Grok API quiz generation successful in ${elapsed}ms`);

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return {
        success: false,
        error: 'Grok API returned empty response',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    // Parse JSON response
    let quizData;
    try {
      quizData = JSON.parse(generatedContent);

      console.log('✅ Quiz JSON parsed successfully', {
        questionsGenerated: quizData.questions?.length || 0
      });
    } catch (parseError) {
      console.error('❌ Failed to parse Grok quiz JSON response:', parseError);
      console.error('📄 Raw response:', generatedContent?.substring(0, 200) + '...');
      return {
        success: false,
        error: 'Failed to parse JSON response from Grok',
        errorCode: 'JSON_PARSE_ERROR'
      };
    }

    return {
      success: true,
      questions: quizData.questions || []
    };

  } catch (error) {
    console.error('Grok quiz generation error:', error);

    // Handle specific API errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `Grok API error: ${error.message}`,
        errorCode: 'GROK_API_ERROR'
      };
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return {
        success: false,
        error: 'Grok authentication failed - check API key',
        errorCode: 'AUTHENTICATION_ERROR'
      };
    }

    if (error instanceof OpenAI.RateLimitError) {
      return {
        success: false,
        error: 'Grok rate limit exceeded - please try again later',
        errorCode: 'RATE_LIMIT_ERROR'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Create quiz generation prompt
 */
function createQuizPrompt(input: QuizGenerationInput): string {
  const { transcript, lectureTitle, difficulty, numQuestions, questionTypes, focusTopics, detectedLanguage } = input;

  const textForLanguageDetection = transcript;
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);

  const title = lectureTitle || 'Study Quiz';

  // Build question types description
  const questionTypesDesc = questionTypes.map(type => {
    switch (type) {
      case 'multiple-choice': return 'Multiple Choice (4 options)';
      case 'true-false': return 'True/False';
      case 'fill-number': return 'Fill in Number';
      default: return type;
    }
  }).join(', ');

  // Build focus topics section
  const focusTopicsSection = focusTopics && focusTopics.length > 0
    ? `\n\n## FOCUS TOPICS:\nPrioritize questions about these specific topics:\n${focusTopics.map(t => `- ${t}`).join('\n')}`
    : '';

  return `Generate a quiz for students based on this lecture transcript.

## LECTURE INFORMATION:
**Title:** ${title}
**Difficulty Level:** ${difficulty}
**Number of Questions:** ${numQuestions} (EXACTLY ${numQuestions} questions, no more, no less)
**Question Types Allowed:** ${questionTypesDesc}
${focusTopicsSection}

## LECTURE TRANSCRIPT:
${transcript}

## LANGUAGE:
All questions, answers, hints, and feedback must be in **${language}**.

## QUIZ REQUIREMENTS:

### General Rules:
- Generate EXACTLY ${numQuestions} questions (no more, no less)
- Distribute questions across the allowed types: ${questionTypesDesc}
- All questions must be at **${difficulty}** difficulty level
- Questions should test understanding, not just memorization
- Include helpful hints and detailed feedback for each question
- Base all questions on the actual lecture content provided

### Difficulty Guidelines:

**Easy:**
- Test basic facts and definitions
- Straightforward questions with clear answers
- Recall-based questions

**Medium:**
- Test comprehension and application
- Require connecting concepts
- May involve simple calculations or analysis

**Hard:**
- Test synthesis and evaluation
- Require deep understanding and critical thinking
- May involve complex scenarios or multi-step reasoning

### Question Type Formats:

${questionTypes.includes('multiple-choice') ? `
**Multiple Choice:**
- Provide 4 choices (A, B, C, D)
- Only one correct answer
- Distractors should be plausible but clearly incorrect
- correctAnswer is the index (0, 1, 2, or 3)
` : ''}

${questionTypes.includes('true-false') ? `
**True/False:**
- Clear statement that is definitively true or false
- Avoid trick questions or ambiguity
- correctAnswer is boolean (true or false)
` : ''}

${questionTypes.includes('fill-number') ? `
**Fill in Number:**
- Question with a numerical answer
- Provide acceptable range if appropriate
- Include unit if applicable
- answer is a number
` : ''}

## Required JSON Output Format:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice",
      "question": "What is the primary function of...?",
      "choices": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0,
      "difficulty": "${difficulty}",
      "points": 10,
      "hint": "Think about the main purpose...",
      "feedback": "The correct answer is A because...",
      "timestamps": {
        "start": 120,
        "end": 180
      },
      "sourceContext": "Brief excerpt from lecture where this was discussed"
    },
    {
      "id": "q2",
      "type": "true-false",
      "statement": "The nervous system controls...",
      "correctAnswer": true,
      "difficulty": "${difficulty}",
      "points": 10,
      "hint": "Consider the role of...",
      "feedback": "This is true because...",
      "timestamps": {
        "start": 240,
        "end": 300
      },
      "sourceContext": "Brief excerpt from lecture where this was discussed"
    },
    {
      "id": "q3",
      "type": "fill-number",
      "template": "The human body has ___ bones.",
      "answer": 206,
      "acceptableRange": [200, 210],
      "unit": "bones",
      "difficulty": "${difficulty}",
      "points": 10,
      "hint": "Adult skeleton has...",
      "feedback": "The correct answer is 206 because...",
      "timestamps": {
        "start": 450,
        "end": 510
      },
      "sourceContext": "Brief excerpt from lecture where this was discussed"
    }
  ]
}

CRITICAL RULES:
- Generate EXACTLY ${numQuestions} questions
- Only use the question types from this list: ${questionTypes.join(', ')}
- All questions must be at ${difficulty} difficulty
- All content must be in ${language}
- Base questions on the actual lecture content
- Assign 10 points to each question
- Provide helpful hints and detailed feedback for learning
- **IMPORTANT**: Include timestamps showing where in the lecture this topic was discussed
  * "start": approximate second when the topic begins
  * "end": approximate second when the topic ends
  * This allows students to verify the source and jump to that part of the lecture
- Include a brief sourceContext (1-2 sentences) from the lecture transcript

Return ONLY the JSON object, no additional text.`;
}

/**
 * Interface for explaining concepts (AI Tutor / "Raise Your Hand" feature)
 */
export interface ExplainConceptInput {
  selectedText: string;
  lectureTitle: string;
  tabName: string; // 'overview', 'explanations', 'summary', 'transcript'
  sectionContext: string; // Content from current section/tab
  detectedLanguage?: string;
}

export interface ExplainConceptOutput {
  success: boolean;
  explanation?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Generate AI explanation for selected text (AI Tutor feature)
 * Student selects text, right-clicks "Explain this" → AI provides contextual explanation
 */
export async function explainConcept(input: ExplainConceptInput): Promise<ExplainConceptOutput> {
  try {
    // Validate input
    if (!input.selectedText || input.selectedText.trim().length === 0) {
      return {
        success: false,
        error: 'Selected text is required',
        errorCode: 'INVALID_INPUT'
      };
    }

    if (!input.sectionContext || input.sectionContext.trim().length === 0) {
      return {
        success: false,
        error: 'Section context is required for explanations',
        errorCode: 'NO_CONTEXT'
      };
    }

    // Create explanation prompt
    const prompt = createExplanationPrompt(input);

    console.log('🙋 Grok API: Explaining concept with grok-4-fast-reasoning', {
      selectedText: input.selectedText.substring(0, 50) + '...',
      tabName: input.tabName,
      contextLength: input.sectionContext.length
    });

    const startTime = Date.now();

    const completion = await grok.chat.completions.create({
      model: 'grok-4-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful, patient tutor explaining concepts from a lecture. Your goal is to make complex ideas clear and relatable. Provide concise, friendly explanations that help students understand without overwhelming them. Use simple language, relevant examples, and connect new concepts to things they already know.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 500, // Keep explanations concise
      temperature: 0.7
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Grok API explanation generated in ${elapsed}ms`);

    const explanation = completion.choices[0]?.message?.content?.trim();

    if (!explanation) {
      return {
        success: false,
        error: 'Grok API returned empty explanation',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    return {
      success: true,
      explanation
    };

  } catch (error) {
    console.error('Grok explanation error:', error);

    // Handle specific API errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `Grok API error: ${error.message}`,
        errorCode: 'GROK_API_ERROR'
      };
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return {
        success: false,
        error: 'Grok authentication failed - check API key',
        errorCode: 'AUTHENTICATION_ERROR'
      };
    }

    if (error instanceof OpenAI.RateLimitError) {
      return {
        success: false,
        error: 'Grok rate limit exceeded - please try again later',
        errorCode: 'RATE_LIMIT_ERROR'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Create explanation prompt for AI Tutor
 */
function createExplanationPrompt(input: ExplainConceptInput): string {
  const { selectedText, lectureTitle, tabName, sectionContext, detectedLanguage } = input;

  // Detect language from context
  const { language } = getLanguageTermsFromText(sectionContext, detectedLanguage);

  // Limit section context to first 500 words for token efficiency
  const contextWords = sectionContext.split(/\s+/).slice(0, 500).join(' ');

  return `You are helping a student understand a concept from a lecture. Provide a clear, concise explanation.

## LECTURE CONTEXT:
**Lecture:** ${lectureTitle}
**Current Section:** ${tabName}
**Section Content (first 500 words):**
${contextWords}

## STUDENT'S QUESTION:
The student selected this text and needs help understanding it:
"${selectedText}"

## YOUR TASK:
Provide a clear, friendly explanation (2-3 paragraphs, ~150-200 words) that:

1. **Explains the concept in simple terms**
   - What does this mean?
   - Break down any complex terminology

2. **Relates it to the lecture context**
   - How does this fit into the broader topic?
   - Why is this important in this lecture?

3. **Provides a relevant example** (if helpful)
   - Make it concrete and relatable
   - Use analogies if they help understanding

## STYLE GUIDELINES:
- Write in **${language}** language
- Use a conversational, friendly tone (like talking to a friend)
- Keep it concise (2-3 paragraphs max)
- Avoid jargon unless necessary (and explain it if you use it)
- Focus on understanding, not memorization

Provide ONLY the explanation text. Do not include labels, headers, or meta-commentary.`;
}

/**
 * Interface for course folder generation
 */
export interface GenerateCourseFoldersInput {
  courseCode: string;
  courseName: string;
  institution: string;
  typeOfStudy: string; // 'University', 'Professional School', 'Online Course', etc.
  year: string;
  semester: string;
  syllabusUrl?: string; // Optional URL to official syllabus
}

export interface GenerateCourseFoldersOutput {
  success: boolean;
  folders?: string[] | FolderHierarchy[];
  error?: string;
  errorCode?: string;
}

export interface FolderHierarchy {
  name: string;
  children?: (string | FolderHierarchy)[];
}

export interface DailyStudyFactInput {
  recentTopics: string[]; // Array of recent lecture topics/summaries
  detectedLanguage?: string; // Language of the student's lectures
}

export interface DailyStudyFactOutput {
  success: boolean;
  fact?: string; // 2-3 sentence fact
  language?: string;
  error?: string;
  errorCode?: string;
}

/**
 * Generate folder structure for a course using AI with web search
 * AI searches the web for typical course structure and suggests folders
 */
export async function generateCourseFolders(input: GenerateCourseFoldersInput): Promise<GenerateCourseFoldersOutput> {
  try {
    // Validate input
    if (!input.courseCode || !input.institution) {
      return {
        success: false,
        error: 'Course code and institution are required',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Create AI prompt for folder generation
    const prompt = createFolderGenerationPrompt(input);

    console.log('📁 Grok API: Generating course folders with web search');
    console.log('🔍 Course:', `${input.courseCode} at ${input.institution}`);

    const startTime = Date.now();

    const completion = await grok.chat.completions.create({
      model: 'grok-4-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are an educational technology expert who helps students organize their course materials. You have access to web search and can find typical course structures from universities worldwide. Your goal is to suggest logical, practical folder names that help students organize their lectures and study materials effectively.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
      temperature: 0.7
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Grok API folder generation successful in ${elapsed}ms`);

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return {
        success: false,
        error: 'Grok API returned empty response',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    // Parse JSON response
    let folderData;
    try {
      folderData = JSON.parse(generatedContent);

      if (!folderData.folders || !Array.isArray(folderData.folders)) {
        throw new Error('Invalid folder structure in response');
      }

      console.log('✅ Generated folders:', folderData.folders);

      return {
        success: true,
        folders: folderData.folders
      };

    } catch (parseError) {
      console.error('❌ Failed to parse Grok folder JSON response:', parseError);
      console.error('📄 Raw response:', generatedContent?.substring(0, 200) + '...');
      return {
        success: false,
        error: 'Failed to parse JSON response from Grok',
        errorCode: 'JSON_PARSE_ERROR'
      };
    }

  } catch (error) {
    console.error('Grok folder generation error:', error);

    // Handle specific API errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `Grok API error: ${error.message}`,
        errorCode: 'GROK_API_ERROR'
      };
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return {
        success: false,
        error: 'Grok authentication failed - check API key',
        errorCode: 'AUTHENTICATION_ERROR'
      };
    }

    if (error instanceof OpenAI.RateLimitError) {
      return {
        success: false,
        error: 'Grok rate limit exceeded - please try again later',
        errorCode: 'RATE_LIMIT_ERROR'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Create folder generation prompt with web search instructions
 */
function createFolderGenerationPrompt(input: GenerateCourseFoldersInput): string {
  const { courseCode, courseName, institution, typeOfStudy, year, semester, syllabusUrl } = input;

  // Build course description
  const courseDescription = courseName
    ? `${courseCode} - ${courseName}`
    : courseCode;

  const contextInfo = [
    `Institution: ${institution}`,
    typeOfStudy && `Type: ${typeOfStudy}`,
    year && `Year: ${year}`,
    semester && `Semester: ${semester}`
  ].filter(Boolean).join(', ');

  const syllabusInfo = syllabusUrl
    ? `\n\n**SYLLABUS URL PROVIDED:** ${syllabusUrl}\n**CRITICAL:** Visit this URL FIRST and extract the exact course structure from it!`
    : '';

  const yearLevelInfo = year
    ? `\n**Year Level:** ${year} (Create folders ONLY for subjects in this year level)`
    : `\n**Year Level:** Not specified (Create folders for ALL semesters/years of the entire degree program)`;

  return `You are an expert at finding official university course structures worldwide. You have web search access and can visit URLs.

## MISSION:
Find the ACTUAL course structure from the official university source and create a CLEAR folder hierarchy.

## CRITICAL RULE - READ CAREFULLY:
You will create ONE of these TWO structures - NEVER mix them:

### OPTION A: Year Level IS Specified (e.g., "1st Year", "2nd Year")
→ Return a FLAT list of SUBJECT NAMES only for that specific year
→ Example: ["Economics 101", "Math 101", "Physics 101"]

### OPTION B: Year Level IS NOT Specified (empty/blank)
→ Return a HIERARCHICAL structure: Semesters as parents, Subjects as children
→ Example:
{
  "folders": [
    {
      "name": "Primer Semestre",
      "children": ["Subject 1", "Subject 2", "Subject 3"]
    },
    {
      "name": "Segundo Semestre",
      "children": ["Subject 4", "Subject 5"]
    }
  ]
}

**❌ NEVER DO THIS:** Mix semesters AND subjects at the same level!
**❌ WRONG EXAMPLE:**
{
  "folders": [
    "Primer Semestre",
    "Subject 1",  // ← WRONG! Subject at same level as semester
    "Subject 2",  // ← WRONG!
    "Segundo Semestre"
  ]
}

## COURSE INFORMATION:
**Course Code:** ${courseCode}
**Course Name:** ${courseName || 'Not provided'}
**Institution:** ${institution}
**Program Type:** ${typeOfStudy}${yearLevelInfo}${syllabusInfo}

## YOUR STRATEGY:

### STEP 1: Detect Language & Country
- Analyze the institution name to determine country and primary language
- Detect TLD patterns (.edu, .es, .uk, .fr, .de, etc.)
- Use appropriate search terms in the institution's language

### STEP 2: Search for DEGREE PROGRAM CATALOG
This is the BEST source - it lists ALL courses in the program:

**Universal search terms to try:**
- "{courseCode} {institution} degree program courses"
- "{courseCode} {institution} curriculum"
- "{institution} {courseCode} course list"
- "{institution} {courseCode} program structure"

**Language-specific terms to detect and use:**
- Spanish: "plan de estudios", "grado", "asignaturas", "temario"
- French: "programme d'études", "licence", "cours"
- German: "Studienplan", "Studienprogramm", "Kurse"
- Portuguese: "plano de estudos", "grade curricular"
- Italian: "piano di studi", "programma"
- (Auto-detect others based on institution location)

### STEP 3: Search for INDIVIDUAL COURSE SYLLABUS
**Universal terms:**
- "{courseCode} {institution} syllabus"
- "{courseCode} {institution} course outline"
- "{courseCode} {institution} course structure"

**Auto-detect local terms:**
- Spanish: "guía docente", "programa asignatura"
- French: "plan de cours", "syllabus"
- German: "Vorlesungsverzeichnis"
- Portuguese: "ementa"
- (Adapt based on language detection)

### STEP 4: Look for Common URL Patterns
Universities worldwide use predictable URL structures:
- /academics/, /courses/, /programs/, /studies/
- /estudis/, /grado/, /asignaturas/ (Spanish)
- /etudes/, /formations/ (French)
- /studium/, /studiengaenge/ (German)
- Course codes often appear in URLs (e.g., /course-cs101/, /grado-g1072/)

### STEP 5: Detect Program Duration
When you find the official degree program page:
1. **Count total years/semesters** - Extract the complete program duration
2. **Identify structure** - Does it list by year, semester, quarter, or trimester?
3. **Extract ALL** - Don't limit yourself to arbitrary numbers, get everything the university lists

### STEP 6: Extract Structure & Choose Format

**CRITICAL DECISION POINT:**

**IF YEAR LEVEL IS SPECIFIED:**
1. Search for the degree program page that lists courses by year
2. Extract ONLY the subject names for that specific year
3. Return a FLAT array of strings (subject names only)
4. Example output: ["Economía de la Empresa", "Matemáticas I", "Contabilidad I"]

**IF YEAR LEVEL IS NOT SPECIFIED:**
1. Search for the degree program structure showing ALL semesters/years
2. Identify the complete program duration (could be 3, 4, 5, or more years)
3. Extract ALL subject names for each semester (extract exactly what exists)
4. Return HIERARCHICAL structure: Each semester object with subjects as children
5. Example output:
{
  "folders": [
    {
      "name": "Primer Semestre",
      "children": ["Economía de la Empresa", "Matemáticas I", "Física I"]
    },
    {
      "name": "Segundo Semestre",
      "children": ["Contabilidad I", "Microeconomía", "Física II"]
    }
  ]
}

**VALIDATION BEFORE RETURNING:**
- ✅ If year specified → Check: Is this a flat array of strings?
- ✅ If year NOT specified → Check: Do I have semester objects with children arrays?
- ❌ NEVER return a mix of semester objects AND subject strings at the same level!

### STEP 7: Smart Fallback (Only if official info not found)
If you cannot find the official course structure:
- Detect language from institution name
- Create generic semester structure based on typical degree length
- Use appropriate language (e.g., "Primer Semestre" for Spanish institutions)
- DO NOT create subject folders in fallback - only semesters

## OUTPUT RULES:

**CRITICAL - CHOOSE ONE FORMAT ONLY:**

### Format 1: Year Level IS Specified
Return flat array of subject names:
{
  "folders": ["Subject A", "Subject B", "Subject C"]
}

### Format 2: Year Level NOT Specified
Return hierarchical semester structure with subjects as children:
{
  "folders": [
    {
      "name": "Primer Semestre",
      "children": ["Subject 1", "Subject 2"]
    },
    {
      "name": "Segundo Semestre",
      "children": ["Subject 3", "Subject 4"]
    }
  ]
}

**IMPORTANT:**
- Preserve original language from university website (don't translate)
- Extract EXACTLY what the university has (don't limit numbers arbitrarily)
- If year specified: Extract ALL subjects for that year (however many exist)
- If year NOT specified: Extract ALL semesters for entire program (however many exist)
- NEVER mix formats (don't put both semesters and subjects at root level)

**EXAMPLES:**

**✅ CORRECT - Year Specified (1st Year)**
{
  "folders": [
    "Economía de la Empresa",
    "Contabilidad I",
    "Matemáticas I",
    "Física I",
    "Introducción a la Economía"
  ]
}

**✅ CORRECT - Year NOT Specified (4-year degree)**
{
  "folders": [
    {
      "name": "Primer Semestre",
      "children": ["Economía de la Empresa", "Matemáticas I", "Derecho"]
    },
    {
      "name": "Segundo Semestre",
      "children": ["Contabilidad I", "Física I", "Microeconomía"]
    },
    {
      "name": "Tercer Semestre",
      "children": ["Estadística I", "Macroeconomía"]
    },
    {
      "name": "Cuarto Semestre",
      "children": ["Subject 7", "Subject 8"]
    }
    // ... continue for EVERY semester in the entire degree program
  ]
}

**❌ WRONG - Mixing semesters and subjects at same level**
{
  "folders": [
    "Primer Semestre",
    "Economía de la Empresa",  // ← Don't do this!
    "Segundo Semestre",
    "Matemáticas I"  // ← Don't do this!
  ]
}

**❌ WRONG - Semesters without children when year not specified**
{
  "folders": ["Primer Semestre", "Segundo Semestre"]  // ← Missing children!
}

Return ONLY the JSON object. No explanations, no additional text.`;
}

/**
 * Generate a daily study fact related to student's recent topics
 * Creates obscure, difficult, or cool facts to engage students
 */
export async function generateDailyStudyFact(input: DailyStudyFactInput): Promise<DailyStudyFactOutput> {
  try {
    // Validate input
    if (!input.recentTopics || input.recentTopics.length === 0) {
      return {
        success: false,
        error: 'At least one recent topic is required',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Detect language from topics
    const topicsText = input.recentTopics.join(' ');
    const { language } = getLanguageTermsFromText(topicsText, input.detectedLanguage);

    // Create prompt for daily fact generation
    const prompt = createDailyFactPrompt(input.recentTopics, language);

    console.log('💡 Grok API: Generating daily study fact with grok-4-fast-reasoning', {
      topicsCount: input.recentTopics.length,
      language
    });

    const startTime = Date.now();

    const completion = await grok.chat.completions.create({
      model: 'grok-4-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: 'You are a creative educational content creator who specializes in finding fascinating, obscure, and mind-blowing facts related to academic topics. Your goal is to make learning exciting by sharing cool, difficult, or surprising facts that will make students say "wow, I didn\'t know that!" Always be accurate, engaging, and educational.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 300,
      temperature: 0.8 // Higher temperature for creativity
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ Grok API daily fact generated in ${elapsed}ms`);

    const fact = completion.choices[0]?.message?.content?.trim();

    if (!fact) {
      return {
        success: false,
        error: 'Grok API returned empty fact',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    return {
      success: true,
      fact,
      language
    };

  } catch (error) {
    console.error('Grok daily fact generation error:', error);

    // Handle specific API errors
    if (error instanceof OpenAI.APIError) {
      return {
        success: false,
        error: `Grok API error: ${error.message}`,
        errorCode: 'GROK_API_ERROR'
      };
    }

    if (error instanceof OpenAI.AuthenticationError) {
      return {
        success: false,
        error: 'Grok authentication failed - check API key',
        errorCode: 'AUTHENTICATION_ERROR'
      };
    }

    if (error instanceof OpenAI.RateLimitError) {
      return {
        success: false,
        error: 'Grok rate limit exceeded - please try again later',
        errorCode: 'RATE_LIMIT_ERROR'
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Create prompt for daily study fact generation
 */
function createDailyFactPrompt(recentTopics: string[], language: string): string {
  return `You are generating a daily "Did You Know?" study fact for a student.

## STUDENT'S RECENT STUDY TOPICS:
${recentTopics.map((topic, i) => `${i + 1}. ${topic}`).join('\n')}

## YOUR TASK:
Generate ONE fascinating fact that relates to one or more of the student's recent study topics.

## FACT REQUIREMENTS:
- **Length:** 2-3 sentences maximum
- **Type:** Obscure, difficult, cool, or surprising fact
- **Relevance:** Must relate to at least one of the student's topics
- **Educational:** Should teach something new and interesting
- **Engaging:** Make the student say "Wow, I didn't know that!"
- **Language:** Write in **${language}**

## FACT CATEGORIES (choose one):
1. **Obscure Historical Connection** - Little-known historical event or person related to the topic
2. **Mind-Blowing Scientific Discovery** - Counterintuitive or surprising scientific fact
3. **Real-World Application** - Unexpected place where this concept is used
4. **Extreme Example** - Record-breaking, largest, smallest, fastest, etc.
5. **Hidden Etymology** - Fascinating origin of a term or concept
6. **Cross-Disciplinary Connection** - How this topic connects to an unexpected field

## STYLE GUIDELINES:
- Start with an attention-grabbing opening
- Include specific numbers, names, or dates when possible
- Make it memorable and shareable
- Keep it concise (2-3 sentences)
- Be accurate and factual (no myths or misconceptions)

## EXAMPLES (for inspiration, don't copy):
- "Did you know? The concept of zero wasn't invented until around 500 CE in India, yet ancient civilizations built massive structures without it. Mathematicians like Brahmagupta revolutionized mathematics by treating zero as a number, not just a placeholder."
- "Sharks have been around longer than trees. Sharks evolved around 400 million years ago, while the earliest trees appeared about 350 million years ago. This means sharks witnessed the evolution of forests on Earth."
- "Your brain uses about 20% of your body's total energy, despite being only 2% of your body weight. This is why studying for exams makes you feel physically tired—your brain is literally consuming massive amounts of glucose."

Provide ONLY the fact text (2-3 sentences). No labels, no headers, no extra commentary.`;
}
