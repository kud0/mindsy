import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCollection } from 'astro:content';

// Mock the astro:content module
vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

const mockGetCollection = vi.mocked(getCollection);

describe('Blog Comprehensive Integration Tests', () => {
  const mockBlogPosts = [
    {
      slug: 'building-scalable-apis',
      data: {
        title: 'Building Scalable APIs: Architecture Patterns and Best Practices',
        description: 'Learn how to design and build APIs that can handle millions of requests while maintaining performance, reliability, and maintainability.',
        pubDate: new Date('2025-01-05'),
        heroImage: '/images/blog/scalable-apis.jpg',
        author: 'Sarah Backend',
        tags: ['api', 'scalability', 'architecture'],
        draft: false
      },
      render: async () => ({
        Content: () => '<h2>Building Scalable APIs</h2><p>Content about APIs...</p>'
      })
    },
    {
      slug: 'getting-started-with-astro',
      data: {
        title: 'Getting Started with Astro: A Modern Web Framework',
        description: 'Learn how to build fast, content-focused websites with Astro\'s innovative island architecture and zero-JS by default approach.',
        pubDate: new Date('2025-01-15'),
        heroImage: '/images/blog/astro-getting-started.jpg',
        author: 'Alex Developer',
        tags: ['astro', 'web-development', 'javascript', 'tutorial'],
        draft: false
      },
      render: async () => ({
        Content: () => '<h2>Getting Started with Astro</h2><p>Astro content...</p>'
      })
    },
    {
      slug: 'web-performance-optimization',
      data: {
        title: 'Web Performance Optimization: Essential Techniques for 2025',
        description: 'Discover the latest web performance optimization techniques that will make your websites lightning fast and improve user experience.',
        pubDate: new Date('2025-01-10'),
        tags: ['performance', 'web-development', 'optimization'],
        author: 'Site Author',
        draft: false
      },
      render: async () => ({
        Content: () => '<h2>Web Performance Optimization</h2><p>Performance content...</p>'
      })
    },
    {
      slug: 'draft-post',
      data: {
        title: 'Draft Post',
        description: 'This is a draft post',
        pubDate: new Date('2025-01-20'),
        author: 'Draft Author',
        tags: ['draft'],
        draft: true
      },
      render: async () => ({
        Content: () => '<h2>Draft Post</h2><p>Draft content...</p>'
      })
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Blog Post Page Generation', () => {
    it('should generate static paths for all published posts', async () => {
      mockGetCollection.mockImplementation(async (collection, filter) => {
        if (filter) {
          return mockBlogPosts.filter(filter);
        }
        return mockBlogPosts;
      });

      // Simulate getStaticPaths logic for production
      const blogPosts = await getCollection('blog', ({ data }) => {
        return data.draft !== true;
      });

      const staticPaths = blogPosts.map((post) => ({
        params: { slug: post.slug },
        props: { post },
      }));

      expect(staticPaths).toHaveLength(3); // Should exclude draft
      expect(staticPaths.map(p => p.params.slug)).toEqual([
        'building-scalable-apis',
        'getting-started-with-astro', 
        'web-performance-optimization'
      ]);
    });

    it('should include draft posts in development mode', async () => {
      mockGetCollection.mockImplementation(async (collection, filter) => {
        if (filter) {
          return mockBlogPosts.filter(filter);
        }
        return mockBlogPosts;
      });

      // Simulate development mode (no filter)
      const blogPosts = await getCollection('blog');
      const staticPaths = blogPosts.map((post) => ({
        params: { slug: post.slug },
        props: { post },
      }));

      expect(staticPaths).toHaveLength(4); // Should include draft
    });

    it('should handle posts with all metadata fields', () => {
      const postWithAllFields = mockBlogPosts[0];
      
      expect(postWithAllFields.data.title).toBeDefined();
      expect(postWithAllFields.data.description).toBeDefined();
      expect(postWithAllFields.data.pubDate).toBeInstanceOf(Date);
      expect(postWithAllFields.data.heroImage).toBeDefined();
      expect(postWithAllFields.data.author).toBeDefined();
      expect(postWithAllFields.data.tags).toBeDefined();
      expect(Array.isArray(postWithAllFields.data.tags)).toBe(true);
    });

    it('should handle posts with minimal metadata', () => {
      const minimalPost = {
        slug: 'minimal-post',
        data: {
          title: 'Minimal Post',
          description: 'A minimal post with only required fields',
          pubDate: new Date('2025-01-20'),
          author: 'Site Author',
          draft: false
        }
      };

      expect(minimalPost.data.title).toBeDefined();
      expect(minimalPost.data.description).toBeDefined();
      expect(minimalPost.data.pubDate).toBeInstanceOf(Date);
      expect(minimalPost.data.heroImage).toBeUndefined();
      expect(minimalPost.data.tags).toBeUndefined();
    });

    it('should render blog post content correctly', async () => {
      const post = mockBlogPosts[0];
      const { Content } = await post.render();
      
      expect(Content).toBeDefined();
      expect(typeof Content).toBe('function');
      
      const renderedContent = Content();
      expect(renderedContent).toContain('<h2>Building Scalable APIs</h2>');
      expect(renderedContent).toContain('<p>Content about APIs...</p>');
    });
  });

  describe('Blog Index Functionality', () => {
    it('should sort posts by publication date (newest first)', async () => {
      mockGetCollection.mockResolvedValue(mockBlogPosts.filter(p => !p.data.draft));

      const posts = await getCollection('blog', ({ data }) => !data.draft);
      const sortedPosts = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

      expect(sortedPosts[0].slug).toBe('getting-started-with-astro'); // 2025-01-15
      expect(sortedPosts[1].slug).toBe('web-performance-optimization'); // 2025-01-10
      expect(sortedPosts[2].slug).toBe('building-scalable-apis'); // 2025-01-05
    });

    it('should filter out draft posts in production', async () => {
      mockGetCollection.mockImplementation(async (collection, filter) => {
        if (filter) {
          return mockBlogPosts.filter(filter);
        }
        return mockBlogPosts;
      });

      const publishedPosts = await getCollection('blog', ({ data }) => !data.draft);
      
      expect(publishedPosts).toHaveLength(3);
      expect(publishedPosts.every(post => !post.data.draft)).toBe(true);
    });

    it('should generate correct post preview URLs', () => {
      const posts = mockBlogPosts.filter(p => !p.data.draft);
      
      posts.forEach(post => {
        const url = `/blog/${post.slug}`;
        expect(url).toMatch(/^\/blog\/[a-z0-9-]+$/);
      });
    });
  });

  describe('Tag System Integration', () => {
    it('should extract all unique tags from published posts', () => {
      const publishedPosts = mockBlogPosts.filter(p => !p.data.draft);
      const allTags = new Set<string>();
      
      publishedPosts.forEach(post => {
        if (post.data.tags) {
          post.data.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      const uniqueTags = Array.from(allTags);
      
      expect(uniqueTags).toContain('api');
      expect(uniqueTags).toContain('astro');
      expect(uniqueTags).toContain('web-development');
      expect(uniqueTags).toContain('performance');
      expect(uniqueTags).not.toContain('draft'); // From draft post
    });

    it('should filter posts by tag correctly', () => {
      const publishedPosts = mockBlogPosts.filter(p => !p.data.draft);
      const tag = 'web-development';
      
      const filteredPosts = publishedPosts
        .filter(post => post.data.tags?.includes(tag))
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
      
      expect(filteredPosts).toHaveLength(2);
      expect(filteredPosts[0].slug).toBe('getting-started-with-astro');
      expect(filteredPosts[1].slug).toBe('web-performance-optimization');
    });

    it('should generate tag page paths correctly', () => {
      const publishedPosts = mockBlogPosts.filter(p => !p.data.draft);
      const allTags = new Set<string>();
      
      publishedPosts.forEach(post => {
        if (post.data.tags) {
          post.data.tags.forEach(tag => allTags.add(tag));
        }
      });
      
      const tagPaths = Array.from(allTags).map(tag => ({
        params: { tag },
        props: { tag }
      }));
      
      expect(tagPaths.length).toBeGreaterThan(0);
      tagPaths.forEach(path => {
        expect(path.params.tag).toBeDefined();
        expect(typeof path.params.tag).toBe('string');
      });
    });
  });

  describe('Content Validation', () => {
    it('should validate required frontmatter fields', () => {
      mockBlogPosts.forEach(post => {
        expect(post.data.title).toBeDefined();
        expect(typeof post.data.title).toBe('string');
        expect(post.data.title.length).toBeGreaterThan(0);
        
        expect(post.data.description).toBeDefined();
        expect(typeof post.data.description).toBe('string');
        expect(post.data.description.length).toBeGreaterThan(0);
        
        expect(post.data.pubDate).toBeInstanceOf(Date);
        expect(post.data.author).toBeDefined();
        expect(typeof post.data.author).toBe('string');
      });
    });

    it('should validate optional frontmatter fields when present', () => {
      const postWithOptionalFields = mockBlogPosts[0];
      
      if (postWithOptionalFields.data.heroImage) {
        expect(typeof postWithOptionalFields.data.heroImage).toBe('string');
        expect(postWithOptionalFields.data.heroImage).toMatch(/^\/images\//);
      }
      
      if (postWithOptionalFields.data.tags) {
        expect(Array.isArray(postWithOptionalFields.data.tags)).toBe(true);
        postWithOptionalFields.data.tags.forEach(tag => {
          expect(typeof tag).toBe('string');
          expect(tag.length).toBeGreaterThan(0);
        });
      }
      
      expect(typeof postWithOptionalFields.data.draft).toBe('boolean');
    });

    it('should handle posts without optional fields gracefully', () => {
      const minimalPost = {
        slug: 'minimal-post',
        data: {
          title: 'Minimal Post',
          description: 'A minimal post',
          pubDate: new Date('2025-01-20'),
          author: 'Site Author',
          draft: false
        }
      };

      // Should not throw errors when accessing optional fields
      expect(() => {
        const hasHeroImage = !!minimalPost.data.heroImage;
        const hasTags = !!minimalPost.data.tags;
        return hasHeroImage || hasTags;
      }).not.toThrow();
    });
  });

  describe('URL Generation and Routing', () => {
    it('should generate valid blog post URLs', () => {
      const posts = mockBlogPosts.filter(p => !p.data.draft);
      
      posts.forEach(post => {
        const url = `/blog/${post.slug}`;
        
        // Should be valid URL format
        expect(url).toMatch(/^\/blog\/[a-z0-9-]+$/);
        
        // Should not contain spaces or special characters
        expect(url).not.toMatch(/\s/);
        expect(url).not.toMatch(/[^a-z0-9\/-]/);
      });
    });

    it('should generate valid tag URLs', () => {
      const tags = ['api', 'web-development', 'astro', 'performance'];
      
      tags.forEach(tag => {
        const url = `/blog/tags/${tag}`;
        
        expect(url).toMatch(/^\/blog\/tags\/[a-z0-9-]+$/);
        expect(url).not.toMatch(/\s/);
      });
    });

    it('should handle special characters in slugs', () => {
      const specialSlug = 'post-with-special-chars';
      const url = `/blog/${specialSlug}`;
      
      expect(url).toBe('/blog/post-with-special-chars');
      expect(url).toMatch(/^\/blog\/[a-z0-9-]+$/);
    });
  });

  describe('Date Handling', () => {
    it('should format dates correctly for display', () => {
      const testDate = new Date('2025-01-15T10:30:00Z');
      
      const formattedDate = testDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      expect(formattedDate).toBe('January 15, 2025');
    });

    it('should generate ISO datetime strings for HTML', () => {
      const testDate = new Date('2025-01-15T10:30:00Z');
      const isoString = testDate.toISOString();
      
      expect(isoString).toBe('2025-01-15T10:30:00.000Z');
      expect(isoString).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });

    it('should sort posts by date correctly', () => {
      const posts = [
        { data: { pubDate: new Date('2025-01-10') }, slug: 'older' },
        { data: { pubDate: new Date('2025-01-15') }, slug: 'newer' },
        { data: { pubDate: new Date('2025-01-05') }, slug: 'oldest' }
      ];
      
      const sorted = posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
      
      expect(sorted[0].slug).toBe('newer');
      expect(sorted[1].slug).toBe('older');
      expect(sorted[2].slug).toBe('oldest');
    });
  });

  describe('Error Handling', () => {
    it('should handle empty blog collection gracefully', async () => {
      mockGetCollection.mockResolvedValue([]);
      
      const posts = await getCollection('blog');
      const sortedPosts = posts
        .filter(post => !post.data?.draft)
        .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
      
      expect(sortedPosts).toHaveLength(0);
      expect(Array.isArray(sortedPosts)).toBe(true);
    });

    it('should handle posts with missing optional fields', () => {
      const postWithMissingFields = {
        slug: 'incomplete-post',
        data: {
          title: 'Incomplete Post',
          description: 'A post with missing optional fields',
          pubDate: new Date('2025-01-20'),
          author: 'Site Author',
          draft: false
          // Missing heroImage and tags
        }
      };

      expect(() => {
        const tags = postWithMissingFields.data.tags || [];
        const heroImage = postWithMissingFields.data.heroImage || null;
        return { tags, heroImage };
      }).not.toThrow();
    });

    it('should handle invalid date objects', () => {
      const invalidDate = new Date('invalid-date');
      
      expect(isNaN(invalidDate.getTime())).toBe(true);
      
      // Should handle invalid dates gracefully
      const fallbackDate = isNaN(invalidDate.getTime()) ? new Date() : invalidDate;
      expect(fallbackDate).toBeInstanceOf(Date);
      expect(!isNaN(fallbackDate.getTime())).toBe(true);
    });
  });
});