/**
 * Request Monitoring and Logging Utilities
 * 
 * This module provides tools for monitoring API requests, logging, and performance tracking.
 * It includes enhanced monitoring capabilities for the backend migration.
 */

import type { APIContext } from 'astro';
import { generateRequestId } from './error-handling';
import { supabaseAdmin } from './supabase-server';

/**
 * Log levels for the application
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Interface for structured log entries
 */
export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  requestId?: string;
  [key: string]: any;
}

/**
 * Logger class for structured logging
 */
export class Logger {
  private context: string;
  private requestId?: string;
  
  constructor(context: string, requestId?: string) {
    this.context = context;
    this.requestId = requestId;
  }
  
  /**
   * Create a base log entry with common fields
   */
  private createLogEntry(level: LogLevel, message: string, data?: any): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.context,
      ...(this.requestId ? { requestId: this.requestId } : {}),
      ...(data || {}),
    };
  }
  
  /**
   * Log a message at DEBUG level
   */
  debug(message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.DEBUG, message, data);
    this.writeLog(entry);
  }
  
  /**
   * Log a message at INFO level
   */
  info(message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.INFO, message, data);
    this.writeLog(entry);
  }
  
  /**
   * Log a message at WARN level
   */
  warn(message: string, data?: any): void {
    const entry = this.createLogEntry(LogLevel.WARN, message, data);
    this.writeLog(entry);
  }
  
  /**
   * Log a message at ERROR level
   */
  error(message: string, error?: Error, data?: any): void {
    const entry = this.createLogEntry(
      LogLevel.ERROR,
      message,
      {
        ...(error ? {
          errorName: error.name,
          errorMessage: error.message,
          stack: error.stack,
        } : {}),
        ...(data || {}),
      }
    );
    this.writeLog(entry);
  }
  
  /**
   * Write the log entry to the appropriate destination
   */
  private writeLog(entry: LogEntry): void {
    // In production, you might want to send this to a logging service
    // For now, we'll just use console.log with different methods based on level
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(JSON.stringify(entry));
        break;
      case LogLevel.INFO:
        console.info(JSON.stringify(entry));
        break;
      case LogLevel.WARN:
        console.warn(JSON.stringify(entry));
        break;
      case LogLevel.ERROR:
        console.error(JSON.stringify(entry));
        break;
    }
    
    // Store critical logs in database if configured
    if (entry.level === LogLevel.ERROR || entry.level === LogLevel.WARN) {
      void storeLogInDatabase(entry).catch(err => {
        console.error('Failed to store log in database:', err);
      });
    }
  }
}

/**
 * Store important logs in the database for later analysis
 */
async function storeLogInDatabase(entry: LogEntry): Promise<void> {
  try {
    // Only store logs in production or if explicitly enabled
    if (import.meta.env.PROD || import.meta.env.STORE_LOGS === 'true') {
      await supabaseAdmin.from('system_logs').insert({
        level: entry.level,
        message: entry.message,
        context: entry.context,
        request_id: entry.requestId,
        details: entry,
        created_at: new Date().toISOString(),
      });
    }
  } catch (error) {
    // Don't throw errors from logging
    console.error('Failed to store log:', error);
  }
}

/**
 * Request logger middleware for API routes
 */
export async function requestLoggerMiddleware(
  context: APIContext,
  handler: (context: APIContext) => Promise<Response>
): Promise<Response> {
  const requestId = generateRequestId();
  const url = new URL(context.request.url);
  const logger = new Logger('api', requestId);
  
  // Log the request
  logger.info('API request received', {
    method: context.request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    headers: Object.fromEntries(
      Array.from(context.request.headers.entries())
        .filter(([key]) => !['authorization', 'cookie'].includes(key.toLowerCase()))
    ),
  });
  
  const startTime = performance.now();
  
  try {
    // Execute the handler
    const response = await handler(context);
    
    // Calculate request duration
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log the response
    logger.info('API request completed', {
      method: context.request.method,
      path: url.pathname,
      status: response.status,
      duration: `${duration.toFixed(2)}ms`,
    });
    
    // Add performance metrics header
    const responseWithMetrics = new Response(response.body, response);
    responseWithMetrics.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);
    
    // Store metrics for high-latency requests
    if (duration > 1000) { // Log requests taking more than 1 second
      void storePerformanceMetric(context.request.method, url.pathname, duration, requestId);
    }
    
    return responseWithMetrics;
  } catch (error: any) {
    // Calculate request duration
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Log the error
    logger.error('API request failed', error, {
      method: context.request.method,
      path: url.pathname,
      duration: `${duration.toFixed(2)}ms`,
    });
    
    // Store error metrics
    void storePerformanceMetric(
      context.request.method, 
      url.pathname, 
      duration, 
      requestId, 
      error.message || 'Unknown error'
    );
    
    // Re-throw the error to be handled by the error middleware
    throw error;
  }
}

/**
 * Store performance metrics in the database
 */
async function storePerformanceMetric(
  method: string,
  path: string,
  duration: number,
  requestId: string,
  error?: string
): Promise<void> {
  try {
    await supabaseAdmin.from('performance_metrics').insert({
      request_id: requestId,
      method,
      path,
      duration_ms: Math.round(duration),
      error_message: error,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to store performance metric:', err);
  }
}

/**
 * Combined middleware that applies both request logging and error handling
 */
export function createApiHandler(
  handler: (context: APIContext) => Promise<Response>
): (context: APIContext) => Promise<Response> {
  return async (context: APIContext) => {
    // Apply request logging middleware
    return requestLoggerMiddleware(context, async (ctx) => {
      // Apply error handling middleware (imported from error-handling.ts)
      const { errorHandlerMiddleware } = await import('./error-handling');
      return errorHandlerMiddleware(ctx, handler);
    });
  };
}

/**
 * System metrics collector for monitoring application health
 */
export class SystemMetrics {
  private static instance: SystemMetrics;
  private metrics: Map<string, number> = new Map();
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  
  private constructor() {}
  
  /**
   * Get the singleton instance
   */
  public static getInstance(): SystemMetrics {
    if (!SystemMetrics.instance) {
      SystemMetrics.instance = new SystemMetrics();
    }
    return SystemMetrics.instance;
  }
  
  /**
   * Set a gauge metric value
   */
  public setGauge(name: string, value: number): void {
    this.metrics.set(name, value);
  }
  
  /**
   * Increment a counter metric
   */
  public incrementCounter(name: string, value: number = 1): void {
    const currentValue = this.counters.get(name) || 0;
    this.counters.set(name, currentValue + value);
  }
  
  /**
   * Record a value in a histogram
   */
  public recordHistogram(name: string, value: number): void {
    const currentValues = this.histograms.get(name) || [];
    currentValues.push(value);
    
    // Keep histograms from growing too large
    if (currentValues.length > 1000) {
      currentValues.shift();
    }
    
    this.histograms.set(name, currentValues);
  }
  
  /**
   * Get all metrics as a JSON object
   */
  public getMetrics(): Record<string, any> {
    const result: Record<string, any> = {
      gauges: Object.fromEntries(this.metrics),
      counters: Object.fromEntries(this.counters),
      histograms: {},
    };
    
    // Calculate histogram statistics
    for (const [name, values] of this.histograms.entries()) {
      if (values.length === 0) continue;
      
      const sorted = [...values].sort((a, b) => a - b);
      result.histograms[name] = {
        count: values.length,
        min: sorted[0],
        max: sorted[sorted.length - 1],
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        p50: sorted[Math.floor(sorted.length * 0.5)],
        p90: sorted[Math.floor(sorted.length * 0.9)],
        p95: sorted[Math.floor(sorted.length * 0.95)],
        p99: sorted[Math.floor(sorted.length * 0.99)],
      };
    }
    
    return result;
  }
  
  /**
   * Reset all metrics
   */
  public resetMetrics(): void {
    this.metrics.clear();
    this.counters.clear();
    this.histograms.clear();
  }
}

/**
 * Track API usage for rate limiting and analytics
 */
export function trackApiUsage(
  userId: string | null,
  endpoint: string,
  success: boolean,
  durationMs: number
): void {
  const metrics = SystemMetrics.getInstance();
  
  // Track total requests
  metrics.incrementCounter('api_requests_total');
  
  // Track by endpoint
  metrics.incrementCounter(`api_requests_${endpoint}`);
  
  // Track success/failure
  if (success) {
    metrics.incrementCounter('api_requests_success');
  } else {
    metrics.incrementCounter('api_requests_failure');
  }
  
  // Track response time
  metrics.recordHistogram('api_response_time', durationMs);
  metrics.recordHistogram(`api_response_time_${endpoint}`, durationMs);
  
  // Track authenticated vs anonymous
  if (userId) {
    metrics.incrementCounter('api_requests_authenticated');
  } else {
    metrics.incrementCounter('api_requests_anonymous');
  }
  
  // Store in database for long-term analytics
  void storeApiUsage(userId, endpoint, success, durationMs);
}

/**
 * Store API usage in the database
 */
async function storeApiUsage(
  userId: string | null,
  endpoint: string,
  success: boolean,
  durationMs: number
): Promise<void> {
  try {
    await supabaseAdmin.from('api_usage').insert({
      user_id: userId,
      endpoint,
      success,
      duration_ms: Math.round(durationMs),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Failed to store API usage:', error);
  }
}