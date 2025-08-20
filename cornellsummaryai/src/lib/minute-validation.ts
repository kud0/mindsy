/**
 * Minute-Based Usage Validation
 * Updated validation system using minute-based tracking instead of MB-based
 */

import { createSupabaseServerClient, supabaseAdmin } from './supabase-server';
import { extractDurationWithFFprobe, checkFFprobeAvailable } from './ffprobe-duration';

export interface MinuteValidationResult {
  can_process: boolean;
  message: string;
  current_usage_minutes: number;
  monthly_limit_minutes: number;
  files_this_month: number;
  summary_limit: number;
  user_tier: string;
  estimated_duration_minutes: number;
  remaining_minutes: number;
}

/**
 * Extract OBJECTIVE audio duration using FFprobe (no guessing!)
 * @param audioBuffer - Audio file buffer
 * @param fileSizeMB - File size in MB (only used for fallback estimation)
 * @returns Exact duration in minutes
 */
async function getObjectiveAudioDuration(audioBuffer: Buffer, fileSizeMB: number): Promise<number> {
  try {
    // Check if FFprobe is available
    const ffprobeAvailable = await checkFFprobeAvailable();
    
    if (ffprobeAvailable) {
      console.log('🎯 Using FFprobe for OBJECTIVE duration extraction');
      // Use FFprobe for exact duration - no guessing!
      return await extractDurationWithFFprobe(audioBuffer, estimateFromFileSize(fileSizeMB));
    } else {
      console.warn('⚠️ FFprobe not available, falling back to file size estimation');
      return estimateFromFileSize(fileSizeMB);
    }
  } catch (error) {
    console.warn('FFprobe extraction failed, using file size fallback:', error);
    return estimateFromFileSize(fileSizeMB);
  }
}

/**
 * File size estimation (only used as last resort fallback)
 * @param fileSizeMB - File size in MB
 * @returns Estimated duration in minutes
 */
function estimateFromFileSize(fileSizeMB: number): number {
  console.warn('📊 Using file size estimation (not objective!)');
  // Conservative estimation: ~0.75MB per minute for compressed audio
  const estimatedMinutes = Math.ceil(fileSizeMB / 0.75);
  
  // Ensure reasonable bounds (1 minute to 8 hours)
  return Math.max(1, Math.min(480, estimatedMinutes));
}

/**
 * Check usage limits using the new minute-based system
 * @param userId - User ID
 * @param fileSizeMB - File size in MB (for duration estimation fallback)
 * @param audioBuffer - Optional audio buffer for accurate duration extraction
 * @param clientDurationMinutes - Client-side duration (most accurate, preferred)
 * @returns Validation result
 */
export async function checkMinuteBasedUsageLimits(
  userId: string,
  fileSizeMB: number,
  audioBuffer?: Buffer,
  clientDurationMinutes?: number
): Promise<MinuteValidationResult> {
  try {
    // PRIORITY: Use client-side duration if provided (most accurate)
    let estimatedDurationMinutes: number;
    
    
    if (clientDurationMinutes && clientDurationMinutes > 0) {
      // Use client-side duration (most accurate)
      estimatedDurationMinutes = Math.ceil(clientDurationMinutes);
    } else if (audioBuffer && audioBuffer.length > 0) {
      try {
        // Check if FFprobe is available
        const ffprobeAvailable = await checkFFprobeAvailable();
        if (ffprobeAvailable) {
          estimatedDurationMinutes = await extractDurationWithFFprobe(audioBuffer, 0);
        } else {
          estimatedDurationMinutes = estimateFromFileSize(fileSizeMB);
        }
      } catch (ffprobeError) {
        console.error('FFprobe failed:', ffprobeError);
        estimatedDurationMinutes = estimateFromFileSize(fileSizeMB);
      }
    } else {
      estimatedDurationMinutes = estimateFromFileSize(fileSizeMB);
    }

    // Get current usage using the updated database function
    const { data: usageData, error: usageError } = await supabaseAdmin
      .rpc('get_current_usage', { p_user_id: userId });

    if (usageError) {
      console.error('Error fetching usage:', usageError);
      throw new Error(`Failed to fetch usage data: ${usageError.message}`);
    }

    const usage = usageData?.[0];
    if (!usage) {
      throw new Error('No usage data found for user');
    }

    const result: MinuteValidationResult = {
      can_process: false,
      message: '',
      current_usage_minutes: usage.current_usage_minutes || 0,
      monthly_limit_minutes: usage.monthly_limit_minutes || 180, // Default 3 hours for free
      files_this_month: usage.files_processed || 0,
      summary_limit: usage.summary_limit || 2,
      user_tier: usage.user_tier || 'free',
      estimated_duration_minutes: estimatedDurationMinutes,
      remaining_minutes: usage.remaining_minutes || 0
    };

    // Check individual file duration limit (different per tier)
    const maxFileMinutes = usage.user_tier === 'student' ? 240 : 120; // 4h for student, 2h for free
    if (estimatedDurationMinutes > maxFileMinutes) {
      const hours = Math.floor(estimatedDurationMinutes / 60);
      const mins = estimatedDurationMinutes % 60;
      const maxHours = Math.floor(maxFileMinutes / 60);
      result.message = `Your audio is ${hours}h ${mins}m long, but ${usage.user_tier} plan allows max ${maxHours}h per file. Try splitting into shorter recordings.`;
      return result;
    }

    // Check monthly limit
    if ((result.current_usage_minutes + estimatedDurationMinutes) > result.monthly_limit_minutes) {
      const totalWouldBe = result.current_usage_minutes + estimatedDurationMinutes;
      const totalHours = Math.ceil(totalWouldBe / 60);
      const limitHours = Math.ceil(result.monthly_limit_minutes / 60);
      const currentHours = Math.floor(result.current_usage_minutes / 60);
      const currentMins = result.current_usage_minutes % 60;
      const uploadHours = Math.floor(estimatedDurationMinutes / 60);
      const uploadMins = estimatedDurationMinutes % 60;
      result.message = `This ${uploadHours}h ${uploadMins}m audio would exceed your monthly limit. You've used ${currentHours}h ${currentMins}m of ${limitHours}h. Your limit resets next month.`;
      return result;
    }

    // Check summary count limit (for free tier)
    if (result.summary_limit !== -1 && result.files_this_month >= result.summary_limit) {
      result.message = `You've reached your monthly limit of ${result.summary_limit} uploads on the ${result.user_tier} plan. Your limit resets next month.`;
      return result;
    }

    // All checks passed
    result.can_process = true;
    const remainingHours = Math.floor(result.remaining_minutes / 60);
    const remainingMins = result.remaining_minutes % 60;
    result.message = `Within limits - ${remainingHours}h ${remainingMins}m remaining this month`;

    return result;

  } catch (error) {
    console.error('Minute-based validation error:', error);
    throw new Error(`Usage validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update existing job record with duration tracking after successful processing
 * @param jobId - Job ID to update
 * @param durationMinutes - Actual duration in minutes
 * @param fileSizeMB - File size in MB (kept for transition period)
 * @returns Success boolean
 */
export async function updateJobWithDuration(
  jobId: string,
  durationMinutes: number,
  fileSizeMB: number
): Promise<boolean> {
  try {
    // Ensure values are proper types with better validation
    const durationInt = Math.ceil(Number(durationMinutes) || 0);
    const fileSizeNum = parseFloat(String(fileSizeMB)) || 0;
    
    // Debug logging
    
    // Validate the numbers
    if (!Number.isFinite(durationInt) || durationInt <= 0) {
      console.error(`❌ Invalid duration: ${durationInt}`);
      return false;
    }
    
    if (!Number.isFinite(fileSizeNum) || fileSizeNum < 0) {
      console.error(`❌ Invalid file size: ${fileSizeNum}`);
      return false;
    }
    
    
    // Update the existing job record with accurate duration and file size
    // NOTE: If file_size_mb is INTEGER in database, we need to round it
    const updateData: any = {
      duration_minutes: durationInt,
      updated_at: new Date().toISOString()
    };
    
    // Only include file_size_mb if it's valid
    if (fileSizeNum > 0) {
      // Try with integer first (if column is INTEGER type)
      updateData.file_size_mb = Math.round(fileSizeNum);
    }
    
    
    const { error } = await supabaseAdmin
      .from('jobs')
      .update(updateData)
      .eq('job_id', jobId);

    if (error) {
      console.error('Error updating job with duration:', error);
      return false;
    }

    return true;

  } catch (error) {
    console.error('Error in updateJobWithDuration:', error);
    return false;
  }
}