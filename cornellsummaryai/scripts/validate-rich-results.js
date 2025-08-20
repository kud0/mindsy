#!/usr/bin/env node

/**
 * Rich Results Validation Script
 * 
 * This script helps validate structured data for Google's Rich Results
 * by providing URLs and instructions for manual testing with Google's tools.
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function extractBlogPosts() {
  const blogDir = join(__dirname, '..', 'src', 'content', 'blog');
  const blogFiles = readdirSync(blogDir).filter(file => file.endsWith('.md'));
  
  const posts = [];
  
  for (const file of blogFiles) {
    const filepath = join(blogDir, file);
    const content = readFileSync(filepath, 'utf-8');
    
    // Extract frontmatter
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const slug = file.replace('.md', '');
      posts.push({
        slug,
        filename: file,
        url: `/blog/${slug}`
      });
    }
  }
  
  return posts;
}

function generateTestInstructions() {
  log(`${colors.bold}🔍 Rich Results Testing Instructions${colors.reset}`, 'blue');
  log('=' * 60);
  
  log('\n📋 Manual Testing Steps:', 'cyan');
  log('1. Start your development server: npm run dev');
  log('2. Visit each blog post URL listed below');
  log('3. Copy the full URL from your browser');
  log('4. Test with Google\'s Rich Results Test tool');
  log('5. Test with Schema.org validator');
  
  log('\n🔗 Testing Tools:', 'cyan');
  log('• Google Rich Results Test: https://search.google.com/test/rich-results', 'blue');
  log('• Schema.org Validator: https://validator.schema.org/', 'blue');
  log('• Facebook Sharing Debugger: https://developers.facebook.com/tools/debug/', 'blue');
  log('• Twitter Card Validator: https://cards-dev.twitter.com/validator', 'blue');
  
  const posts = extractBlogPosts();
  
  log('\n📄 Blog Posts to Test:', 'cyan');
  if (posts.length === 0) {
    log('❌ No blog posts found!', 'red');
    return;
  }
  
  posts.forEach((post, index) => {
    log(`${index + 1}. ${post.filename}`, 'yellow');
    log(`   Local URL: http://localhost:4321${post.url}`, 'blue');
    log(`   Production URL: https://your-domain.com${post.url}`, 'blue');
  });
  
  log('\n✅ What to Look For:', 'cyan');
  log('• JSON-LD structured data is detected');
  log('• Article schema is valid');
  log('• Open Graph tags are present');
  log('• Twitter Card tags are present');
  log('• No structured data errors');
  log('• Rich snippets preview looks correct');
  
  log('\n⚠️  Common Issues to Check:', 'yellow');
  log('• Missing required properties');
  log('• Invalid date formats');
  log('• Broken image URLs');
  log('• Missing author information');
  log('• Incorrect URL formats');
}

function generateCurlCommands() {
  log(`\n${colors.bold}🔧 Automated Testing Commands${colors.reset}`, 'blue');
  log('=' * 40);
  
  const posts = extractBlogPosts();
  
  log('\n📡 Test with curl (after starting dev server):', 'cyan');
  posts.forEach((post, index) => {
    log(`\n${index + 1}. Test ${post.filename}:`);
    log(`curl -s "http://localhost:4321${post.url}" | grep -E "(application/ld\\+json|og:|twitter:)"`, 'blue');
  });
  
  log('\n🔍 Extract JSON-LD only:', 'cyan');
  posts.forEach((post, index) => {
    log(`\n${index + 1}. Extract JSON-LD from ${post.filename}:`);
    log(`curl -s "http://localhost:4321${post.url}" | grep -oP '(?<=<script type="application/ld\\+json">).*?(?=</script>)' | jq .`, 'blue');
  });
}

function validateLocalStructuredData() {
  log(`\n${colors.bold}🧪 Local Structured Data Validation${colors.reset}`, 'blue');
  log('=' * 45);
  
  // Read the BlogPostLayout to extract JSON-LD generation logic
  const layoutPath = join(__dirname, '..', 'src', 'layouts', 'BlogPostLayout.astro');
  
  try {
    const layoutContent = readFileSync(layoutPath, 'utf-8');
    
    // Check if JSON-LD is implemented
    if (layoutContent.includes('application/ld+json')) {
      log('✅ JSON-LD structured data is implemented', 'green');
    } else {
      log('❌ JSON-LD structured data is missing', 'red');
    }
    
    // Check for required schema.org properties
    const requiredProperties = [
      '@context',
      '@type',
      'headline',
      'description',
      'author',
      'datePublished',
      'image',
      'url',
      'publisher'
    ];
    
    let foundProperties = 0;
    for (const prop of requiredProperties) {
      if (layoutContent.includes(`"${prop}"`)) {
        foundProperties++;
      }
    }
    
    log(`📊 Schema.org properties found: ${foundProperties}/${requiredProperties.length}`, 
        foundProperties === requiredProperties.length ? 'green' : 'yellow');
    
    // Check for Open Graph tags
    if (layoutContent.includes('property="og:')) {
      log('✅ Open Graph tags are implemented', 'green');
    } else {
      log('❌ Open Graph tags are missing', 'red');
    }
    
    // Check for Twitter Card tags
    if (layoutContent.includes('name="twitter:')) {
      log('✅ Twitter Card tags are implemented', 'green');
    } else {
      log('❌ Twitter Card tags are missing', 'red');
    }
    
    // Check for canonical URL
    if (layoutContent.includes('rel="canonical"')) {
      log('✅ Canonical URL is implemented', 'green');
    } else {
      log('❌ Canonical URL is missing', 'red');
    }
    
  } catch (error) {
    log(`❌ Error reading BlogPostLayout: ${error.message}`, 'red');
  }
}

function main() {
  generateTestInstructions();
  generateCurlCommands();
  validateLocalStructuredData();
  
  log(`\n${colors.bold}🎯 Next Steps${colors.reset}`, 'cyan');
  log('1. Run: npm run dev');
  log('2. Test each blog post URL with the tools above');
  log('3. Fix any issues found in the structured data');
  log('4. Re-test until all validations pass');
  log('5. Deploy and test production URLs');
  
  log(`\n${colors.bold}📚 Additional Resources${colors.reset}`, 'cyan');
  log('• Google Search Central: https://developers.google.com/search', 'blue');
  log('• Schema.org Documentation: https://schema.org/Article', 'blue');
  log('• Open Graph Protocol: https://ogp.me/', 'blue');
  log('• Twitter Cards Guide: https://developer.twitter.com/en/docs/twitter-for-websites/cards', 'blue');
}

main();