#!/usr/bin/env node

/**
 * Script to verify that individual blog post pages are generated correctly
 * Tests the dynamic routing functionality for blog posts
 */

import { getCollection } from 'astro:content';
import fs from 'fs';
import path from 'path';

async function verifyBlogPostPages() {
  console.log('🔍 Verifying blog post page generation...\n');

  try {
    // Get all blog posts
    const blogPosts = await getCollection('blog', ({ data }) => {
      // Filter out draft posts in production-like test
      return data.draft !== true;
    });

    console.log(`📝 Found ${blogPosts.length} published blog posts:`);
    
    // Verify each post has required data
    const results = [];
    
    for (const post of blogPosts) {
      const result = {
        slug: post.slug,
        title: post.data.title,
        description: post.data.description,
        pubDate: post.data.pubDate,
        hasHeroImage: !!post.data.heroImage,
        hasTags: !!(post.data.tags && post.data.tags.length > 0),
        hasAuthor: !!post.data.author,
        isDraft: !!post.data.draft,
        canRender: false
      };

      // Test if the post can be rendered
      try {
        const { Content } = await post.render();
        result.canRender = true;
        console.log(`  ✅ ${post.slug} - ${post.data.title}`);
        console.log(`     📅 Published: ${post.data.pubDate.toDateString()}`);
        if (post.data.heroImage) {
          console.log(`     🖼️  Hero Image: ${post.data.heroImage}`);
        }
        if (post.data.tags && post.data.tags.length > 0) {
          console.log(`     🏷️  Tags: ${post.data.tags.join(', ')}`);
        }
        console.log(`     👤 Author: ${post.data.author || 'Site Author'}`);
        console.log('');
      } catch (error) {
        console.log(`  ❌ ${post.slug} - Failed to render: ${error.message}`);
        result.error = error.message;
      }

      results.push(result);
    }

    // Summary
    const renderableCount = results.filter(r => r.canRender).length;
    const withHeroImages = results.filter(r => r.hasHeroImage).length;
    const withTags = results.filter(r => r.hasTags).length;
    const withCustomAuthor = results.filter(r => r.hasAuthor).length;

    console.log('📊 Summary:');
    console.log(`   Total posts: ${results.length}`);
    console.log(`   Renderable posts: ${renderableCount}`);
    console.log(`   Posts with hero images: ${withHeroImages}`);
    console.log(`   Posts with tags: ${withTags}`);
    console.log(`   Posts with custom author: ${withCustomAuthor}`);

    // Test static path generation logic
    console.log('\n🛣️  Testing static path generation...');
    
    const staticPaths = blogPosts.map((post) => ({
      params: { slug: post.slug },
      props: { post },
    }));

    console.log(`   Generated ${staticPaths.length} static paths:`);
    staticPaths.forEach(path => {
      console.log(`     - /blog/${path.params.slug}`);
    });

    // Verify URL structure
    console.log('\n🔗 Verifying URL structure...');
    const urlPattern = /^[a-z0-9-]+$/;
    const invalidSlugs = staticPaths.filter(path => !urlPattern.test(path.params.slug));
    
    if (invalidSlugs.length === 0) {
      console.log('   ✅ All slugs follow valid URL pattern');
    } else {
      console.log('   ❌ Invalid slugs found:');
      invalidSlugs.forEach(path => {
        console.log(`     - ${path.params.slug}`);
      });
    }

    // Test date formatting
    console.log('\n📅 Testing date formatting...');
    results.forEach(result => {
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(result.pubDate);
      console.log(`   ${result.slug}: ${formattedDate}`);
    });

    if (renderableCount === results.length) {
      console.log('\n✅ All blog post pages verified successfully!');
      return true;
    } else {
      console.log(`\n❌ ${results.length - renderableCount} posts failed verification`);
      return false;
    }

  } catch (error) {
    console.error('❌ Error verifying blog post pages:', error);
    return false;
  }
}

// Run verification if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  verifyBlogPostPages()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { verifyBlogPostPages };