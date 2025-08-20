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

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'audio' | 'link' | 'documents';
}

interface UploadedFile {
  file: File;
  preview?: string;
  type: 'audio' | 'pdf' | 'document';
}

interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  jobId?: string;
  message?: string;
}

export default function UploadDialog({ open, onOpenChange, defaultTab = 'audio' }: UploadDialogProps) {
  const router = useRouter();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  
  // Common form state
  const [lectureTitle, setLectureTitle] = useState('');
  const [courseSubject, setCourseSubject] = useState('');
  const [studyNodeId, setStudyNodeId] = useState<string>('');
  const [processingMode, setProcessingMode] = useState('enhance');
  
  // Tab-specific state
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [audioFile, setAudioFile] = useState<UploadedFile | null>(null);
  const [documentFiles, setDocumentFiles] = useState<UploadedFile[]>([]);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<'youtube' | 'url' | 'podcast'>('youtube');
  
  // Upload state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Audio preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // File validation
  const validateFile = (file: File, type: 'audio' | 'document'): boolean => {
    if (type === 'audio') {
      const audioMimeTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/mp4', 'audio/m4a'];
      const maxSize = 100 * 1024 * 1024; // 100MB
      
      if (!audioMimeTypes.includes(file.type)) {
        toast.error('Invalid audio file type. Supported: MP3, WAV, MP4, M4A');
        return false;
      }
      
      if (file.size > maxSize) {
        toast.error('Audio file too large (max 100MB)');
        return false;
      }
    } else if (type === 'document') {
      const documentMimeTypes = ['application/pdf', 'text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const maxSize = 50 * 1024 * 1024; // 50MB
      
      if (!documentMimeTypes.includes(file.type)) {
        toast.error('Invalid document type. Supported: PDF, TXT, DOC, DOCX');
        return false;
      }
      
      if (file.size > maxSize) {
        toast.error('Document file too large (max 50MB)');
        return false;
      }
    }
    
    return true;
  };

  // Handle file selection
  const handleFileSelection = (file: File, type: 'audio' | 'document') => {
    if (!validateFile(file, type)) return;

    const uploadedFile: UploadedFile = {
      file,
      type: type === 'audio' ? 'audio' : file.type === 'application/pdf' ? 'pdf' : 'document',
      preview: type === 'audio' ? URL.createObjectURL(file) : undefined
    };

    if (type === 'audio') {
      setAudioFile(uploadedFile);
      // Auto-generate lecture title from filename if empty
      if (!lectureTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const cleanName = nameWithoutExt.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        setLectureTitle(cleanName);
      }
    } else {
      setDocumentFiles(prev => [...prev, uploadedFile]);
    }
  };

  // Drag and drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetType: 'audio' | 'document') => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    
    files.forEach(file => {
      if (targetType === 'audio' && file.type.startsWith('audio/')) {
        handleFileSelection(file, 'audio');
      } else if (targetType === 'document' && (
        file.type === 'application/pdf' ||
        file.type === 'text/plain' ||
        file.type.includes('document')
      )) {
        handleFileSelection(file, 'document');
      }
    });
  }, []);

  // Audio preview controls
  const toggleAudioPlayback = () => {
    if (!audioRef.current || !audioFile) return;

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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Remove file
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

  // Validate URL
  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  };

  // Handle upload based on active tab
  const handleUpload = async () => {
    if (!lectureTitle.trim()) {
      toast.error('Please provide a lecture title');
      return;
    }

    // Validate based on active tab
    if (activeTab === 'audio' && !audioFile) {
      toast.error('Please select an audio file');
      return;
    }

    if (activeTab === 'link' && !linkUrl.trim()) {
      toast.error('Please provide a URL');
      return;
    }

    if (activeTab === 'link' && !validateUrl(linkUrl)) {
      toast.error('Please provide a valid URL');
      return;
    }

    if (activeTab === 'documents' && documentFiles.length === 0) {
      toast.error('Please select at least one document');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ progress: 0, status: 'uploading', message: 'Preparing upload...' });

    try {
      const formData = new FormData();
      
      // Common fields
      formData.append('lectureTitle', lectureTitle.trim());
      if (courseSubject.trim()) {
        formData.append('courseSubject', courseSubject.trim());
      }
      if (studyNodeId) {
        formData.append('studyNodeId', studyNodeId);
      }
      formData.append('processingMode', processingMode);
      formData.append('uploadType', activeTab);

      // Tab-specific data
      if (activeTab === 'audio' && audioFile) {
        formData.append('audio', audioFile.file);
        // Add browser-calculated audio duration in minutes
        if (duration && duration > 0) {
          formData.append('clientDurationMinutes', Math.ceil(duration / 60).toString());
        }
      } else if (activeTab === 'link') {
        formData.append('linkUrl', linkUrl.trim());
        formData.append('linkType', linkType);
      } else if (activeTab === 'documents') {
        documentFiles.forEach((doc, index) => {
          formData.append(`document_${index}`, doc.file);
        });
      }

      setUploadProgress({ progress: 50, status: 'uploading', message: 'Processing files...' });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (response.ok) {
        setUploadProgress({
          progress: 100,
          status: 'completed',
          jobId: result.data.jobId,
          message: 'Upload completed successfully!'
        });
        
        toast.success('Upload completed! Processing has started.');
        
        // Reset form and close dialog after success
        setTimeout(() => {
          resetForm();
          onOpenChange(false);
          router.push('/dashboard/lectures');
        }, 2000);
        
      } else {
        throw new Error(result.error || 'Upload failed');
      }

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({
        progress: 0,
        status: 'error',
        message: error instanceof Error ? error.message : 'Upload failed'
      });
      toast.error('Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setLectureTitle('');
    setCourseSubject('');
    setStudyNodeId('');
    setProcessingMode('enhance');
    setAudioFile(null);
    setDocumentFiles([]);
    setLinkUrl('');
    setLinkType('youtube');
    setUploadProgress(null);
    setIsUploading(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  // Get file size in human readable format
  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 10) / 10} ${sizes[i]}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Lecture Content</DialogTitle>
          <DialogDescription>
            Choose how you&apos;d like to add content - upload audio files, provide links, or upload documents
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audio" className="flex items-center gap-2">
              <FileAudio className="w-4 h-4" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="link" className="flex items-center gap-2">
              <Link className="w-4 h-4" />
              Link
            </TabsTrigger>
            <TabsTrigger value="documents" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Documents
            </TabsTrigger>
          </TabsList>

          {/* Audio Upload Tab */}
          <TabsContent value="audio" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragActive 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, 'audio')}
                >
                  <FileAudio className={cn(
                    "mx-auto h-12 w-12 mb-4",
                    dragActive ? "text-blue-500" : "text-gray-400"
                  )} />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {dragActive ? "Drop your audio file here" : "Upload audio recording"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Drag and drop your audio file, or click to browse
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Select Audio File
                  </Button>
                  
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelection(file, 'audio');
                    }}
                  />
                </div>
                
                <div className="mt-4 text-sm text-gray-500">
                  <p>Supported formats: MP3, WAV, MP4, M4A (max 100MB)</p>
                </div>

                {/* Audio File Preview */}
                {audioFile && (
                  <div className="mt-4 border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <FileAudio className="w-8 h-8 text-blue-500" />
                        <div>
                          <p className="font-medium">{audioFile.file.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(audioFile.file.size)} • {audioFile.file.type}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={removeAudioFile}
                        disabled={isUploading}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    
                    {/* Audio Player */}
                    {audioFile.preview && (
                      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
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
                              <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                <div
                                  className="bg-blue-500 h-1 rounded-full transition-all duration-100"
                                  style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                                />
                              </div>
                              <span>{formatTime(duration)}</span>
                            </div>
                          </div>
                          <Volume2 className="w-4 h-4 text-gray-400" />
                        </div>
                        <audio
                          ref={audioRef}
                          src={audioFile.preview}
                          onTimeUpdate={handleAudioTimeUpdate}
                          onLoadedMetadata={handleAudioLoadedMetadata}
                          onEnded={() => setIsPlaying(false)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Link Upload Tab */}
          <TabsContent value="link" className="space-y-4">
            <Card>
              <CardContent className="p-6 space-y-4">
                <div className="text-center">
                  <Globe className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Add content from URL
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Provide a link to YouTube videos, podcasts, or web articles
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="linkType">Content Type</Label>
                    <Select value={linkType} onValueChange={(value: typeof linkType) => setLinkType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="youtube">YouTube Video</SelectItem>
                        <SelectItem value="podcast">Podcast Episode</SelectItem>
                        <SelectItem value="url">Web Article/URL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="linkUrl">URL</Label>
                    <Input
                      id="linkUrl"
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=..."
                      disabled={isUploading}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Documents Upload Tab */}
          <TabsContent value="documents" className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <div
                  className={cn(
                    "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                    dragActive 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" 
                      : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
                  )}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={(e) => handleDrop(e, 'document')}
                >
                  <FileText className={cn(
                    "mx-auto h-12 w-12 mb-4",
                    dragActive ? "text-blue-500" : "text-gray-400"
                  )} />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    {dragActive ? "Drop your documents here" : "Upload documents"}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Upload PDFs, slides, or text documents to supplement your lecture
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
                
                <div className="mt-4 text-sm text-gray-500">
                  <p>Supported formats: PDF, TXT, DOC, DOCX (max 50MB each)</p>
                </div>

                {/* Document Files Preview */}
                {documentFiles.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <h4 className="font-medium">Selected Documents:</h4>
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
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Common Form Fields */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <h3 className="text-lg font-medium">Lecture Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="lectureTitle">Lecture Title *</Label>
                <Input
                  id="lectureTitle"
                  value={lectureTitle}
                  onChange={(e) => setLectureTitle(e.target.value)}
                  placeholder="e.g., Introduction to React Hooks"
                  disabled={isUploading}
                />
              </div>
              
              <div>
                <Label htmlFor="courseSubject">Course/Subject</Label>
                <Input
                  id="courseSubject"
                  value={courseSubject}
                  onChange={(e) => setCourseSubject(e.target.value)}
                  placeholder="e.g., Computer Science, Biology 101"
                  disabled={isUploading}
                />
              </div>
            </div>
            
            <div>
              <Label htmlFor="processingMode">Processing Mode</Label>
              <Select
                value={processingMode}
                onValueChange={setProcessingMode}
                disabled={isUploading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="enhance">Enhanced Notes (Recommended)</SelectItem>
                  <SelectItem value="basic">Basic Transcription</SelectItem>
                  <SelectItem value="detailed">Detailed Analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploadProgress && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-3">
                {uploadProgress.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                )}
                {uploadProgress.status === 'completed' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {uploadProgress.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}
                <h3 className="font-medium">
                  {uploadProgress.status === 'uploading' && 'Uploading...'}
                  {uploadProgress.status === 'processing' && 'Processing...'}
                  {uploadProgress.status === 'completed' && 'Upload Complete!'}
                  {uploadProgress.status === 'error' && 'Upload Failed'}
                </h3>
              </div>
              
              <Progress value={uploadProgress.progress} className="mb-2" />
              
              {uploadProgress.message && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {uploadProgress.message}
                </p>
              )}
              
              {uploadProgress.jobId && (
                <p className="text-xs text-gray-500 mt-2">
                  Job ID: {uploadProgress.jobId}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload Button */}
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={isUploading || !lectureTitle.trim()}
            size="lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {uploadProgress?.status === 'uploading' ? 'Uploading...' : 'Processing...'}
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload & Process
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}