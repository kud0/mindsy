/**
 * Tests for Railway Tika API Client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TikaClient, createTikaClient } from '../tika-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TikaClient', () => {
  let tikaClient: TikaClient;
  const mockTikaUrl = 'https://test-tika-api.railway.app';

  beforeEach(() => {
    tikaClient = new TikaClient(mockTikaUrl);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('constructor', () => {
    it('should use provided base URL', () => {
      const client = new TikaClient('https://custom-url.com');
      expect(client).toBeInstanceOf(TikaClient);
    });

    it('should use environment variable when no URL provided', () => {
      process.env.TIKA_API_URL = 'https://env-url.com';
      const client = new TikaClient();
      expect(client).toBeInstanceOf(TikaClient);
    });

    it('should use empty string when no URL or env var', () => {
      delete process.env.TIKA_API_URL;
      const client = new TikaClient();
      expect(client).toBeInstanceOf(TikaClient);
    });
  });

  describe('extractPdfText', () => {
    const mockPdfUrl = 'https://storage.supabase.co/signed-url/test.pdf';
    const mockPdfBuffer = new ArrayBuffer(1024);
    const mockExtractedText = 'This is extracted PDF text content.';

    it('should successfully extract text from PDF URL', async () => {
      // Mock PDF fetch
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockPdfBuffer)
        })
        // Mock Tika API response
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(mockExtractedText)
        });

      const result = await tikaClient.extractPdfText(mockPdfUrl);

      expect(result).toBe(mockExtractedText);
      expect(mockFetch).toHaveBeenCalledTimes(2);
      
      // Check PDF fetch call
      expect(mockFetch).toHaveBeenNthCalledWith(1, mockPdfUrl);
      
      // Check Tika API call
      expect(mockFetch).toHaveBeenNthCalledWith(2, mockTikaUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'text/plain'
        },
        body: mockPdfBuffer
      });
    });

    it('should throw error when PDF URL is empty', async () => {
      await expect(tikaClient.extractPdfText('')).rejects.toThrow('PDF URL is required');
    });

    it('should throw error when Tika API URL is not configured', async () => {
      const clientWithoutUrl = new TikaClient('');
      await expect(clientWithoutUrl.extractPdfText(mockPdfUrl)).rejects.toThrow('Tika API URL is not configured');
    });

    it('should throw error when PDF fetch fails', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found'
      });

      await expect(tikaClient.extractPdfText(mockPdfUrl)).rejects.toThrow('Failed to fetch PDF: 404 Not Found');
    });

    it('should throw error when PDF is empty', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0))
      });

      await expect(tikaClient.extractPdfText(mockPdfUrl)).rejects.toThrow('PDF file is empty');
    });

    it('should handle Tika API error with JSON response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockPdfBuffer)
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          text: () => Promise.resolve('{"error": "Invalid PDF format", "message": "The file is corrupted"}')
        });

      await expect(tikaClient.extractPdfText(mockPdfUrl)).rejects.toThrow('PDF text extraction failed: The file is corrupted');
    });

    it('should handle Tika API error with plain text response', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockPdfBuffer)
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Server temporarily unavailable')
        });

      await expect(tikaClient.extractPdfText(mockPdfUrl)).rejects.toThrow('PDF text extraction failed: Server temporarily unavailable');
    });

    it('should handle Tika API error with malformed JSON', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockPdfBuffer)
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: () => Promise.resolve('Invalid JSON {')
        });

      await expect(tikaClient.extractPdfText(mockPdfUrl)).rejects.toThrow('PDF text extraction failed: Invalid JSON {');
    });

    it('should throw error when no text is extracted', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockPdfBuffer)
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve('')
        });

      await expect(tikaClient.extractPdfText(mockPdfUrl)).rejects.toThrow('No text could be extracted from the PDF');
    });

    it('should trim whitespace from extracted text', async () => {
      const textWithWhitespace = '  \n  ' + mockExtractedText + '  \n  ';
      
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(mockPdfBuffer)
        })
        .mockResolvedValueOnce({
          ok: true,
          text: () => Promise.resolve(textWithWhitespace)
        });

      const result = await tikaClient.extractPdfText(mockPdfUrl);
      expect(result).toBe(mockExtractedText);
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(tikaClient.extractPdfText(mockPdfUrl)).rejects.toThrow('PDF text extraction failed: Network error');
    });

    it('should handle unknown errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce('Unknown error type');

      await expect(tikaClient.extractPdfText(mockPdfUrl)).rejects.toThrow('PDF text extraction failed: Unknown error');
    });
  });

  describe('extractPdfTextFromBuffer', () => {
    const mockPdfBuffer = new ArrayBuffer(1024);
    const mockExtractedText = 'This is extracted PDF text content.';

    it('should successfully extract text from PDF buffer', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: () => Promise.resolve(mockExtractedText)
      });

      const result = await tikaClient.extractPdfTextFromBuffer(mockPdfBuffer);

      expect(result).toBe(mockExtractedText);
      expect(mockFetch).toHaveBeenCalledWith(mockTikaUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'text/plain'
        },
        body: mockPdfBuffer
      });
    });

    it('should throw error when buffer is empty', async () => {
      const emptyBuffer = new ArrayBuffer(0);
      await expect(tikaClient.extractPdfTextFromBuffer(emptyBuffer)).rejects.toThrow('PDF buffer is required and cannot be empty');
    });

    it('should throw error when buffer is null/undefined', async () => {
      await expect(tikaClient.extractPdfTextFromBuffer(null as any)).rejects.toThrow('PDF buffer is required and cannot be empty');
    });

    it('should throw error when Tika API URL is not configured', async () => {
      const clientWithoutUrl = new TikaClient('');
      await expect(clientWithoutUrl.extractPdfTextFromBuffer(mockPdfBuffer)).rejects.toThrow('Tika API URL is not configured');
    });

    it('should handle Tika API errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('{"error": "Invalid PDF"}')
      });

      await expect(tikaClient.extractPdfTextFromBuffer(mockPdfBuffer)).rejects.toThrow('PDF text extraction failed: Invalid PDF');
    });
  });

  describe('createTikaClient factory function', () => {
    it('should create client with environment variable', () => {
      process.env.TIKA_API_URL = 'https://factory-test.railway.app';
      
      const client = createTikaClient();
      expect(client).toBeInstanceOf(TikaClient);
    });

    it('should throw error when environment variable is missing', () => {
      delete process.env.TIKA_API_URL;
      
      expect(() => createTikaClient()).toThrow('TIKA_API_URL environment variable is required');
    });

    it('should throw error when environment variable is empty', () => {
      process.env.TIKA_API_URL = '';
      
      expect(() => createTikaClient()).toThrow('TIKA_API_URL environment variable is required');
    });
  });
});