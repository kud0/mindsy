import ytdl from 'ytdl-core';
import { getSubtitles } from 'youtube-captions-scraper';

export interface YouTubeVercelData {
  id: string;
  title: string;
  description: string;
  duration: string;
  channelName: string;
  publishedAt: string;
  thumbnailUrl: string;
  transcript: string;
  url: string;
  viewCount: string;
  extractionMethod: 'ytdl-core' | 'captions-scraper';
}

export interface YouTubeVercelResult {
  success: boolean;
  data?: YouTubeVercelData;
  error?: string;
}

export class YouTubeVercelExtractor {
  private static extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/shorts\/([^&\n?#]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  private static async tryYtdlCore(videoId: string, url: string): Promise<YouTubeVercelData | null> {
    try {
      console.log('🎬 Trying ytdl-core for video:', videoId);
      
      // Get video info
      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;
      
      console.log('📊 Got video metadata from ytdl-core');
      
      // Try to get captions from video info
      const captionTracks = info.player_response?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      
      let transcript = '';
      if (captionTracks && captionTracks.length > 0) {
        // Find English captions or the first available
        const englishCaption = captionTracks.find((track: any) => 
          track.languageCode?.startsWith('en')
        ) || captionTracks[0];
        
        if (englishCaption?.baseUrl) {
          console.log('📝 Found caption track, fetching...');
          
          try {
            const captionResponse = await fetch(englishCaption.baseUrl);
            const captionXml = await captionResponse.text();
            
            // Parse XML and extract text
            transcript = this.parseYouTubeCaptions(captionXml);
            console.log('✅ Successfully extracted transcript from ytdl-core');
          } catch (captionError) {
            console.warn('Failed to fetch caption track:', captionError);
          }
        }
      }
      
      // Format duration from seconds to readable format
      const durationSeconds = parseInt(videoDetails.lengthSeconds);
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      return {
        id: videoId,
        title: videoDetails.title,
        description: videoDetails.shortDescription || 'No description available',
        duration: formattedDuration,
        channelName: videoDetails.author,
        publishedAt: videoDetails.publishDate || 'Unknown date',
        thumbnailUrl: videoDetails.thumbnails?.[0]?.url || '',
        transcript,
        url,
        viewCount: videoDetails.viewCount || '0',
        extractionMethod: 'ytdl-core'
      };
      
    } catch (error) {
      console.error('ytdl-core extraction failed:', error);
      return null;
    }
  }
  
  private static async tryCaptionsScraper(videoId: string, url: string): Promise<YouTubeVercelData | null> {
    try {
      console.log('🔍 Trying youtube-captions-scraper for video:', videoId);
      
      // Get subtitles using captions scraper
      const captions = await getSubtitles({
        videoID: videoId,
        lang: 'en' // Try English first
      });
      
      if (!captions || captions.length === 0) {
        console.warn('No captions found with youtube-captions-scraper');
        return null;
      }
      
      // Combine captions into transcript
      const transcript = captions
        .map((caption: any) => caption.text)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log('✅ Successfully extracted transcript from captions-scraper');
      
      // Basic video data (we don't get rich metadata from this package)
      return {
        id: videoId,
        title: 'YouTube Video', // Will try to get from ytdl-core if possible
        description: 'Video with extracted captions',
        duration: 'Unknown',
        channelName: 'Unknown Channel',
        publishedAt: 'Unknown Date',
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        transcript,
        url,
        viewCount: '0',
        extractionMethod: 'captions-scraper'
      };
      
    } catch (error) {
      console.error('captions-scraper extraction failed:', error);
      return null;
    }
  }
  
  private static parseYouTubeCaptions(xml: string): string {
    try {
      // Simple XML parsing for YouTube captions
      // YouTube captions are in XML format with <text> tags
      const textMatches = xml.match(/<text[^>]*>(.*?)<\/text>/g);
      
      if (!textMatches) return '';
      
      const transcript = textMatches
        .map(match => {
          // Remove HTML tags and decode HTML entities
          return match
            .replace(/<[^>]*>/g, '')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'");
        })
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
        
      return transcript;
    } catch (error) {
      console.error('Failed to parse YouTube captions XML:', error);
      return '';
    }
  }

  static async extractContent(url: string): Promise<YouTubeVercelResult> {
    try {
      // Validate YouTube URL
      if (!url.includes('youtube.com') && !url.includes('youtu.be')) {
        return {
          success: false,
          error: 'Invalid YouTube URL'
        };
      }

      // Extract video ID
      const videoId = this.extractVideoId(url);
      if (!videoId) {
        return {
          success: false,
          error: 'Could not extract video ID from URL'
        };
      }

      console.log(`🎯 Extracting YouTube content with Vercel-compatible methods for: ${videoId}`);

      // Try ytdl-core first (gets both metadata and captions)
      const ytdlResult = await this.tryYtdlCore(videoId, url);
      
      if (ytdlResult && ytdlResult.transcript.length > 0) {
        console.log(`✅ Success with ytdl-core! Transcript: ${ytdlResult.transcript.length} characters`);
        return {
          success: true,
          data: ytdlResult
        };
      }
      
      console.log('⚠️ ytdl-core failed or no transcript, trying captions-scraper...');
      
      // Fallback to captions scraper
      const captionsResult = await this.tryCaptionsScraper(videoId, url);
      
      if (captionsResult && captionsResult.transcript.length > 0) {
        // If we got metadata from ytdl-core but no transcript, combine them
        if (ytdlResult && !ytdlResult.transcript) {
          captionsResult.title = ytdlResult.title;
          captionsResult.description = ytdlResult.description;
          captionsResult.duration = ytdlResult.duration;
          captionsResult.channelName = ytdlResult.channelName;
          captionsResult.publishedAt = ytdlResult.publishedAt;
          captionsResult.viewCount = ytdlResult.viewCount;
        }
        
        console.log(`✅ Success with captions-scraper! Transcript: ${captionsResult.transcript.length} characters`);
        return {
          success: true,
          data: captionsResult
        };
      }
      
      // Both methods failed
      return {
        success: false,
        error: 'Unable to extract transcript from this video using available methods. The video may not have captions available, or they may be restricted. Please try a different video or use the audio upload option.'
      };

    } catch (error) {
      console.error('YouTube Vercel extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred during extraction'
      };
    }
  }

  static isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }
}