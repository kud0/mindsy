import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

// Simple OAuth extractor that avoids googleapis import issues
export interface YouTubeOAuthData {
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
  extractionMethod: 'oauth-authenticated';
}

export interface YouTubeOAuthResult {
  success: boolean;
  data?: YouTubeOAuthData;
  error?: string;
  requiresAuth?: boolean;
  authUrl?: string;
}

export class YouTubeOAuthSimpleExtractor {
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

  private static async checkUserTokens(userId: string): Promise<any> {
    try {
      // Use service role client to bypass RLS for OAuth tokens
      const supabase = createServiceClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );
      
      const { data: tokenData, error } = await supabase
        .from('youtube_tokens')
        .select('access_token, expires_at, refresh_token')
        .eq('user_id', userId)
        .single();

      if (error || !tokenData) {
        console.log('No YouTube tokens found for user:', userId);
        return null;
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      
      if (now >= expiresAt) {
        console.log('YouTube token expired for user:', userId);
        return null;
      }

      return {
        hasToken: true,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token
      };
    } catch (error) {
      console.error('Error checking user tokens:', error);
      return null;
    }
  }

  private static async extractWithOAuth(videoId: string, accessToken: string): Promise<YouTubeOAuthResult> {
    try {
      // Extract video metadata using YouTube Data API
      const videoData = await this.getVideoMetadata(videoId, accessToken);
      const transcript = await this.getCaptions(videoId, accessToken);

      const result: YouTubeOAuthData = {
        id: videoId,
        title: videoData.title,
        description: videoData.description,
        duration: videoData.duration,
        channelName: videoData.channelName,
        publishedAt: videoData.publishedAt,
        thumbnailUrl: videoData.thumbnailUrl,
        transcript: transcript,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        viewCount: videoData.viewCount,
        extractionMethod: 'oauth-authenticated'
      };

      return {
        success: true,
        data: result
      };
    } catch (error) {
      console.error('OAuth extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth extraction failed'
      };
    }
  }

  static async extractContent(url: string, userId: string): Promise<YouTubeOAuthResult> {
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

      console.log(`🔐 Starting OAuth-authenticated extraction for: ${videoId}`);

      // Check if user has OAuth tokens
      const tokenCheck = await this.checkUserTokens(userId);
      if (!tokenCheck) {
        console.log('🔐 No OAuth tokens found, authentication required');
        return {
          success: false,
          error: 'YouTube authentication required for caption access',
          requiresAuth: true,
          authUrl: '/api/auth/youtube'
        };
      }

      console.log('✅ OAuth tokens found, extracting content...');

      // Extract content using OAuth
      const result = await this.extractWithOAuth(videoId, tokenCheck.accessToken);
      
      if (result.success) {
        console.log(`🎉 OAuth extraction successful!`);
        console.log(`📹 Video: "${result.data?.title}" by ${result.data?.channelName}`);
        console.log(`📝 Transcript: ${result.data?.transcript?.length} characters`);
      }

      return result;

    } catch (error) {
      console.error('OAuth extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth extraction failed'
      };
    }
  }

  private static async getVideoMetadata(videoId: string, accessToken: string) {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics,contentDetails&id=${videoId}&access_token=${accessToken}`
    );

    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }

    const data = await response.json();
    const video = data.items?.[0];
    
    if (!video) {
      throw new Error('Video not found');
    }

    const snippet = video.snippet;
    const statistics = video.statistics;
    const contentDetails = video.contentDetails;

    return {
      title: snippet.title || 'YouTube Video',
      description: snippet.description || '',
      channelName: snippet.channelTitle || 'Unknown Channel',
      publishedAt: snippet.publishedAt || new Date().toISOString(),
      thumbnailUrl: snippet.thumbnails?.maxres?.url || 
                    snippet.thumbnails?.high?.url || 
                    snippet.thumbnails?.default?.url || '',
      viewCount: statistics.viewCount || '0',
      duration: this.parseISO8601Duration(contentDetails.duration || 'PT0S')
    };
  }

  private static async getCaptions(videoId: string, accessToken: string): Promise<string> {
    // List available captions
    const captionsResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&access_token=${accessToken}`
    );

    if (!captionsResponse.ok) {
      throw new Error(`Captions API error: ${captionsResponse.status}`);
    }

    const captionsData = await captionsResponse.json();
    const captions = captionsData.items;
    
    if (!captions || captions.length === 0) {
      throw new Error('No captions available for this video');
    }

    // Find the best caption track (prefer English, then auto-generated)
    let bestCaption = captions.find((cap: any) => 
      cap.snippet?.language === 'en' && cap.snippet?.trackKind !== 'asr'
    ) || captions.find((cap: any) => 
      cap.snippet?.language === 'en'
    ) || captions[0];

    if (!bestCaption?.id) {
      throw new Error('No suitable caption track found');
    }

    console.log(`📝 Downloading captions: ${bestCaption.snippet?.name} (${bestCaption.snippet?.language})`);

    // Download the caption content
    const captionResponse = await fetch(
      `https://www.googleapis.com/youtube/v3/captions/${bestCaption.id}?tfmt=srt&access_token=${accessToken}`
    );

    if (!captionResponse.ok) {
      throw new Error(`Caption download error: ${captionResponse.status}`);
    }

    const captionText = await captionResponse.text();
    
    if (!captionText || captionText.trim().length === 0) {
      throw new Error('Downloaded caption content is empty');
    }

    // Parse SRT format to extract just the text
    const transcript = this.parseSRTToText(captionText);
    
    if (transcript.length < 10) {
      throw new Error('Transcript too short - may be corrupted');
    }

    return transcript;
  }

  private static parseSRTToText(srtContent: string): string {
    // Remove SRT formatting and extract just the text
    const lines = srtContent.split('\n');
    const textLines: string[] = [];
    
    let isTextLine = false;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Skip empty lines
      if (!trimmed) {
        isTextLine = false;
        continue;
      }
      
      // Skip sequence numbers (just numbers)
      if (/^\d+$/.test(trimmed)) {
        continue;
      }
      
      // Skip timestamp lines (contain -->)
      if (trimmed.includes('-->')) {
        isTextLine = true;
        continue;
      }
      
      // This is a text line
      if (isTextLine) {
        // Remove HTML tags and clean up text
        const cleanText = trimmed
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&amp;/g, '&')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        if (cleanText) {
          textLines.push(cleanText);
        }
      }
    }
    
    return textLines.join(' ').replace(/\s+/g, ' ').trim();
  }

  private static parseISO8601Duration(duration: string): string {
    // Parse ISO 8601 duration (PT4M13S) to readable format (4:13)
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 'Unknown';
    
    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  static isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }
}