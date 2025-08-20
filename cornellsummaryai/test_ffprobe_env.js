/**
 * Quick test to check if FFprobe is available in the current environment
 */

import { checkFFprobeAvailable } from './src/lib/ffprobe-duration.ts';

async function testEnvironment() {
  console.log('🧪 Testing FFprobe in current environment...');
  
  try {
    const available = await checkFFprobeAvailable();
    console.log(`FFprobe available: ${available ? '✅ YES' : '❌ NO'}`);
    
    if (!available) {
      console.log('\n📋 To install FFprobe:');
      console.log('  macOS: brew install ffmpeg');
      console.log('  Ubuntu: sudo apt install ffmpeg');
      console.log('  Vercel: Add to package.json dependencies (if available)');
    }
  } catch (error) {
    console.error('❌ Error checking FFprobe:', error);
  }
}

testEnvironment().catch(console.error);