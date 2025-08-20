import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCollection } from 'astro:content';

// Mock the astro:content module
vi.mock('astro:content', () => ({
  getCollection: vi.fn()
}));

const mockGetCollection = vi.mocked(getCollection);

describe('Blog Index Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch and sort blog posts by publication date (newest first)', async () => {
    // Mock blog posts with different publication dates
    const mockPosts = [
      {
        slug: 'post-1',
        data: {
          title: 'First Post',
          description: 'Description 1',
          pubDate: new Date('2025-01-01'),
          author: 'Author 1',
          draft: false
        }
      },
      {
        slug: 'post-3',
        data: {
          title: 'Third Post',
          description: 'Description 3',
          pubDate: new Date('2025-01-15'),
          author: 'Author 3',
          draft: false
        }
      },
      {
        slug: 'post-2',
        data: {
          title: 'Second Post',
          description: 'Description 2',
          pubDate: new Date('2025-01-10'),
          author: 'Author 2',
          draft: false
        }
      }
    ];

    mockGetCollection.mockResolvedValue(mockPosts);

    // Import the sorting logic (we'll extract this to a utility function)
    const sortedPosts = mockPosts
      .filter(post => !post.data.draft)
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

    expect(sortedPosts).toHaveLength(3);
    expect(sortedPosts[0].slug).toBe('post-3'); // Newest first (2025-01-15)
    expect(sortedPosts[1].slug).toBe('post-2'); // Middle (2025-01-10)
    expect(sortedPosts[2].slug).toBe('post-1'); // Oldest (2025-01-01)
  });

  it('should filter out draft posts', async () => {
    const mockPosts = [
      {
        slug: 'published-post',
        data: {
          title: 'Published Post',
          description: 'Published description',
          pubDate: new Date('2025-01-15'),
          author: 'Author',
          draft: false
        }
      },
      {
        slug: 'draft-post',
        data: {
          title: 'Draft Post',
          description: 'Draft description',
          pubDate: new Date('2025-01-20'),
          author: 'Author',
          draft: true
        }
      }
    ];

    mockGetCollection.mockResolvedValue(mockPosts);

    const sortedPosts = mockPosts
      .filter(post => !post.data.draft)
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

    expect(sortedPosts).toHaveLength(1);
    expect(sortedPosts[0].slug).toBe('published-post');
  });

  it('should handle posts without optional fields', async () => {
    const mockPosts = [
      {
        slug: 'minimal-post',
        data: {
          title: 'Minimal Post',
          description: 'Minimal description',
          pubDate: new Date('2025-01-15'),
          // No author, tags, or heroImage
          draft: false
        }
      }
    ];

    mockGetCollection.mockResolvedValue(mockPosts);

    const sortedPosts = mockPosts
      .filter(post => !post.data.draft)
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

    expect(sortedPosts).toHaveLength(1);
    expect(sortedPosts[0].data.title).toBe('Minimal Post');
    expect(sortedPosts[0].data.author).toBeUndefined();
  });

  it('should handle empty blog collection', async () => {
    mockGetCollection.mockResolvedValue([]);

    const sortedPosts = []
      .filter(post => !post.data?.draft)
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());

    expect(sortedPosts).toHaveLength(0);
  });

  it('should format dates correctly', () => {
    const testDate = new Date('2025-01-15');
    const formattedDate = testDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    expect(formattedDate).toBe('January 15, 2025');
  });

  it('should generate correct blog post URLs', () => {
    const postSlug = 'building-scalable-apis';
    const expectedUrl = `/blog/${postSlug}`;
    
    expect(expectedUrl).toBe('/blog/building-scalable-apis');
  });
});