/**
 * Test FFprobe locally with your audio file
 */

import { extractDurationWithFFprobe, checkFFprobeAvailable } from './src/lib/ffprobe-duration.js';
import { readFile } from 'fs/promises';
import { join } from 'path';

async function testFFprobe() {
  console.log('🧪 Testing FFprobe locally...');
  
  // Check if FFprobe is available
  console.log('\n1. Checking FFprobe availability...');
  const available = await checkFFprobeAvailable();
  console.log(`FFprobe available: ${available}`);
  
  if (!available) {
    console.log('❌ FFprobe not found. Install with: brew install ffmpeg');
    return;
  }
  
  // Test with a sample audio file (you'll need to provide the path)
  const audioPath = process.argv[2];
  if (!audioPath) {
    console.log('❌ Please provide audio file path: node test_ffprobe_local.js /path/to/audio.mp3');
    return;
  }
  
  try {
    console.log(`\n2. Reading audio file: ${audioPath}`);
    const buffer = await readFile(audioPath);
    console.log(`File size: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`);
    
    console.log('\n3. Extracting duration with FFprobe...');
    const duration = await extractDurationWithFFprobe(buffer, 0);
    console.log(`✅ Exact duration: ${duration} minutes (${Math.floor(duration)}:${Math.round((duration % 1) * 60).toString().padStart(2, '0')})`);
    
    // Compare with file size estimation
    const fileSizeMB = buffer.length / 1024 / 1024;
    const estimatedDuration = Math.ceil(fileSizeMB / 0.75);
    console.log(`📊 File size estimation: ${estimatedDuration} minutes (${(estimatedDuration - duration).toFixed(1)} minutes off)`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testFFprobe().catch(console.error);