import React, { useState } from 'react';
import { 
  FileText, 
  Clock, 
  Folder, 
  MoreVertical, 
  Download, 
  Trash, 
  Edit,
  Move,
  CheckCircle,
  AlertCircle,
  Loader2,
  Map,
  Upload,
  Paperclip
} from 'lucide-react';
import { AttachmentsViewer } from './AttachmentsViewer';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export type NoteStatus = 'processing' | 'completed' | 'failed' | 'pending';

export interface NoteCardProps {
  id: string;
  title: string;
  createdAt: Date;
  status: NoteStatus;
  folder?: {
    id: string;
    name: string;
    path?: string;
  };
  duration?: string;
  attachmentCount?: number;
  onDownload: (id: string, format?: 'pdf' | 'txt' | 'markdown' | 'original') => void;
  onDelete: (id: string) => void;
  onRename: (id: string) => void;
  onMove: (id: string) => void;
  onView?: (id: string) => void;
  onViewOriginal?: (id: string) => void;
  onMindMap?: (id: string, title: string) => void;
  onManageAttachments?: (id: string) => void;
  isDocumentNote?: boolean; // Flag to indicate if this note came from document processing
}

export function NoteCard({
  id,
  title,
  createdAt,
  status,
  folder,
  duration,
  attachmentCount = 0,
  onDownload,
  onDelete,
  onRename,
  onMove,
  onView,
  onViewOriginal,
  onMindMap,
  onManageAttachments,
  isDocumentNote = false
}: NoteCardProps) {
  const [isAttachDialogOpen, setIsAttachDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showAttachmentsViewer, setShowAttachmentsViewer] = useState(false);

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
      formData.append('type', 'supplementary'); // Default type

      const response = await fetch(`/api/notes/${id}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      toast.success('File attached successfully');
      
      // Reset form
      setSelectedFile(null);
      setIsAttachDialogOpen(false);
      
      // Refresh attachments viewer if open
      if (showAttachmentsViewer) {
        setShowAttachmentsViewer(false);
        setTimeout(() => setShowAttachmentsViewer(true), 100);
      }
      
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload attachment');
    } finally {
      setUploading(false);
    }
  };
  const getStatusIcon = () => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };


  const formatDate = (date: Date) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  return (
    <>
    <Card 
      className="group hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col h-full min-h-[120px] hover:scale-[1.02] active:scale-[0.98]"
      onClick={() => {
        // If the note is completed, open PDF viewer
        if (status === 'completed' && onView) {
          onView(id);
        }
      }}
    >
      <CardHeader className="pb-2 pt-3 px-3 flex-shrink-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            {getStatusIcon()}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-sm font-medium line-clamp-1 leading-5" title={title}>
                {title}
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {formatDate(createdAt)}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger disabled={status !== 'completed'}>
                    <Download className="mr-2 h-4 w-4" />
                    <span>Download</span>
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(id, 'pdf');
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>PDF Format</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(id, 'txt');
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Text Format</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDownload(id, 'markdown');
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>Markdown Format</span>
                    </DropdownMenuItem>
                    {isDocumentNote && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(id, 'original');
                        }}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Original Document</span>
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onMindMap) {
                      onMindMap(id, title);
                    }
                  }}
                  disabled={status !== 'completed'}
                >
                  <Map className="mr-2 h-4 w-4" />
                  View Mind Map
                </DropdownMenuItem>
                {isDocumentNote && onViewOriginal && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewOriginal(id);
                    }}
                    disabled={status !== 'completed'}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    View Original Document
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsAttachDialogOpen(true);
                  }}
                  disabled={status !== 'completed'}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Attach Files
                </DropdownMenuItem>
                {attachmentCount > 0 && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAttachmentsViewer(true);
                    }}
                  >
                    <Paperclip className="mr-2 h-4 w-4" />
                    View Attachments ({attachmentCount})
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename(id);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onMove(id);
                  }}
                >
                  <Move className="mr-2 h-4 w-4" />
                  Move to Folder
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(id);
                  }}
                  className="text-destructive"
                >
                  <Trash className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      {(folder || duration) && (
        <CardContent className="py-1 px-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            {folder && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                <Folder className="h-3 w-3 flex-shrink-0 text-blue-500" />
                <span className="truncate font-medium text-slate-700 dark:text-slate-300" title={folder.path || folder.name}>
                  {folder.path || folder.name}
                </span>
              </div>
            )}
            {folder && duration && <span className="text-muted-foreground">•</span>}
            {duration && (
              <span className="text-muted-foreground font-mono bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                {duration}
              </span>
            )}
          </div>
        </CardContent>
      )}

      {status === 'processing' && (
        <CardContent className="py-2 px-3 flex-shrink-0">
          <Progress value={50} className="h-1" />
          <p className="text-xs text-muted-foreground mt-1">
            {duration ? 'Processing your audio...' : 'Processing your document...'}
          </p>
        </CardContent>
      )}

      {/* Attachment indicator */}
      {attachmentCount > 0 && (
        <CardFooter className="pt-0 pb-2 px-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAttachmentsViewer(true);
            }}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Paperclip className="h-3 w-3" />
            <span>{attachmentCount} attachment{attachmentCount > 1 ? 's' : ''}</span>
          </button>
        </CardFooter>
      )}
    </Card>

    {/* Simplified Attachment Upload Dialog */}
    <Dialog open={isAttachDialogOpen} onOpenChange={setIsAttachDialogOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Attach File</DialogTitle>
          <DialogDescription>
            Choose a file to attach to this note
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Input
            id="file"
            type="file"
            onChange={handleFileSelect}
            accept=".pdf,.ppt,.pptx,.doc,.docx,.one,.odt,.odp,.png,.jpg,.jpeg,.webp"
          />
          {selectedFile && (
            <p className="text-sm text-gray-500 mt-2">
              {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} MB)
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsAttachDialogOpen(false);
              setSelectedFile(null);
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

    {/* Attachments Viewer */}
    <AttachmentsViewer
      noteId={id}
      open={showAttachmentsViewer}
      onOpenChange={setShowAttachmentsViewer}
    />
    </>
  );
}