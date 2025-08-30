import { Readability } from '@mozilla/readability';
import * as cheerio from 'cheerio';
import { JSDOM } from 'jsdom';

export interface WebArticleData {
  title: string;
  content: string;
  excerpt: string;
  author: string;
  siteName: string;
  publishedTime: string;
  url: string;
  byline: string;
  length: number;
}

export interface WebExtractorResult {
  success: boolean;
  data?: WebArticleData;
  error?: string;
}

export class WebExtractor {
  private static async fetchPageContent(url: string): Promise<string> {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      return html;
    } catch (error) {
      throw new Error(`Failed to fetch webpage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static extractMetadata(html: string, url: string) {
    const $ = cheerio.load(html);
    
    // Extract various metadata sources
    const getMetaContent = (selectors: string[]): string => {
      for (const selector of selectors) {
        const content = $(selector).attr('content') || $(selector).text().trim();
        if (content) return content;
      }
      return '';
    };

    const title = getMetaContent([
      'meta[property="og:title"]',
      'meta[name="twitter:title"]', 
      'meta[name="title"]',
      'title',
      'h1'
    ]) || 'Untitled Article';

    const author = getMetaContent([
      'meta[name="author"]',
      'meta[property="article:author"]',
      'meta[name="twitter:creator"]',
      '[rel="author"]',
      '.author',
      '.byline'
    ]) || 'Unknown Author';

    const siteName = getMetaContent([
      'meta[property="og:site_name"]',
      'meta[name="application-name"]',
      'meta[name="apple-mobile-web-app-title"]'
    ]) || new URL(url).hostname;

    const publishedTime = getMetaContent([
      'meta[property="article:published_time"]',
      'meta[property="og:updated_time"]',
      'meta[name="date"]',
      'time[datetime]',
      '.date',
      '.published'
    ]) || 'Unknown Date';

    const description = getMetaContent([
      'meta[property="og:description"]',
      'meta[name="twitter:description"]',
      'meta[name="description"]'
    ]) || '';

    return {
      title,
      author,
      siteName,
      publishedTime,
      description
    };
  }

  private static cleanContent(content: string): string {
    return content
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\n\s*\n/g, '\n\n') // Normalize line breaks
      .trim();
  }

  private static generateExcerpt(content: string, length: number = 300): string {
    const cleaned = content.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned.length <= length) return cleaned;
    
    const truncated = cleaned.substring(0, length);
    const lastSpace = truncated.lastIndexOf(' ');
    
    return lastSpace > 0 
      ? truncated.substring(0, lastSpace) + '...'
      : truncated + '...';
  }

  static async extractContent(url: string): Promise<WebExtractorResult> {
    try {
      // Validate URL
      let validUrl: URL;
      try {
        validUrl = new URL(url);
      } catch {
        return {
          success: false,
          error: 'Invalid URL format'
        };
      }

      // Check if URL is accessible
      if (!['http:', 'https:'].includes(validUrl.protocol)) {
        return {
          success: false,
          error: 'Only HTTP and HTTPS URLs are supported'
        };
      }

      console.log(`🌐 Extracting web content from: ${url}`);

      // Fetch the webpage HTML
      const html = await this.fetchPageContent(url);

      // Extract metadata using cheerio
      const metadata = this.extractMetadata(html, url);

      // Use Readability to extract main content
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document, {
        debug: false,
        maxElemsToParse: 0, // No limit
        nbTopCandidates: 5,
        charThreshold: 500,
        classesToPreserve: [], // Remove all CSS classes for clean content
      });

      const article = reader.parse();

      if (!article) {
        return {
          success: false,
          error: 'Could not extract readable content from the webpage'
        };
      }

      // Clean and format the content
      const cleanedContent = this.cleanContent(article.textContent || article.content);
      
      if (cleanedContent.length < 100) {
        return {
          success: false,
          error: 'Article content is too short or could not be extracted properly'
        };
      }

      const webData: WebArticleData = {
        title: article.title || metadata.title,
        content: cleanedContent,
        excerpt: this.generateExcerpt(cleanedContent),
        author: article.byline || metadata.author,
        siteName: metadata.siteName,
        publishedTime: metadata.publishedTime,
        url: url,
        byline: article.byline || '',
        length: cleanedContent.length
      };

      console.log(`✅ Successfully extracted web content: ${webData.title}`);
      console.log(`📄 Content length: ${webData.length} characters`);
      console.log(`👤 Author: ${webData.author}`);
      console.log(`🏛️ Site: ${webData.siteName}`);

      return {
        success: true,
        data: webData
      };

    } catch (error) {
      console.error('Web extraction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  static isWebUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return ['http:', 'https:'].includes(urlObj.protocol) && 
             !url.includes('youtube.com') && 
             !url.includes('youtu.be');
    } catch {
      return false;
    }
  }

  static isPodcastUrl(url: string): boolean {
    const podcastDomains = [
      'spotify.com',
      'podcasts.apple.com',
      'podcasts.google.com',
      'overcast.fm',
      'pocketcasts.com',
      'castbox.fm',
      'anchor.fm',
      'soundcloud.com',
      'stitcher.com'
    ];

    try {
      const urlObj = new URL(url);
      return podcastDomains.some(domain => urlObj.hostname.includes(domain));
    } catch {
      return false;
    }
  }
}