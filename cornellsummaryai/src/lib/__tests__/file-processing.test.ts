import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateFilePath,
  generateSignedUrl,
  uploadFile,
  downloadFile,
  generateSecureFilePath,
  fileExists,
  deleteFile,
  STORAGE_BUCKETS,
  ALLOWED_FILE_TYPES,
  EXPIRATION_TIMES
} from '../file-processing.js';

// Mock the supabase-server module
const mockCreateSignedUrl = vi.fn();
const mockUpload = vi.fn();
const mockDownload = vi.fn();
const mockList = vi.fn();
const mockRemove = vi.fn();

vi.mock('../supabase-server.js', () => ({
  supabaseServer: {
    storage: {
      from: vi.fn(() => ({
        createSignedUrl: mockCreateSignedUrl,
        upload: mockUpload,
        download: mockDownload,
        list: mockList,
        remove: mockRemove
      }))
    }
  }
}));

describe('File Processing Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateFilePath', () => {
    it('should validate a correct file path', () => {
      const result = validateFilePath('user123/audio/test.mp3', 'user123');
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should reject null or undefined paths', () => {
      expect(validateFilePath(null as any).success).toBe(false);
      expect(validateFilePath(undefined as any).success).toBe(false);
      expect(validateFilePath('').success).toBe(false);
    });

    it('should reject path traversal attempts', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        'user123/../other/file.mp3',
        'user123/./file.mp3',
        'user123//file.mp3',
        'user123\\\\file.mp3'
      ];

      dangerousPaths.forEach(path => {
        const result = validateFilePath(path);
        expect(result.success).toBe(false);
        expect(result.error).toContain('path traversal');
      });
    });

    it('should reject absolute paths', () => {
      const absolutePaths = [
        '/absolute/path/file.mp3',
        '\\absolute\\path\\file.mp3',
        'C:\\Windows\\file.mp3'
      ];

      absolutePaths.forEach(path => {
        const result = validateFilePath(path);
        expect(result.success).toBe(false);
        expect(result.error).toContain('absolute');
      });
    });

    it('should reject disallowed file extensions', () => {
      const result = validateFilePath('user123/malicious.exe');
      expect(result.success).toBe(false);
      expect(result.error).toContain('File type not allowed');
    });

    it('should validate user directory when userId provided', () => {
      const result = validateFilePath('wronguser/file.mp3', 'user123');
      expect(result.success).toBe(false);
      expect(result.error).toContain('user directory');
    });

    it('should reject extremely long paths', () => {
      const longPath = 'user123/' + 'a'.repeat(1000) + '.mp3';
      const result = validateFilePath(longPath);
      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
    });

    it('should accept all allowed file types', () => {
      const allowedFiles = [
        'user123/audio.mp3',
        'user123/audio.wav',
        'user123/audio.m4a',
        'user123/document.pdf',
        'user123/notes.txt',
        'user123/readme.md'
      ];

      allowedFiles.forEach(path => {
        const result = validateFilePath(path, 'user123');
        expect(result.success).toBe(true);
      });
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate a signed URL successfully', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed-url' },
        error: null
      });

      const result = await generateSignedUrl('test-bucket', 'user123/test.mp3', 3600, 'user123');
      
      expect(result.success).toBe(true);
      expect(result.data?.signedUrl).toBe('https://example.com/signed-url');
      expect(result.data?.expiresAt).toBeInstanceOf(Date);
    });

    it('should handle Supabase errors', async () => {
      mockCreateSignedUrl.mockResolvedValue({
        data: null,
        error: { message: 'File not found' }
      });

      const result = await generateSignedUrl('test-bucket', 'user123/test.mp3', 3600, 'user123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });

    it('should validate bucket name', async () => {
      const result = await generateSignedUrl('', 'user123/test.mp3');
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bucket name is required');
    });

    it('should validate expiration time', async () => {
      const result = await generateSignedUrl('test-bucket', 'user123/test.mp3', 0);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Expiration time must be');
    });

    it('should reject expiration time over 24 hours', async () => {
      const result = await generateSignedUrl('test-bucket', 'user123/test.mp3', 86401);
      expect(result.success).toBe(false);
      expect(result.error).toContain('24 hours');
    });
  });

  describe('uploadFile', () => {
    it('should upload a file successfully', async () => {
      mockUpload.mockResolvedValue({
        data: {
          path: 'user123/test.mp3',
          fullPath: 'test-bucket/user123/test.mp3',
          id: 'file-id-123'
        },
        error: null
      });

      const fileData = new ArrayBuffer(1024);
      const result = await uploadFile('test-bucket', 'user123/test.mp3', fileData, {
        userId: 'user123',
        contentType: 'audio/mpeg'
      });
      
      expect(result.success).toBe(true);
      expect(result.data?.path).toBe('user123/test.mp3');
      expect(result.data?.id).toBe('file-id-123');
    });

    it('should handle upload errors', async () => {
      mockUpload.mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' }
      });

      const fileData = new ArrayBuffer(1024);
      const result = await uploadFile('test-bucket', 'user123/test.mp3', fileData);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Upload failed');
    });

    it('should validate required inputs', async () => {
      const fileData = new ArrayBuffer(1024);
      
      // Test missing bucket
      let result = await uploadFile('', 'user123/test.mp3', fileData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Bucket name is required');

      // Test missing file data
      result = await uploadFile('test-bucket', 'user123/test.mp3', null as any);
      expect(result.success).toBe(false);
      expect(result.error).toContain('File data is required');
    });

    it('should set appropriate content types', async () => {
      mockUpload.mockResolvedValue({
        data: { path: 'test.pdf', fullPath: 'bucket/test.pdf', id: '123' },
        error: null
      });

      const fileData = new ArrayBuffer(1024);
      
      // Test PDF content type
      await uploadFile('test-bucket', 'user123/test.pdf', fileData, { userId: 'user123' });
      expect(mockUpload).toHaveBeenCalledWith(
        'user123/test.pdf',
        fileData,
        expect.objectContaining({ contentType: 'application/pdf' })
      );

      // Test MP3 content type
      await uploadFile('test-bucket', 'user123/test.mp3', fileData, { userId: 'user123' });
      expect(mockUpload).toHaveBeenCalledWith(
        'user123/test.mp3',
        fileData,
        expect.objectContaining({ contentType: 'audio/mpeg' })
      );
    });
  });

  describe('downloadFile', () => {
    it('should download a file successfully', async () => {
      const mockBlob = new Blob(['test content'], { type: 'text/plain' });
      mockDownload.mockResolvedValue({
        data: mockBlob,
        error: null
      });

      const result = await downloadFile('test-bucket', 'user123/test.txt', 'user123');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeInstanceOf(ArrayBuffer);
    });

    it('should handle download errors', async () => {
      mockDownload.mockResolvedValue({
        data: null,
        error: { message: 'File not found' }
      });

      const result = await downloadFile('test-bucket', 'user123/test.txt', 'user123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('generateSecureFilePath', () => {
    it('should generate a secure file path', () => {
      const path = generateSecureFilePath('user123', 'My Audio File.mp3', 'audio');
      
      expect(path).toMatch(/^user123\/audio\/my_audio_file_\d+_[a-z0-9]+\.mp3$/);
    });

    it('should sanitize dangerous characters', () => {
      const path = generateSecureFilePath('user123', '../../../malicious.mp3');
      
      expect(path).not.toContain('../');
      expect(path).toMatch(/^user123\/.._.._.._malicious_\d+_[a-z0-9]+\.mp3$/);
    });

    it('should work without prefix', () => {
      const path = generateSecureFilePath('user123', 'test.mp3');
      
      expect(path).toMatch(/^user123\/test_\d+_[a-z0-9]+\.mp3$/);
    });

    it('should handle files without extensions', () => {
      const path = generateSecureFilePath('user123', 'testfile');
      
      expect(path).toMatch(/^user123\/testfile_\d+_[a-z0-9]+$/);
    });
  });

  describe('fileExists', () => {
    it('should return true when file exists', async () => {
      mockList.mockResolvedValue({
        data: [{ name: 'test.mp3' }],
        error: null
      });

      const result = await fileExists('test-bucket', 'user123/test.mp3');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should return false when file does not exist', async () => {
      mockList.mockResolvedValue({
        data: [],
        error: null
      });

      const result = await fileExists('test-bucket', 'user123/nonexistent.mp3');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    it('should handle not found errors gracefully', async () => {
      mockList.mockResolvedValue({
        data: null,
        error: { message: 'Folder not found' }
      });

      const result = await fileExists('test-bucket', 'user123/test.mp3');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      mockRemove.mockResolvedValue({
        data: null,
        error: null
      });

      const result = await deleteFile('test-bucket', 'user123/test.mp3', 'user123');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    it('should handle deletion errors', async () => {
      mockRemove.mockResolvedValue({
        data: null,
        error: { message: 'File not found' }
      });

      const result = await deleteFile('test-bucket', 'user123/test.mp3', 'user123');
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('File not found');
    });
  });

  describe('Constants', () => {
    it('should export storage bucket constants', () => {
      expect(STORAGE_BUCKETS.USER_UPLOADS).toBe('user-uploads');
      expect(STORAGE_BUCKETS.GENERATED_NOTES).toBe('generated-notes');
    });

    it('should export allowed file types', () => {
      expect(ALLOWED_FILE_TYPES.AUDIO).toEqual(['.mp3', '.wav', '.m4a']);
      expect(ALLOWED_FILE_TYPES.DOCUMENT).toEqual(['.pdf']);
      expect(ALLOWED_FILE_TYPES.TEXT).toEqual(['.txt', '.md']);
    });

    it('should export expiration time constants', () => {
      expect(EXPIRATION_TIMES.SHORT).toBe(900);
      expect(EXPIRATION_TIMES.MEDIUM).toBe(3600);
      expect(EXPIRATION_TIMES.LONG).toBe(21600);
    });
  });
});