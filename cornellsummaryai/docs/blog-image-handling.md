# Blog Image Handling Guide

This guide explains how to use the comprehensive image handling system implemented for the blog.

## Directory Structure

The blog image system uses a standardized directory structure:

```
public/images/blog/
├── heroes/          # Hero images for blog posts (1200x630px recommended)
├── content/         # Images used within blog post content
├── astro-getting-started.jpg
├── scalable-apis.jpg
└── placeholder-hero.svg
```

## Using Images in Blog Posts

### Hero Images

Add hero images to blog post frontmatter:

```yaml
---
title: "My Blog Post"
description: "A great blog post"
pubDate: 2025-01-15
heroImage: "/images/blog/heroes/my-post-hero.jpg"
---
```

### Content Images

#### In Markdown Content

Use standard Markdown image syntax. The system will automatically enhance these:

```markdown
![Alt text describing the image](image-filename.jpg "Optional caption")
```

The remark plugin will:
- Automatically prefix paths with `/images/blog/content/`
- Enhance alt text if missing or inadequate
- Add captions from the title attribute

#### Using the BlogImage Component

For more control, use the BlogImage component directly in `.astro` files:

```astro
---
import BlogImage from '../components/BlogImage.astro';
---

<BlogImage 
  src="/images/blog/content/diagram.svg"
  alt="API architecture diagram showing client, server, and database"
  caption="High-level overview of our API architecture"
  width={800}
  loading="lazy"
/>
```

## Image Optimization Features

### Automatic Format Optimization

- Local images are automatically converted to WebP format
- Supports multiple densities (1x, 2x) for high-DPI displays
- External images use standard `<img>` tags with responsive attributes

### Responsive Sizing

Images automatically generate responsive `sizes` attributes:

```html
sizes="(max-width: 640px) 100vw, (max-width: 768px) 90vw, (max-width: 1024px) 80vw, 800px"
```

### Lazy Loading

- Images below the fold use `loading="lazy"` by default
- Hero images use `loading="eager"` for faster perceived performance
- Includes `decoding="async"` for better performance

## Accessibility Features

### Alt Text Validation

The system validates alt text and provides warnings for:

- Empty alt text
- Redundant phrases ("image of", "picture of")
- Alt text longer than 125 characters
- Filename-like alt text

### Automatic Alt Text Enhancement

If alt text is missing or inadequate, the system:

- Generates descriptive alt text from filenames
- Converts kebab-case and camelCase to readable text
- Includes context when provided

### Semantic HTML

- Uses `<figure>` and `<figcaption>` for proper semantics
- Includes `role="img"` for screen readers
- Proper ARIA labeling for captions

## Performance Optimizations

### Image Compression

- Automatic WebP conversion for better compression
- Quality setting of 80 for optimal size/quality balance
- Support for AVIF format where available

### Loading Strategies

- Lazy loading for content images
- Eager loading for above-the-fold images
- Proper `sizes` attributes for responsive loading

### Caching

- Leverages browser caching for optimized images
- CDN-friendly URLs for external hosting

## Best Practices

### Image Sizing

- **Hero images**: 1200x630px (Open Graph standard)
- **Content images**: Max width 1200px
- **Thumbnails**: 400x300px

### File Formats

- **Photos**: Use JPG/JPEG, will be converted to WebP
- **Graphics with transparency**: Use PNG, will be converted to WebP
- **Simple graphics**: Use SVG when possible
- **Avoid**: GIF (use MP4 for animations)

### Alt Text Guidelines

✅ **Good alt text:**
- "Developer working on code at a standing desk"
- "Bar chart showing 40% increase in API performance"
- "Screenshot of the new dashboard interface"

❌ **Poor alt text:**
- "Image of developer" (redundant phrase)
- "img_001.jpg" (filename)
- "" (empty)
- "A really amazing and incredibly detailed view of..." (too long)

### File Naming

Use descriptive, SEO-friendly filenames:

- `api-architecture-diagram.svg`
- `performance-comparison-chart.jpg`
- `dashboard-screenshot.png`

## Component API Reference

### BlogImage Component

```typescript
interface Props {
  src: string;           // Image source path
  alt: string;           // Alt text (required for accessibility)
  caption?: string;      // Optional caption text
  width?: number;        // Image width (default: 800)
  height?: number;       // Image height (auto if not specified)
  class?: string;        // Additional CSS classes
  loading?: 'eager' | 'lazy'; // Loading strategy (default: 'lazy')
  sizes?: string;        // Custom responsive sizes
  quality?: number;      // Image quality 1-100 (default: 80)
  context?: string;      // Additional context for alt text generation
}
```

### Image Utilities

```typescript
// Validate alt text for accessibility
validateAltText(alt: string, src: string): ValidationResult

// Generate responsive sizes attribute
generateResponsiveSizes(maxWidth?: number): string

// Get optimal image format
getOptimalImageFormat(originalFormat: string): string

// Extract image metadata
extractImageMetadata(src: string): ImageMetadata

// Generate fallback alt text
generateFallbackAltText(src: string, context?: string): string
```

## Testing

Run image handling tests:

```bash
# Unit tests
npm test -- src/components/__tests__/BlogImage.test.ts

# Integration tests  
npm test -- src/__tests__/blog-image-integration.test.ts

# Performance tests
node scripts/test-blog-image-performance.js
```

## Troubleshooting

### Images Not Loading

1. Check file path is correct
2. Ensure image exists in `public/images/blog/`
3. Verify file permissions
4. Check browser console for errors

### Poor Performance

1. Optimize image file sizes before uploading
2. Use appropriate image formats (WebP for photos, SVG for graphics)
3. Implement lazy loading for below-the-fold images
4. Use responsive images with proper `sizes` attributes

### Accessibility Issues

1. Always provide descriptive alt text
2. Use captions for complex images
3. Test with screen readers
4. Run accessibility validation tools

## Future Enhancements

Planned improvements:

- [ ] AVIF format support
- [ ] Automatic image resizing on upload
- [ ] Image CDN integration
- [ ] Progressive image loading
- [ ] Image placeholder generation
- [ ] Automatic alt text generation using AI