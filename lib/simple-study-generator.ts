import OpenAI from 'openai';
import { config } from './config';

const openai = new OpenAI({
  apiKey: config.openaiKey,
});

export interface StudyGuideQuestion {
  id: string;
  question: string;
  answer: string;
}

export interface StudyGuideExplanationSection {
  heading: string;
  content: string;
  points?: string[];
}

export interface StudyGuideExplanation {
  title: string;  // MUST be specific concept name
  introduction: string;  // Opening paragraph
  sections?: StudyGuideExplanationSection[];  // Subsections with headers
  // Legacy support
  content?: string;
}

export interface StudyGuideSummary {
  overview: string;
  keyTakeaways: string[];
  learningObjectives: string[];
}

export interface StudyGuideData {
  title: string;
  subject?: string;
  language: string;
  questions: StudyGuideQuestion[];
  explanations: StudyGuideExplanation[];
  summary: StudyGuideSummary;
  tableOfContents: string;
}

export interface GenerateStudyGuideInput {
  transcript: string;
  title: string;
  subject?: string;
  detectedLanguage?: string;
}

export interface GenerateStudyGuideOutput {
  success: boolean;
  data?: StudyGuideData;
  error?: string;
}

/**
 * Generate study guide - clean and simple
 */
export async function generateStudyGuide(input: GenerateStudyGuideInput): Promise<GenerateStudyGuideOutput> {
  try {
    const { transcript, title, subject, detectedLanguage = 'en' } = input;
    
    const language = detectedLanguage === 'es' ? 'Spanish' : 'English';
    const termsMap = {
      es: {
        questions: 'Preguntas de Estudio',
        explanations: 'Explicaciones Detalladas', 
        summary: 'Resumen',
        tableOfContents: 'Tabla de Contenidos'
      },
      en: {
        questions: 'Study Questions',
        explanations: 'Detailed Explanations',
        summary: 'Summary', 
        tableOfContents: 'Table of Contents'
      }
    };
    
    const terms = termsMap[detectedLanguage as keyof typeof termsMap] || termsMap.en;

    const prompt = `You are a world-class academic assistant and instructional designer with expertise in cognitive science and learning psychology. Your mission is to create a comprehensive, standalone study guide from the provided lecture content that maximizes learning retention and exam success.

**CRITICAL: Respond ONLY with valid JSON, no other text.**

**RELEVANCE FILTERING RULES (Apply Objectively):**
- Focus only on educational content related to the core topic. Include explanations, examples, scientific references, and practical applications.
- If the speaker discusses personal experiences or background:
  - EXCLUDE if it is not relevant to the studies (e.g., unrelated personal anecdotes, off-topic hobbies, or self-promotion without educational tie-in).
  - To decide: Check if the personal content provides objective value like evidence, case studies, or insights that enhance understanding of the topic.

**CONTENT ANALYSIS:**
Title: ${title}
Subject: ${subject || 'General'}  
Language: ${language}
Content Length: ${Math.ceil(transcript.length / 100)} content units
Transcript: ${transcript}

**STEP-BY-STEP INSTRUCTIONS:**

1. **EXAM-FOCUSED QUESTION GENERATION:**
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
   - **Coverage Requirements:**
     * SHORT content (under 1000 words): Create 4-6 focused questions on core concepts
     * MEDIUM content (1000-3000 words): Create 6-10 questions covering all major topics  
     * LONG content (3000+ words): Create 10-15 questions for thorough coverage

2. **COMPREHENSIVE EXPLANATIONS THAT TEACH (RICH FORMAT REQUIRED):**

   🚨 CRITICAL SCHEMA REQUIREMENTS 🚨

   YOU MUST USE THIS EXACT SCHEMA - DO NOT DEVIATE:
   {
     "title": "Specific concept name from lecture",
     "introduction": "Opening paragraph (NOT 'content' field!)",
     "sections": [
       {
         "heading": "Subsection name",
         "content": "Paragraph content",
         "points": ["Optional bullets"]
       }
     ]
   }

   ❌ FORBIDDEN - DO NOT USE THESE FIELDS:
   - "content" (OLD SCHEMA - DO NOT USE!)
   - Generic names like "Key Concept", "Core Concept", "Concept 1"
   - Placeholder text like "Detailed explanation coming soon"

   ✅ REQUIRED - YOU MUST USE:
   - "title" field with specific concept name
   - "introduction" field (opening paragraph)
   - "sections" array with objects containing "heading", "content", "points"

   CONTENT REQUIREMENTS:
   - Create detailed explanations for the most important concepts from the lecture
   - Analyze lecture length to determine appropriate number of explanations:
     * Short lectures (10-20 min): 3-5 key explanations
     * Medium lectures (20-40 min): 5-10 explanations
     * Long lectures (40+ min): 10-15+ comprehensive explanations
   - Each explanation MUST have a SPECIFIC, DESCRIPTIVE title
     * ✅ GOOD: "Estructura del Esqueleto Axial", "Photosynthesis Process", "Newton's Second Law"
     * ❌ BAD: "Key Concept", "Core Concept", "Concept 1", "Important Topic"
   - Each section needs "heading" (specific subsection name), "content" (paragraph), and optional "points" (bullets)
   - Mix paragraphs and bullet points naturally (like the example in JSON format)
   - Write as if teaching someone who missed the lecture entirely
   - Define all terms and provide necessary context
   - Include examples, analogies, and real-world applications
   - Connect ideas to broader themes and other concepts

3. **ACADEMIC SUMMARY - STANDALONE STUDY GUIDE:**
   - **Objective:** This summary MUST function as a standalone study guide. A student should be able to read this section alone and understand all the critical concepts, their connections, and the main conclusions.
   - **Style:** Use clear, academic, **Expository Style**, like a research paper. Write in full, well-structured paragraphs.
   - **Content:** Define key terms, explain processes, and synthesize the information. Do not just list facts; explain the "why" and "how" that connect them. The summary must be substantial and detailed.

**Required JSON Format:**
{
  "title": "${title}",
  "subject": "${subject || 'General'}",
  "language": "${detectedLanguage}",
  "questions": [
    {
      "id": "q1",
      "question": "What is the primary mechanism of **[key concept]** and how does it relate to [broader context]?",
      "answer": "• Primary mechanism explanation with scientific basis\n• Relationship to broader biological/theoretical framework\n• **Key terminology** with precise definitions\n• Clinical/practical applications and significance\n• Real-world examples or case studies"
    },
    {
      "id": "q2",
      "question": "Compare and contrast **[concept A]** and **[concept B]**, analyzing their functional differences and practical implications.",
      "answer": "• **Concept A characteristics:** detailed functional description\n• **Concept B characteristics:** detailed functional description\n• Key similarities and overlapping functions\n• Critical differences in mechanism/application\n• Practical implications for [field/application]"
    }
  ],
  "explanations": [
    {
      "title": "Estructura del Esqueleto Axial",
      "introduction": "El esqueleto axial incluye el cráneo, la columna vertebral y la pelvis. Su función principal es proteger y estabilizar el cuerpo, aunque también permite cierta movilidad. A diferencia de otras articulaciones, como las del hombro, que priorizan la movilidad, el esqueleto axial se caracteriza por su estabilidad.",
      "sections": [
        {
          "heading": "Características del Cráneo",
          "content": "El cráneo es principalmente una estructura protectora, diseñada para resguardar el cerebro. Aunque tiene algo de movilidad en la mandíbula, su función principal es la protección."
        },
        {
          "heading": "Movimientos de la Columna Vertebral",
          "content": "Los movimientos de la columna vertebral incluyen:",
          "points": [
            "Flexión: Inclinación hacia adelante.",
            "Extensión: Inclinación hacia atrás.",
            "Rotación: Ocurre en la articulación atlanto-occipital, donde se produce un mecanismo de deslizamiento y rotación."
          ]
        }
      ]
    },
    {
      "title": "SPECIFIC CONCEPT NAME #2 (NOT 'Key Concept'!)",
      "introduction": "Opening paragraph that clearly explains what this concept is, why it matters, and its relevance to the broader subject matter...",
      "sections": [
        {
          "heading": "First Major Aspect",
          "content": "Detailed paragraph explaining this particular aspect of the concept. Write as if teaching someone who wasn't there..."
        },
        {
          "heading": "Second Major Aspect",
          "content": "Another comprehensive paragraph...",
          "points": [
            "Optional bullet point for details",
            "Another key detail",
            "Additional clarification"
          ]
        }
      ]
    }
  ],
  "summary": {
    "overview": "A comprehensive academic synthesis written in expository style that integrates all lecture content into a coherent narrative. This overview must function as a complete study guide, explaining not just what was discussed, but why it matters, how concepts interconnect, and what implications arise from this knowledge. Write in formal academic prose with clear paragraph structure, logical flow, and scientific rigor.",
    "keyTakeaways": [
      "Essential principle with underlying mechanism and practical significance",
      "Critical understanding with real-world applications and implications",
      "Important conclusion supported by evidence and logical reasoning",
      "Key concept with broader theoretical or practical ramifications",
      "Main learning point with clinical/applied significance"
    ],
    "learningObjectives": [
      "Students will understand the fundamental mechanisms underlying [core concept] and their theoretical basis",
      "Students will be able to analyze and compare different [systems/processes/concepts] and their applications",
      "Students will recognize the practical significance of [key principles] in real-world contexts",
      "Students will synthesize information to solve problems related to [subject matter]"
    ]
  },
  "tableOfContents": "1. Introduction to Core Concepts\\n2. Theoretical Framework and Principles\\n3. Mechanisms and Processes\\n4. Practical Applications\\n5. Clinical/Professional Significance\\n6. Current Research and Future Directions"
}

**Quality Assurance Framework:**
- **Comprehensive Coverage:** IMPORTANT - Analyze content length and complexity to determine optimal question count. Longer and more complex content needs more questions.
- **Adaptive Standards:**
  * Determine the appropriate number of questions based on content depth and breadth
  * Short content: Generate enough questions to cover key concepts (typically 3-5)
  * Medium content: Ensure comprehensive coverage (typically 6-12)
  * Long/complex content: Create thorough assessment (typically 12-20+)
- **Topic Distribution:** Ensure questions cover ALL sections of the content, not just the beginning
- **Balance Check:** Mix foundational questions with application and analysis questions
- **Explanation Alignment:** Create one detailed explanation section for every 2-3 related questions
- **Language Consistency:** All content in ${language} with appropriate academic terminology
- **No Missing Concepts:** If a concept is important enough to mention in lecture, it deserves a question`;

    console.log('🚀 Simple Study Generator: Calling OpenAI...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert study guide creator. Return only valid JSON, no other text.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_completion_tokens: 16000,
      response_format: { type: "json_object" }
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return {
        success: false,
        error: 'OpenAI returned empty response'
      };
    }

    console.log('✅ Simple Study Generator: Parsing JSON response...');
    
    try {
      const studyGuideData = JSON.parse(responseContent) as StudyGuideData;
      
      // Add IDs if missing
      studyGuideData.questions = studyGuideData.questions.map((q, i) => ({
        ...q,
        id: q.id || `q${i + 1}`
      }));

      console.log('✅ Simple Study Generator: Success!', {
        questions: studyGuideData.questions.length,
        explanations: studyGuideData.explanations.length,
        language: studyGuideData.language
      });

      return {
        success: true,
        data: studyGuideData
      };

    } catch (parseError) {
      console.error('❌ Simple Study Generator: JSON parse error:', parseError);
      return {
        success: false,
        error: 'Failed to parse OpenAI response as JSON'
      };
    }

  } catch (error) {
    console.error('❌ Simple Study Generator: Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}