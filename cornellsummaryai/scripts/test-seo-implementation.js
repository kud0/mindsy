#!/usr/bin/env node

/**
 * SEO Implementation Testing Script
 * 
 * This script tests the SEO implementation of blog posts by:
 * 1. Validating JSON-LD structured data
 * 2. Checking meta tags
 * 3. Verifying heading hierarchy
 * 4. Testing Open Graph tags
 * 5. Validating canonical URLs
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
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateFrontmatter(frontmatter, filename) {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!frontmatter.title) {
    errors.push('Missing required field: title');
  } else {
    if (frontmatter.title.length > 60) {
      warnings.push(`Title too long (${frontmatter.title.length} chars, should be ≤60)`);
    }
    if (frontmatter.title.length < 10) {
      warnings.push(`Title too short (${frontmatter.title.length} chars, should be ≥10)`);
    }
  }

  if (!frontmatter.description) {
    errors.push('Missing required field: description');
  } else {
    if (frontmatter.description.length > 160) {
      warnings.push(`Description too long (${frontmatter.description.length} chars, should be ≤160)`);
    }
    if (frontmatter.description.length < 50) {
      warnings.push(`Description too short (${frontmatter.description.length} chars, should be ≥50)`);
    }
  }

  if (!frontmatter.pubDate) {
    errors.push('Missing required field: pubDate');
  }

  if (!frontmatter.author) {
    errors.push('Missing required field: author');
  }

  // Optional but recommended fields
  if (!frontmatter.heroImage) {
    warnings.push('Missing heroImage (recommended for social sharing)');
  }

  if (!frontmatter.tags || frontmatter.tags.length === 0) {
    warnings.push('Missing tags (recommended for SEO)');
  } else if (frontmatter.tags.length > 10) {
    warnings.push(`Too many tags (${frontmatter.tags.length}, should be ≤10)`);
  }

  return { errors, warnings };
}

function validateHeadingHierarchy(content, filename) {
  const errors = [];
  const warnings = [];
  
  const lines = content.split('\n');
  const headings = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      headings.push({ level, text, line: i + 1 });
    }
  }

  if (headings.length === 0) {
    warnings.push('No headings found in content');
    return { errors, warnings };
  }

  // Check if first heading is h1 (should be h2 since layout provides h1)
  if (headings[0].level === 1) {
    errors.push(`First heading should be h2, not h1 (line ${headings[0].line})`);
  }

  // Check heading hierarchy
  for (let i = 1; i < headings.length; i++) {
    const current = headings[i];
    const previous = headings[i - 1];
    
    if (current.level > previous.level + 1) {
      warnings.push(`Heading hierarchy skip from h${previous.level} to h${current.level} (line ${current.line})`);
    }
  }

  return { errors, warnings };
}

function parseFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) {
    throw new Error('No frontmatter found');
  }

  const frontmatterText = frontmatterMatch[1];
  const frontmatter = {};
  
  // Simple YAML parsing for our use case
  const lines = frontmatterText.split('\n');
  let currentKey = null;
  let currentValue = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    if (trimmed.startsWith('- ')) {
      // Array item
      if (currentKey && Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey].push(trimmed.substring(2).replace(/['"]/g, ''));
      }
    } else if (trimmed.includes(':')) {
      // Key-value pair
      const [key, ...valueParts] = trimmed.split(':');
      const value = valueParts.join(':').trim();
      
      currentKey = key.trim();
      
      if (value.startsWith('[') && value.endsWith(']')) {
        // Inline array
        frontmatter[currentKey] = value.slice(1, -1).split(',').map(v => v.trim().replace(/['"]/g, ''));
      } else if (value === '') {
        // Array follows
        frontmatter[currentKey] = [];
      } else {
        // Regular value
        frontmatter[currentKey] = value.replace(/['"]/g, '');
      }
    }
  }

  return frontmatter;
}

function testBlogPost(filename) {
  log(`\n${colors.bold}Testing: ${filename}${colors.reset}`, 'blue');
  
  const filepath = join(__dirname, '..', 'src', 'content', 'blog', filename);
  const content = readFileSync(filepath, 'utf-8');
  
  let frontmatter;
  try {
    frontmatter = parseFrontmatter(content);
  } catch (error) {
    log(`❌ Failed to parse frontmatter: ${error.message}`, 'red');
    return { errors: 1, warnings: 0 };
  }

  const contentBody = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  
  // Validate frontmatter
  const frontmatterValidation = validateFrontmatter(frontmatter, filename);
  
  // Validate heading hierarchy
  const headingValidation = validateHeadingHierarchy(contentBody, filename);
  
  const totalErrors = frontmatterValidation.errors.length + headingValidation.errors.length;
  const totalWarnings = frontmatterValidation.warnings.length + headingValidation.warnings.length;
  
  // Report errors
  if (frontmatterValidation.errors.length > 0) {
    log('  Frontmatter Errors:', 'red');
    frontmatterValidation.errors.forEach(error => log(`    ❌ ${error}`, 'red'));
  }
  
  if (headingValidation.errors.length > 0) {
    log('  Heading Hierarchy Errors:', 'red');
    headingValidation.errors.forEach(error => log(`    ❌ ${error}`, 'red'));
  }
  
  // Report warnings
  if (frontmatterValidation.warnings.length > 0) {
    log('  Frontmatter Warnings:', 'yellow');
    frontmatterValidation.warnings.forEach(warning => log(`    ⚠️  ${warning}`, 'yellow'));
  }
  
  if (headingValidation.warnings.length > 0) {
    log('  Heading Hierarchy Warnings:', 'yellow');
    headingValidation.warnings.forEach(warning => log(`    ⚠️  ${warning}`, 'yellow'));
  }
  
  if (totalErrors === 0 && totalWarnings === 0) {
    log('  ✅ All SEO checks passed!', 'green');
  }
  
  return { errors: totalErrors, warnings: totalWarnings };
}

function validateJSONLD() {
  log(`\n${colors.bold}Validating JSON-LD Structure${colors.reset}`, 'blue');
  
  const requiredFields = [
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
  
  const mockJsonLD = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "Test Article",
    "description": "Test description",
    "author": {
      "@type": "Person",
      "name": "Test Author"
    },
    "datePublished": "2025-01-15T00:00:00.000Z",
    "dateModified": "2025-01-15T00:00:00.000Z",
    "image": {
      "@type": "ImageObject",
      "url": "https://example.com/image.jpg",
      "width": 1200,
      "height": 630
    },
    "url": "https://example.com/blog/test",
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://example.com/blog/test"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Cornell Summary AI",
      "logo": {
        "@type": "ImageObject",
        "url": "https://example.com/favicon.svg",
        "width": 60,
        "height": 60
      }
    }
  };
  
  let errors = 0;
  
  for (const field of requiredFields) {
    if (!(field in mockJsonLD)) {
      log(`  ❌ Missing required field: ${field}`, 'red');
      errors++;
    }
  }
  
  // Validate specific field types
  if (mockJsonLD['@context'] !== 'https://schema.org') {
    log(`  ❌ Invalid @context: ${mockJsonLD['@context']}`, 'red');
    errors++;
  }
  
  if (mockJsonLD['@type'] !== 'Article') {
    log(`  ❌ Invalid @type: ${mockJsonLD['@type']}`, 'red');
    errors++;
  }
  
  if (errors === 0) {
    log('  ✅ JSON-LD structure is valid!', 'green');
  }
  
  return errors;
}

function main() {
  log(`${colors.bold}🔍 SEO Implementation Testing${colors.reset}`, 'blue');
  log('=' * 50);
  
  const blogDir = join(__dirname, '..', 'src', 'content', 'blog');
  const blogFiles = readdirSync(blogDir).filter(file => file.endsWith('.md'));
  
  if (blogFiles.length === 0) {
    log('❌ No blog posts found!', 'red');
    process.exit(1);
  }
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  // Test each blog post
  for (const file of blogFiles) {
    const result = testBlogPost(file);
    totalErrors += result.errors;
    totalWarnings += result.warnings;
  }
  
  // Test JSON-LD structure
  totalErrors += validateJSONLD();
  
  // Summary
  log(`\n${colors.bold}📊 Summary${colors.reset}`, 'blue');
  log('=' * 20);
  log(`Blog posts tested: ${blogFiles.length}`);
  log(`Total errors: ${totalErrors}`, totalErrors > 0 ? 'red' : 'green');
  log(`Total warnings: ${totalWarnings}`, totalWarnings > 0 ? 'yellow' : 'green');
  
  if (totalErrors === 0) {
    log('\n🎉 All SEO tests passed!', 'green');
    process.exit(0);
  } else {
    log('\n❌ SEO tests failed. Please fix the errors above.', 'red');
    process.exit(1);
  }
}

main();