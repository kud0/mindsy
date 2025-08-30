import { google } from 'googleapis';

export interface YouTubeApiVideoData {
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
  likeCount: string;
}

export interface YouTubeApiExtractorResult {
  success: boolean;
  data?: YouTubeApiVideoData;
  error?: string;
}

export class YouTubeApiExtractor {
  private static youtube = google.youtube({
    version: 'v3',
    auth: process.env.GOOGLE_API_KEY
  });

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

  private static async getVideoMetadata(videoId: string) {
    try {
      const response = await this.youtube.videos.list({
        part: ['snippet', 'statistics', 'contentDetails'],
        id: [videoId]
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found or is private/unavailable');
      }

      const video = response.data.items[0];
      const snippet = video.snippet!;
      const statistics = video.statistics!;
      const contentDetails = video.contentDetails!;

      return {
        title: snippet.title || 'Unknown Title',
        description: snippet.description || 'No description available',
        channelName: snippet.channelTitle || 'Unknown Channel',
        publishedAt: snippet.publishedAt || 'Unknown Date',
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
        duration: contentDetails.duration || 'Unknown Duration',
        viewCount: statistics.viewCount || '0',
        likeCount: statistics.likeCount || '0'
      };
    } catch (error) {
      console.error('Error fetching video metadata:', error);
      throw new Error('Failed to fetch video information. The video may be private, deleted, or restricted.');
    }
  }

  private static async getCaptionsList(videoId: string) {
    try {
      const response = await this.youtube.captions.list({
        part: ['snippet'],
        videoId: videoId
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('No captions available for this video');
      }

      // Prefer English captions, then auto-generated, then any available
      const captions = response.data.items;
      
      // Sort captions by preference
      const sortedCaptions = captions.sort((a, b) => {
        const aLang = a.snippet?.language || '';
        const bLang = b.snippet?.language || '';
        const aIsEn = aLang.startsWith('en');
        const bIsEn = bLang.startsWith('en');
        const aIsManual = a.snippet?.trackKind === 'standard';
        const bIsManual = b.snippet?.trackKind === 'standard';

        // Prefer English
        if (aIsEn && !bIsEn) return -1;
        if (!aIsEn && bIsEn) return 1;

        // Prefer manual over auto-generated
        if (aIsManual && !bIsManual) return -1;
        if (!aIsManual && bIsManual) return 1;

        return 0;
      });

      return sortedCaptions[0];
    } catch (error) {
      console.error('Error fetching captions list:', error);
      throw new Error('Unable to access captions for this video. The video may not have captions enabled.');
    }
  }

  private static async downloadCaption(captionId: string): Promise<string> {
    try {
      const response = await this.youtube.captions.download({
        id: captionId,
        tfmt: 'srt' // Download as SRT format
      });

      if (!response.data) {
        throw new Error('No caption data received');
      }

      // Convert SRT to plain text
      const srtContent = response.data as string;
      return this.convertSrtToText(srtContent);
    } catch (error) {
      console.error('Error downloading caption:', error);
      throw new Error('Failed to download captions. The captions may be restricted or unavailable.');
    }
  }

  private static convertSrtToText(srt: string): string {
    // Remove SRT formatting and extract just the text
    return srt
      .split('\n')
      .filter(line => {
        // Remove sequence numbers, timestamps, and empty lines
        return line.trim() && 
               !line.match(/^\d+$/) && 
               !line.match(/^\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}$/);
      })
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static formatDuration(isoDuration: string): string {
    // Convert ISO 8601 duration (PT4M13S) to readable format (4:13)
    const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return isoDuration;

    const hours = parseInt(match[1] || '0');
    const minutes = parseInt(match[2] || '0');
    const seconds = parseInt(match[3] || '0');

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  static async extractContent(url: string): Promise<YouTubeApiExtractorResult> {
    try {
      // Check if API key is available
      if (!process.env.GOOGLE_API_KEY) {
        return {
          success: false,
          error: 'Google API key is not configured. Please add GOOGLE_API_KEY to environment variables.'
        };
      }

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

      console.log(`🎬 Extracting YouTube content via API for video: ${videoId}`);

      // Get video metadata
      const metadata = await this.getVideoMetadata(videoId);

      // For now, we'll get metadata from API but transcript from scraper
      // YouTube Data API requires OAuth2 for caption downloads, not just API key
      const transcript = '';

      const videoData: YouTubeApiVideoData = {
        id: videoId,
        title: metadata.title,
        description: metadata.description,
        duration: this.formatDuration(metadata.duration),
        channelName: metadata.channelName,
        publishedAt: new Date(metadata.publishedAt).toLocaleDateString(),
        thumbnailUrl: metadata.thumbnailUrl,
        transcript,
        url: url,
        viewCount: parseInt(metadata.viewCount).toLocaleString(),
        likeCount: parseInt(metadata.likeCount).toLocaleString()
      };

      console.log(`✅ Successfully extracted YouTube content: ${videoData.title}`);
      console.log(`📝 Transcript length: ${transcript.length} characters`);
      console.log(`👁️ Views: ${videoData.viewCount}, 👍 Likes: ${videoData.likeCount}`);

      return {
        success: true,
        data: videoData
      };

    } catch (error) {
      console.error('YouTube API extraction error:', error);
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