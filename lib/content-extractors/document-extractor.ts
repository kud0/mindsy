/**
 * Document Content Extractor
 *
 * Extracts text content from various document formats:
 * - PDF files (using unpdf)
 * - DOCX files (using mammoth)
 * - TXT files (direct Buffer conversion)
 *
 * Supports combining multiple documents into a single text string.
 */

import * as mammoth from 'mammoth';
import { extractText, getDocumentProxy } from 'unpdf';

export interface DocumentExtractionResult {
  success: boolean;
  text: string;
  metadata?: {
    pageCount?: number;
    fileName?: string;
    fileType?: string;
  };
  error?: string;
}

export class DocumentExtractor {
  /**
   * Extract text from a PDF file
   */
  static async extractFromPDF(buffer: Buffer, fileName?: string): Promise<DocumentExtractionResult> {
    try {
      console.log(`📄 Extracting text from PDF: ${fileName || 'unknown'}`);

      // Convert Buffer to Uint8Array for unpdf
      const uint8Array = new Uint8Array(buffer);

      // Get PDF document proxy and extract text
      const pdf = await getDocumentProxy(uint8Array);
      const { totalPages, text } = await extractText(pdf, { mergePages: true });

      if (!text || text.trim().length === 0) {
        return {
          success: false,
          text: '',
          error: 'PDF appears to be empty or contains only images (OCR not supported)'
        };
      }

      console.log(`✅ PDF extraction successful: ${totalPages} pages, ${text.length} characters`);

      return {
        success: true,
        text: text.trim(),
        metadata: {
          pageCount: totalPages,
          fileName,
          fileType: 'pdf'
        }
      };
    } catch (error) {
      console.error('❌ PDF extraction error:', error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Failed to extract text from PDF'
      };
    }
  }

  /**
   * Extract text from a DOCX file
   */
  static async extractFromDOCX(buffer: Buffer, fileName?: string): Promise<DocumentExtractionResult> {
    try {
      console.log(`📄 Extracting text from DOCX: ${fileName || 'unknown'}`);

      const result = await mammoth.extractRawText({ buffer });

      if (!result.value || result.value.trim().length === 0) {
        return {
          success: false,
          text: '',
          error: 'DOCX file appears to be empty'
        };
      }

      // Log any warnings from mammoth
      if (result.messages && result.messages.length > 0) {
        console.warn('⚠️ DOCX extraction warnings:', result.messages);
      }

      console.log(`✅ DOCX extraction successful: ${result.value.length} characters`);

      return {
        success: true,
        text: result.value.trim(),
        metadata: {
          fileName,
          fileType: 'docx'
        }
      };
    } catch (error) {
      console.error('❌ DOCX extraction error:', error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Failed to extract text from DOCX'
      };
    }
  }

  /**
   * Extract text from a TXT file
   */
  static async extractFromTXT(buffer: Buffer, fileName?: string): Promise<DocumentExtractionResult> {
    try {
      console.log(`📄 Extracting text from TXT: ${fileName || 'unknown'}`);

      const text = buffer.toString('utf-8').trim();

      if (!text || text.length === 0) {
        return {
          success: false,
          text: '',
          error: 'TXT file appears to be empty'
        };
      }

      console.log(`✅ TXT extraction successful: ${text.length} characters`);

      return {
        success: true,
        text,
        metadata: {
          fileName,
          fileType: 'txt'
        }
      };
    } catch (error) {
      console.error('❌ TXT extraction error:', error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Failed to extract text from TXT'
      };
    }
  }

  /**
   * Extract text from a DOC file (legacy Microsoft Word)
   * Note: This is limited - DOC format is binary and complex
   */
  static async extractFromDOC(buffer: Buffer, fileName?: string): Promise<DocumentExtractionResult> {
    try {
      console.log(`📄 Attempting to extract text from DOC: ${fileName || 'unknown'}`);

      // Try to use mammoth (it may work for some DOC files)
      const result = await mammoth.extractRawText({ buffer });

      if (!result.value || result.value.trim().length === 0) {
        return {
          success: false,
          text: '',
          error: 'DOC file format not fully supported. Please convert to DOCX or PDF for best results.'
        };
      }

      console.log(`✅ DOC extraction successful: ${result.value.length} characters`);

      return {
        success: true,
        text: result.value.trim(),
        metadata: {
          fileName,
          fileType: 'doc'
        }
      };
    } catch (error) {
      console.error('❌ DOC extraction error:', error);
      return {
        success: false,
        text: '',
        error: 'DOC file format not fully supported. Please convert to DOCX or PDF for best results.'
      };
    }
  }

  /**
   * Extract text from a document based on its MIME type
   */
  static async extractFromDocument(
    buffer: Buffer,
    mimeType: string,
    fileName?: string
  ): Promise<DocumentExtractionResult> {
    console.log(`🔍 Processing document: ${fileName || 'unknown'} (${mimeType})`);

    switch (mimeType) {
      case 'application/pdf':
        return this.extractFromPDF(buffer, fileName);

      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return this.extractFromDOCX(buffer, fileName);

      case 'text/plain':
        return this.extractFromTXT(buffer, fileName);

      case 'application/msword':
        return this.extractFromDOC(buffer, fileName);

      default:
        return {
          success: false,
          text: '',
          error: `Unsupported document type: ${mimeType}`
        };
    }
  }

  /**
   * Combine multiple documents into a single text string
   * Preserves document boundaries with clear separators
   */
  static combineDocuments(
    extractionResults: DocumentExtractionResult[]
  ): { combinedText: string; metadata: any[] } {
    console.log(`📚 Combining ${extractionResults.length} documents`);

    const successfulResults = extractionResults.filter(result => result.success);

    if (successfulResults.length === 0) {
      throw new Error('No documents were successfully extracted');
    }

    const combinedText = successfulResults.map((result, index) => {
      const separator = index === 0 ? '' : '\n\n=== DOCUMENT SEPARATOR ===\n\n';
      const header = result.metadata?.fileName
        ? `[Document: ${result.metadata.fileName}]\n\n`
        : `[Document ${index + 1}]\n\n`;

      return separator + header + result.text;
    }).join('');

    const metadata = successfulResults.map(result => result.metadata);

    console.log(`✅ Combined documents: ${combinedText.length} characters total`);

    return { combinedText, metadata };
  }

  /**
   * Extract and combine multiple documents from storage paths
   * Downloads from Supabase storage and processes each document
   */
  static async extractMultipleDocuments(
    documentPaths: string[],
    supabaseClient: any
  ): Promise<{ combinedText: string; metadata: any[] }> {
    console.log(`📥 Processing ${documentPaths.length} documents from storage`);

    const extractionResults: DocumentExtractionResult[] = [];

    for (const path of documentPaths) {
      try {
        // Download document from Supabase storage
        const { data: fileData, error: downloadError } = await supabaseClient.storage
          .from('user-uploads')
          .download(path);

        if (downloadError || !fileData) {
          console.error(`❌ Failed to download document: ${path}`, downloadError);
          extractionResults.push({
            success: false,
            text: '',
            error: `Failed to download: ${path}`
          });
          continue;
        }

        // Convert Blob to Buffer
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine MIME type from file extension (fallback if Blob type is empty)
        let mimeType = fileData.type;
        if (!mimeType || mimeType === 'application/octet-stream') {
          const ext = path.split('.').pop()?.toLowerCase();
          const mimeMap: { [key: string]: string } = {
            'pdf': 'application/pdf',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'doc': 'application/msword',
            'txt': 'text/plain'
          };
          mimeType = mimeMap[ext || ''] || 'application/octet-stream';
        }

        // Extract text from document
        const fileName = path.split('/').pop();
        const result = await this.extractFromDocument(buffer, mimeType, fileName);
        extractionResults.push(result);

      } catch (error) {
        console.error(`❌ Error processing document: ${path}`, error);
        extractionResults.push({
          success: false,
          text: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Check if we have at least one successful extraction
    const successfulCount = extractionResults.filter(r => r.success).length;
    if (successfulCount === 0) {
      throw new Error('Failed to extract text from any of the provided documents');
    }

    console.log(`✅ Successfully extracted ${successfulCount}/${documentPaths.length} documents`);

    // Combine successful extractions
    return this.combineDocuments(extractionResults);
  }
}
