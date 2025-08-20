/**
 * Railway Tika API Client
 * Handles PDF text extraction using Railway-hosted Tika service
 */
import { config } from './config';

interface TikaError {
  error: string;
  message?: string;
}

export class TikaClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    if (!baseUrl) {
      // Use the config imported at the top of the file
      baseUrl = config.tikaApiUrl;
    }
    this.baseUrl = baseUrl || '';
  }

  /**
   * Extract text from PDF using Railway Tika API
   * @param pdfUrl - Signed URL to the PDF file
   * @returns Promise<string> - Extracted text content
   */
  async extractPdfText(pdfUrl: string): Promise<string> {
    if (!pdfUrl) {
      throw new Error('PDF URL is required');
    }

    if (!this.baseUrl) {
      throw new Error('Tika API URL is not configured');
    }

    try {
      // First, fetch the PDF binary data from the signed URL
      const pdfResponse = await fetch(pdfUrl);
      
      if (!pdfResponse.ok) {
        throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
      }

      const pdfBuffer = await pdfResponse.arrayBuffer();

      if (pdfBuffer.byteLength === 0) {
        throw new Error('PDF file is empty');
      }

      // Send binary data to Tika API using PUT request to /tika endpoint
      const tikaResponse = await fetch(`${this.baseUrl}/tika`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'text/plain'
        },
        body: pdfBuffer
      });

      if (!tikaResponse.ok) {
        const errorText = await tikaResponse.text();
        let errorMessage = `Tika API error: ${tikaResponse.status} ${tikaResponse.statusText}`;
        
        try {
          const errorData: TikaError = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If error response is not JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const extractedText = await tikaResponse.text();

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF');
      }

      return extractedText.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`PDF text extraction failed: ${error.message}`);
      }
      throw new Error('PDF text extraction failed: Unknown error');
    }
  }

  /**
   * Extract text from PDF buffer directly (for cases where PDF data is already available)
   * @param pdfBuffer - PDF file as ArrayBuffer
   * @returns Promise<string> - Extracted text content
   */
  async extractPdfTextFromBuffer(pdfBuffer: ArrayBuffer): Promise<string> {
    if (!pdfBuffer || pdfBuffer.byteLength === 0) {
      throw new Error('PDF buffer is required and cannot be empty');
    }

    if (!this.baseUrl) {
      throw new Error('Tika API URL is not configured');
    }

    try {
      const tikaResponse = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'text/plain'
        },
        body: pdfBuffer
      });

      if (!tikaResponse.ok) {
        const errorText = await tikaResponse.text();
        let errorMessage = `Tika API error: ${tikaResponse.status} ${tikaResponse.statusText}`;
        
        try {
          const errorData: TikaError = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If error response is not JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const extractedText = await tikaResponse.text();

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the PDF');
      }

      return extractedText.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`PDF text extraction failed: ${error.message}`);
      }
      throw new Error('PDF text extraction failed: Unknown error');
    }
  }

  /**
   * Extract text from any document format using Railway Tika API
   * @param documentUrl - Signed URL to the document file
   * @returns Promise<string> - Extracted text content
   */
  async extractDocumentText(documentUrl: string): Promise<string> {
    if (!documentUrl) {
      throw new Error('Document URL is required');
    }

    if (!this.baseUrl) {
      throw new Error('Tika API URL is not configured');
    }

    try {
      // First, fetch the document binary data from the signed URL
      const documentResponse = await fetch(documentUrl);
      
      if (!documentResponse.ok) {
        throw new Error(`Failed to fetch document: ${documentResponse.status} ${documentResponse.statusText}`);
      }

      const documentBuffer = await documentResponse.arrayBuffer();

      if (documentBuffer.byteLength === 0) {
        throw new Error('Document file is empty');
      }

      // Send binary data to Tika API using PUT request to /tika endpoint
      const tikaResponse = await fetch(`${this.baseUrl}/tika`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'text/plain'
        },
        body: documentBuffer
      });

      if (!tikaResponse.ok) {
        const errorText = await tikaResponse.text();
        let errorMessage = `Tika API error: ${tikaResponse.status} ${tikaResponse.statusText}`;
        
        try {
          const errorData: TikaError = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If error response is not JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const extractedText = await tikaResponse.text();

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the document');
      }

      return extractedText.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Document text extraction failed: ${error.message}`);
      }
      throw new Error('Document text extraction failed: Unknown error');
    }
  }

  /**
   * Extract text from document buffer directly (for any document format)
   * @param documentBuffer - Document file as ArrayBuffer
   * @returns Promise<string> - Extracted text content
   */
  async extractDocumentTextFromBuffer(documentBuffer: ArrayBuffer): Promise<string> {
    if (!documentBuffer || documentBuffer.byteLength === 0) {
      throw new Error('Document buffer is required and cannot be empty');
    }

    if (!this.baseUrl) {
      throw new Error('Tika API URL is not configured');
    }

    try {
      const tikaResponse = await fetch(this.baseUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Accept': 'text/plain'
        },
        body: documentBuffer
      });

      if (!tikaResponse.ok) {
        const errorText = await tikaResponse.text();
        let errorMessage = `Tika API error: ${tikaResponse.status} ${tikaResponse.statusText}`;
        
        try {
          const errorData: TikaError = JSON.parse(errorText);
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          // If error response is not JSON, use the raw text
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const extractedText = await tikaResponse.text();

      if (!extractedText || extractedText.trim().length === 0) {
        throw new Error('No text could be extracted from the document');
      }

      return extractedText.trim();
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Document text extraction failed: ${error.message}`);
      }
      throw new Error('Document text extraction failed: Unknown error');
    }
  }
}

/**
 * Factory function to create Tika client with configuration
 */
export function createTikaClient(): TikaClient {
  // Use the config imported at the top of the file
  const apiUrl = config.tikaApiUrl;
  
  if (!apiUrl) {
    throw new Error('TIKA_API_URL environment variable is required');
  }

  return new TikaClient(apiUrl);
}