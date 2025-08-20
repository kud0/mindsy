import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Upload, File, Music, FileText, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface StreamlinedUploadProps {
  onUploadSuccess: (jobId: string, fileName: string) => Promise<void>;
  selectedFolderId?: string | null;
}

export function StreamlinedUpload({ onUploadSuccess, selectedFolderId }: StreamlinedUploadProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'audio' | 'document' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [documentChoice, setDocumentChoice] = useState<'upload' | 'summarize' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File type detection
  const detectFileType = (file: File): 'audio' | 'document' => {
    console.log('🔍 File type detection:', { name: file.name, type: file.type, size: file.size });
    
    const audioTypes = ['audio/', 'video/'];
    const documentTypes = ['application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
    
    // Check MIME type first
    if (audioTypes.some(type => file.type.startsWith(type))) {
      console.log('✅ Detected as audio via MIME type:', file.type);
      return 'audio';
    }
    if (documentTypes.some(type => file.type.startsWith(type)) || file.type === 'application/pdf') {
      console.log('✅ Detected as document via MIME type:', file.type);
      return 'document';
    }
    
    // Fallback to file extension if MIME type is unclear
    const fileName = file.name.toLowerCase();
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.mp4', '.mov', '.avi', '.mkv'];
    const documentExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
    
    if (audioExtensions.some(ext => fileName.endsWith(ext))) {
      console.log('✅ Detected as audio via file extension:', fileName);
      return 'audio';
    }
    if (documentExtensions.some(ext => fileName.endsWith(ext))) {
      console.log('✅ Detected as document via file extension:', fileName);
      return 'document';
    }
    
    // Default to document for unknown types
    console.log('⚠️ Unknown file type, defaulting to document:', { name: file.name, type: file.type });
    return 'document';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  const handleFileSelection = (file: File) => {
    setSelectedFile(file);
    const type = detectFileType(file);
    setFileType(type);
    
    if (type === 'audio') {
      // Auto-process audio files
      handleUpload(file, 'cornell');
    }
    // For documents, wait for user choice
  };

  const handleUpload = async (file: File, action: 'upload' | 'cornell') => {
    // Close dialog immediately to prevent it staying open
    handleClose();
    
    setIsUploading(true);
    
    try {
      // Step 1: Upload file to get path
      const uploadData = new FormData();
      
      // Re-detect file type to ensure it's correct (fix for state bug)
      const currentFileType = detectFileType(file);
      console.log('🚀 Upload starting with detected fileType:', currentFileType);
      console.log('🎯 File details:', { name: file.name, type: file.type, size: file.size });
      
      if (currentFileType === 'audio') {
        console.log('✅ Adding as audioFile');
        uploadData.append('audioFile', file);
      } else {
        console.log('📄 Adding as pdfFile');
        uploadData.append('pdfFile', file);
      }
      
      uploadData.append('lectureTitle', file.name.replace(/\.[^/.]+$/, ''));

      const uploadResponse = await fetch('/api/upload-files', {
        method: 'POST',
        body: uploadData,
        credentials: 'include'
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload failed');
      }

      const { audioPath, pdfPath } = await uploadResponse.json();
      
      // Step 2: Process with /api/generate using JSON
      const generateRequest = {
        audioFilePath: currentFileType === 'audio' ? audioPath : undefined,
        pdfFilePath: currentFileType === 'document' ? (pdfPath || audioPath) : undefined,
        lectureTitle: file.name.replace(/\.[^/.]+$/, ''),
        processingMode: action === 'cornell' ? 'enhance' : 'store',
        studyNodeId: selectedFolderId || undefined
      };

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generateRequest),
        credentials: 'include'
      });

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = 'Upload failed';
        try {
          const errorData = await response.text();
          console.error('Server response:', response.status, errorData);
          
          // Try to parse as JSON for structured error
          try {
            const errorJson = JSON.parse(errorData);
            errorMessage = errorJson.error || errorJson.message || errorMessage;
          } catch {
            // Not JSON, use as text
            errorMessage = errorData || errorMessage;
          }
        } catch {
          // Couldn't read response body
          errorMessage = `Upload failed (${response.status})`;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.jobId) {
        console.log('🎯 SUCCESS: Got jobId:', result.jobId, 'for file:', file.name);
        console.log('🔄 About to call onUploadSuccess...');
        
        // Trigger callback to create the card first
        await onUploadSuccess(result.jobId, file.name);
        
        console.log('✅ onUploadSuccess completed');
        
        // Show success toast after card is created
        toast.success(action === 'cornell' ? 'Processing started! Your Cornell Notes will be generated.' : 'File uploaded successfully!');
      } else {
        console.error('❌ No jobId in result:', result);
        throw new Error('No job ID returned');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedFile(null);
    setFileType(null);
    setDocumentChoice(null);
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('audio/') || type.startsWith('video/')) {
      return <Music className="w-8 h-8 text-blue-500" />;
    }
    if (type === 'application/pdf') {
      return <FileText className="w-8 h-8 text-red-500" />;
    }
    return <File className="w-8 h-8 text-gray-500" />;
  };

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="bg-black hover:bg-gray-800 text-white"
      >
        <Upload className="w-4 h-4 mr-2" />
        Upload
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Upload File</DialogTitle>
            <DialogDescription>
              Upload audio files for automatic Cornell Notes generation or documents for processing.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {!selectedFile ? (
              /* File Selection */
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                  dragActive 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                    : "border-gray-300 dark:border-gray-600 hover:border-gray-400"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium">Drop your file here</p>
                  <p className="text-sm text-gray-500">
                    Audio files (MP3, WAV, M4A) or Documents (PDF, DOCX, TXT)
                  </p>
                </div>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Select File
                </Button>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleFileInput}
                  accept="audio/*,video/*,.pdf,.doc,.docx,.txt"
                />
              </div>
            ) : fileType === 'document' && !documentChoice ? (
              /* Document Choice */
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  {getFileIcon(selectedFile.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="font-medium text-center">What would you like to do?</p>
                  
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full h-auto p-4 text-left"
                      onClick={() => {
                        setDocumentChoice('upload');
                        handleUpload(selectedFile, 'upload');
                      }}
                      disabled={isUploading}
                    >
                      <div>
                        <div className="font-medium">Just Upload</div>
                        <div className="text-sm text-gray-500">Store the document as-is</div>
                      </div>
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full h-auto p-4 text-left border-blue-200 bg-blue-50 dark:bg-blue-950/20"
                      onClick={() => {
                        setDocumentChoice('summarize');
                        handleUpload(selectedFile, 'cornell');
                      }}
                      disabled={isUploading}
                    >
                      <div>
                        <div className="font-medium">Summarize with AI</div>
                        <div className="text-sm text-gray-500">Generate Cornell Notes automatically</div>
                      </div>
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* Processing State */
              <div className="text-center space-y-4">
                <div className="flex items-center gap-3 p-3 border rounded-lg">
                  {getFileIcon(selectedFile.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">
                      {fileType === 'audio' ? 'Processing audio...' : 
                       documentChoice === 'summarize' ? 'Generating Cornell Notes...' : 'Uploading...'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">
                    {fileType === 'audio' ? 'This may take a few minutes' : 'Please wait...'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}