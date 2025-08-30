// Test YouTube Data API implementation
const { YouTubeApiExtractor } = require('./lib/content-extractors/youtube-api-extractor.ts');

async function testYouTubeApi() {
  console.log('🧪 Testing YouTube Data API implementation...');
  
  // Test with the Tesla video you used earlier
  const testUrl = 'https://www.youtube.com/watch?v=anAYGAwOnWQ';
  
  console.log('🎬 Testing URL:', testUrl);
  
  try {
    const result = await YouTubeApiExtractor.extractContent(testUrl);
    
    if (result.success && result.data) {
      console.log('✅ SUCCESS!');
      console.log('📹 Title:', result.data.title);
      console.log('📺 Channel:', result.data.channelName);
      console.log('⏱️ Duration:', result.data.duration);
      console.log('👁️ Views:', result.data.viewCount);
      console.log('📝 Transcript length:', result.data.transcript.length, 'characters');
      console.log('📄 Transcript preview:', result.data.transcript.substring(0, 200) + '...');
    } else {
      console.log('❌ FAILED:', result.error);
      
      // Show helpful guidance
      if (result.error?.includes('API key')) {
        console.log('\n💡 To fix this:');
        console.log('1. Go to https://console.cloud.google.com');
        console.log('2. Create a new project or select existing');
        console.log('3. Enable "YouTube Data API v3"');
        console.log('4. Create API credentials (API Key)');
        console.log('5. Add YOUTUBE_API_KEY=your_key_here to .env.local');
      }
    }
    
  } catch (error) {
    console.error('💥 Test failed with error:', error);
  }
}

testYouTubeApi();