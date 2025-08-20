import React, { useState } from 'react';
import { 
  FileText, 
  Download, 
  Clock, 
  Paperclip,
  MoreVertical,
  Eye,
  Trash2,
  Edit,
  FolderPlus,
  Share2,
  Upload,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NoteCardProps {
  note: {
    id: string;
    job_id: string;
    title: string;
    created_at: string;
    status: string;
    course_subject?: string;
    attachment_count?: number;
    study_node?: {
      name: string;
      type: string;
    };
  };
  onView?: (noteId: string) => void;
  onDownload?: (jobId: string) => void;
  onDelete?: (noteId: string) => void;
  onMoveToFolder?: (noteId: string) => void;
  onManageAttachments?: (noteId: string) => void;
  className?: string;
}

export function NoteCardWithAttachments({ 
  note, 
  onView,
  onDownload,
  onDelete,
  onMoveToFolder,
  onManageAttachments,
  className 
}: NoteCardProps) {
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [attachmentType, setAttachmentType] = useState('supplementary');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      'day'
    );
  };

  const handleView = () => {
    if (onView) {
      onView(note.id);
    } else {
      window.location.href = `/dashboard/notes?noteId=${note.id}`;
    }
  };

  const handleDownload = async () => {
    if (onDownload) {
      onDownload(note.job_id);
    } else {
      // Default download behavior
      try {
        const response = await fetch(`/api/download/${note.job_id}`, {
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Download failed');
        }
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${note.title || 'notes'}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success('Download started');
      } catch (error) {
        console.error('Download error:', error);
        toast.error('Failed to download file');
      }
    }
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete(note.id);
    }
  };

  const handleMoveToFolder = () => {
    if (onMoveToFolder) {
      onMoveToFolder(note.id);
    } else {
      toast.info('Folder selection coming soon');
    }
  };

  const handleManageAttachments = () => {
    if (onManageAttachments) {
      onManageAttachments(note.id);
    } else {
      window.location.href = `/dashboard/notes/${note.id}/attachments`;
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/shared/note/${note.id}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
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

  const handleAttachmentUpload = async () => {
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

      const response = await fetch(`/api/notes/${note.id}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      toast.success('Attachment uploaded successfully');
      
      // Reset form
      setSelectedFile(null);
      setDescription('');
      setAttachmentType('supplementary');
      setIsAttachDialogOpen(false);
      
      // Trigger refresh if needed
      if (onManageAttachments) {
        onManageAttachments(note.id);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
    <Card className={cn("hover:shadow-lg transition-shadow", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 
              className="font-semibold text-lg truncate cursor-pointer hover:text-blue-600 transition-colors"
              onClick={handleView}
            >
              {note.title || 'Untitled Note'}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="secondary" className="text-xs">
                {note.status}
              </Badge>
              {note.course_subject && (
                <Badge variant="outline" className="text-xs">
                  {note.course_subject}
                </Badge>
              )}
              {note.study_node && (
                <Badge variant="outline" className="text-xs text-purple-600">
                  {note.study_node.name}
                </Badge>
              )}
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={handleView}>
                <Eye className="w-4 h-4 mr-2" />
                View Note
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleDownload}>
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setIsAttachDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Attach Files
              </DropdownMenuItem>
              
              {note.attachment_count && note.attachment_count > 0 && (
                <DropdownMenuItem onClick={handleManageAttachments}>
                  <Paperclip className="w-4 h-4 mr-2" />
                  View Attachments
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {note.attachment_count}
                  </Badge>
                </DropdownMenuItem>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={handleMoveToFolder}>
                <FolderPlus className="w-4 h-4 mr-2" />
                Move to Folder
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleDelete}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex items-center justify-between text-sm text-gray-500">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>{formatDate(note.created_at)}</span>
            </div>
            
            {note.attachment_count && note.attachment_count > 0 && (
              <div 
                className="flex items-center gap-1 cursor-pointer hover:text-blue-600 transition-colors"
                onClick={handleManageAttachments}
              >
                <Paperclip className="h-3 w-3" />
                <span>{note.attachment_count} attachment{note.attachment_count > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleView}
              className="h-8"
            >
              <FileText className="h-3 w-3 mr-1" />
              View
            </Button>
            
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              className="h-8"
            >
              <Download className="h-3 w-3 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Attachment Upload Dialog */}
    <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Attach Files to Note</DialogTitle>
          <DialogDescription>
            Add slides, PDFs, OneNote files, or other documents to this note.
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
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
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
                <SelectItem value="slides">Slides (Lecture Presentation)</SelectItem>
                <SelectItem value="notes">Additional Notes</SelectItem>
                <SelectItem value="reference">Reference Material</SelectItem>
                <SelectItem value="supplementary">Supplementary Document</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this file..."
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsAttachDialogOpen(false);
              setSelectedFile(null);
              setDescription('');
            }}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAttachmentUpload}
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