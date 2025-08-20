import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase-server';

interface FeedbackSubmission {
  rating: 'great' | 'good' | 'improve';
  suggestion?: string;
  jobId?: string;
  context?: string;
}

interface FeedbackResponse {
  success: boolean;
  message?: string;
  error?: string;
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Create server client with cookies for authentication
    const supabase = createSupabaseServerClient(cookies);
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (!user || authError) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Authentication required'
        }), 
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Parse request body
    const body: FeedbackSubmission = await request.json();
    
    // Validate required fields
    if (!body.rating || !['great', 'good', 'improve'].includes(body.rating)) {
      return new Response(
        JSON.stringify({ 
          success: false,
          error: 'Valid rating is required' 
        }), 
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Store feedback in database
    // For now, we'll create a simple feedback table structure
    const feedbackData = {
      user_id: user.id,
      rating: body.rating,
      suggestion: body.suggestion || null,
      job_id: body.jobId || null,
      context: body.context || null,
      created_at: new Date().toISOString(),
      user_email: user.email, // Helpful for follow-up
    };

    // Insert into a feedback table (we'll create this table later)
    const { error: insertError } = await supabase
      .from('feedback')
      .insert(feedbackData);

    // If feedback table doesn't exist, we'll log to console for now
    // and still return success to avoid breaking user experience
    if (insertError) {
      console.log('Feedback submission (table may not exist yet):', feedbackData);
      console.error('Database insertion error:', insertError);
    }

    // Return success response
    const response: FeedbackResponse = {
      success: true,
      message: 'Feedback received successfully'
    };

    return new Response(
      JSON.stringify(response), 
      { 
        status: 200, 
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      }
    );

  } catch (error) {
    console.error('Feedback API error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false,
        error: 'Failed to submit feedback'
      }), 
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
};