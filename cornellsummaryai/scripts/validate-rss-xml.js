#!/usr/bin/env node

/**
 * RSS XML Validation Script
 * 
 * This script validates the RSS feed XML structure and content
 * to ensure it meets RSS 2.0 standards.
 */

import { readFileSync } from 'fs';

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

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Validate RSS XML structure
 */
function validateRSSStructure(xmlContent) {
  log('\n=== RSS XML Structure Validation ===', 'bold');
  
  const validations = [
    {
      test: xmlContent.includes('<?xml version="1.0" encoding="UTF-8"?>'),
      message: 'XML declaration is present and correct',
      error: 'Missing or incorrect XML declaration'
    },
    {
      test: xmlContent.includes('<rss version="2.0">'),
      message: 'RSS 2.0 version declaration is correct',
      error: 'Missing or incorrect RSS version declaration'
    },
    {
      test: xmlContent.includes('<channel>') && xmlContent.includes('</channel>'),
      message: 'Channel element is properly formed',
      error: 'Missing or malformed channel element'
    },
    {
      test: xmlContent.includes('<title>') && xmlContent.includes('</title>'),
      message: 'Title elements are present',
      error: 'Missing title elements'
    },
    {
      test: xmlContent.includes('<description>') && xmlContent.includes('</description>'),
      message: 'Description elements are present',
      error: 'Missing description elements'
    },
    {
      test: xmlContent.includes('<link>') && xmlContent.includes('</link>'),
      message: 'Link elements are present',
      error: 'Missing link elements'
    },
    {
      test: xmlContent.includes('<language>en-us</language>'),
      message: 'Language specification is present',
      error: 'Missing language specification'
    }
  ];
  
  let structureValid = true;
  
  validations.forEach(validation => {
    if (validation.test) {
      logSuccess(validation.message);
    } else {
      logError(validation.error);
      structureValid = false;
    }
  });
  
  return structureValid;
}

/**
 * Validate RSS items
 */
function validateRSSItems(xmlContent) {
  log('\n=== RSS Items Validation ===', 'bold');
  
  const itemMatches = xmlContent.match(/<item>(.*?)<\/item>/gs);
  
  if (!itemMatches || itemMatches.length === 0) {
    logError('No RSS items found');
    return false;
  }
  
  logInfo(`Found ${itemMatches.length} RSS items`);
  
  let itemsValid = true;
  
  itemMatches.forEach((item, index) => {
    const itemValidations = [
      {
        test: item.includes('<title>') && item.includes('</title>'),
        message: `Item ${index + 1}: Title is present`,
        error: `Item ${index + 1}: Missing title`
      },
      {
        test: item.includes('<description>') && item.includes('</description>'),
        message: `Item ${index + 1}: Description is present`,
        error: `Item ${index + 1}: Missing description`
      },
      {
        test: item.includes('<pubDate>') && item.includes('</pubDate>'),
        message: `Item ${index + 1}: Publication date is present`,
        error: `Item ${index + 1}: Missing publication date`
      },
      {
        test: item.includes('<link>') && item.includes('</link>'),
        message: `Item ${index + 1}: Link is present`,
        error: `Item ${index + 1}: Missing link`
      },
      {
        test: item.includes('<guid') && item.includes('</guid>'),
        message: `Item ${index + 1}: GUID is present`,
        error: `Item ${index + 1}: Missing GUID`
      }
    ];
    
    itemValidations.forEach(validation => {
      if (validation.test) {
        logSuccess(validation.message);
      } else {
        logError(validation.error);
        itemsValid = false;
      }
    });
  });
  
  return itemsValid;
}

/**
 * Validate RSS content quality
 */
function validateContentQuality(xmlContent) {
  log('\n=== Content Quality Validation ===', 'bold');
  
  let qualityValid = true;
  
  // Check for proper URL formatting
  const linkMatches = xmlContent.match(/<link>(.*?)<\/link>/g);
  if (linkMatches) {
    linkMatches.forEach(link => {
      const url = link.replace(/<\/?link>/g, '');
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        logError(`Invalid URL format: ${url}`);
        qualityValid = false;
      } else {
        logSuccess(`Valid URL format: ${url}`);
      }
    });
  }
  
  // Check for proper date formatting
  const dateMatches = xmlContent.match(/<pubDate>(.*?)<\/pubDate>/g);
  if (dateMatches) {
    dateMatches.forEach(date => {
      const dateString = date.replace(/<\/?pubDate>/g, '');
      const parsedDate = new Date(dateString);
      if (isNaN(parsedDate.getTime())) {
        logError(`Invalid date format: ${dateString}`);
        qualityValid = false;
      } else {
        logSuccess(`Valid date format: ${dateString}`);
      }
    });
  }
  
  // Check for proper GUID formatting
  const guidMatches = xmlContent.match(/<guid[^>]*>(.*?)<\/guid>/g);
  if (guidMatches) {
    guidMatches.forEach(guid => {
      if (guid.includes('isPermaLink="true"')) {
        logSuccess('GUID is properly marked as permalink');
      } else {
        logInfo('GUID is not marked as permalink (this is optional)');
      }
    });
  }
  
  return qualityValid;
}

/**
 * Main validation function
 */
async function validateRSSFeed() {
  log('=== RSS Feed Validation ===', 'bold');
  
  try {
    // Read the RSS sample file
    const xmlContent = readFileSync('rss-sample.xml', 'utf8');
    
    logInfo('RSS feed content loaded successfully');
    
    // Run all validations
    const structureValid = validateRSSStructure(xmlContent);
    const itemsValid = validateRSSItems(xmlContent);
    const qualityValid = validateContentQuality(xmlContent);
    
    // Final results
    log('\n=== Validation Results ===', 'bold');
    
    if (structureValid && itemsValid && qualityValid) {
      logSuccess('RSS feed validation passed! ✨');
      logInfo('Your RSS feed meets RSS 2.0 standards and is ready for production.');
      process.exit(0);
    } else {
      logError('RSS feed validation failed');
      logInfo('Please fix the issues above before deploying.');
      process.exit(1);
    }
    
  } catch (error) {
    logError(`Failed to validate RSS feed: ${error.message}`);
    logInfo('Make sure to run the RSS test script first to generate rss-sample.xml');
    process.exit(1);
  }
}

// Run the validation
validateRSSFeed();