/**
 * System Metrics API Endpoint
 * 
 * This endpoint provides detailed metrics about the application's performance,
 * including API usage statistics, response times, and system resource utilization.
 * It's designed for monitoring and debugging the backend migration.
 */

import type { APIRoute } from 'astro';
import { supabaseAdmin } from '../../lib/supabase-server';
import { SystemMetrics } from '../../lib/monitoring';
import { config } from '../../lib/config';
import os from 'node:os';

interface MetricsResponse {
  timestamp: string;
  version: string;
  environment: string;
  uptime: number;
  system: {
    memory: {
      total: number;
      free: number;
      used: number;
      usedPercent: number;
    };
    cpu: {
      count: number;
      loadAvg: number[];
    };
  };
  api: {
    requestsTotal: number;
    requestsSuccess: number;
    requestsFailure: number;
    responseTimeAvg: number;
    endpoints: Record<string, {
      count: number;
      responseTimeAvg: number;
    }>;
  };
  database: {
    connectionCount: number;
    queryCount: number;
    avgQueryTime: number;
  };
  storage: {
    totalUploads: number;
    totalDownloads: number;
    totalStorageBytes: number;
  };
  customMetrics: Record<string, any>;
}

export const GET: APIRoute = async ({ request }) => {
  // Check for API key authentication
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  
  // Require API key in production
  if (import.meta.env.PROD && (!apiKey || apiKey !== config.metricsApiKey)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Get system metrics
  const metrics = SystemMetrics.getInstance();
  const metricsData = metrics.getMetrics();
  
  // Get database metrics
  let dbMetrics = {
    connectionCount: 0,
    queryCount: 0,
    avgQueryTime: 0
  };
  
  try {
    // Query for database metrics
    const { data: queryStats } = await supabaseAdmin.rpc('get_query_stats');
    if (queryStats) {
      dbMetrics = {
        connectionCount: queryStats.connection_count || 0,
        queryCount: queryStats.query_count || 0,
        avgQueryTime: queryStats.avg_query_time || 0
      };
    }
  } catch (error) {
    console.error('Failed to fetch database metrics:', error);
  }
  
  // Get storage metrics
  let storageMetrics = {
    totalUploads: 0,
    totalDownloads: 0,
    totalStorageBytes: 0
  };
  
  try {
    // Query for storage metrics
    const { data: storageStats } = await supabaseAdmin.from('storage_stats').select('*').single();
    if (storageStats) {
      storageMetrics = {
        totalUploads: storageStats.total_uploads || 0,
        totalDownloads: storageStats.total_downloads || 0,
        totalStorageBytes: storageStats.total_storage_bytes || 0
      };
    }
  } catch (error) {
    console.error('Failed to fetch storage metrics:', error);
  }
  
  // Calculate system metrics
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const usedMemoryPercent = (usedMemory / totalMemory) * 100;
  
  // Build the metrics response
  const metricsResponse: MetricsResponse = {
    timestamp: new Date().toISOString(),
    version: '1.0.0', // Replace with actual version from package.json if needed
    environment: config.nodeEnv,
    uptime: process.uptime(),
    system: {
      memory: {
        total: Math.round(totalMemory / (1024 * 1024)),
        free: Math.round(freeMemory / (1024 * 1024)),
        used: Math.round(usedMemory / (1024 * 1024)),
        usedPercent: Math.round(usedMemoryPercent * 100) / 100
      },
      cpu: {
        count: os.cpus().length,
        loadAvg: os.loadavg()
      }
    },
    api: {
      requestsTotal: metricsData.counters.api_requests_total || 0,
      requestsSuccess: metricsData.counters.api_requests_success || 0,
      requestsFailure: metricsData.counters.api_requests_failure || 0,
      responseTimeAvg: metricsData.histograms.api_response_time?.avg || 0,
      endpoints: {}
    },
    database: dbMetrics,
    storage: storageMetrics,
    customMetrics: metricsData.gauges || {}
  };
  
  // Add endpoint-specific metrics
  Object.keys(metricsData.counters).forEach(key => {
    if (key.startsWith('api_requests_') && key !== 'api_requests_total' && 
        key !== 'api_requests_success' && key !== 'api_requests_failure') {
      const endpoint = key.replace('api_requests_', '');
      metricsResponse.api.endpoints[endpoint] = {
        count: metricsData.counters[key],
        responseTimeAvg: metricsData.histograms[`api_response_time_${endpoint}`]?.avg || 0
      };
    }
  });
  
  // Return metrics with appropriate headers
  return new Response(JSON.stringify(metricsResponse, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
};