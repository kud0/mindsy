/**
 * Audio Duration Extraction Utility
 * 
 * Provides methods to extract audio duration from files both client-side and server-side.
 * Used for minute-based usage tracking instead of MB-based tracking.
 */

import { parseBuffer } from 'music-metadata';

/**
 * Extract audio duration from a file buffer (server-side)
 * Uses music-metadata library for pure JavaScript implementation
 * 
 * @param buffer - Audio file buffer
 * @param fallbackMinutes - Fallback duration if extraction fails
 * @returns Promise<number> - Duration in minutes (rounded up)
 */
export async function extractDurationFromBuffer(
  buffer: Buffer, 
  fallbackMinutes: number = 5
): Promise<number> {
  try {
    console.log(`🎵 Extracting duration from audio buffer (${buffer.length} bytes)`);
    
    const metadata = await parseBuffer(buffer);
    
    if (!metadata.format.duration) {
      console.warn('⚠️ No duration found in metadata, using fallback');
      return fallbackMinutes;
    }
    
    const durationSeconds = metadata.format.duration;
    const durationMinutes = Math.ceil(durationSeconds / 60); // Round up to next minute
    
    console.log(`✅ Duration extracted: ${durationSeconds}s = ${durationMinutes} minutes`);
    
    // Sanity check: duration should be reasonable (1 minute to 8 hours)
    if (durationMinutes < 1 || durationMinutes > 480) {
      console.warn(`⚠️ Unreasonable duration (${durationMinutes}min), using fallback`);
      return fallbackMinutes;
    }
    
    return durationMinutes;
    
  } catch (error) {
    console.error('❌ Error extracting audio duration:', error);
    console.log(`🔄 Using fallback duration: ${fallbackMinutes} minutes`);
    return fallbackMinutes;
  }
}

/**
 * Extract audio duration from a file URL by downloading and parsing
 * 
 * @param fileUrl - Signed URL to audio file
 * @param fallbackMinutes - Fallback duration if extraction fails
 * @returns Promise<number> - Duration in minutes (rounded up)
 */
export async function extractDurationFromUrl(
  fileUrl: string, 
  fallbackMinutes: number = 5
): Promise<number> {
  try {
    
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to download audio file: ${response.status}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    return await extractDurationFromBuffer(buffer, fallbackMinutes);
    
  } catch (error) {
    console.error('❌ Error downloading/extracting audio duration:', error);
    console.log(`🔄 Using fallback duration: ${fallbackMinutes} minutes`);
    return fallbackMinutes;
  }
}

/**
 * Estimate duration from file size as a backup method
 * Rough estimation: 1MB ≈ 1 minute of compressed audio (MP3/M4A)
 * 
 * @param fileSizeMB - File size in megabytes
 * @returns number - Estimated duration in minutes
 */
export function estimateDurationFromFileSize(fileSizeMB: number): number {
  // More conservative estimation:
  // - High quality MP3: ~1MB per minute
  // - Medium quality MP3: ~0.5MB per minute  
  // - Use average of 0.75MB per minute
  const estimatedMinutes = Math.ceil(fileSizeMB / 0.75);
  
  // Ensure reasonable bounds (1 minute to 8 hours)
  return Math.max(1, Math.min(480, estimatedMinutes));
}

/**
 * Client-side duration extraction (for immediate feedback)
 * Returns a Promise that resolves with duration in minutes
 * 
 * @param file - File object from input
 * @returns Promise<number> - Duration in minutes (rounded up)
 */
export function getClientSideDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    try {
      const audio = new Audio();
      const objectUrl = URL.createObjectURL(file);
      
      const cleanup = () => {
        URL.revokeObjectURL(objectUrl);
        audio.removeEventListener('loadedmetadata', onLoaded);
        audio.removeEventListener('error', onError);
      };
      
      const onLoaded = () => {
        const durationSeconds = audio.duration;
        const durationMinutes = Math.ceil(durationSeconds / 60);
        
        console.log(`📱 Client-side duration: ${durationSeconds}s = ${durationMinutes} minutes`);
        
        cleanup();
        
        // Sanity check
        if (durationMinutes < 1 || durationMinutes > 480 || !isFinite(durationMinutes)) {
          const fallback = estimateDurationFromFileSize(file.size / (1024 * 1024));
          console.warn(`⚠️ Invalid client duration, using file size estimate: ${fallback} minutes`);
          resolve(fallback);
        } else {
          resolve(durationMinutes);
        }
      };
      
      const onError = () => {
        console.warn('⚠️ Client-side duration extraction failed, using file size estimate');
        cleanup();
        
        const fallback = estimateDurationFromFileSize(file.size / (1024 * 1024));
        resolve(fallback);
      };
      
      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', onError);
      
      // Set timeout to prevent hanging
      setTimeout(() => {
        if (audio.readyState < 1) {
          console.warn('⏰ Client-side duration extraction timeout');
          cleanup();
          
          const fallback = estimateDurationFromFileSize(file.size / (1024 * 1024));
          resolve(fallback);
        }
      }, 5000);
      
      audio.src = objectUrl;
      
    } catch (error) {
      console.error('❌ Client-side duration extraction error:', error);
      const fallback = estimateDurationFromFileSize(file.size / (1024 * 1024));
      resolve(fallback);
    }
  });
}

/**
 * Format duration for display
 * 
 * @param minutes - Duration in minutes
 * @returns string - Formatted duration (e.g., "2h 30m", "45m")
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Validate usage against minute-based limits
 * 
 * @param currentMinutes - Current usage in minutes
 * @param additionalMinutes - Additional minutes to add
 * @param limitMinutes - Monthly limit in minutes
 * @param maxFileMinutes - Maximum minutes per file
 * @returns Object with validation result
 */
export function validateMinuteUsage(
  currentMinutes: number,
  additionalMinutes: number,
  limitMinutes: number,
  maxFileMinutes: number = 120
): {
  isValid: boolean;
  reason?: string;
  remainingMinutes: number;
} {
  const remainingMinutes = Math.max(0, limitMinutes - currentMinutes);
  
  // Check file size limit
  if (additionalMinutes > maxFileMinutes) {
    return {
      isValid: false,
      reason: `File duration (${formatDuration(additionalMinutes)}) exceeds maximum allowed per file (${formatDuration(maxFileMinutes)})`,
      remainingMinutes
    };
  }
  
  // Check monthly limit
  if (currentMinutes + additionalMinutes > limitMinutes) {
    return {
      isValid: false,
      reason: `Upload would exceed monthly limit (${formatDuration(currentMinutes + additionalMinutes)} / ${formatDuration(limitMinutes)})`,
      remainingMinutes
    };
  }
  
  return {
    isValid: true,
    remainingMinutes
  };
}