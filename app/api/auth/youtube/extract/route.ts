import { NextRequest } from 'next/server';
import { requireAuth, createErrorResponse, createSuccessResponse } from '@/lib/auth/require-auth';
import { createClient } from '@/lib/supabase/server';

// Extract YouTube content using OAuth tokens
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  if (authResult.error) {
    return createErrorResponse(authResult.error.message, authResult.error.status);
  }

  try {
    const { videoId, userId } = await request.json();
    
    // Validate that the requesting user matches the token owner
    if (userId !== authResult.user.id) {
      return createErrorResponse('Unauthorized token access', 403);
    }

    if (!videoId) {
      return createErrorResponse('Video ID is required');
    }

    const supabase = createClient();
    
    // Get user's tokens
    const { data: tokenData, error: tokenError } = await supabase
      .from('youtube_tokens')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (tokenError || !tokenData) {
      return createErrorResponse('No YouTube tokens found');
    }

    // Check if token is expired and refresh if needed
    const now = new Date();
    const expiresAt = new Date(tokenData.expires_at);
    
    let accessToken = tokenData.access_token;
    
    if (now >= expiresAt) {
      if (!tokenData.refresh_token) {
        return createErrorResponse('YouTube token expired and cannot be refreshed');
      }
      
      // Refresh the token
      const refreshResult = await refreshAccessToken(tokenData.refresh_token, userId, supabase);
      if (!refreshResult) {
        return createErrorResponse('Failed to refresh YouTube token');
      }
      
      accessToken = refreshResult.access_token;
    }

    // Extract video metadata using YouTube Data API
    const videoData = await getVideoMetadata(videoId, accessToken);
    const transcript = await getCaptions(videoId, accessToken);

    const result = {
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
      extractionMethod: 'oauth-authenticated' as const
    };

    console.log(`✅ OAuth extraction successful for video: ${videoData.title}`);
    console.log(`📝 Transcript length: ${transcript.length} characters`);

    return createSuccessResponse({
      data: result
    });

  } catch (error) {
    console.error('OAuth extraction error:', error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'OAuth extraction failed'
    );
  }
}

async function refreshAccessToken(refreshToken: string, userId: string, supabase: any) {
  try {
    const clientId = process.env.YOUTUBE_OAUTH_CLIENT_ID;
    const clientSecret = process.env.YOUTUBE_OAUTH_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Missing OAuth2 credentials');
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
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();
    
    if (!tokens.access_token) {
      throw new Error('No access token in refresh response');
    }

    // Update tokens in database
    const expiresAt = new Date(Date.now() + (tokens.expires_in * 1000));

    const { error } = await supabase
      .from('youtube_tokens')
      .update({
        access_token: tokens.access_token,
        expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (error) {
      throw new Error('Failed to update refreshed tokens');
    }

    return { access_token: tokens.access_token };

  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

async function getVideoMetadata(videoId: string, accessToken: string) {
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
    duration: parseISO8601Duration(contentDetails.duration || 'PT0S')
  };
}

async function getCaptions(videoId: string, accessToken: string): Promise<string> {
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
  const bestCaption = captions.find((cap: any) => 
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
  const transcript = parseSRTToText(captionText);
  
  if (transcript.length < 10) {
    throw new Error('Transcript too short - may be corrupted');
  }

  return transcript;
}

function parseSRTToText(srtContent: string): string {
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

function parseISO8601Duration(duration: string): string {
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