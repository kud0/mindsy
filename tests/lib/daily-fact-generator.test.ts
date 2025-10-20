/**
 * Unit tests for daily fact generation
 * Tests the generateDailyFact function and related utilities
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDailyFact, hasFactForToday } from '@/lib/daily-fact-generator';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateDailyStudyFact } from '@/lib/grok-client';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/grok-client');
vi.mock('@/lib/language-utils', () => ({
  detectLanguageFromText: vi.fn(() => 'en')
}));

describe('Daily Fact Generator', () => {
  let mockSupabaseClient: any;

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks();

    // Mock Supabase client
    mockSupabaseClient = {
      from: vi.fn(() => mockSupabaseClient),
      select: vi.fn(() => mockSupabaseClient),
      eq: vi.fn(() => mockSupabaseClient),
      order: vi.fn(() => mockSupabaseClient),
      limit: vi.fn(() => mockSupabaseClient),
      single: vi.fn(),
      update: vi.fn(() => mockSupabaseClient)
    };

    (createServiceRoleClient as any).mockReturnValue(mockSupabaseClient);
  });

  describe('generateDailyFact', () => {
    it('should successfully generate a daily fact for user with lectures', async () => {
      // Mock lectures data
      const mockLectures = [
        {
          job_id: 'job1',
          lecture_title: 'Introduction to Biology',
          course_subject: 'Science',
          created_at: '2025-01-20T10:00:00Z'
        },
        {
          job_id: 'job2',
          lecture_title: 'Cell Structure',
          course_subject: 'Science',
          created_at: '2025-01-19T10:00:00Z'
        }
      ];

      // Mock Supabase responses
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockLectures,
                error: null
              })
            })
          })
        })
      });

      mockSupabaseClient.update.mockResolvedValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      // Mock Grok API response
      (generateDailyStudyFact as any).mockResolvedValueOnce({
        success: true,
        fact: 'Did you know? Mitochondria are called the powerhouse of the cell!',
        language: 'en'
      });

      const result = await generateDailyFact('user123');

      expect(result.success).toBe(true);
      expect(result.fact).toBeDefined();
      expect(result.language).toBe('en');
    });

    it('should return error when user has no lectures', async () => {
      // Mock empty lectures
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        })
      });

      const result = await generateDailyFact('user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No lectures found for this user');
    });

    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Database connection failed' }
              })
            })
          })
        })
      });

      const result = await generateDailyFact('user123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to fetch user lectures');
    });

    it('should handle Grok API failures', async () => {
      // Mock lectures
      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  {
                    job_id: 'job1',
                    lecture_title: 'Test Lecture',
                    course_subject: 'Test',
                    created_at: '2025-01-20T10:00:00Z'
                  }
                ],
                error: null
              })
            })
          })
        })
      });

      // Mock Grok API failure
      (generateDailyStudyFact as any).mockResolvedValueOnce({
        success: false,
        error: 'API rate limit exceeded',
        errorCode: 'RATE_LIMIT_ERROR'
      });

      const result = await generateDailyFact('user123');

      expect(result.success).toBe(false);
      expect(result.error).toContain('API rate limit exceeded');
    });

    it('should detect language from lecture titles', async () => {
      // Mock Spanish lectures
      const mockLectures = [
        {
          job_id: 'job1',
          lecture_title: 'Introducción a la Biología',
          course_subject: 'Ciencias',
          created_at: '2025-01-20T10:00:00Z'
        }
      ];

      mockSupabaseClient.select.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockLectures,
                error: null
              })
            })
          })
        })
      });

      mockSupabaseClient.update.mockResolvedValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      (generateDailyStudyFact as any).mockResolvedValueOnce({
        success: true,
        fact: '¿Sabías que las mitocondrias son la central energética de la célula?',
        language: 'es'
      });

      const result = await generateDailyFact('user123');

      expect(result.success).toBe(true);
      expect(result.language).toBe('es');
    });
  });

  describe('hasFactForToday', () => {
    it('should return true when valid fact exists for today', async () => {
      const today = new Date().toISOString().split('T')[0];

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          daily_fact_date: today,
          daily_fact_text: 'A fact',
          daily_fact_dismissed: false
        },
        error: null
      });

      const result = await hasFactForToday('user123');

      expect(result).toBe(true);
    });

    it('should return false when fact is dismissed', async () => {
      const today = new Date().toISOString().split('T')[0];

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          daily_fact_date: today,
          daily_fact_text: 'A fact',
          daily_fact_dismissed: true
        },
        error: null
      });

      const result = await hasFactForToday('user123');

      expect(result).toBe(false);
    });

    it('should return false when fact is from yesterday', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          daily_fact_date: yesterdayStr,
          daily_fact_text: 'A fact',
          daily_fact_dismissed: false
        },
        error: null
      });

      const result = await hasFactForToday('user123');

      expect(result).toBe(false);
    });

    it('should return false when no profile found', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Profile not found' }
      });

      const result = await hasFactForToday('user123');

      expect(result).toBe(false);
    });
  });
});
