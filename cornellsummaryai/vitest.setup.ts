import { vi } from 'vitest';

vi.mock('astro:content', () => {
  return {
    getCollection: vi.fn((collection) => {
      if (collection === 'blog') {
        return Promise.resolve([
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
        ]);
      }
      return Promise.resolve([]);
    })
  };
});