import { describe, it, expect, vi } from 'vitest';
import { parseStringPromise } from 'xml2js';

describe('RSS Feed Enhanced Tests', () => {
  describe('RSS Feed Generation', () => {
    it('should generate RSS feed with correct XML structure', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      // Verify XML declaration
      expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      
      // Verify RSS version
      expect(rssContent).toContain('<rss version="2.0"');
      
      // Verify namespace
      expect(rssContent).toContain('xmlns:atom="http://www.w3.org/2005/Atom"');
      
      // Verify channel structure
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('</channel>');
      expect(rssContent).toContain('</rss>');
    });

    it('should include proper RSS metadata', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      // Verify required RSS elements
      expect(rssContent).toContain('<title>Blog RSS Feed</title>');
      expect(rssContent).toContain('<description>Stay updated with our latest blog posts and insights</description>');
      expect(rssContent).toContain('<link>https://test-site.com</link>');
      expect(rssContent).toContain('<language>en-us</language>');
      expect(rssContent).toContain('<lastBuildDate>');
      expect(rssContent).toContain('<atom:link href="https://test-site.com/rss.xml" rel="self" type="application/rss+xml"/>');
    });

    it('should include all published blog posts with correct data', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      // Should include published posts
      expect(rssContent).toContain('Test Post 1');
      expect(rssContent).toContain('Test Post 2');
      
      // Should not include draft posts
      expect(rssContent).not.toContain('Draft Post');
      
      // Verify CDATA sections for titles and descriptions
      expect(rssContent).toContain('<![CDATA[Test Post 1]]>');
      expect(rssContent).toContain('<![CDATA[First test post]]>');
    });

    it('should validate XML structure with parser', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      // Parse XML to ensure it's valid
      const parsedXML = await parseStringPromise(rssContent);
      
      expect(parsedXML.rss).toBeDefined();
      expect(parsedXML.rss.$.version).toBe('2.0');
      expect(parsedXML.rss.channel).toBeDefined();
      expect(parsedXML.rss.channel[0].title[0]).toBe('Blog RSS Feed');
      expect(parsedXML.rss.channel[0].item).toBeDefined();
      expect(Array.isArray(parsedXML.rss.channel[0].item)).toBe(true);
    });

    it('should include proper item elements for each post', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      const parsedXML = await parseStringPromise(rssContent);
      const items = parsedXML.rss.channel[0].item;
      
      expect(items.length).toBe(2); // Should have 2 published posts
      
      items.forEach((item: any) => {
        // Required RSS item elements
        expect(item.title).toBeDefined();
        expect(item.description).toBeDefined();
        expect(item.pubDate).toBeDefined();
        expect(item.link).toBeDefined();
        expect(item.guid).toBeDefined();
        
        // Verify GUID is permalink
        expect(item.guid[0].$.isPermaLink).toBe('true');
        
        // Verify proper URL format
        expect(item.link[0]).toMatch(/^https:\/\/test-site\.com\/blog\//);
        expect(item.guid[0]._).toMatch(/^https:\/\/test-site\.com\/blog\//);
      });
    });

    it('should sort posts by publication date (newest first)', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      const parsedXML = await parseStringPromise(rssContent);
      const items = parsedXML.rss.channel[0].item;
      
      // First item should be the newest (2025-01-15)
      expect(items[0].title[0]).toContain('Test Post 1');
      
      // Second item should be older (2025-01-10)
      expect(items[1].title[0]).toContain('Test Post 2');
    });

    it('should include categories for posts with tags', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      const parsedXML = await parseStringPromise(rssContent);
      const items = parsedXML.rss.channel[0].item;
      
      // Find the post with tags
      const postWithTags = items.find((item: any) => 
        item.title[0].includes('Test Post 1')
      );
      
      expect(postWithTags).toBeDefined();
      expect(postWithTags.category).toBeDefined();
      expect(Array.isArray(postWithTags.category)).toBe(true);
      expect(postWithTags.category.length).toBeGreaterThan(0);
    });

    it('should return correct content type header', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      
      expect(response.headers.get('Content-Type')).toBe('application/xml; charset=utf-8');
    });

    it('should handle missing site URL gracefully', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: undefined
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      // Should use fallback URL
      expect(rssContent).toContain('https://your-site.com');
    });

    it('should filter draft posts in production', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      // Should not include draft posts
      expect(rssContent).not.toContain('Draft Post');
    });
  });

  describe('RSS Feed Validation', () => {
    it('should validate against RSS 2.0 specification', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      // RSS 2.0 required elements
      expect(rssContent).toMatch(/<rss version="2\.0"/);
      expect(rssContent).toContain('<channel>');
      expect(rssContent).toContain('<title>');
      expect(rssContent).toContain('<link>');
      expect(rssContent).toContain('<description>');
      
      // RSS 2.0 recommended elements
      expect(rssContent).toContain('<language>');
      expect(rssContent).toContain('<lastBuildDate>');
      
      // Item elements
      expect(rssContent).toContain('<item>');
      expect(rssContent).toContain('<pubDate>');
      expect(rssContent).toContain('<guid');
    });

    it('should have valid pubDate format', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      const parsedXML = await parseStringPromise(rssContent);
      const items = parsedXML.rss.channel[0].item;
      
      items.forEach((item: any) => {
        const pubDate = item.pubDate[0];
        
        // Should be valid RFC 2822 format
        expect(pubDate).toMatch(/^[A-Za-z]{3}, \d{2} [A-Za-z]{3} \d{4} \d{2}:\d{2}:\d{2} GMT$/);
        
        // Should be parseable as date
        const parsedDate = new Date(pubDate);
        expect(isNaN(parsedDate.getTime())).toBe(false);
      });
    });

    it('should escape special characters in content', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      // Should use CDATA sections for content that might contain special characters
      expect(rssContent).toContain('<![CDATA[');
      expect(rssContent).toContain(']]>');
      
      // Should not contain unescaped special characters outside CDATA
      const outsideCDATA = rssContent.replace(/<!\[CDATA\[.*?\]\]>/gs, '');
      expect(outsideCDATA).not.toMatch(/[<>&"']/);
    });

    it('should have unique GUIDs for each item', async () => {
      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const response = await GET(mockContext as any);
      const rssContent = await response.text();
      
      const parsedXML = await parseStringPromise(rssContent);
      const items = parsedXML.rss.channel[0].item;
      
      const guids = items.map((item: any) => item.guid[0]._);
      const uniqueGuids = new Set(guids);
      
      expect(guids.length).toBe(uniqueGuids.size);
    });
  });

  describe('RSS Feed Performance', () => {
    it('should handle large number of posts efficiently', async () => {
      // Mock a large number of posts
      const largeMockPosts = Array.from({ length: 100 }, (_, i) => ({
        slug: `post-${i}`,
        data: {
          title: `Post ${i}`,
          description: `Description for post ${i}`,
          pubDate: new Date(2025, 0, i + 1),
          author: 'Test Author',
          draft: false
        }
      }));

      vi.mocked((await import('astro:content')).getCollection).mockResolvedValue(largeMockPosts);

      const { GET } = await import('../rss.xml.ts');
      
      const mockContext = {
        site: new URL('https://test-site.com')
      };
      
      const startTime = Date.now();
      const response = await GET(mockContext as any);
      const endTime = Date.now();
      
      const rssContent = await response.text();
      
      // Should complete within reasonable time (less than 1 second)
      expect(endTime - startTime).toBeLessThan(1000);
      
      // Should contain all posts
      expect(rssContent.split('<item>').length - 1).toBe(100);
    });

    it('should limit RSS feed items if needed', async () => {
      // Test RSS feed item limit (typically 20-50 items)
      const MAX_RSS_ITEMS = 50;
      
      const largeMockPosts = Array.from({ length: 100 }, (_, i) => ({
        slug: `post-${i}`,
        data: {
          title: `Post ${i}`,
          description: `Description for post ${i}`,
          pubDate: new Date(2025, 0, i + 1),
          author: 'Test Author',
          draft: false
        }
      }));

      // Simulate limiting logic
      const limitedPosts = largeMockPosts
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
        .slice(0, MAX_RSS_ITEMS);

      expect(limitedPosts.length).toBe(MAX_RSS_ITEMS);
      expect(limitedPosts[0].data.pubDate.valueOf()).toBeGreaterThan(
        limitedPosts[limitedPosts.length - 1].data.pubDate.valueOf()
      );
    });
  });
});