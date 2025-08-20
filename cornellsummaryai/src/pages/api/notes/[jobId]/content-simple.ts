import type { APIRoute } from 'astro';
import { createSuccessResponse } from '@/lib/api-response';
import { ErrorType, createErrorResponse } from '@/lib/error-handling';

// Simplified version that just returns success for testing
export const PUT: APIRoute = async ({ request, params }) => {
  try {
    const { jobId } = params;
    
    if (!jobId) {
      return createErrorResponse(
        'Job ID is required',
        400,
        ErrorType.VALIDATION
      );
    }

    // Parse request body
    const body = await request.json();
    const { content, format = 'md' } = body;

    if (!content) {
      return createErrorResponse(
        'Content is required',
        400,
        ErrorType.VALIDATION
      );
    }

    // For now, just log and return success
    console.log(`Saving content for job ${jobId}, length: ${content.length} characters`);

    return createSuccessResponse({
      message: 'Content updated successfully',
      jobId,
      saved: true,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in PUT /api/notes/[jobId]/content-simple:', error);
    return createErrorResponse(
      'Internal server error',
      500,
      ErrorType.INTERNAL
    );
  }
};