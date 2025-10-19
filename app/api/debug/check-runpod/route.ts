import { NextRequest } from 'next/server';
import { createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';
import { config } from '@/lib/config';

// GET /api/debug/check-runpod?jobId=xxx - Check RunPod job status directly
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const runpodJobId = searchParams.get('jobId') || 'd52a7312-8019-42d4-a2e7-82bbf8db4a43-e2';

  console.log('🔍 Checking RunPod job status:', runpodJobId);

  try {
    const response = await fetch(`https://api.runpod.ai/v2/ojwmcpij9mwq9w/status/${runpodJobId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.runpodApiKey}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return createErrorResponse(`RunPod API error: ${response.status} - ${errorText}`, response.status);
    }

    const runpodData = await response.json();

    console.log('📊 RunPod Status:', runpodData.status);

    return createSuccessResponse({
      runpodJobId,
      status: runpodData.status,
      hasOutput: !!runpodData.output,
      fullResponse: runpodData,
      diagnosis: diagnoseStatus(runpodData)
    });

  } catch (error) {
    console.error('❌ Error checking RunPod:', error);
    return createErrorResponse(`Error: ${error instanceof Error ? error.message : 'Unknown'}`, 500);
  }
}

function diagnoseStatus(data: any): string {
  if (data.status === 'COMPLETED' && data.output) {
    return '✅ RunPod finished successfully! Webhook should have been called. Check webhook logs.';
  }

  if (data.status === 'COMPLETED' && !data.output) {
    return '⚠️ RunPod completed but no output. Audio might be empty or corrupted.';
  }

  if (data.status === 'IN_PROGRESS' || data.status === 'IN_QUEUE') {
    return `⏳ Still processing (${data.status}). This is normal for large files.`;
  }

  if (data.status === 'FAILED') {
    return `❌ RunPod job failed: ${data.error || 'Unknown error'}`;
  }

  return `❓ Unknown status: ${data.status}`;
}