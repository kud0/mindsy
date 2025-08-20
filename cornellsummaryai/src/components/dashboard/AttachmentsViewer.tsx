import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  FileText,
  Image,
  Presentation,
  Download,
  Trash2,
  Eye,
  Loader2,
  FileIcon,
  Upload,
  Paperclip
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface Attachment {
  id: string;
  file_name: string;
  file_type: string;
  file_size_mb: string;
  attachment_type: string;
  description?: string;
  created_at: string;
  download_url?: string;
}

interface AttachmentsViewerProps {
  noteId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewAttachment?: (attachment: Attachment) => void;
}

export function AttachmentsViewer({
  noteId,
  open,
  onOpenChange,
  onViewAttachment
}: AttachmentsViewerProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachmentType, setAttachmentType] = useState('supplementary');
  const [description, setDescription] = useState('');

  // Fetch attachments
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

  useEffect(() => {
    if (open && noteId) {
      fetchAttachments();
    }
  }, [open, noteId]);

  // Get file icon based on type
  const getFileIcon = (fileType: string, attachmentType: string) => {
    if (fileType.includes('image')) {
      return <Image className="h-5 w-5" />;
    }
    if (fileType.includes('presentation') || attachmentType === 'slides') {
      return <Presentation className="h-5 w-5" />;
    }
    if (fileType.includes('word') || fileType.includes('document') || attachmentType === 'notes') {
      return <FileText className="h-5 w-5" />;
    }
    return <FileIcon className="h-5 w-5" />;
  };

  // Get attachment type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'slides':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
      case 'notes':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
      case 'reference':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Handle file download
  const handleDownload = async (attachment: Attachment) => {
    if (!attachment.download_url) {
      toast.error('Download URL not available');
      return;
    }

    try {
      // Open the signed URL in a new tab to trigger download
      window.open(attachment.download_url, '_blank');
      toast.success('Download started');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Failed to download file');
    }
  };

  // Handle file deletion
  const handleDelete = async (attachmentId: string) => {
    try {
      setDeletingId(attachmentId);
      const response = await fetch(`/api/notes/${noteId}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete attachment');
      }

      toast.success('Attachment deleted successfully');
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete attachment');
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  };

  // Handle file selection for upload
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

  // Handle file upload
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
      if (description.trim()) {
        formData.append('description', description.trim());
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

      toast.success('File uploaded successfully');
      
      // Reset form and refresh attachments
      setSelectedFile(null);
      setDescription('');
      setAttachmentType('supplementary');
      setUploadDialogOpen(false);
      await fetchAttachments();
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  // Format file size
  const formatFileSize = (sizeInMB: string) => {
    const size = parseFloat(sizeInMB);
    if (size < 1) {
      return `${(size * 1024).toFixed(0)} KB`;
    }
    return `${size.toFixed(1)} MB`;
  };

  // Format date
  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(date));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <Paperclip className="h-5 w-5" />
                  Attachments
                </DialogTitle>
                <DialogDescription>
                  View and manage files attached to this note
                </DialogDescription>
              </div>
              <Button
                onClick={() => setUploadDialogOpen(true)}
                size="sm"
                className="ml-4"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload File
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
                    <Skeleton className="h-10 w-10 rounded" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-48 mb-2" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            ) : attachments.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <Paperclip className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
                  No attachments yet
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Upload files to supplement this note
                </p>
                <Button
                  onClick={() => setUploadDialogOpen(true)}
                  className="mt-4"
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload First File
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {attachments.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded">
                      {getFileIcon(attachment.file_type, attachment.attachment_type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate">
                          {attachment.file_name}
                        </p>
                        <Badge 
                          variant="secondary" 
                          className={cn("text-xs", getTypeColor(attachment.attachment_type))}
                        >
                          {attachment.attachment_type}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mt-1">
                        <span>{formatFileSize(attachment.file_size_mb)}</span>
                        <span>•</span>
                        <span>{formatDate(attachment.created_at)}</span>
                        {attachment.description && (
                          <>
                            <span>•</span>
                            <span className="truncate">{attachment.description}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      {onViewAttachment && attachment.file_type.includes('pdf') && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onViewAttachment(attachment)}
                          title="View PDF"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(attachment)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteConfirmId(attachment.id)}
                        disabled={deletingId === attachment.id}
                        title="Delete"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        {deletingId === attachment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {attachments.length} attachment{attachments.length !== 1 ? 's' : ''}
            </p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Upload Attachment</DialogTitle>
            <DialogDescription>
              Add a file to supplement this note
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="file">Select File</Label>
              <Input
                id="file"
                type="file"
                onChange={handleFileSelect}
                accept=".pdf,.ppt,.pptx,.doc,.docx,.one,.odt,.odp,.png,.jpg,.jpeg,.webp"
                className="mt-2"
              />
              {selectedFile && (
                <p className="text-sm text-gray-500 mt-2">
                  {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="type">Attachment Type</Label>
              <select
                id="type"
                value={attachmentType}
                onChange={(e) => setAttachmentType(e.target.value)}
                className="w-full mt-2 px-3 py-2 border rounded-md bg-background"
              >
                <option value="supplementary">Supplementary Material</option>
                <option value="slides">Presentation Slides</option>
                <option value="notes">Additional Notes</option>
                <option value="reference">Reference Material</option>
              </select>
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of this file..."
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false);
                setSelectedFile(null);
                setDescription('');
                setAttachmentType('supplementary');
              }}
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
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deleteConfirmId} 
        onOpenChange={(open) => !open && setDeleteConfirmId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Attachment?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this attachment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}