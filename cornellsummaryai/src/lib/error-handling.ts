/**
 * Centralized error handling and logging utility
 * 
 * This module provides standardized error handling, logging, and response formatting
 * for the application's API routes and services.
 */

import type { APIContext } from 'astro';

/**
 * Standard error response structure
 */
export interface ErrorResponse {
  error: {
    message: string;
    code?: string;
    details?: any;
  };
  requestId?: string;
  timestamp: string;
}

/**
 * Error types for the application
 */
export enum ErrorType {
  AUTHENTICATION = 'authentication_error',
  AUTHORIZATION = 'authorization_error',
  VALIDATION = 'validation_error',
  NOT_FOUND = 'not_found',
  EXTERNAL_API = 'external_api_error',
  DATABASE = 'database_error',
  STORAGE = 'storage_error',
  RATE_LIMIT = 'rate_limit_error',
  INTERNAL = 'internal_error',
}

/**
 * Custom error class with additional metadata
 */
export class AppError extends Error {
  code: string;
  status: number;
  details?: any;
  
  constructor(message: string, code: string = ErrorType.INTERNAL, status: number = 500, details?: any) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Generate a unique request ID for tracking errors
 */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Log an error with standardized format
 */
export function logError(error: Error | AppError, context?: any): void {
  const timestamp = new Date().toISOString();
  const errorCode = (error as AppError).code || ErrorType.INTERNAL;
  const errorStatus = (error as AppError).status || 500;
  const errorDetails = (error as AppError).details;
  
  const logData = {
    timestamp,
    level: 'error',
    message: error.message,
    name: error.name,
    code: errorCode,
    status: errorStatus,
    stack: error.stack,
    details: errorDetails,
    context,
  };
  
  // In production, you might want to send this to a logging service
  console.error(JSON.stringify(logData, null, 2));
}

/**
 * Format an error into a standardized response object
 */
export function formatErrorResponse(error: Error | AppError, requestId?: string): ErrorResponse {
  const timestamp = new Date().toISOString();
  const errorCode = (error as AppError).code || ErrorType.INTERNAL;
  const errorDetails = (error as AppError).details;
  
  // Don't expose internal details in production
  const isProduction = import.meta.env.PROD === true;
  
  return {
    error: {
      message: error.message,
      code: errorCode,
      ...((!isProduction || errorCode !== ErrorType.INTERNAL) && errorDetails ? { details: errorDetails } : {}),
    },
    ...(requestId ? { requestId } : {}),
    timestamp,
  };
}

/**
 * Create an error response for API routes
 */
export function createErrorResponse(
  error: Error | AppError | string,
  status: number = 500,
  requestId?: string
): Response {
  let appError: AppError;
  
  if (typeof error === 'string') {
    appError = new AppError(error, ErrorType.INTERNAL, status);
  } else if (error instanceof AppError) {
    appError = error;
    status = appError.status;
  } else {
    appError = new AppError(error.message, ErrorType.INTERNAL, status);
  }
  
  // Log the error
  logError(appError, { requestId });
  
  // Format the error response
  const errorResponse = formatErrorResponse(appError, requestId);
  
  return new Response(JSON.stringify(errorResponse), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Middleware to handle errors in API routes
 */
export async function errorHandlerMiddleware(
  context: APIContext,
  handler: (context: APIContext) => Promise<Response>
): Promise<Response> {
  const requestId = generateRequestId();
  
  try {
    // Add request logging here if needed
    const startTime = performance.now();
    
    // Execute the handler
    const response = await handler(context);
    
    // Add response logging here if needed
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Request processed successfully`,
      requestId,
      method: context.request.method,
      path: new URL(context.request.url).pathname,
      status: response.status,
      duration: `${duration.toFixed(2)}ms`,
    }));
    
    return response;
  } catch (error: any) {
    return createErrorResponse(error, error instanceof AppError ? error.status : 500, requestId);
  }
}

/**
 * Validate required environment variables
 */
export function validateEnvironmentVariables(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missing.length > 0) {
    throw new AppError(
      `Missing required environment variables: ${missing.join(', ')}`,
      ErrorType.INTERNAL,
      500,
      { missingVars: missing }
    );
  }
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private startTime: number;
  private marks: Record<string, number> = {};
  private name: string;
  
  constructor(name: string) {
    this.name = name;
    this.startTime = performance.now();
  }
  
  mark(label: string): void {
    this.marks[label] = performance.now();
  }
  
  measure(fromLabel: string, toLabel: string): number {
    if (!this.marks[fromLabel] || !this.marks[toLabel]) {
      throw new Error(`Cannot measure between unknown marks: ${fromLabel} to ${toLabel}`);
    }
    
    return this.marks[toLabel] - this.marks[fromLabel];
  }
  
  end(): Record<string, number> {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;
    
    const measurements: Record<string, number> = {
      total: totalDuration,
    };
    
    // Calculate durations between consecutive marks
    const markLabels = Object.keys(this.marks);
    for (let i = 0; i < markLabels.length - 1; i++) {
      const currentMark = markLabels[i];
      const nextMark = markLabels[i + 1];
      measurements[`${currentMark}_to_${nextMark}`] = this.measure(currentMark, nextMark);
    }
    
    // Log the performance data
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Performance metrics for ${this.name}`,
      measurements,
    }));
    
    return measurements;
  }
}