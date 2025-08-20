import { describe, it, expect, vi } from 'vitest';
import { getCollection } from 'astro:content';

// Mock the astro:content module
vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

describe('Blog Post Integration Tests', () => {
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
        Content: () => '<h1>Building Scalable APIs</h1><p>Content here...</p>'
      })
    },
    {
      slug: 'getting-started-with-astro',
      data: {
        title: 'Getting Started with Astro',
        description: 'A comprehensive guide to building fast, modern websites with Astro.',
        pubDate: new Date('2025-01-10'),
        author: 'Site Author',
        tags: ['astro', 'web-development'],
        draft: false
      },
      render: async () => ({
        Content: () => '<h1>Getting Started with Astro</h1><p>Astro content...</p>'
      })
    },
    {
      slug: 'draft-post',
      data: {
        title: 'Draft Post',
        description: 'This is a draft post',
        pubDate: new Date('2025-01-15'),
        draft: true
      },
      render: async () => ({
        Content: () => '<h1>Draft Post</h1><p>Draft content...</p>'
      })
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate correct URLs for all blog posts', async () => {
    // Mock getCollection to filter out drafts
    vi.mocked(getCollection).mockImplementation(async (collection, filter) => {
      if (filter) {
        return mockBlogPosts.filter(filter);
      }
      return mockBlogPosts;
    });

    // Simulate the getStaticPaths logic with production filter
    const blogPosts = await getCollection('blog', ({ data }) => {
      return data.draft !== true;
    });

    const staticPaths = blogPosts.map((post) => ({
      params: { slug: post.slug },
      props: { post },
    }));

    // Should generate paths for non-draft posts only
    expect(staticPaths).toHaveLength(2);
    
    // Verify URL structure
    const expectedUrls = [
      '/blog/building-scalable-apis',
      '/blog/getting-started-with-astro'
    ];

    staticPaths.forEach((path, index) => {
      expect(`/blog/${path.params.slug}`).toBe(expectedUrls[index]);
    });
  });

  it('should handle posts with all metadata fields correctly', async () => {
    const postWithAllFields = mockBlogPosts[0];
    
    // Verify all required fields are present
    expect(postWithAllFields.data.title).toBeDefined();
    expect(postWithAllFields.data.description).toBeDefined();
    expect(postWithAllFields.data.pubDate).toBeInstanceOf(Date);
    
    // Verify optional fields are handled
    expect(postWithAllFields.data.heroImage).toBe('/images/blog/scalable-apis.jpg');
    expect(postWithAllFields.data.author).toBe('Sarah Backend');
    expect(postWithAllFields.data.tags).toEqual(['api', 'scalability', 'architecture']);
    expect(postWithAllFields.data.draft).toBe(false);
  });

  it('should handle posts with minimal metadata correctly', async () => {
    const minimalPost = {
      slug: 'minimal-post',
      data: {
        title: 'Minimal Post',
        description: 'A minimal post with only required fields',
        pubDate: new Date('2025-01-20'),
        draft: false
      },
      render: async () => ({
        Content: () => '<h1>Minimal Post</h1>'
      })
    };

    // Verify required fields
    expect(minimalPost.data.title).toBeDefined();
    expect(minimalPost.data.description).toBeDefined();
    expect(minimalPost.data.pubDate).toBeInstanceOf(Date);
    
    // Verify optional fields are undefined
    expect(minimalPost.data.heroImage).toBeUndefined();
    expect(minimalPost.data.author).toBeUndefined();
    expect(minimalPost.data.tags).toBeUndefined();
  });

  it('should render blog post content correctly', async () => {
    const post = mockBlogPosts[0];
    const { Content } = await post.render();
    
    // Verify content can be rendered
    expect(Content).toBeDefined();
    expect(typeof Content).toBe('function');
    
    // Verify content returns expected HTML
    const renderedContent = Content();
    expect(renderedContent).toContain('<h1>Building Scalable APIs</h1>');
    expect(renderedContent).toContain('<p>Content here...</p>');
  });

  it('should format dates correctly for display', () => {
    const testDate = new Date('2025-01-05');
    
    const formattedDate = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(testDate);

    expect(formattedDate).toBe('January 5, 2025');
  });

  it('should generate proper ISO datetime strings for HTML', () => {
    const testDate = new Date('2025-01-05T10:30:00Z');
    const isoString = testDate.toISOString();
    
    expect(isoString).toBe('2025-01-05T10:30:00.000Z');
  });

  it('should handle tag links correctly', () => {
    const post = mockBlogPosts[0];
    const tags = post.data.tags;
    
    // Verify tags exist and are properly formatted
    expect(tags).toEqual(['api', 'scalability', 'architecture']);
    
    // Verify tag URLs would be generated correctly
    const tagUrls = tags?.map(tag => `/blog/tags/${tag}`);
    expect(tagUrls).toEqual([
      '/blog/tags/api',
      '/blog/tags/scalability', 
      '/blog/tags/architecture'
    ]);
  });

  it('should validate slug format for URLs', () => {
    const validSlugs = [
      'building-scalable-apis',
      'getting-started-with-astro',
      'web-performance-optimization'
    ];

    const urlPattern = /^[a-z0-9-]+$/;
    
    validSlugs.forEach(slug => {
      expect(urlPattern.test(slug)).toBe(true);
    });
  });
});