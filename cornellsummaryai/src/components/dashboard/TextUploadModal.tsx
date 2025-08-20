import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TextUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (documentFile: File, title?: string, processingMode?: 'enhance' | 'store') => Promise<void>;
}

export function TextUploadModal({ open, onOpenChange, onUpload }: TextUploadModalProps) {
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Supported document formats that Tika can process
  const supportedFormats = {
    'application/pdf': 'PDF',
    'application/msword': 'DOC',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
    'text/plain': 'TXT',
    'application/rtf': 'RTF',
    'application/vnd.oasis.opendocument.text': 'ODT',
    'text/html': 'HTML',
    'text/markdown': 'MD',
    // Image formats for OCR testing
    'image/jpeg': 'JPEG',
    'image/jpg': 'JPG',
    'image/png': 'PNG',
    'image/gif': 'GIF',
    'image/tiff': 'TIFF',
    'image/bmp': 'BMP',
    'image/webp': 'WEBP'
  };

  const isValidFileType = (file: File | null): boolean => {
    if (!file || !file.name) return false;
    const fileName = file.name.toLowerCase();
    return Object.keys(supportedFormats).includes(file.type) || 
           fileName.endsWith('.txt') || 
           fileName.endsWith('.md') ||
           fileName.endsWith('.jpg') ||
           fileName.endsWith('.jpeg') ||
           fileName.endsWith('.png') ||
           fileName.endsWith('.gif') ||
           fileName.endsWith('.tiff') ||
           fileName.endsWith('.bmp') ||
           fileName.endsWith('.webp');
  };

  const getFileTypeLabel = (file: File | null): string => {
    if (!file || !file.name) return 'Unknown';
    
    if (file.type && supportedFormats[file.type as keyof typeof supportedFormats]) {
      return supportedFormats[file.type as keyof typeof supportedFormats];
    }
    const ext = file.name.split('.').pop()?.toUpperCase();
    return ext || 'Unknown';
  };

  // Ultra-safe file size formatter
  const formatFileSize = (file: File | null): string => {
    try {
      if (!file) return '0 Bytes';
      
      // Multiple safety checks
      const size = file.size;
      if (typeof size !== 'number' || isNaN(size) || size < 0) return '0 Bytes';
      if (size === 0) return '0 Bytes';
      
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(size) / Math.log(k));
      
      if (i < 0 || i >= sizes.length) return '0 Bytes';
      
      return parseFloat((size / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    } catch (error) {
      console.error('Error formatting file size:', error);
      return '0 Bytes';
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFile = useCallback((file: File | null) => {
    try {
      console.log('Processing file:', file);
      
      if (!file) {
        setError('No file provided');
        return;
      }

      // Extensive validation
      if (!(file instanceof File)) {
        console.error('Not a File instance:', file);
        setError('Invalid file object');
        return;
      }

      if (!file.name) {
        console.error('File has no name:', file);
        setError('File has no name');
        return;
      }

      // Check size property exists and is valid
      if (typeof file.size !== 'number') {
        console.error('File size is not a number:', typeof file.size, file.size);
        setError('File size information is invalid');
        return;
      }

      if (!isValidFileType(file)) {
        setError('Please select a supported document file (PDF, DOC, DOCX, TXT, RTF, ODT, HTML, MD)');
        return;
      }

      console.log('File validated successfully:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      setDocumentFile(file);
      setError(null);
      
      // Set title from filename if not already set
      if (!title && file.name) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        setTitle(nameWithoutExt);
      }
    } catch (error) {
      console.error('Error processing file:', error);
      setError('Error processing file. Please try again.');
    }
  }, [title]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    try {
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) {
        setError('No files detected');
        return;
      }

      const file = files[0];
      processFile(file);
    } catch (error) {
      console.error('Error handling drop:', error);
      setError('Error processing dropped file. Please try again.');
    }
  }, [processFile]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const files = e.target.files;
      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];
      processFile(file);
    } catch (error) {
      console.error('Error in handleFileSelect:', error);
      setError('Error processing file selection. Please try again.');
    }
  };

  const handleSubmit = async (processingMode: 'enhance' | 'store') => {
    if (!documentFile) {
      setError('Please select a document file');
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await onUpload(documentFile, title || undefined, processingMode);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Reset form and close modal
      resetForm();
      onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setDocumentFile(null);
    setTitle('');
    setError(null);
    setUploadProgress(0);
    // Clear the file input
    const fileInput = document.getElementById('document') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleClose = () => {
    if (!uploading) {
      resetForm();
      onOpenChange(false);
    }
  };

  const handleRemoveFile = () => {
    setDocumentFile(null);
    setError(null);
    const fileInput = document.getElementById('document') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  // Safe file info display
  const getFileDisplayInfo = (file: File | null) => {
    if (!file) return { name: 'Unknown', type: 'Unknown', size: '0 Bytes', processor: 'Unknown' };
    
    // Determine which processor will be used
    const fileName = file.name?.toLowerCase() || '';
    const isImage = fileName.endsWith('.jpg') || fileName.endsWith('.jpeg') || 
                   fileName.endsWith('.png') || fileName.endsWith('.gif') || 
                   fileName.endsWith('.bmp') || fileName.endsWith('.webp') || 
                   fileName.endsWith('.tiff');
    
    const processor = isImage ? 'Google Vision AI (Handwriting OCR)' : 'Tika (Document Text)';
    const processorIcon = isImage ? '🤖' : '📄';
    
    return {
      name: file.name || 'Unknown file',
      type: getFileTypeLabel(file),
      size: formatFileSize(file),
      processor,
      processorIcon
    };
  };

  const fileInfo = getFileDisplayInfo(documentFile);

  return (
    <Dialog open={open} onOpenChange={handleClose} modal>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-500" />
            Upload Notes
          </DialogTitle>
          <DialogDescription>
            Upload typed documents (PDF, DOC, TXT) or images of handwritten notes (JPG, PNG). 
            Documents use Tika, handwritten notes use Google Vision AI for OCR.
          </DialogDescription>
        </DialogHeader>

        <div>
          <div className="grid gap-4 py-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="document">Document File (Required)</Label>
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-6 transition-colors",
                  "hover:border-primary/50 hover:bg-accent/5",
                  dragActive && "border-primary bg-primary/5",
                  documentFile && "border-green-500 bg-green-50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {documentFile ? (
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle className="h-8 w-8 text-green-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{fileInfo.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {fileInfo.type} • {fileInfo.size}
                        </p>
                        <p className="text-xs text-blue-600 font-medium mt-1">
                          {fileInfo.processorIcon} {fileInfo.processor}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveFile}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remove
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-sm font-medium mb-2">
                      Drag and drop or click to select document or image
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Supports: PDF, DOC, DOCX, TXT, RTF, ODT, HTML, MD, JPG, PNG, GIF, TIFF, BMP<br/>
                      Documents: Max 50MB • Images: Max 15MB for OCR
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('document')?.click()}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                  </div>
                )}
                
                <input
                  id="document"
                  type="file"
                  accept="application/pdf,.doc,.docx,.txt,.rtf,.odt,.html,.md,text/plain,text/html,text/markdown,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/rtf,application/vnd.oasis.opendocument.text,image/jpeg,image/jpg,image/png,image/gif,image/tiff,image/bmp,image/webp,.jpg,.jpeg,.png,.gif,.tiff,.bmp,.webp"
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="title">Document Title (Optional)</Label>
              <Input
                id="title"
                type="text"
                placeholder="e.g., Lecture Notes, Research Paper, etc."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground">
                If not provided, the filename will be used as the title.
              </p>
            </div>

            {uploading && (
              <div className="space-y-2">
                <Progress value={uploadProgress} className="w-full" />
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing document...
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-col gap-3">
            <div className="flex justify-between w-full gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={uploading}
                className="flex-1"
              >
                Cancel
              </Button>
              
              <Button 
                type="button"
                variant="outline"
                onClick={() => handleSubmit('store')}
                disabled={!documentFile || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Store Notes
                  </>
                )}
              </Button>
              
              <Button 
                type="button"
                onClick={() => handleSubmit('enhance')}
                disabled={!documentFile || uploading}
                className="flex-1"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Enhance with AI
                  </>
                )}
              </Button>
            </div>
            
            <div className="text-xs text-muted-foreground text-center">
              <strong>Store:</strong> Keep content as-is with clean formatting • <strong>Enhance:</strong> Generate Mindsy Notes structure
            </div>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}