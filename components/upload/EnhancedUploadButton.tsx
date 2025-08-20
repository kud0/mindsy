"use client";

import React, { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
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
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  Volume2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UploadedFile {
  file: File;
  preview?: string;
  type: 'audio' | 'pdf';
}

interface UploadProgress {
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  jobId?: string;
  message?: string;
}

export default function EnhancedUploadButton() {
  const router = useRouter();
  const audioInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  
  // Form state
  const [lectureTitle, setLectureTitle] = useState('');
  const [courseSubject, setCourseSubject] = useState('');
  const [studyNodeId, setStudyNodeId] = useState<string>('');
  const [processingMode, setProcessingMode] = useState('enhance');
  
  // File state
  const [audioFile, setAudioFile] = useState<UploadedFile | null>(null);
  const [pdfFile, setPdfFile] = useState<UploadedFile | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Upload state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Audio preview state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  // File validation
  const validateFile = (file: File, type: 'audio' | 'pdf'): boolean => {
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
    } else if (type === 'pdf') {
      const maxSize = 50 * 1024 * 1024; // 50MB
      
      if (file.type !== 'application/pdf') {
        toast.error('Invalid PDF file type');
        return false;
      }
      
      if (file.size > maxSize) {
        toast.error('PDF file too large (max 50MB)');
        return false;
      }
    }
    
    return true;
  };

  // Handle file selection
  const handleFileSelection = (file: File, type: 'audio' | 'pdf') => {
    if (!validateFile(file, type)) return;

    const uploadedFile: UploadedFile = {
      file,
      type,
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
      setPdfFile(uploadedFile);
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    
    files.forEach(file => {
      if (file.type.startsWith('audio/')) {
        handleFileSelection(file, 'audio');
      } else if (file.type === 'application/pdf') {
        handleFileSelection(file, 'pdf');
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
  const removeFile = (type: 'audio' | 'pdf') => {
    if (type === 'audio') {
      if (audioFile?.preview) {
        URL.revokeObjectURL(audioFile.preview);
      }
      setAudioFile(null);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    } else {
      setPdfFile(null);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!audioFile || !lectureTitle.trim()) {
      toast.error('Please provide an audio file and lecture title');
      return;
    }

    setIsUploading(true);
    setUploadProgress({ progress: 0, status: 'uploading', message: 'Uploading files...' });

    try {
      const formData = new FormData();
      formData.append('audio', audioFile.file);
      if (pdfFile) {
        formData.append('pdf', pdfFile.file);
      }
      formData.append('lectureTitle', lectureTitle.trim());
      if (courseSubject.trim()) {
        formData.append('courseSubject', courseSubject.trim());
      }
      if (studyNodeId) {
        formData.append('studyNodeId', studyNodeId);
      }
      formData.append('processingMode', processingMode);

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
        
        // Reset form after successful upload
        setTimeout(() => {
          setAudioFile(null);
          setPdfFile(null);
          setLectureTitle('');
          setCourseSubject('');
          setStudyNodeId('');
          setProcessingMode('enhance');
          setUploadProgress(null);
          setIsUploading(false);
          
          // Navigate to lectures page to see the new upload
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

  // Get file size in human readable format
  const formatFileSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${Math.round(bytes / Math.pow(1024, i) * 10) / 10} ${sizes[i]}`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
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
            onDrop={handleDrop}
          >
            <Upload className={cn(
              "mx-auto h-12 w-12 mb-4",
              dragActive ? "text-blue-500" : "text-gray-400"
            )} />
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              {dragActive ? "Drop your files here" : "Upload your lecture files"}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Drag and drop your audio and PDF files, or click to browse
            </p>
            <div className="flex gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => audioInputRef.current?.click()}
                disabled={isUploading}
              >
                <FileAudio className="w-4 h-4 mr-2" />
                Select Audio
              </Button>
              <Button
                variant="outline"
                onClick={() => pdfInputRef.current?.click()}
                disabled={isUploading}
              >
                <FileText className="w-4 h-4 mr-2" />
                Select PDF (Optional)
              </Button>
            </div>
            
            {/* Hidden file inputs */}
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
            <input
              ref={pdfInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileSelection(file, 'pdf');
              }}
            />
          </div>
          
          <div className="mt-4 text-sm text-gray-500">
            <p>• Audio: MP3, WAV, MP4, M4A (max 100MB)</p>
            <p>• PDF: Optional supplementary materials (max 50MB)</p>
          </div>
        </CardContent>
      </Card>

      {/* Selected Files Preview */}
      {(audioFile || pdfFile) && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">Selected Files</h3>
            
            {/* Audio File Preview */}
            {audioFile && (
              <div className="border rounded-lg p-4 mb-4">
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
                    onClick={() => removeFile('audio')}
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
            
            {/* PDF File Preview */}
            {pdfFile && (
              <div className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-red-500" />
                    <div>
                      <p className="font-medium">{pdfFile.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {formatFileSize(pdfFile.file.size)} • PDF Document
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile('pdf')}
                    disabled={isUploading}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lecture Details Form */}
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
      <Card>
        <CardContent className="p-6">
          <Button
            onClick={handleUpload}
            disabled={!audioFile || !lectureTitle.trim() || isUploading}
            className="w-full"
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
                Upload & Process Lecture
              </>
            )}
          </Button>
          
          {audioFile && (
            <p className="text-center text-sm text-gray-500 mt-2">
              This will upload {audioFile.file.name}
              {pdfFile && ` and ${pdfFile.file.name}`} for processing
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}