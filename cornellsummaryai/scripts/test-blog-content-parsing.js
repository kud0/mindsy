#!/usr/bin/env node

/**
 * Test script to verify that blog content collection parsing works correctly
 * This script simulates what Astro does when parsing content collections
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { z } from 'zod';

// Define the blog schema (same as in config.ts)
const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  pubDate: z.date(),
  heroImage: z.string().optional(),
  tags: z.array(z.string()).optional(),
  author: z.string().default('Site Author'),
  draft: z.boolean().default(false)
});

const BLOG_DIR = 'src/content/blog';

console.log('🧪 Testing blog content collection parsing...\n');

try {
  // Get all markdown files in the blog directory
  const files = readdirSync(BLOG_DIR).filter(file => file.endsWith('.md') && file !== '.gitkeep');
  
  if (files.length === 0) {
    console.log('❌ No blog posts found in', BLOG_DIR);
    process.exit(1);
  }

  console.log(`📁 Found ${files.length} blog post(s):`);
  files.forEach(file => console.log(`   - ${file}`));
  console.log();

  let allValid = true;
  const parsedPosts = [];

  // Parse each blog post
  for (const file of files) {
    const filePath = join(BLOG_DIR, file);
    const slug = file.replace('.md', '');
    
    console.log(`📄 Parsing ${file}...`);
    
    try {
      // Read and parse the markdown file
      const fileContent = readFileSync(filePath, 'utf-8');
      const { data: frontmatter, content } = matter(fileContent);
      
      // Convert pubDate string to Date object if needed
      if (typeof frontmatter.pubDate === 'string') {
        frontmatter.pubDate = new Date(frontmatter.pubDate);
      }
      
      // Validate against schema
      const result = blogSchema.safeParse(frontmatter);
      
      if (result.success) {
        console.log(`   ✅ Valid frontmatter`);
        console.log(`   📝 Title: "${result.data.title}"`);
        console.log(`   📅 Date: ${result.data.pubDate.toISOString().split('T')[0]}`);
        console.log(`   👤 Author: ${result.data.author}`);
        
        if (result.data.heroImage) {
          console.log(`   🖼️  Hero Image: ${result.data.heroImage}`);
        }
        
        if (result.data.tags && result.data.tags.length > 0) {
          console.log(`   🏷️  Tags: ${result.data.tags.join(', ')}`);
        }
        
        if (result.data.draft) {
          console.log(`   📝 Status: Draft`);
        }
        
        console.log(`   📊 Content length: ${content.length} characters`);
        
        parsedPosts.push({
          slug,
          data: result.data,
          content,
          file
        });
        
      } else {
        console.log(`   ❌ Invalid frontmatter:`);
        result.error.issues.forEach(issue => {
          console.log(`      - ${issue.path.join('.')}: ${issue.message}`);
        });
        allValid = false;
      }
      
    } catch (error) {
      console.log(`   ❌ Error parsing file: ${error.message}`);
      allValid = false;
    }
    
    console.log();
  }

  // Summary
  console.log('📊 Summary:');
  console.log(`   Total posts: ${files.length}`);
  console.log(`   Valid posts: ${parsedPosts.length}`);
  console.log(`   Invalid posts: ${files.length - parsedPosts.length}`);
  
  if (parsedPosts.length > 0) {
    console.log('\n📋 Post listing (sorted by date):');
    parsedPosts
      .sort((a, b) => b.data.pubDate - a.data.pubDate)
      .forEach(post => {
        const date = post.data.pubDate.toISOString().split('T')[0];
        console.log(`   ${date} - "${post.data.title}" by ${post.data.author}`);
      });
  }

  if (allValid) {
    console.log('\n🎉 All blog posts parsed successfully!');
    console.log('✅ Content collection validation passed');
    process.exit(0);
  } else {
    console.log('\n❌ Some blog posts failed validation');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Error testing blog content:', error.message);
  process.exit(1);
}