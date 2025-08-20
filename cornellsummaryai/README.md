# Mindsy Notes Generator API

This API provides endpoints for generating Mindsy Notes from audio recordings and optional PDF files.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenAI API key
- RunPod API key
- Tika API deployment
- Gotenberg API deployment
- Stripe account (for payment processing)

### Environment Setup

Copy the `.env.example` file to `.env` and fill in the required environment variables:

```bash
cp .env.example .env
```

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
```

## API Endpoints

### Generate Mindsy Notes

```
POST /api/generate
```

Generates Mindsy Notes from an audio recording and optional PDF file.

#### Request Body

```json
{
  "audioFilePath": "user123/audio/lecture.mp3",
  "pdfFilePath": "user123/pdf/slides.pdf",
  "lectureTitle": "Introduction to Computer Science",
  "courseSubject": "Computer Science"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audioFilePath` | string | Yes | Path to the uploaded audio file in Supabase Storage |
| `pdfFilePath` | string | No | Path to the uploaded PDF file in Supabase Storage |
| `lectureTitle` | string | Yes | Title of the lecture for naming the output file |
| `courseSubject` | string | No | Subject/course name for better context in note generation |

#### Response

```json
{
  "success": true,
  "message": "Processing completed successfully",
  "jobId": "job-123",
  "downloadUrl": "https://example.com/signed-url",
  "apiDownloadUrl": "https://example.com/api/download/job-123",
  "processingStatus": {
    "transcription": "completed",
    "pdfExtraction": "completed",
    "notesGeneration": "completed",
    "pdfGeneration": "completed"
  }
}
```

### Download Generated Notes

```
GET /api/download/:jobId
```

Downloads the generated Mindsy Notes PDF for a specific job.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `jobId` | string | Yes | ID of the job to download |

#### Response

Binary PDF file with appropriate headers.

### Health Check

```
GET /api/health
```

Checks the health status of the API and its dependencies.

#### Response

```json
{
  "status": "healthy",
  "timestamp": "2023-07-16T12:34:56.789Z",
  "version": "1.0.0",
  "environment": "production",
  "services": {
    "supabase": {
      "status": "up",
      "message": "Response time: 123.45ms"
    },
    "openai": {
      "status": "up"
    },
    "runpod": {
      "status": "up"
    },
    "tika": {
      "status": "up"
    },
    "gotenberg": {
      "status": "up"
    }
  },
  "config": {
    "valid": true
  }
}
```

### Stripe Webhook

```
POST /api/stripe/webhook
```

Handles Stripe webhook events for subscription management.

## Testing

Run the test suite:

```bash
npm test
```

Run a specific test file:

```bash
npm test -- src/lib/__tests__/file-name.test.ts
```

## API Testing Utility

Use the included API testing utility to test endpoints:

```bash
node scripts/test-api.js health
node scripts/test-api.js generate POST '{"audioFilePath":"test.mp3","lectureTitle":"Test"}'
```

## Deployment

This project is configured for deployment on Vercel. The `vercel.json` file includes configuration for serverless function timeouts and memory allocation.

```bash
npm run vercel-build
```