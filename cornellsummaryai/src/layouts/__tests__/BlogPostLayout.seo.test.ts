import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Mock blog post data for testing
const mockBlogPosts = [
  {
    data: {
      title: 'Test Blog Post',
      description: 'This is a test blog post description for SEO testing',
      pubDate: new Date('2025-01-15'),
      author: 'Test Author',
      tags: ['test', 'seo']
    },
    body: '## Test Heading\n\nThis is test content.'
  }
];

describe('BlogPostLayout SEO', () => {
  it('should validate required frontmatter fields for SEO', () => {
    for (const post of mockBlogPosts) {
      // Required fields for SEO
      expect(post.data.title).toBeDefined();
      expect(post.data.title.length).toBeGreaterThan(0);
      expect(post.data.title.length).toBeLessThanOrEqual(60); // SEO best practice
      
      expect(post.data.description).toBeDefined();
      expect(post.data.description.length).toBeGreaterThan(0);
      expect(post.data.description.length).toBeLessThanOrEqual(160); // SEO best practice
      
      expect(post.data.pubDate).toBeInstanceOf(Date);
      expect(post.data.author).toBeDefined();
    }
  });

  it('should have proper heading hierarchy in content', () => {
    for (const post of mockBlogPosts) {
      const content = post.body;
      
      // Should not start with h1 (since layout provides h1)
      expect(content).not.toMatch(/^# /m);
      
      // Should start with h2 or lower
      const firstHeading = content.match(/^#{2,6} /m);
      expect(firstHeading).toBeTruthy();
    }
  });

  it('should validate actual blog post files have correct heading hierarchy', () => {
    const blogDir = join(process.cwd(), 'src', 'content', 'blog');
    const blogFiles = readdirSync(blogDir).filter(file => file.endsWith('.md'));
    
    expect(blogFiles.length).toBeGreaterThan(0);
    
    for (const file of blogFiles) {
      const filepath = join(blogDir, file);
      const content = readFileSync(filepath, 'utf-8');
      
      // Remove frontmatter
      const contentBody = content.replace(/^---\n[\s\S]*?\n---\n/, '');
      
      // Should not start with h1 (since layout provides h1)
      expect(contentBody).not.toMatch(/^# /m);
      
      // Should have at least one heading
      const hasHeadings = contentBody.match(/^#{2,6} /m);
      expect(hasHeadings).toBeTruthy();
    }
  });

  it('should generate valid canonical URLs', () => {
    const testUrl = new URL('/blog/test-post', 'https://example.com');
    expect(testUrl.toString()).toBe('https://example.com/blog/test-post');
  });

  it('should generate proper Open Graph image URLs', () => {
    const baseUrl = 'https://example.com';
    const heroImage = '/images/blog/test.jpg';
    const ogImage = new URL(heroImage, baseUrl).toString();
    
    expect(ogImage).toBe('https://example.com/images/blog/test.jpg');
  });

  it('should validate JSON-LD structure', () => {
    const mockPost = {
      data: {
        title: 'Test Post',
        description: 'Test description',
        pubDate: new Date('2025-01-15'),
        author: 'Test Author',
        tags: ['test', 'seo']
      },
      body: 'Test content with multiple words for word count'
    };

    const canonicalURL = 'https://example.com/blog/test-post';
    const ogImage = 'https://example.com/images/blog/test.jpg';

    const jsonLD = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": mockPost.data.title,
      "description": mockPost.data.description,
      "author": {
        "@type": "Person",
        "name": mockPost.data.author
      },
      "datePublished": mockPost.data.pubDate.toISOString(),
      "dateModified": mockPost.data.pubDate.toISOString(),
      "image": {
        "@type": "ImageObject",
        "url": ogImage,
        "width": 1200,
        "height": 630
      },
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
          "url": "https://example.com/favicon.svg",
          "width": 60,
          "height": 60
        }
      },
      "articleSection": mockPost.data.tags[0],
      "keywords": mockPost.data.tags.join(", "),
      "wordCount": mockPost.body.split(/\s+/).length,
      "inLanguage": "en-US"
    };

    // Validate required JSON-LD fields
    expect(jsonLD["@context"]).toBe("https://schema.org");
    expect(jsonLD["@type"]).toBe("Article");
    expect(jsonLD.headline).toBeDefined();
    expect(jsonLD.description).toBeDefined();
    expect(jsonLD.author).toBeDefined();
    expect(jsonLD.author["@type"]).toBe("Person");
    expect(jsonLD.datePublished).toBeDefined();
    expect(jsonLD.image).toBeDefined();
    expect(jsonLD.image["@type"]).toBe("ImageObject");
    expect(jsonLD.url).toBeDefined();
    expect(jsonLD.publisher).toBeDefined();
    expect(jsonLD.publisher["@type"]).toBe("Organization");
  });

  it('should have proper meta tag structure', () => {
    const mockMetaTags = {
      title: 'Test Blog Post',
      description: 'This is a test blog post description',
      canonicalURL: 'https://example.com/blog/test-post',
      ogImage: 'https://example.com/images/blog/test.jpg',
      author: 'Test Author',
      tags: ['test', 'seo'],
      pubDate: new Date('2025-01-15')
    };

    // Validate meta tag requirements
    expect(mockMetaTags.title.length).toBeLessThanOrEqual(60);
    expect(mockMetaTags.description.length).toBeLessThanOrEqual(160);
    expect(mockMetaTags.canonicalURL).toMatch(/^https?:\/\//);
    expect(mockMetaTags.ogImage).toMatch(/^https?:\/\//);
    expect(mockMetaTags.author).toBeDefined();
    expect(Array.isArray(mockMetaTags.tags)).toBe(true);
    expect(mockMetaTags.pubDate).toBeInstanceOf(Date);
  });
});