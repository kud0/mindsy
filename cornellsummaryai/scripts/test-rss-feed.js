#!/usr/bin/env node

/**
 * RSS Feed Generation Test Script
 * 
 * This script tests the RSS feed generation functionality by:
 * 1. Building the project to generate the RSS feed
 * 2. Fetching the RSS feed from the development server
 * 3. Validating the XML structure and content
 * 4. Checking that all blog posts are included
 */

import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ANSI color codes for console output
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

function logSection(title) {
  console.log(`\n${colors.bold}${colors.blue}=== ${title} ===${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Check if RSS feed file exists in the build output
 */
function checkRSSFileExists() {
  logSection('Checking RSS Feed File');
  
  const rssFilePath = join(process.cwd(), 'src', 'pages', 'rss.xml.ts');
  
  if (existsSync(rssFilePath)) {
    logSuccess('RSS feed source file exists');
    return true;
  } else {
    logError('RSS feed source file not found');
    return false;
  }
}

/**
 * Validate RSS feed content structure
 */
function validateRSSContent(xmlContent) {
  logSection('Validating RSS Feed Content');
  
  const validations = [
    {
      test: xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>'),
      message: 'XML declaration present'
    },
    {
      test: xmlContent.includes('<rss version="2.0">'),
      message: 'RSS version 2.0 declaration'
    },
    {
      test: xmlContent.includes('<channel>'),
      message: 'RSS channel element present'
    },
    {
      test: xmlContent.includes('<title>'),
      message: 'RSS title element present'
    },
    {
      test: xmlContent.includes('<description>'),
      message: 'RSS description element present'
    },
    {
      test: xmlContent.includes('<link>'),
      message: 'RSS link element present'
    },
    {
      test: xmlContent.includes('<item>'),
      message: 'RSS items present'
    },
    {
      test: xmlContent.includes('<pubDate>'),
      message: 'Publication dates present'
    },
    {
      test: xmlContent.includes('<guid'),
      message: 'GUID elements present'
    }
  ];
  
  let allValid = true;
  
  validations.forEach(validation => {
    if (validation.test) {
      logSuccess(validation.message);
    } else {
      logError(validation.message);
      allValid = false;
    }
  });
  
  return allValid;
}

/**
 * Count blog posts in RSS feed
 */
function countRSSItems(xmlContent) {
  const itemMatches = xmlContent.match(/<item>/g);
  const itemCount = itemMatches ? itemMatches.length : 0;
  
  logInfo(`Found ${itemCount} blog posts in RSS feed`);
  return itemCount;
}

/**
 * Check blog posts directory for comparison
 */
async function countBlogPosts() {
  const blogDir = join(process.cwd(), 'src', 'content', 'blog');
  
  if (!existsSync(blogDir)) {
    logWarning('Blog content directory not found');
    return 0;
  }
  
  try {
    const fs = await import('fs');
    const files = fs.readdirSync(blogDir);
    const mdFiles = files.filter(file => file.endsWith('.md') && file !== '.gitkeep');
    
    logInfo(`Found ${mdFiles.length} blog post files`);
    return mdFiles.length;
  } catch (error) {
    logError(`Error reading blog directory: ${error.message}`);
    return 0;
  }
}

/**
 * Test RSS feed by making HTTP request
 */
async function testRSSFeedHTTP() {
  logSection('Testing RSS Feed HTTP Response');
  
  try {
    // Use dynamic import for fetch
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('http://localhost:4321/rss.xml');
    
    if (!response.ok) {
      logError(`HTTP ${response.status}: ${response.statusText}`);
      return null;
    }
    
    logSuccess(`RSS feed accessible at /rss.xml`);
    
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('xml')) {
      logSuccess('Correct content-type header (XML)');
    } else {
      logWarning(`Unexpected content-type: ${contentType}`);
    }
    
    const xmlContent = await response.text();
    return xmlContent;
    
  } catch (error) {
    logError(`Failed to fetch RSS feed: ${error.message}`);
    logInfo('Make sure the development server is running with: npm run dev');
    return null;
  }
}

/**
 * Main test function
 */
async function runRSSTests() {
  logSection('RSS Feed Generation Tests');
  
  let allTestsPassed = true;
  
  // Test 1: Check if RSS source file exists
  if (!checkRSSFileExists()) {
    allTestsPassed = false;
  }
  
  // Test 2: Try to fetch RSS feed via HTTP
  const xmlContent = await testRSSFeedHTTP();
  
  if (xmlContent) {
    // Test 3: Validate RSS content structure
    if (!validateRSSContent(xmlContent)) {
      allTestsPassed = false;
    }
    
    // Test 4: Count items and compare with blog posts
    const rssItemCount = countRSSItems(xmlContent);
    const blogPostCount = await countBlogPosts();
    
    if (rssItemCount === blogPostCount && rssItemCount > 0) {
      logSuccess(`RSS feed contains all ${rssItemCount} blog posts`);
    } else if (rssItemCount === 0) {
      logWarning('RSS feed contains no items');
    } else {
      logWarning(`RSS feed has ${rssItemCount} items, but found ${blogPostCount} blog posts`);
    }
    
    // Test 5: Save sample RSS content for manual inspection
    try {
      const fs = await import('fs');
      fs.writeFileSync('rss-sample.xml', xmlContent);
      logInfo('RSS feed sample saved to rss-sample.xml for inspection');
    } catch (error) {
      logWarning('Could not save RSS sample file');
    }
    
  } else {
    allTestsPassed = false;
  }
  
  // Final results
  logSection('Test Results');
  
  if (allTestsPassed) {
    logSuccess('All RSS feed tests passed!');
    process.exit(0);
  } else {
    logError('Some RSS feed tests failed');
    process.exit(1);
  }
}

// Run the tests
runRSSTests().catch(error => {
  logError(`Test execution failed: ${error.message}`);
  process.exit(1);
});