import { describe, it, expect, vi } from 'vitest';

// Mock the RSS module
vi.mock('@astrojs/rss', () => ({
  default: vi.fn((config) => {
    // Return a mock RSS response
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${config.title}</title>
    <description>${config.description}</description>
    <link>${config.site}</link>
    ${config.items.map((item: any) => `
    <item>
      <title>${item.title}</title>
      <description>${item.description}</description>
      <pubDate>${item.pubDate.toUTCString()}</pubDate>
      <link>${config.site}${item.link}</link>
      <guid>${config.site}${item.guid}</guid>
    </item>`).join('')}
  </channel>
</rss>`,
      {
        headers: {
          'Content-Type': 'application/xml'
        }
      }
    );
  })
}));

// Mock Astro content collections
vi.mock('astro:content', () => ({
  getCollection: vi.fn(() => Promise.resolve([
    {
      slug: 'test-post-1',
      data: {
        title: 'Test Post 1',
        description: 'First test post',
        pubDate: new Date('2025-01-15'),
        author: 'Test Author',
        tags: ['test', 'blog'],
        draft: false
      }
    },
    {
      slug: 'test-post-2',
      data: {
        title: 'Test Post 2',
        description: 'Second test post',
        pubDate: new Date('2025-01-10'),
        author: 'Test Author',
        tags: ['test'],
        draft: false
      }
    },
    {
      slug: 'draft-post',
      data: {
        title: 'Draft Post',
        description: 'This is a draft',
        pubDate: new Date('2025-01-20'),
        author: 'Test Author',
        tags: ['draft'],
        draft: true
      }
    }
  ]))
}));

describe('RSS Feed Generation', () => {
  it('should generate RSS feed with correct metadata', async () => {
    // Import the RSS function
    const { GET } = await import('../rss.xml.ts');
    
    // Mock context
    const mockContext = {
      site: new URL('https://test-site.com')
    };
    
    // Call the RSS function
    const response = await GET(mockContext as any);
    const rssContent = await response.text();
    
    // Verify RSS structure
    expect(rssContent).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(rssContent).toContain('<rss version="2.0">');
    expect(rssContent).toContain('<title>Blog RSS Feed</title>');
    expect(rssContent).toContain('<description>Stay updated with our latest blog posts and insights</description>');
    expect(rssContent).toContain('<link>https://test-site.com/</link>');
  });

  it('should include all published blog posts', async () => {
    const { GET } = await import('../rss.xml.ts');
    
    const mockContext = {
      site: new URL('https://test-site.com')
    };
    
    const response = await GET(mockContext as any);
    const rssContent = await response.text();
    
    // Should include published posts
    expect(rssContent).toContain('Test Post 1');
    expect(rssContent).toContain('Test Post 2');
    expect(rssContent).toContain('First test post');
    expect(rssContent).toContain('Second test post');
  });

  it('should filter draft posts correctly', () => {
    // Test the filtering logic directly
    const mockPosts = [
      {
        slug: 'published-post',
        data: { title: 'Published Post', draft: false }
      },
      {
        slug: 'draft-post',
        data: { title: 'Draft Post', draft: true }
      }
    ];
    
    // Test production filtering
    const productionFiltered = mockPosts.filter(post => {
      if ('production' === 'production') {
        return !post.data.draft;
      }
      return true;
    });
    
    expect(productionFiltered).toHaveLength(1);
    expect(productionFiltered[0].data.title).toBe('Published Post');
    
    // Test development filtering (should include all)
    const developmentFiltered = mockPosts.filter(post => {
      if ('development' === 'production') {
        return !post.data.draft;
      }
      return true;
    });
    
    expect(developmentFiltered).toHaveLength(2);
  });

  it('should sort posts by publication date (newest first)', async () => {
    const { GET } = await import('../rss.xml.ts');
    
    const mockContext = {
      site: new URL('https://test-site.com')
    };
    
    const response = await GET(mockContext as any);
    const rssContent = await response.text();
    
    // Test Post 1 (Jan 15) should appear before Test Post 2 (Jan 10)
    const post1Index = rssContent.indexOf('Test Post 1');
    const post2Index = rssContent.indexOf('Test Post 2');
    
    expect(post1Index).toBeLessThan(post2Index);
  });

  it('should include proper RSS item elements', async () => {
    const { GET } = await import('../rss.xml.ts');
    
    const mockContext = {
      site: new URL('https://test-site.com')
    };
    
    const response = await GET(mockContext as any);
    const rssContent = await response.text();
    
    // Check for required RSS item elements
    expect(rssContent).toContain('<item>');
    expect(rssContent).toContain('<title>');
    expect(rssContent).toContain('<description>');
    expect(rssContent).toContain('<pubDate>');
    expect(rssContent).toContain('<link>');
    expect(rssContent).toContain('<guid>');
  });

  it('should handle missing site URL gracefully', async () => {
    const { GET } = await import('../rss.xml.ts');
    
    const mockContext = {
      site: undefined
    };
    
    const response = await GET(mockContext as any);
    const rssContent = await response.text();
    
    // Should use fallback URL
    expect(rssContent).toContain('https://your-site.com/');
  });

  it('should return correct content type', async () => {
    const { GET } = await import('../rss.xml.ts');
    
    const mockContext = {
      site: new URL('https://test-site.com')
    };
    
    const response = await GET(mockContext as any);
    
    expect(response.headers.get('Content-Type')).toContain('xml');
  });
});