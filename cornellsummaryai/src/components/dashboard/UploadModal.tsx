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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Upload, 
  FileAudio, 
  X, 
  CheckCircle, 
  AlertCircle,
  Loader2 
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Folder {
  id: string;
  name: string;
  count: number;
  type?: string;
}

interface UploadModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (audioFile: File, title?: string, duration?: number, studyNodeId?: string) => Promise<void>;
  folders?: Folder[];
}

export function UploadModal({ open, onOpenChange, onUpload, folders = [] }: UploadModalProps) {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [selectedStudyNode, setSelectedStudyNode] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const calculateAudioDuration = useCallback(async (file: File) => {
    try {
      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      
      return new Promise<number>((resolve) => {
        audio.addEventListener('loadedmetadata', () => {
          const durationInSeconds = audio.duration;
          const durationInMinutes = Math.round(durationInSeconds / 60);
          URL.revokeObjectURL(url);
          resolve(durationInMinutes);
        });
        
        audio.addEventListener('error', () => {
          URL.revokeObjectURL(url);
          resolve(0);
        });
      });
    } catch (error) {
      console.error('Error calculating audio duration:', error);
      return 0;
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const files = Array.from(e.dataTransfer.files);
    for (const file of files) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
        const duration = await calculateAudioDuration(file);
        setAudioDuration(duration);
      }
    }
  }, [calculateAudioDuration]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
      const duration = await calculateAudioDuration(file);
      setAudioDuration(duration);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!audioFile) {
      setError('Please select an audio file');
      return;
    }

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Quick upload progress (actual file upload is fast)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 30, 90));
      }, 50);

      await onUpload(audioFile, title || undefined, audioDuration || undefined, selectedStudyNode || undefined);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Small delay to show 100% before closing
      setTimeout(() => {
        onOpenChange(false);
        // Reset form
        setAudioFile(null);
        setTitle('');
        setSelectedStudyNode('');
        setUploadProgress(0);
        setAudioDuration(null);
      }, 200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload Audio for Transcription</DialogTitle>
            <DialogDescription>
              Upload an audio file to generate Mindsy Notes from your lectures.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Title Input */}
            <div className="grid gap-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                placeholder="e.g., Lecture 1 - Introduction to Physics"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={uploading}
              />
            </div>

            {/* Study Node Selection */}
            {folders.length > 0 && (
              <div className="grid gap-2">
                <Label htmlFor="study-node">Save to (Optional)</Label>
                <Select value={selectedStudyNode} onValueChange={setSelectedStudyNode} disabled={uploading}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a study location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No folder (Unfiled)</SelectItem>
                    {folders.map((folder) => (
                      <SelectItem key={folder.id} value={folder.id}>
                        {folder.name} ({folder.count || 0} notes)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Audio File Upload */}
            <div className="grid gap-2">
              <Label htmlFor="audio">Audio File (Required)</Label>
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
                  dragActive ? "border-primary bg-primary/5" : "border-border",
                  audioFile && "border-green-500 bg-green-50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                {audioFile ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileAudio className="h-8 w-8 text-green-500" />
                      <div className="text-left">
                        <p className="text-sm font-medium">{audioFile.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {audioDuration ? `${audioDuration} minutes` : 'Calculating duration...'} • {formatFileSize(audioFile.size)}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setAudioFile(null);
                        setAudioDuration(null);
                      }}
                      disabled={uploading}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div>
                    <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      Drag and drop or click to select audio file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      MP3, WAV, M4A up to 100MB
                    </p>
                    <Input
                      id="audio"
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={uploading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => document.getElementById('audio')?.click()}
                      disabled={uploading}
                    >
                      Select File
                    </Button>
                  </div>
                )}
              </div>
            </div>


            {/* Upload Progress */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading file...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!audioFile || uploading}>
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}