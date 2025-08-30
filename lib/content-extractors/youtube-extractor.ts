import { YoutubeTranscript } from 'youtube-transcript';

export interface YouTubeVideoData {
  id: string;
  title: string;
  description: string;
  duration: string;
  channelName: string;
  publishedAt: string;
  thumbnailUrl: string;
  transcript: string;
  url: string;
}

export interface YouTubeExtractorResult {
  success: boolean;
  data?: YouTubeVideoData;
  error?: string;
}

export class YouTubeExtractor {
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

  private static async fetchVideoMetadata(videoId: string): Promise<Partial<YouTubeVideoData>> {
    try {
      // Use YouTube oEmbed API for basic metadata (no API key required)
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oembedUrl);
      
      if (!response.ok) {
        throw new Error('Failed to fetch video metadata');
      }

      const data = await response.json();
      
      return {
        title: data.title || 'Unknown Title',
        channelName: data.author_name || 'Unknown Channel',
        thumbnailUrl: data.thumbnail_url || '',
        duration: 'Unknown Duration', // oEmbed doesn't provide duration
        description: 'Video description not available',
        publishedAt: 'Unknown Date'
      };
    } catch (error) {
      console.warn('Failed to fetch YouTube metadata:', error);
      return {
        title: 'YouTube Video',
        channelName: 'Unknown Channel',
        thumbnailUrl: '',
        duration: 'Unknown Duration',
        description: 'Video description not available',
        publishedAt: 'Unknown Date'
      };
    }
  }

  private static async fetchTranscript(videoId: string): Promise<string> {
    try {
      const transcriptData = await YoutubeTranscript.fetchTranscript(videoId);
      
      if (!transcriptData || transcriptData.length === 0) {
        throw new Error('No transcript data returned from YouTube. This video may not have captions enabled for programmatic access, even if captions appear in the YouTube interface.');
      }

      // Combine transcript segments into readable text
      const transcript = transcriptData
        .map(segment => segment.text)
        .join(' ')
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();

      return transcript;
    } catch (error) {
      console.warn('Failed to fetch YouTube transcript:', error);
      
      // Handle specific YouTube transcript errors
      if (error instanceof Error) {
        const errorName = error.constructor.name;
        const errorMessage = error.message;
        
        // Handle YoutubeTranscriptDisabledError specifically
        if (errorName === 'YoutubeTranscriptDisabledError' || errorMessage.includes('Transcript is disabled')) {
          throw new Error('Transcripts are disabled for this video. Please try a different video with captions enabled, or use the audio upload option instead.');
        }
        
        // Handle YoutubeTranscriptNotAvailableError
        if (errorName === 'YoutubeTranscriptNotAvailableError' || errorMessage.includes('not available')) {
          throw new Error('No transcripts are available for this video. Please try a different video or use the audio upload option instead.');
        }
        
        // Handle YoutubeTranscriptTooManyRequestsError
        if (errorName === 'YoutubeTranscriptTooManyRequestsError' || errorMessage.includes('Too many requests')) {
          throw new Error('Too many requests to YouTube. Please wait a moment and try again.');
        }
        
        // Handle private/restricted videos
        if (errorMessage.includes('private') || errorMessage.includes('restricted') || errorMessage.includes('unavailable')) {
          throw new Error('This video is private, restricted, or unavailable. Please try a public video instead.');
        }
        
        // Handle video not found
        if (errorMessage.includes('not found') || errorMessage.includes('404')) {
          throw new Error('Video not found. Please check the URL and try again.');
        }
        
        // Generic transcript error
        if (errorMessage.includes('transcript') || errorMessage.includes('caption')) {
          throw new Error('Unable to access transcripts for this video. Please try a different video with captions enabled, or use the audio upload option.');
        }
      }
      
      throw new Error('Unable to extract transcript from this video. YouTube has restrictions on programmatic transcript access - even videos with visible captions may not be accessible via API. Please try downloading the audio and using the Audio upload tab instead.');
    }
  }

  static async extractContent(url: string): Promise<YouTubeExtractorResult> {
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

      console.log(`🎬 Extracting YouTube content for video: ${videoId}`);

      // Fetch metadata and transcript in parallel
      const [metadata, transcript] = await Promise.all([
        this.fetchVideoMetadata(videoId),
        this.fetchTranscript(videoId)
      ]);

      const videoData: YouTubeVideoData = {
        id: videoId,
        title: metadata.title || 'YouTube Video',
        description: metadata.description || 'Video description not available',
        duration: metadata.duration || 'Unknown Duration',
        channelName: metadata.channelName || 'Unknown Channel',
        publishedAt: metadata.publishedAt || 'Unknown Date',
        thumbnailUrl: metadata.thumbnailUrl || '',
        transcript,
        url: url
      };

      console.log(`✅ Successfully extracted YouTube content: ${videoData.title}`);
      console.log(`📝 Transcript length: ${transcript.length} characters`);

      return {
        success: true,
        data: videoData
      };

    } catch (error) {
      console.error('YouTube extraction error:', error);
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