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
  const [processingMode, setProcessingMode] = useState<'enhance' | 'basic'>('enhance');
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [jobCreated, setJobCreated] = useState(false);

  // Audio playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();

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
      setUploadProgress(null);
      setIsUploading(false);
      setDragActive(false);
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setJobCreated(false);
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

      // Auto-generate lecture title from filename if empty
      if (!lectureTitle) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const cleanName = nameWithoutExt.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        setLectureTitle(cleanName);
      }
    } else if (type === 'document') {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit per file
        toast.error('Document files must be less than 50MB each');
        return;
      }

      // Auto-generate lecture title from first document filename if empty
      if (!lectureTitle && documentFiles.length === 0) {
        const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
        const cleanName = nameWithoutExt.replace(/[_-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        setLectureTitle(cleanName);
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
        console.log('📄 Documents tab - preparing upload:', {
          documentCount: documentFiles.length,
          fileNames: documentFiles.map(doc => doc.file.name),
          fileSizes: documentFiles.map(doc => `${(doc.file.size / 1024 / 1024).toFixed(2)}MB`)
        });
        documentFiles.forEach((doc, index) => {
          console.log(`📄 Adding document ${index} to FormData:`, {
            fieldName: `document_${index}`,
            fileName: doc.file.name,
            fileType: doc.file.type,
            fileSize: `${(doc.file.size / 1024 / 1024).toFixed(2)}MB`
          });
          formData.append(`document_${index}`, doc.file);
        });
      }

      console.log('📄 Sending upload request to /api/upload with:', {
        uploadType: activeTab,
        lectureTitle,
        processingMode,
        hasDocuments: activeTab === 'documents' ? documentFiles.length : 0
      });

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

      console.log('📄 Upload API response received:', {
        success: uploadData.success,
        message: uploadData.message,
        hasData: !!uploadData.data,
        dataKeys: uploadData.data ? Object.keys(uploadData.data) : [],
        fullResponse: uploadData
      });

      setUploadProgress({ status: 'processing', progress: 50 });

      // Step 2: Generate notes from uploaded content
      const generatePayload: any = {
        lectureTitle,
        processingMode: processingMode || 'enhance',
        uploadType: activeTab,
      };

      // Add type-specific data - Access nested data from createSuccessResponse wrapper
      const responseData = uploadData.data || uploadData; // Handle both wrapped and unwrapped responses

      console.log('📄 Extracting responseData:', {
        hasUploadDataData: !!uploadData.data,
        responseDataKeys: Object.keys(responseData),
        documentPaths: responseData.documentPaths,
        documentPathsType: typeof responseData.documentPaths,
        documentPathsIsArray: Array.isArray(responseData.documentPaths),
        audioPath: responseData.audioPath,
        pdfPath: responseData.pdfPath
      });

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
        console.log('📄 Documents tab - setting documentPaths in payload:', {
          documentPaths: responseData.documentPaths,
          isNull: responseData.documentPaths === null,
          isUndefined: responseData.documentPaths === undefined,
          isArray: Array.isArray(responseData.documentPaths),
          length: responseData.documentPaths?.length
        });
        generatePayload.documentPaths = responseData.documentPaths;
      }

      console.log('📄 Final generate payload before sending to /api/generate:', {
        uploadType: generatePayload.uploadType,
        hasDocumentPaths: !!generatePayload.documentPaths,
        documentPaths: generatePayload.documentPaths,
        payloadKeys: Object.keys(generatePayload),
        fullPayload: generatePayload
      });

      const generateResponse = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(generatePayload)
      });

      const generateData = await generateResponse.json();

      if (!generateResponse.ok) {
        toast.error(`Processing failed: ${generateData.error || generateData.data?.error || 'Unknown error'}`);
        return;
      }

      // Job created successfully - mark as created for UI feedback
      setJobCreated(true);

      // Show success toast with processing status
      toast.success('Processing lecture in background', {
        description: 'Your lecture will appear in the list shortly',
        duration: 4000
      });

      // Close dialog immediately - job will show up via real-time updates
      onOpenChange(false);

      // Navigate to lectures page if not already there
      if (!window.location.pathname.includes('/dashboard/lectures')) {
        router.push('/dashboard/lectures');
      }

      console.log('✅ Generate API: Job created, processing in background');
      
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
      <DialogContent className="w-[95vw] max-w-2xl h-[85vh] overflow-hidden p-0 flex flex-col bg-white/95 dark:bg-background/90 backdrop-blur-xl dark:backdrop-blur-2xl shadow-xl dark:shadow-2xl dark:shadow-black/50 border border-gray-200/50 dark:border-border">
        <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 p-4 flex-shrink-0 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
          <DialogTitle>Create New Lecture</DialogTitle>
          <DialogDescription>
            Create a new lecture from audio, documents, or links
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)} className="h-full flex flex-col p-4">
            <TabsList className="grid w-full grid-cols-3 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-0.5 rounded-lg flex-shrink-0 mb-3 border border-gray-200/50 dark:border-gray-700/50">
              <TabsTrigger value="audio" className="flex items-center gap-2 px-2 sm:px-4 data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 rounded-md transition-all">
                <FileAudio className="w-4 h-4" />
                <span className="hidden sm:inline">Audio</span>
              </TabsTrigger>
              <TabsTrigger value="link" className="flex items-center gap-2 px-2 sm:px-4 data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 rounded-md transition-all">
                <Link className="w-4 h-4" />
                <span className="hidden sm:inline">Link</span>
              </TabsTrigger>
              <TabsTrigger value="documents" className="flex items-center gap-2 px-2 sm:px-4 data-[state=active]:bg-white/95 dark:data-[state=active]:bg-gray-900/95 rounded-md transition-all">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Documents</span>
              </TabsTrigger>
            </TabsList>

          {/* Audio Upload Tab */}
          <TabsContent value="audio" className="space-y-2 sm:space-y-3 flex-1 overflow-y-auto pr-1">
            <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl">
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
          <TabsContent value="link" className="space-y-3 flex-1 overflow-y-auto pr-1">
            <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl">
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
          <TabsContent value="documents" className="space-y-3 flex-1 overflow-y-auto pr-1">
            <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl">
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
        </div>

        {documentFiles.length > 0 && (
          <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl mx-4">
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
        <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl mx-4">
          <CardContent className="p-4 space-y-3">
            <h3 className="text-lg font-medium">Lecture Details</h3>
            
            <div>
              <Label htmlFor="lectureTitle">Lecture Title *</Label>
              <Input
                id="lectureTitle"
                value={lectureTitle}
                onChange={(e) => setLectureTitle(e.target.value)}
                placeholder="Enter lecture title..."
                disabled={isUploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter a title for your new lecture
              </p>
            </div>

            {/* Note: Folder assignment has been moved to the course folder system.
                Users can organize lectures within courses after upload. */}
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploadProgress && (
          <Card className="border border-gray-200/50 dark:border-gray-700/50 bg-white/5 dark:bg-gray-900/5 backdrop-blur-xl mx-4">
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
        <div className="border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-4 flex-shrink-0">
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
        </div>
      </DialogContent>
    </Dialog>
  );
}