/**
 * Enhanced Health Check API Endpoint
 * 
 * This endpoint provides comprehensive health status information for the application and its dependencies.
 * It checks the status of external services, database connections, and system resources.
 * It supports both basic and detailed health checks for monitoring and diagnostics.
 */

import type { APIRoute } from 'astro';
import { validateOpenAIConfig } from '../../lib/openai-client';
import { validateGotenbergConfig } from '../../lib/gotenberg-client';
import { supabaseAdmin } from '../../lib/supabase-server';
import { config, validateEnvVars } from '../../lib/config';
import { SystemMetrics } from '../../lib/monitoring';
import os from 'node:os';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  environment: string;
  services: {
    [key: string]: {
      status: 'up' | 'down' | 'unknown';
      message?: string;
      responseTime?: number;
      lastChecked?: string;
    };
  };
  config: {
    valid: boolean;
    missingVars?: string[];
  };
  system?: {
    memory?: {
      total: number;
      free: number;
      usedPercent: number;
    };
    uptime?: number;
    load?: number[];
  };
  metrics?: {
    requestsTotal: number;
    requestsLast24h: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

export const GET: APIRoute = async ({ request }) => {
  // Check if detailed health check is requested
  const url = new URL(request.url);
  const detailed = url.searchParams.get('detailed') === 'true';
  
  // Initialize health status
  const healthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0', // Replace with actual version from package.json if needed
    environment: config.nodeEnv,
    services: {},
    config: { valid: true }
  };

  // Check environment variables
  const envVarsStatus = validateEnvVars();
  healthStatus.config = envVarsStatus;
  
  if (!envVarsStatus.valid) {
    healthStatus.status = 'degraded';
  }

  // Check Supabase connection
  try {
    const start = performance.now();
    const { data, error } = await supabaseAdmin.from('jobs').select('count').limit(1);
    const end = performance.now();
    const responseTime = end - start;
    
    if (error) {
      healthStatus.services.supabase = {
        status: 'down',
        message: `Error: ${error.message}`,
        responseTime,
        lastChecked: new Date().toISOString()
      };
      healthStatus.status = 'degraded';
    } else {
      healthStatus.services.supabase = {
        status: 'up',
        message: `Database connection successful`,
        responseTime,
        lastChecked: new Date().toISOString()
      };
    }
  } catch (error) {
    healthStatus.services.supabase = {
      status: 'down',
      message: `Exception: ${error instanceof Error ? error.message : 'Unknown error'}`,
      lastChecked: new Date().toISOString()
    };
    healthStatus.status = 'degraded';
  }

  // Check OpenAI configuration
  const openaiStatus = validateOpenAIConfig();
  healthStatus.services.openai = {
    status: openaiStatus.valid ? 'up' : 'down',
    message: openaiStatus.valid ? 'API key configured' : openaiStatus.error,
    lastChecked: new Date().toISOString()
  };
  
  if (!openaiStatus.valid) {
    healthStatus.status = 'degraded';
  }

  // Check Gotenberg configuration
  const gotenbergStatus = validateGotenbergConfig();
  healthStatus.services.gotenberg = {
    status: gotenbergStatus.valid ? 'up' : 'down',
    message: gotenbergStatus.valid ? 'API URL configured' : gotenbergStatus.error,
    lastChecked: new Date().toISOString()
  };
  
  if (!gotenbergStatus.valid) {
    healthStatus.status = 'degraded';
  }

  // Check RunPod API key
  healthStatus.services.runpod = {
    status: config.runpodApiKey ? 'up' : 'down',
    message: config.runpodApiKey ? 'API key configured' : 'RunPod API key not configured',
    lastChecked: new Date().toISOString()
  };
  
  if (!config.runpodApiKey) {
    healthStatus.status = 'degraded';
  }

  // Check Tika API URL
  healthStatus.services.tika = {
    status: config.tikaApiUrl ? 'up' : 'down',
    message: config.tikaApiUrl ? 'API URL configured' : 'Tika API URL not configured',
    lastChecked: new Date().toISOString()
  };
  
  if (!config.tikaApiUrl) {
    healthStatus.status = 'degraded';
  }

  // If any critical service is down, mark as unhealthy
  const criticalServices = ['supabase', 'openai'];
  const downCriticalServices = criticalServices.filter(
    service => healthStatus.services[service]?.status === 'down'
  );
  
  if (downCriticalServices.length > 0) {
    healthStatus.status = 'unhealthy';
  }
  
  // Add detailed system information if requested
  if (detailed) {
    // Add system metrics
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemoryPercent = ((totalMemory - freeMemory) / totalMemory) * 100;
    
    healthStatus.system = {
      memory: {
        total: Math.round(totalMemory / (1024 * 1024)), // MB
        free: Math.round(freeMemory / (1024 * 1024)), // MB
        usedPercent: Math.round(usedMemoryPercent * 100) / 100 // 2 decimal places
      },
      uptime: process.uptime(),
      load: os.loadavg()
    };
    
    // Add application metrics
    try {
      // Get metrics from SystemMetrics singleton
      const metrics = SystemMetrics.getInstance().getMetrics();
      
      // Get recent API usage from database
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const { data: recentUsage, error } = await supabaseAdmin
        .from('api_usage')
        .select('count')
        .gte('created_at', yesterday.toISOString());
      
      const requestsLast24h = recentUsage?.length || 0;
      
      // Calculate error rate
      const totalRequests = metrics.counters.api_requests_total || 0;
      const failedRequests = metrics.counters.api_requests_failure || 0;
      const errorRate = totalRequests > 0 ? (failedRequests / totalRequests) * 100 : 0;
      
      healthStatus.metrics = {
        requestsTotal: totalRequests,
        requestsLast24h,
        averageResponseTime: metrics.histograms.api_response_time?.avg || 0,
        errorRate: Math.round(errorRate * 100) / 100 // 2 decimal places
      };
      
      // Check for high error rates
      if (errorRate > 10 && totalRequests > 10) {
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      console.error('Failed to fetch metrics:', error);
    }
    
    // Add service-specific health checks
    try {
      // Check Supabase Storage
      const storageStart = performance.now();
      const { data: buckets, error: bucketsError } = await supabaseAdmin.storage.listBuckets();
      const storageEnd = performance.now();
      
      healthStatus.services.supabaseStorage = {
        status: bucketsError ? 'down' : 'up',
        message: bucketsError ? `Error: ${bucketsError.message}` : `${buckets?.length || 0} buckets available`,
        responseTime: storageEnd - storageStart,
        lastChecked: new Date().toISOString()
      };
      
      if (bucketsError) {
        healthStatus.status = 'degraded';
      }
    } catch (error) {
      console.error('Failed to check Supabase Storage:', error);
    }
  }

  // Return health status with appropriate status code
  const statusCode = healthStatus.status === 'healthy' ? 200 : 
                    healthStatus.status === 'degraded' ? 200 : 503;

  return new Response(JSON.stringify(healthStatus, null, 2), {
    status: statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Health-Status': healthStatus.status
    }
  });
};