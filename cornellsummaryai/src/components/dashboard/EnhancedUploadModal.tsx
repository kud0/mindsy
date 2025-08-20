import React, { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Upload, 
  Link, 
  FileText, 
  FileAudio,
  Loader2,
  CheckCircle,
  AlertCircle,
  Youtube,
  FileType,
  Globe,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface EnhancedUploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadSuccess: (jobId: string, fileName: string, type: 'audio' | 'document' | 'link') => Promise<void>;
  selectedFolderId?: string | null;
}

type TabValue = 'audio' | 'link' | 'document';

export function EnhancedUploadModal({ 
  open, 
  onOpenChange, 
  onUploadSuccess, 
  selectedFolderId 
}: EnhancedUploadModalProps) {
  const [activeTab, setActiveTab] = useState<TabValue>('audio');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Audio tab state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioDragActive, setAudioDragActive] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);
  
  // Link tab state
  const [linkUrl, setLinkUrl] = useState('');
  const [linkType, setLinkType] = useState<'article' | 'youtube' | 'pdf' | null>(null);
  const [linkPreview, setLinkPreview] = useState<{
    title: string;
    description: string;
    type: string;
  } | null>(null);
  const [fetchingPreview, setFetchingPreview] = useState(false);
  
  // Document tab state
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [documentDragActive, setDocumentDragActive] = useState(false);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Detect link type
  const detectLinkType = (url: string): 'youtube' | 'pdf' | 'article' | null => {
    if (!url) return null;
    
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)/;
    const pdfRegex = /\.pdf$/i;
    
    if (youtubeRegex.test(url)) return 'youtube';
    if (pdfRegex.test(url)) return 'pdf';
    if (url.startsWith('http://') || url.startsWith('https://')) return 'article';
    
    return null;
  };

  // Handle URL change
  const handleUrlChange = async (url: string) => {
    setLinkUrl(url);
    const type = detectLinkType(url);
    setLinkType(type);
    
    // Reset preview when URL changes
    setLinkPreview(null);
    
    // Fetch preview for valid URLs
    if (type && url.length > 10) {
      setFetchingPreview(true);
      try {
        const response = await fetch('/api/link-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
          credentials: 'include'
        });
        
        if (response.ok) {
          const preview = await response.json();
          setLinkPreview(preview);
        } else {
          console.warn('Preview fetch failed:', response.status);
        }
      } catch (error) {
        console.error('Failed to fetch preview:', error);
        // Don't show error to user for preview failures
      } finally {
        setFetchingPreview(false);
      }
    }
  };

  // Handle audio file selection
  const handleAudioFile = (file: File) => {
    const audioTypes = ['audio/', 'video/'];
    const audioExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.mp4', '.mov', '.avi', '.mkv'];
    
    const isAudio = audioTypes.some(type => file.type.startsWith(type)) ||
                    audioExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isAudio) {
      toast.error('Please select an audio or video file');
      return;
    }
    
    setAudioFile(file);
  };

  // Handle document file selection
  const handleDocumentFile = (file: File) => {
    const docTypes = ['application/pdf', 'text/', 'application/msword', 'application/vnd.openxmlformats-officedocument'];
    const docExtensions = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt'];
    
    const isDocument = docTypes.some(type => file.type.startsWith(type)) ||
                       docExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isDocument) {
      toast.error('Please select a document file (PDF, Word, or text)');
      return;
    }
    
    setDocumentFile(file);
  };

  // Process audio upload
  const processAudioUpload = async () => {
    if (!audioFile) return;
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('title', audioFile.name);
      if (selectedFolderId) {
        formData.append('studyNodeId', selectedFolderId);
      }
      
      const response = await fetch('/api/generate', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      await onUploadSuccess(data.jobId, audioFile.name, 'audio');
      
      toast.success('Audio uploaded successfully!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Audio upload error:', error);
      toast.error('Failed to upload audio');
    } finally {
      setIsProcessing(false);
    }
  };

  // Process link
  const processLink = async () => {
    if (!linkUrl || !linkType) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/process-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: linkUrl,
          type: linkType,
          studyNodeId: selectedFolderId
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }
      
      const data = await response.json();
      await onUploadSuccess(data.jobId, linkPreview?.title || linkUrl, 'link');
      
      toast.success('Link processed successfully!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Link processing error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to process link';
      toast.error(errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  // Process document upload
  const processDocumentUpload = async () => {
    if (!documentFile) return;
    
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('document', documentFile);
      formData.append('fileName', documentFile.name);
      if (selectedFolderId) {
        formData.append('studyNodeId', selectedFolderId);
      }
      
      const response = await fetch('/api/process-document', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const data = await response.json();
      await onUploadSuccess(data.jobId, documentFile.name, 'document');
      
      toast.success('Document uploaded successfully!');
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Document upload error:', error);
      toast.error('Failed to upload document');
    } finally {
      setIsProcessing(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setAudioFile(null);
    setLinkUrl('');
    setLinkType(null);
    setLinkPreview(null);
    setDocumentFile(null);
  };

  // Handle drag events for audio
  const handleAudioDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setAudioDragActive(true);
    } else if (e.type === 'dragleave') {
      setAudioDragActive(false);
    }
  }, []);

  const handleAudioDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setAudioDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleAudioFile(files[0]);
    }
  }, []);

  // Handle drag events for documents
  const handleDocumentDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDocumentDragActive(true);
    } else if (e.type === 'dragleave') {
      setDocumentDragActive(false);
    }
  }, []);

  const handleDocumentDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDocumentDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleDocumentFile(files[0]);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create Cornell Notes</DialogTitle>
          <DialogDescription>
            Upload audio, paste a link, or upload a document to generate Cornell-style notes
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="audio">
              <FileAudio className="w-4 h-4 mr-2" />
              Audio
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link className="w-4 h-4 mr-2" />
              Link
            </TabsTrigger>
            <TabsTrigger value="document">
              <FileText className="w-4 h-4 mr-2" />
              Document
            </TabsTrigger>
          </TabsList>

          {/* Audio Tab */}
          <TabsContent value="audio" className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                audioDragActive ? "border-primary bg-primary/5" : "border-gray-300",
                audioFile && "border-green-500 bg-green-50"
              )}
              onDragEnter={handleAudioDrag}
              onDragLeave={handleAudioDrag}
              onDragOver={handleAudioDrag}
              onDrop={handleAudioDrop}
            >
              {audioFile ? (
                <div className="space-y-2">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                  <p className="font-medium">{audioFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(audioFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAudioFile(null)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-gray-600">
                    Drag and drop your audio/video file here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports MP3, WAV, M4A, MP4, and more
                  </p>
                  <input
                    ref={audioInputRef}
                    type="file"
                    className="hidden"
                    accept="audio/*,video/*"
                    onChange={(e) => e.target.files && handleAudioFile(e.target.files[0])}
                  />
                  <Button
                    variant="outline"
                    onClick={() => audioInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!audioFile || isProcessing}
              onClick={processAudioUpload}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Generate Notes from Audio'
              )}
            </Button>
          </TabsContent>

          {/* Link Tab */}
          <TabsContent value="link" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">Enter URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://www.youtube.com/watch?v=... or any article URL"
                value={linkUrl}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
              {linkType && (
                <div className="flex gap-2 mt-2">
                  {linkType === 'youtube' && (
                    <Badge variant="secondary">
                      <Youtube className="w-3 h-3 mr-1" />
                      YouTube Video
                    </Badge>
                  )}
                  {linkType === 'pdf' && (
                    <Badge variant="secondary">
                      <FileType className="w-3 h-3 mr-1" />
                      PDF Document
                    </Badge>
                  )}
                  {linkType === 'article' && (
                    <Badge variant="secondary">
                      <Globe className="w-3 h-3 mr-1" />
                      Web Article
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {fetchingPreview && (
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Fetching preview...</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {linkPreview && !fetchingPreview && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{linkPreview.title}</CardTitle>
                  <CardDescription>{linkPreview.description}</CardDescription>
                </CardHeader>
              </Card>
            )}

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Supports YouTube videos, PDF links, news articles, blog posts, and academic papers
              </AlertDescription>
            </Alert>

            <Button
              className="w-full"
              disabled={!linkUrl || !linkType || isProcessing}
              onClick={processLink}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Generate Notes from Link'
              )}
            </Button>
          </TabsContent>

          {/* Document Tab */}
          <TabsContent value="document" className="space-y-4">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                documentDragActive ? "border-primary bg-primary/5" : "border-gray-300",
                documentFile && "border-green-500 bg-green-50"
              )}
              onDragEnter={handleDocumentDrag}
              onDragLeave={handleDocumentDrag}
              onDragOver={handleDocumentDrag}
              onDrop={handleDocumentDrop}
            >
              {documentFile ? (
                <div className="space-y-2">
                  <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
                  <p className="font-medium">{documentFile.name}</p>
                  <p className="text-sm text-gray-500">
                    {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDocumentFile(null)}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <FileText className="w-12 h-12 mx-auto text-gray-400" />
                  <p className="text-gray-600">
                    Drag and drop your document here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports PDF, Word, and text files
                  </p>
                  <input
                    ref={documentInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.txt,.rtf,.odt"
                    onChange={(e) => e.target.files && handleDocumentFile(e.target.files[0])}
                  />
                  <Button
                    variant="outline"
                    onClick={() => documentInputRef.current?.click()}
                  >
                    Choose File
                  </Button>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              disabled={!documentFile || isProcessing}
              onClick={processDocumentUpload}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Generate Notes from Document'
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}