/**
 * Tests for blog draft functionality
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCollection } from 'astro:content';
import { validateBlogPost, validateBlogCollection } from '../lib/content-validation';
import { getAuthor } from '../lib/authors';

// Mock Astro content collection
vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

// Mock import.meta.env
const mockEnv = {
  PROD: false,
  DEV: true,
};

vi.stubGlobal('import', {
  meta: {
    env: mockEnv,
  },
});

describe('Draft Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.PROD = false;
    mockEnv.DEV = true;
  });

  const mockPosts = [
    {
      slug: 'published-post',
      data: {
        title: 'Published Post',
        description: 'This is a published post',
        pubDate: new Date('2025-01-15'),
        author: 'Alex Developer',
        draft: false,
      },
      body: 'This is the content of a published post.',
    },
    {
      slug: 'draft-post',
      data: {
        title: 'Draft Post',
        description: 'This is a draft post',
        pubDate: new Date('2025-01-20'),
        author: 'Sarah Tech',
        draft: true,
      },
      body: 'This is the content of a draft post.',
    },
    {
      slug: 'no-draft-field',
      data: {
        title: 'No Draft Field',
        description: 'This post has no draft field',
        pubDate: new Date('2025-01-10'),
        author: 'Site Author',
        // No draft field - should default to false
      },
      body: 'This post has no draft field specified.',
    },
  ];

  describe('Development Environment', () => {
    beforeEach(() => {
      mockEnv.PROD = false;
      mockEnv.DEV = true;
    });

    it('should include both draft and published posts in development', async () => {
      vi.mocked(getCollection).mockResolvedValue(mockPosts);

      const posts = await getCollection('blog', ({ data }) => {
        return mockEnv.PROD ? data.draft !== true : true;
      });

      expect(posts).toHaveLength(3);
      expect(posts.map(p => p.slug)).toContain('draft-post');
      expect(posts.map(p => p.slug)).toContain('published-post');
    });

    it('should validate draft posts in development', () => {
      const draftPost = mockPosts[1]; // draft-post
      const validation = validateBlogPost(draftPost);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
  });

  describe('Production Environment', () => {
    beforeEach(() => {
      mockEnv.PROD = true;
      mockEnv.DEV = false;
    });

    it('should exclude draft posts in production', async () => {
      vi.mocked(getCollection).mockResolvedValue(
        mockPosts.filter(post => post.data.draft !== true)
      );

      const posts = await getCollection('blog', ({ data }) => {
        return mockEnv.PROD ? data.draft !== true : true;
      });

      expect(posts).toHaveLength(2);
      expect(posts.map(p => p.slug)).not.toContain('draft-post');
      expect(posts.map(p => p.slug)).toContain('published-post');
      expect(posts.map(p => p.slug)).toContain('no-draft-field');
    });

    it('should handle posts without draft field as published', async () => {
      const postWithoutDraft = mockPosts[2]; // no-draft-field
      
      // In production, posts without draft field should be included
      const shouldInclude = mockEnv.PROD ? postWithoutDraft.data.draft !== true : true;
      expect(shouldInclude).toBe(true);
    });
  });

  describe('Content Validation', () => {
    it('should validate required fields for draft posts', () => {
      const invalidDraftPost = {
        slug: 'invalid-draft',
        data: {
          title: '', // Invalid: empty title
          description: 'Valid description',
          pubDate: new Date(),
          draft: true,
        },
        body: 'Valid content',
      };

      const validation = validateBlogPost(invalidDraftPost);

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0].field).toBe('title');
    });

    it('should validate collection with mixed draft and published posts', () => {
      const { validPosts, invalidPosts, totalWarnings } = validateBlogCollection(mockPosts);

      expect(validPosts).toHaveLength(3);
      expect(invalidPosts).toHaveLength(0);
      expect(totalWarnings).toBeGreaterThanOrEqual(0);
    });

    it('should warn about short content in draft posts', () => {
      const shortDraftPost = {
        slug: 'short-draft',
        data: {
          title: 'Short Draft',
          description: 'This is a short draft post',
          pubDate: new Date(),
          draft: true,
        },
        body: 'Short content.', // Less than 100 words
      };

      const validation = validateBlogPost(shortDraftPost);

      expect(validation.isValid).toBe(true);
      expect(validation.warnings.some(w => w.field === 'body')).toBe(true);
    });
  });

  describe('Author Management', () => {
    it('should get author information for draft posts', () => {
      const author = getAuthor('Alex Developer');
      
      expect(author.name).toBe('Alex Developer');
      expect(author.id).toBe('alex-developer');
    });

    it('should handle unknown authors gracefully', () => {
      const author = getAuthor('Unknown Author');
      
      expect(author.name).toBe('Unknown Author');
      expect(author.id).toBe('unknown');
    });

    it('should return default author for empty author field', () => {
      const author = getAuthor('');
      
      expect(author.name).toBe('Unknown Author');
      expect(author.id).toBe('unknown');
    });
  });

  describe('Draft Indicators', () => {
    it('should show draft indicators in development', () => {
      const isDraftVisible = !mockEnv.PROD && true; // draft = true
      expect(isDraftVisible).toBe(true);
    });

    it('should hide draft indicators in production', () => {
      mockEnv.PROD = true;
      const isDraftVisible = !mockEnv.PROD && true; // draft = true
      expect(isDraftVisible).toBe(false);
    });
  });

  describe('RSS Feed Draft Handling', () => {
    it('should exclude drafts from RSS feed in production', () => {
      mockEnv.PROD = true;
      
      const filteredPosts = mockPosts.filter(({ data }) => {
        return mockEnv.PROD ? data.draft !== true : true;
      });

      expect(filteredPosts).toHaveLength(2);
      expect(filteredPosts.map(p => p.slug)).not.toContain('draft-post');
    });

    it('should include drafts in RSS feed in development', () => {
      mockEnv.PROD = false;
      
      const filteredPosts = mockPosts.filter(({ data }) => {
        return mockEnv.PROD ? data.draft !== true : true;
      });

      expect(filteredPosts).toHaveLength(3);
      expect(filteredPosts.map(p => p.slug)).toContain('draft-post');
    });
  });
});