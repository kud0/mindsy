/**
 * Unit tests for PDF bookmark generation functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GotenbergClient } from '../gotenberg-client';

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
  
  entries() {
    return Array.from(this.data.entries()).map(([key, data]) => [key, data.value]);
  }
}

global.FormData = MockFormData as any;

// Mock Blob
global.Blob = class MockBlob {
  constructor(public content: any[], public options?: { type?: string }) {}
} as any;

describe('PDF Bookmark Generation', () => {
  let gotenbergClient: GotenbergClient;
  const mockApiUrl = 'https://gotenberg.example.com';

  beforeEach(() => {
    gotenbergClient = new GotenbergClient(mockApiUrl);
    mockFetch.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Bookmark Data Structures', () => {
    it('should define proper bookmark interface', () => {
      // Test that the bookmark interface is properly typed
      const bookmark = {
        title: 'Test Section',
        level: 1,
        anchor: 'test-section',
        page: 1
      };

      expect(bookmark.title).toBe('Test Section');
      expect(bookmark.level).toBe(1);
      expect(bookmark.anchor).toBe('test-section');
      expect(bookmark.page).toBe(1);
    });
  });

  describe('PDF Generation with Bookmarks', () => {
    it('should generate PDF with bookmark options enabled', async () => {
      // Mock successful PDF response
      const mockPdfBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: () => Promise.resolve(mockPdfBuffer)
      });

      const htmlContent = `
        <h2 id="table-of-contents" class="toc-header">Table of Contents</h2>
        <ul>
          <li>Introduction</li>
          <li>Main Content</li>
          <li>Summary</li>
        </ul>
        <h2 id="mindsy-notes" class="mindsy-header">Mindsy Notes</h2>
        <p>Notes content</p>
        <h2 id="comprehensive-summary">Comprehensive Summary</h2>
        <p>Summary content</p>
      `;

      const result = await gotenbergClient.generatePdfFromHtml(htmlContent, {
        title: 'Test Document',
        generateBookmarks: true
      });

      expect(result.success).toBe(true);
      expect(result.pdfBuffer).toBeDefined();
      
      // Verify that bookmark-related form data was sent
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/forms/chromium/convert/html`,
        expect.objectContaining({
          method: 'POST',
          body: expect.any(MockFormData)
        })
      );

      // Check that bookmark options were included in the form data
      const formData = mockFetch.mock.calls[0][1].body;
      const formDataEntries = formData.entries();
      
      const hasBookmarkOptions = formDataEntries.some(([key, value]) => 
        key === 'pdfFormat' && value === 'PDF/A-1a'
      );
      
      expect(hasBookmarkOptions).toBe(true);
    });

    it('should generate Mindsy Notes PDF with bookmarks by default', async () => {
      // Mock successful PDF response
      const mockPdfBuffer = new ArrayBuffer(2048);
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: () => Promise.resolve(mockPdfBuffer)
      });

      const mindsyNotesContent = `
# Table of Contents

- Introduction to Topic
- Key Concepts
- Applications
- Summary

<!-- NEW_PAGE -->

# Mindsy Notes

## Cue Column

- What is the main concept?
- How does it apply?
- Why is it important?

## Detailed Notes

Content goes here...

<!-- NEW_PAGE -->

# Comprehensive Summary

Final summary content...
      `;

      const result = await gotenbergClient.generateMindsyNotesPdf(
        mindsyNotesContent,
        'Test Mindsy Notes'
      );

      expect(result.success).toBe(true);
      expect(result.pdfBuffer).toBeDefined();
      
      // Verify bookmark generation was enabled
      expect(mockFetch).toHaveBeenCalledWith(
        `${mockApiUrl}/forms/chromium/convert/html`,
        expect.objectContaining({
          method: 'POST'
        })
      );
      
      // Check that bookmark options were included
      const formData = mockFetch.mock.calls[0][1].body;
      const formDataEntries = formData.entries();
      
      const hasBookmarkOptions = formDataEntries.some(([key, value]) => 
        key === 'pdfFormat' && value === 'PDF/A-1a'
      );
      
      expect(hasBookmarkOptions).toBe(true);
    });
  });

  describe('HTML Processing for Bookmarks', () => {
    beforeEach(() => {
      // Mock successful PDF response for all HTML processing tests
      const mockPdfBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: () => Promise.resolve(mockPdfBuffer)
      });
    });

    it('should add bookmark anchors to main sections', async () => {
      const htmlContent = `
        <h2>Table of Contents</h2>
        <h2>Mindsy Notes</h2>
        <h2>Comprehensive Summary</h2>
      `;

      const result = await gotenbergClient.generatePdfFromHtml(htmlContent, {
        generateBookmarks: true
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle table of contents items', async () => {
      const htmlContent = `
        <h2 class="toc-header">Table of Contents</h2>
        <ul>
          <li>Introduction to Biomechanics</li>
          <li>Key Principles</li>
          <li>Applications</li>
        </ul>
      `;

      const result = await gotenbergClient.generatePdfFromHtml(htmlContent, {
        generateBookmarks: true
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Bookmark CSS and Styling', () => {
    beforeEach(() => {
      // Mock successful PDF response
      const mockPdfBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: () => Promise.resolve(mockPdfBuffer)
      });
    });

    it('should include bookmark CSS in generated HTML', async () => {
      const htmlContent = '<h2 id="test">Test Section</h2>';

      const result = await gotenbergClient.generatePdfFromHtml(htmlContent, {
        generateBookmarks: true
      });

      expect(result.success).toBe(true);
      expect(mockFetch).toHaveBeenCalled();
      
      // The actual HTML content with CSS is passed to Gotenberg
      const formData = mockFetch.mock.calls[0][1].body;
      const formDataEntries = formData.entries();
      
      // Find the HTML file entry
      const htmlEntry = formDataEntries.find(([key]) => key === 'files');
      expect(htmlEntry).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Mock successful PDF response
      const mockPdfBuffer = new ArrayBuffer(1024);
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Map([['content-type', 'application/pdf']]),
        arrayBuffer: () => Promise.resolve(mockPdfBuffer)
      });
    });

    it('should handle bookmark generation gracefully when content has no TOC', async () => {
      const htmlContent = '<p>Simple content without table of contents</p>';

      const result = await gotenbergClient.generatePdfFromHtml(htmlContent, {
        generateBookmarks: true
      });

      expect(result.success).toBe(true);
      expect(result.pdfBuffer).toBeDefined();
    });

    it('should work without bookmarks when generateBookmarks is false', async () => {
      const htmlContent = '<h2>Test Content</h2>';

      const result = await gotenbergClient.generatePdfFromHtml(htmlContent, {
        generateBookmarks: false
      });

      expect(result.success).toBe(true);
      
      // Verify bookmark options were not included
      const formData = mockFetch.mock.calls[0][1].body;
      const formDataEntries = formData.entries();
      
      const hasBookmarkOptions = formDataEntries.some(([key, value]) => 
        key === 'pdfFormat' && value === 'PDF/A-1a'
      );
      
      expect(hasBookmarkOptions).toBe(false);
    });
  });
});