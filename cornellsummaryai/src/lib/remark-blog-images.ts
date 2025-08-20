/**
 * Remark plugin to enhance images in blog content
 * Automatically adds responsive sizing, lazy loading, and accessibility features
 */

import { visit } from 'unist-util-visit';
import type { Node } from 'unist';
import type { Image } from 'mdast';

interface ImageNode extends Image {
  type: 'image';
  url: string;
  alt: string | null;
  title: string | null;
}

export function remarkBlogImages() {
  return (tree: Node) => {
    visit(tree, 'image', (node: ImageNode) => {
      // Enhance alt text if missing or inadequate
      if (!node.alt || node.alt.trim().length === 0) {
        // Generate alt text from filename
        const filename = node.url.split('/').pop() || '';
        const baseName = filename.replace(/\.[^.]+$/, '');
        node.alt = baseName
          .replace(/[-_]/g, ' ')
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          .toLowerCase()
          .replace(/\b\w/g, l => l.toUpperCase()) || 'Blog content image';
      }
      
      // Add title attribute if not present (used for captions)
      if (!node.title && node.alt) {
        node.title = node.alt;
      }
      
      // Ensure proper URL format for local images
      if (node.url && !node.url.startsWith('http') && !node.url.startsWith('/')) {
        node.url = `/images/blog/content/${node.url}`;
      }
    });
  };
}

/**
 * Transform markdown image syntax to use BlogImage component
 * This would be used in a custom markdown renderer
 */
export function transformImageToComponent(src: string, alt: string, title?: string): string {
  const caption = title && title !== alt ? title : undefined;
  
  return `<BlogImage 
    src="${src}" 
    alt="${alt}"
    ${caption ? `caption="${caption}"` : ''}
    loading="lazy"
    class="my-6"
  />`;
}