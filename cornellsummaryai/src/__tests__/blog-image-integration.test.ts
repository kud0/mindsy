/**
 * Integration tests for blog image handling
 */

import { describe, it, expect } from 'vitest';
import { 
  validateAltText, 
  extractImageMetadata, 
  generateResponsiveSizes,
  getOptimalImageFormat 
} from '../lib/image-utils';

describe('Blog Image Integration', () => {
  it('should handle typical blog image paths correctly', () => {
    // Test typical hero image paths
    const heroImagePath = '/images/blog/scalable-apis.jpg';
    const metadata = extractImageMetadata(heroImagePath);
    
    expect(metadata.isLocal).toBe(true);
    expect(metadata.filename).toBe('scalable-apis.jpg');
    expect(metadata.extension).toBe('jpg');
    expect(metadata.directory).toBe('/images/blog');
  });

  it('should validate image accessibility requirements', () => {
    const testCases = [
      {
        alt: 'A developer working on code',
        expected: true
      },
      {
        alt: 'Image of a cat',
        expected: false // Contains redundant phrase
      },
      {
        alt: '',
        expected: false // Empty alt text
      },
      {
        alt: 'test-image.jpg',
        expected: false // Filename as alt text
      }
    ];

    testCases.forEach(({ alt, expected }) => {
      const result = validateAltText(alt, '/test.jpg');
      expect(result.isValid).toBe(expected);
    });
  });

  it('should generate appropriate responsive sizes', () => {
    const sizes = generateResponsiveSizes(800);
    
    // Should contain mobile, tablet, and desktop breakpoints
    expect(sizes).toContain('640px');
    expect(sizes).toContain('768px');
    expect(sizes).toContain('1024px');
    expect(sizes).toContain('800px');
    
    // Should use viewport units for smaller screens
    expect(sizes).toContain('100vw');
    expect(sizes).toContain('90vw');
    expect(sizes).toContain('80vw');
  });

  it('should recommend optimal image formats', () => {
    const formatTests = [
      { input: 'jpg', expected: 'webp' },
      { input: 'jpeg', expected: 'webp' },
      { input: 'png', expected: 'webp' },
      { input: 'gif', expected: 'webp' },
      { input: 'unknown', expected: 'webp' }
    ];

    formatTests.forEach(({ input, expected }) => {
      const result = getOptimalImageFormat(input);
      expect(result).toBe(expected);
    });
  });

  it('should handle image metadata extraction correctly', () => {
    const testPaths = [
      {
        path: '/images/blog/content/test-image.jpg',
        expected: {
          filename: 'test-image.jpg',
          extension: 'jpg',
          isLocal: true,
          isExternal: false
        }
      },
      {
        path: 'https://example.com/external-image.png',
        expected: {
          filename: 'external-image.png',
          extension: 'png',
          isLocal: false,
          isExternal: true
        }
      }
    ];

    testPaths.forEach(({ path, expected }) => {
      const metadata = extractImageMetadata(path);
      expect(metadata.filename).toBe(expected.filename);
      expect(metadata.extension).toBe(expected.extension);
      expect(metadata.isLocal).toBe(expected.isLocal);
      expect(metadata.isExternal).toBe(expected.isExternal);
    });
  });

  it('should provide performance optimizations', () => {
    // Test that our image utilities provide performance benefits
    const largeSizes = generateResponsiveSizes(1200);
    const smallSizes = generateResponsiveSizes(400);
    
    // Larger images should have different size attributes
    expect(largeSizes).toContain('1200px');
    expect(smallSizes).toContain('400px');
    
    // Both should use responsive breakpoints
    expect(largeSizes).toContain('100vw');
    expect(smallSizes).toContain('100vw');
  });
});