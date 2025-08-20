#!/usr/bin/env node

/**
 * Blog content validation script
 * Validates all blog posts for required fields and proper formatting
 */

import { getCollection } from 'astro:content';
import { validateBlogCollection, formatValidationResults } from '../src/lib/content-validation.ts';

async function validateBlogContent() {
  console.log('🔍 Validating blog content...\n');
  
  try {
    // Get all blog posts (including drafts for validation)
    const allPosts = await getCollection('blog');
    
    if (allPosts.length === 0) {
      console.log('📝 No blog posts found to validate.');
      return;
    }
    
    console.log(`📊 Found ${allPosts.length} blog posts to validate.\n`);
    
    // Validate all posts
    const { validPosts, invalidPosts, totalWarnings } = validateBlogCollection(allPosts);
    
    // Display results for each post
    for (const post of allPosts) {
      const validation = validateBlogPost(post);
      const output = formatValidationResults(post.slug, validation);
      console.log(output);
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('📋 Validation Summary:');
    console.log(`  ✅ Valid posts: ${validPosts.length}`);
    console.log(`  ❌ Invalid posts: ${invalidPosts.length}`);
    console.log(`  ⚠️  Total warnings: ${totalWarnings}`);
    
    if (invalidPosts.length > 0) {
      console.log('\n🚨 Posts with errors:');
      invalidPosts.forEach(({ post }) => {
        console.log(`  • ${post.slug}`);
      });
    }
    
    // Exit with error code if there are invalid posts
    if (invalidPosts.length > 0) {
      console.log('\n❌ Validation failed. Please fix the errors above.');
      process.exit(1);
    } else {
      console.log('\n✅ All blog posts are valid!');
    }
    
  } catch (error) {
    console.error('❌ Error during validation:', error);
    process.exit(1);
  }
}

// Import the validation function since we can't import it at the top level
async function validateBlogPost(post) {
  const { validateBlogPost } = await import('../src/lib/content-validation.ts');
  return validateBlogPost(post);
}

// Run validation
validateBlogContent();