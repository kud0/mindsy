/**
 * FFprobe Audio Duration Extraction
 * 
 * Uses FFprobe (part of FFmpeg) to get EXACT audio duration from files.
 * This is completely objective - no guessing based on file size.
 */

import { spawn } from 'child_process';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Extract exact audio duration using FFprobe
 * @param buffer - Audio file buffer
 * @param fallbackMinutes - Fallback if FFprobe fails
 * @returns Promise<number> - Exact duration in minutes
 */
export async function extractDurationWithFFprobe(
  buffer: Buffer,
  fallbackMinutes: number = 5
): Promise<number> {
  let tempFilePath: string | null = null;
  
  try {
    // Create temporary file
    const tempFileName = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    tempFilePath = join(tmpdir(), tempFileName);
    
    // Write buffer to temp file
    await writeFile(tempFilePath, buffer);
    
    // Run FFprobe to get duration
    const duration = await runFFprobe(tempFilePath);
    
    if (duration > 0) {
      const durationMinutes = Math.ceil(duration / 60);
      console.log(`✅ FFprobe extracted duration: ${duration}s = ${durationMinutes} minutes`);
      
      // Sanity check: duration should be reasonable (1 minute to 8 hours)
      if (durationMinutes >= 1 && durationMinutes <= 480) {
        return durationMinutes;
      } else {
        console.warn(`⚠️ Unreasonable duration (${durationMinutes}min), using fallback`);
        return fallbackMinutes;
      }
    } else {
      console.warn('⚠️ FFprobe returned 0 duration, using fallback');
      return fallbackMinutes;
    }
    
  } catch (error) {
    console.error('❌ FFprobe extraction failed:', error);
    console.log(`🔄 Using fallback duration: ${fallbackMinutes} minutes`);
    return fallbackMinutes;
  } finally {
    // Clean up temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (cleanupError) {
        console.warn('Warning: Could not clean up temp file:', cleanupError);
      }
    }
  }
}

/**
 * Run FFprobe command to extract duration
 * @param filePath - Path to audio file
 * @returns Promise<number> - Duration in seconds
 */
function runFFprobe(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    // FFprobe command to get duration in seconds
    const ffprobeArgs = [
      '-v', 'quiet',                    // Quiet output
      '-show_entries', 'format=duration', // Show only duration
      '-of', 'csv=p=0',                // Output as CSV without headers
      filePath
    ];
    
    console.log(`🔍 Running: ffprobe ${ffprobeArgs.join(' ')}`);
    
    const ffprobe = spawn('ffprobe', ffprobeArgs);
    
    let output = '';
    let errorOutput = '';
    
    ffprobe.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    ffprobe.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    ffprobe.on('close', (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        if (!isNaN(duration) && duration > 0) {
          resolve(duration);
        } else {
          reject(new Error(`Invalid duration output: "${output.trim()}"`));
        }
      } else {
        reject(new Error(`FFprobe exited with code ${code}: ${errorOutput}`));
      }
    });
    
    ffprobe.on('error', (error) => {
      reject(new Error(`Failed to spawn ffprobe: ${error.message}`));
    });
    
    // Set timeout to prevent hanging
    setTimeout(() => {
      ffprobe.kill();
      reject(new Error('FFprobe timeout after 10 seconds'));
    }, 10000);
  });
}

/**
 * Check if FFprobe is available on the system
 * @returns Promise<boolean>
 */
export async function checkFFprobeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const ffprobe = spawn('ffprobe', ['-version']);
    
    ffprobe.on('close', (code) => {
      resolve(code === 0);
    });
    
    ffprobe.on('error', () => {
      resolve(false);
    });
    
    // Timeout after 5 seconds
    setTimeout(() => {
      ffprobe.kill();
      resolve(false);
    }, 5000);
  });
}

/**
 * Extract duration from file URL by downloading and using FFprobe
 * @param fileUrl - Signed URL to audio file
 * @param fallbackMinutes - Fallback duration if extraction fails
 * @returns Promise<number> - Duration in minutes
 */
export async function extractDurationFromUrlWithFFprobe(
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
    
    return await extractDurationWithFFprobe(buffer, fallbackMinutes);
    
  } catch (error) {
    console.error('❌ Error downloading/extracting audio duration with FFprobe:', error);
    console.log(`🔄 Using fallback duration: ${fallbackMinutes} minutes`);
    return fallbackMinutes;
  }
}