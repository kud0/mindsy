#!/usr/bin/env node

/**
 * Test script to verify sitemap generation includes blog posts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testSitemapGeneration() {
  console.log('🔍 Testing sitemap generation...\n');

  const sitemapIndexPath = path.join(__dirname, '../dist/client/sitemap-index.xml');
  const sitemapPath = path.join(__dirname, '../dist/client/sitemap-0.xml');

  // Test 1: Check if sitemap-index.xml exists
  console.log('1. Checking sitemap-index.xml exists...');
  if (!fs.existsSync(sitemapIndexPath)) {
    console.error('❌ sitemap-index.xml not found');
    process.exit(1);
  }
  console.log('✅ sitemap-index.xml exists');

  // Test 2: Check if sitemap-0.xml exists
  console.log('2. Checking sitemap-0.xml exists...');
  if (!fs.existsSync(sitemapPath)) {
    console.error('❌ sitemap-0.xml not found');
    process.exit(1);
  }
  console.log('✅ sitemap-0.xml exists');

  // Test 3: Parse and validate sitemap-index.xml
  console.log('3. Validating sitemap-index.xml structure...');
  try {
    const sitemapIndexContent = fs.readFileSync(sitemapIndexPath, 'utf8');
    const sitemapIndexData = await parseStringPromise(sitemapIndexContent);
    
    if (!sitemapIndexData.sitemapindex || !sitemapIndexData.sitemapindex.sitemap) {
      console.error('❌ Invalid sitemap-index.xml structure');
      process.exit(1);
    }
    console.log('✅ sitemap-index.xml has valid structure');
  } catch (error) {
    console.error('❌ Error parsing sitemap-index.xml:', error.message);
    process.exit(1);
  }

  // Test 4: Parse and validate sitemap-0.xml
  console.log('4. Validating sitemap-0.xml structure...');
  try {
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    const sitemapData = await parseStringPromise(sitemapContent);
    
    if (!sitemapData.urlset || !sitemapData.urlset.url) {
      console.error('❌ Invalid sitemap-0.xml structure');
      process.exit(1);
    }
    console.log('✅ sitemap-0.xml has valid structure');
  } catch (error) {
    console.error('❌ Error parsing sitemap-0.xml:', error.message);
    process.exit(1);
  }

  // Test 5: Check if blog posts are included
  console.log('5. Checking if blog posts are included in sitemap...');
  try {
    const sitemapContent = fs.readFileSync(sitemapPath, 'utf8');
    const sitemapData = await parseStringPromise(sitemapContent);
    
    const urls = sitemapData.urlset.url.map(url => url.loc[0]);
    
    const expectedBlogUrls = [
      '/blog/',
      '/blog/building-scalable-apis/',
      '/blog/getting-started-with-astro/',
      '/blog/web-performance-optimization/'
    ];

    const missingUrls = [];
    for (const expectedUrl of expectedBlogUrls) {
      const found = urls.some(url => url.endsWith(expectedUrl));
      if (!found) {
        missingUrls.push(expectedUrl);
      }
    }

    if (missingUrls.length > 0) {
      console.error('❌ Missing blog URLs in sitemap:', missingUrls);
      process.exit(1);
    }

    console.log('✅ All blog posts are included in sitemap');
    console.log(`   Found ${expectedBlogUrls.length} blog URLs`);
    
    // List all blog URLs found
    const blogUrls = urls.filter(url => url.includes('/blog/'));
    console.log('   Blog URLs in sitemap:');
    blogUrls.forEach(url => {
      console.log(`   - ${url}`);
    });

  } catch (error) {
    console.error('❌ Error checking blog posts in sitemap:', error.message);
    process.exit(1);
  }

  // Test 6: Verify sitemap is accessible at standard location
  console.log('6. Verifying sitemap accessibility...');
  const expectedSitemapLocation = path.join(__dirname, '../dist/client/sitemap-index.xml');
  if (!fs.existsSync(expectedSitemapLocation)) {
    console.error('❌ Sitemap not accessible at expected location');
    process.exit(1);
  }
  console.log('✅ Sitemap accessible at /sitemap-index.xml');

  console.log('\n🎉 All sitemap tests passed!');
  console.log('✅ Sitemap generation is working correctly');
  console.log('✅ All blog posts are included in the sitemap');
  console.log('✅ Sitemap follows XML sitemap protocol');
}

// Install xml2js if not available
try {
  await import('xml2js');
} catch (error) {
  console.log('Installing xml2js for XML parsing...');
  const { execSync } = await import('child_process');
  execSync('npm install xml2js', { stdio: 'inherit' });
}

testSitemapGeneration().catch(error => {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
});