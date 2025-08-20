#!/usr/bin/env node

/**
 * Enhanced API Performance Benchmarking Tool
 * 
 * This script benchmarks the performance of API endpoints by making multiple requests
 * and measuring response times, success rates, and detailed metrics.
 * 
 * Usage:
 *   node scripts/benchmark.js [endpoint] [method] [data] [iterations] [concurrency] [warmup] [delay]
 * 
 * Examples:
 *   node scripts/benchmark.js health GET "" 10 1
 *   node scripts/benchmark.js generate POST '{"audioFilePath":"test.mp3","lectureTitle":"Test"}' 5 2 3 100
 *   node scripts/benchmark.js metrics GET "" 20 5 2 50
 * 
 * Options:
 *   endpoint    - API endpoint to test (e.g., 'health', 'generate')
 *   method      - HTTP method (GET, POST, PUT, DELETE)
 *   data        - JSON string with request body data
 *   iterations  - Number of requests to make
 *   concurrency - Number of concurrent requests
 *   warmup      - Number of warmup requests before benchmarking (optional)
 *   delay       - Delay between batches in ms (optional)
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Get current file directory (ES modules don't have __dirname)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default values
const DEFAULT_BASE_URL = 'http://localhost:3000/api';
const DEFAULT_ENDPOINT = 'health';
const DEFAULT_METHOD = 'GET';
const DEFAULT_ITERATIONS = 5;
const DEFAULT_CONCURRENCY = 1;
const DEFAULT_WARMUP = 0;
const DEFAULT_DELAY = 0;

// Parse command line arguments
const endpoint = process.argv[2] || DEFAULT_ENDPOINT;
const method = process.argv[3] || DEFAULT_METHOD;
const dataStr = process.argv[4] || '""';
const iterations = parseInt(process.argv[5] || DEFAULT_ITERATIONS, 10);
const concurrency = parseInt(process.argv[6] || DEFAULT_CONCURRENCY, 10);
const warmup = parseInt(process.argv[7] || DEFAULT_WARMUP, 10);
const delay = parseInt(process.argv[8] || DEFAULT_DELAY, 10);

// Parse data
const data = dataStr ? JSON.parse(dataStr) : undefined;

// Construct the full URL
const baseUrl = process.env.API_BASE_URL || DEFAULT_BASE_URL;
const url = `${baseUrl}/${endpoint}`;

// Get authentication token if available
const authToken = process.env.AUTH_TOKEN;

// Prepare request options
const getOptions = () => ({
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(authToken ? { 'Authorization': `Bearer ${authToken}` } : {}),
  },
  ...(method !== 'GET' && data ? { body: JSON.stringify(data) } : {}),
});

// Print benchmark configuration
console.log('\nAPI Benchmark Configuration:');
console.log('==========================');
console.log(`Endpoint:    ${method} ${url}`);
console.log(`Iterations:  ${iterations}`);
console.log(`Concurrency: ${concurrency}`);
console.log(`Warmup:      ${warmup}`);
console.log(`Delay:       ${delay}ms`);
if (data) {
  console.log(`\nRequest data: ${JSON.stringify(data, null, 2)}`);
}

// Sleep function for delays
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Make a single request and measure performance
async function makeRequest(index, isWarmup = false) {
  const startTime = performance.now();
  let success = false;
  let statusCode = 0;
  let responseTime = 0;
  let responseSize = 0;
  let error = null;
  let headers = {};
  let serverTiming = null;
  
  try {
    const response = await fetch(url, getOptions());
    statusCode = response.status;
    success = response.ok;
    
    // Extract headers
    response.headers.forEach((value, name) => {
      headers[name.toLowerCase()] = value;
    });
    
    // Extract server timing if available
    serverTiming = headers['server-timing'] || headers['x-response-time'];
    
    // Read response body to ensure complete request cycle
    const responseBody = await response.text();
    responseSize = responseBody.length;
    
    responseTime = performance.now() - startTime;
  } catch (err) {
    error = err;
    responseTime = performance.now() - startTime;
  }
  
  return {
    index,
    isWarmup,
    success,
    statusCode,
    responseTime,
    responseSize,
    serverTiming,
    timestamp: new Date().toISOString(),
    error: error ? error.message : null,
  };
}

// Run benchmark with specified concurrency
async function runBenchmark() {
  const results = [];
  const warmupResults = [];
  
  // System info for context
  const systemInfo = {
    platform: os.platform(),
    release: os.release(),
    cpus: os.cpus().length,
    totalMemory: Math.round(os.totalmem() / (1024 * 1024)) + ' MB',
    freeMemory: Math.round(os.freemem() / (1024 * 1024)) + ' MB',
    nodeVersion: process.version,
  };
  
  // Perform warmup requests if specified
  if (warmup > 0) {
    console.log(`\nPerforming ${warmup} warmup requests...`);
    
    for (let i = 0; i < warmup; i++) {
      const result = await makeRequest(i, true);
      warmupResults.push(result);
      process.stdout.write('.');
    }
    
    console.log('\nWarmup completed');
    
    // Optional delay after warmup
    if (delay > 0) {
      console.log(`Waiting ${delay}ms before starting benchmark...`);
      await sleep(delay);
    }
  }
  
  // Start the actual benchmark
  console.log('\nStarting benchmark...');
  const startTime = performance.now();
  
  // Run iterations in batches based on concurrency
  for (let i = 0; i < iterations; i += concurrency) {
    const batch = [];
    
    // Create a batch of concurrent requests
    for (let j = 0; j < concurrency && i + j < iterations; j++) {
      batch.push(makeRequest(i + j));
    }
    
    // Wait for all requests in the batch to complete
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
    
    // Log progress
    const completed = Math.min(i + concurrency, iterations);
    const percent = Math.round((completed / iterations) * 100);
    process.stdout.write(`\rProgress: ${completed}/${iterations} (${percent}%)`);
    
    // Add delay between batches if specified
    if (delay > 0 && i + concurrency < iterations) {
      await sleep(delay);
    }
  }
  
  const totalTime = performance.now() - startTime;
  console.log('\nBenchmark completed');
  
  // Calculate statistics
  const successCount = results.filter(r => r.success).length;
  const successRate = (successCount / iterations) * 100;
  
  const responseTimes = results.map(r => r.responseTime);
  const minTime = Math.min(...responseTimes);
  const maxTime = Math.max(...responseTimes);
  const avgTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
  const totalBytes = results.reduce((sum, r) => sum + (r.responseSize || 0), 0);
  
  // Calculate standard deviation
  const variance = responseTimes.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / responseTimes.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate percentiles
  const sortedTimes = [...responseTimes].sort((a, b) => a - b);
  const p50 = sortedTimes[Math.floor(sortedTimes.length * 0.5)];
  const p75 = sortedTimes[Math.floor(sortedTimes.length * 0.75)];
  const p90 = sortedTimes[Math.floor(sortedTimes.length * 0.9)];
  const p95 = sortedTimes[Math.floor(sortedTimes.length * 0.95)];
  const p99 = sortedTimes[Math.floor(sortedTimes.length * 0.99)];
  
  // Calculate throughput metrics
  const requestsPerSecond = (iterations / (totalTime / 1000));
  const bytesPerSecond = totalBytes / (totalTime / 1000);
  
  // Group results by status code
  const statusCodes = {};
  results.forEach(r => {
    statusCodes[r.statusCode] = (statusCodes[r.statusCode] || 0) + 1;
  });
  
  // Prepare benchmark report
  const report = {
    endpoint: `${method} ${url}`,
    timestamp: new Date().toISOString(),
    systemInfo,
    config: {
      iterations,
      concurrency,
      warmup,
      delay,
    },
    results: {
      totalTime: totalTime.toFixed(2),
      requestsPerSecond: requestsPerSecond.toFixed(2),
      bytesPerSecond: bytesPerSecond.toFixed(2),
      totalBytes,
      successRate: successRate.toFixed(2),
      statusCodes,
      responseTimes: {
        min: minTime.toFixed(2),
        max: maxTime.toFixed(2),
        avg: avgTime.toFixed(2),
        stdDev: stdDev.toFixed(2),
        p50: p50.toFixed(2),
        p75: p75.toFixed(2),
        p90: p90.toFixed(2),
        p95: p95.toFixed(2),
        p99: p99.toFixed(2),
      },
    },
    details: results,
    warmup: warmupResults,
  };
  
  // Print report summary
  console.log('\nBenchmark Results:');
  console.log('=================');
  console.log(`Endpoint:        ${report.endpoint}`);
  console.log(`Timestamp:       ${report.timestamp}`);
  console.log(`Total Time:      ${report.results.totalTime}ms`);
  console.log(`Requests/sec:    ${report.results.requestsPerSecond}`);
  console.log(`Transfer Rate:   ${(report.results.bytesPerSecond / 1024).toFixed(2)} KB/sec`);
  console.log(`Success Rate:    ${report.results.successRate}%`);
  
  console.log('\nStatus Codes:');
  Object.entries(statusCodes).forEach(([code, count]) => {
    const percent = ((count / iterations) * 100).toFixed(1);
    console.log(`  ${code}: ${count} (${percent}%)`);
  });
  
  console.log('\nResponse Times (ms):');
  console.log(`  Min:     ${report.results.responseTimes.min}`);
  console.log(`  Max:     ${report.results.responseTimes.max}`);
  console.log(`  Average: ${report.results.responseTimes.avg}`);
  console.log(`  Std Dev: ${report.results.responseTimes.stdDev}`);
  console.log(`  P50:     ${report.results.responseTimes.p50}`);
  console.log(`  P75:     ${report.results.responseTimes.p75}`);
  console.log(`  P90:     ${report.results.responseTimes.p90}`);
  console.log(`  P95:     ${report.results.responseTimes.p95}`);
  console.log(`  P99:     ${report.results.responseTimes.p99}`);
  
  // Generate histogram
  console.log('\nResponse Time Distribution:');
  const histogramBuckets = 10;
  const bucketSize = (maxTime - minTime) / histogramBuckets;
  
  for (let i = 0; i < histogramBuckets; i++) {
    const bucketStart = minTime + (i * bucketSize);
    const bucketEnd = bucketStart + bucketSize;
    const count = responseTimes.filter(t => t >= bucketStart && t < bucketEnd).length;
    const percent = (count / iterations) * 100;
    const bar = '#'.repeat(Math.round(percent / 2));
    
    console.log(`  ${bucketStart.toFixed(0)}-${bucketEnd.toFixed(0)}ms: ${bar} ${count} (${percent.toFixed(1)}%)`);
  }
  
  // Save report to file
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = path.join(__dirname, '../.benchmarks');
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const outputFile = path.join(outputDir, `benchmark-${endpoint}-${timestamp}.json`);
  fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to ${outputFile}`);
  
  // Generate HTML report
  const htmlReport = generateHtmlReport(report);
  const htmlFile = path.join(outputDir, `benchmark-${endpoint}-${timestamp}.html`);
  fs.writeFileSync(htmlFile, htmlReport);
  console.log(`Interactive HTML report saved to ${htmlFile}`);
  
  return report;
}

// Generate HTML report with charts
function generateHtmlReport(report) {
  const chartData = JSON.stringify(report);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Benchmark Report - ${report.endpoint}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
    }
    h1, h2, h3 {
      color: #2c3e50;
    }
    .container {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      padding: 20px;
      flex: 1;
      min-width: 300px;
    }
    .chart-container {
      height: 300px;
      margin-bottom: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background-color: #f8f9fa;
    }
    .metric {
      font-size: 24px;
      font-weight: bold;
      margin: 10px 0;
    }
    .metric-label {
      font-size: 14px;
      color: #666;
    }
    .success {
      color: #28a745;
    }
    .warning {
      color: #ffc107;
    }
    .danger {
      color: #dc3545;
    }
  </style>
</head>
<body>
  <h1>API Benchmark Report</h1>
  <p>Endpoint: <strong>${report.endpoint}</strong> | Generated: ${report.timestamp}</p>
  
  <div class="container">
    <div class="card">
      <h2>Summary</h2>
      <div class="metric">${report.results.requestsPerSecond} req/sec</div>
      <div class="metric-label">Throughput</div>
      
      <div class="metric ${parseInt(report.results.successRate) > 95 ? 'success' : parseInt(report.results.successRate) > 80 ? 'warning' : 'danger'}">
        ${report.results.successRate}%
      </div>
      <div class="metric-label">Success Rate</div>
      
      <div class="metric">${report.results.responseTimes.avg}ms</div>
      <div class="metric-label">Average Response Time</div>
    </div>
    
    <div class="card">
      <h2>Configuration</h2>
      <table>
        <tr><th>Iterations</th><td>${report.config.iterations}</td></tr>
        <tr><th>Concurrency</th><td>${report.config.concurrency}</td></tr>
        <tr><th>Warmup Requests</th><td>${report.config.warmup}</td></tr>
        <tr><th>Delay Between Batches</th><td>${report.config.delay}ms</td></tr>
        <tr><th>Total Duration</th><td>${report.results.totalTime}ms</td></tr>
      </table>
    </div>
  </div>
  
  <div class="container">
    <div class="card">
      <h2>Response Time Distribution</h2>
      <div class="chart-container">
        <canvas id="responseTimeChart"></canvas>
      </div>
    </div>
    
    <div class="card">
      <h2>Status Codes</h2>
      <div class="chart-container">
        <canvas id="statusCodeChart"></canvas>
      </div>
    </div>
  </div>
  
  <div class="container">
    <div class="card">
      <h2>Response Time Percentiles</h2>
      <table>
        <tr><th>Minimum</th><td>${report.results.responseTimes.min}ms</td></tr>
        <tr><th>P50 (Median)</th><td>${report.results.responseTimes.p50}ms</td></tr>
        <tr><th>P75</th><td>${report.results.responseTimes.p75}ms</td></tr>
        <tr><th>P90</th><td>${report.results.responseTimes.p90}ms</td></tr>
        <tr><th>P95</th><td>${report.results.responseTimes.p95}ms</td></tr>
        <tr><th>P99</th><td>${report.results.responseTimes.p99}ms</td></tr>
        <tr><th>Maximum</th><td>${report.results.responseTimes.max}ms</td></tr>
        <tr><th>Standard Deviation</th><td>${report.results.responseTimes.stdDev}ms</td></tr>
      </table>
    </div>
    
    <div class="card">
      <h2>System Information</h2>
      <table>
        <tr><th>Platform</th><td>${report.systemInfo.platform}</td></tr>
        <tr><th>Release</th><td>${report.systemInfo.release}</td></tr>
        <tr><th>CPUs</th><td>${report.systemInfo.cpus}</td></tr>
        <tr><th>Total Memory</th><td>${report.systemInfo.totalMemory}</td></tr>
        <tr><th>Free Memory</th><td>${report.systemInfo.freeMemory}</td></tr>
        <tr><th>Node Version</th><td>${report.systemInfo.nodeVersion}</td></tr>
      </table>
    </div>
  </div>
  
  <div class="container">
    <div class="card">
      <h2>Response Time Timeline</h2>
      <div class="chart-container">
        <canvas id="timelineChart"></canvas>
      </div>
    </div>
  </div>

  <script>
    // Parse the benchmark data
    const reportData = ${chartData};
    
    // Prepare data for charts
    const responseTimeData = reportData.details.map(r => r.responseTime);
    
    // Response time histogram
    const histogramBuckets = 10;
    const minTime = Math.min(...responseTimeData);
    const maxTime = Math.max(...responseTimeData);
    const bucketSize = (maxTime - minTime) / histogramBuckets;
    const histogramLabels = [];
    const histogramData = [];
    
    for (let i = 0; i < histogramBuckets; i++) {
      const bucketStart = minTime + (i * bucketSize);
      const bucketEnd = bucketStart + bucketSize;
      histogramLabels.push(\`\${bucketStart.toFixed(0)}-\${bucketEnd.toFixed(0)}ms\`);
      
      const count = responseTimeData.filter(t => t >= bucketStart && t < bucketEnd).length;
      histogramData.push(count);
    }
    
    // Status code chart
    const statusCodes = Object.keys(reportData.results.statusCodes);
    const statusCodeCounts = statusCodes.map(code => reportData.results.statusCodes[code]);
    
    // Timeline chart
    const timelineLabels = reportData.details.map((_, i) => i + 1);
    const timelineData = reportData.details.map(r => r.responseTime);
    
    // Create charts
    window.addEventListener('load', function() {
      // Response time histogram
      new Chart(document.getElementById('responseTimeChart'), {
        type: 'bar',
        data: {
          labels: histogramLabels,
          datasets: [{
            label: 'Number of Requests',
            data: histogramData,
            backgroundColor: 'rgba(54, 162, 235, 0.5)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Number of Requests'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Response Time'
              }
            }
          }
        }
      });
      
      // Status code chart
      new Chart(document.getElementById('statusCodeChart'), {
        type: 'pie',
        data: {
          labels: statusCodes,
          datasets: [{
            data: statusCodeCounts,
            backgroundColor: [
              'rgba(75, 192, 192, 0.5)',
              'rgba(255, 99, 132, 0.5)',
              'rgba(255, 205, 86, 0.5)',
              'rgba(54, 162, 235, 0.5)',
              'rgba(153, 102, 255, 0.5)'
            ],
            borderColor: [
              'rgba(75, 192, 192, 1)',
              'rgba(255, 99, 132, 1)',
              'rgba(255, 205, 86, 1)',
              'rgba(54, 162, 235, 1)',
              'rgba(153, 102, 255, 1)'
            ],
            borderWidth: 1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
        }
      });
      
      // Timeline chart
      new Chart(document.getElementById('timelineChart'), {
        type: 'line',
        data: {
          labels: timelineLabels,
          datasets: [{
            label: 'Response Time (ms)',
            data: timelineData,
            fill: false,
            borderColor: 'rgba(75, 192, 192, 1)',
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              beginAtZero: true,
              title: {
                display: true,
                text: 'Response Time (ms)'
              }
            },
            x: {
              title: {
                display: true,
                text: 'Request Number'
              }
            }
          }
        }
      });
    });
  </script>
</body>
</html>`;
}

// Run the benchmark
runBenchmark().catch(error => {
  console.error('\nBenchmark failed:', error);
  process.exit(1);
});