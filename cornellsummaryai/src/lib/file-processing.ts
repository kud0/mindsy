import { supabaseAdmin } from './supabase-server.js';

/**
 * File Processing Service
 * Handles secure file operations for Supabase Storage including signed URL generation,
 * file uploads, and path validation for the Mindsy Notes AI application.
 */

export interface FileProcessingResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SignedUrlResult {
  signedUrl: string;
  expiresAt: Date;
}

export interface FileUploadResult {
  path: string;
  fullPath: string;
  id: string;
}

/**
 * Validates file paths to prevent unauthorized access and path traversal attacks
 * @param filePath - The file path to validate
 * @param userId - The user ID for user-scoped validation
 * @returns Object indicating if path is valid and any error message
 */
export function validateFilePath(filePath: string, userId?: string): FileProcessingResult<boolean> {
  try {
    // Check for null, undefined, or empty paths
    if (!filePath || typeof filePath !== 'string') {
      return {
        success: false,
        error: 'File path is required and must be a string'
      };
    }

    // Remove leading/trailing whitespace
    const cleanPath = filePath.trim();

    // Check for empty path after cleaning
    if (!cleanPath) {
      return {
        success: false,
        error: 'File path cannot be empty'
      };
    }

    // Check for path traversal attempts
    const dangerousPatterns = [
      '../',
      '..\\',
      './',
      '.\\',
      '//',
      '\\\\',
      '%2e%2e',
      '%2f',
      '%5c'
    ];

    const lowerPath = cleanPath.toLowerCase();
    for (const pattern of dangerousPatterns) {
      if (lowerPath.includes(pattern)) {
        return {
          success: false,
          error: 'Invalid file path: path traversal detected'
        };
      }
    }

    // Check for absolute paths (should be relative)
    if (cleanPath.startsWith('/') || cleanPath.startsWith('\\') || cleanPath.match(/^[a-zA-Z]:/)) {
      return {
        success: false,
        error: 'File path must be relative, not absolute'
      };
    }

    // Validate file extension for security
    const allowedExtensions = [
      // Audio formats
      '.mp3', '.wav', '.m4a',
      // Document formats
      '.pdf', '.txt', '.md', '.doc', '.docx', '.rtf', '.odt',
      // Image formats (for OCR testing)
      '.jpg', '.jpeg', '.png', '.gif', '.tiff', '.bmp', '.webp'
    ];
    const extension = cleanPath.toLowerCase().substring(cleanPath.lastIndexOf('.'));
    
    if (!allowedExtensions.includes(extension)) {
      return {
        success: false,
        error: `File type not allowed. Allowed types: ${allowedExtensions.join(', ')}`
      };
    }

    // If userId is provided, validate that path starts with user folder
    if (userId) {
      const expectedPrefix = `${userId}/`;
      if (!cleanPath.startsWith(expectedPrefix)) {
        return {
          success: false,
          error: 'File path must be within user directory'
        };
      }
    }

    // Check path length (prevent extremely long paths)
    if (cleanPath.length > 1000) {
      return {
        success: false,
        error: 'File path too long (max 1000 characters)'
      };
    }

    return {
      success: true,
      data: true
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Path validation failed'
    };
  }
}

/**
 * Generates a signed URL for secure file access from Supabase Storage
 * @param bucket - The storage bucket name
 * @param filePath - The file path within the bucket
 * @param expiresIn - Expiration time in seconds (default: 3600 = 1 hour)
 * @param userId - Optional user ID for path validation
 * @returns Promise with signed URL result or error
 */
export async function generateSignedUrl(
  bucket: string,
  filePath: string,
  expiresIn: number = 3600,
  userId?: string
): Promise<FileProcessingResult<SignedUrlResult>> {
  try {
    // Validate inputs
    if (!bucket || typeof bucket !== 'string') {
      return {
        success: false,
        error: 'Bucket name is required and must be a string'
      };
    }

    // Validate file path
    const pathValidation = validateFilePath(filePath, userId);
    if (!pathValidation.success) {
      return {
        success: false,
        error: pathValidation.error
      };
    }

    // Validate expiration time
    if (expiresIn <= 0 || expiresIn > 86400) { // Max 24 hours
      return {
        success: false,
        error: 'Expiration time must be between 1 second and 24 hours'
      };
    }

    // Generate signed URL using Supabase
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      console.error('Supabase signed URL error:', error);
      return {
        success: false,
        error: `Failed to generate signed URL: ${error.message}`
      };
    }

    if (!data?.signedUrl) {
      return {
        success: false,
        error: 'No signed URL returned from Supabase'
      };
    }

    // Calculate expiration date
    const expiresAt = new Date(Date.now() + (expiresIn * 1000));

    return {
      success: true,
      data: {
        signedUrl: data.signedUrl,
        expiresAt
      }
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate signed URL'
    };
  }
}

/**
 * Uploads a file to Supabase Storage with proper error handling
 * @param bucket - The storage bucket name
 * @param filePath - The destination file path within the bucket
 * @param fileData - The file data as ArrayBuffer or File
 * @param options - Additional upload options
 * @returns Promise with upload result or error
 */
export async function uploadFile(
  bucket: string,
  filePath: string,
  fileData: ArrayBuffer | File,
  options: {
    contentType?: string;
    cacheControl?: string;
    upsert?: boolean;
    userId?: string;
  } = {}
): Promise<FileProcessingResult<FileUploadResult>> {
  try {
    // Validate inputs
    if (!bucket || typeof bucket !== 'string') {
      return {
        success: false,
        error: 'Bucket name is required and must be a string'
      };
    }

    if (!fileData) {
      return {
        success: false,
        error: 'File data is required'
      };
    }

    // Validate file path
    const pathValidation = validateFilePath(filePath, options.userId);
    if (!pathValidation.success) {
      return {
        success: false,
        error: pathValidation.error
      };
    }

    // Prepare upload options
    const uploadOptions: any = {
      cacheControl: options.cacheControl || '3600',
      upsert: options.upsert || false
    };

    // Set content type if provided
    if (options.contentType) {
      uploadOptions.contentType = options.contentType;
    } else if (filePath.toLowerCase().endsWith('.pdf')) {
      uploadOptions.contentType = 'application/pdf';
    } else if (filePath.toLowerCase().endsWith('.mp3')) {
      uploadOptions.contentType = 'audio/mpeg';
    }

    // Upload file to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(filePath, fileData, uploadOptions);

    if (error) {
      console.error('Supabase upload error:', error);
      return {
        success: false,
        error: `Failed to upload file: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'No upload data returned from Supabase'
      };
    }

    return {
      success: true,
      data: {
        path: data.path,
        fullPath: data.fullPath,
        id: data.id
      }
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file'
    };
  }
}

/**
 * Downloads a file from Supabase Storage
 * @param bucket - The storage bucket name
 * @param filePath - The file path within the bucket
 * @param userId - Optional user ID for path validation
 * @returns Promise with file data as ArrayBuffer or error
 */
export async function downloadFile(
  bucket: string,
  filePath: string,
  userId?: string
): Promise<FileProcessingResult<ArrayBuffer>> {
  try {
    // Validate inputs
    if (!bucket || typeof bucket !== 'string') {
      return {
        success: false,
        error: 'Bucket name is required and must be a string'
      };
    }

    // Validate file path
    const pathValidation = validateFilePath(filePath, userId);
    if (!pathValidation.success) {
      return {
        success: false,
        error: pathValidation.error
      };
    }

    // Download file from Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .download(filePath);

    if (error) {
      console.error('Supabase download error:', error);
      return {
        success: false,
        error: `Failed to download file: ${error.message}`
      };
    }

    if (!data) {
      return {
        success: false,
        error: 'No file data returned from Supabase'
      };
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await data.arrayBuffer();

    return {
      success: true,
      data: arrayBuffer
    };
  } catch (error) {
    console.error('Error downloading file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download file'
    };
  }
}

/**
 * Utility function to generate a secure file path for user uploads
 * @param userId - The user ID
 * @param filename - The original filename
 * @param prefix - Optional prefix for organization (e.g., 'audio', 'pdf')
 * @returns Secure file path string
 */
export function generateSecureFilePath(
  userId: string,
  filename: string,
  prefix?: string
): string {
  // Sanitize filename - replace dangerous characters with underscores
  const sanitizedFilename = filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();

  // Add timestamp to prevent conflicts
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8);

  // Build path components
  const pathComponents = [userId];
  
  if (prefix) {
    pathComponents.push(prefix);
  }
  
  // Handle extension and filename
  const lastDotIndex = sanitizedFilename.lastIndexOf('.');
  let nameWithoutExt: string;
  let extension: string;
  
  if (lastDotIndex > 0) {
    // File has extension
    nameWithoutExt = sanitizedFilename.substring(0, lastDotIndex);
    extension = sanitizedFilename.substring(lastDotIndex);
  } else {
    // File has no extension
    nameWithoutExt = sanitizedFilename;
    extension = '';
  }
  
  // Create final filename with timestamp and random suffix
  const finalFilename = `${nameWithoutExt}_${timestamp}_${randomSuffix}${extension}`;
  
  pathComponents.push(finalFilename);

  return pathComponents.join('/');
}

/**
 * Utility function to check if a file exists in storage
 * @param bucket - The storage bucket name
 * @param filePath - The file path within the bucket
 * @returns Promise with boolean result or error
 */
export async function fileExists(
  bucket: string,
  filePath: string
): Promise<FileProcessingResult<boolean>> {
  try {
    // Try to get file info (this will fail if file doesn't exist)
    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.substring(filePath.lastIndexOf('/') + 1)
      });

    if (error) {
      // If it's a "not found" error, file doesn't exist
      if (error.message.includes('not found') || error.message.includes('does not exist')) {
        return {
          success: true,
          data: false
        };
      }
      
      return {
        success: false,
        error: error.message
      };
    }

    // Check if file is in the list
    const filename = filePath.substring(filePath.lastIndexOf('/') + 1);
    const exists = data?.some(file => file.name === filename) || false;

    return {
      success: true,
      data: exists
    };
  } catch (error) {
    console.error('Error checking file existence:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to check file existence'
    };
  }
}

/**
 * Utility function to delete a file from storage
 * @param bucket - The storage bucket name
 * @param filePath - The file path within the bucket
 * @param userId - Optional user ID for path validation
 * @returns Promise with deletion result or error
 */
export async function deleteFile(
  bucket: string,
  filePath: string,
  userId?: string
): Promise<FileProcessingResult<boolean>> {
  try {
    // Validate inputs
    if (!bucket || typeof bucket !== 'string') {
      return {
        success: false,
        error: 'Bucket name is required and must be a string'
      };
    }

    // Validate file path
    const pathValidation = validateFilePath(filePath, userId);
    if (!pathValidation.success) {
      return {
        success: false,
        error: pathValidation.error
      };
    }

    // Delete file from Supabase Storage
    const { error } = await supabaseAdmin.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Supabase delete error:', error);
      return {
        success: false,
        error: `Failed to delete file: ${error.message}`
      };
    }

    return {
      success: true,
      data: true
    };
  } catch (error) {
    console.error('Error deleting file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete file'
    };
  }
}

// Storage bucket constants for type safety
export const STORAGE_BUCKETS = {
  USER_UPLOADS: 'user-uploads',
  GENERATED_NOTES: 'generated-notes'
} as const;

// File type constants
export const ALLOWED_FILE_TYPES = {
  AUDIO: ['.mp3', '.wav', '.m4a'],
  DOCUMENT: ['.pdf'],
  TEXT: ['.txt', '.md']
} as const;

// Default expiration times
export const EXPIRATION_TIMES = {
  SHORT: 900,    // 15 minutes
  MEDIUM: 3600,  // 1 hour
  LONG: 21600    // 6 hours
} as const;