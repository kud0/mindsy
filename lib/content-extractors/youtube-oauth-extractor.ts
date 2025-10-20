import { google } from 'googleapis';
import { createClient } from '@/lib/supabase/server';

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

export class YouTubeOAuthExtractor {
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

  private static async getUserTokens(userId: string) {
    const supabase = createClient();
    
    const { data: tokenData, error } = await supabase
      .from('youtube_tokens')
      .select('*')
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
      
      // Try to refresh if we have a refresh token
      if (tokenData.refresh_token) {
        const refreshedTokens = await this.refreshAccessToken(tokenData.refresh_token, userId);
        if (refreshedTokens) {
          return refreshedTokens;
        }
      }
      
      return null;
    }

    return tokenData;
  }

  private static async refreshAccessToken(refreshToken: string, userId: string) {
    try {
      const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
      const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        console.error('Missing OAuth2 credentials for token refresh');
        return null;
      }

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        console.error('Token refresh failed:', await response.text());
        return null;
      }

      const tokens = await response.json();
      
      if (!tokens.access_token) {
        console.error('No access token in refresh response');
        return null;
      }

      // Update tokens in database
      const supabase = createClient();
      const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

      const { data: updatedTokens, error } = await supabase
        .from('youtube_tokens')
        .update({
          access_token: tokens.access_token,
          expires_at: expiresAt.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Failed to update refreshed tokens:', error);
        return null;
      }

      console.log('✅ YouTube tokens refreshed successfully');
      return updatedTokens;

    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }

  private static async getVideoMetadata(videoId: string, accessToken: string) {
    try {
      // Create authenticated YouTube client
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      
      const youtube = google.youtube({
        version: 'v3',
        auth: auth
      });

      // Get video metadata
      const videoResponse = await youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [videoId]
      });

      const video = videoResponse.data.items?.[0];
      if (!video) {
        throw new Error('Video not found');
      }

      // Extract metadata
      const snippet = video.snippet!;
      const statistics = video.statistics!;
      const contentDetails = video.contentDetails!;

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

    } catch (error) {
      console.error('Failed to get video metadata:', error);
      throw error;
    }
  }

  private static async getCaptions(videoId: string, accessToken: string): Promise<string> {
    try {
      // Create authenticated YouTube client
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });
      
      const youtube = google.youtube({
        version: 'v3',
        auth: auth
      });

      // List available captions
      const captionsResponse = await youtube.captions.list({
        part: ['snippet'],
        videoId: videoId
      });

      const captions = captionsResponse.data.items;
      if (!captions || captions.length === 0) {
        throw new Error('No captions available for this video');
      }

      // Find the best caption track (prefer English, then auto-generated)
      const bestCaption = captions.find(cap => 
        cap.snippet?.language === 'en' && cap.snippet?.trackKind !== 'asr'
      ) || captions.find(cap => 
        cap.snippet?.language === 'en'
      ) || captions[0];

      if (!bestCaption?.id) {
        throw new Error('No suitable caption track found');
      }

      console.log(`📝 Downloading captions: ${bestCaption.snippet?.name} (${bestCaption.snippet?.language})`);

      // Download the caption content
      const captionResponse = await youtube.captions.download({
        id: bestCaption.id,
        tfmt: 'srt' // Get SRT format for better parsing
      });

      const captionText = captionResponse.data as string;
      
      if (!captionText || captionText.trim().length === 0) {
        throw new Error('Downloaded caption content is empty');
      }

      // Parse SRT format to extract just the text
      const transcript = this.parseSRTToText(captionText);
      
      if (transcript.length < 10) {
        throw new Error('Transcript too short - may be corrupted');
      }

      console.log(`✅ Caption extraction successful: ${transcript.length} characters`);
      return transcript;

    } catch (error) {
      console.error('Caption extraction failed:', error);
      throw error;
    }
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

      // Get user's YouTube tokens
      const tokens = await this.getUserTokens(userId);
      if (!tokens) {
        // Need to authenticate - return auth URL
        const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
        if (!clientId) {
          return {
            success: false,
            error: 'YouTube OAuth not configured'
          };
        }

        const authUrl = `/api/auth/youtube`;
        return {
          success: false,
          error: 'YouTube authentication required',
          requiresAuth: true,
          authUrl: authUrl
        };
      }

      // Extract video metadata and captions
      const [metadata, transcript] = await Promise.all([
        this.getVideoMetadata(videoId, tokens.access_token),
        this.getCaptions(videoId, tokens.access_token)
      ]);

      const result: YouTubeOAuthData = {
        id: videoId,
        title: metadata.title,
        description: metadata.description,
        duration: metadata.duration,
        channelName: metadata.channelName,
        publishedAt: metadata.publishedAt,
        thumbnailUrl: metadata.thumbnailUrl,
        transcript: transcript,
        url,
        viewCount: metadata.viewCount,
        extractionMethod: 'oauth-authenticated'
      };

      console.log(`🎉 OAuth extraction successful!`);
      console.log(`📹 Video: "${result.title}" by ${result.channelName}`);
      console.log(`📝 Transcript: ${result.transcript.length} characters`);

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('OAuth extraction error:', error);

      let errorMessage = 'YouTube extraction failed';
      if (error instanceof Error) {
        if (error.message.includes('captions') || error.message.includes('transcript')) {
          errorMessage = `No captions available: ${error.message}`;
        } else if (error.message.includes('quota')) {
          errorMessage = 'YouTube API quota exceeded. Please try again later.';
        } else if (error.message.includes('authentication') || error.message.includes('credentials')) {
          errorMessage = 'YouTube authentication expired. Please reconnect your account.';
        } else {
          errorMessage = `Extraction failed: ${error.message}`;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  static isYouTubeUrl(url: string): boolean {
    return url.includes('youtube.com') || url.includes('youtu.be');
  }
}