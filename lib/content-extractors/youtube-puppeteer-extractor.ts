import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface YouTubePuppeteerData {
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
  extractionMethod: 'puppeteer-scraping';
}

export interface YouTubePuppeteerResult {
  success: boolean;
  data?: YouTubePuppeteerData;
  error?: string;
}

export class YouTubePuppeteerExtractor {
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

  private static async setupBrowser() {
    console.log('🤖 Setting up headless browser for YouTube scraping...');
    
    try {
      // Configure Chromium for Vercel environment
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: await chromium.executablePath(),
        headless: chromium.headless,
        ignoreHTTPSErrors: true,
      });
      
      return browser;
    } catch (error) {
      console.error('Failed to launch browser:', error);
      throw new Error('Browser automation not available in this environment');
    }
  }

  private static async scrapeYouTubePage(url: string) {
    let browser = null;
    
    try {
      browser = await this.setupBrowser();
      const page = await browser.newPage();
      
      // Set user agent to avoid bot detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      console.log('🌐 Navigating to YouTube page...');
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
      
      // Wait for video to load
      await page.waitForSelector('h1.ytd-watch-metadata', { timeout: 10000 });
      
      console.log('📊 Extracting video metadata...');
      
      // Extract video metadata
      const metadata = await page.evaluate(() => {
        const getTextContent = (selector: string) => {
          const element = document.querySelector(selector);
          return element?.textContent?.trim() || '';
        };
        
        const title = getTextContent('h1.ytd-watch-metadata') || getTextContent('#title h1') || 'YouTube Video';
        const channelName = getTextContent('#channel-name a') || getTextContent('#owner-text a') || 'Unknown Channel';
        const viewCount = getTextContent('#info-strings yt-formatted-string') || '0';
        const description = getTextContent('#description-text') || getTextContent('#meta #description') || '';
        
        // Try to get thumbnail
        const thumbnailImg = document.querySelector('meta[property="og:image"]') as HTMLMetaElement;
        const thumbnailUrl = thumbnailImg?.content || '';
        
        return {
          title,
          channelName,
          viewCount,
          description: description.substring(0, 500), // Limit description
          thumbnailUrl
        };
      });
      
      console.log(`✅ Got metadata: "${metadata.title}" by ${metadata.channelName}`);
      
      // Now try to get transcript
      console.log('📝 Looking for transcript button...');
      
      // Click on transcript button (multiple selectors to try)
      const transcriptSelectors = [
        'button[aria-label*="transcript" i]',
        'button[title*="transcript" i]',
        'ytd-transcript-engagement-panel-section-header-renderer button',
        '[data-target-id="engagement-panel-transcript"]'
      ];
      
      let transcriptClicked = false;
      
      for (const selector of transcriptSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`📋 Found transcript button: ${selector}`);
            await button.click();
            transcriptClicked = true;
            break;
          }
        } catch (error) {
          // Continue trying other selectors
        }
      }
      
      let transcript = '';
      
      if (transcriptClicked) {
        console.log('⏳ Waiting for transcript to load...');
        
        // Wait for transcript panel to appear
        try {
          await page.waitForSelector('ytd-transcript-renderer', { timeout: 10000 });
          
          // Extract transcript text
          transcript = await page.evaluate(() => {
            const transcriptItems = document.querySelectorAll('ytd-transcript-segment-renderer');
            const transcriptTexts = Array.from(transcriptItems).map(item => {
              const textElement = item.querySelector('.segment-text');
              return textElement?.textContent?.trim() || '';
            });
            
            return transcriptTexts.join(' ').replace(/\s+/g, ' ').trim();
          });
          
          console.log(`✅ Extracted transcript: ${transcript.length} characters`);
          
        } catch (error) {
          console.warn('Failed to extract transcript from panel:', error);
        }
      } else {
        console.warn('No transcript button found - transcript may not be available');
      }
      
      if (!transcript || transcript.length === 0) {
        throw new Error('No transcript could be extracted from this video. The video may not have captions enabled or accessible.');
      }
      
      return {
        ...metadata,
        transcript
      };
      
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  static async extractContent(url: string): Promise<YouTubePuppeteerResult> {
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

      console.log(`🎭 Starting Puppeteer extraction for: ${videoId}`);

      const scrapedData = await this.scrapeYouTubePage(url);

      const result: YouTubePuppeteerData = {
        id: videoId,
        title: scrapedData.title,
        description: scrapedData.description,
        duration: 'Unknown', // Hard to get reliably from DOM
        channelName: scrapedData.channelName,
        publishedAt: 'Unknown Date', // Hard to get reliably from DOM
        thumbnailUrl: scrapedData.thumbnailUrl,
        transcript: scrapedData.transcript,
        url,
        viewCount: scrapedData.viewCount,
        extractionMethod: 'puppeteer-scraping'
      };

      console.log(`🎉 Puppeteer extraction successful!`);
      console.log(`📹 Video: "${result.title}" by ${result.channelName}`);
      console.log(`📝 Transcript: ${result.transcript.length} characters`);

      return {
        success: true,
        data: result
      };

    } catch (error) {
      console.error('Puppeteer extraction error:', error);

      let errorMessage = 'Browser automation failed';
      if (error instanceof Error) {
        if (error.message.includes('transcript')) {
          errorMessage = error.message;
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Video took too long to load. Please try a different video or check your connection.';
        } else if (error.message.includes('browser') || error.message.includes('Browser')) {
          errorMessage = 'Browser automation is not available in this environment.';
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