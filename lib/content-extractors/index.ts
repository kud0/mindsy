import { YouTubeExtractor, YouTubeExtractorResult, YouTubeVideoData } from './youtube-extractor';
import { YouTubeApiExtractor, YouTubeApiExtractorResult, YouTubeApiVideoData } from './youtube-api-extractor';
import { YouTubeHybridExtractor, YouTubeHybridResult, YouTubeHybridData } from './youtube-hybrid-extractor';
import { YouTubeVercelExtractor, YouTubeVercelResult, YouTubeVercelData } from './youtube-vercel-extractor';
import { YouTubeRunPodExtractor, YouTubeRunPodResult, YouTubeRunPodData } from './youtube-runpod-extractor';
import { YouTubePuppeteerExtractor, YouTubePuppeteerResult, YouTubePuppeteerData } from './youtube-puppeteer-extractor';
import { YouTubeOAuthSimpleExtractor, YouTubeOAuthResult, YouTubeOAuthData } from './youtube-oauth-simple';
import { WebExtractor, WebExtractorResult, WebArticleData } from './web-extractor';

export type LinkType = 'youtube' | 'podcast' | 'article' | 'unknown';

export interface LinkExtractionResult {
  success: boolean;
  linkType: LinkType;
  data?: YouTubeVideoData | YouTubeApiVideoData | YouTubeHybridData | YouTubeVercelData | YouTubeRunPodData | YouTubePuppeteerData | YouTubeOAuthData | WebArticleData;
  error?: string;
  requiresAuth?: boolean;
  authUrl?: string;
}

export class LinkContentExtractor {
  static detectLinkType(url: string): LinkType {
    if (YouTubeExtractor.isYouTubeUrl(url)) {
      return 'youtube';
    }
    
    if (WebExtractor.isPodcastUrl(url)) {
      return 'podcast';
    }
    
    if (WebExtractor.isWebUrl(url)) {
      return 'article';
    }
    
    return 'unknown';
  }

  static async extractContent(url: string, userId?: string): Promise<LinkExtractionResult> {
    const linkType = this.detectLinkType(url);
    
    console.log(`🔗 Detected link type: ${linkType} for URL: ${url}`);
    console.log(`👤 User ID for OAuth: ${userId || 'not provided'}`);
    console.log(`🔍 About to process YouTube link with userId:`, !!userId);
    
    switch (linkType) {
      case 'youtube': {
        console.log('🔐 Trying OAuth-authenticated YouTube extraction...');
        
        // First try OAuth extraction if we have a userId
        if (userId) {
          try {
            const oauthResult = await YouTubeOAuthSimpleExtractor.extractContent(url, userId);
            
            if (oauthResult.success && oauthResult.data) {
              console.log('✅ OAuth extraction successful!');
              return {
                success: true,
                linkType: 'youtube',
                data: oauthResult.data
              };
            }
            
            if (oauthResult.requiresAuth) {
              console.log('🔐 OAuth authentication required');
              return {
                success: false,
                linkType: 'youtube',
                error: oauthResult.error,
                requiresAuth: true,
                authUrl: oauthResult.authUrl
              };
            }
            
            // OAuth failed, fall back to other methods
            console.log('⚠️ OAuth extraction failed, trying fallback methods...');
            
          } catch (error) {
            console.log('❌ OAuth extraction error:', error instanceof Error ? error.message : 'Unknown error');
          }
        }
        
        // Fallback to previous extraction methods
        console.log('🎯 Trying fallback YouTube extraction methods...');
        
        const extractors = [
          { name: 'YouTube Data API + Hybrid', extractor: YouTubeHybridExtractor },
          { name: 'Vercel-compatible packages', extractor: YouTubeVercelExtractor },
          { name: 'Original transcript scraper', extractor: YouTubeExtractor }
        ];
        
        for (const { name, extractor } of extractors) {
          try {
            console.log(`🔄 Trying: ${name}...`);
            const result = await extractor.extractContent(url);
            
            if (result.success && result.data && result.data.transcript?.length > 0) {
              console.log(`✅ Success with: ${name}`);
              return {
                success: result.success,
                linkType: 'youtube',
                data: result.data,
                error: result.error
              };
            }
          } catch (error) {
            console.log(`❌ ${name} failed:`, error instanceof Error ? error.message : 'Unknown error');
            continue;
          }
        }
        
        // All methods failed - provide guidance with OAuth option
        return {
          success: false,
          linkType: 'youtube',
          error: userId ? 
            `Unable to extract transcript from this YouTube video.

🔐 For better access to YouTube captions, try connecting your YouTube account via OAuth.

YouTube has strict restrictions on programmatic access. Try these alternatives:
1. 🎵 Use the Audio upload tab - Download the video's audio and upload it directly
2. 📱 Try a different YouTube video with better accessibility  
3. 🔗 Use educational content (Khan Academy, MIT OpenCourseWare) which typically works better

Popular tools for downloading YouTube audio:
• yt-dlp (command line)
• Browser extensions  
• Online YouTube to MP3 converters` :
            `Unable to extract transcript from this YouTube video.

YouTube has strict restrictions on programmatic access. Try these alternatives:
1. 🎵 Use the Audio upload tab - Download the video's audio and upload it directly
2. 📱 Try a different YouTube video with better accessibility  
3. 🔗 Use educational content (Khan Academy, MIT OpenCourseWare) which typically works better

Popular tools for downloading YouTube audio:
• yt-dlp (command line)
• Browser extensions  
• Online YouTube to MP3 converters`
        };
      }
      
      case 'podcast':
      case 'article': {
        const result = await WebExtractor.extractContent(url);
        return {
          success: result.success,
          linkType: linkType,
          data: result.data,
          error: result.error
        };
      }
      
      case 'unknown':
      default: {
        return {
          success: false,
          linkType: 'unknown',
          error: 'Unsupported URL type. Please provide a YouTube, podcast, or web article URL.'
        };
      }
    }
  }

  static getSupportedDomains(): string[] {
    return [
      // YouTube
      'youtube.com',
      'youtu.be',
      'm.youtube.com',
      
      // Podcasts
      'spotify.com',
      'podcasts.apple.com',
      'podcasts.google.com',
      'overcast.fm',
      'pocketcasts.com',
      'castbox.fm',
      'anchor.fm',
      'soundcloud.com',
      'stitcher.com',
      
      // Common article sites (examples)
      'medium.com',
      'substack.com',
      'blog.com',
      'wordpress.com',
      'blogspot.com',
      'ghost.org',
      'dev.to',
      'hashnode.com'
    ];
  }

  static isUrlSupported(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const supportedDomains = this.getSupportedDomains();
      
      return supportedDomains.some(domain => 
        urlObj.hostname.includes(domain) || 
        urlObj.hostname === domain
      ) || this.detectLinkType(url) !== 'unknown';
    } catch {
      return false;
    }
  }
}

// Re-export types and classes for convenience
export { YouTubeExtractor, YouTubeVideoData, YouTubeExtractorResult } from './youtube-extractor';
export { YouTubeApiExtractor, YouTubeApiVideoData, YouTubeApiExtractorResult } from './youtube-api-extractor';
export { YouTubeHybridExtractor, YouTubeHybridData, YouTubeHybridResult } from './youtube-hybrid-extractor';
export { YouTubeVercelExtractor, YouTubeVercelData, YouTubeVercelResult } from './youtube-vercel-extractor';
export { YouTubeRunPodExtractor, YouTubeRunPodData, YouTubeRunPodResult } from './youtube-runpod-extractor';
export { YouTubePuppeteerExtractor, YouTubePuppeteerData, YouTubePuppeteerResult } from './youtube-puppeteer-extractor';
export { YouTubeOAuthSimpleExtractor, YouTubeOAuthData, YouTubeOAuthResult } from './youtube-oauth-simple';
export { WebExtractor, WebArticleData, WebExtractorResult } from './web-extractor';