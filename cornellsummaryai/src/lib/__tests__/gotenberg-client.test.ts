import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GotenbergClient, createGotenbergClient, validateGotenbergConfig } from '../gotenberg-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock FormData
class MockFormData {
  private data: Map<string, any> = new Map();
  
  append(key: string, value: any, filename?: string) {
    this.data.set(key, { value, filename });
  }
  
  get(key: string) {
    return this.data.get(key)?.value;
  }
  
  has(key: string) {
    return this.data.has(key);
  }
}

global.FormData = MockFormData as any;

// Mock Blob
global.Blob = class MockBlob {
  constructor(public content: any[], public options?: { type?: string }) {}
} as any;

describe('GotenbergClient', () => {
  let client: GotenbergClient;
  const mockApiUrl = 'https://gotenberg.example.com';

  beforeEach(() => {
    client = new GotenbergClient(mockApiUrl);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use provided base URL', () => {
      const customClient = new GotenbergClient('https://custom.example.com');
      expect(customClient).toBeInstanceOf(GotenbergClient);
    });

    it('should use environment variable when no URL provided', () => {
      process.env.GOTENBERG_API_URL = 'https://env.example.com';
      const envClient = new GotenbergClient();
      expect(envClient).toBeInstanceOf(GotenbergClient);
      delete process.env.GOTENBERG_API_URL;
    });
  });

  describe('generatePdfFromHtml', () => {
    it('should successfully generate PDF from HTML content', async () => {
      const mockPdfBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/pdf')
        },
        arrayBuffer: vi.fn().mockResolvedValue(mockPdfBuffer)
      });

      const result = await client.generatePdfFromHtml('<h1>Test HTML</h1>');

      expect(result.success).toBe(true);
      expect(result.pdfBuffer).toBe(mockPdfBuffer);
      expect(result.error).toBeUndefined();
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/forms/chromium/convert/html`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(MockFormData)
        })
      );
    });

    it('should return error for empty HTML content', async () => {
      const result = await client.generatePdfFromHtml('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Content is required and cannot be empty');
      expect(result.errorCode).toBe('INVALID_INPUT');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should return error when API URL is not configured', async () => {
      const clientWithoutUrl = new GotenbergClient('');
      const result = await clientWithoutUrl.generatePdfFromHtml('<h1>Test</h1>');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Gotenberg API URL is not configured');
      expect(result.errorCode).toBe('MISSING_CONFIG');
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: vi.fn().mockResolvedValue('Invalid HTML content')
      });

      const result = await client.generatePdfFromHtml('<invalid>html');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid HTML content');
      expect(result.errorCode).toBe('API_ERROR');
    });

    it('should handle JSON error responses', async () => {
      const errorResponse = { error: 'Processing failed', message: 'Invalid format' };
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: vi.fn().mockResolvedValue(JSON.stringify(errorResponse))
      });

      const result = await client.generatePdfFromHtml('<h1>Test</h1>');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid format');
      expect(result.errorCode).toBe('API_ERROR');
    });

    it('should handle invalid content type response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('text/html')
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(1024))
      });

      const result = await client.generatePdfFromHtml('<h1>Test</h1>');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unexpected response content type: text/html');
      expect(result.errorCode).toBe('INVALID_RESPONSE');
    });

    it('should handle empty PDF response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/pdf')
        },
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0))
      });

      const result = await client.generatePdfFromHtml('<h1>Test</h1>');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Generated PDF is empty');
      expect(result.errorCode).toBe('EMPTY_PDF');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.generatePdfFromHtml('<h1>Test</h1>');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.errorCode).toBe('UNKNOWN_ERROR');
    });
  });

  describe('generatePdfFromMarkdown', () => {
    it('should successfully generate PDF from Markdown content', async () => {
      const mockPdfBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/pdf')
        },
        arrayBuffer: vi.fn().mockResolvedValue(mockPdfBuffer)
      });

      const result = await client.generatePdfFromMarkdown('# Test Markdown');

      expect(result.success).toBe(true);
      expect(result.pdfBuffer).toBe(mockPdfBuffer);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/forms/chromium/convert/markdown`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(MockFormData)
        })
      );
    });

    it('should return error for empty Markdown content', async () => {
      const result = await client.generatePdfFromMarkdown('   ');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Content is required and cannot be empty');
      expect(result.errorCode).toBe('INVALID_INPUT');
    });
  });

  describe('generateMindsyNotesPdf', () => {
    it('should successfully generate PDF from Mindsy Notes text', async () => {
      const mockPdfBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/pdf')
        },
        arrayBuffer: vi.fn().mockResolvedValue(mockPdfBuffer)
      });

      const notesText = `
Cue Column: Key Terms
Notes Area: Detailed notes about the topic
Summary: Brief summary of the content
      `;

      const result = await client.generateMindsyNotesPdf(notesText, 'Biology Lecture');

      expect(result.success).toBe(true);
      expect(result.pdfBuffer).toBe(mockPdfBuffer);
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/forms/chromium/convert/html`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(MockFormData)
        })
      );
    });

    it('should return error for empty notes text', async () => {
      const result = await client.generateMindsyNotesPdf('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Notes text is required and cannot be empty');
      expect(result.errorCode).toBe('INVALID_INPUT');
    });

    it('should format Mindsy Notes with title', async () => {
      const mockPdfBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/pdf')
        },
        arrayBuffer: vi.fn().mockResolvedValue(mockPdfBuffer)
      });

      const result = await client.generateMindsyNotesPdf('Test notes', 'Test Title');

      expect(result.success).toBe(true);
      // Verify that the HTML contains the title
      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData).toBeInstanceOf(MockFormData);
    });
  });

  describe('HTML escaping', () => {
    it('should properly escape HTML special characters in Mindsy Notes', async () => {
      const mockPdfBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        headers: {
          get: vi.fn().mockReturnValue('application/pdf')
        },
        arrayBuffer: vi.fn().mockResolvedValue(mockPdfBuffer)
      });

      const notesWithSpecialChars = 'Notes with <script>alert("xss")</script> & "quotes"';
      const result = await client.generateMindsyNotesPdf(notesWithSpecialChars);

      expect(result.success).toBe(true);
      // The HTML should be properly escaped
      const formData = mockFetch.mock.calls[0][1].body;
      expect(formData).toBeInstanceOf(MockFormData);
    });
  });
});

describe('createGotenbergClient', () => {
  beforeEach(() => {
    delete process.env.GOTENBERG_API_URL;
  });

  it('should create client with environment variable', () => {
    process.env.GOTENBERG_API_URL = 'https://gotenberg.example.com';
    const client = createGotenbergClient();
    expect(client).toBeInstanceOf(GotenbergClient);
  });

  it('should throw error when environment variable is missing', () => {
    expect(() => createGotenbergClient()).toThrow(
      'GOTENBERG_API_URL environment variable is required'
    );
  });
});

describe('validateGotenbergConfig', () => {
  beforeEach(() => {
    delete process.env.GOTENBERG_API_URL;
  });

  it('should return valid for proper URL', () => {
    process.env.GOTENBERG_API_URL = 'https://gotenberg.example.com';
    const result = validateGotenbergConfig();
    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return invalid when environment variable is missing', () => {
    const result = validateGotenbergConfig();
    expect(result.valid).toBe(false);
    expect(result.error).toBe('GOTENBERG_API_URL environment variable is not set');
  });

  it('should return invalid for malformed URL', () => {
    process.env.GOTENBERG_API_URL = 'not-a-valid-url';
    const result = validateGotenbergConfig();
    expect(result.valid).toBe(false);
    expect(result.error).toBe('GOTENBERG_API_URL is not a valid URL');
  });
});