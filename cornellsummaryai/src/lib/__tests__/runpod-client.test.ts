import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RunPodClient, createRunPodClient, RunPodClientError, RunPodErrorType } from '../runpod-client';
import { Logger } from '../monitoring';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock Logger
vi.mock('../monitoring', () => {
  return {
    Logger: vi.fn().mockImplementation(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn()
    }))
  };
});

describe('RunPodClient', () => {
  let client: RunPodClient;
  const mockApiKey = 'test-api-key';
  const mockAudioUrl = 'https://example.com/audio.mp3';

  beforeEach(() => {
    client = new RunPodClient(mockApiKey);
    mockFetch.mockClear();
  });

  describe('transcribeAudio', () => {
    it('should successfully transcribe audio', async () => {
      const mockResponse = {
        output: {
          text: 'This is the transcribed text'
        },
        status: 'completed'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.transcribeAudio(mockAudioUrl);

      expect(result).toBe('This is the transcribed text');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.runpod.ai/v2/runsync',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${mockApiKey}`
          },
          body: JSON.stringify({
            input: {
              audio: mockAudioUrl
            }
          })
        }
      );
    });

    it('should throw error when audio URL is empty', async () => {
      await expect(client.transcribeAudio('')).rejects.toThrow('Audio URL is required');
    });

    it('should throw error when API key is not provided', async () => {
      const clientWithoutKey = new RunPodClient('');
      await expect(clientWithoutKey.transcribeAudio(mockAudioUrl)).rejects.toThrow('RunPod API key is not configured');
    });

    it('should handle API error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve('{"error": "Invalid audio format"}')
      });

      await expect(client.transcribeAudio(mockAudioUrl)).rejects.toThrow('RunPod transcription failed (APIError): Invalid audio format');
    });

    it('should handle non-JSON error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error')
      });

      await expect(client.transcribeAudio(mockAudioUrl)).rejects.toThrow('RunPod transcription failed (APIError): Server error');
    });

    it('should handle invalid response format', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ status: 'completed' }) // Missing output
      });

      await expect(client.transcribeAudio(mockAudioUrl)).rejects.toThrow('RunPod transcription failed (ResponseFormat): Invalid response format: could not extract transcription text');
    });
    
    it('should handle response format with output.transcription', async () => {
      const mockResponse = {
        output: {
          transcription: 'This is the transcribed text in format V2'
        },
        status: 'completed'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.transcribeAudio(mockAudioUrl);
      expect(result).toBe('This is the transcribed text in format V2');
    });
    
    it('should handle response format with output.result.transcription', async () => {
      const mockResponse = {
        output: {
          result: {
            transcription: 'This is the transcribed text in format V3'
          }
        },
        status: 'completed'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.transcribeAudio(mockAudioUrl);
      expect(result).toBe('This is the transcribed text in format V3');
    });
    
    it('should handle response format with other field names', async () => {
      const mockResponse = {
        output: {
          transcript: 'This is the transcribed text in alternative format'
        },
        status: 'completed'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.transcribeAudio(mockAudioUrl);
      expect(result).toBe('This is the transcribed text in alternative format');
    });
    
    it('should handle response format with nested field names', async () => {
      const mockResponse = {
        output: {
          data: {
            transcript: 'This is the transcribed text in nested format'
          }
        },
        status: 'completed'
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse)
      });

      const result = await client.transcribeAudio(mockAudioUrl);
      expect(result).toBe('This is the transcribed text in nested format');
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(client.transcribeAudio(mockAudioUrl)).rejects.toThrow('RunPod transcription failed (Network): Network error');
    });

    it('should use custom base URL when provided', async () => {
      const customClient = new RunPodClient(mockApiKey, 'https://custom.runpod.com');
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          output: { text: 'test' },
          status: 'completed'
        })
      });

      await customClient.transcribeAudio(mockAudioUrl);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://custom.runpod.com/runsync',
        expect.any(Object)
      );
    });
    
    it('should handle IN_PROGRESS status and retry successfully', async () => {
      // First response is IN_PROGRESS
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          id: 'job-123',
          status: 'IN_PROGRESS',
          workerId: 'worker-456'
        })
      });
      
      // Second response is completed
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          output: { text: 'Successfully transcribed after retry' },
          status: 'completed'
        })
      });
      
      // Use a very short retry delay for testing
      const result = await client.transcribeAudio(mockAudioUrl, 3, 10);
      
      expect(result).toBe('Successfully transcribed after retry');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
    
    it('should throw RunPodClientError with correct type for IN_PROGRESS after max retries', async () => {
      // All responses are IN_PROGRESS
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'job-123',
          status: 'IN_PROGRESS',
          workerId: 'worker-456'
        })
      });
      
      // Use a very short retry delay and only 2 retries
      try {
        await client.transcribeAudio(mockAudioUrl, 2, 10);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(RunPodClientError);
        expect((error as RunPodClientError).type).toBe(RunPodErrorType.IN_PROGRESS);
        expect((error as RunPodClientError).message).toContain('Job is still in progress');
        expect((error as RunPodClientError).retryAttempt).toBe(2);
        expect((error as RunPodClientError).maxRetries).toBe(2);
      }
      
      // Should have called fetch 3 times (initial + 2 retries)
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });
    
    it('should throw structured RunPodClientError for response format errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ 
          status: 'completed',
          // Missing output field
        })
      });

      try {
        await client.transcribeAudio(mockAudioUrl);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(RunPodClientError);
        expect((error as RunPodClientError).type).toBe(RunPodErrorType.RESPONSE_FORMAT);
        expect((error as RunPodClientError).responseData).toBeDefined();
      }
    });
  });
});

describe('createRunPodClient', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create client with environment variable', () => {
    process.env.RUNPOD_API_KEY = 'env-api-key';
    
    const client = createRunPodClient();
    expect(client).toBeInstanceOf(RunPodClient);
  });

  it('should throw error when environment variable is missing', () => {
    delete process.env.RUNPOD_API_KEY;
    
    expect(() => createRunPodClient()).toThrow('RunPod API key is not configured');
  });
});