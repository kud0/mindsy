import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../pages/api/generate';
import { requireAuth } from '../../lib/supabase-server';

// Mock the supabase-server module
vi.mock('../../lib/supabase-server', () => ({
  requireAuth: vi.fn().mockImplementation(async () => {
    // Create a mock client with the from method that returns a chainable query builder
    const mockFrom = vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { job_id: 'test-job-id' },
        error: null
      })
    });
    
    return {
      user: { id: 'test-user-id', email: 'test@example.com' },
      client: {
        userId: 'test-user-id',
        from: mockFrom,
        userQuery: vi.fn(),
        admin: {},
        storage: {
          from: vi.fn(),
          createSignedUrl: vi.fn(),
          upload: vi.fn()
        }
      }
    };
  })
}));

// Get the mocked requireAuth function
const mockRequireAuth = requireAuth as unknown as ReturnType<typeof vi.fn>;

describe('Generate API Request Handling', () => {
  // Reset mocks before each test
  beforeEach(() => {
    vi.clearAllMocks();
  });
  
  // No need to track mock client as we're using the return value directly
  
  // Helper function to create a mock request
  function createMockRequest(body: any) {
    return {
      request: {
        json: vi.fn().mockResolvedValue(body),
        headers: {
          get: vi.fn().mockReturnValue('test-cookie=value')
        }
      },
      params: {},
      locals: {}
    } as any;
  }

  it('should validate a valid request body', async () => {
    const mockRequest = createMockRequest({
      audioFilePath: 'uploads/audio123.mp3',
      lectureTitle: 'Introduction to Computer Science',
      courseSubject: 'CS101'
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.body).toEqual({
      audioFilePath: 'uploads/audio123.mp3',
      lectureTitle: 'Introduction to Computer Science',
      courseSubject: 'CS101'
    });
  });

  it('should validate a request with only required fields', async () => {
    const mockRequest = createMockRequest({
      audioFilePath: 'uploads/audio123.mp3',
      lectureTitle: 'Introduction to Computer Science'
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.body).toEqual({
      audioFilePath: 'uploads/audio123.mp3',
      lectureTitle: 'Introduction to Computer Science'
    });
  });

  it('should reject a request with missing audioFilePath', async () => {
    const mockRequest = createMockRequest({
      lectureTitle: 'Introduction to Computer Science'
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('audioFilePath is required');
  });

  it('should reject a request with missing lectureTitle', async () => {
    const mockRequest = createMockRequest({
      audioFilePath: 'uploads/audio123.mp3'
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('lectureTitle is required');
  });

  it('should reject a request with invalid audioFilePath format', async () => {
    const mockRequest = createMockRequest({
      audioFilePath: '../../../etc/passwd',
      lectureTitle: 'Introduction to Computer Science'
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid audioFilePath format');
  });

  it('should reject a request with invalid pdfFilePath format', async () => {
    const mockRequest = createMockRequest({
      audioFilePath: 'uploads/audio123.mp3',
      pdfFilePath: '../../../etc/passwd',
      lectureTitle: 'Introduction to Computer Science'
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid pdfFilePath format');
  });

  it('should handle invalid JSON in request body', async () => {
    const mockRequest = {
      request: {
        json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
        headers: {
          get: vi.fn().mockReturnValue('test-cookie=value')
        }
      },
      params: {},
      locals: {}
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Invalid JSON in request body');
  });

  it('should handle unexpected errors', async () => {
    const mockRequest = {
      request: {
        json: vi.fn().mockImplementation(() => {
          throw new Error('Unexpected error');
        }),
        headers: {
          get: vi.fn().mockReturnValue('test-cookie=value')
        }
      },
      params: {},
      locals: {}
    } as any;

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Internal server error');
    expect(data.details).toBe('Unexpected error');
  });

  // Authentication tests
  it('should authenticate the user and include user ID in response', async () => {
    const mockRequest = createMockRequest({
      audioFilePath: 'uploads/audio123.mp3',
      lectureTitle: 'Introduction to Computer Science'
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    // Verify requireAuth was called with the request
    expect(mockRequireAuth).toHaveBeenCalledWith(mockRequest.request);
    
    // Verify the response includes the user ID
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.userId).toBe('test-user-id');
  });

  it('should return 401 when authentication fails', async () => {
    // Mock requireAuth to throw an authentication error
    mockRequireAuth.mockImplementationOnce(() => {
      throw new Response(JSON.stringify({ 
        error: 'Unauthorized', 
        message: 'Authentication failed' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    });

    const mockRequest = createMockRequest({
      audioFilePath: 'uploads/audio123.mp3',
      lectureTitle: 'Introduction to Computer Science'
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should handle unexpected authentication errors', async () => {
    // Mock requireAuth to throw an unexpected error
    mockRequireAuth.mockImplementationOnce(() => {
      throw new Error('Unexpected authentication error');
    });

    const mockRequest = createMockRequest({
      audioFilePath: 'uploads/audio123.mp3',
      lectureTitle: 'Introduction to Computer Science'
    });

    const response = await POST(mockRequest);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.success).toBe(false);
    expect(data.errorCode).toBe('UNAUTHORIZED');
    expect(data.details).toBe('Unexpected authentication error');
  });
});