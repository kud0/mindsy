#!/usr/bin/env node

/**
 * Blog SEO Meta Tags Verification Script
 * 
 * This script verifies that all blog posts have proper SEO meta tags
 * by checking the generated HTML output.
 */

import { spawn } from 'child_process';
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

function getBlogPosts() {
  const blogDir = join(__dirname, '..', 'src', 'content', 'blog');
  const blogFiles = readdirSync(blogDir).filter(file => file.endsWith('.md'));
  
  return blogFiles.map(file => {
    const slug = file.replace('.md', '');
    return {
      slug,
      filename: file,
      url: `/blog/${slug}`
    };
  });
}

function startDevServer() {
  return new Promise((resolve, reject) => {
    log('🚀 Starting development server...', 'blue');
    
    const server = spawn('npm', ['run', 'dev'], {
      stdio: 'pipe',
      detached: false
    });
    
    let serverReady = false;
    
    server.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('Local:') && !serverReady) {
        serverReady = true;
        log('✅ Development server is ready', 'green');
        setTimeout(() => resolve(server), 2000); // Wait 2 seconds for server to be fully ready
      }
    });
    
    server.stderr.on('data', (data) => {
      const output = data.toString();
      if (output.includes('error') || output.includes('Error')) {
        reject(new Error(`Server error: ${output}`));
      }
    });
    
    server.on('error', (error) => {
      reject(error);
    });
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverReady) {
        server.kill();
        reject(new Error('Server startup timeout'));
      }
    }, 30000);
  });
}

function fetchPageContent(url) {
  return new Promise((resolve, reject) => {
    const curl = spawn('curl', ['-s', `http://localhost:4321${url}`]);
    
    let content = '';
    
    curl.stdout.on('data', (data) => {
      content += data.toString();
    });
    
    curl.on('close', (code) => {
      if (code === 0) {
        resolve(content);
      } else {
        reject(new Error(`curl failed with code ${code}`));
      }
    });
    
    curl.on('error', (error) => {
      reject(error);
    });
  });
}

function validateSEOTags(html, url) {
  const errors = [];
  const warnings = [];
  
  // Check for required meta tags
  const requiredTags = [
    { pattern: /<title>([^<]+)<\/title>/, name: 'title' },
    { pattern: /<meta name="description" content="([^"]+)"/, name: 'meta description' },
    { pattern: /<link rel="canonical" href="([^"]+)"/, name: 'canonical URL' },
    { pattern: /<meta property="og:title" content="([^"]+)"/, name: 'Open Graph title' },
    { pattern: /<meta property="og:description" content="([^"]+)"/, name: 'Open Graph description' },
    { pattern: /<meta property="og:image" content="([^"]+)"/, name: 'Open Graph image' },
    { pattern: /<meta property="og:url" content="([^"]+)"/, name: 'Open Graph URL' },
    { pattern: /<meta name="twitter:card" content="([^"]+)"/, name: 'Twitter Card' },
    { pattern: /<meta name="twitter:title" content="([^"]+)"/, name: 'Twitter title' },
    { pattern: /<meta name="twitter:description" content="([^"]+)"/, name: 'Twitter description' },
    { pattern: /<meta name="twitter:image" content="([^"]+)"/, name: 'Twitter image' }
  ];
  
  for (const tag of requiredTags) {
    const match = html.match(tag.pattern);
    if (!match) {
      errors.push(`Missing ${tag.name}`);
    } else {
      const content = match[1];
      if (!content || content.trim().length === 0) {
        errors.push(`Empty ${tag.name}`);
      }
    }
  }
  
  // Check for JSON-LD structured data
  const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/);
  if (!jsonLdMatch) {
    errors.push('Missing JSON-LD structured data');
  } else {
    try {
      const jsonLd = JSON.parse(jsonLdMatch[1]);
      
      // Validate required JSON-LD fields
      const requiredJsonLdFields = [
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
      
      for (const field of requiredJsonLdFields) {
        if (!(field in jsonLd)) {
          errors.push(`Missing JSON-LD field: ${field}`);
        }
      }
      
      // Validate JSON-LD structure
      if (jsonLd['@context'] !== 'https://schema.org') {
        errors.push('Invalid JSON-LD @context');
      }
      
      if (jsonLd['@type'] !== 'Article') {
        errors.push('Invalid JSON-LD @type (should be Article)');
      }
      
    } catch (error) {
      errors.push(`Invalid JSON-LD format: ${error.message}`);
    }
  }
  
  // Check heading hierarchy
  const h1Count = (html.match(/<h1[^>]*>/g) || []).length;
  if (h1Count === 0) {
    errors.push('Missing H1 tag');
  } else if (h1Count > 1) {
    warnings.push(`Multiple H1 tags found (${h1Count})`);
  }
  
  // Check for proper heading sequence
  const headings = html.match(/<h[1-6][^>]*>/g) || [];
  if (headings.length > 0) {
    const levels = headings.map(h => parseInt(h.match(/h([1-6])/)[1]));
    for (let i = 1; i < levels.length; i++) {
      if (levels[i] > levels[i-1] + 1) {
        warnings.push(`Heading hierarchy skip from h${levels[i-1]} to h${levels[i]}`);
      }
    }
  }
  
  return { errors, warnings };
}

async function testBlogPost(post, serverProcess) {
  log(`\n🔍 Testing: ${post.filename}`, 'blue');
  
  try {
    const html = await fetchPageContent(post.url);
    const validation = validateSEOTags(html, post.url);
    
    if (validation.errors.length === 0 && validation.warnings.length === 0) {
      log('  ✅ All SEO checks passed!', 'green');
      return { errors: 0, warnings: 0 };
    }
    
    if (validation.errors.length > 0) {
      log('  ❌ Errors:', 'red');
      validation.errors.forEach(error => log(`    • ${error}`, 'red'));
    }
    
    if (validation.warnings.length > 0) {
      log('  ⚠️  Warnings:', 'yellow');
      validation.warnings.forEach(warning => log(`    • ${warning}`, 'yellow'));
    }
    
    return { errors: validation.errors.length, warnings: validation.warnings.length };
    
  } catch (error) {
    log(`  ❌ Failed to test ${post.url}: ${error.message}`, 'red');
    return { errors: 1, warnings: 0 };
  }
}

async function main() {
  log(`${colors.bold}🔍 Blog SEO Meta Tags Verification${colors.reset}`, 'blue');
  log('=' * 50);
  
  const posts = getBlogPosts();
  
  if (posts.length === 0) {
    log('❌ No blog posts found!', 'red');
    process.exit(1);
  }
  
  let serverProcess;
  
  try {
    // Start development server
    serverProcess = await startDevServer();
    
    let totalErrors = 0;
    let totalWarnings = 0;
    
    // Test each blog post
    for (const post of posts) {
      const result = await testBlogPost(post, serverProcess);
      totalErrors += result.errors;
      totalWarnings += result.warnings;
    }
    
    // Summary
    log(`\n${colors.bold}📊 Summary${colors.reset}`, 'blue');
    log('=' * 20);
    log(`Blog posts tested: ${posts.length}`);
    log(`Total errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');
    log(`Total warnings: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'green');
    
    if (totalErrors === 0) {
      log('\n🎉 All SEO meta tag tests passed!', 'green');
      process.exit(0);
    } else {
      log('\n❌ SEO meta tag tests failed. Please fix the errors above.', 'red');
      process.exit(1);
    }
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  } finally {
    // Clean up server process
    if (serverProcess) {
      log('\n🛑 Stopping development server...', 'blue');
      serverProcess.kill();
    }
  }
}

// Handle process termination
process.on('SIGINT', () => {
  log('\n🛑 Process interrupted', 'yellow');
  process.exit(1);
});

process.on('SIGTERM', () => {
  log('\n🛑 Process terminated', 'yellow');
  process.exit(1);
});

main();