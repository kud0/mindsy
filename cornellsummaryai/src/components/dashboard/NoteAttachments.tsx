import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  X,
  Loader2,
  FileIcon,
  Image,
  Paperclip,
  Plus,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size_mb: number;
  attachment_type: string;
  description?: string;
  created_at: string;
  download_url?: string;
}

interface NoteAttachmentsProps {
  noteId: string;
  className?: string;
  onAttachmentAdded?: () => void;
}

const FILE_TYPE_ICONS: Record<string, any> = {
  'application/pdf': FileText,
  'application/vnd.ms-powerpoint': FileText,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': FileText,
  'application/msword': FileText,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': FileText,
  'image/png': Image,
  'image/jpeg': Image,
  'image/webp': Image,
};

const ATTACHMENT_TYPE_COLORS: Record<string, string> = {
  'slides': 'bg-blue-100 text-blue-800',
  'notes': 'bg-green-100 text-green-800',
  'reference': 'bg-purple-100 text-purple-800',
  'supplementary': 'bg-gray-100 text-gray-800',
};

export function NoteAttachments({ noteId, className, onAttachmentAdded }: NoteAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState<string>('supplementary');
  const [description, setDescription] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchAttachments();
  }, [noteId]);

  const fetchAttachments = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/notes/${noteId}/attachments`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch attachments');
      }

      const data = await response.json();
      setAttachments(data.attachments || []);
    } catch (error) {
      console.error('Error fetching attachments:', error);
      toast.error('Failed to load attachments');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (50MB max)
      if (file.size > 50 * 1024 * 1024) {
        toast.error('File size must be less than 50MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', attachmentType);
      if (description) {
        formData.append('description', description);
      }

      const response = await fetch(`/api/notes/${noteId}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const data = await response.json();
      toast.success('Attachment uploaded successfully');
      
      // Reset form
      setSelectedFile(null);
      setDescription('');
      setAttachmentType('supplementary');
      setIsUploadDialogOpen(false);
      
      // Refresh attachments
      await fetchAttachments();
      
      // Notify parent
      onAttachmentAdded?.();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (attachmentId: string) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      setDeletingId(attachmentId);
      const response = await fetch(`/api/notes/${noteId}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }

      toast.success('Attachment deleted');
      await fetchAttachments();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete attachment');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    if (attachment.download_url) {
      window.open(attachment.download_url, '_blank');
    } else {
      toast.error('Download URL not available');
    }
  };

  const getFileIcon = (fileType: string) => {
    const Icon = FILE_TYPE_ICONS[fileType] || Paperclip;
    return Icon;
  };

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(0)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn("w-full", className)}>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">Attachments</CardTitle>
          <Button
            size="sm"
            onClick={() => setIsUploadDialogOpen(true)}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Attachment
          </Button>
        </CardHeader>
        <CardContent>
          {attachments.length === 0 ? (
            <div className="text-center py-8">
              <Paperclip className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 mb-4">No attachments yet</p>
              <Button
                variant="outline"
                onClick={() => setIsUploadDialogOpen(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload First Attachment
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {attachments.map((attachment) => {
                const Icon = getFileIcon(attachment.file_type);
                return (
                  <div
                    key={attachment.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded">
                        <Icon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm truncate">
                            {attachment.file_name}
                          </p>
                          <Badge 
                            variant="secondary" 
                            className={cn(
                              "text-xs",
                              ATTACHMENT_TYPE_COLORS[attachment.attachment_type]
                            )}
                          >
                            {attachment.attachment_type}
                          </Badge>
                        </div>
                        {attachment.description && (
                          <p className="text-xs text-gray-500 truncate mt-1">
                            {attachment.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                          <span>{formatFileSize(attachment.file_size_mb)}</span>
                          <span>•</span>
                          <span>{formatDate(attachment.created_at)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(attachment)}
                        className="h-8 w-8 p-0"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(attachment.id)}
                        disabled={deletingId === attachment.id}
                        className="h-8 w-8 p-0 hover:text-red-600"
                      >
                        {deletingId === attachment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Attachment</DialogTitle>
            <DialogDescription>
              Upload supplementary materials like slides, OneNote files, or reference documents for this note.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.ppt,.pptx,.doc,.docx,.one,.odt,.odp,.png,.jpg,.jpeg,.webp"
                className="mt-1"
              />
              {selectedFile && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {selectedFile.name} ({formatFileSize(selectedFile.size / 1024 / 1024)})
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Attachment Type</Label>
              <Select value={attachmentType} onValueChange={setAttachmentType}>
                <SelectTrigger id="type" className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="slides">Slides</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="reference">Reference</SelectItem>
                  <SelectItem value="supplementary">Supplementary</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a brief description of this attachment..."
                className="mt-1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploadDialogOpen(false)}
              disabled={uploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}