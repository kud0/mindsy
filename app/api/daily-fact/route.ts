import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDailyFact, hasFactForToday } from '@/lib/daily-fact-generator';

/**
 * GET /api/daily-fact
 * Fetch the daily study fact for the authenticated user
 *
 * Returns:
 * - Current fact if exists for today and not dismissed
 * - Generates new fact if outdated or doesn't exist
 * - Returns null if fact is dismissed
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Daily Fact API] GET request received');

    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError) {
      console.error('❌ [Daily Fact API] Authentication error:', authError);
      return NextResponse.json(
        { error: 'Authentication failed', details: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      console.warn('⚠️ [Daily Fact API] No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    console.log(`✅ [Daily Fact API] User authenticated: ${user.id}`);

    // Get user's profile with daily fact data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('daily_fact_text, daily_fact_date, daily_fact_dismissed, daily_fact_collapsed, daily_fact_language')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ [Daily Fact API] Error fetching profile:', {
        error: profileError,
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint
      });

      // Check if it's a missing columns error
      if (profileError.message?.includes('column') || profileError.code === '42703') {
        return NextResponse.json(
          {
            error: 'Database schema error - daily fact columns may not exist. Please run migration 021_add_daily_fact.sql',
            details: profileError.message
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to fetch profile', details: profileError.message },
        { status: 500 }
      );
    }

    if (!profile) {
      console.error('❌ [Daily Fact API] No profile found for user:', user.id);
      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    console.log('✅ [Daily Fact API] Profile fetched:', {
      hasFactText: !!profile.daily_fact_text,
      factDate: profile.daily_fact_date,
      dismissed: profile.daily_fact_dismissed,
      collapsed: profile.daily_fact_collapsed,
      language: profile.daily_fact_language
    });

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format

    // If fact is dismissed, return null
    if (profile.daily_fact_dismissed) {
      return NextResponse.json({
        success: true,
        fact: null,
        dismissed: true,
        collapsed: profile.daily_fact_collapsed,
        date: profile.daily_fact_date
      });
    }

    // Check if we need to generate a new fact
    const needsNewFact =
      !profile.daily_fact_text ||
      !profile.daily_fact_date ||
      profile.daily_fact_date !== today;

    if (needsNewFact) {
      console.log('💡 [Daily Fact API] Generating new daily fact for user:', user.id);

      // Generate new fact
      const result = await generateDailyFact(user.id);

      if (!result.success) {
        console.error('❌ [Daily Fact API] Failed to generate fact:', {
          error: result.error,
          errorCode: result.errorCode
        });

        // Provide specific error messages
        let errorMessage = result.error || 'Failed to generate daily fact';
        if (result.errorCode === 'GROK_API_ERROR') {
          errorMessage = 'AI service error. Please check GROK_API_KEY environment variable.';
        } else if (result.errorCode === 'AUTHENTICATION_ERROR') {
          errorMessage = 'AI service authentication failed. Please verify GROK_API_KEY.';
        } else if (result.error === 'No lectures found for this user') {
          errorMessage = 'No completed lectures found. Upload some content first!';
        }

        return NextResponse.json(
          { error: errorMessage, details: result.error },
          { status: 500 }
        );
      }

      console.log('✅ [Daily Fact API] Fact generated successfully');

      return NextResponse.json({
        success: true,
        fact: result.fact,
        language: result.language,
        dismissed: false,
        collapsed: false,
        date: today,
        generated: true
      });
    }

    console.log('✅ [Daily Fact API] Returning existing fact for today');

    // Return existing fact for today
    return NextResponse.json({
      success: true,
      fact: profile.daily_fact_text,
      language: profile.daily_fact_language,
      dismissed: false,
      collapsed: profile.daily_fact_collapsed,
      date: profile.daily_fact_date,
      generated: false
    });

  } catch (error) {
    console.error('❌ [Daily Fact API] Unexpected error:', error);

    // Extract detailed error information
    const errorDetails = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: 'Unknown error', error };

    console.error('Error details:', errorDetails);

    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/daily-fact
 * Update the daily fact state (dismiss or collapse)
 *
 * Body:
 * - dismissed?: boolean - Mark fact as dismissed for today
 * - collapsed?: boolean - Mark fact as collapsed (minimized)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { dismissed, collapsed } = body;

    // Validate that at least one field is provided
    if (dismissed === undefined && collapsed === undefined) {
      return NextResponse.json(
        { error: 'At least one field (dismissed or collapsed) is required' },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: {
      daily_fact_dismissed?: boolean;
      daily_fact_collapsed?: boolean;
    } = {};

    if (dismissed !== undefined) {
      updateData.daily_fact_dismissed = dismissed;
    }

    if (collapsed !== undefined) {
      updateData.daily_fact_collapsed = collapsed;
    }

    console.log('Updating daily fact state:', { userId: user.id, ...updateData });

    // Update profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating daily fact state:', updateError);
      return NextResponse.json(
        { error: 'Failed to update daily fact state' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Daily fact state updated',
      dismissed: updateData.daily_fact_dismissed,
      collapsed: updateData.daily_fact_collapsed
    });

  } catch (error) {
    console.error('Unexpected error in PATCH /api/daily-fact:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
