"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  FileAudio,
  FileText,
  Link,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Volume2,
  Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useStudyFolders } from '@/hooks/useStudyFolders';

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'audio' | 'link' | 'documents';
}

interface UploadedFile {
  file: File;
  preview?: string;
}

interface UploadProgress {
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  message?: string;
}

export function UploadDialog({ open, onOpenChange, defaultTab = 'audio' }: UploadDialogProps) {
  const [activeTab, setActiveTab] = useState<typeof defaultTab>(defaultTab);
  const [audioFile, setAudioFile] = useState<UploadedFile | null>(null);
  const [documentFiles, setDocumentFiles] = useState<UploadedFile[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<'youtube' | 'podcast' | 'url'>('youtube');
  const [lectureTitle, setLectureTitle] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [processingMode, setProcessingMode] = useState<'enhance' | 'basic'>('enhance');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();
  const { folders, loading: foldersLoading } = useStudyFolders();

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  React.useEffect(() => {
    if (!open) {
      // Reset all form data when dialog closes
      setAudioFile(null);
      setDocumentFiles([]);
      setLinkUrl('');
      setLinkType('youtube');
      setLectureTitle('');
      setSelectedFolder('');
      setUploadProgress(null);
      setIsUploading(false);
      setDragActive(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [open]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleFileSelection = (file: File, type: 'audio' | 'document') => {
    if (type === 'audio') {
      if (file.size > 500 * 1024 * 1024) { // 500MB limit
        toast.error('Audio file must be less than 500MB');
        return;
      }
      
      const audioUrl = URL.createObjectURL(file);
      setAudioFile({ file, preview: audioUrl });
      
      // Auto-fill title from filename
      if (!lectureTitle) {
        const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, '');
        setLectureTitle(nameWithoutExtension);
      }
    } else if (type === 'document') {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit per file
        toast.error('Document files must be less than 50MB each');
        return;
      }
      
      setDocumentFiles(prev => [...prev, { file }]);
    }
  };

  const removeAudioFile = () => {
    if (audioFile?.preview) {
      URL.revokeObjectURL(audioFile.preview);
    }
    setAudioFile(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  const removeDocumentFile = (index: number) => {
    setDocumentFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, type: 'audio' | 'document') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      
      if (type === 'audio') {
        const audioFile = files.find(f => f.type.startsWith('audio/'));
        if (audioFile) {
          handleFileSelection(audioFile, 'audio');
        } else {
          toast.error('Please drop an audio file');
        }
      } else if (type === 'document') {
        const documentFiles = files.filter(f => 
          f.type === 'application/pdf' || 
          f.type === 'text/plain' || 
          f.type === 'application/msword' || 
          f.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
        
        if (documentFiles.length > 0) {
          documentFiles.forEach(file => handleFileSelection(file, 'document'));
        } else {
          toast.error('Please drop PDF, TXT, DOC, or DOCX files');
        }
      }
    }
  }, []);

  // Audio playback handlers
  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleAudioLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  // Upload handler
  const handleUpload = async () => {
    if (activeTab === 'audio' && !audioFile) {
      toast.error('Please select an audio file');
      return;
    }
    
    if (activeTab === 'link' && !linkUrl.trim()) {
      toast.error('Please enter a URL');
      return;
    }
    
    if (activeTab === 'documents' && documentFiles.length === 0) {
      toast.error('Please select at least one document');
      return;
    }
    
    if (!lectureTitle.trim()) {
      toast.error('Please enter a lecture title');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ status: 'uploading', progress: 0 });

    try {
      // Step 1: Upload files and extract content
      setUploadProgress({ status: 'uploading', progress: 25 });
      
      const formData = new FormData();
      formData.append('lectureTitle', lectureTitle);
      formData.append('studyNodeId', selectedFolder);
      formData.append('uploadType', activeTab);
      formData.append('processingMode', processingMode);

      if (activeTab === 'audio' && audioFile) {
        formData.append('audio', audioFile.file);
        // Add supplementary documents if any
        documentFiles.forEach((doc, index) => {
          formData.append(`document_${index}`, doc.file);
        });
      } else if (activeTab === 'link') {
        formData.append('linkUrl', linkUrl);
        formData.append('linkType', linkType);
      } else if (activeTab === 'documents') {
        documentFiles.forEach((doc, index) => {
          formData.append(`document_${index}`, doc.file);
        });
      }

      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('❌ Upload API returned error:', errorText);
        throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
      }

      const uploadData = await uploadResponse.json();

      // Show success message and close dialog immediately after upload
      toast.success('Upload successful! Processing started in the background.');
      
      // Close dialog right after upload succeeds
      onOpenChange(false);
      
      // If user is not on lectures page, redirect there
      if (!window.location.pathname.includes('/dashboard/lectures')) {
        router.push('/dashboard/lectures');
      } else {
        // If already on lectures page, just refresh the data
        router.refresh();
      }

      setUploadProgress({ status: 'processing', progress: 50 });

      // Step 2: Generate notes from uploaded content (continues in background)
      // Note: Processing continues even after dialog closes
      const generatePayload: any = {
        lectureTitle,
        studyNodeId: selectedFolder || undefined,
        processingMode: processingMode || 'enhance',
        uploadType: activeTab,
      };

      // Add type-specific data - Access nested data from createSuccessResponse wrapper
      const responseData = uploadData.data || uploadData; // Handle both wrapped and unwrapped responses
      
      if (activeTab === 'audio') {
        if (!responseData.audioPath) {
          console.error('Upload response missing audioPath:', uploadData);
          throw new Error(`Audio upload failed - no audio file path received. Upload response: ${JSON.stringify({
            success: responseData.success,
            message: responseData.message,
            audioPath: responseData.audioPath
          })}`);
        }
        generatePayload.audioFilePath = responseData.audioPath;
        if (responseData.pdfPath) {
          generatePayload.pdfFilePath = responseData.pdfPath;
        }
        if (responseData.documentPaths) {
          generatePayload.documentPaths = responseData.documentPaths;
        }
      } else if (activeTab === 'link') {
        generatePayload.linkData = responseData.linkData;
      } else if (activeTab === 'documents') {
        generatePayload.documentPaths = responseData.documentPaths;
      }

      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generatePayload)
      });

      const generateData = await generateResponse.json();

      if (!generateResponse.ok) {
        // If processing fails after dialog is closed, show error toast
        toast.error(`Processing failed: ${generateData.error || generateData.data?.error || 'Unknown error'}`);
        return;
      }

      // Processing completed successfully
      const generateResponseData = generateData.data || generateData;
      console.log('✅ Generate API completed successfully:', {
        jobId: generateResponseData.jobId,
        status: generateResponseData.status
      });
      
      // Show success message
      toast.success('Study guide generated successfully!', {
        description: `Processing completed in ${generateResponseData.transcriptionTime || 'a few'} seconds`
      });
      
    } catch (error) {
      console.error('Upload error:', error);
      
      // Handle OAuth authentication required
      if (error instanceof Error) {
        // Check if this is a YouTube authentication error
        if (error.message.includes('YouTube authentication required') || 
            error.message.includes('authentication required for caption access')) {
          // Show OAuth authentication dialog
          toast.error('YouTube Authentication Required', {
            description: '🔐 Connect your YouTube account to access video captions and transcripts.',
            duration: 8000,
            action: {
              label: "Connect YouTube",
              onClick: () => {
                window.location.href = '/api/auth/youtube';
              }
            }
          });
          setIsUploading(false);
          return;
        }
        
        // Try to parse 401 error response for OAuth info
        if (error.message.includes('401')) {
          try {
            const errorData = JSON.parse(error.message);
            if (errorData.requiresAuth && errorData.authUrl) {
              toast.error('YouTube Authentication Required', {
                description: '🔐 Connect your YouTube account to access video captions and transcripts.',
                duration: 8000,
                action: {
                  label: "Connect YouTube",
                  onClick: () => {
                    window.location.href = errorData.authUrl;
                  }
                }
              });
              setIsUploading(false);
              return;
            }
          } catch {
            // Not a JSON error, continue with normal handling
          }
        }
      }
      
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      
      // Show comprehensive help for YouTube issues
      if (errorMessage.includes('YouTube') || errorMessage.includes('transcript') || errorMessage.includes('captions')) {
        // Show the first line as title, rest as description
        const lines = errorMessage.split('\n');
        const title = lines[0] || errorMessage;
        const description = lines.slice(2).join('\n') || "💡 Try the Audio tab - download the video and upload the audio file directly";
        
        toast.error(title, {
          description,
          duration: 10000 // Longer duration for comprehensive help
        });
      } else if (errorMessage.includes('private') || errorMessage.includes('restricted')) {
        toast.error(errorMessage, {
          description: "Try a public video or download the audio and use the Audio tab",
          duration: 6000
        });
      } else {
        toast.error(errorMessage);
      }
      
      setUploadProgress({ 
        status: 'error', 
        progress: 0, 
        message: errorMessage
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 mx-auto my-4 w-full max-w-[calc(100vw-2rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>Upload Lecture Content</DialogTitle>
          <DialogDescription>
            Upload audio, links, or documents for lecture processing
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audio" className="flex items-center gap-2 px-2 sm:px-4">
              <FileAudio className="w-4 h-4" />
              <span className="hidden sm:inline">Audio</span>
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2 px-2 sm:px-4">
              <Link className="w-4 h-4" />
              <span className="hidden sm:inline">Link</span>
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2 px-2 sm:px-4">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Documents</span>
            </TabsTrigger>
          </TabsList>

          {/* Audio Upload Tab */}
          <TabsContent value="audio" className="space-y-2 sm:space-y-3">
            <Card>
              <CardContent className="p-3 sm:p-4">
                {!audioFile?.preview ? (
                  // Upload area when no file is selected
                  <div
                    className={cn(
                      "border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors",
                      dragActive 
                        ? "border-blue-500 bg-accent/30/20" 
                        : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                    )}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={(e) => handleDrop(e, 'audio')}
                  >
                    <FileAudio className={cn(
                      "mx-auto h-10 w-10 mb-3",
                      dragActive ? "text-blue-500" : "text-muted-foreground"
                    )} />
                    <h3 className="text-base font-medium text-foreground mb-2">
                      {dragActive ? "Drop your audio file here" : "Upload audio recording"}
                    </h3>
                    <p className="text-muted-foreground mb-3">
                      Drag and drop your audio file, or click to browse
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => audioInputRef.current?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="w-4 h-4 sm:mr-2" />
                      <span className="hidden sm:inline">Select Audio File</span>
                    </Button>
                    
                    <input
                      ref={audioInputRef}
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/mp4,audio/m4a,audio/x-m4a,audio/aac,.mp3,.wav,.mp4,.m4a"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelection(file, 'audio');
                      }}
                    />
                  </div>
                ) : (
                  // Audio preview when file is selected
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Selected Audio:</h4>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAudioFile({ file: null, preview: null })}
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-3 mb-2">
                        <FileAudio className="w-5 h-5 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{audioFile.file?.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {audioFile.file && `${(audioFile.file.size / 1024 / 1024).toFixed(2)} MB • audio/mpeg`}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={toggleAudioPlayback}
                          disabled={isUploading}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            <span>{formatTime(currentTime)}</span>
                            <div className="flex-1 bg-gray-200 rounded-full h-1">
                              <div
                                className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                                style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                              />
                            </div>
                            <span>{formatTime(duration)}</span>
                          </div>
                        </div>
                        <Volume2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <audio
                        ref={audioRef}
                        src={audioFile.preview}
                        onTimeUpdate={handleAudioTimeUpdate}
                        onLoadedMetadata={handleAudioLoadedMetadata}
                        onEnded={() => setIsPlaying(false)}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Link Upload Tab */}
          <TabsContent value="link" className="space-y-3">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors",
                    "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  )}
                >
                  <Globe className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                  <h3 className="text-base font-medium text-foreground mb-2">
                    Add content from URL
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Enter YouTube, podcast, or article URLs
                  </p>
                  
                  <Input
                    id="linkUrl"
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    disabled={isUploading}
                    className="max-w-sm mx-auto"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Upload Tab */}
          <TabsContent value="documents" className="space-y-3">
            <Card>
              <CardContent className="p-3 sm:p-4">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-4 sm:p-6 text-center transition-colors",
                    dragActive 
                      ? "border-blue-500 bg-accent/30/20" 
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, 'document')}
                >
                  <FileText className={cn(
                    "mx-auto h-10 w-10 mb-3",
                    dragActive ? "text-blue-500" : "text-muted-foreground"
                  )} />
                  <h3 className="text-base font-medium text-foreground mb-2">
                    {dragActive ? "Drop your documents here" : "Upload documents"}
                  </h3>
                  <p className="text-muted-foreground mb-3">
                    Upload PDFs, slides, or text documents
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select Documents
                  </Button>
                  
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.txt,.doc,.docx"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      files.forEach(file => handleFileSelection(file, 'document'));
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>


        {documentFiles.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h4 className="font-medium mb-3">Selected Documents:</h4>
              <div className="space-y-2">
                {documentFiles.map((doc, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-red-500" />
                        <div>
                          <p className="font-medium text-sm">{doc.file.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(doc.file.size)} • {doc.file.type}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocumentFile(index)}
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Common Form Fields */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-lg font-medium">Lecture Details</h3>
            
            <div>
              <Label htmlFor="lectureTitle">Lecture Title *</Label>
              <Input
                id="lectureTitle"
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
                placeholder="Type to search existing lectures or create new..."
                disabled={isUploading}
                list="lectures-list"
              />
              <datalist id="lectures-list">
                <option value="Introduction to Machine Learning" />
                <option value="Data Structures and Algorithms" />
                <option value="Web Development Fundamentals" />
                <option value="Database Design Principles" />
                <option value="Software Engineering Best Practices" />
              </datalist>
              <p className="text-xs text-muted-foreground mt-1">
                Start typing to see existing lectures or enter a new title
              </p>
            </div>

            <div>
              <Label htmlFor="selectedFolder">Study Folder</Label>
              <Select value={selectedFolder} onValueChange={setSelectedFolder} disabled={isUploading || foldersLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={
                    foldersLoading 
                      ? "Loading folders..." 
                      : "Select a folder (optional)"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {folders.length === 0 && !foldersLoading ? (
                    <SelectItem value="" disabled>
                      No study folders found - Create one in Lectures page
                    </SelectItem>
                  ) : (
                    folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        <div className="flex items-center gap-2">
                          <span style={{ paddingLeft: `${folder.level * 12}px` }}>
                            {folder.level > 0 && '↳ '}
                            {folder.name}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedFolder && (
                <p className="text-xs text-muted-foreground mt-1">
                  Selected: {folders.find(f => f.id === selectedFolder)?.path || 'Unknown folder'}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploadProgress && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-medium">
                  {uploadProgress.status === 'uploading' && 'Uploading...'}
                  {uploadProgress.status === 'processing' && 'Processing...'}
                  {uploadProgress.status === 'completed' && 'Upload Complete!'}
                  {uploadProgress.status === 'error' && 'Upload Failed'}
                </h3>
                {uploadProgress.status === 'uploading' && (
                  <span className="text-sm text-gray-500">{uploadProgress.progress}%</span>
                )}
              </div>
              
              {uploadProgress.status !== 'error' && (
                <Progress value={uploadProgress.progress} className="h-2" />
              )}
              
              {uploadProgress.status === 'processing' && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {uploadProgress?.status === 'uploading' ? 'Uploading...' : 'Processing...'}
                </div>
              )}
              
              {uploadProgress.status === 'completed' && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="w-4 h-4" />
                  Upload successful! Redirecting...
                </div>
              )}
              
              {uploadProgress.status === 'error' && (
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  {uploadProgress.message || 'An error occurred during upload'}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Upload & Process</span>
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}