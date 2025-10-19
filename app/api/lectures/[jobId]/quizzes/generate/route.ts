import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';
import { generateQuiz, type QuizGenerationInput } from '@/lib/grok-client';

export const dynamic = 'force-dynamic';

/**
 * Interface for quiz generation request
 */
interface QuizGenerationRequest {
  difficulty: 'easy' | 'medium' | 'hard';
  numQuestions: number; // 5-10
  questionTypes: ('multiple-choice' | 'true-false' | 'fill-number')[];
  focusTopics?: string[];
}

/**
 * POST /api/lectures/[jobId]/quizzes/generate
 * Generate a new quiz on-demand for a lecture
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { jobId: string } }
) {
  // Authenticate user
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  const { user } = authResult;
  const { jobId } = params;

  try {
    // Parse request body
    const body: QuizGenerationRequest = await request.json();

    // Validate request body
    if (!body.difficulty || !['easy', 'medium', 'hard'].includes(body.difficulty)) {
      return createErrorResponse('Invalid difficulty level. Must be easy, medium, or hard');
    }

    if (!body.numQuestions || typeof body.numQuestions !== 'number') {
      return createErrorResponse('numQuestions is required and must be a number');
    }

    // Validate numQuestions is between 5-10
    if (body.numQuestions < 5 || body.numQuestions > 10) {
      return createErrorResponse('Number of questions must be between 5 and 10');
    }

    if (!body.questionTypes || !Array.isArray(body.questionTypes) || body.questionTypes.length === 0) {
      return createErrorResponse('At least one question type must be selected');
    }

    // Validate question types
    const validTypes = ['multiple-choice', 'true-false', 'fill-number'];
    const invalidTypes = body.questionTypes.filter(t => !validTypes.includes(t));
    if (invalidTypes.length > 0) {
      return createErrorResponse(`Invalid question types: ${invalidTypes.join(', ')}`);
    }

    console.log('📝 Quiz generation request:', {
      jobId,
      userId: user.id,
      difficulty: body.difficulty,
      numQuestions: body.numQuestions,
      questionTypes: body.questionTypes
    });

    const supabase = await createClient();

    // Fetch job to verify ownership and get transcript
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('user_id, txt_file_path, lecture_title, detected_language')
      .eq('job_id', jobId)
      .single();

    if (jobError || !job) {
      return createErrorResponse('Lecture not found', 404);
    }

    // Verify user owns this lecture
    if (job.user_id !== user.id) {
      return createErrorResponse('Unauthorized', 403);
    }

    // Verify lecture has been transcribed
    if (!job.txt_file_path) {
      return createErrorResponse('Lecture must be transcribed before generating a quiz', 400);
    }

    // Use service role client for storage access (user doesn't have direct bucket access)
    const { createClient: createSupabaseAdmin } = await import('@supabase/supabase-js');
    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('📥 Fetching transcript from storage:', job.txt_file_path);

    // Fetch transcript from storage
    const { data: transcriptData, error: transcriptError } = await supabaseAdmin.storage
      .from('generated-notes')
      .download(job.txt_file_path);

    if (transcriptError || !transcriptData) {
      console.error('❌ Failed to fetch transcript:', transcriptError);
      return createErrorResponse('Failed to fetch lecture transcript', 500);
    }

    const transcriptText = await transcriptData.text();

    // Prepare quiz generation input
    const quizInput: QuizGenerationInput = {
      transcript: transcriptText,
      lectureTitle: job.lecture_title,
      difficulty: body.difficulty,
      numQuestions: body.numQuestions,
      questionTypes: body.questionTypes,
      focusTopics: body.focusTopics,
      detectedLanguage: job.detected_language || undefined
    };

    console.log('🤖 Calling Grok to generate quiz...');

    // Generate quiz using Grok
    const quizResult = await generateQuiz(quizInput);

    if (!quizResult.success || !quizResult.questions) {
      console.error('❌ Quiz generation failed:', quizResult.error);
      return createErrorResponse(
        quizResult.error || 'Quiz generation failed',
        500
      );
    }

    console.log(`✅ Quiz generated successfully with ${quizResult.questions.length} questions`);

    // Count existing quizzes for this lecture to generate title
    const { count: quizCount } = await supabase
      .from('quizzes')
      .select('*', { count: 'exact', head: true })
      .eq('job_id', jobId);

    const quizNumber = (quizCount || 0) + 1;
    const quizTitle = `Quiz #${quizNumber}`;

    // Save quiz to database
    const { data: savedQuiz, error: saveError } = await supabase
      .from('quizzes')
      .insert({
        job_id: jobId,
        user_id: user.id,
        title: quizTitle,
        questions: quizResult.questions,
        quiz_config: {
          difficulty: body.difficulty,
          numQuestions: body.numQuestions,
          questionTypes: body.questionTypes,
          focusTopics: body.focusTopics || []
        }
      })
      .select()
      .single();

    if (saveError || !savedQuiz) {
      console.error('❌ Failed to save quiz:', saveError);
      return createErrorResponse('Failed to save quiz', 500);
    }

    console.log('✅ Quiz saved to database:', savedQuiz.id);

    // Return success with quiz data
    return createSuccessResponse({
      quizId: savedQuiz.id,
      title: savedQuiz.title,
      questions: savedQuiz.questions,
      config: savedQuiz.quiz_config,
      createdAt: savedQuiz.created_at
    });

  } catch (error) {
    console.error('❌ Quiz generation error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}
