/**
 * GitHub Account Loading Performance Test
 * 
 * This script tests the loading performance of the GitHub account section on the account page.
 * It verifies that:
 * 1. The account page loads without JavaScript errors
 * 2. The GitHub account section does not display an infinite loading state
 * 3. Measures and compares page load times
 */

import puppeteer from 'puppeteer';

// Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ACCOUNT_PAGE_URL = `${BASE_URL}/dashboard/account`;
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'password123';

// Performance metrics to collect
const METRICS = {
  FIRST_PAINT: 'first-contentful-paint',
  DOM_CONTENT_LOADED: 'DOMContentLoaded',
  LOAD: 'load',
  LARGEST_CONTENTFUL_PAINT: 'largest-contentful-paint',
  FIRST_INPUT_DELAY: 'first-input-delay',
};

async function runTest() {
  console.log('Starting GitHub Account Loading Performance Test');
  
  // Launch browser
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Enable performance metrics collection
    await page.evaluateOnNewDocument(() => {
      window.performanceMetrics = {
        jsErrors: [],
        loadTimes: {},
        githubSectionVisible: false,
        infiniteLoadingState: false
      };
      
      // Capture JS errors
      window.addEventListener('error', (error) => {
        window.performanceMetrics.jsErrors.push({
          message: error.message,
          source: error.filename,
          lineno: error.lineno,
          colno: error.colno,
          timestamp: Date.now()
        });
      });
      
      // Capture load times
      ['DOMContentLoaded', 'load'].forEach(event => {
        window.addEventListener(event, () => {
          window.performanceMetrics.loadTimes[event] = Date.now();
        });
      });
    });
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 800 });
    
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto(`${BASE_URL}/auth/login`, { waitUntil: 'networkidle2' });
    
    // Login
    console.log('Logging in...');
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', TEST_PASSWORD);
    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle2' })
    ]);
    
    // Navigate to account page and measure performance
    console.log('Navigating to account page...');
    const startTime = Date.now();
    
    // Navigate and wait for network to be idle
    await page.goto(ACCOUNT_PAGE_URL, { waitUntil: 'networkidle2' });
    
    // Wait for GitHub account section to load
    await page.waitForSelector('#github-account-section', { timeout: 10000 });
    
    const loadTime = Date.now() - startTime;
    console.log(`Account page loaded in ${loadTime}ms`);
    
    // Check for JavaScript errors
    const jsErrors = await page.evaluate(() => window.performanceMetrics.jsErrors);
    if (jsErrors.length > 0) {
      console.error('JavaScript errors detected:');
      jsErrors.forEach(error => {
        console.error(`- ${error.message} (${error.source}:${error.lineno}:${error.colno})`);
      });
    } else {
      console.log('No JavaScript errors detected');
    }
    
    // Check if GitHub section is in infinite loading state
    const isInfiniteLoading = await page.evaluate(() => {
      // Check if loading element is visible after 5 seconds
      const loadingElement = document.querySelector('#github-loading');
      const connectedElement = document.querySelector('#github-connected');
      const notConnectedElement = document.querySelector('#github-not-connected');
      
      return {
        loadingVisible: loadingElement && !loadingElement.classList.contains('hidden'),
        connectedVisible: connectedElement && !connectedElement.classList.contains('hidden'),
        notConnectedVisible: notConnectedElement && !notConnectedElement.classList.contains('hidden')
      };
    });
    
    if (isInfiniteLoading.loadingVisible) {
      console.error('GitHub account section is in infinite loading state');
    } else {
      console.log('GitHub account section loaded successfully');
      if (isInfiniteLoading.connectedVisible) {
        console.log('GitHub account is connected');
      } else if (isInfiniteLoading.notConnectedVisible) {
        console.log('GitHub account is not connected');
      }
    }
    
    // Collect performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const metrics = {};
      
      // Get performance entries
      const perfEntries = performance.getEntriesByType('navigation');
      if (perfEntries.length > 0) {
        const navEntry = perfEntries[0];
        metrics.domContentLoaded = navEntry.domContentLoadedEventEnd - navEntry.startTime;
        metrics.load = navEntry.loadEventEnd - navEntry.startTime;
        metrics.domInteractive = navEntry.domInteractive - navEntry.startTime;
        metrics.firstByte = navEntry.responseStart - navEntry.requestStart;
      }
      
      // Get paint metrics
      const paintMetrics = performance.getEntriesByType('paint');
      paintMetrics.forEach(paint => {
        if (paint.name === 'first-paint') {
          metrics.firstPaint = paint.startTime;
        }
        if (paint.name === 'first-contentful-paint') {
          metrics.firstContentfulPaint = paint.startTime;
        }
      });
      
      return metrics;
    });
    
    console.log('Performance metrics:');
    console.log(`- First Paint: ${performanceMetrics.firstPaint?.toFixed(2)}ms`);
    console.log(`- First Contentful Paint: ${performanceMetrics.firstContentfulPaint?.toFixed(2)}ms`);
    console.log(`- DOM Interactive: ${performanceMetrics.domInteractive?.toFixed(2)}ms`);
    console.log(`- DOM Content Loaded: ${performanceMetrics.domContentLoaded?.toFixed(2)}ms`);
    console.log(`- Load Complete: ${performanceMetrics.load?.toFixed(2)}ms`);
    
    // Test passed if:
    // 1. No JavaScript errors
    // 2. GitHub section is not in infinite loading state
    const testPassed = jsErrors.length === 0 && !isInfiniteLoading.loadingVisible;
    
    if (testPassed) {
      console.log('✅ Test PASSED: GitHub account section loads correctly without JavaScript errors');
    } else {
      console.error('❌ Test FAILED: Issues detected with GitHub account section loading');
    }
    
    return testPassed;
    
  } catch (error) {
    console.error('Test error:', error);
    return false;
  } finally {
    await browser.close();
  }
}

// Run the test if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  runTest()
    .then(passed => {
      process.exit(passed ? 0 : 1);
    })
    .catch(error => {
      console.error('Unhandled error:', error);
      process.exit(1);
    });
}

// Export for use in other modules
export { runTest };