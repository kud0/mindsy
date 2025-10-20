import { createServiceRoleClient } from '@/lib/supabase/server';
import { BattleQuestion } from '@/types/database';
import { grok } from '@/lib/grok-client';
import { createBattleQuestionPrompt } from './ai-prompts';
import { validateAndSanitizeQuestions, shuffleQuestionOptions } from './question-validator';

/**
 * Detect the language of content using character and word analysis
 * Returns language name (e.g., "Spanish", "English", "French")
 */
function detectLanguage(content: string): string {
  if (!content || content.length < 50) {
    return 'English'; // Default for very short content
  }

  const lowerContent = content.toLowerCase();

  // Count Spanish-specific characters (á, é, í, ó, ú, ñ, ¿, ¡)
  const spanishChars = (content.match(/[áéíóúñ¿¡]/gi) || []).length;

  // Spanish common words (very frequent in any Spanish text)
  const spanishWords = /\b(el|la|los|las|un|una|de|del|que|es|en|por|para|con|su|como|está|están|son|este|esta|estos|estas|puede|pueden|ser|tiene|tienen|hace|hacer|muy|más|todo|toda|todos|todas|cuando|donde|porque)\b/gi;
  const spanishMatches = (content.match(spanishWords) || []).length;

  // English common words
  const englishWords = /\b(the|is|are|and|or|of|in|to|for|with|this|that|these|those|can|be|have|has|will|would|should|could|when|where|what|which|who|how|their|there|they|them)\b/gi;
  const englishMatches = (content.match(englishWords) || []).length;

  // French indicators
  const frenchChars = (content.match(/[àâçèéêëîïôùûü]/gi) || []).length;
  const frenchWords = /\b(le|la|les|un|une|de|du|des|et|est|sont|dans|pour|avec|sur|ce|cette|ces|qui|que|quoi|où|comment|quand|pour|par)\b/gi;
  const frenchMatches = (content.match(frenchWords) || []).length;

  // German indicators
  const germanChars = (content.match(/[äöüß]/gi) || []).length;
  const germanWords = /\b(der|die|das|den|dem|des|ein|eine|und|ist|sind|in|zu|von|mit|auf|für|als|bei|nach|über|durch|werden|wird)\b/gi;
  const germanMatches = (content.match(germanWords) || []).length;

  console.log('🔍 Language detection analysis:', {
    contentLength: content.length,
    spanish: { chars: spanishChars, words: spanishMatches, score: spanishChars * 2 + spanishMatches },
    english: { words: englishMatches, score: englishMatches },
    french: { chars: frenchChars, words: frenchMatches, score: frenchChars * 2 + frenchMatches },
    german: { chars: germanChars, words: germanMatches, score: germanChars * 2 + germanMatches }
  });

  // Calculate scores (special chars weighted 2x)
  const scores = {
    Spanish: spanishChars * 2 + spanishMatches,
    English: englishMatches,
    French: frenchChars * 2 + frenchMatches,
    German: germanChars * 2 + germanMatches
  };

  // Find language with highest score
  const detectedLanguage = Object.entries(scores).reduce((max, [lang, score]) =>
    score > max.score ? { lang, score } : max,
    { lang: 'English', score: 0 }
  ).lang;

  console.log(`🌍 Detected language: ${detectedLanguage} (confidence: ${scores[detectedLanguage as keyof typeof scores]} points)`);

  return detectedLanguage;
}

/**
 * Generate battle questions from a user's folder
 * Hybrid approach: Extract from existing content + AI generation
 */
export async function generateBattleQuestions(
  userId: string,
  folderId: string,
  count: number,
  options?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    topics?: string[];
    forceAI?: boolean; // Force AI generation even if existing questions found
  }
): Promise<BattleQuestion[]> {
  const startTime = Date.now();
  const supabase = createServiceRoleClient();

  console.log('🎮 Battle Question Generation:', {
    userId,
    folderId,
    count,
    difficulty: options?.difficulty,
    forceAI: options?.forceAI
  });

  // Get all completed jobs in the folder
  const { data: jobs, error: jobsError } = await supabase
    .from('jobs')
    .select('job_id, lecture_title, status, json_file_path')
    .eq('user_id', userId)
    .eq('user_folder_id', folderId)
    .eq('status', 'completed')
    .order('created_at', { ascending: false });

  console.log('📊 Query results:', {
    jobsError,
    jobsCount: jobs?.length || 0,
    userId,
    folderId
  });

  if (jobsError) {
    console.error('❌ Database error fetching jobs:', jobsError);
    throw new Error(`Database error: ${jobsError.message}`);
  }

  if (!jobs || jobs.length === 0) {
    console.error('❌ No completed lectures found:', {
      userId,
      folderId,
      totalRows: jobs?.length || 0
    });

    // Check if folder exists
    const { data: folder, error: folderError } = await supabase
      .from('user_folders')
      .select('id, folder_name, user_id')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      throw new Error(`Folder ${folderId} not found`);
    }

    console.log('📁 Folder exists:', folder);

    // Check if there are ANY jobs for this user/folder (any status)
    const { data: allJobs, error: allJobsError } = await supabase
      .from('jobs')
      .select('job_id, status, user_folder_id')
      .eq('user_id', userId)
      .eq('user_folder_id', folderId);

    console.log('📋 All jobs (any status):', {
      count: allJobs?.length || 0,
      statuses: allJobs?.map(j => j.status)
    });

    throw new Error(`No completed lectures found in folder "${folder.folder_name}". Found ${allJobs?.length || 0} total lectures (statuses: ${allJobs?.map(j => j.status).join(', ') || 'none'}). Please ensure lectures have been processed and completed.`);
  }

  console.log(`📚 Found ${jobs.length} completed lectures in folder ${folderId}`);

  // Collect existing questions from all jobs
  const allExistingQuestions: BattleQuestion[] = [];

  for (const job of jobs) {
    try {
      const questions = await extractQuestionsFromJob(job);
      allExistingQuestions.push(...questions);
    } catch (error) {
      console.error(`Error processing job ${job.job_id}:`, error);
    }
  }

  console.log(`🔍 Extracted ${allExistingQuestions.length} existing questions`);

  // Apply filters to existing questions
  let filteredQuestions = allExistingQuestions;
  if (options?.difficulty) {
    filteredQuestions = filteredQuestions.filter(q => q.difficulty === options.difficulty);
  }

  // Check if we need AI generation
  const needsAIGeneration = options?.forceAI || filteredQuestions.length < count;

  console.log('🎯 Question generation decision:', {
    existingQuestions: filteredQuestions.length,
    requiredCount: count,
    needsAI: needsAIGeneration,
    forceAI: options?.forceAI
  });

  if (!needsAIGeneration) {
    // We have enough existing questions
    const shuffled = shuffleArray(filteredQuestions);
    const selected = shuffled.slice(0, count);
    const elapsed = Date.now() - startTime;

    console.log(`✅ Using ${selected.length} existing questions (${elapsed}ms)`);
    return selected;
  }

  // Generate additional questions with AI
  const needed = Math.max(count - filteredQuestions.length, count);
  console.log(`🤖 Generating ${needed} questions via AI...`);

  const aiQuestions = await generateQuestionsWithAI(jobs, needed, options);

  if (!aiQuestions || aiQuestions.length === 0) {
    console.error('❌ AI generation returned 0 questions');

    // If we have some existing questions, use those instead
    if (filteredQuestions.length > 0) {
      console.log(`⚠️ Falling back to ${filteredQuestions.length} existing questions`);
      return filteredQuestions.slice(0, count);
    }

    throw new Error('Failed to generate questions. No existing questions available and AI generation returned no results.');
  }

  console.log(`✨ AI generated ${aiQuestions.length} questions`);

  // Combine existing + AI generated
  const allQuestions = [...filteredQuestions, ...aiQuestions];
  const shuffled = shuffleArray(allQuestions);
  const selected = shuffled.slice(0, count);
  const elapsed = Date.now() - startTime;

  console.log(`✅ Final: ${selected.length} questions (${filteredQuestions.length} existing + ${aiQuestions.length} AI) in ${elapsed}ms`);

  // Verify we have the required count
  if (selected.length < count) {
    console.warn(`⚠️ Warning: Only generated ${selected.length} questions, but ${count} were requested`);
  }

  return selected;
}

/**
 * Extract questions from a single job (supports multiple formats)
 */
async function extractQuestionsFromJob(job: any): Promise<BattleQuestion[]> {
  const supabase = createServiceRoleClient();
  const questions: BattleQuestion[] = [];

  try {
    // Try json_file_path in storage (primary method)
    if (job.json_file_path) {
      try {
        const { data: fileData } = await supabase.storage
          .from('generated-notes')
          .download(job.json_file_path);

        if (fileData) {
          const text = await fileData.text();
          const jsonData = JSON.parse(text);
          const extracted = extractQuestionsFromJSON(jsonData, job.lecture_title);
          questions.push(...extracted);
        }
      } catch (error) {
        console.log(`No storage file for job ${job.job_id}`);
      }
    }

    // Legacy fallback: Try study_nodes table
    if (questions.length === 0) {
      try {
        const { data: studyNodes } = await supabase
          .from('study_nodes')
          .select('node_data')
          .eq('job_id', job.job_id)
          .eq('node_type', 'questions');

        if (studyNodes && studyNodes.length > 0) {
          for (const node of studyNodes) {
            const extracted = extractQuestionsFromNode(node.node_data, job.lecture_title);
            questions.push(...extracted);
          }
        }
      } catch (error) {
        // study_nodes table might not exist
      }
    }
  } catch (error) {
    console.error('Error extracting questions from job:', error);
  }

  return questions;
}

/**
 * Generate fresh questions using AI (Grok)
 */
async function generateQuestionsWithAI(
  jobs: any[],
  count: number,
  options?: {
    difficulty?: 'easy' | 'medium' | 'hard';
    topics?: string[];
  }
): Promise<BattleQuestion[]> {
  try {
    console.log('🤖 AI Generation - Starting with:', {
      jobsCount: jobs.length,
      requestedCount: count,
      difficulty: options?.difficulty
    });

    // Verify Grok API key is configured
    const { config } = await import('@/lib/config');
    if (!config.grokApiKey) {
      console.error('❌ GROK_API_KEY environment variable is not set!');
      throw new Error('GROK_API_KEY is required for battle question generation');
    }
    console.log('✅ Grok API key is configured');

    // Combine lecture content from all jobs
    const lectureContents: string[] = [];

    for (const job of jobs) {
      const content = await extractLectureContent(job);
      if (content) {
        lectureContents.push(`# ${job.lecture_title}\n\n${content}`);
        console.log(`✅ Extracted content from: ${job.lecture_title} (${content.length} chars)`);
      } else {
        console.warn(`⚠️ No content extracted from: ${job.lecture_title}`);
      }
    }

    if (lectureContents.length === 0) {
      console.error('❌ No content available for AI generation from any job');
      return [];
    }

    console.log(`📝 Total lectures with content: ${lectureContents.length}`);


    // Limit content to avoid token limits (approx 8k tokens = 32k chars)
    const combinedContent = lectureContents.join('\n\n---\n\n').substring(0, 32000);

    console.log(`📦 Combined content: ${combinedContent.length} chars`);

    // Detect language from the combined content
    const detectedLanguage = detectLanguage(combinedContent);
    console.log(`🌍 Content language detected: ${detectedLanguage}`);
    console.log(`📝 Sample content (first 300 chars):\n${combinedContent.slice(0, 300)}...`);

    // Create AI prompt with language specification
    const prompt = createBattleQuestionPrompt({
      lectureContent: combinedContent,
      count,
      difficulty: options?.difficulty || 'medium',
      topics: options?.topics || [],
      language: detectedLanguage
    });

    console.log('📤 Sending request to Grok AI...', {
      model: 'grok-4-fast-reasoning',
      requestedQuestions: count,
      contentLength: combinedContent.length,
      promptLength: prompt.length,
      detectedLanguage: detectedLanguage
    });

    // Call Grok AI with language-aware system prompt
    console.log('🔑 Using Grok API endpoint: https://api.x.ai/v1');
    const completion = await grok.chat.completions.create({
      model: 'grok-4-fast-reasoning',
      messages: [
        {
          role: 'system',
          content: `You are an expert quiz creator for competitive quiz battles. Create high-quality multiple-choice questions that test understanding and critical thinking. ALWAYS generate questions in the SAME language as the source material provided. If the material is in Spanish, generate questions in Spanish. If in English, use English. Match the source language exactly. Always return valid JSON.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' },
      max_completion_tokens: 4000,
      temperature: 0.7
    });

    const generatedContent = completion.choices[0]?.message?.content;

    console.log('📥 Received response from Grok AI');

    if (!generatedContent) {
      console.error('❌ Empty response from Grok AI');
      throw new Error('Empty response from Grok AI');
    }

    // Parse and validate
    const parsed = JSON.parse(generatedContent);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      console.error('❌ Invalid response format:', { parsed });
      throw new Error('Invalid response format from AI');
    }

    console.log(`✅ AI returned ${parsed.questions.length} raw questions`);

    // Validate and convert to BattleQuestion format
    const validated = validateAndSanitizeQuestions(parsed.questions);
    console.log(`✅ After validation: ${validated.length} valid questions`);

    return validated;

  } catch (error: any) {
    console.error('❌ Error generating questions with AI:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      // Include more OpenAI-specific error details
      status: error?.status,
      code: error?.code,
      type: error?.type,
      apiError: error?.error
    });

    // Check for specific Grok API errors
    if (error?.status === 401 || error?.code === 'invalid_api_key') {
      console.error('🔑 Authentication error - GROK_API_KEY is invalid or missing');
    } else if (error?.status === 429) {
      console.error('⏱️ Rate limit exceeded on Grok API');
    } else if (error?.status === 500 || error?.status === 503) {
      console.error('🔧 Grok API service error - try again later');
    }

    return [];
  }
}

/**
 * Extract text content from job for AI generation
 */
async function extractLectureContent(job: any): Promise<string | null> {
  const supabase = createServiceRoleClient();

  try {
    // Load content from storage file
    if (job.json_file_path) {
      const { data: fileData } = await supabase.storage
        .from('generated-notes')
        .download(job.json_file_path);

      if (fileData) {
        const text = await fileData.text();
        const jsonData = JSON.parse(text);
        return formatOpenAIContent(jsonData);
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting lecture content:', error);
    return null;
  }
}

/**
 * Format OpenAI content into readable text for AI prompt
 */
function formatOpenAIContent(data: any): string {
  const parts: string[] = [];

  // Overview
  if (data.overview?.mainTopic) {
    parts.push(data.overview.mainTopic);
  }

  // Explanations (main content)
  if (data.explanations && Array.isArray(data.explanations)) {
    for (const exp of data.explanations) {
      if (exp.concept) {
        parts.push(`\n## ${exp.concept}`);
      }
      if (exp.introduction) {
        parts.push(exp.introduction);
      }
      if (exp.sections && Array.isArray(exp.sections)) {
        for (const section of exp.sections) {
          if (section.content) {
            parts.push(section.content);
          }
        }
      }
    }
  }

  // Summary
  if (data.summary?.sections) {
    parts.push('\n## Summary');
    for (const section of data.summary.sections) {
      if (section.content) {
        parts.push(section.content);
      }
    }
  }

  return parts.join('\n\n');
}

/**
 * Extract questions from study_nodes node_data
 */
function extractQuestionsFromNode(nodeData: any, lectureTopic: string): BattleQuestion[] {
  const questions: BattleQuestion[] = [];

  try {
    // node_data could be array or object with questions
    const questionsData = Array.isArray(nodeData) ? nodeData : nodeData.questions || [];

    for (const q of questionsData) {
      if (q.question && q.options && q.correctAnswer) {
        const question: BattleQuestion = {
          id: crypto.randomUUID(),
          question: q.question,
          options: {
            A: q.options.A || q.options.a || '',
            B: q.options.B || q.options.b || '',
            C: q.options.C || q.options.c || '',
            D: q.options.D || q.options.d || ''
          },
          correctAnswer: (q.correctAnswer || q.correct_answer || '').toUpperCase(),
          topic: q.topic || lectureTopic,
          difficulty: normalizeDifficulty(q.difficulty),
          explanation: q.explanation || q.why || 'Correct answer explanation not available.',
          sourceNote: lectureTopic
        };

        // BUGFIX: Shuffle options to randomize correct answer position
        questions.push(shuffleQuestionOptions(question));
      }
    }
  } catch (error) {
    console.error('Error extracting questions from node:', error);
  }

  return questions;
}

/**
 * Extract questions from JSON storage file
 */
function extractQuestionsFromJSON(jsonData: any, lectureTopic: string): BattleQuestion[] {
  const questions: BattleQuestion[] = [];

  try {
    // Try different possible structures
    const questionsData =
      jsonData.questions ||
      jsonData.content?.questions ||
      jsonData.data?.questions ||
      [];

    for (const q of questionsData) {
      if (q.question && q.options && q.correctAnswer) {
        const question: BattleQuestion = {
          id: crypto.randomUUID(),
          question: q.question,
          options: {
            A: q.options.A || q.options.a || '',
            B: q.options.B || q.options.b || '',
            C: q.options.C || q.options.c || '',
            D: q.options.D || q.options.d || ''
          },
          correctAnswer: (q.correctAnswer || q.correct_answer || '').toUpperCase(),
          topic: q.topic || lectureTopic,
          difficulty: normalizeDifficulty(q.difficulty),
          explanation: q.explanation || q.why || 'Correct answer explanation not available.',
          sourceNote: lectureTopic
        };

        // BUGFIX: Shuffle options to randomize correct answer position
        questions.push(shuffleQuestionOptions(question));
      }
    }
  } catch (error) {
    console.error('Error extracting questions from JSON:', error);
  }

  return questions;
}

/**
 * Normalize difficulty to valid values
 */
function normalizeDifficulty(difficulty: any): 'easy' | 'medium' | 'hard' {
  const d = String(difficulty || 'medium').toLowerCase();
  if (d.includes('easy')) return 'easy';
  if (d.includes('hard')) return 'hard';
  return 'medium';
}

/**
 * Shuffle array using Fisher-Yates algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
