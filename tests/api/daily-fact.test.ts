/**
 * Integration tests for /api/daily-fact endpoint
 * Tests the complete request-response cycle
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/daily-fact/route';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateDailyFact } from '@/lib/daily-fact-generator';

// Mock dependencies
vi.mock('@/lib/supabase/server');
vi.mock('@/lib/daily-fact-generator');

describe('Daily Fact API Routes', () => {
  let mockSupabaseClient: any;
  const mockUserId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock Supabase client
    mockSupabaseClient = {
      auth: {
        getUser: vi.fn()
      },
      from: vi.fn(() => mockSupabaseClient),
      select: vi.fn(() => mockSupabaseClient),
      eq: vi.fn(() => mockSupabaseClient),
      single: vi.fn(),
      update: vi.fn(() => mockSupabaseClient)
    };

    (createClient as any).mockResolvedValue(mockSupabaseClient);
  });

  describe('GET /api/daily-fact', () => {
    it('should return 401 when user is not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });

    it('should return existing fact for today', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock profile with existing fact
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          daily_fact_text: 'Did you know? Test fact!',
          daily_fact_date: today,
          daily_fact_dismissed: false,
          daily_fact_collapsed: false,
          daily_fact_language: 'en'
        },
        error: null
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fact).toBe('Did you know? Test fact!');
      expect(data.generated).toBe(false);
      expect(data.date).toBe(today);
    });

    it('should generate new fact when none exists', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock profile with no fact
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          daily_fact_text: null,
          daily_fact_date: null,
          daily_fact_dismissed: false,
          daily_fact_collapsed: false,
          daily_fact_language: null
        },
        error: null
      });

      // Mock fact generation
      (generateDailyFact as any).mockResolvedValueOnce({
        success: true,
        fact: 'Generated fact!',
        language: 'en'
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fact).toBe('Generated fact!');
      expect(data.generated).toBe(true);
      expect(data.date).toBe(today);
    });

    it('should generate new fact when existing fact is outdated', async () => {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock profile with outdated fact
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          daily_fact_text: 'Old fact',
          daily_fact_date: yesterdayStr,
          daily_fact_dismissed: false,
          daily_fact_collapsed: false,
          daily_fact_language: 'en'
        },
        error: null
      });

      // Mock fact generation
      (generateDailyFact as any).mockResolvedValueOnce({
        success: true,
        fact: 'New fact for today!',
        language: 'en'
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fact).toBe('New fact for today!');
      expect(data.generated).toBe(true);
      expect(data.date).toBe(today);
    });

    it('should return null when fact is dismissed', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock profile with dismissed fact
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          daily_fact_text: 'Dismissed fact',
          daily_fact_date: today,
          daily_fact_dismissed: true,
          daily_fact_collapsed: false,
          daily_fact_language: 'en'
        },
        error: null
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.fact).toBeNull();
      expect(data.dismissed).toBe(true);
    });

    it('should handle database schema errors', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock database error (missing column)
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: null,
        error: {
          code: '42703',
          message: 'column "daily_fact_text" does not exist'
        }
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('Database schema error');
      expect(data.error).toContain('migration');
    });

    it('should handle fact generation failures', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock profile with no fact
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          daily_fact_text: null,
          daily_fact_date: null,
          daily_fact_dismissed: false,
          daily_fact_collapsed: false,
          daily_fact_language: null
        },
        error: null
      });

      // Mock fact generation failure (no lectures)
      (generateDailyFact as any).mockResolvedValueOnce({
        success: false,
        error: 'No lectures found for this user',
        errorCode: 'NO_LECTURES'
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('No completed lectures found');
    });

    it('should handle Grok API authentication errors', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock profile with no fact
      mockSupabaseClient.single.mockResolvedValueOnce({
        data: {
          daily_fact_text: null,
          daily_fact_date: null,
          daily_fact_dismissed: false,
          daily_fact_collapsed: false,
          daily_fact_language: null
        },
        error: null
      });

      // Mock Grok API authentication failure
      (generateDailyFact as any).mockResolvedValueOnce({
        success: false,
        error: 'Grok authentication failed',
        errorCode: 'AUTHENTICATION_ERROR'
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact');
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toContain('AI service authentication failed');
      expect(data.error).toContain('GROK_API_KEY');
    });
  });

  describe('PATCH /api/daily-fact', () => {
    it('should successfully dismiss fact', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock successful update
      mockSupabaseClient.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact', {
        method: 'PATCH',
        body: JSON.stringify({ dismissed: true })
      });

      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.dismissed).toBe(true);
    });

    it('should successfully collapse fact', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      // Mock successful update
      mockSupabaseClient.update.mockReturnValueOnce({
        eq: vi.fn().mockResolvedValue({ error: null })
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact', {
        method: 'PATCH',
        body: JSON.stringify({ collapsed: true })
      });

      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.collapsed).toBe(true);
    });

    it('should return 400 when no fields provided', async () => {
      // Mock authenticated user
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUserId } },
        error: null
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact', {
        method: 'PATCH',
        body: JSON.stringify({})
      });

      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('At least one field');
    });

    it('should return 401 when not authenticated', async () => {
      mockSupabaseClient.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null
      });

      const req = new NextRequest('http://localhost:3001/api/daily-fact', {
        method: 'PATCH',
        body: JSON.stringify({ dismissed: true })
      });

      const response = await PATCH(req);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toContain('Authentication required');
    });
  });
});
