import { NextRequest } from 'next/server'
import { createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth'
import { config } from '@/lib/config'
import { validateOpenAIConfig } from '@/lib/openai-client'

// GET /api/debug/check-pipeline - Check if the content generation pipeline is configured correctly
export async function GET(request: NextRequest) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return createErrorResponse('Not available in production', 403)
  }

  const checks = {
    environment: {
      runpodKey: !!config.runpodApiKey,
      openaiKey: !!config.openaiKey,
      webhookUrl: !!config.webhookBaseUrl,
      supabaseUrl: !!config.supabaseUrl,
      supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    openai: validateOpenAIConfig(),
    webhookEndpoint: {
      exists: true,
      path: '/api/runpod-webhook',
      expectedFlow: [
        '1. RunPod completes transcription',
        '2. Sends webhook to /api/runpod-webhook',
        '3. Webhook calls handleTranscriptionCompletion',
        '4. That calls handleGenerationStage',
        '5. OpenAI generates content',
        '6. Content saved to study_guides table'
      ]
    },
    possibleIssues: []
  }

  // Check for common issues
  if (!checks.environment.openaiKey) {
    checks.possibleIssues.push('❌ OpenAI API key not configured (OPENAI_KEY env var)')
  }

  if (!checks.environment.webhookUrl) {
    checks.possibleIssues.push('⚠️ Webhook URL not configured - using local fallback')
  }

  if (!checks.environment.runpodKey) {
    checks.possibleIssues.push('❌ RunPod API key not configured')
  }

  // Determine if new uploads will work
  const willNewUploadsWork =
    checks.environment.runpodKey &&
    checks.environment.openaiKey &&
    checks.openai.valid

  return createSuccessResponse({
    status: willNewUploadsWork ? '✅ Ready' : '❌ Not Ready',
    willNewUploadsWork,
    checks,
    recommendation: willNewUploadsWork
      ? 'New uploads should generate content automatically!'
      : 'Fix the issues below before uploading new files',
    nextSteps: !willNewUploadsWork ? [
      'Add OPENAI_KEY to your .env.local file',
      'Restart your dev server after adding the key',
      'Then new uploads will generate content automatically'
    ] : ['Upload a new file to test the complete flow'],
    testWithExisting: 'To fix existing lectures without content, use /api/debug/generate-missing-content'
  })
}