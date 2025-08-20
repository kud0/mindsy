/**
 * Author management system for blog posts
 */

export interface Author {
  id: string;
  name: string;
  bio?: string;
  avatar?: string;
  email?: string;
  website?: string;
  social?: {
    twitter?: string;
    github?: string;
    linkedin?: string;
  };
}

/**
 * Default authors configuration
 * Add new authors here as needed
 */
export const AUTHORS: Record<string, Author> = {
  'site-author': {
    id: 'site-author',
    name: 'Site Author',
    bio: 'Default site author for Cornell Summary AI blog posts.',
    avatar: '/images/authors/default-avatar.svg',
  },
  'alex-developer': {
    id: 'alex-developer',
    name: 'Alex Developer',
    bio: 'Full-stack developer passionate about modern web technologies, API design, and developer experience.',
    avatar: '/images/authors/alex-developer.jpg',
    website: 'https://alexdev.com',
    social: {
      twitter: '@alexdev',
      github: 'alexdev',
      linkedin: 'alexdeveloper'
    }
  },
  'sarah-tech': {
    id: 'sarah-tech',
    name: 'Sarah Tech',
    bio: 'Technical writer and developer advocate with expertise in web performance and accessibility.',
    avatar: '/images/authors/sarah-tech.jpg',
    social: {
      twitter: '@sarahtech',
      github: 'sarahtech'
    }
  }
};

/**
 * Get author information by ID or name
 */
export function getAuthor(identifier: string): Author {
  // First try to find by ID
  if (AUTHORS[identifier]) {
    return AUTHORS[identifier];
  }
  
  // Then try to find by name
  const authorByName = Object.values(AUTHORS).find(
    author => author.name.toLowerCase() === identifier.toLowerCase()
  );
  
  if (authorByName) {
    return authorByName;
  }
  
  // Return a default author if not found
  return {
    id: 'unknown',
    name: identifier || 'Unknown Author',
    bio: 'Guest author or contributor.',
  };
}

/**
 * Get all authors
 */
export function getAllAuthors(): Author[] {
  return Object.values(AUTHORS);
}

/**
 * Get authors who have published posts
 */
export function getActiveAuthors(posts: Array<{ data: { author?: string } }>): Author[] {
  const activeAuthorIds = new Set<string>();
  
  posts.forEach(post => {
    if (post.data.author) {
      const author = getAuthor(post.data.author);
      activeAuthorIds.add(author.id);
    }
  });
  
  return Array.from(activeAuthorIds).map(id => getAuthor(id));
}

/**
 * Validate author exists
 */
export function validateAuthor(authorName: string): boolean {
  const author = getAuthor(authorName);
  return author.id !== 'unknown';
}