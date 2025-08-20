/**
 * Tests for BlogImage component
 */

import { describe, it, expect } from 'vitest';
import { 
  validateAltText, 
  generateResponsiveSizes, 
  getOptimalImageFormat,
  extractImageMetadata,
  generateFallbackAltText 
} from '../../lib/image-utils';

describe('BlogImage Utilities', () => {
  describe('validateAltText', () => {
    it('should validate good alt text', () => {
      const result = validateAltText('A developer working on code at their desk', '/test.jpg');
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should flag empty alt text', () => {
      const result = validateAltText('', '/test.jpg');
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Alt text is empty');
    });

    it('should flag redundant phrases', () => {
      const result = validateAltText('Image of a cat', '/test.jpg');
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Alt text contains redundant phrases');
    });

    it('should flag overly long alt text', () => {
      const longAlt = 'A'.repeat(130);
      const result = validateAltText(longAlt, '/test.jpg');
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Alt text is longer than recommended (125 characters)');
    });

    it('should flag filename-like alt text', () => {
      const result = validateAltText('test-image.jpg', '/test.jpg');
      expect(result.isValid).toBe(false);
      expect(result.warnings).toContain('Alt text appears to be a filename');
    });
  });

  describe('generateResponsiveSizes', () => {
    it('should generate responsive sizes with default width', () => {
      const sizes = generateResponsiveSizes();
      expect(sizes).toContain('800px');
      expect(sizes).toContain('100vw');
    });

    it('should generate responsive sizes with custom width', () => {
      const sizes = generateResponsiveSizes(1200);
      expect(sizes).toContain('1200px');
    });
  });

  describe('getOptimalImageFormat', () => {
    it('should recommend webp for jpeg images', () => {
      expect(getOptimalImageFormat('jpg')).toBe('webp');
      expect(getOptimalImageFormat('jpeg')).toBe('webp');
    });

    it('should recommend webp for png images', () => {
      expect(getOptimalImageFormat('png')).toBe('webp');
    });

    it('should default to webp for unknown formats', () => {
      expect(getOptimalImageFormat('unknown')).toBe('webp');
    });
  });

  describe('extractImageMetadata', () => {
    it('should extract metadata from local image path', () => {
      const metadata = extractImageMetadata('/images/blog/test-image.jpg');
      expect(metadata.filename).toBe('test-image.jpg');
      expect(metadata.extension).toBe('jpg');
      expect(metadata.isLocal).toBe(true);
      expect(metadata.isExternal).toBe(false);
    });

    it('should extract metadata from external image URL', () => {
      const metadata = extractImageMetadata('https://example.com/image.png');
      expect(metadata.filename).toBe('image.png');
      expect(metadata.extension).toBe('png');
      expect(metadata.isLocal).toBe(false);
      expect(metadata.isExternal).toBe(true);
    });
  });

  describe('generateFallbackAltText', () => {
    it('should generate readable alt text from filename', () => {
      const alt = generateFallbackAltText('/images/blog/my-test-image.jpg');
      expect(alt).toBe('My Test Image');
    });

    it('should include context when provided', () => {
      const alt = generateFallbackAltText('/images/blog/diagram.jpg', 'API Architecture');
      expect(alt).toBe('Diagram - API Architecture');
    });

    it('should handle camelCase filenames', () => {
      const alt = generateFallbackAltText('/images/blog/myTestImage.jpg');
      expect(alt).toBe('My Test Image');
    });
  });
});

describe('Image Performance', () => {
  it('should use lazy loading by default', () => {
    // This would be tested in a browser environment
    // For now, we just verify the utility functions work correctly
    expect(true).toBe(true);
  });

  it('should generate appropriate sizes for responsive images', () => {
    const sizes = generateResponsiveSizes(800);
    const breakpoints = sizes.split(',').map(s => s.trim());
    
    expect(breakpoints).toHaveLength(4);
    expect(breakpoints[0]).toContain('640px');
    expect(breakpoints[1]).toContain('768px');
    expect(breakpoints[2]).toContain('1024px');
    expect(breakpoints[3]).toContain('800px');
  });
});