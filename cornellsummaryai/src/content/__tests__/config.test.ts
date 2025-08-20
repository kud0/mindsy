import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Define the blog schema directly for testing (mirrors the one in config.ts)
const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.date(),
  heroImage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().default('Site Author'),
  draft: z.boolean().default(false)
});

describe('Blog Collection Schema', () => {

  describe('Valid frontmatter', () => {
    it('should validate minimal required fields', () => {
      const validPost = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(validPost);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe('Test Post');
        expect(result.data.description).toBe('A test blog post');
        expect(result.data.pubDate).toEqual(new Date('2025-01-15'));
        expect(result.data.author).toBe('Site Author'); // Default value
        expect(result.data.draft).toBe(false); // Default value
      }
    });

    it('should validate complete frontmatter with all optional fields', () => {
      const completePost = {
        title: 'Complete Test Post',
        description: 'A complete test blog post with all fields',
        pubDate: new Date('2025-01-15'),
        heroImage: '/images/blog/test-hero.jpg',
        tags: ['astro', 'testing', 'blog'],
        author: 'Test Author',
        draft: true
      };

      const result = blogSchema.safeParse(completePost);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe('Complete Test Post');
        expect(result.data.description).toBe('A complete test blog post with all fields');
        expect(result.data.pubDate).toEqual(new Date('2025-01-15'));
        expect(result.data.heroImage).toBe('/images/blog/test-hero.jpg');
        expect(result.data.tags).toEqual(['astro', 'testing', 'blog']);
        expect(result.data.author).toBe('Test Author');
        expect(result.data.draft).toBe(true);
      }
    });

    it('should handle empty tags array', () => {
      const postWithEmptyTags = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: new Date('2025-01-15'),
        tags: []
      };

      const result = blogSchema.safeParse(postWithEmptyTags);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.tags).toEqual([]);
      }
    });

    it('should apply default values correctly', () => {
      const minimalPost = {
        title: 'Minimal Post',
        description: 'A minimal post',
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(minimalPost);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.author).toBe('Site Author');
        expect(result.data.draft).toBe(false);
        expect(result.data.heroImage).toBeUndefined();
        expect(result.data.tags).toBeUndefined();
      }
    });
  });

  describe('Invalid frontmatter', () => {
    it('should reject missing title', () => {
      const invalidPost = {
        description: 'A test blog post',
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['title'],
            message: 'Required'
          })
        );
      }
    });

    it('should reject missing description', () => {
      const invalidPost = {
        title: 'Test Post',
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['description'],
            message: 'Required'
          })
        );
      }
    });

    it('should reject missing pubDate', () => {
      const invalidPost = {
        title: 'Test Post',
        description: 'A test blog post'
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['pubDate'],
            message: 'Required'
          })
        );
      }
    });

    it('should reject invalid title type', () => {
      const invalidPost = {
        title: 123,
        description: 'A test blog post',
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['title'],
            expected: 'string',
            received: 'number'
          })
        );
      }
    });

    it('should reject invalid description type', () => {
      const invalidPost = {
        title: 'Test Post',
        description: true,
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['description'],
            expected: 'string',
            received: 'boolean'
          })
        );
      }
    });

    it('should reject invalid pubDate type', () => {
      const invalidPost = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: '2025-01-15'
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['pubDate'],
            expected: 'date',
            received: 'string'
          })
        );
      }
    });

    it('should reject invalid heroImage type', () => {
      const invalidPost = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: new Date('2025-01-15'),
        heroImage: 123
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['heroImage'],
            expected: 'string',
            received: 'number'
          })
        );
      }
    });

    it('should reject invalid tags type', () => {
      const invalidPost = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: new Date('2025-01-15'),
        tags: 'not-an-array'
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['tags'],
            expected: 'array',
            received: 'string'
          })
        );
      }
    });

    it('should reject invalid tag items in array', () => {
      const invalidPost = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: new Date('2025-01-15'),
        tags: ['valid-tag', 123, 'another-valid-tag']
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['tags', 1],
            expected: 'string',
            received: 'number'
          })
        );
      }
    });

    it('should reject invalid author type', () => {
      const invalidPost = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: new Date('2025-01-15'),
        author: 123
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['author'],
            expected: 'string',
            received: 'number'
          })
        );
      }
    });

    it('should reject invalid draft type', () => {
      const invalidPost = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: new Date('2025-01-15'),
        draft: 'not-a-boolean'
      };

      const result = blogSchema.safeParse(invalidPost);
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({
            code: 'invalid_type',
            path: ['draft'],
            expected: 'boolean',
            received: 'string'
          })
        );
      }
    });
  });

  describe('Sample blog posts validation', () => {
    it('should validate getting-started-with-astro.md frontmatter', () => {
      const astroPost = {
        title: "Getting Started with Astro: A Modern Web Framework",
        description: "Learn how to build fast, content-focused websites with Astro's innovative island architecture and zero-JS by default approach.",
        pubDate: new Date('2025-01-15'),
        heroImage: "/images/blog/astro-getting-started.jpg",
        tags: ["astro", "web-development", "javascript", "tutorial"],
        author: "Alex Developer",
        draft: false
      };

      const result = blogSchema.safeParse(astroPost);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe("Getting Started with Astro: A Modern Web Framework");
        expect(result.data.description).toBe("Learn how to build fast, content-focused websites with Astro's innovative island architecture and zero-JS by default approach.");
        expect(result.data.pubDate).toEqual(new Date('2025-01-15'));
        expect(result.data.heroImage).toBe("/images/blog/astro-getting-started.jpg");
        expect(result.data.tags).toEqual(["astro", "web-development", "javascript", "tutorial"]);
        expect(result.data.author).toBe("Alex Developer");
        expect(result.data.draft).toBe(false);
      }
    });

    it('should validate web-performance-optimization.md frontmatter', () => {
      const performancePost = {
        title: "Web Performance Optimization: Essential Techniques for 2025",
        description: "Discover the latest web performance optimization techniques that will make your websites lightning fast and improve user experience.",
        pubDate: new Date('2025-01-10'),
        tags: ["performance", "web-development", "optimization"],
        draft: false
      };

      const result = blogSchema.safeParse(performancePost);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe("Web Performance Optimization: Essential Techniques for 2025");
        expect(result.data.description).toBe("Discover the latest web performance optimization techniques that will make your websites lightning fast and improve user experience.");
        expect(result.data.pubDate).toEqual(new Date('2025-01-10'));
        expect(result.data.tags).toEqual(["performance", "web-development", "optimization"]);
        expect(result.data.author).toBe('Site Author'); // Default value
        expect(result.data.draft).toBe(false);
        expect(result.data.heroImage).toBeUndefined(); // Not provided
      }
    });

    it('should validate building-scalable-apis.md frontmatter', () => {
      const apiPost = {
        title: "Building Scalable APIs: Architecture Patterns and Best Practices",
        description: "Learn how to design and build APIs that can handle millions of requests while maintaining performance, reliability, and maintainability.",
        pubDate: new Date('2025-01-05'),
        heroImage: "/images/blog/scalable-apis.jpg",
        author: "Sarah Backend"
      };

      const result = blogSchema.safeParse(apiPost);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe("Building Scalable APIs: Architecture Patterns and Best Practices");
        expect(result.data.description).toBe("Learn how to design and build APIs that can handle millions of requests while maintaining performance, reliability, and maintainability.");
        expect(result.data.pubDate).toEqual(new Date('2025-01-05'));
        expect(result.data.heroImage).toBe("/images/blog/scalable-apis.jpg");
        expect(result.data.author).toBe("Sarah Backend");
        expect(result.data.draft).toBe(false); // Default value
        expect(result.data.tags).toBeUndefined(); // Not provided
      }
    });
  });

  describe('Edge cases', () => {
    it('should handle empty strings for required fields', () => {
      const postWithEmptyStrings = {
        title: '',
        description: '',
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(postWithEmptyStrings);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe('');
        expect(result.data.description).toBe('');
      }
    });

    it('should handle null values for optional fields', () => {
      const postWithNulls = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: new Date('2025-01-15'),
        heroImage: null,
        tags: null,
        author: null,
        draft: null
      };

      const result = blogSchema.safeParse(postWithNulls);
      expect(result.success).toBe(false); // Should fail because null is not the expected type
    });

    it('should handle undefined values for optional fields', () => {
      const postWithUndefined = {
        title: 'Test Post',
        description: 'A test blog post',
        pubDate: new Date('2025-01-15'),
        heroImage: undefined,
        tags: undefined,
        author: undefined,
        draft: undefined
      };

      const result = blogSchema.safeParse(postWithUndefined);
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.heroImage).toBeUndefined();
        expect(result.data.tags).toBeUndefined();
        expect(result.data.author).toBe('Site Author'); // Default applied
        expect(result.data.draft).toBe(false); // Default applied
      }
    });
  });
});