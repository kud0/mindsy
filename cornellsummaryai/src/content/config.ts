import { defineCollection, z } from 'astro:content';

// Define the blog collection schema with Zod validation
const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.date(),
  heroImage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().default('Site Author'),
  draft: z.boolean().default(false)
});

const blogCollection = defineCollection({
  type: 'content',
  schema: blogSchema
});

const blogESCollection = defineCollection({
  type: 'content',
  schema: blogSchema
});

// Export collections
export const collections = {
  blog: blogCollection,
  'blog-es': blogESCollection,
  'blog-test': blogCollection // Keep this for existing test collection
};

// Export TypeScript interfaces for type safety
export type BlogPost = z.infer<typeof blogSchema>;