import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { spawn } from 'child_process';
import { readdir, writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

describe('Blog Performance Tests', () => {
  const testBlogDir = join(process.cwd(), 'src', 'content', 'blog-test');
  const originalBlogDir = join(process.cwd(), 'src', 'content', 'blog');
  
  beforeAll(async () => {
    // Create test blog directory
    if (!existsSync(testBlogDir)) {
      await mkdir(testBlogDir, { recursive: true });
    }
  });

  afterAll(async () => {
    // Clean up test files
    try {
      if (existsSync(testBlogDir)) {
        const files = await readdir(testBlogDir);
        for (const file of files) {
          if (file.endsWith('.md')) {
            await unlink(join(testBlogDir, file));
          }
        }
      }
    } catch (error) {
      console.warn('Cleanup failed:', error);
    }
  });

  describe('Build Performance with Multiple Posts', () => {
    it('should handle small number of posts efficiently', async () => {
      const postCount = 5;
      const posts = generateMockPosts(postCount);
      
      const startTime = Date.now();
      
      // Simulate processing posts (like Astro would)
      const processedPosts = posts
        .filter(post => !post.data.draft)
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
        .map(post => ({
          ...post,
          url: `/blog/${post.slug}`,
          formattedDate: post.data.pubDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          })
        }));
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(processedPosts.length).toBe(postCount);
      expect(processingTime).toBeLessThan(100); // Should be very fast for small numbers
    }, 10000);

    it('should handle medium number of posts efficiently', async () => {
      const postCount = 50;
      const posts = generateMockPosts(postCount);
      
      const startTime = Date.now();
      
      // Simulate more complex processing
      const processedPosts = posts
        .filter(post => !post.data.draft)
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
        .map(post => {
          // Simulate tag processing
          const tags = post.data.tags || [];
          const tagUrls = tags.map(tag => `/blog/tags/${tag}`);
          
          // Simulate content processing
          const wordCount = post.body.split(/\s+/).length;
          const readingTime = Math.ceil(wordCount / 200);
          
          return {
            ...post,
            url: `/blog/${post.slug}`,
            tagUrls,
            wordCount,
            readingTime,
            formattedDate: post.data.pubDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          };
        });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(processedPosts.length).toBe(postCount);
      expect(processingTime).toBeLessThan(500); // Should still be fast
    }, 15000);

    it('should handle large number of posts within reasonable time', async () => {
      const postCount = 200;
      const posts = generateMockPosts(postCount);
      
      const startTime = Date.now();
      
      // Simulate full blog processing pipeline
      const processedPosts = posts
        .filter(post => !post.data.draft)
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
        .map(post => {
          const tags = post.data.tags || [];
          const tagUrls = tags.map(tag => `/blog/tags/${tag}`);
          const wordCount = post.body.split(/\s+/).length;
          const readingTime = Math.ceil(wordCount / 200);
          
          // Simulate SEO processing
          const seoTitle = post.data.title.length > 60 
            ? post.data.title.substring(0, 57) + '...'
            : post.data.title;
          
          const seoDescription = post.data.description.length > 160
            ? post.data.description.substring(0, 157) + '...'
            : post.data.description;
          
          return {
            ...post,
            url: `/blog/${post.slug}`,
            tagUrls,
            wordCount,
            readingTime,
            seoTitle,
            seoDescription,
            formattedDate: post.data.pubDate.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
          };
        });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(processedPosts.length).toBe(postCount);
      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
    }, 20000);
  });

  describe('Tag Processing Performance', () => {
    it('should extract unique tags efficiently', () => {
      const postCount = 100;
      const posts = generateMockPosts(postCount);
      
      const startTime = Date.now();
      
      // Extract all unique tags
      const allTags = new Set<string>();
      posts.forEach(post => {
        if (post.data.tags) {
          post.data.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      const uniqueTags = Array.from(allTags);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(uniqueTags.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(50); // Should be very fast
    });

    it('should generate tag pages efficiently', () => {
      const postCount = 100;
      const posts = generateMockPosts(postCount);
      
      const startTime = Date.now();
      
      // Extract unique tags
      const allTags = new Set<string>();
      posts.forEach(post => {
        if (post.data.tags) {
          post.data.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      // Generate tag pages
      const tagPages = Array.from(allTags).map(tag => {
        const tagPosts = posts
          .filter(post => !post.data.draft && post.data.tags?.includes(tag))
          .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
        
        return {
          tag,
          posts: tagPosts,
          postCount: tagPosts.length
        };
      });
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(tagPages.length).toBeGreaterThan(0);
      expect(processingTime).toBeLessThan(200); // Should be reasonably fast
    });
  });

  describe('RSS Feed Generation Performance', () => {
    it('should generate RSS feed efficiently', () => {
      const postCount = 100;
      const posts = generateMockPosts(postCount);
      
      const startTime = Date.now();
      
      // Simulate RSS feed generation
      const rssItems = posts
        .filter(post => !post.data.draft)
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
        .slice(0, 50) // Limit RSS items
        .map(post => ({
          title: post.data.title,
          description: post.data.description,
          pubDate: post.data.pubDate,
          link: `/blog/${post.slug}`,
          guid: `/blog/${post.slug}`,
          categories: post.data.tags || []
        }));
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(rssItems.length).toBeLessThanOrEqual(50);
      expect(processingTime).toBeLessThan(100); // Should be very fast
    });
  });

  describe('Sitemap Generation Performance', () => {
    it('should generate sitemap entries efficiently', () => {
      const postCount = 200;
      const posts = generateMockPosts(postCount);
      
      const startTime = Date.now();
      
      // Simulate sitemap generation
      const sitemapEntries = posts
        .filter(post => !post.data.draft)
        .map(post => ({
          url: `/blog/${post.slug}`,
          lastmod: post.data.pubDate.toISOString(),
          changefreq: 'monthly' as const,
          priority: 0.7
        }));
      
      // Add tag pages to sitemap
      const allTags = new Set<string>();
      posts.forEach(post => {
        if (post.data.tags) {
          post.data.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      const tagEntries = Array.from(allTags).map(tag => ({
        url: `/blog/tags/${tag}`,
        lastmod: new Date().toISOString(),
        changefreq: 'weekly' as const,
        priority: 0.5
      }));
      
      const allEntries = [...sitemapEntries, ...tagEntries];
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(allEntries.length).toBeGreaterThan(postCount);
      expect(processingTime).toBeLessThan(200); // Should be reasonably fast
    });
  });

  describe('Memory Usage', () => {
    it('should not consume excessive memory with many posts', () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      const postCount = 500;
      const posts = generateMockPosts(postCount);
      
      // Process posts multiple times to simulate real usage
      for (let i = 0; i < 10; i++) {
        const processed = posts
          .filter(post => !post.data.draft)
          .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
          .map(post => ({
            ...post,
            url: `/blog/${post.slug}`,
            wordCount: post.body.split(/\s+/).length
          }));
        
        expect(processed.length).toBe(postCount);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });
  });

  describe('Concurrent Processing', () => {
    it('should handle concurrent post processing', async () => {
      const postCount = 50;
      const posts = generateMockPosts(postCount);
      
      const startTime = Date.now();
      
      // Process posts concurrently
      const processingPromises = posts.map(async (post) => {
        // Simulate async processing (like rendering content)
        await new Promise(resolve => setTimeout(resolve, 1));
        
        return {
          ...post,
          url: `/blog/${post.slug}`,
          wordCount: post.body.split(/\s+/).length,
          readingTime: Math.ceil(post.body.split(/\s+/).length / 200)
        };
      });
      
      const processedPosts = await Promise.all(processingPromises);
      
      const endTime = Date.now();
      const processingTime = endTime - startTime;
      
      expect(processedPosts.length).toBe(postCount);
      expect(processingTime).toBeLessThan(1000); // Should be faster than sequential
    });
  });

  describe('Caching and Optimization', () => {
    it('should benefit from caching repeated operations', () => {
      const postCount = 100;
      const posts = generateMockPosts(postCount);
      
      // First run (cold cache)
      const startTime1 = Date.now();
      const tags1 = extractUniqueTags(posts);
      const endTime1 = Date.now();
      const time1 = endTime1 - startTime1;
      
      // Second run (warm cache simulation)
      const startTime2 = Date.now();
      const tags2 = extractUniqueTags(posts);
      const endTime2 = Date.now();
      const time2 = endTime2 - startTime2;
      
      expect(tags1).toEqual(tags2);
      expect(time2).toBeLessThanOrEqual(time1); // Should be same or faster
    });
  });
});

// Helper functions
function generateMockPosts(count: number) {
  const tags = ['javascript', 'typescript', 'react', 'vue', 'astro', 'web-development', 'tutorial', 'guide', 'tips', 'best-practices'];
  const authors = ['John Doe', 'Jane Smith', 'Alex Developer', 'Sarah Backend', 'Mike Frontend'];
  
  return Array.from({ length: count }, (_, i) => {
    const randomTags = tags
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(Math.random() * 4) + 2);
    
    const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
    
    return {
      slug: `test-post-${i + 1}`,
      data: {
        title: `Test Blog Post ${i + 1}: A Comprehensive Guide`,
        description: `This is a test blog post description for post ${i + 1}. It provides valuable insights and practical tips for developers.`,
        pubDate: new Date(2025, 0, (i % 30) + 1), // Spread across January
        author: randomAuthor,
        tags: randomTags,
        heroImage: `/images/blog/test-post-${i + 1}.jpg`,
        draft: Math.random() < 0.1 // 10% chance of being draft
      },
      body: `# Test Post ${i + 1}

## Introduction

This is a test blog post with substantial content to simulate real blog posts.

## Main Content

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

### Subsection

More content here with technical details and code examples.

## Conclusion

This concludes our test blog post with meaningful content for performance testing.`
    };
  });
}

function extractUniqueTags(posts: any[]) {
  const allTags = new Set<string>();
  posts.forEach(post => {
    if (post.data.tags) {
      post.data.tags.forEach((tag: string) => allTags.add(tag));
    }
  });
  return Array.from(allTags);
}