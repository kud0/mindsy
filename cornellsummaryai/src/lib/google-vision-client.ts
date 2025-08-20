/**
 * Google Cloud Vision API Client for OCR
 * Used specifically for handwritten text recognition
 */

import { config } from './config';

interface VisionOCRResult {
  success: boolean;
  text?: string;
  error?: string;
  confidence?: number;
}

interface VisionAPIResponse {
  responses: Array<{
    fullTextAnnotation?: {
      text: string;
    };
    textAnnotations?: Array<{
      description: string;
      confidence?: number;
    }>;
    error?: {
      code: number;
      message: string;
    };
  }>;
}

export class GoogleVisionClient {
  private apiKey: string;
  private apiUrl = 'https://vision.googleapis.com/v1/images:annotate';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || config.googleVisionApiKey || '';
    
    if (!this.apiKey) {
      console.warn('Google Vision API key not configured');
    }
  }

  /**
   * Extract text from an image using Google Vision OCR
   * Optimized for handwritten text recognition
   */
  async extractTextFromImage(imageUrl: string): Promise<VisionOCRResult> {
    if (!this.apiKey) {
      return {
        success: false,
        error: 'Google Vision API key not configured'
      };
    }

    try {
      // Download the image from the URL
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Check size and compress if needed
      const maxSizeBytes = 15 * 1024 * 1024; // 15MB limit to be safe
      let base64Image = Buffer.from(imageBuffer).toString('base64');
      
      if (imageBuffer.byteLength > maxSizeBytes) {
        console.log(`Image too large (${Math.round(imageBuffer.byteLength / 1024 / 1024)}MB), compressing...`);
        
        // For large images, we need to resize them
        // Since we can't use image processing libraries here, we'll reject very large images
        // In a production app, you'd want to add sharp or similar for image processing
        return {
          success: false,
          error: `Image too large (${Math.round(imageBuffer.byteLength / 1024 / 1024)}MB). Please use images smaller than 15MB or compress them first.`
        };
      }

      // Prepare the Vision API request
      const requestBody = {
        requests: [
          {
            image: {
              content: base64Image
            },
            features: [
              {
                type: 'DOCUMENT_TEXT_DETECTION', // Best for handwritten text
                maxResults: 1
              }
            ],
            imageContext: {
              languageHints: ['en', 'es'] // Support English and Spanish
            }
          }
        ]
      };

      // Call Google Vision API
      const visionResponse = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!visionResponse.ok) {
        const errorText = await visionResponse.text();
        console.error('Vision API error:', errorText);
        throw new Error(`Vision API error: ${visionResponse.status} - ${errorText}`);
      }

      // Try to parse JSON response, handle non-JSON responses
      let visionData: VisionAPIResponse;
      try {
        const responseText = await visionResponse.text();
        console.log('Vision API raw response:', responseText.substring(0, 200)); // Log first 200 chars for debugging
        visionData = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Failed to parse Vision API response as JSON:', jsonError);
        throw new Error('Vision API returned invalid JSON response');
      }
      
      // Check for API errors
      if (visionData.responses[0]?.error) {
        throw new Error(visionData.responses[0].error.message);
      }

      // Extract text from response
      const extractedText = visionData.responses[0]?.fullTextAnnotation?.text || 
                           visionData.responses[0]?.textAnnotations?.[0]?.description || '';

      if (!extractedText) {
        return {
          success: false,
          error: 'No text could be extracted from the image. The image might not contain readable text or might be too blurry.'
        };
      }

      // Calculate confidence if available
      const confidence = visionData.responses[0]?.textAnnotations?.[0]?.confidence;

      console.log(`Google Vision OCR extracted ${extractedText.length} characters`);
      
      return {
        success: true,
        text: extractedText.trim(),
        confidence: confidence
      };

    } catch (error) {
      console.error('Google Vision OCR error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to extract text from image'
      };
    }
  }

  /**
   * Check if a file is an image based on extension
   */
  static isImageFile(filename: string): boolean {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  }

  /**
   * Check if a file is a document (for Tika processing)
   */
  static isDocumentFile(filename: string): boolean {
    const docExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.md'];
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    return docExtensions.includes(ext);
  }
}

/**
 * Factory function to create a Google Vision client
 */
export function createGoogleVisionClient(): GoogleVisionClient {
  return new GoogleVisionClient();
}