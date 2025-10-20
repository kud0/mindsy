import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateDailyStudyFact } from '@/lib/grok-client';
import { detectLanguageFromText } from '@/lib/language-utils';

export interface GenerateDailyFactResult {
  success: boolean;
  fact?: string;
  language?: string;
  error?: string;
}

/**
 * Generate a daily study fact for a user based on their recent lectures
 *
 * @param userId - The user's ID
 * @returns Result with fact, language, and status
 */
export async function generateDailyFact(userId: string): Promise<GenerateDailyFactResult> {
  try {
    console.log('💡 Generating daily fact for user:', userId);

    const supabase = createServiceRoleClient();

    // Fetch user's most recent 10 lectures (completed only)
    const { data: lectures, error: fetchError } = await supabase
      .from('jobs')
      .select('job_id, lecture_title, course_subject, created_at')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    if (fetchError) {
      console.error('Error fetching lectures:', fetchError);
      return {
        success: false,
        error: 'Failed to fetch user lectures'
      };
    }

    if (!lectures || lectures.length === 0) {
      console.log('No lectures found for user:', userId);
      return {
        success: false,
        error: 'No lectures found for this user'
      };
    }

    console.log(`Found ${lectures.length} lectures for fact generation`);

    // Extract topics from lectures
    const recentTopics: string[] = [];
    let detectedLanguage: string | undefined;

    for (const lecture of lectures) {
      // Combine title and subject for better context
      const topic = lecture.course_subject
        ? `${lecture.lecture_title} (${lecture.course_subject})`
        : lecture.lecture_title;

      recentTopics.push(topic);

      // Detect language from first lecture if not yet detected
      if (!detectedLanguage && lecture.lecture_title) {
        detectedLanguage = detectLanguageFromText(lecture.lecture_title);
      }
    }

    console.log('Recent topics:', recentTopics);
    console.log('Detected language:', detectedLanguage);

    // Generate daily fact using Grok AI
    const factResult = await generateDailyStudyFact({
      recentTopics,
      detectedLanguage
    });

    if (!factResult.success || !factResult.fact) {
      console.error('Failed to generate fact:', factResult.error);
      return {
        success: false,
        error: factResult.error || 'Failed to generate daily fact'
      };
    }

    console.log('Generated fact:', factResult.fact);

    // Update user's profile with the new fact
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        daily_fact_text: factResult.fact,
        daily_fact_date: today,
        daily_fact_language: factResult.language || detectedLanguage || 'en',
        daily_fact_dismissed: false, // Reset dismissed flag
        daily_fact_collapsed: false  // Reset collapsed flag
      })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating profile with daily fact:', updateError);
      return {
        success: false,
        error: 'Failed to save daily fact to profile'
      };
    }

    console.log('✅ Daily fact saved to user profile');

    return {
      success: true,
      fact: factResult.fact,
      language: factResult.language || detectedLanguage
    };

  } catch (error) {
    console.error('Unexpected error in generateDailyFact:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

/**
 * Check if a fact exists for today and is not dismissed
 *
 * @param userId - The user's ID
 * @returns Whether a valid fact exists for today
 */
export async function hasFactForToday(userId: string): Promise<boolean> {
  try {
    const supabase = createServiceRoleClient();
    const today = new Date().toISOString().split('T')[0];

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('daily_fact_date, daily_fact_dismissed, daily_fact_text')
      .eq('id', userId)
      .single();

    if (error || !profile) {
      return false;
    }

    // Check if fact exists for today and is not dismissed
    return (
      profile.daily_fact_date === today &&
      profile.daily_fact_text &&
      !profile.daily_fact_dismissed
    );
  } catch (error) {
    console.error('Error checking daily fact:', error);
    return false;
  }
}
