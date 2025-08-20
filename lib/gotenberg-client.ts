/**
 * Gotenberg PDF Generation Client
 * Handles PDF creation from HTML/Markdown content using Gotenberg service
 */

import { config } from './config';

interface GotenbergError {
  error: string;
  message?: string;
}

export interface PdfBookmark {
  title: string;
  level: number;
  anchor: string;
  page?: number;
}

interface TableOfContentsItem {
  title: string;
  anchor: string;
  level: number;
}

export interface PdfGenerationInput {
  content: string;
  contentType: 'html' | 'markdown';
  title?: string;
  marginTop?: string;
  marginBottom?: string;
  marginLeft?: string;
  marginRight?: string;
  paperWidth?: string;
  paperHeight?: string;
  generateBookmarks?: boolean;
}

export interface PdfGenerationOutput {
  success: boolean;
  pdfBuffer?: ArrayBuffer;
  error?: string;
  errorCode?: string;
}

export class GotenbergClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    if (!baseUrl) {
      // We'll get the config from the parameter in createGotenbergClient
      // This avoids circular dependencies with ES modules
      baseUrl = '';
    }
    this.baseUrl = baseUrl || '';
  }

  /**
   * Generate PDF from HTML content using Gotenberg API
   * @param htmlContent - HTML content to convert to PDF
   * @param options - Optional PDF generation settings
   * @returns Promise<PdfGenerationOutput> - PDF generation result
   */
  async generatePdfFromHtml(
    htmlContent: string, 
    options: Partial<PdfGenerationInput> = {}
  ): Promise<PdfGenerationOutput> {
    return this.generatePdf({
      content: htmlContent,
      contentType: 'html',
      ...options
    });
  }

  /**
   * Generate PDF from Markdown content using Gotenberg API
   * @param markdownContent - Markdown content to convert to PDF
   * @param options - Optional PDF generation settings
   * @returns Promise<PdfGenerationOutput> - PDF generation result
   */
  async generatePdfFromMarkdown(
    markdownContent: string,
    options: Partial<PdfGenerationInput> = {}
  ): Promise<PdfGenerationOutput> {
    return this.generatePdf({
      content: markdownContent,
      contentType: 'markdown',
      ...options
    });
  }

  /**
   * Generate PDF from content using Gotenberg API
   * @param input - PDF generation input parameters
   * @returns Promise<PdfGenerationOutput> - PDF generation result
   */
  private async generatePdf(input: PdfGenerationInput): Promise<PdfGenerationOutput> {
    if (!input.content || input.content.trim().length === 0) {
      return {
        success: false,
        error: 'Content is required and cannot be empty',
        errorCode: 'INVALID_INPUT'
      };
    }

    if (!this.baseUrl) {
      return {
        success: false,
        error: 'Gotenberg API URL is not configured',
        errorCode: 'MISSING_CONFIG'
      };
    }

    try {
      // Create form data for multipart request
      const formData = new FormData();

      // Add the main content file
      const contentBlob = new Blob([input.content], { 
        type: input.contentType === 'html' ? 'text/html' : 'text/markdown' 
      });
      
      const fileName = input.contentType === 'html' ? 'index.html' : 'index.md';
      formData.append('files', contentBlob, fileName);

      // Add PDF generation options
      if (input.marginTop) formData.append('marginTop', input.marginTop);
      if (input.marginBottom) formData.append('marginBottom', input.marginBottom);
      if (input.marginLeft) formData.append('marginLeft', input.marginLeft);
      if (input.marginRight) formData.append('marginRight', input.marginRight);
      if (input.paperWidth) formData.append('paperWidth', input.paperWidth);
      if (input.paperHeight) formData.append('paperHeight', input.paperHeight);

      // Set default margins for better formatting
      if (!input.marginTop) formData.append('marginTop', '1in');
      if (!input.marginBottom) formData.append('marginBottom', '1in');
      if (!input.marginLeft) formData.append('marginLeft', '1in');
      if (!input.marginRight) formData.append('marginRight', '1in');

      // Enable PDF bookmarks/outline generation if requested
      if (input.generateBookmarks) {
        formData.append('pdfFormat', 'PDF/A-1a');
        formData.append('printBackground', 'true');
        // Gotenberg uses Chrome's print to PDF which supports bookmarks via CSS
        formData.append('preferCSSPageSize', 'true');
      }

      // Determine the correct endpoint based on content type
      const endpoint = input.contentType === 'html' 
        ? `${this.baseUrl}/forms/chromium/convert/html`
        : `${this.baseUrl}/forms/chromium/convert/markdown`;

      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Gotenberg API error: ${response.status} ${response.statusText}`;
        
        try {
          const errorData: GotenbergError = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If error response is not JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }

        return {
          success: false,
          error: errorMessage,
          errorCode: 'API_ERROR'
        };
      }

      // Verify response is PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        return {
          success: false,
          error: `Unexpected response content type: ${contentType}`,
          errorCode: 'INVALID_RESPONSE'
        };
      }

      const pdfBuffer = await response.arrayBuffer();

      if (pdfBuffer.byteLength === 0) {
        return {
          success: false,
          error: 'Generated PDF is empty',
          errorCode: 'EMPTY_PDF'
        };
      }

      return {
        success: true,
        pdfBuffer
      };

    } catch (error) {
      console.error('Gotenberg PDF generation error:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        errorCode: 'UNKNOWN_ERROR'
      };
    }
  }

  /**
   * Generate PDF from Mindsy Notes text with proper formatting
   * Converts plain text Mindsy Notes to formatted HTML and then to PDF
   * @param notesText - Mindsy Notes text content
   * @param title - Optional title for the PDF
   * @param isHtml - Whether the content is already HTML
   * @returns Promise<PdfGenerationOutput> - PDF generation result
   */
  async generateMindsyNotesPdf(
    notesText: string,
    title?: string,
    isHtml: boolean = false
  ): Promise<PdfGenerationOutput> {
    if (!notesText || notesText.trim().length === 0) {
      return {
        success: false,
        error: 'Notes text is required and cannot be empty',
        errorCode: 'INVALID_INPUT'
      };
    }

    // Process the content based on its format
    let htmlContent: string;
    
    if (isHtml) {
      // If it's already HTML, enhance it with beautiful styling
      htmlContent = this.wrapHtmlWithStyles(notesText, title);
    } else {
      // Check if it's Markdown-formatted Mindsy Notes (from OpenAI)
      if (this.isMarkdownContent(notesText)) {
        htmlContent = await this.convertMarkdownCornellNotesToHtml(notesText, title);
      } else {
        // Plain text format
        htmlContent = this.formatCornellNotesAsHtml(notesText, title);
      }
    }

    return this.generatePdfFromHtml(htmlContent, {
      title: title || 'Mindsy Notes',
      marginTop: '0.5in',
      marginBottom: '0.5in',
      marginLeft: '0.5in',
      marginRight: '0.5in',
      generateBookmarks: true
    });
  }

  /**
   * Check if content appears to be Markdown formatted
   * @param content - Content to check
   * @returns boolean - True if content appears to be Markdown
   */
  private isMarkdownContent(content: string): boolean {
    // Look for common Markdown patterns
    const markdownPatterns = [
      /^#{1,6}\s+/m,           // Headers
      /^\*\s+/m,               // Bullet lists
      /^\d+\.\s+/m,            // Numbered lists
      /\*\*[^*]+\*\*/,         // Bold text
      /\*[^*]+\*/,             // Italic text
      /```[\s\S]*?```/,        // Code blocks
      /`[^`]+`/,               // Inline code
      /^\>\s+/m,               // Blockquotes
      /\[([^\]]+)\]\([^)]+\)/, // Links
    ];

    return markdownPatterns.some(pattern => pattern.test(content));
  }

  /**
   * Convert Markdown Mindsy Notes to beautiful HTML
   * @param markdownContent - Markdown formatted Mindsy Notes
   * @param title - Optional title for the document
   * @returns Promise<string> - Formatted HTML content
   */
  private async convertMarkdownCornellNotesToHtml(markdownContent: string, title?: string): Promise<string> {
    try {
      // Import marked dynamically to avoid issues
      const { marked } = await import('marked');
      
      // Configure marked for better HTML output
      marked.setOptions({
        breaks: true,
        gfm: true,
      });

      // Preserve page break markers before markdown processing
      console.log('Original markdown contains page breaks:', markdownContent.includes('<!-- NEW_PAGE -->'));
      
      // Preserve HTML comments (like page break markers) during markdown processing
      const preservedContent = markdownContent.replace(/<!-- NEW_PAGE -->/g, '___PAGE_BREAK_MARKER___');
      
      // Convert Markdown to HTML
      let htmlBody = await marked.parse(preservedContent);
      
      // Restore page break markers
      htmlBody = htmlBody.replace(/___PAGE_BREAK_MARKER___/g, '<!-- NEW_PAGE -->');
      
      // Check if page breaks survived markdown processing
      console.log('HTML after markdown processing contains page breaks:', htmlBody.includes('<!-- NEW_PAGE -->'));
      
      // Process the HTML to add Mindsy Notes specific styling
      const processedHtml = this.processCornellNotesHtml(htmlBody);
      
      // Wrap with beautiful styles
      return this.wrapHtmlWithStyles(processedHtml, title);
      
    } catch (error) {
      console.error('Error converting Markdown to HTML:', error);
      // Fallback to plain text formatting
      return this.formatCornellNotesAsHtml(markdownContent, title);
    }
  }

  /**
   * Process Mindsy Notes HTML to add specific styling classes
   * @param html - Raw HTML content
   * @returns string - Processed HTML with Mindsy Notes styling
   */
  private processCornellNotesHtml(html: string): string {
    let processedHtml = html;

    // Enhanced page break processing with debugging and robust CSS
    const pageBreakCount = (processedHtml.match(/<!-- NEW_PAGE -->/g) || []).length;
    console.log(`🔍 Found ${pageBreakCount} page break markers in HTML before processing`);

    // Use a more aggressive approach: wrap sections in page containers
    processedHtml = processedHtml.replace(
      /<!-- NEW_PAGE -->/g, 
      '</div><div class="forced-page-break" style="page-break-before: always !important; break-before: page !important; min-height: 100vh; display: block;">'
    );
    
    // Wrap the entire content in a page container
    processedHtml = '<div class="page-container" style="display: block;">' + processedHtml + '</div>';

    // Verify page breaks were processed
    const processedPageBreaks = (processedHtml.match(/class="forced-page-break"/g) || []).length;
    console.log(`✅ Processed ${processedPageBreaks} page break markers into forced page containers`);



    // Style the Table of Contents section and add bookmarks FIRST (handle both h1 and h2)
    processedHtml = processedHtml.replace(
      /<h[12]>Table of Contents<\/h[12]>/gi,
      '<h2 id="table-of-contents" class="toc-header" data-bookmark-level="1" data-bookmark-title="Table of Contents">📋 Table of Contents</h2>'
    );

    // Add bookmark anchors to main sections (handle both h1 and h2)
    processedHtml = processedHtml.replace(
      /<h[12]>Mindsy Notes<\/h[12]>/gi,
      '<h2 id="cornell-notes" class="cornell-header" data-bookmark-level="1" data-bookmark-title="Mindsy Notes">📝 Mindsy Notes</h2>'
    );

    processedHtml = processedHtml.replace(
      /<h[12]>Comprehensive Summary<\/h[12]>/gi,
      '<h2 id="comprehensive-summary" data-bookmark-level="1" data-bookmark-title="Comprehensive Summary">📚 Comprehensive Summary</h2>'
    );

    // NOW generate PDF bookmarks for navigation (after IDs are added)
    const bookmarks = this.generatePdfBookmarks(processedHtml);
    console.log(`Generated ${bookmarks.length} PDF bookmarks for navigation`);

    // Add bookmark anchors to content
    processedHtml = this.addBookmarkAnchors(processedHtml, bookmarks);

    // Process table of contents to add navigation links
    processedHtml = this.addTableOfContentsNavigation(processedHtml);

    // Style the Mindsy Notes section
    processedHtml = processedHtml.replace(
      /<h2>Mindsy Notes<\/h2>/gi,
      '<h2 class="cornell-header">📝 Mindsy Notes</h2>'
    );

    // Convert Cue Column to table format
    processedHtml = processedHtml.replace(
      /<h3>Cue Column<\/h3>([\s\S]*?)(?=<h3|<h2|$)/gi,
      (match, content) => {
        return this.createCueColumnTable(content);
      }
    );

    // Remove Note-Taking Area section completely (we don't want it anymore)
    processedHtml = processedHtml.replace(
      /<h3[^>]*>.*?Note-Taking Area.*?<\/h3>/gi,
      ''
    );

    // Remove any remaining references to "Note-Taking Area"
    processedHtml = processedHtml.replace(
      /Note-Taking Area/gi,
      'Detailed Notes'
    );

    // Remove the notes-header class styling since we're not using it
    processedHtml = processedHtml.replace(
      /<h3 class="notes-header"[^>]*>.*?<\/h3>/gi,
      ''
    );

    // Style the Comprehensive Summary section
    processedHtml = processedHtml.replace(
      /<h2>Comprehensive Summary<\/h2>/gi,
      '<div class="summary-section"><h2>📚 Comprehensive Summary</h2>'
    );

    // Close the summary section div (find the last content before any potential new sections)
    if (processedHtml.includes('summary-section')) {
      // If there's content after the summary, close the div before it
      processedHtml = processedHtml.replace(
        /(<div class="summary-section">[\s\S]*?)(<h[1-6](?!.*summary))/gi,
        '$1</div>$2'
      );
      
      // If the summary section is at the end, close it
      if (!processedHtml.includes('</div>') || processedHtml.lastIndexOf('<div class="summary-section">') > processedHtml.lastIndexOf('</div>')) {
        processedHtml += '</div>';
      }
    }

    // Since we're using table format for cue column, we don't need the old cue-section processing
    // The table format handles the layout automatically

    return processedHtml;
  }

  /**
   * Create a full-page table layout for the cue column
   * @param content - The cue column content
   * @returns string - HTML table structure
   */
  private createCueColumnTable(content: string): string {
    // Extract cue items from the content
    const cueItems = this.extractCueItems(content);
    
    if (cueItems.length === 0) {
      return `
<div class="page-break-wrapper" style="page-break-before: always !important; break-before: page !important; height: 0; display: block;"><div class="page-break-marker" style="page-break-before: always !important; break-before: page !important;"></div></div>
<div class="cue-section">
  <h3>🔑 Cue Column</h3>
  <p>No cue items found in this section.</p>
</div>`;
    }

    let tableHtml = `
<div class="page-break-wrapper" style="page-break-before: always !important; break-before: page !important; height: 0; display: block;"><div class="page-break-marker" style="page-break-before: always !important; break-before: page !important;"></div></div>
<table class="cue-column-table" role="table" aria-label="Mindsy Notes Cue Column Study Template">
  <thead>
    <tr>
      <th scope="col" class="cue-header-cell">🔑 Cue Column</th>
      <th scope="col" class="notes-header-cell">📝 Your Notes</th>
    </tr>
  </thead>
  <tbody>`;

    // Create table rows for each cue item with improved spacing
    cueItems.forEach((cue, index) => {
      // Calculate minimum height based on cue length for better visual balance
      const minHeight = Math.max(60, Math.ceil(cue.length / 50) * 30);
      
      tableHtml += `
    <tr class="cue-row" data-row="${index + 1}">
      <td class="cue-cell" style="min-height: ${minHeight}px;">
        <div class="cue-content">${this.escapeHtml(cue)}</div>
      </td>
      <td class="notes-cell" style="min-height: ${minHeight}px;">
        <div class="notes-placeholder">Write your notes here...</div>
      </td>
    </tr>`;
    });

    tableHtml += `
  </tbody>
</table>`;

    return tableHtml;
  }

  /**
   * Escape HTML characters to prevent XSS and ensure proper display
   * @param text - Text to escape
   * @returns string - Escaped HTML text
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Extract cue items from HTML content
   * @param content - HTML content containing cue items
   * @returns string[] - Array of cue items
   */
  private extractCueItems(content: string): string[] {
    const cueItems: string[] = [];
    
    // Look for list items in the content
    const listItemRegex = /<li[^>]*>(.*?)<\/li>/gi;
    let match;
    
    while ((match = listItemRegex.exec(content)) !== null) {
      const item = match[1].trim();
      if (item && item.length > 0) {
        // Clean up the HTML and extract text content
        const cleanItem = item
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
          .replace(/&amp;/g, '&') // Decode HTML entities
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .trim();
        
        if (cleanItem.length > 0) {
          cueItems.push(cleanItem);
        }
      }
    }

    // If no list items found, try to extract from paragraphs or other elements
    if (cueItems.length === 0) {
      const paragraphRegex = /<p[^>]*>(.*?)<\/p>/gi;
      while ((match = paragraphRegex.exec(content)) !== null) {
        const item = match[1].trim();
        if (item && item.length > 0) {
          const cleanItem = item
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
          
          if (cleanItem.length > 0) {
            cueItems.push(cleanItem);
          }
        }
      }
    }

    return cueItems;
  }

  /**
   * Generate PDF bookmarks from table of contents items
   * @param html - HTML content to analyze for bookmarks
   * @returns PdfBookmark[] - Array of bookmark objects
   */
  private generatePdfBookmarks(html: string): PdfBookmark[] {
    const bookmarks: PdfBookmark[] = [];
    
    // Extract table of contents items
    const tocItems = this.extractTableOfContentsItems(html);
    
    // Add main section bookmarks
    const mainSections = [
      { title: 'Table of Contents', anchor: 'table-of-contents', level: 1 },
      { title: 'Mindsy Notes', anchor: 'cornell-notes', level: 1 },
      { title: 'Comprehensive Summary', anchor: 'comprehensive-summary', level: 1 }
    ];

    // Add main sections to bookmarks
    mainSections.forEach(section => {
      if (html.includes(`id="${section.anchor}"`)) {
        bookmarks.push({
          title: section.title,
          level: section.level,
          anchor: section.anchor
        });
      }
    });

    // Add table of contents items as sub-bookmarks
    tocItems.forEach(item => {
      bookmarks.push({
        title: item.title,
        level: item.level + 1, // Make TOC items sub-level
        anchor: item.anchor
      });
    });

    return bookmarks;
  }

  /**
   * Extract table of contents items from HTML content
   * @param html - HTML content to analyze
   * @returns TableOfContentsItem[] - Array of TOC items
   */
  private extractTableOfContentsItems(html: string): TableOfContentsItem[] {
    const tocItems: TableOfContentsItem[] = [];
    
    // Look for table of contents section (handle both h1 and h2)
    const tocRegex = /<h[12][^>]*(?:id="table-of-contents"|class="toc-header")[^>]*>.*?<\/h[12]>([\s\S]*?)(?=<h[12]|<div class="page-break">|$)/i;
    const tocMatch = tocRegex.exec(html);
    
    if (tocMatch && tocMatch[1]) {
      const tocContent = tocMatch[1];
      
      // Extract list items from TOC
      const listItemRegex = /<li[^>]*>(.*?)<\/li>/gi;
      let match;
      let itemIndex = 0;
      
      while ((match = listItemRegex.exec(tocContent)) !== null) {
        const itemContent = match[1].trim();
        if (itemContent && itemContent.length > 0) {
          // Clean up the content and extract title
          const cleanTitle = itemContent
            .replace(/<[^>]*>/g, '') // Remove HTML tags
            .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
            .replace(/&amp;/g, '&') // Decode HTML entities
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
          
          if (cleanTitle.length > 0) {
            // Generate anchor from title
            const anchor = this.generateAnchorFromTitle(cleanTitle, itemIndex);
            
            tocItems.push({
              title: cleanTitle,
              anchor: anchor,
              level: 2 // TOC items are level 2
            });
            
            itemIndex++;
          }
        }
      }
    }
    
    return tocItems;
  }

  /**
   * Generate a URL-safe anchor from a title
   * @param title - The title to convert
   * @param index - Index for uniqueness
   * @returns string - URL-safe anchor
   */
  private generateAnchorFromTitle(title: string, index: number): string {
    const baseAnchor = title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return baseAnchor || `toc-item-${index}`;
  }

  /**
   * Add PDF bookmark metadata to HTML for Gotenberg processing
   * @param html - HTML content
   * @param bookmarks - Array of bookmarks to add
   * @returns string - HTML with bookmark metadata
   */
  private addBookmarkMetadata(html: string, bookmarks: PdfBookmark[]): string {
    if (bookmarks.length === 0) {
      return html;
    }

    // Generate bookmark metadata as HTML meta tags
    // Gotenberg uses these for PDF outline generation
    let bookmarkMeta = '';
    
    bookmarks.forEach((bookmark, index) => {
      bookmarkMeta += `<meta name="pdf-bookmark-${index}" content="${bookmark.title}|${bookmark.level}|${bookmark.anchor}" />\n    `;
    });

    // Insert bookmark metadata in the head section
    const headInsertRegex = /(<head[^>]*>)/i;
    if (headInsertRegex.test(html)) {
      html = html.replace(headInsertRegex, `$1\n    ${bookmarkMeta}`);
    }

    return html;
  }

  /**
   * Enhance HTML content with bookmark anchors for navigation
   * @param html - HTML content to enhance
   * @param bookmarks - Array of bookmarks to add anchors for
   * @returns string - HTML with bookmark anchors
   */
  private addBookmarkAnchors(html: string, bookmarks: PdfBookmark[]): string {
    let enhancedHtml = html;

    // Add anchors for TOC items by finding and enhancing relevant content
    bookmarks.forEach(bookmark => {
      if (bookmark.level > 1) { // TOC items
        // Try to find content that matches the bookmark title and add an anchor
        const titlePattern = new RegExp(`(${this.escapeRegex(bookmark.title)})`, 'gi');
        
        // Look for the title in list items or headings and add an anchor
        enhancedHtml = enhancedHtml.replace(
          new RegExp(`(<li[^>]*>.*?)(${this.escapeRegex(bookmark.title)})(.*?</li>)`, 'gi'),
          `$1<a id="${bookmark.anchor}"></a>$2$3`
        );
      }
    });

    return enhancedHtml;
  }

  /**
   * Escape special regex characters in a string
   * @param str - String to escape
   * @returns string - Escaped string
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Add navigation links to table of contents items
   * @param html - HTML content with table of contents
   * @returns string - HTML with clickable navigation links
   */
  private addTableOfContentsNavigation(html: string): string {
    let processedHtml = html;

    // Find the table of contents section and add navigation links
    const tocRegex = /<h2[^>]*class="toc-header"[^>]*>.*?<\/h2>([\s\S]*?)(?=<h2|<div class="page-break">|$)/i;
    const tocMatch = tocRegex.exec(processedHtml);

    if (tocMatch && tocMatch[1]) {
      const tocContent = tocMatch[1];
      
      // Process list items to add anchor links
      let updatedTocContent = tocContent;
      
      // Add links to main sections
      updatedTocContent = updatedTocContent.replace(
        /(<li[^>]*>.*?)Mindsy Notes(.*?<\/li>)/gi,
        '$1<a href="#cornell-notes">Mindsy Notes</a>$2'
      );
      
      updatedTocContent = updatedTocContent.replace(
        /(<li[^>]*>.*?)Comprehensive Summary(.*?<\/li>)/gi,
        '$1<a href="#comprehensive-summary">Comprehensive Summary</a>$2'
      );

      // Replace the original TOC content with the updated version
      processedHtml = processedHtml.replace(tocMatch[1], updatedTocContent);
    }

    // Add CSS for navigation links
    const navigationCSS = `
<style>
.toc-header + * a {
  color: var(--primary-color);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.toc-header + * a:hover {
  color: var(--secondary-color);
  text-decoration: underline;
}
</style>`;

    // Insert the CSS before the closing head tag
    processedHtml = processedHtml.replace('</head>', navigationCSS + '</head>');

    return processedHtml;
  }
  
  /**
   * Wrap existing HTML content with beautiful Mindsy Notes styling
   * @param htmlContent - Existing HTML content
   * @param title - Optional title for the document
   * @returns string - Fully formatted HTML with beautiful styles
   */
  private wrapHtmlWithStyles(htmlContent: string, title?: string): string {
    // Generate bookmarks for PDF navigation
    const bookmarks = this.generatePdfBookmarks(htmlContent);
    
    // Add bookmark metadata to HTML
    let processedContent = this.addBookmarkMetadata(htmlContent, bookmarks);
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'Mindsy Notes'}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        :root {
            --primary-color: #2563eb;
            --secondary-color: #1e40af;
            --accent-color: #3b82f6;
            --success-color: #059669;
            --warning-color: #d97706;
            --error-color: #dc2626;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --text-muted: #9ca3af;
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-accent: #eff6ff;
            --border-light: #e5e7eb;
            --border-medium: #d1d5db;
            --border-dark: #9ca3af;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.7;
            color: var(--text-primary);
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0;
            background: var(--bg-primary);
            font-size: 14px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 20px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            border-radius: 12px;
            box-shadow: var(--shadow-lg);
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            pointer-events: none;
        }
        
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.025em;
            position: relative;
            z-index: 1;
            color: white;
            text-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .header .subtitle {
            margin-top: 8px;
            font-size: 16px;
            font-weight: 500;
            opacity: 0.95;
            position: relative;
            z-index: 1;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        h1 {
            font-size: 26px;
            font-weight: 700;
            color: var(--primary-color);
            margin: 32px 0 16px 0;
            padding-bottom: 8px;
            border-bottom: 3px solid var(--accent-color);
            letter-spacing: -0.025em;
        }
        
        h2 {
            font-size: 22px;
            font-weight: 600;
            color: var(--secondary-color);
            margin: 28px 0 14px 0;
            padding: 12px 16px;
            background: var(--bg-accent);
            border-left: 4px solid var(--primary-color);
            border-radius: 0 8px 8px 0;
        }
        
        h3 {
            font-size: 18px;
            font-weight: 600;
            color: var(--text-primary);
            margin: 24px 0 12px 0;
            padding: 8px 0;
            border-bottom: 2px solid var(--border-light);
        }
        
        /* Specific page breaks for major sections */
        h3:contains("Detailed Notes") {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 0 !important;
        }
        
        h3:contains("Comprehensive Summary") {
            page-break-before: always !important;
            break-before: page !important;
            margin-top: 0 !important;
        }
        
        h4 {
            font-size: 16px;
            font-weight: 500;
            color: var(--text-primary);
            margin: 20px 0 10px 0;
        }
        
        h5 {
            font-size: 14px;
            font-weight: 500;
            color: var(--text-secondary);
            margin: 16px 0 8px 0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        
        p {
            margin-bottom: 16px;
            color: var(--text-primary);
            text-align: justify;
        }
        
        strong, b {
            font-weight: 600;
            color: var(--primary-color);
        }
        
        em, i {
            font-style: italic;
            color: var(--text-secondary);
        }
        
        ul, ol {
            margin: 16px 0;
            padding-left: 24px;
        }
        
        li {
            margin-bottom: 8px;
            color: var(--text-primary);
        }
        
        ul li {
            position: relative;
        }
        
        ul li::marker {
            color: var(--primary-color);
        }
        
        ol li::marker {
            color: var(--primary-color);
            font-weight: 600;
        }
        
        blockquote {
            margin: 24px 0;
            padding: 16px 20px;
            background: var(--bg-secondary);
            border-left: 4px solid var(--warning-color);
            border-radius: 0 8px 8px 0;
            font-style: italic;
            color: var(--text-secondary);
        }
        
        code {
            font-family: 'JetBrains Mono', 'Fira Code', Consolas, monospace;
            background: var(--bg-secondary);
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 13px;
            color: var(--error-color);
            border: 1px solid var(--border-light);
        }
        
        pre {
            background: var(--bg-secondary);
            padding: 16px;
            border-radius: 8px;
            overflow-x: auto;
            border: 1px solid var(--border-light);
            margin: 16px 0;
        }
        
        pre code {
            background: none;
            padding: 0;
            border: none;
            color: var(--text-primary);
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin: 24px 0;
            background: var(--bg-primary);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: var(--shadow-sm);
        }
        
        th, td {
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--border-light);
        }
        
        th {
            background: var(--bg-accent);
            font-weight: 600;
            color: var(--primary-color);
            text-transform: uppercase;
            font-size: 12px;
            letter-spacing: 0.05em;
        }
        
        tr:hover {
            background: var(--bg-secondary);
        }
        
        .cornell-notes {
            font-size: 14px;
            line-height: 1.7;
        }
        
        .cue-section {
            background: var(--bg-accent);
            padding: 16px;
            margin: 16px 0;
            border-radius: 8px;
            border-left: 4px solid var(--primary-color);
        }
        
        .cue-section h4 {
            color: var(--primary-color);
            margin-top: 0;
            font-size: 16px;
            font-weight: 600;
        }
        
        .notes-section {
            background: var(--bg-primary);
            padding: 20px;
            margin: 16px 0;
            border: 1px solid var(--border-light);
            border-radius: 8px;
            box-shadow: var(--shadow-sm);
        }
        
        .summary-section {
            background: linear-gradient(135deg, var(--bg-accent), var(--bg-secondary));
            padding: 24px;
            margin: 32px 0;
            border-radius: 12px;
            border: 2px solid var(--primary-color);
            box-shadow: var(--shadow-md);
        }
        
        .summary-section h2 {
            background: none;
            border: none;
            color: var(--primary-color);
            margin-top: 0;
            padding: 0;
        }
        
        /* Forced page break approach for Gotenberg */
        .page-container {
            display: block;
            width: 100%;
        }
        
        .forced-page-break {
            page-break-before: always !important;
            break-before: page !important;
            -webkit-column-break-before: always !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: block !important;
            min-height: 100vh !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            border: none !important;
            clear: both !important;
            background: white !important;
            box-sizing: border-box !important;
        }
        
        /* Alternative approaches for maximum compatibility */
        .page-break, .page-break-wrapper {
            page-break-before: always !important;
            break-before: page !important;
            -webkit-column-break-before: always !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
            display: block !important;
            height: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            clear: both !important;
        }
        
        .page-break-marker {
            page-break-before: always !important;
            break-before: page !important;
            -webkit-column-break-before: always !important;
            display: block !important;
            height: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            visibility: hidden !important;
        }
        
        /* Additional Gotenberg-specific rules */
        @page {
            margin: 2cm;
            size: A4;
        }
        
        /* Alternative page break for legacy support */
        .page-break-legacy {
            page-break-before: always;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px dashed var(--border-medium);
        }
        
        .highlight {
            background: linear-gradient(120deg, transparent 0%, transparent 40%, var(--warning-color) 40%, var(--warning-color) 60%, transparent 60%);
            padding: 2px 0;
        }
        
        .important {
            background: var(--bg-accent);
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 4px solid var(--success-color);
            margin: 16px 0;
        }
        
        .warning {
            background: #fef3c7;
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 4px solid var(--warning-color);
            margin: 16px 0;
            color: #92400e;
        }
        
        .error {
            background: #fee2e2;
            padding: 12px 16px;
            border-radius: 8px;
            border-left: 4px solid var(--error-color);
            margin: 16px 0;
            color: #991b1b;
        }
        
        .toc-header, .cornell-header, .cue-header {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .toc-header {
            color: var(--success-color);
            border-left: 4px solid var(--success-color);
        }
        
        .cornell-header {
            color: var(--primary-color);
            border-left: 4px solid var(--primary-color);
        }
        
        .cue-header {
            color: var(--warning-color);
            border-left: 4px solid var(--warning-color);
        }
        
        .cue-column-table {
            width: 100%;
            page-break-before: always;
            border-collapse: collapse;
            margin: 32px 0;
            background: var(--bg-primary);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: var(--shadow-md);
            table-layout: fixed;
        }
        
        .cue-column-table th {
            background: var(--bg-accent);
            color: var(--primary-color);
            font-weight: 600;
            font-size: 18px;
            padding: 20px;
            text-align: left;
            border-bottom: 2px solid var(--primary-color);
            position: relative;
        }
        
        .cue-column-table .cue-header-cell {
            width: 50%;
        }
        
        .cue-column-table .notes-header-cell {
            width: 50%;
        }
        
        .cue-column-table td {
            width: 50%;
            vertical-align: top;
            padding: 0;
            border: 1px solid var(--border-medium);
            font-size: 14px;
            line-height: 1.6;
            position: relative;
        }
        
        .cue-column-table .cue-cell {
            background: var(--bg-accent);
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .cue-column-table .notes-cell {
            background: var(--bg-primary);
            color: var(--text-muted);
            font-style: italic;
        }
        
        .cue-column-table .cue-content {
            padding: 20px;
            word-wrap: break-word;
            hyphens: auto;
        }
        
        .cue-column-table .notes-placeholder {
            padding: 20px;
            opacity: 0.7;
        }
        
        .cue-column-table .cue-row:nth-child(even) .cue-cell {
            background: #f0f7ff;
        }
        
        .cue-column-table .cue-row:nth-child(even) .notes-cell {
            background: #fafafa;
        }
        
        .cue-column-table .cue-row:hover .cue-cell {
            background: #dbeafe;
        }
        
        .cue-column-table .cue-row:hover .notes-cell {
            background: #f5f5f5;
        }
        
        /* PDF Bookmark Styles for Gotenberg */
        #table-of-contents, #cornell-notes, #comprehensive-summary {
            bookmark-level: 1;
            bookmark-label: attr(data-bookmark-title);
        }
        
        .toc-item-anchor {
            bookmark-level: 2;
            bookmark-label: attr(data-bookmark-title);
        }
        
        /* Ensure bookmark anchors are positioned correctly */
        [id^="toc-item-"] {
            position: relative;
            top: -20px;
            visibility: hidden;
        }

        @media print {
            body { 
                margin: 0; 
                font-size: 12px;
            }
            .header { 
                page-break-after: avoid;
                margin-bottom: 20px;
            }
            .summary-section {
                page-break-inside: avoid;
            }
            .cue-section, .notes-section {
                page-break-inside: avoid;
            }
            .cue-column-table {
                page-break-before: always !important;
                page-break-inside: avoid !important;
            }
            .cue-column-table tr {
                page-break-inside: avoid;
            }
            
            /* Forced page break styles for print/PDF */
            .forced-page-break {
                page-break-before: always !important;
                break-before: page !important;
                -webkit-column-break-before: always !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                display: block !important;
                min-height: 100vh !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 20px !important;
                border: none !important;
                clear: both !important;
                background: white !important;
                box-sizing: border-box !important;
                overflow: visible !important;
            }
            
            .page-container {
                display: block !important;
                width: 100% !important;
            }
            
            .page-break, .page-break-wrapper {
                page-break-before: always !important;
                break-before: page !important;
                -webkit-column-break-before: always !important;
                break-inside: avoid !important;
                page-break-inside: avoid !important;
                display: block !important;
                height: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                clear: both !important;
            }
            
            .page-break-marker {
                page-break-before: always !important;
                break-before: page !important;
                -webkit-column-break-before: always !important;
                display: block !important;
                height: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                border: none !important;
                visibility: hidden !important;
            }
            
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
            
            /* PDF bookmark styles for print */
            h1, h2, h3 {
                bookmark-level: attr(data-bookmark-level);
                bookmark-label: attr(data-bookmark-title);
            }
        }
    </style>
</head>
<body>
    ${title ? `<div class="header"><h1>${title}</h1><div class="subtitle">Mindsy Notes Study Guide</div></div>` : ''}
    <div class="cornell-notes">${processedContent}</div>
    
    <!-- Forced page break enhancement script -->
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🔧 Applying forced page break containers for Gotenberg...');
        
        // Enhance forced page break containers
        const forcedPageBreaks = document.querySelectorAll('.forced-page-break');
        console.log('Found ' + forcedPageBreaks.length + ' forced page break containers');
        
        forcedPageBreaks.forEach((container, index) => {
            container.style.pageBreakBefore = 'always';
            container.style.breakBefore = 'page';
            container.style.minHeight = '100vh';
            container.style.display = 'block';
            container.style.padding = '20px';
            container.style.backgroundColor = 'white';
            container.style.boxSizing = 'border-box';
            console.log('✅ Enhanced forced page break container ' + (index + 1));
        });
        
        // Also apply direct styling to major section headers as backup
        const allHeaders = document.querySelectorAll('h3');
        let headerBreaksApplied = 0;
        
        allHeaders.forEach(header => {
            const text = header.textContent || '';
            if (text.includes('Detailed Notes') || text.includes('Comprehensive Summary')) {
                // Ensure the parent container has page break styling
                const parent = header.closest('.forced-page-break');
                if (parent) {
                    parent.style.pageBreakBefore = 'always';
                    parent.style.breakBefore = 'page';
                    headerBreaksApplied++;
                    console.log('✅ Reinforced page break for: ' + text);
                }
            }
        });
        
        console.log('📊 Total header page breaks reinforced: ' + headerBreaksApplied);
        console.log('🎯 Forced page break enhancement complete');
    });
    </script>
</body>
</html>`;
  }

  /**
   * Format Mindsy Notes text as HTML with beautiful styling
   * @param notesText - Raw Mindsy Notes text
   * @param title - Optional title for the document
   * @returns string - Formatted HTML content with beautiful styles
   */
  private formatCornellNotesAsHtml(notesText: string, title?: string): string {
    // Enhanced HTML structure with beautiful Mindsy Notes styling
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title || 'Mindsy Notes'}</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
        
        :root {
            --primary-color: #2563eb;
            --secondary-color: #1e40af;
            --accent-color: #3b82f6;
            --success-color: #059669;
            --warning-color: #d97706;
            --error-color: #dc2626;
            --text-primary: #1f2937;
            --text-secondary: #6b7280;
            --text-muted: #9ca3af;
            --bg-primary: #ffffff;
            --bg-secondary: #f8fafc;
            --bg-accent: #eff6ff;
            --border-light: #e5e7eb;
            --border-medium: #d1d5db;
            --border-dark: #9ca3af;
            --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
            --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
        }
        
        * {
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.7;
            color: var(--text-primary);
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0;
            background: var(--bg-primary);
            font-size: 14px;
        }
        
        .header {
            text-align: center;
            margin-bottom: 40px;
            padding: 30px 20px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            color: white;
            border-radius: 12px;
            box-shadow: var(--shadow-lg);
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/><circle cx="10" cy="60" r="0.5" fill="white" opacity="0.1"/><circle cx="90" cy="40" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
            pointer-events: none;
        }
        
        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: -0.025em;
            position: relative;
            z-index: 1;
            color: white;
            text-shadow: 0 2px 4px rgba(0,0,0,0.4), 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .header .subtitle {
            margin-top: 8px;
            font-size: 16px;
            font-weight: 500;
            opacity: 0.95;
            position: relative;
            z-index: 1;
            color: white;
            text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        }
        
        .cornell-notes {
            white-space: pre-wrap;
            font-size: 14px;
            line-height: 1.7;
            background: var(--bg-secondary);
            padding: 24px;
            border-radius: 12px;
            border: 1px solid var(--border-light);
            box-shadow: var(--shadow-sm);
        }
        
        .cornell-section {
            margin-bottom: 32px;
            page-break-inside: avoid;
            background: var(--bg-primary);
            padding: 20px;
            border-radius: 8px;
            box-shadow: var(--shadow-sm);
        }
        
        .cue-column {
            font-weight: 600;
            color: var(--primary-color);
            margin-bottom: 12px;
            font-size: 16px;
            padding: 8px 12px;
            background: var(--bg-accent);
            border-radius: 6px;
            border-left: 4px solid var(--primary-color);
        }
        
        .notes-area {
            margin-left: 24px;
            margin-bottom: 20px;
            padding: 16px;
            background: var(--bg-primary);
            border-radius: 6px;
            border: 1px solid var(--border-light);
        }
        
        .summary-section {
            background: linear-gradient(135deg, var(--bg-accent), var(--bg-secondary));
            padding: 24px;
            margin: 32px 0;
            border-radius: 12px;
            border: 2px solid var(--primary-color);
            box-shadow: var(--shadow-md);
            page-break-inside: avoid;
        }
        
        .summary-section h2 {
            color: var(--primary-color);
            margin-top: 0;
            font-size: 22px;
            font-weight: 700;
        }
        
        .cue-column-table {
            width: 100%;
            page-break-before: always;
            border-collapse: collapse;
            margin: 32px 0;
            background: var(--bg-primary);
            border-radius: 8px;
            overflow: hidden;
            box-shadow: var(--shadow-md);
            table-layout: fixed;
        }
        
        .cue-column-table th {
            background: var(--bg-accent);
            color: var(--primary-color);
            font-weight: 600;
            font-size: 18px;
            padding: 20px;
            text-align: left;
            border-bottom: 2px solid var(--primary-color);
            position: relative;
        }
        
        .cue-column-table .cue-header-cell {
            width: 50%;
        }
        
        .cue-column-table .notes-header-cell {
            width: 50%;
        }
        
        .cue-column-table td {
            width: 50%;
            vertical-align: top;
            padding: 0;
            border: 1px solid var(--border-medium);
            font-size: 14px;
            line-height: 1.6;
            position: relative;
        }
        
        .cue-column-table .cue-cell {
            background: var(--bg-accent);
            font-weight: 500;
            color: var(--text-primary);
        }
        
        .cue-column-table .notes-cell {
            background: var(--bg-primary);
            color: var(--text-muted);
            font-style: italic;
        }
        
        .cue-column-table .cue-content {
            padding: 20px;
            word-wrap: break-word;
            hyphens: auto;
        }
        
        .cue-column-table .notes-placeholder {
            padding: 20px;
            opacity: 0.7;
        }
        
        .cue-column-table .cue-row:nth-child(even) .cue-cell {
            background: #f0f7ff;
        }
        
        .cue-column-table .cue-row:nth-child(even) .notes-cell {
            background: #fafafa;
        }
        
        .cue-column-table .cue-row:hover .cue-cell {
            background: #dbeafe;
        }
        
        .cue-column-table .cue-row:hover .notes-cell {
            background: #f5f5f5;
        }
        
        @media print {
            body { 
                margin: 0; 
                font-size: 12px;
            }
            .header { 
                page-break-after: avoid;
                margin-bottom: 20px;
            }
            .summary-section, .cornell-section {
                page-break-inside: avoid;
            }
            .cue-column-table {
                page-break-before: always !important;
                page-break-inside: avoid !important;
            }
            .cue-column-table tr {
                page-break-inside: avoid;
            }
            * {
                -webkit-print-color-adjust: exact !important;
                color-adjust: exact !important;
            }
        }
    </style>
</head>
<body>
    ${title ? `<div class="header"><h1>${title}</h1><div class="subtitle">Mindsy Notes Study Guide</div></div>` : ''}
    <div class="cornell-notes">${notesText}</div>
</body>
</html>`;

    return htmlContent;
  }


}

/**
 * Factory function to create Gotenberg client with configuration
 */
export function createGotenbergClient(): GotenbergClient {
  const apiUrl = config.gotenbergApiUrl;
  
  if (!apiUrl) {
    throw new Error('GOTENBERG_API_URL environment variable is required');
  }

  return new GotenbergClient(apiUrl);
}

/**
 * Validate Gotenberg API configuration
 * Used for health checks and debugging
 */
export function validateGotenbergConfig(): { valid: boolean; error?: string } {
  const apiUrl = config.gotenbergApiUrl;
  
  if (!apiUrl) {
    return {
      valid: false,
      error: 'GOTENBERG_API_URL environment variable is not set'
    };
  }

  try {
    new URL(apiUrl);
    return { valid: true };
  } catch {
    return {
      valid: false,
      error: 'GOTENBERG_API_URL is not a valid URL'
    };
  }
}