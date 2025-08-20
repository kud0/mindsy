/**
 * Content validation utilities for blog posts
 */

import type { CollectionEntry } from 'astro:content';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validates a blog post for required fields and proper formatting
 */
export function validateBlogPost(post: CollectionEntry<'blog'>): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  
  const { data, body, slug } = post;
  
  // Required field validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Title is required and cannot be empty',
      severity: 'error'
    });
  }
  
  if (!data.description || data.description.trim().length === 0) {
    errors.push({
      field: 'description',
      message: 'Description is required and cannot be empty',
      severity: 'error'
    });
  }
  
  if (!data.pubDate) {
    errors.push({
      field: 'pubDate',
      message: 'Publication date is required',
      severity: 'error'
    });
  }
  
  // Content validation
  if (!body || body.trim().length === 0) {
    errors.push({
      field: 'body',
      message: 'Post content cannot be empty',
      severity: 'error'
    });
  }
  
  // Format validation
  if (data.title && data.title.length > 100) {
    warnings.push({
      field: 'title',
      message: 'Title is longer than 100 characters, which may be truncated in search results',
      severity: 'warning'
    });
  }
  
  if (data.description && data.description.length > 160) {
    warnings.push({
      field: 'description',
      message: 'Description is longer than 160 characters, which may be truncated in search results',
      severity: 'warning'
    });
  }
  
  if (data.description && data.description.length < 50) {
    warnings.push({
      field: 'description',
      message: 'Description is shorter than 50 characters, consider adding more detail for better SEO',
      severity: 'warning'
    });
  }
  
  // Date validation
  if (data.pubDate && data.pubDate > new Date()) {
    warnings.push({
      field: 'pubDate',
      message: 'Publication date is in the future',
      severity: 'warning'
    });
  }
  
  // Slug validation
  if (slug && !/^[a-z0-9-]+$/.test(slug)) {
    warnings.push({
      field: 'slug',
      message: 'Slug should only contain lowercase letters, numbers, and hyphens',
      severity: 'warning'
    });
  }
  
  // Tags validation
  if (data.tags) {
    if (data.tags.length > 10) {
      warnings.push({
        field: 'tags',
        message: 'More than 10 tags may dilute SEO effectiveness',
        severity: 'warning'
      });
    }
    
    const invalidTags = data.tags.filter(tag => !/^[a-z0-9-]+$/.test(tag));
    if (invalidTags.length > 0) {
      warnings.push({
        field: 'tags',
        message: `Tags should only contain lowercase letters, numbers, and hyphens: ${invalidTags.join(', ')}`,
        severity: 'warning'
      });
    }
  }
  
  // Hero image validation
  if (data.heroImage) {
    if (!data.heroImage.startsWith('/') && !data.heroImage.startsWith('http')) {
      warnings.push({
        field: 'heroImage',
        message: 'Hero image should be an absolute path starting with "/" or a full URL',
        severity: 'warning'
      });
    }
  }
  
  // Author validation
  if (!data.author || data.author.trim().length === 0) {
    warnings.push({
      field: 'author',
      message: 'Author field is empty, will use default site author',
      severity: 'warning'
    });
  }
  
  // Content quality checks
  const wordCount = body.split(/\s+/).filter(word => word.length > 0).length;
  if (wordCount < 100) {
    warnings.push({
      field: 'body',
      message: 'Post content is very short (less than 100 words), consider adding more detail',
      severity: 'warning'
    });
  }
  
  // Check for common markdown issues
  if (body.includes('](') && !body.includes('](/') && !body.includes('](http')) {
    warnings.push({
      field: 'body',
      message: 'Some links may be using relative paths without leading slash',
      severity: 'warning'
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validates all blog posts in a collection
 */
export function validateBlogCollection(posts: CollectionEntry<'blog'>[]): {
  validPosts: CollectionEntry<'blog'>[];
  invalidPosts: Array<{ post: CollectionEntry<'blog'>; validation: ValidationResult }>;
  totalWarnings: number;
} {
  const validPosts: CollectionEntry<'blog'>[] = [];
  const invalidPosts: Array<{ post: CollectionEntry<'blog'>; validation: ValidationResult }> = [];
  let totalWarnings = 0;
  
  for (const post of posts) {
    const validation = validateBlogPost(post);
    totalWarnings += validation.warnings.length;
    
    if (validation.isValid) {
      validPosts.push(post);
    } else {
      invalidPosts.push({ post, validation });
    }
  }
  
  return {
    validPosts,
    invalidPosts,
    totalWarnings
  };
}

/**
 * Formats validation results for console output
 */
export function formatValidationResults(
  slug: string, 
  validation: ValidationResult
): string {
  const lines: string[] = [];
  
  if (validation.errors.length > 0) {
    lines.push(`❌ Errors in ${slug}:`);
    validation.errors.forEach(error => {
      lines.push(`  • ${error.field}: ${error.message}`);
    });
  }
  
  if (validation.warnings.length > 0) {
    lines.push(`⚠️  Warnings in ${slug}:`);
    validation.warnings.forEach(warning => {
      lines.push(`  • ${warning.field}: ${warning.message}`);
    });
  }
  
  if (validation.isValid && validation.warnings.length === 0) {
    lines.push(`✅ ${slug} is valid`);
  }
  
  return lines.join('\n');
}