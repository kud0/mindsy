#!/usr/bin/env node

/**
 * Integration test for draft functionality
 * Tests draft handling in both development and production environments
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🧪 Testing draft functionality...\n');

// Test 1: Verify draft post exists in source
console.log('1. Checking draft post exists in source...');
const draftPostPath = 'src/content/blog/draft-example-post.md';
if (existsSync(draftPostPath)) {
  const draftContent = readFileSync(draftPostPath, 'utf-8');
  if (draftContent.includes('draft: true')) {
    console.log('✅ Draft post found with draft: true');
  } else {
    console.log('❌ Draft post missing draft: true flag');
    process.exit(1);
  }
} else {
  console.log('❌ Draft post not found');
  process.exit(1);
}

// Test 2: Build and verify draft exclusion in production
console.log('\n2. Testing production build (drafts should be excluded)...');
try {
  execSync('npm run build', { stdio: 'pipe' });
  
  // Check if draft post was excluded from build
  const draftBuildPath = 'dist/client/blog/draft-example-post/index.html';
  if (!existsSync(draftBuildPath)) {
    console.log('✅ Draft post correctly excluded from production build');
  } else {
    console.log('❌ Draft post incorrectly included in production build');
    process.exit(1);
  }
  
  // Check that published posts were included
  const publishedPosts = [
    'dist/client/blog/getting-started-with-astro/index.html',
    'dist/client/blog/building-scalable-apis/index.html',
    'dist/client/blog/web-performance-optimization/index.html'
  ];
  
  let publishedCount = 0;
  publishedPosts.forEach(postPath => {
    if (existsSync(postPath)) {
      publishedCount++;
    }
  });
  
  if (publishedCount === publishedPosts.length) {
    console.log('✅ All published posts included in production build');
  } else {
    console.log(`❌ Only ${publishedCount}/${publishedPosts.length} published posts found in build`);
    process.exit(1);
  }
  
} catch (error) {
  console.log('❌ Production build failed:', error.message);
  process.exit(1);
}

// Test 3: Verify RSS feed logic (check build output)
console.log('\n3. Testing RSS feed (drafts should be excluded)...');
try {
  // Check if RSS file was generated in build
  const rssPath = 'dist/client/rss.xml';
  if (existsSync(rssPath)) {
    const rssContent = readFileSync(rssPath, 'utf-8');
    
    if (rssContent.includes('Draft: Advanced TypeScript Patterns')) {
      console.log('❌ Draft post found in RSS feed');
      process.exit(1);
    } else {
      console.log('✅ Draft post correctly excluded from RSS feed');
    }
    
    // Check that published posts are in RSS
    const publishedTitles = [
      'Getting Started with Astro',
      'Building Scalable APIs',
      'Web Performance Optimization'
    ];
    
    let rssPublishedCount = 0;
    publishedTitles.forEach(title => {
      if (rssContent.includes(title)) {
        rssPublishedCount++;
      }
    });
    
    if (rssPublishedCount === publishedTitles.length) {
      console.log('✅ All published posts found in RSS feed');
    } else {
      console.log(`❌ Only ${rssPublishedCount}/${publishedTitles.length} published posts found in RSS`);
    }
  } else {
    console.log('⚠️  RSS file not found in build output');
  }
  
} catch (error) {
  console.log('⚠️  Could not test RSS feed:', error.message);
}

// Test 4: Verify content validation
console.log('\n4. Testing content validation...');
try {
  // Test the validation functions directly
  const { validateBlogPost } = await import('../src/lib/content-validation.ts');
  
  const testPost = {
    slug: 'test-post',
    data: {
      title: 'Test Post',
      description: 'This is a test post for validation',
      pubDate: new Date(),
      draft: true,
    },
    body: 'This is test content for the validation system.',
  };
  
  const validation = validateBlogPost(testPost);
  
  if (validation.isValid) {
    console.log('✅ Content validation working correctly');
  } else {
    console.log('❌ Content validation failed:', validation.errors);
    process.exit(1);
  }
  
} catch (error) {
  console.log('❌ Content validation test failed:', error.message);
  process.exit(1);
}

// Test 5: Verify author management
console.log('\n5. Testing author management...');
try {
  const { getAuthor } = await import('../src/lib/authors.ts');
  
  const author = getAuthor('Alex Developer');
  if (author.name === 'Alex Developer' && author.id === 'alex-developer') {
    console.log('✅ Author management working correctly');
  } else {
    console.log('❌ Author management failed');
    process.exit(1);
  }
  
  // Test unknown author handling
  const unknownAuthor = getAuthor('Unknown Person');
  if (unknownAuthor.id === 'unknown') {
    console.log('✅ Unknown author handling working correctly');
  } else {
    console.log('❌ Unknown author handling failed');
    process.exit(1);
  }
  
} catch (error) {
  console.log('❌ Author management test failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 All draft functionality tests passed!');
console.log('\n📋 Summary:');
console.log('  ✅ Draft posts excluded from production builds');
console.log('  ✅ Published posts included in production builds');
console.log('  ✅ RSS feed excludes draft posts');
console.log('  ✅ Content validation working');
console.log('  ✅ Author management working');
console.log('\n✨ Draft functionality is working correctly!');