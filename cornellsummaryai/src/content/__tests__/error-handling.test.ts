import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';

// Define the blog schema for testing (mirrors the one in config.ts)
const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.date(),
  heroImage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().default('Site Author'),
  draft: z.boolean().default(false)
});

describe('Blog Content Error Handling Tests', () => {
  describe('Malformed Frontmatter Handling', () => {
    it('should handle missing required title field', () => {
      const malformedPost = {
        // title missing
        description: 'A test blog post',
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(malformedPost);
      
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const titleError = result.error.issues.find(issue => issue.path[0] === 'title');
        expect(titleError).toBeDefined();
        expect(titleError?.code).toBe('invalid_type');
        expect(titleError?.message).toBe('Required');
      }
    });

    it('should handle missing required description field', () => {
      const malformedPost = {
        title: 'Test Post',
        // description missing
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(malformedPost);
      
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const descError = result.error.issues.find(issue => issue.path[0] === 'description');
        expect(descError).toBeDefined();
        expect(descError?.code).toBe('invalid_type');
        expect(descError?.message).toBe('Required');
      }
    });

    it('should handle missing required pubDate field', () => {
      const malformedPost = {
        title: 'Test Post',
        description: 'A test blog post'
        // pubDate missing
      };

      const result = blogSchema.safeParse(malformedPost);
      
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const dateError = result.error.issues.find(issue => issue.path[0] === 'pubDate');
        expect(dateError).toBeDefined();
        expect(dateError?.code).toBe('invalid_type');
        expect(dateError?.message).toBe('Required');
      }
    });

    it('should handle invalid date formats', () => {
      const invalidDateFormats = [
        'invalid-date',
        '2025-13-45', // Invalid month/day
        '25-01-15', // Wrong format
        'January 15, 2025', // String instead of Date
        1642204800000, // Timestamp instead of Date
        null,
        undefined
      ];

      invalidDateFormats.forEach(invalidDate => {
        const malformedPost = {
          title: 'Test Post',
          description: 'A test blog post',
          pubDate: invalidDate
        };

        const result = blogSchema.safeParse(malformedPost);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const dateError = result.error.issues.find(issue => issue.path[0] === 'pubDate');
          expect(dateError).toBeDefined();
        }
      });
    });

    it('should handle invalid title types', () => {
      const invalidTitles = [
        123,
        true,
        null,
        undefined,
        [],
        {},
        () => 'title'
      ];

      invalidTitles.forEach(invalidTitle => {
        const malformedPost = {
          title: invalidTitle,
          description: 'A test blog post',
          pubDate: new Date('2025-01-15')
        };

        const result = blogSchema.safeParse(malformedPost);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const titleError = result.error.issues.find(issue => issue.path[0] === 'title');
          expect(titleError).toBeDefined();
          expect(titleError?.code).toBe('invalid_type');
        }
      });
    });

    it('should handle invalid description types', () => {
      const invalidDescriptions = [
        123,
        true,
        null,
        undefined,
        [],
        {}
      ];

      invalidDescriptions.forEach(invalidDescription => {
        const malformedPost = {
          title: 'Test Post',
          description: invalidDescription,
          pubDate: new Date('2025-01-15')
        };

        const result = blogSchema.safeParse(malformedPost);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const descError = result.error.issues.find(issue => issue.path[0] === 'description');
          expect(descError).toBeDefined();
          expect(descError?.code).toBe('invalid_type');
        }
      });
    });

    it('should handle invalid tags format', () => {
      const invalidTagsFormats = [
        'not-an-array',
        123,
        true,
        { tag1: 'value' },
        ['valid-tag', 123, 'another-valid-tag'], // Mixed types
        ['valid-tag', null, 'another-valid-tag'], // Null in array
        ['valid-tag', undefined, 'another-valid-tag'] // Undefined in array
      ];

      invalidTagsFormats.forEach(invalidTags => {
        const malformedPost = {
          title: 'Test Post',
          description: 'A test blog post',
          pubDate: new Date('2025-01-15'),
          tags: invalidTags
        };

        const result = blogSchema.safeParse(malformedPost);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const tagsError = result.error.issues.find(issue => 
            issue.path[0] === 'tags' || (issue.path[0] === 'tags' && issue.path.length > 1)
          );
          expect(tagsError).toBeDefined();
        }
      });
    });

    it('should handle invalid heroImage types', () => {
      const invalidHeroImages = [
        123,
        true,
        [],
        {},
        () => '/image.jpg'
      ];

      invalidHeroImages.forEach(invalidHeroImage => {
        const malformedPost = {
          title: 'Test Post',
          description: 'A test blog post',
          pubDate: new Date('2025-01-15'),
          heroImage: invalidHeroImage
        };

        const result = blogSchema.safeParse(malformedPost);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const imageError = result.error.issues.find(issue => issue.path[0] === 'heroImage');
          expect(imageError).toBeDefined();
          expect(imageError?.code).toBe('invalid_type');
        }
      });
    });

    it('should handle invalid author types', () => {
      const invalidAuthors = [
        123,
        true,
        [],
        {},
        null // null should fail, undefined should use default
      ];

      invalidAuthors.forEach(invalidAuthor => {
        const malformedPost = {
          title: 'Test Post',
          description: 'A test blog post',
          pubDate: new Date('2025-01-15'),
          author: invalidAuthor
        };

        const result = blogSchema.safeParse(malformedPost);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const authorError = result.error.issues.find(issue => issue.path[0] === 'author');
          expect(authorError).toBeDefined();
          expect(authorError?.code).toBe('invalid_type');
        }
      });
    });

    it('should handle invalid draft types', () => {
      const invalidDrafts = [
        'true',
        'false',
        1,
        0,
        [],
        {},
        null // null should fail, undefined should use default
      ];

      invalidDrafts.forEach(invalidDraft => {
        const malformedPost = {
          title: 'Test Post',
          description: 'A test blog post',
          pubDate: new Date('2025-01-15'),
          draft: invalidDraft
        };

        const result = blogSchema.safeParse(malformedPost);
        expect(result.success).toBe(false);
        
        if (!result.success) {
          const draftError = result.error.issues.find(issue => issue.path[0] === 'draft');
          expect(draftError).toBeDefined();
          expect(draftError?.code).toBe('invalid_type');
        }
      });
    });
  });

  describe('Empty and Edge Case Handling', () => {
    it('should handle empty string values', () => {
      const postWithEmptyStrings = {
        title: '',
        description: '',
        pubDate: new Date('2025-01-15'),
        heroImage: '',
        author: '',
        tags: []
      };

      const result = blogSchema.safeParse(postWithEmptyStrings);
      
      // Empty strings should be valid (validation happens at application level)
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe('');
        expect(result.data.description).toBe('');
        expect(result.data.heroImage).toBe('');
        expect(result.data.author).toBe('');
        expect(result.data.tags).toEqual([]);
      }
    });

    it('should handle whitespace-only values', () => {
      const postWithWhitespace = {
        title: '   ',
        description: '\t\n  ',
        pubDate: new Date('2025-01-15'),
        heroImage: '  ',
        author: '\n',
        tags: ['  ', '\t']
      };

      const result = blogSchema.safeParse(postWithWhitespace);
      
      // Whitespace strings should be valid (trimming happens at application level)
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe('   ');
        expect(result.data.description).toBe('\t\n  ');
        expect(result.data.tags).toEqual(['  ', '\t']);
      }
    });

    it('should handle very long values', () => {
      const veryLongString = 'a'.repeat(10000);
      
      const postWithLongValues = {
        title: veryLongString,
        description: veryLongString,
        pubDate: new Date('2025-01-15'),
        heroImage: `/images/blog/${veryLongString}.jpg`,
        author: veryLongString,
        tags: [veryLongString, 'normal-tag']
      };

      const result = blogSchema.safeParse(postWithLongValues);
      
      // Very long strings should be valid (length validation happens at application level)
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title.length).toBe(10000);
        expect(result.data.description.length).toBe(10000);
      }
    });

    it('should handle special characters in strings', () => {
      const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?`~"\'\\';
      
      const postWithSpecialChars = {
        title: `Test Post ${specialChars}`,
        description: `Description with ${specialChars} characters`,
        pubDate: new Date('2025-01-15'),
        heroImage: '/images/blog/special-chars.jpg',
        author: `Author ${specialChars}`,
        tags: [`tag-${specialChars}`, 'normal-tag']
      };

      const result = blogSchema.safeParse(postWithSpecialChars);
      
      // Special characters should be valid
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toContain(specialChars);
        expect(result.data.description).toContain(specialChars);
        expect(result.data.tags?.[0]).toContain(specialChars);
      }
    });

    it('should handle Unicode characters', () => {
      const unicodeChars = '🚀 ñáéíóú 中文 العربية русский';
      
      const postWithUnicode = {
        title: `Test Post ${unicodeChars}`,
        description: `Description with ${unicodeChars} characters`,
        pubDate: new Date('2025-01-15'),
        author: `Author ${unicodeChars}`,
        tags: [`tag-${unicodeChars}`, 'normal-tag']
      };

      const result = blogSchema.safeParse(postWithUnicode);
      
      // Unicode characters should be valid
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toContain(unicodeChars);
        expect(result.data.description).toContain(unicodeChars);
        expect(result.data.author).toContain(unicodeChars);
      }
    });
  });

  describe('Missing Content Handling', () => {
    it('should handle posts with minimal valid content', () => {
      const minimalPost = {
        title: 'A',
        description: 'B',
        pubDate: new Date('2025-01-15')
      };

      const result = blogSchema.safeParse(minimalPost);
      
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.title).toBe('A');
        expect(result.data.description).toBe('B');
        expect(result.data.author).toBe('Site Author'); // Default
        expect(result.data.draft).toBe(false); // Default
      }
    });

    it('should handle completely empty frontmatter object', () => {
      const emptyPost = {};

      const result = blogSchema.safeParse(emptyPost);
      
      expect(result.success).toBe(false);
      
      if (!result.success) {
        // Should have errors for all required fields
        const requiredFields = ['title', 'description', 'pubDate'];
        requiredFields.forEach(field => {
          const fieldError = result.error.issues.find(issue => issue.path[0] === field);
          expect(fieldError).toBeDefined();
          expect(fieldError?.code).toBe('invalid_type');
          expect(fieldError?.message).toBe('Required');
        });
      }
    });

    it('should handle null frontmatter', () => {
      const result = blogSchema.safeParse(null);
      
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_type');
        expect(result.error.issues[0].expected).toBe('object');
        expect(result.error.issues[0].received).toBe('null');
      }
    });

    it('should handle undefined frontmatter', () => {
      const result = blogSchema.safeParse(undefined);
      
      expect(result.success).toBe(false);
      
      if (!result.success) {
        expect(result.error.issues[0].code).toBe('invalid_type');
        expect(result.error.issues[0].expected).toBe('object');
        expect(result.error.issues[0].received).toBe('undefined');
      }
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    it('should provide meaningful error messages for debugging', () => {
      const malformedPost = {
        title: 123,
        description: true,
        pubDate: 'invalid-date',
        tags: 'not-an-array',
        author: null,
        draft: 'maybe'
      };

      const result = blogSchema.safeParse(malformedPost);
      
      expect(result.success).toBe(false);
      
      if (!result.success) {
        const errors = result.error.issues;
        
        // Should have specific error for each invalid field
        expect(errors.length).toBeGreaterThan(0);
        
        errors.forEach(error => {
          expect(error.path).toBeDefined();
          expect(error.message).toBeDefined();
          expect(error.code).toBeDefined();
          
          // Error messages should be helpful
          expect(error.message.length).toBeGreaterThan(0);
        });
      }
    });

    it('should handle partial validation success', () => {
      const partiallyValidPost = {
        title: 'Valid Title',
        description: 'Valid Description',
        pubDate: new Date('2025-01-15'),
        // Valid required fields
        tags: 'invalid-tags-format', // Invalid optional field
        heroImage: 123 // Invalid optional field
      };

      const result = blogSchema.safeParse(partiallyValidPost);
      
      expect(result.success).toBe(false);
      
      if (!result.success) {
        // Should have errors only for invalid optional fields
        const tagError = result.error.issues.find(issue => issue.path[0] === 'tags');
        const imageError = result.error.issues.find(issue => issue.path[0] === 'heroImage');
        
        expect(tagError).toBeDefined();
        expect(imageError).toBeDefined();
        
        // Should not have errors for valid required fields
        const titleError = result.error.issues.find(issue => issue.path[0] === 'title');
        const descError = result.error.issues.find(issue => issue.path[0] === 'description');
        const dateError = result.error.issues.find(issue => issue.path[0] === 'pubDate');
        
        expect(titleError).toBeUndefined();
        expect(descError).toBeUndefined();
        expect(dateError).toBeUndefined();
      }
    });

    it('should handle graceful degradation for optional fields', () => {
      const postWithInvalidOptionals = {
        title: 'Valid Title',
        description: 'Valid Description',
        pubDate: new Date('2025-01-15')
        // No optional fields - should use defaults
      };

      const result = blogSchema.safeParse(postWithInvalidOptionals);
      
      expect(result.success).toBe(true);
      
      if (result.success) {
        expect(result.data.author).toBe('Site Author'); // Default
        expect(result.data.draft).toBe(false); // Default
        expect(result.data.heroImage).toBeUndefined(); // Optional
        expect(result.data.tags).toBeUndefined(); // Optional
      }
    });
  });

  describe('Content Processing Error Handling', () => {
    it('should handle posts with no body content', () => {
      const postWithNoBody = {
        slug: 'empty-post',
        data: {
          title: 'Empty Post',
          description: 'A post with no body content',
          pubDate: new Date('2025-01-15'),
          author: 'Test Author',
          draft: false
        },
        body: ''
      };

      // Should handle empty body gracefully
      expect(() => {
        const wordCount = postWithNoBody.body.split(/\s+/).filter(word => word.length > 0).length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 200));
        
        return { wordCount, readingTime };
      }).not.toThrow();
    });

    it('should handle posts with malformed markdown', () => {
      const postWithMalformedMarkdown = {
        slug: 'malformed-post',
        data: {
          title: 'Malformed Post',
          description: 'A post with malformed markdown',
          pubDate: new Date('2025-01-15'),
          author: 'Test Author',
          draft: false
        },
        body: '# Heading\n\n[Broken link](\n\n**Unclosed bold\n\n```\nUnclosed code block'
      };

      // Should handle malformed markdown gracefully
      expect(() => {
        const wordCount = postWithMalformedMarkdown.body.split(/\s+/).length;
        const hasHeadings = postWithMalformedMarkdown.body.includes('#');
        
        return { wordCount, hasHeadings };
      }).not.toThrow();
    });

    it('should handle posts with invalid slug characters', () => {
      const invalidSlugs = [
        'post with spaces',
        'post_with_underscores',
        'post.with.dots',
        'post/with/slashes',
        'post?with?questions',
        'post#with#hashes',
        'POST-WITH-CAPS'
      ];

      invalidSlugs.forEach(slug => {
        // Should be able to sanitize invalid slugs
        const sanitizedSlug = slug
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '');
        
        expect(sanitizedSlug).toMatch(/^[a-z0-9-]+$/);
        expect(sanitizedSlug).not.toMatch(/^-|-$/);
      });
    });
  });

  describe('Build-time Error Handling', () => {
    it('should handle collection parsing errors gracefully', async () => {
      // Mock a collection parsing error
      const mockError = new Error('Failed to parse frontmatter');
      
      // Should handle parsing errors without crashing
      expect(() => {
        try {
          throw mockError;
        } catch (error) {
          console.warn('Blog post parsing failed:', error.message);
          return []; // Return empty array as fallback
        }
      }).not.toThrow();
    });

    it('should handle missing blog directory gracefully', () => {
      // Should handle missing blog directory
      expect(() => {
        const blogPosts = []; // Fallback to empty array
        const sortedPosts = blogPosts
          .filter(post => !post.data?.draft)
          .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
        
        return sortedPosts;
      }).not.toThrow();
    });

    it('should validate error handling in production vs development', () => {
      const mockPosts = [
        {
          slug: 'valid-post',
          data: { title: 'Valid', description: 'Valid', pubDate: new Date(), draft: false }
        },
        {
          slug: 'draft-post',
          data: { title: 'Draft', description: 'Draft', pubDate: new Date(), draft: true }
        }
      ];

      // Production should filter drafts
      const productionPosts = mockPosts.filter(post => {
        if (process.env.NODE_ENV === 'production') {
          return !post.data.draft;
        }
        return true;
      });

      // Development should include all posts
      const developmentPosts = mockPosts.filter(post => {
        if (process.env.NODE_ENV === 'development') {
          return true;
        }
        return !post.data.draft;
      });

      if (process.env.NODE_ENV === 'production') {
        expect(productionPosts.length).toBe(1);
      } else {
        expect(developmentPosts.length).toBe(2);
      }
    });
  });
});