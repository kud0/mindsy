/**
 * Tests for the main processing pipeline
 * 
 * This file contains integration tests for the complete processing workflow,
 * including job creation, file processing, AI processing, and PDF generation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateRequestBody } from '../../pages/api/generate';

// Mock all external dependencies
vi.mock('../../lib/supabase-server', () => ({
  requireAuth: vi.fn(),
  supabaseServer: {
    from: vi.fn(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn()
        }))
      })),
      update: vi.fn(() => ({
        eq: vi.fn()
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn()
        }))
      }))
    }))
  }
}));

vi.mock('../../lib/file-processing', () => ({
  generateSignedUrl: vi.fn(),
  uploadFile: vi.fn(),
  generateSecureFilePath: vi.fn(),
  STORAGE_BUCKETS: {
    USER_UPLOADS: 'user-uploads',
    GENERATED_NOTES: 'generated-notes'
  },
  EXPIRATION_TIMES: {
    SHORT: 900,
    MEDIUM: 3600,
    LONG: 21600
  }
}));

vi.mock('../../lib/runpod-client', () => ({
  createRunPodClient: vi.fn(() => ({
    transcribeAudio: vi.fn()
  }))
}));

vi.mock('../../lib/tika-client', () => ({
  createTikaClient: vi.fn(() => ({
    extractPdfText: vi.fn()
  }))
}));

vi.mock('../../lib/openai-client', () => ({
  generateMindsyNotes: vi.fn()
}));

vi.mock('../../lib/gotenberg-client', () => ({
  createGotenbergClient: vi.fn(() => ({
    generateMindsyNotesPdf: vi.fn()
  }))
}));

describe('Processing Pipeline', () => {
  // Store original console methods
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;
  
  beforeEach(() => {
    // Mock console methods to prevent noise in test output
    console.error = vi.fn();
    console.log = vi.fn();
    console.warn = vi.fn();
    
    // Reset environment variables for each test
    process.env.OPENAI_KEY = 'sk-test-key';
    process.env.RUNPOD_API_KEY = 'test-runpod-key';
    process.env.TIKA_API_URL = 'https://test-tika-url.com';
    process.env.GOTENBERG_API_URL = 'https://test-gotenberg-url.com';
    
    // Clear all mocks
    vi.clearAllMocks();
  });
  
  afterEach(() => {
    // Restore console methods
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  describe('Request Validation', () => {
    it('should validate a valid request body', () => {
      const validBody = {
        audioFilePath: 'user123/audio/lecture.mp3',
        lectureTitle: 'Introduction to Computer Science',
        courseSubject: 'Computer Science'
      };
      
      const result = validateRequestBody(validBody);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedBody).toEqual(validBody);
    });
    
    it('should validate a request with minimal required fields', () => {
      const minimalBody = {
        audioFilePath: 'user123/audio/lecture.mp3',
        lectureTitle: 'Introduction to Computer Science'
      };
      
      const result = validateRequestBody(minimalBody);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedBody).toEqual(minimalBody);
    });
    
    it('should reject a request with missing audioFilePath', () => {
      const invalidBody = {
        lectureTitle: 'Introduction to Computer Science'
      };
      
      const result = validateRequestBody(invalidBody);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('audioFilePath is required');
    });
    
    it('should reject a request with missing lectureTitle', () => {
      const invalidBody = {
        audioFilePath: 'user123/audio/lecture.mp3'
      };
      
      const result = validateRequestBody(invalidBody);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('lectureTitle is required');
    });
    
    it('should reject a request with invalid audioFilePath format', () => {
      const invalidBody = {
        audioFilePath: '../../../etc/passwd',
        lectureTitle: 'Introduction to Computer Science'
      };
      
      const result = validateRequestBody(invalidBody);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid audioFilePath format');
    });
    
    it('should reject a request with invalid pdfFilePath format', () => {
      const invalidBody = {
        audioFilePath: 'user123/audio/lecture.mp3',
        pdfFilePath: '../../../etc/passwd',
        lectureTitle: 'Introduction to Computer Science'
      };
      
      const result = validateRequestBody(invalidBody);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid pdfFilePath format');
    });
    
    it('should reject a request with empty lectureTitle', () => {
      const invalidBody = {
        audioFilePath: 'user123/audio/lecture.mp3',
        lectureTitle: ''
      };
      
      const result = validateRequestBody(invalidBody);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('lectureTitle cannot be empty');
    });
    
    it('should reject a request with lectureTitle that is too long', () => {
      const invalidBody = {
        audioFilePath: 'user123/audio/lecture.mp3',
        lectureTitle: 'a'.repeat(201)
      };
      
      const result = validateRequestBody(invalidBody);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('lectureTitle must be less than 200 characters');
    });
    
    it('should reject a request with courseSubject that is too long', () => {
      const invalidBody = {
        audioFilePath: 'user123/audio/lecture.mp3',
        lectureTitle: 'Introduction to Computer Science',
        courseSubject: 'a'.repeat(101)
      };
      
      const result = validateRequestBody(invalidBody);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('courseSubject must be less than 100 characters');
    });
    
    it('should sanitize input fields', () => {
      const unsanitizedBody = {
        audioFilePath: '  user123/audio/lecture.mp3  ',
        lectureTitle: '  Introduction to Computer Science  ',
        courseSubject: '  Computer Science  '
      };
      
      const result = validateRequestBody(unsanitizedBody);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedBody).toEqual({
        audioFilePath: 'user123/audio/lecture.mp3',
        lectureTitle: 'Introduction to Computer Science',
        courseSubject: 'Computer Science'
      });
    });
  });

  describe('Job Creation', () => {
    it('should create a job record with the correct fields', async () => {
      // Import the mocked modules
      const { requireAuth } = await import('../../lib/supabase-server');
      
      // Mock the requireAuth function to return a user and client
      const mockUser = { id: 'user-123' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { job_id: 'job-123' },
            error: null
          })
        })
      });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert
      });
      const mockClient = {
        from: mockFrom
      };
      
      (requireAuth as any).mockResolvedValue({
        user: mockUser,
        client: mockClient
      });
      
      // Create a mock request with valid body
      const mockRequest = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioFilePath: 'user123/audio/lecture.mp3',
          lectureTitle: 'Introduction to Computer Science',
          courseSubject: 'Computer Science'
        })
      });
      
      // Import the API route
      const { POST } = await import('../../pages/api/generate');
      
      // Call the API route
      const response = await POST({ request: mockRequest, params: {}, locals: {} } as any);
      
      // Verify that the job was created with the correct fields
      expect(mockFrom).toHaveBeenCalledWith('jobs');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: 'user-123',
        lecture_title: 'Introduction to Computer Science',
        course_subject: 'Computer Science',
        audio_file_path: 'user123/audio/lecture.mp3',
        status: 'processing'
      }));
    });
  });

  describe('File Processing', () => {
    it('should generate signed URLs for audio and PDF files', async () => {
      // Import the mocked modules
      const { requireAuth } = await import('../../lib/supabase-server');
      const { generateSignedUrl } = await import('../../lib/file-processing');
      
      // Mock the requireAuth function to return a user and client
      const mockUser = { id: 'user-123' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { job_id: 'job-123' },
            error: null
          })
        })
      });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
        update: mockUpdate
      });
      const mockClient = {
        from: mockFrom
      };
      
      (requireAuth as any).mockResolvedValue({
        user: mockUser,
        client: mockClient
      });
      
      // Mock the generateSignedUrl function
      (generateSignedUrl as any).mockImplementation((bucket, path) => {
        if (path.includes('audio')) {
          return Promise.resolve({
            success: true,
            data: {
              signedUrl: 'https://example.com/audio-signed-url',
              expiresAt: new Date(Date.now() + 3600000)
            }
          });
        } else if (path.includes('pdf')) {
          return Promise.resolve({
            success: true,
            data: {
              signedUrl: 'https://example.com/pdf-signed-url',
              expiresAt: new Date(Date.now() + 3600000)
            }
          });
        }
      });
      
      // Create a mock request with valid body including PDF
      const mockRequest = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioFilePath: 'user123/audio/lecture.mp3',
          pdfFilePath: 'user123/pdf/slides.pdf',
          lectureTitle: 'Introduction to Computer Science',
          courseSubject: 'Computer Science'
        })
      });
      
      // Import the API route
      const { POST } = await import('../../pages/api/generate');
      
      // Call the API route
      const response = await POST({ request: mockRequest, params: {}, locals: {} } as any);
      
      // Verify that signed URLs were generated for both files
      expect(generateSignedUrl).toHaveBeenCalledTimes(2);
      expect(generateSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        'user123/audio/lecture.mp3',
        expect.any(Number),
        'user-123'
      );
      expect(generateSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        'user123/pdf/slides.pdf',
        expect.any(Number),
        'user-123'
      );
    });
  });

  describe('AI Processing Pipeline', () => {
    it('should orchestrate the complete AI processing pipeline', async () => {
      // Import the mocked modules
      const { requireAuth } = await import('../../lib/supabase-server');
      const { generateSignedUrl, uploadFile, generateSecureFilePath } = await import('../../lib/file-processing');
      const { createRunPodClient } = await import('../../lib/runpod-client');
      const { createTikaClient } = await import('../../lib/tika-client');
      const { generateMindsyNotes } = await import('../../lib/openai-client');
      const { createGotenbergClient } = await import('../../lib/gotenberg-client');
      
      // Mock the requireAuth function to return a user and client
      const mockUser = { id: 'user-123' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { job_id: 'job-123' },
            error: null
          })
        })
      });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
        update: mockUpdate
      });
      const mockClient = {
        from: mockFrom
      };
      
      (requireAuth as any).mockResolvedValue({
        user: mockUser,
        client: mockClient
      });
      
      // Mock the generateSignedUrl function
      (generateSignedUrl as any).mockImplementation((bucket, path) => {
        if (path.includes('output')) {
          return Promise.resolve({
            success: true,
            data: {
              signedUrl: 'https://example.com/output-signed-url',
              expiresAt: new Date(Date.now() + 21600000)
            }
          });
        } else {
          return Promise.resolve({
            success: true,
            data: {
              signedUrl: 'https://example.com/signed-url',
              expiresAt: new Date(Date.now() + 3600000)
            }
          });
        }
      });
      
      // Mock the uploadFile function
      (uploadFile as any).mockResolvedValue({
        success: true,
        data: {
          path: 'user-123/mindsy-notes/output.pdf',
          id: 'file-123'
        }
      });
      
      // Mock the generateSecureFilePath function
      (generateSecureFilePath as any).mockReturnValue('user-123/mindsy-notes/output.pdf');
      
      // Mock the RunPod client
      const mockTranscribeAudio = vi.fn().mockResolvedValue('This is the transcript text');
      (createRunPodClient as any).mockReturnValue({
        transcribeAudio: mockTranscribeAudio
      });
      
      // Mock the Tika client
      const mockExtractPdfText = vi.fn().mockResolvedValue('This is the PDF text');
      (createTikaClient as any).mockReturnValue({
        extractPdfText: mockExtractPdfText
      });
      
      // Mock the OpenAI client
      (generateMindsyNotes as any).mockResolvedValue({
        success: true,
        notes: '# Mindsy Notes\n\n## Key Terms\n- Term 1\n- Term 2\n\n## Notes\nDetailed notes here\n\n## Summary\nSummary of the content'
      });
      
      // Mock the Gotenberg client
      const mockGenerateCornellNotesPdf = vi.fn().mockResolvedValue({
        success: true,
        pdfBuffer: new ArrayBuffer(1024)
      });
      (createGotenbergClient as any).mockReturnValue({
        generateMindsyNotesPdf: mockGenerateCornellNotesPdf
      });
      
      // Create a mock request with valid body including PDF
      const mockRequest = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioFilePath: 'user123/audio/lecture.mp3',
          pdfFilePath: 'user123/pdf/slides.pdf',
          lectureTitle: 'Introduction to Computer Science',
          courseSubject: 'Computer Science'
        })
      });
      
      // Import the API route
      const { POST } = await import('../../pages/api/generate');
      
      // Call the API route
      const response = await POST({ request: mockRequest, params: {}, locals: {} } as any);
      const responseBody = await response.json();
      
      // Verify that the response is successful
      expect(response.status).toBe(200);
      expect(responseBody.success).toBe(true);
      expect(responseBody.jobId).toBe('job-123');
      
      // Verify that all steps of the pipeline were called
      expect(mockTranscribeAudio).toHaveBeenCalledWith('https://example.com/signed-url');
      expect(mockExtractPdfText).toHaveBeenCalledWith('https://example.com/signed-url');
      expect(generateMindsyNotes).toHaveBeenCalledWith(expect.objectContaining({
        transcript: 'This is the transcript text',
        pdfText: 'This is the PDF text',
        lectureTitle: 'Introduction to Computer Science',
        courseSubject: 'Computer Science'
      }));
      expect(mockGenerateCornellNotesPdf).toHaveBeenCalledWith(
        expect.stringContaining('Mindsy Notes'),
        'Introduction to Computer Science'
      );
      expect(uploadFile).toHaveBeenCalledWith(
        expect.any(String),
        'user-123/mindsy-notes/output.pdf',
        expect.any(ArrayBuffer),
        expect.objectContaining({
          contentType: 'application/pdf',
          upsert: true,
          userId: 'user-123'
        })
      );
      
      // Verify that the job status was updated to completed
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'completed',
        processing_completed_at: expect.any(String)
      }));
    });
  });

  describe('Error Handling', () => {
    it('should handle missing environment variables', async () => {
      // Remove required environment variables
      delete process.env.OPENAI_KEY;
      
      // Create a mock request with valid body
      const mockRequest = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioFilePath: 'user123/audio/lecture.mp3',
          lectureTitle: 'Introduction to Computer Science'
        })
      });
      
      // Import the API route
      const { POST } = await import('../../pages/api/generate');
      
      // Call the API route
      const response = await POST({ request: mockRequest, params: {}, locals: {} } as any);
      const responseBody = await response.json();
      
      // Verify that the response indicates an environment error
      expect(response.status).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.errorCode).toBe('ENVIRONMENT_ERROR');
      expect(responseBody.error).toContain('OPENAI_KEY');
    });
    
    it('should handle invalid JSON in request body', async () => {
      // Create a mock request with invalid JSON
      const mockRequest = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: '{invalid json'
      });
      
      // Import the API route
      const { POST } = await import('../../pages/api/generate');
      
      // Call the API route
      const response = await POST({ request: mockRequest, params: {}, locals: {} } as any);
      const responseBody = await response.json();
      
      // Verify that the response indicates an invalid request
      expect(response.status).toBe(400);
      expect(responseBody.success).toBe(false);
      expect(responseBody.errorCode).toBe('INVALID_REQUEST');
      expect(responseBody.error).toContain('Invalid JSON');
    });
    
    it('should handle authentication failures', async () => {
      // Import the mocked modules
      const { requireAuth } = await import('../../lib/supabase-server');
      
      // Mock the requireAuth function to throw an authentication error
      (requireAuth as any).mockRejectedValue(
        new Response(JSON.stringify({ error: 'Unauthorized', message: 'Authentication required' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      );
      
      // Create a mock request with valid body
      const mockRequest = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioFilePath: 'user123/audio/lecture.mp3',
          lectureTitle: 'Introduction to Computer Science'
        })
      });
      
      // Import the API route
      const { POST } = await import('../../pages/api/generate');
      
      // Call the API route
      const response = await POST({ request: mockRequest, params: {}, locals: {} } as any);
      const responseBody = await response.json();
      
      // Verify that the response indicates an authentication error
      expect(response.status).toBe(401);
      expect(responseBody.error).toBe('Unauthorized');
    });
    
    it('should handle file processing errors', async () => {
      // Import the mocked modules
      const { requireAuth } = await import('../../lib/supabase-server');
      const { generateSignedUrl } = await import('../../lib/file-processing');
      
      // Mock the requireAuth function to return a user and client
      const mockUser = { id: 'user-123' };
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { job_id: 'job-123' },
            error: null
          })
        })
      });
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      });
      const mockFrom = vi.fn().mockReturnValue({
        insert: mockInsert,
        update: mockUpdate
      });
      const mockClient = {
        from: mockFrom
      };
      
      (requireAuth as any).mockResolvedValue({
        user: mockUser,
        client: mockClient
      });
      
      // Mock the generateSignedUrl function to fail
      (generateSignedUrl as any).mockResolvedValue({
        success: false,
        error: 'Failed to generate signed URL'
      });
      
      // Create a mock request with valid body
      const mockRequest = new Request('http://localhost/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          audioFilePath: 'user123/audio/lecture.mp3',
          lectureTitle: 'Introduction to Computer Science'
        })
      });
      
      // Import the API route
      const { POST } = await import('../../pages/api/generate');
      
      // Call the API route
      const response = await POST({ request: mockRequest, params: {}, locals: {} } as any);
      const responseBody = await response.json();
      
      // Verify that the response indicates a storage error
      expect(response.status).toBe(500);
      expect(responseBody.success).toBe(false);
      expect(responseBody.errorCode).toBe('STORAGE_ERROR');
      expect(responseBody.error).toContain('Failed to generate signed URL');
      
      // Verify that the job status was updated to failed
      expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
        status: 'failed',
        error_message: expect.stringContaining('Failed to generate signed URL')
      }));
    });
  });
});