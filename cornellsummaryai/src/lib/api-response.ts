/**
 * API Response Formatting Utilities
 * 
 * This module provides standardized response formatting for API routes.
 */

import { generateRequestId } from './error-handling';

/**
 * Standard success response structure
 */
export interface SuccessResponse<T> {
  data: T;
  requestId?: string;
  timestamp: string;
}

/**
 * Create a standardized success response
 */
export function createSuccessResponse<T>(
  data: T,
  status: number = 200,
  requestId?: string
): Response {
  const timestamp = new Date().toISOString();
  const responseId = requestId || generateRequestId();
  
  const responseBody: SuccessResponse<T> = {
    data,
    requestId: responseId,
    timestamp,
  };
  
  return new Response(JSON.stringify(responseBody), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Create a no-content success response (204)
 */
export function createNoContentResponse(): Response {
  return new Response(null, {
    status: 204,
  });
}

/**
 * Create a redirect response
 */
export function createRedirectResponse(location: string, status: number = 302): Response {
  return new Response(null, {
    status,
    headers: { 'Location': location },
  });
}

/**
 * Create a file download response
 */
export function createFileDownloadResponse(
  data: ArrayBuffer | Blob,
  filename: string,
  contentType: string = 'application/octet-stream',
  inline: boolean = false
): Response {
  return new Response(data, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `${inline ? 'inline' : 'attachment'}; filename="${encodeURIComponent(filename)}"`,
    },
  });
}

/**
 * Create a PDF download response
 */
export function createPdfDownloadResponse(
  data: ArrayBuffer | Blob,
  filename: string,
  inline: boolean = false
): Response {
  return createFileDownloadResponse(data, `${filename}.pdf`, 'application/pdf', inline);
}

/**
 * Create a JSON stream response for server-sent events or streaming APIs
 */
export function createStreamResponse(
  stream: ReadableStream
): Response {
  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Transfer-Encoding': 'chunked',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}