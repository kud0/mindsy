import { YouTubeApiExtractor } from './youtube-api-extractor';
import { YouTubeExtractor } from './youtube-extractor';

export interface YouTubeHybridData {
  id: string;
  title: string;
  description: string;
  duration: string;
  channelName: string;
  publishedAt: string;
  thumbnailUrl: string;
  transcript: string;
  url: string;
  viewCount?: string;
  likeCount?: string;
  hasApiMetadata: boolean;
}

export interface YouTubeHybridResult {
  success: boolean;
  data?: YouTubeHybridData;
  error?: string;
}

export class YouTubeHybridExtractor {
  static async extractContent(url: string): Promise<YouTubeHybridResult> {
    try {
      console.log('🔄 Using hybrid approach: API metadata + transcript scraping');

      // Try to get rich metadata from YouTube Data API
      let metadata = null;
      let hasApiMetadata = false;
      
      if (process.env.GOOGLE_API_KEY) {
        console.log('📊 Attempting to get metadata from YouTube Data API...');
        try {
          const apiResult = await YouTubeApiExtractor.extractContent(url);
          if (apiResult.success && apiResult.data) {
            metadata = apiResult.data;
            hasApiMetadata = true;
            console.log('✅ Got rich metadata from API');
          }
        } catch (error) {
          console.log('⚠️ API metadata failed, will use basic metadata');
        }
      }

      // Always try to get transcript from scraper
      console.log('📝 Attempting to get transcript from scraper...');
      const transcriptResult = await YouTubeExtractor.extractContent(url);
      
      if (!transcriptResult.success || !transcriptResult.data) {
        return {
          success: false,
          error: transcriptResult.error || 'Failed to extract transcript'
        };
      }

      // Combine the best data from both sources
      const hybridData: YouTubeHybridData = {
        id: transcriptResult.data.id,
        title: metadata?.title || transcriptResult.data.title,
        description: metadata?.description || transcriptResult.data.description,
        duration: metadata?.duration || transcriptResult.data.duration,
        channelName: metadata?.channelName || transcriptResult.data.channelName,
        publishedAt: metadata?.publishedAt || transcriptResult.data.publishedAt,
        thumbnailUrl: metadata?.thumbnailUrl || transcriptResult.data.thumbnailUrl,
        transcript: transcriptResult.data.transcript,
        url: url,
        viewCount: metadata?.viewCount,
        likeCount: metadata?.likeCount,
        hasApiMetadata
      };

      console.log(`✅ Hybrid extraction successful`);
      console.log(`📊 Metadata source: ${hasApiMetadata ? 'YouTube Data API' : 'Basic scraping'}`);
      console.log(`📝 Transcript: ${hybridData.transcript.length} characters`);
      if (hasApiMetadata && metadata?.viewCount) {
        console.log(`👁️ Views: ${metadata.viewCount}, 👍 Likes: ${metadata.likeCount || 'N/A'}`);
      }

      return {
        success: true,
        data: hybridData
      };

    } catch (error) {
      console.error('YouTube hybrid extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }
}