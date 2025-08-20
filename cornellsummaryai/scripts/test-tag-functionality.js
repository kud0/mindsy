#!/usr/bin/env node

/**
 * Test script for blog tag functionality
 * Tests tag page generation, filtering, and navigation
 */

import { readdir, readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

async function testTagFunctionality() {
  console.log('🏷️  Testing Blog Tag Functionality\n');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: []
  };

  function addTest(name, passed, message) {
    results.tests.push({ name, passed, message });
    if (passed) {
      results.passed++;
      console.log(`✅ ${name}`);
    } else {
      results.failed++;
      console.log(`❌ ${name}: ${message}`);
    }
  }

  try {
    // Test 1: Check if tag page exists
    try {
      const tagPagePath = join(projectRoot, 'src/pages/blog/tags/[tag].astro');
      const tagPageContent = await readFile(tagPagePath, 'utf-8');
      
      addTest(
        'Tag page file exists',
        tagPageContent.length > 0,
        'Tag page file not found or empty'
      );
      
      // Test 2: Check if getStaticPaths is implemented
      const hasGetStaticPaths = tagPageContent.includes('getStaticPaths');
      addTest(
        'getStaticPaths function implemented',
        hasGetStaticPaths,
        'getStaticPaths function not found in tag page'
      );
      
      // Test 3: Check if tag filtering logic exists
      const hasTagFiltering = tagPageContent.includes('post.data.tags?.includes(tag)');
      addTest(
        'Tag filtering logic implemented',
        hasTagFiltering,
        'Tag filtering logic not found'
      );
      
      // Test 4: Check if breadcrumb navigation exists
      const hasBreadcrumbs = tagPageContent.includes('Breadcrumb') || tagPageContent.includes('breadcrumb');
      addTest(
        'Breadcrumb navigation implemented',
        hasBreadcrumbs,
        'Breadcrumb navigation not found'
      );
      
    } catch (error) {
      addTest(
        'Tag page file exists',
        false,
        `Error reading tag page: ${error.message}`
      );
    }

    // Test 5: Check if blog index has clickable tags
    try {
      const blogIndexPath = join(projectRoot, 'src/pages/blog/index.astro');
      const blogIndexContent = await readFile(blogIndexPath, 'utf-8');
      
      const hasClickableTags = blogIndexContent.includes('href={`/blog/tags/${tag}`}');
      addTest(
        'Blog index has clickable tags',
        hasClickableTags,
        'Clickable tag links not found in blog index'
      );
      
    } catch (error) {
      addTest(
        'Blog index has clickable tags',
        false,
        `Error reading blog index: ${error.message}`
      );
    }

    // Test 6: Check if BlogPostLayout has clickable tags
    try {
      const layoutPath = join(projectRoot, 'src/layouts/BlogPostLayout.astro');
      const layoutContent = await readFile(layoutPath, 'utf-8');
      
      const hasClickableTagsInLayout = layoutContent.includes('href={`/blog/tags/${tag}`}');
      addTest(
        'Blog post layout has clickable tags',
        hasClickableTagsInLayout,
        'Clickable tag links not found in blog post layout'
      );
      
    } catch (error) {
      addTest(
        'Blog post layout has clickable tags',
        false,
        `Error reading blog post layout: ${error.message}`
      );
    }

    // Test 7: Check if test file exists
    try {
      const testPath = join(projectRoot, 'src/pages/blog/tags/__tests__/[tag].test.ts');
      const testContent = await readFile(testPath, 'utf-8');
      
      addTest(
        'Tag functionality tests exist',
        testContent.length > 0,
        'Tag test file not found or empty'
      );
      
    } catch (error) {
      addTest(
        'Tag functionality tests exist',
        false,
        `Error reading test file: ${error.message}`
      );
    }

    // Test 8: Verify sample blog posts have tags
    try {
      const blogContentPath = join(projectRoot, 'src/content/blog');
      const blogFiles = await readdir(blogContentPath);
      const mdFiles = blogFiles.filter(file => file.endsWith('.md'));
      
      let postsWithTags = 0;
      for (const file of mdFiles) {
        const content = await readFile(join(blogContentPath, file), 'utf-8');
        if (content.includes('tags:')) {
          postsWithTags++;
        }
      }
      
      addTest(
        'Sample blog posts have tags',
        postsWithTags > 0,
        `No blog posts found with tags (checked ${mdFiles.length} files)`
      );
      
    } catch (error) {
      addTest(
        'Sample blog posts have tags',
        false,
        `Error checking blog posts: ${error.message}`
      );
    }

  } catch (error) {
    console.error('Error during testing:', error);
  }

  // Print summary
  console.log('\n📊 Test Summary:');
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📝 Total: ${results.tests.length}`);
  
  if (results.failed > 0) {
    console.log('\n🔍 Failed Tests:');
    results.tests
      .filter(test => !test.passed)
      .forEach(test => {
        console.log(`   • ${test.name}: ${test.message}`);
      });
  }
  
  const success = results.failed === 0;
  console.log(`\n${success ? '🎉' : '💥'} Tag functionality ${success ? 'working correctly' : 'has issues'}`);
  
  return success;
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testTagFunctionality()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Test execution failed:', error);
      process.exit(1);
    });
}

export { testTagFunctionality };