// Grace System API Integration Changes
// File: src/pages/api/generate.ts

// 1. Enhanced Usage Validation with Grace Support
async function validateUsageWithGrace(userClient: any, userId: string, fileSizeMB: number) {
  try {
    // Use new grace-enabled function
    const { data: usageCheck, error: usageError } = await userClient.admin
      .rpc('check_usage_limits_with_grace', {
        p_user_id: userId,
        p_file_size_mb: Math.ceil(fileSizeMB)
      });

    if (usageError) {
      console.error('Error checking usage limits:', usageError);
      return {
        success: false,
        error: 'Failed to validate usage limits',
        errorCode: 'DATABASE_ERROR',
        details: usageError.message
      };
    }

    if (!usageCheck || usageCheck.length === 0) {
      return {
        success: false,
        error: 'No usage information returned',
        errorCode: 'DATABASE_ERROR'
      };
    }

    const usage = usageCheck[0];
    
    if (!usage.can_process) {
      return {
        success: false,
        error: usage.message,
        errorCode: 'PROCESSING_FAILED',
        details: {
          currentUsageMB: usage.current_usage_mb,
          monthlyLimitMB: usage.monthly_limit_mb,
          filesThisMonth: usage.files_this_month,
          userTier: usage.user_tier,
          usingGrace: usage.using_grace,
          graceUsedMB: usage.grace_used_mb,
          graceAvailableMB: usage.grace_available_mb,
          upgradeUrl: '/dashboard/account#subscription'
        }
      };
    }

    console.log(`Usage validation passed for user ${userId}: ${usage.message}`);
    if (usage.using_grace) {
      console.log(`🎁 Using grace: ${usage.grace_used_mb}MB grace used, ${usage.grace_available_mb}MB remaining`);
    }
    
    return {
      success: true,
      usage: usage,
      isUsingGrace: usage.using_grace,
      graceInfo: {
        graceUsedMB: usage.grace_used_mb,
        graceAvailableMB: usage.grace_available_mb
      }
    };
    
  } catch (error) {
    console.error('Usage validation error:', error);
    return {
      success: false,
      error: 'Failed to validate usage limits',
      errorCode: 'DATABASE_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// 2. Enhanced Usage Tracking with Grace
async function trackUsageWithGrace(
  userClient: any, 
  userId: string, 
  fileSizeMB: number, 
  isUsingGrace: boolean, 
  graceUsedMB: number = 0
) {
  try {
    const { data: trackResult, error: trackError } = await userClient.admin
      .rpc('track_usage_with_grace', {
        p_user_id: userId,
        p_file_size_mb: Math.ceil(fileSizeMB),
        p_grace_used_mb: isUsingGrace ? graceUsedMB : 0
      });

    if (trackError) {
      console.error('Error tracking usage:', trackError);
      return false;
    }

    console.log(`✅ Usage tracked: ${fileSizeMB}MB${isUsingGrace ? ` (${graceUsedMB}MB grace)` : ''}`);
    return true;
  } catch (error) {
    console.error('Usage tracking error:', error);
    return false;
  }
}

// 3. Integration into Generate API POST handler
// Replace the existing usage validation section (lines 290-351) with:

// STEP: Validate usage limits with grace support
const actualFileSizeMB = sanitizedBody.fileSizeMB || 10;
console.log(`📊 Using file size for validation: ${actualFileSizeMB}MB`);

const usageValidation = await validateUsageWithGrace(userClient, user.id, actualFileSizeMB);

if (!usageValidation.success) {
  return createErrorResponse(
    429,
    usageValidation.error,
    usageValidation.errorCode as ErrorCodes,
    usageValidation.details
  );
}

// Store grace information for later usage tracking
const isUsingGrace = usageValidation.isUsingGrace;
const graceInfo = usageValidation.graceInfo;

// Calculate grace used for this specific upload
let graceUsedForThisUpload = 0;
if (isUsingGrace) {
  const currentUsage = usageValidation.usage.current_usage_mb;
  const monthlyLimit = usageValidation.usage.monthly_limit_mb;
  const totalAfterUpload = currentUsage + actualFileSizeMB;
  graceUsedForThisUpload = Math.max(0, totalAfterUpload - monthlyLimit);
}

// ... [existing job creation and processing code] ...

// STEP: Track usage with grace (after successful processing)
// Replace the existing increment_usage call with:
const usageTracked = await trackUsageWithGrace(
  userClient,
  user.id,
  actualFileSizeMB,
  isUsingGrace,
  graceUsedForThisUpload
);

if (!usageTracked) {
  console.warn('⚠️ Failed to track usage, but processing completed successfully');
  // Don't fail the request, but log the issue
}

// Enhanced success response with grace information
const response: GenerateSuccessResponse & { graceInfo?: any } = {
  success: true,
  message: 'Cornell Notes generated successfully',
  jobId: jobId,
  downloadUrl: downloadUrl,
  apiDownloadUrl: `/api/download/${jobId}`,
  processingStatus: {
    transcription: 'completed',
    pdfExtraction: pdfFilePath ? 'completed' : 'skipped',
    notesGeneration: 'completed',
    pdfGeneration: 'completed'
  }
};

// Add grace info to response if grace was used (for logging/debugging)
if (isUsingGrace) {
  response.graceInfo = {
    graceUsedThisUpload: graceUsedForThisUpload,
    totalGraceUsed: graceInfo.graceUsedMB + graceUsedForThisUpload,
    graceRemaining: graceInfo.graceAvailableMB - graceUsedForThisUpload
  };
}

return new Response(JSON.stringify(response), {
  status: 200,
  headers: { 'Content-Type': 'application/json' }
});

// 4. Update Usage API Response Interface
interface UsageResponseWithGrace {
  success: boolean;
  usage?: {
    currentMonthUsage: {
      totalMB: number;
      filesProcessed: number;
      limit: {
        monthlyMB: number;
        maxFileSize: number;
        summariesPerMonth: number;
      };
      remaining: {
        mb: number;
        files: number;
      };
      // Grace information (only for paying users)
      grace?: {
        enabled: boolean;
        totalMB: number;
        usedMB: number;
        remainingMB: number;
      };
    };
    tier: 'free' | 'student';
    lastUpdated: string;
  };
  error?: string;
}

// 5. Enhanced Usage API (src/pages/api/user/usage.ts)
// Replace the existing get_current_usage call with:
const { data: usageData, error: usageError } = await supabaseAdmin
  .rpc('get_current_usage_with_grace', { p_user_id: user.id });

// Update response construction to include grace info:
const response: UsageResponseWithGrace = {
  success: true,
  usage: {
    currentMonthUsage: {
      totalMB: usage.current_usage_mb || 0,
      filesProcessed: usage.files_processed || 0,
      limit: {
        monthlyMB: usage.monthly_limit_mb || 120,
        maxFileSize: usage.monthly_limit_mb === 700 ? 300 : 60,
        summariesPerMonth: usage.summary_limit || 2
      },
      remaining: {
        mb: usage.remaining_mb || 0,
        files: usage.remaining_files || 0
      },
      // Add grace information for paying users
      ...(usage.grace_enabled && {
        grace: {
          enabled: usage.grace_enabled,
          totalMB: usage.grace_total_mb,
          usedMB: usage.grace_used_mb,
          remainingMB: usage.grace_remaining_mb
        }
      })
    },
    tier: usage.user_tier as 'free' | 'student' || 'free',
    lastUpdated: new Date().toISOString()
  }
};

// 6. Error Handling Enhancement
// Grace-specific error codes
enum GraceErrorCodes {
  GRACE_EXHAUSTED = 'GRACE_EXHAUSTED',
  GRACE_INSUFFICIENT = 'GRACE_INSUFFICIENT',
  GRACE_NOT_AVAILABLE = 'GRACE_NOT_AVAILABLE'
}

// Enhanced error messages for grace scenarios
function createGraceErrorResponse(usage: any): Response {
  if (usage.user_tier === 'free') {
    return createErrorResponse(
      429,
      `Upload would exceed your ${usage.monthly_limit_mb}MB monthly limit. Upgrade to Student plan for more storage and grace buffer.`,
      ErrorCodes.PROCESSING_FAILED,
      {
        currentUsageMB: usage.current_usage_mb,
        monthlyLimitMB: usage.monthly_limit_mb,
        upgradeUrl: '/dashboard/account#subscription',
        upgradeMessage: 'Upgrade to Student plan for 700MB monthly limit plus 25MB grace buffer'
      }
    );
  }

  return createErrorResponse(
    429,
    usage.message,
    GraceErrorCodes.GRACE_EXHAUSTED,
    {
      currentUsageMB: usage.current_usage_mb,
      monthlyLimitMB: usage.monthly_limit_mb,
      graceUsedMB: usage.grace_used_mb,
      graceAvailableMB: usage.grace_available_mb,
      contactMessage: 'Contact support if you need additional storage'
    }
  );
}