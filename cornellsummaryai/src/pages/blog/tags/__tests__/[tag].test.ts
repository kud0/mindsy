import { describe, it, expect } from 'vitest';

describe('Tag Page Logic', () => {
  const mockPosts = [
    {
      slug: 'post-1',
      data: {
        title: 'Post 1',
        description: 'Description 1',
        pubDate: new Date('2025-01-15'),
        tags: ['astro', 'web-development'],
        draft: false
      }
    },
    {
      slug: 'post-2', 
      data: {
        title: 'Post 2',
        description: 'Description 2',
        pubDate: new Date('2025-01-10'),
        tags: ['javascript', 'web-development'],
        draft: false
      }
    },
    {
      slug: 'draft-post',
      data: {
        title: 'Draft Post',
        description: 'Draft Description',
        pubDate: new Date('2025-01-20'),
        tags: ['draft-tag'],
        draft: true
      }
    }
  ];

  it('should extract unique tags from published posts', () => {
    // Simulate the logic from getStaticPaths
    const publishedPosts = mockPosts.filter((post) => !post.data.draft);
    const allTags = new Set<string>();
    
    publishedPosts.forEach((post) => {
      if (post.data.tags) {
        post.data.tags.forEach((tag) => allTags.add(tag));
      }
    });
    
    const uniqueTags = Array.from(allTags);
    
    // Should include tags from published posts only
    expect(uniqueTags).toContain('astro');
    expect(uniqueTags).toContain('web-development');
    expect(uniqueTags).toContain('javascript');
    
    // Should not include tags from draft posts
    expect(uniqueTags).not.toContain('draft-tag');
    
    // Should have unique tags only
    expect(uniqueTags.length).toBe(3);
  });

  it('should filter posts correctly by tag', () => {
    const tag = 'web-development';
    const filteredPosts = mockPosts
      .filter(post => !post.data.draft && post.data.tags?.includes(tag))
      .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
    
    expect(filteredPosts).toHaveLength(2);
    expect(filteredPosts[0].slug).toBe('post-1'); // Newer post first
    expect(filteredPosts[1].slug).toBe('post-2');
  });

  it('should handle posts without tags', () => {
    const postsWithoutTags = [
      ...mockPosts,
      {
        slug: 'no-tags-post',
        data: {
          title: 'No Tags Post',
          description: 'No tags description',
          pubDate: new Date('2025-01-05'),
          draft: false
          // No tags property
        }
      }
    ];
    
    // Simulate the logic from getStaticPaths
    const publishedPosts = postsWithoutTags.filter((post) => !post.data.draft);
    const allTags = new Set<string>();
    
    publishedPosts.forEach((post) => {
      if (post.data.tags) {
        post.data.tags.forEach((tag) => allTags.add(tag));
      }
    });
    
    const uniqueTags = Array.from(allTags);
    
    // Should still work with posts that have no tags
    expect(uniqueTags.length).toBeGreaterThan(0);
    expect(uniqueTags).toEqual(['astro', 'web-development', 'javascript']);
  });

  it('should generate correct tag display format', () => {
    const tag = 'web-development';
    const displayTag = tag.charAt(0).toUpperCase() + tag.slice(1);
    
    expect(displayTag).toBe('Web-development');
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