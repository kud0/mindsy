import OpenAI from 'openai';
import { config } from './config';
import { getLanguageTermsFromText } from './language-utils';

const openai = new OpenAI({
  apiKey: config.openaiKey,
});

export interface StudentDeskQuestion {
  id: string;
  question: string;
  answer: string;
  type: 'concept' | 'definition' | 'application' | 'review';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface StudentDeskContent {
  tableOfContents: {
    title: string;
    items: string[];
  };
  questions: StudentDeskQuestion[];
  explanations: {
    title: string;
    content: string;
    keyPoints: string[];
  }[];
  summary: {
    overview: string;
    keyTakeaways: string[];
    learningObjectives: string[];
  };
  metadata: {
    language: string;
    estimatedStudyTime: string;
    topicArea: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced';
  };
}

export interface StudentDeskInput {
  transcript?: string;
  pdfText?: string;
  lectureTitle?: string;
  courseSubject?: string;
  detectedLanguage?: string;
}

export interface StudentDeskOutput {
  success: boolean;
  content?: StudentDeskContent;
  error?: string;
  errorCode?: string;
}

function createStudentDeskPrompt(input: StudentDeskInput): string {
  const { transcript, pdfText, lectureTitle, detectedLanguage } = input;
  
  // Get language-specific terms
  const textForLanguageDetection = transcript || pdfText || '';
  const { terms, language } = getLanguageTermsFromText(textForLanguageDetection, detectedLanguage);
  
  const content = transcript || pdfText || '';
  const title = lectureTitle || 'Study Session';
  
  return `You are an expert educational content creator. Transform this content into a perfect structured study guide for interactive learning.

## Content to Transform:
**Title:** ${title}
**Content:** ${content}

## Language Instructions:
- Use ${language} language throughout
- Table of Contents = "${terms.tableOfContents}"
- Questions = "${terms.cueColumn}" 
- Detailed Notes = "${terms.detailedNotes}"
- Summary = "${terms.comprehensiveSummary}"

## Required Output Format:
You must follow this EXACT structured format with clear delimiters:

---STUDENT_DESK_START---

## ${terms.tableOfContents}
- Topic 1: Key concept explanation
- Topic 2: Important principle details  
- Topic 3: Practical applications
- Topic 4: Advanced concepts
- Topic 5: Summary and conclusions

## ${terms.cueColumn}

### Q1: [CONCEPT] [INTERMEDIATE]
Complete, detailed question that tests understanding?

**Answer:** Comprehensive answer with explanations, examples, and context. Should be 100-300 words that thoroughly address the question and help students learn.

### Q2: [DEFINITION] [BASIC] 
What is the key term or concept?

**Answer:** Clear definition with context and practical examples to help students understand and remember.

### Q3: [APPLICATION] [ADVANCED]
How would you apply this knowledge in a real scenario?

**Answer:** Detailed explanation of practical application with step-by-step guidance and examples.

[Continue with 8-15 questions total, mixing types and difficulty levels]

## ${terms.detailedNotes}

### Core Concepts
Detailed explanation of the main ideas, principles, and frameworks covered in the content.

### Key Examples and Applications  
Practical examples that illustrate the concepts with real-world relevance.

### Important Details
Additional context, background information, and nuanced points that support understanding.

## ${terms.comprehensiveSummary}

### Overview
Brief but comprehensive overview of the entire content in 2-3 paragraphs.

### Key Takeaways
- Main learning point 1
- Essential insight 2  
- Important conclusion 3
- Critical concept 4
- Practical application 5

### Learning Objectives
After studying this material, students should be able to:
- Understand and explain core concepts
- Apply knowledge in practical situations
- Analyze and evaluate related scenarios

---STUDENT_DESK_END---

## Generation Rules:
1. **Questions**: Create 8-15 comprehensive questions testing different aspects
2. **Question Types**: Use [CONCEPT], [DEFINITION], [APPLICATION], [REVIEW] tags
3. **Difficulty**: Use [BASIC], [INTERMEDIATE], [ADVANCED] tags  
4. **Answers**: Each answer should be educational and detailed (100-300 words)
5. **Language**: Use ${language} consistently throughout
6. **Structure**: Follow the exact format with proper headers and delimiters
7. **Content**: Make it engaging and comprehensive for effective learning

Focus on creating an interactive study experience that helps students master the material through varied question types and thorough explanations.`;
}

/**
 * Generate structured content perfect for the student desk interface
 */
export async function generateStudentDeskContent(input: StudentDeskInput): Promise<StudentDeskOutput> {
  try {
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

    const prompt = createStudentDeskPrompt(input);

    // Call OpenAI with structured prompt
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an expert educational content creator. Follow the exact structured format provided in the prompt.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      return {
        success: false,
        error: 'OpenAI returned empty response',
        errorCode: 'EMPTY_RESPONSE'
      };
    }

    // Parse the structured response
    const parsedContent = parseStudentDeskResponse(responseContent, input.detectedLanguage);
    
    if (!parsedContent) {
      return {
        success: false,
        error: 'Failed to parse structured response',
        errorCode: 'PARSING_ERROR'
      };
    }

    console.log('✅ Student Desk Generator: Success', {
      questionsGenerated: parsedContent.questions.length,
      explanationsGenerated: parsedContent.explanations?.length || 0,
      language: parsedContent.metadata?.language || 'unknown',
      tocItems: parsedContent.tableOfContents?.items?.length || 0
    });

    return {
      success: true,
      content: parsedContent
    };

  } catch (error) {
    console.error('Student desk generation failed:', error);
    
    if (error instanceof Error) {
      return {
        success: false,
        error: error.message,
        errorCode: 'OPENAI_ERROR'
      };
    }

    return {
      success: false,
      error: 'Unknown error occurred',
      errorCode: 'UNKNOWN_ERROR'
    };
  }
}

/**
 * Parse the structured response from OpenAI into StudentDeskContent
 */
function parseStudentDeskResponse(response: string, detectedLanguage?: string): StudentDeskContent | null {
  try {
    // Extract the content between delimiters
    const startDelimiter = '---STUDENT_DESK_START---';
    const endDelimiter = '---STUDENT_DESK_END---';
    
    const startIndex = response.indexOf(startDelimiter);
    const endIndex = response.indexOf(endDelimiter);
    
    if (startIndex === -1 || endIndex === -1) {
      console.error('Delimiters not found in response');
      return null;
    }
    
    const content = response.substring(startIndex + startDelimiter.length, endIndex).trim();
    
    // Parse Table of Contents
    const tocMatch = content.match(/##\s*([^#\n]+)\n((?:- .+\n?)+)/);
    const tableOfContents = {
      title: tocMatch?.[1]?.trim() || 'Table of Contents',
      items: tocMatch?.[2]?.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.replace(/^-\s*/, '').trim()) || []
    };
    
    // Parse Questions
    const questionsSection = content.match(/##\s*[^#\n]*(?:Preguntas|Questions)[^#\n]*\n([\s\S]*?)(?=##|$)/i);
    const questions: StudentDeskQuestion[] = [];
    
    if (questionsSection) {
      const questionMatches = questionsSection[1].match(/### Q\d+:\s*\[([^\]]+)\]\s*\[([^\]]+)\]\n([^*]+)\*\*Answer:\*\*\s*([^#]+)(?=###|$)/g);
      
      if (questionMatches) {
        questionMatches.forEach((match, index) => {
          const parts = match.match(/### Q\d+:\s*\[([^\]]+)\]\s*\[([^\]]+)\]\n([^*]+)\*\*Answer:\*\*\s*([^#]+)/);
          if (parts) {
            questions.push({
              id: `q${index + 1}`,
              question: parts[3].trim(),
              answer: parts[4].trim(),
              type: parts[1].toLowerCase() as 'concept' | 'definition' | 'application' | 'review',
              difficulty: parts[2].toLowerCase() as 'basic' | 'intermediate' | 'advanced',
              tags: [parts[1].toLowerCase()]
            });
          }
        });
      }
    }
    
    // Parse Explanations
    const explanationsSection = content.match(/##\s*[^#\n]*(?:Notas|Notes|Explanations)[^#\n]*\n([\s\S]*?)(?=##\s*[^#\n]*(?:Resumen|Summary)|$)/i);
    const explanations: { title: string; content: string; keyPoints: string[] }[] = [];
    
    if (explanationsSection) {
      const subsectionMatches = explanationsSection[1].match(/### ([^#\n]+)\n([^#]+?)(?=###|$)/g);
      if (subsectionMatches) {
        subsectionMatches.forEach(match => {
          const parts = match.match(/### ([^#\n]+)\n([^#]+)/);
          if (parts) {
            explanations.push({
              title: parts[1].trim(),
              content: parts[2].trim(),
              keyPoints: parts[2].split('\n')
                .filter(line => line.trim().startsWith('-'))
                .map(line => line.replace(/^-\s*/, '').trim())
            });
          }
        });
      }
    }
    
    // Parse Summary
    const summarySection = content.match(/##\s*[^#\n]*(?:Resumen|Summary)[^#\n]*\n([\s\S]+)$/i);
    let summary = {
      overview: 'No summary available',
      keyTakeaways: [] as string[],
      learningObjectives: [] as string[]
    };
    
    if (summarySection) {
      const overviewMatch = summarySection[1].match(/### Overview\n([^#]+?)(?=###|$)/);
      const takeawaysMatch = summarySection[1].match(/### Key Takeaways\n((?:- .+\n?)+)/);
      const objectivesMatch = summarySection[1].match(/### Learning Objectives\n[^-]*\n((?:- .+\n?)+)/);
      
      summary = {
        overview: overviewMatch?.[1]?.trim() || 'No summary available',
        keyTakeaways: takeawaysMatch?.[1]?.split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim()) || [],
        learningObjectives: objectivesMatch?.[1]?.split('\n')
          .filter(line => line.trim().startsWith('-'))
          .map(line => line.replace(/^-\s*/, '').trim()) || []
      };
    }
    
    return {
      tableOfContents,
      questions,
      explanations,
      summary,
      metadata: {
        language: detectedLanguage || 'en',
        estimatedStudyTime: questions.length > 10 ? '45-60 minutes' : '30-45 minutes',
        topicArea: 'General',
        difficulty: 'intermediate'
      }
    };
    
  } catch (error) {
    console.error('Error parsing student desk response:', error);
    return null;
  }
}