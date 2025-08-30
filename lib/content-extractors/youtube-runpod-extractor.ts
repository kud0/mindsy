import ytdl from 'ytdl-core';
import { createRunPodClient } from '../runpod-client';

export interface YouTubeRunPodData {
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
  transcriptionMethod: 'runpod-whisper';
  audioQuality: string;
}

export interface YouTubeRunPodResult {
  success: boolean;
  data?: YouTubeRunPodData;
  error?: string;
}

export class YouTubeRunPodExtractor {
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

  private static async getVideoInfo(url: string) {
    try {
      console.log('📊 Getting video metadata from ytdl-core...');
      
      const info = await ytdl.getInfo(url);
      const videoDetails = info.videoDetails;
      
      // Format duration from seconds
      const durationSeconds = parseInt(videoDetails.lengthSeconds);
      const minutes = Math.floor(durationSeconds / 60);
      const seconds = durationSeconds % 60;
      const formattedDuration = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      console.log(`✅ Got video info: "${videoDetails.title}" (${formattedDuration})`);
      
      return {
        title: videoDetails.title,
        description: videoDetails.shortDescription || 'No description available',
        duration: formattedDuration,
        channelName: videoDetails.author,
        publishedAt: videoDetails.publishDate || 'Unknown date',
        thumbnailUrl: videoDetails.thumbnails?.[0]?.url || '',
        viewCount: videoDetails.viewCount || '0'
      };
      
    } catch (error) {
      console.warn('Failed to get video metadata:', error);
      // Return basic info even if metadata fails
      return {
        title: 'YouTube Video',
        description: 'Video transcribed from audio',
        duration: 'Unknown',
        channelName: 'Unknown Channel', 
        publishedAt: 'Unknown Date',
        thumbnailUrl: '',
        viewCount: '0'
      };
    }
  }

  private static async getAudioStreamUrl(url: string): Promise<{ audioUrl: string; quality: string }> {
    try {
      console.log('🎵 Getting audio stream URL from ytdl-core...');
      
      const info = await ytdl.getInfo(url);
      const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
      
      if (audioFormats.length === 0) {
        throw new Error('No audio formats available for this video');
      }
      
      // Sort by quality - prefer higher bitrate
      const sortedFormats = audioFormats.sort((a, b) => {
        const bitrateA = parseInt(a.averageBitrate || a.audioBitrate || '0');
        const bitrateB = parseInt(b.averageBitrate || b.audioBitrate || '0');
        return bitrateB - bitrateA;
      });
      
      const bestFormat = sortedFormats[0];
      const audioUrl = bestFormat.url;
      const quality = `${bestFormat.audioQuality || 'unknown'} (${bestFormat.averageBitrate || bestFormat.audioBitrate || 'unknown'}kbps)`;
      
      console.log(`✅ Got audio stream: ${quality}`);
      console.log(`🔗 Audio URL: ${audioUrl.substring(0, 80)}...`);
      
      return { audioUrl, quality };
      
    } catch (error) {
      console.error('Failed to get audio stream URL:', error);
      throw new Error(`Could not extract audio stream: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async transcribeWithRunPod(audioUrl: string): Promise<string> {
    try {
      console.log('🎙️ Starting transcription with RunPod Whisper...');
      
      const runpodClient = createRunPodClient();
      const transcript = await runpodClient.transcribeAudio(audioUrl);
      
      if (!transcript || transcript.trim().length === 0) {
        throw new Error('RunPod returned empty transcript');
      }
      
      console.log(`✅ Transcription complete: ${transcript.length} characters`);
      return transcript.trim();
      
    } catch (error) {
      console.error('RunPod transcription failed:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async extractContent(url: string): Promise<YouTubeRunPodResult> {
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

      console.log(`🎬 Starting YouTube + RunPod extraction for: ${videoId}`);

      // Step 1: Get video metadata (parallel with audio stream extraction)
      const [videoInfo, audioStream] = await Promise.all([
        this.getVideoInfo(url).catch(() => ({
          title: 'YouTube Video',
          description: 'Video transcribed from audio', 
          duration: 'Unknown',
          channelName: 'Unknown Channel',
          publishedAt: 'Unknown Date',
          thumbnailUrl: '',
          viewCount: '0'
        })),
        this.getAudioStreamUrl(url)
      ]);

      // Step 2: Transcribe audio with RunPod
      const transcript = await this.transcribeWithRunPod(audioStream.audioUrl);

      // Step 3: Combine results
      const result: YouTubeRunPodData = {
        id: videoId,
        title: videoInfo.title,
        description: videoInfo.description,
        duration: videoInfo.duration,
        channelName: videoInfo.channelName,
        publishedAt: videoInfo.publishedAt,
        thumbnailUrl: videoInfo.thumbnailUrl,
        transcript,
        url,
        viewCount: videoInfo.viewCount,
        transcriptionMethod: 'runpod-whisper',
        audioQuality: audioStream.quality
      };

      console.log(`🎉 YouTube + RunPod extraction successful!`);
      console.log(`📹 Video: "${result.title}" by ${result.channelName}`);
      console.log(`🎵 Audio: ${audioStream.quality}`);
      console.log(`📝 Transcript: ${transcript.length} characters`);
      
      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('YouTube + RunPod extraction error:', error);
      
      // Provide specific error messages
      let errorMessage = 'Unknown error occurred';
      if (error instanceof Error) {
        if (error.message.includes('Video unavailable') || error.message.includes('private')) {
          errorMessage = 'This video is private, deleted, or unavailable. Please try a different video.';
        } else if (error.message.includes('audio stream')) {
          errorMessage = 'Could not access audio from this video. It may be restricted or have DRM protection.';
        } else if (error.message.includes('RunPod') || error.message.includes('transcription')) {
          errorMessage = `Transcription service error: ${error.message}`;
        } else {
          errorMessage = error.message;
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