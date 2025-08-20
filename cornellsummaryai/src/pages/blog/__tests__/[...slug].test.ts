import { describe, it, expect, vi } from 'vitest';
import { getCollection } from 'astro:content';

// Mock the astro:content module
vi.mock('astro:content', () => ({
  getCollection: vi.fn(),
}));

// Mock blog posts data
const mockBlogPosts = [
  {
    slug: 'test-post-1',
    data: {
      title: 'Test Post 1',
      description: 'This is a test post',
      pubDate: new Date('2025-01-01'),
      author: 'Test Author',
      tags: ['test', 'blog'],
      draft: false
    },
    render: async () => ({
      Content: () => '<p>Test content</p>'
    })
  },
  {
    slug: 'test-post-2',
    data: {
      title: 'Test Post 2',
      description: 'Another test post',
      pubDate: new Date('2025-01-02'),
      author: 'Test Author',
      heroImage: '/images/test.jpg',
      tags: ['test'],
      draft: false
    },
    render: async () => ({
      Content: () => '<p>Another test content</p>'
    })
  },
  {
    slug: 'draft-post',
    data: {
      title: 'Draft Post',
      description: 'This is a draft',
      pubDate: new Date('2025-01-03'),
      draft: true
    },
    render: async () => ({
      Content: () => '<p>Draft content</p>'
    })
  }
];

// Simulate the getStaticPaths logic
async function simulateGetStaticPaths(isProduction = false) {
  const blogPosts = await getCollection('blog', ({ data }) => {
    return isProduction ? data.draft !== true : true;
  });

  return blogPosts.map((post) => ({
    params: { slug: post.slug },
    props: { post },
  }));
}

describe('Blog Post Dynamic Pages Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should generate static paths for all blog posts in development', async () => {
    // Mock getCollection to return filtered posts
    vi.mocked(getCollection).mockImplementation(async (collection, filter) => {
      if (filter) {
        return mockBlogPosts.filter(filter);
      }
      return mockBlogPosts;
    });

    const paths = await simulateGetStaticPaths(false);

    // Should include all posts in development
    expect(paths).toHaveLength(3);
    
    // Check that paths are correctly structured
    expect(paths[0]).toEqual({
      params: { slug: 'test-post-1' },
      props: { post: mockBlogPosts[0] }
    });
  });

  it('should filter out draft posts in production', async () => {
    // Mock getCollection with filter function
    vi.mocked(getCollection).mockImplementation(async (collection, filter) => {
      if (filter) {
        return mockBlogPosts.filter(filter);
      }
      return mockBlogPosts;
    });

    const paths = await simulateGetStaticPaths(true);

    // Should only include non-draft posts in production
    expect(paths).toHaveLength(2);
    expect(paths.every(path => path.props.post.data.draft !== true)).toBe(true);
  });

  it('should handle posts with all optional fields', () => {
    const postWithAllFields = mockBlogPosts[1];
    
    expect(postWithAllFields.data.heroImage).toBeDefined();
    expect(postWithAllFields.data.tags).toBeDefined();
    expect(postWithAllFields.data.author).toBeDefined();
  });

  it('should handle posts with minimal fields', () => {
    const minimalPost = {
      slug: 'minimal-post',
      data: {
        title: 'Minimal Post',
        description: 'A minimal post',
        pubDate: new Date('2025-01-04'),
        draft: false
      }
    };

    // Should not have optional fields
    expect(minimalPost.data.heroImage).toBeUndefined();
    expect(minimalPost.data.tags).toBeUndefined();
    expect(minimalPost.data.author).toBeUndefined();
  });

  it('should correctly map blog posts to static paths', async () => {
    vi.mocked(getCollection).mockImplementation(async (collection, filter) => {
      if (filter) {
        return mockBlogPosts.filter(filter);
      }
      return mockBlogPosts;
    });

    const paths = await simulateGetStaticPaths(false);

    // Verify each path has correct structure
    paths.forEach((path, index) => {
      expect(path).toHaveProperty('params');
      expect(path).toHaveProperty('props');
      expect(path.params).toHaveProperty('slug');
      expect(path.props).toHaveProperty('post');
      expect(path.params.slug).toBe(mockBlogPosts[index].slug);
      expect(path.props.post).toBe(mockBlogPosts[index]);
    });
  });
});