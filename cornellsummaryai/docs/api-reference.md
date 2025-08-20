# API Reference Documentation

This document provides comprehensive documentation for the backend API endpoints implemented as part of the migration from n8n workflows to a custom TypeScript backend.

## Table of Contents

1. [Authentication](#authentication)
2. [Core API Endpoints](#core-api-endpoints)
   - [Generate Notes](#generate-notes)
   - [Download Generated Notes](#download-generated-notes)
3. [Payment API Endpoints](#payment-api-endpoints)
   - [Create Checkout Session](#create-checkout-session)
   - [Stripe Webhook Handler](#stripe-webhook-handler)
4. [Monitoring API Endpoints](#monitoring-api-endpoints)
   - [Health Check](#health-check)
   - [Metrics](#metrics)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

## Authentication

All API endpoints (except public health checks and webhooks) require authentication using Supabase session cookies.

### Authentication Flow

1. Users authenticate through the frontend using Supabase Auth
2. Supabase sets secure HTTP-only cookies
3. API routes validate the session using the server-side Supabase client
4. Unauthorized requests receive a 401 status code

## Core API Endpoints

### Generate Notes

Processes audio files (with optional PDF) to generate Mindsy Notes.

**Endpoint:** `POST /api/generate`

**Authentication Required:** Yes

**Request Body:**

```json
{
  "audioFilePath": "string (required)",
  "pdfFilePath": "string (optional)",
  "lectureTitle": "string (required)",
  "courseSubject": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "jobId": "string",
  "downloadUrl": "string"
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid or missing authentication
- `400 Bad Request`: Missing required fields or invalid input
- `500 Internal Server Error`: Processing failure

**Example:**

```bash
curl -X POST https://mycornellai.com/api/generate \
  -H "Content-Type: application/json" \
  -b "sb-access-token=your-token; sb-refresh-token=your-refresh-token" \
  -d '{"audioFilePath": "uploads/audio/lecture1.mp3", "lectureTitle": "Introduction to Biology"}'
```

### Download Generated Notes

Downloads a generated PDF file by job ID.

**Endpoint:** `GET /api/download/[jobId]`

**Authentication Required:** Yes

**URL Parameters:**

- `jobId`: The ID of the job that generated the notes

**Response:**

- PDF file with appropriate content-type headers

**Error Responses:**

- `401 Unauthorized`: Invalid or missing authentication
- `404 Not Found`: Job or file not found
- `500 Internal Server Error`: Error retrieving file

**Example:**

```bash
curl -X GET https://mycornellai.com/api/download/job_123456 \
  -b "sb-access-token=your-token; sb-refresh-token=your-refresh-token" \
  -o notes.pdf
```

## Payment API Endpoints

### Create Checkout Session

Creates a Stripe checkout session for subscription payments.

**Endpoint:** `POST /api/stripe/create-checkout-session`

**Authentication Required:** Yes

**Request Body:**

```json
{
  "priceId": "string (required)",
  "successUrl": "string (optional)",
  "cancelUrl": "string (optional)"
}
```

**Response:**

```json
{
  "success": true,
  "sessionId": "string",
  "url": "string"
}
```

**Error Responses:**

- `401 Unauthorized`: Invalid or missing authentication
- `400 Bad Request`: Missing required fields
- `500 Internal Server Error`: Error creating checkout session

### Stripe Webhook Handler

Handles Stripe webhook events for subscription management.

**Endpoint:** `POST /api/stripe/webhook`

**Authentication Required:** No (uses Stripe signature verification)

**Request Headers:**

- `stripe-signature`: Signature provided by Stripe

**Request Body:**

- Raw webhook event payload from Stripe

**Response:**

```json
{
  "success": true
}
```

**Error Responses:**

- `400 Bad Request`: Invalid signature or payload
- `500 Internal Server Error`: Error processing webhook

## Monitoring API Endpoints

### Health Check

Provides health status information for the application and its dependencies.

**Endpoint:** `GET /api/health`

**Authentication Required:** No

**Query Parameters:**

- `detailed`: Set to "true" for detailed health information (optional)

**Response:**

```json
{
  "status": "healthy | degraded | unhealthy",
  "timestamp": "ISO date string",
  "version": "string",
  "environment": "string",
  "services": {
    "serviceName": {
      "status": "up | down | unknown",
      "message": "string (optional)",
      "responseTime": "number (optional)"
    }
  },
  "config": {
    "valid": "boolean",
    "missingVars": ["string array (optional)"]
  },
  "system": {
    "memory": {
      "total": "number (MB)",
      "free": "number (MB)",
      "usedPercent": "number"
    },
    "uptime": "number (seconds)",
    "load": [1, 5, 15]
  },
  "metrics": {
    "requestsTotal": "number",
    "requestsLast24h": "number",
    "averageResponseTime": "number (ms)",
    "errorRate": "number (%)"
  }
}
```

**Example:**

```bash
# Basic health check
curl -X GET https://mycornellai.com/api/health

# Detailed health check
curl -X GET https://mycornellai.com/api/health?detailed=true
```

### Metrics

Provides detailed metrics about the application's performance.

**Endpoint:** `GET /api/metrics`

**Authentication Required:** Yes (API key in production)

**Request Headers:**

- `Authorization`: Bearer token with API key (required in production)

**Response:**

```json
{
  "timestamp": "ISO date string",
  "version": "string",
  "environment": "string",
  "uptime": "number (seconds)",
  "system": {
    "memory": {
      "total": "number (MB)",
      "free": "number (MB)",
      "used": "number (MB)",
      "usedPercent": "number"
    },
    "cpu": {
      "count": "number",
      "loadAvg": [1, 5, 15]
    }
  },
  "api": {
    "requestsTotal": "number",
    "requestsSuccess": "number",
    "requestsFailure": "number",
    "responseTimeAvg": "number (ms)",
    "endpoints": {
      "endpointName": {
        "count": "number",
        "responseTimeAvg": "number (ms)"
      }
    }
  },
  "database": {
    "connectionCount": "number",
    "queryCount": "number",
    "avgQueryTime": "number (ms)"
  },
  "storage": {
    "totalUploads": "number",
    "totalDownloads": "number",
    "totalStorageBytes": "number"
  },
  "customMetrics": {
    "metricName": "value"
  }
}
```

**Example:**

```bash
curl -X GET https://mycornellai.com/api/metrics \
  -H "Authorization: Bearer your-metrics-api-key"
```

## Error Handling

All API endpoints use a standardized error response format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": "Additional error details (optional)"
  },
  "requestId": "Unique request ID for tracking",
  "timestamp": "ISO date string"
}
```

### Common Error Codes

- `AUTHENTICATION_ERROR`: Invalid or missing authentication
- `AUTHORIZATION_ERROR`: User not authorized to perform action
- `VALIDATION_ERROR`: Invalid request parameters
- `NOT_FOUND`: Requested resource not found
- `EXTERNAL_API_ERROR`: Error from external service
- `DATABASE_ERROR`: Database operation failed
- `STORAGE_ERROR`: File storage operation failed
- `RATE_LIMIT_ERROR`: Rate limit exceeded
- `INTERNAL_ERROR`: Unexpected server error

## Rate Limiting

API endpoints are rate-limited to prevent abuse:

- Anonymous requests: 10 requests per minute
- Authenticated requests: 60 requests per minute
- `/api/generate` endpoint: 10 requests per hour per user

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum requests allowed in the period
- `X-RateLimit-Remaining`: Remaining requests in the current period
- `X-RateLimit-Reset`: Time when the rate limit resets (Unix timestamp)

When rate limit is exceeded, the API returns a `429 Too Many Requests` status code.

## Utility Scripts

The following utility scripts are available for testing and benchmarking the API:

### Test API Script

Located at `scripts/test-api.js`, this script allows testing API endpoints with various inputs.

**Usage:**

```bash
node scripts/test-api.js [endpoint] [method] [data] [file1] [file2]
```

**Examples:**

```bash
# Test health endpoint
node scripts/test-api.js health GET

# Test generate endpoint with audio file
node scripts/test-api.js generate POST '{"lectureTitle":"Test Lecture"}' ./test-audio.mp3
```

### Benchmark Script

Located at `scripts/benchmark.js`, this script benchmarks API performance.

**Usage:**

```bash
node scripts/benchmark.js [endpoint] [method] [data] [iterations] [concurrency] [warmup] [delay]
```

**Examples:**

```bash
# Benchmark health endpoint with 100 requests, 10 concurrent
node scripts/benchmark.js health GET "" 100 10

# Benchmark generate endpoint with 5 requests
node scripts/benchmark.js generate POST '{"audioFilePath":"test.mp3","lectureTitle":"Test"}' 5 1
```

The benchmark script generates detailed reports with response time statistics and charts.