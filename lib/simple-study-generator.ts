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

export interface StudyGuideExplanation {
  title: string;
  content: string;
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

2. **COMPREHENSIVE EXPLANATIONS THAT TEACH:**
   - For each question, write detailed, well-structured explanations
   - **Crucially, explain all concepts as if you are teaching them to someone who missed the lecture entirely**
   - Define terms and provide necessary context
   - Use clear, logical structure with bullet points and sub-points
   - Include examples, analogies, and real-world applications
   - Connect ideas to broader themes and other concepts
   - Example format for answers:
     * Primary mechanism explanation with scientific basis
     * Relationship to broader theoretical framework
     * **Key terminology** with precise definitions
     * Clinical/practical applications and significance
     * Real-world examples or case studies

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
      "title": "Fundamental Concepts and Theoretical Framework",
      "content": "Comprehensive explanation of core theoretical principles underlying the lecture content. Include historical context, scientific foundations, and how these concepts form the basis for practical applications. Define all technical terminology and explain the logical progression of ideas."
    },
    {
      "title": "Mechanisms and Processes",
      "content": "Detailed analysis of how the discussed systems, processes, or phenomena actually work. Break down complex mechanisms into understandable components while maintaining scientific accuracy. Explain cause-and-effect relationships and interdependencies."
    },
    {
      "title": "Applications and Real-World Significance",
      "content": "Exploration of how the theoretical concepts translate into practical applications, clinical significance, or real-world implementations. Include case studies, examples, and current research developments that demonstrate the relevance of the material."
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
- **Comprehensive Coverage:** IMPORTANT - Look at content length, not just major concepts. Longer content needs more questions.
- **Minimum Standards:** 
  * Even short content should have at least 3-4 questions
  * Medium content should have 5-8 questions minimum
  * Long content should have 8+ questions for proper coverage
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