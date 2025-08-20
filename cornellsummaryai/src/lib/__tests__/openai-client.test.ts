import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateOpenAIConfig, type MindsyNotesInput, generateMindsyNotes } from '../openai-client';
import OpenAI from 'openai';

// Mock OpenAI
vi.mock('openai', () => {
  const mockCreate = vi.fn();
  return {
    default: vi.fn(() => ({
      chat: {
        completions: {
          create: mockCreate
        }
      }
    })),
    APIError: class APIError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'APIError';
      }
    },
    AuthenticationError: class AuthenticationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'AuthenticationError';
      }
    },
    RateLimitError: class RateLimitError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'RateLimitError';
      }
    }
  };
});

describe('OpenAI Client', () => {
  // Store original console.error
  const originalConsoleError = console.error;
  
  beforeEach(() => {
    // Mock console.error to prevent noise in test output
    console.error = vi.fn();
  });
  
  afterEach(() => {
    // Restore console.error
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });
  
  describe('validateOpenAIConfig', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should validate correct API key configuration', () => {
      process.env.OPENAI_KEY = 'sk-test-api-key-123';

      const result = validateOpenAIConfig();

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect missing API key', () => {
      delete process.env.OPENAI_KEY;

      const result = validateOpenAIConfig();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('OPENAI_KEY environment variable is not set');
    });

    it('should detect invalid API key format', () => {
      process.env.OPENAI_KEY = 'invalid-key-format';

      const result = validateOpenAIConfig();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('OPENAI_KEY appears to be invalid (should start with sk-)');
    });

    it('should handle empty API key', () => {
      process.env.OPENAI_KEY = '';

      const result = validateOpenAIConfig();

      expect(result.valid).toBe(false);
      expect(result.error).toBe('OPENAI_KEY environment variable is not set');
    });
  });

  describe('MindsyNotesInput interface', () => {
    it('should accept valid input with all fields', () => {
      const input: MindsyNotesInput = {
        transcript: 'Sample transcript',
        pdfText: 'Sample PDF content',
        lectureTitle: 'Test Lecture',
        courseSubject: 'Computer Science'
      };

      expect(input.transcript).toBe('Sample transcript');
      expect(input.pdfText).toBe('Sample PDF content');
      expect(input.lectureTitle).toBe('Test Lecture');
      expect(input.courseSubject).toBe('Computer Science');
    });

    it('should accept minimal input with only transcript', () => {
      const input: MindsyNotesInput = {
        transcript: 'Sample transcript'
      };

      expect(input.transcript).toBe('Sample transcript');
      expect(input.pdfText).toBeUndefined();
      expect(input.lectureTitle).toBeUndefined();
      expect(input.courseSubject).toBeUndefined();
    });
  });

  describe('generateMindsyNotes', () => {
    beforeEach(() => {
      // Set up environment
      process.env.OPENAI_KEY = 'sk-test-api-key-123';
    });
    
    it('should generate Mindsy notes successfully', async () => {
      // Mock successful OpenAI response
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default().chat.completions.create as any;
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '# Mindsy Notes\n\n## Key Terms\n- Term 1\n- Term 2\n\n## Notes\nDetailed notes here\n\n## Summary\nSummary of the content'
            }
          }
        ]
      });
      
      const result = await generateMindsyNotes({
        transcript: 'This is a sample transcript',
        lectureTitle: 'Test Lecture'
      });
      
      expect(result.success).toBe(true);
      expect(result.notes).toBeDefined();
      expect(result.notes).toContain('Mindsy Notes');
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        model: 'gpt-4o-mini',
        messages: expect.arrayContaining([
          expect.objectContaining({
            role: 'system'
          }),
          expect.objectContaining({
            role: 'user',
            content: expect.stringContaining('This is a sample transcript')
          })
        ])
      }));
    });
    
    it('should handle empty transcript input', async () => {
      const result = await generateMindsyNotes({
        transcript: ''
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Transcript is required and cannot be empty');
      expect(result.errorCode).toBe('INVALID_INPUT');
    });
    
    it('should include PDF text in prompt when provided', async () => {
      // Mock successful OpenAI response
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default().chat.completions.create as any;
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: '# Mindsy Notes with PDF content'
            }
          }
        ]
      });
      
      await generateMindsyNotes({
        transcript: 'Sample transcript',
        pdfText: 'PDF content here',
        lectureTitle: 'Test Lecture'
      });
      
      // Verify that PDF content was included in the prompt
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              content: expect.stringContaining('PDF content here')
            })
          ])
        })
      );
    });
    
    it('should handle empty API response', async () => {
      // Mock empty OpenAI response
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default().chat.completions.create as any;
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }]
      });
      
      const result = await generateMindsyNotes({
        transcript: 'Sample transcript'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI API returned empty response');
      expect(result.errorCode).toBe('EMPTY_RESPONSE');
    });
    
    it('should handle OpenAI API errors', async () => {
      // Mock API error
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default().chat.completions.create as any;
      mockCreate.mockRejectedValue(
        new mockOpenAI.APIError('API error occurred')
      );
      
      const result = await generateMindsyNotes({
        transcript: 'Sample transcript'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI API error: API error occurred');
      expect(result.errorCode).toBe('OPENAI_API_ERROR');
      expect(console.error).toHaveBeenCalled();
    });
    
    it('should handle authentication errors', async () => {
      // Mock authentication error
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default().chat.completions.create as any;
      mockCreate.mockRejectedValue(
        new mockOpenAI.AuthenticationError('Invalid API key')
      );
      
      const result = await generateMindsyNotes({
        transcript: 'Sample transcript'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI authentication failed - check API key');
      expect(result.errorCode).toBe('AUTHENTICATION_ERROR');
    });
    
    it('should handle rate limit errors', async () => {
      // Mock rate limit error
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default().chat.completions.create as any;
      mockCreate.mockRejectedValue(
        new mockOpenAI.RateLimitError('Rate limit exceeded')
      );
      
      const result = await generateMindsyNotes({
        transcript: 'Sample transcript'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('OpenAI rate limit exceeded - please try again later');
      expect(result.errorCode).toBe('RATE_LIMIT_ERROR');
    });
    
    it('should handle generic errors', async () => {
      // Mock generic error
      const mockOpenAI = await import('openai');
      const mockCreate = mockOpenAI.default().chat.completions.create as any;
      mockCreate.mockRejectedValue(new Error('Network error'));
      
      const result = await generateMindsyNotes({
        transcript: 'Sample transcript'
      });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.errorCode).toBe('UNKNOWN_ERROR');
    });
  });

  describe('Integration test setup', () => {
    it('should export required functions and types', async () => {
      // Test that all required exports are available
      const { generateMindsyNotes, validateOpenAIConfig } = await import('../openai-client');
      
      expect(typeof generateMindsyNotes).toBe('function');
      expect(typeof validateOpenAIConfig).toBe('function');
    });
  });
});