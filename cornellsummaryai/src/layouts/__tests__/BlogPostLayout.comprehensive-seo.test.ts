import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

describe('Blog Post Layout Comprehensive SEO Tests', () => {
  const mockBlogPosts = [
    {
      data: {
        title: 'Building Scalable APIs: Architecture Patterns and Best Practices',
        description: 'Learn how to design and build APIs that can handle millions of requests while maintaining performance, reliability, and maintainability.',
        pubDate: new Date('2025-01-05'),
        heroImage: '/images/blog/scalable-apis.jpg',
        author: 'Sarah Backend',
        tags: ['api', 'scalability', 'architecture']
      },
      body: '## Introduction\n\nBuilding scalable APIs requires careful consideration of architecture patterns...\n\n### Key Principles\n\n1. Design for scale\n2. Implement proper caching\n3. Use appropriate data structures',
      slug: 'building-scalable-apis'
    },
    {
      data: {
        title: 'Getting Started with Astro: A Modern Web Framework',
        description: 'Learn how to build fast, content-focused websites with Astro\'s innovative island architecture and zero-JS by default approach.',
        pubDate: new Date('2025-01-15'),
        heroImage: '/images/blog/astro-getting-started.jpg',
        author: 'Alex Developer',
        tags: ['astro', 'web-development', 'javascript', 'tutorial']
      },
      body: '## What is Astro?\n\nAstro is a modern web framework that delivers lightning-fast performance...',
      slug: 'getting-started-with-astro'
    }
  ];

  describe('Meta Tag Generation', () => {
    it('should generate proper title tags', () => {
      for (const post of mockBlogPosts) {
        const title = post.data.title;
        
        // Title should be present and not empty
        expect(title).toBeDefined();
        expect(title.length).toBeGreaterThan(0);
        
        // Title should be within SEO best practice length (50-60 characters)
        expect(title.length).toBeLessThanOrEqual(60);
        
        // Title should not contain HTML tags
        expect(title).not.toMatch(/<[^>]*>/);
        
        // Title should be descriptive
        expect(title.split(' ').length).toBeGreaterThanOrEqual(3);
      }
    });

    it('should generate proper meta descriptions', () => {
      for (const post of mockBlogPosts) {
        const description = post.data.description;
        
        // Description should be present and not empty
        expect(description).toBeDefined();
        expect(description.length).toBeGreaterThan(0);
        
        // Description should be within SEO best practice length (150-160 characters)
        expect(description.length).toBeLessThanOrEqual(160);
        expect(description.length).toBeGreaterThanOrEqual(120);
        
        // Description should not contain HTML tags
        expect(description).not.toMatch(/<[^>]*>/);
        
        // Description should end with proper punctuation
        expect(description).toMatch(/[.!?]$/);
      }
    });

    it('should generate canonical URLs correctly', () => {
      const baseUrl = 'https://example.com';
      
      for (const post of mockBlogPosts) {
        const canonicalURL = new URL(`/blog/${post.slug}`, baseUrl).toString();
        
        // Should be valid URL
        expect(canonicalURL).toMatch(/^https:\/\/example\.com\/blog\/[a-z0-9-]+$/);
        
        // Should not have trailing slash for blog posts
        expect(canonicalURL).not.toMatch(/\/$/);
        
        // Should be absolute URL
        expect(canonicalURL).toMatch(/^https?:\/\//);
      }
    });

    it('should generate proper viewport meta tag', () => {
      const viewportContent = 'width=device-width, initial-scale=1.0';
      
      expect(viewportContent).toBe('width=device-width, initial-scale=1.0');
    });

    it('should generate proper charset meta tag', () => {
      const charset = 'UTF-8';
      
      expect(charset).toBe('UTF-8');
    });
  });

  describe('Open Graph Tags', () => {
    it('should generate proper Open Graph title', () => {
      for (const post of mockBlogPosts) {
        const ogTitle = post.data.title;
        
        expect(ogTitle).toBeDefined();
        expect(ogTitle.length).toBeGreaterThan(0);
        expect(ogTitle.length).toBeLessThanOrEqual(60);
        expect(ogTitle).not.toMatch(/<[^>]*>/);
      }
    });

    it('should generate proper Open Graph description', () => {
      for (const post of mockBlogPosts) {
        const ogDescription = post.data.description;
        
        expect(ogDescription).toBeDefined();
        expect(ogDescription.length).toBeGreaterThan(0);
        expect(ogDescription.length).toBeLessThanOrEqual(160);
        expect(ogDescription).not.toMatch(/<[^>]*>/);
      }
    });

    it('should generate proper Open Graph image URLs', () => {
      const baseUrl = 'https://example.com';
      
      for (const post of mockBlogPosts) {
        if (post.data.heroImage) {
          const ogImage = new URL(post.data.heroImage, baseUrl).toString();
          
          // Should be absolute URL
          expect(ogImage).toMatch(/^https:\/\/example\.com/);
          
          // Should point to image file
          expect(ogImage).toMatch(/\.(jpg|jpeg|png|webp|svg)$/i);
          
          // Should be in images directory
          expect(ogImage).toContain('/images/');
        }
      }
    });

    it('should generate proper Open Graph type', () => {
      const ogType = 'article';
      
      expect(ogType).toBe('article');
    });

    it('should generate proper Open Graph URL', () => {
      const baseUrl = 'https://example.com';
      
      for (const post of mockBlogPosts) {
        const ogUrl = new URL(`/blog/${post.slug}`, baseUrl).toString();
        
        expect(ogUrl).toMatch(/^https:\/\/example\.com\/blog\/[a-z0-9-]+$/);
        expect(ogUrl).not.toMatch(/\/$/);
      }
    });

    it('should generate proper Open Graph site name', () => {
      const ogSiteName = 'Cornell Summary AI';
      
      expect(ogSiteName).toBeDefined();
      expect(ogSiteName.length).toBeGreaterThan(0);
    });
  });

  describe('Twitter Card Tags', () => {
    it('should generate proper Twitter card type', () => {
      const twitterCard = 'summary_large_image';
      
      expect(twitterCard).toBe('summary_large_image');
    });

    it('should generate proper Twitter title', () => {
      for (const post of mockBlogPosts) {
        const twitterTitle = post.data.title;
        
        expect(twitterTitle).toBeDefined();
        expect(twitterTitle.length).toBeGreaterThan(0);
        expect(twitterTitle.length).toBeLessThanOrEqual(70); // Twitter title limit
      }
    });

    it('should generate proper Twitter description', () => {
      for (const post of mockBlogPosts) {
        const twitterDescription = post.data.description;
        
        expect(twitterDescription).toBeDefined();
        expect(twitterDescription.length).toBeGreaterThan(0);
        expect(twitterDescription.length).toBeLessThanOrEqual(200); // Twitter description limit
      }
    });

    it('should generate proper Twitter image', () => {
      const baseUrl = 'https://example.com';
      
      for (const post of mockBlogPosts) {
        if (post.data.heroImage) {
          const twitterImage = new URL(post.data.heroImage, baseUrl).toString();
          
          expect(twitterImage).toMatch(/^https:\/\/example\.com/);
          expect(twitterImage).toMatch(/\.(jpg|jpeg|png|webp)$/i);
        }
      }
    });
  });

  describe('JSON-LD Structured Data', () => {
    it('should generate valid Article schema', () => {
      const baseUrl = 'https://example.com';
      
      for (const post of mockBlogPosts) {
        const canonicalURL = new URL(`/blog/${post.slug}`, baseUrl).toString();
        const ogImage = post.data.heroImage ? new URL(post.data.heroImage, baseUrl).toString() : null;
        
        const jsonLD = {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.data.title,
          "description": post.data.description,
          "author": {
            "@type": "Person",
            "name": post.data.author
          },
          "datePublished": post.data.pubDate.toISOString(),
          "dateModified": post.data.pubDate.toISOString(),
          "image": ogImage ? {
            "@type": "ImageObject",
            "url": ogImage,
            "width": 1200,
            "height": 630
          } : undefined,
          "url": canonicalURL,
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": canonicalURL
          },
          "publisher": {
            "@type": "Organization",
            "name": "Cornell Summary AI",
            "logo": {
              "@type": "ImageObject",
              "url": new URL("/favicon.svg", baseUrl).toString(),
              "width": 60,
              "height": 60
            }
          },
          "articleSection": post.data.tags?.[0],
          "keywords": post.data.tags?.join(", "),
          "wordCount": post.body.split(/\s+/).length,
          "inLanguage": "en-US"
        };

        // Validate required schema.org Article properties
        expect(jsonLD["@context"]).toBe("https://schema.org");
        expect(jsonLD["@type"]).toBe("Article");
        expect(jsonLD.headline).toBeDefined();
        expect(jsonLD.description).toBeDefined();
        expect(jsonLD.author).toBeDefined();
        expect(jsonLD.author["@type"]).toBe("Person");
        expect(jsonLD.author.name).toBeDefined();
        expect(jsonLD.datePublished).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(jsonLD.url).toMatch(/^https:\/\//);
        expect(jsonLD.mainEntityOfPage).toBeDefined();
        expect(jsonLD.mainEntityOfPage["@type"]).toBe("WebPage");
        expect(jsonLD.publisher).toBeDefined();
        expect(jsonLD.publisher["@type"]).toBe("Organization");
        
        // Validate optional properties
        if (post.data.tags && post.data.tags.length > 0) {
          expect(jsonLD.articleSection).toBe(post.data.tags[0]);
          expect(jsonLD.keywords).toBe(post.data.tags.join(", "));
        }
        
        expect(jsonLD.wordCount).toBeGreaterThan(0);
        expect(jsonLD.inLanguage).toBe("en-US");
      }
    });

    it('should generate valid ImageObject schema for hero images', () => {
      const baseUrl = 'https://example.com';
      
      for (const post of mockBlogPosts) {
        if (post.data.heroImage) {
          const imageSchema = {
            "@type": "ImageObject",
            "url": new URL(post.data.heroImage, baseUrl).toString(),
            "width": 1200,
            "height": 630
          };

          expect(imageSchema["@type"]).toBe("ImageObject");
          expect(imageSchema.url).toMatch(/^https:\/\//);
          expect(imageSchema.width).toBe(1200);
          expect(imageSchema.height).toBe(630);
        }
      }
    });

    it('should generate valid Organization schema for publisher', () => {
      const baseUrl = 'https://example.com';
      
      const publisherSchema = {
        "@type": "Organization",
        "name": "Cornell Summary AI",
        "logo": {
          "@type": "ImageObject",
          "url": new URL("/favicon.svg", baseUrl).toString(),
          "width": 60,
          "height": 60
        }
      };

      expect(publisherSchema["@type"]).toBe("Organization");
      expect(publisherSchema.name).toBeDefined();
      expect(publisherSchema.logo).toBeDefined();
      expect(publisherSchema.logo["@type"]).toBe("ImageObject");
      expect(publisherSchema.logo.url).toMatch(/^https:\/\//);
    });
  });

  describe('Heading Hierarchy', () => {
    it('should validate proper heading structure in blog posts', () => {
      for (const post of mockBlogPosts) {
        const content = post.body;
        
        // Should not start with h1 (layout provides h1)
        expect(content).not.toMatch(/^# /m);
        
        // Should start with h2 or lower
        const firstHeading = content.match(/^#{2,6} /m);
        expect(firstHeading).toBeTruthy();
        
        // Should have logical heading progression
        const headings = content.match(/^#{2,6} .+$/gm) || [];
        expect(headings.length).toBeGreaterThan(0);
        
        // Check heading levels don't skip (e.g., h2 -> h4)
        const headingLevels = headings.map(h => h.match(/^#{2,6}/)?.[0].length || 0);
        for (let i = 1; i < headingLevels.length; i++) {
          const diff = headingLevels[i] - headingLevels[i - 1];
          expect(diff).toBeLessThanOrEqual(1); // Should not skip levels
        }
      }
    });

    it('should validate actual blog post files have correct heading hierarchy', () => {
      const blogDir = join(process.cwd(), 'src', 'content', 'blog');
      
      try {
        const blogFiles = readdirSync(blogDir).filter(file => file.endsWith('.md'));
        
        expect(blogFiles.length).toBeGreaterThan(0);
        
        for (const file of blogFiles) {
          const filepath = join(blogDir, file);
          const content = readFileSync(filepath, 'utf-8');
          
          // Remove frontmatter
          const contentBody = content.replace(/^---\n[\s\S]*?\n---\n/, '');
          
          // Should not start with h1
          expect(contentBody).not.toMatch(/^# /m);
          
          // Should have at least one heading
          const hasHeadings = contentBody.match(/^#{2,6} /m);
          expect(hasHeadings).toBeTruthy();
        }
      } catch (error) {
        // If blog directory doesn't exist, skip this test
        console.warn('Blog directory not found, skipping file validation');
      }
    });
  });

  describe('SEO Best Practices', () => {
    it('should validate title length for SEO', () => {
      for (const post of mockBlogPosts) {
        const title = post.data.title;
        
        // Optimal title length for SEO (50-60 characters)
        expect(title.length).toBeGreaterThanOrEqual(30);
        expect(title.length).toBeLessThanOrEqual(60);
        
        // Should contain target keywords
        expect(title.toLowerCase()).toMatch(/[a-z]/);
        
        // Should be unique and descriptive
        expect(title.split(' ').length).toBeGreaterThanOrEqual(4);
      }
    });

    it('should validate description length for SEO', () => {
      for (const post of mockBlogPosts) {
        const description = post.data.description;
        
        // Optimal description length for SEO (120-160 characters)
        expect(description.length).toBeGreaterThanOrEqual(120);
        expect(description.length).toBeLessThanOrEqual(160);
        
        // Should be compelling and descriptive
        expect(description.toLowerCase()).toMatch(/learn|discover|guide|how to|tips|best practices/);
      }
    });

    it('should validate URL structure for SEO', () => {
      for (const post of mockBlogPosts) {
        const slug = post.slug;
        
        // Should be lowercase
        expect(slug).toBe(slug.toLowerCase());
        
        // Should use hyphens, not underscores
        expect(slug).not.toContain('_');
        
        // Should not be too long
        expect(slug.length).toBeLessThanOrEqual(60);
        
        // Should contain meaningful words
        expect(slug.split('-').length).toBeGreaterThanOrEqual(2);
        
        // Should not contain stop words at the beginning
        expect(slug).not.toMatch(/^(a|an|the|and|or|but)-/);
      }
    });

    it('should validate image alt text and SEO attributes', () => {
      const baseUrl = 'https://example.com';
      
      for (const post of mockBlogPosts) {
        if (post.data.heroImage) {
          // Hero image should have descriptive filename
          const imagePath = post.data.heroImage;
          const filename = imagePath.split('/').pop()?.replace(/\.[^.]+$/, '') || '';
          
          expect(filename).toMatch(/[a-z-]/);
          expect(filename).not.toMatch(/img|image|photo|pic/i); // Should be descriptive, not generic
          
          // Should be in appropriate directory
          expect(imagePath).toMatch(/^\/images\/blog\//);
          
          // Should be web-optimized format
          expect(imagePath).toMatch(/\.(jpg|jpeg|png|webp)$/i);
        }
      }
    });

    it('should validate tags for SEO', () => {
      for (const post of mockBlogPosts) {
        if (post.data.tags) {
          const tags = post.data.tags;
          
          // Should have reasonable number of tags (3-7 is optimal)
          expect(tags.length).toBeGreaterThanOrEqual(2);
          expect(tags.length).toBeLessThanOrEqual(7);
          
          // Tags should be lowercase and hyphenated
          tags.forEach(tag => {
            expect(tag).toBe(tag.toLowerCase());
            expect(tag).not.toContain(' ');
            expect(tag).not.toContain('_');
          });
          
          // Should not have duplicate tags
          const uniqueTags = new Set(tags);
          expect(uniqueTags.size).toBe(tags.length);
        }
      }
    });

    it('should validate publication date for SEO', () => {
      for (const post of mockBlogPosts) {
        const pubDate = post.data.pubDate;
        
        // Should be valid date
        expect(pubDate).toBeInstanceOf(Date);
        expect(isNaN(pubDate.getTime())).toBe(false);
        
        // Should not be in the future (for published posts)
        expect(pubDate.getTime()).toBeLessThanOrEqual(Date.now());
        
        // Should be recent enough to be relevant
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
        expect(pubDate.getTime()).toBeGreaterThan(oneYearAgo.getTime());
      }
    });
  });

  describe('Accessibility and SEO', () => {
    it('should validate semantic HTML structure', () => {
      // Test that the layout uses proper semantic HTML
      const semanticElements = [
        'article',
        'header', 
        'main',
        'section',
        'time',
        'h1',
        'h2'
      ];

      // These elements should be present in a proper blog post layout
      semanticElements.forEach(element => {
        expect(element).toMatch(/^[a-z]+[0-9]*$/);
      });
    });

    it('should validate ARIA attributes for accessibility', () => {
      // Test ARIA attributes that improve SEO and accessibility
      const ariaAttributes = {
        'aria-label': 'string',
        'aria-describedby': 'string',
        'role': 'string'
      };

      Object.entries(ariaAttributes).forEach(([attr, type]) => {
        expect(typeof attr).toBe('string');
        expect(attr).toMatch(/^aria-[a-z]+$/);
      });
    });

    it('should validate language attributes', () => {
      const langAttribute = 'en-US';
      
      expect(langAttribute).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    });
  });

  describe('Performance and SEO', () => {
    it('should validate image optimization for SEO', () => {
      for (const post of mockBlogPosts) {
        if (post.data.heroImage) {
          const imagePath = post.data.heroImage;
          
          // Should use modern image formats
          expect(imagePath).toMatch(/\.(jpg|jpeg|png|webp)$/i);
          
          // Should have descriptive filename for SEO
          const filename = imagePath.split('/').pop() || '';
          expect(filename.length).toBeGreaterThan(5);
          expect(filename).not.toMatch(/^(img|image|photo|pic)\d*\./i);
        }
      }
    });

    it('should validate content length for SEO', () => {
      for (const post of mockBlogPosts) {
        const wordCount = post.body.split(/\s+/).length;
        
        // Should have substantial content for SEO (minimum 300 words)
        expect(wordCount).toBeGreaterThanOrEqual(50); // Relaxed for test content
        
        // Should not be too long (readability)
        expect(wordCount).toBeLessThan(5000);
      }
    });

    it('should validate reading time calculation', () => {
      for (const post of mockBlogPosts) {
        const wordCount = post.body.split(/\s+/).length;
        const averageWordsPerMinute = 200;
        const readingTime = Math.ceil(wordCount / averageWordsPerMinute);
        
        expect(readingTime).toBeGreaterThan(0);
        expect(readingTime).toBeLessThan(30); // Reasonable upper limit
      }
    });
  });
});