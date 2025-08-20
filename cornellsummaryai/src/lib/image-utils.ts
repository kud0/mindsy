/**
 * Utility functions for image handling and accessibility
 */

/**
 * Validates alt text for accessibility compliance
 * @param alt - The alt text to validate
 * @param src - The image source for context
 * @returns Object with validation result and suggestions
 */
export function validateAltText(alt: string, src: string): {
  isValid: boolean;
  warnings: string[];
  suggestions: string[];
} {
  const warnings: string[] = [];
  const suggestions: string[] = [];
  
  // Check if alt text is empty
  if (!alt || alt.trim().length === 0) {
    warnings.push('Alt text is empty');
    suggestions.push('Add descriptive alt text for screen readers');
    return { isValid: false, warnings, suggestions };
  }
  
  // Check for common accessibility issues
  const lowerAlt = alt.toLowerCase();
  
  // Check for redundant phrases
  const redundantPhrases = ['image of', 'picture of', 'photo of', 'graphic of'];
  if (redundantPhrases.some(phrase => lowerAlt.includes(phrase))) {
    warnings.push('Alt text contains redundant phrases');
    suggestions.push('Remove phrases like "image of" or "picture of"');
  }
  
  // Check length (recommended 125 characters or less)
  if (alt.length > 125) {
    warnings.push('Alt text is longer than recommended (125 characters)');
    suggestions.push('Consider shortening alt text while keeping it descriptive');
  }
  
  // Check if alt text is too short (less than 10 characters might not be descriptive enough)
  if (alt.length < 10) {
    warnings.push('Alt text might be too short to be descriptive');
    suggestions.push('Consider adding more descriptive details');
  }
  
  // Check for filename-like alt text
  if (lowerAlt.includes('.jpg') || lowerAlt.includes('.png') || lowerAlt.includes('.gif') || 
      lowerAlt.includes('.webp') || lowerAlt.includes('.svg')) {
    warnings.push('Alt text appears to be a filename');
    suggestions.push('Replace filename with descriptive text');
  }
  
  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions
  };
}

/**
 * Generates responsive image sizes attribute based on breakpoints
 * @param maxWidth - Maximum width of the image
 * @returns Sizes attribute string
 */
export function generateResponsiveSizes(maxWidth: number = 800): string {
  return `(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, ${maxWidth}px`;
}

/**
 * Determines optimal image format based on browser support and image type
 * @param originalFormat - Original image format
 * @returns Recommended format for optimization
 */
export function getOptimalImageFormat(originalFormat: string): 'webp' | 'avif' | 'jpeg' | 'png' {
  const format = originalFormat.toLowerCase();
  
  // For photos, prefer WebP or AVIF
  if (format.includes('jpg') || format.includes('jpeg')) {
    return 'webp';
  }
  
  // For graphics with transparency, keep PNG but optimize
  if (format.includes('png')) {
    return 'webp'; // WebP supports transparency
  }
  
  // For SVGs, keep as is (handled separately)
  if (format.includes('svg')) {
    return 'png'; // Fallback, though SVG should be handled differently
  }
  
  return 'webp'; // Default to WebP for best compression
}

/**
 * Extracts image metadata for optimization
 * @param src - Image source path
 * @returns Metadata object
 */
export function extractImageMetadata(src: string): {
  filename: string;
  extension: string;
  isLocal: boolean;
  isExternal: boolean;
  directory: string;
} {
  const isLocal = src.startsWith('/') || src.startsWith('./') || src.startsWith('../');
  const isExternal = src.startsWith('http://') || src.startsWith('https://');
  
  const pathParts = src.split('/');
  const filename = pathParts[pathParts.length - 1] || '';
  const extensionMatch = filename.match(/\.([^.]+)$/);
  const extension = extensionMatch ? extensionMatch[1].toLowerCase() : '';
  const directory = pathParts.slice(0, -1).join('/');
  
  return {
    filename,
    extension,
    isLocal,
    isExternal,
    directory
  };
}

/**
 * Generates lazy loading configuration based on image position
 * @param isAboveFold - Whether the image is above the fold
 * @returns Loading strategy
 */
export function getLoadingStrategy(isAboveFold: boolean = false): 'eager' | 'lazy' {
  return isAboveFold ? 'eager' : 'lazy';
}

/**
 * Creates a fallback alt text based on image filename and context
 * @param src - Image source
 * @param context - Additional context (e.g., blog post title)
 * @returns Generated alt text
 */
export function generateFallbackAltText(src: string, context?: string): string {
  const { filename } = extractImageMetadata(src);
  
  // Remove extension and convert to readable format
  const baseName = filename.replace(/\.[^.]+$/, '');
  const readable = baseName
    .replace(/[-_]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .replace(/\b\w/g, l => l.toUpperCase());
  
  if (context) {
    return `${readable} - ${context}`;
  }
  
  return readable || 'Blog content image';
}