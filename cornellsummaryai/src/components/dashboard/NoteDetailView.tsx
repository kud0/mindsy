import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft,
  Download,
  Share2,
  Edit,
  Trash2,
  Clock,
  FileText,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { NoteAttachments } from './NoteAttachments';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface NoteDetail {
  id: string;
  job_id: string;
  title: string;
  course_subject?: string;
  summary_section?: string;
  notes_column?: string;
  cue_column?: string;
  created_at: string;
  updated_at: string;
  attachment_count?: number;
  study_node?: {
    name: string;
    type: string;
  };
}

interface NoteDetailViewProps {
  noteId: string;
  onBack?: () => void;
  className?: string;
}

export function NoteDetailView({ noteId, onBack, className }: NoteDetailViewProps) {
  const [note, setNote] = useState<NoteDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchNoteDetails();
  }, [noteId]);

  const fetchNoteDetails = async () => {
    try {
      setLoading(true);
      
      // Fetch note details from your API
      const response = await fetch(`/api/notes/${noteId}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch note details');
      }

      const data = await response.json();
      setNote(data.note);
    } catch (error) {
      console.error('Error fetching note:', error);
      toast.error('Failed to load note details');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!note) return;

    try {
      setDownloading(true);
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
      toast.error('Failed to download PDF');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/shared/note/${noteId}`;
    await navigator.clipboard.writeText(shareUrl);
    toast.success('Share link copied to clipboard');
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      const response = await fetch(`/api/notes/${noteId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to delete note');
      }

      toast.success('Note deleted successfully');
      
      // Navigate back or to dashboard
      if (onBack) {
        onBack();
      } else {
        window.location.href = '/dashboard/notes';
      }
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete note');
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center min-h-[400px]", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!note) {
    return (
      <div className={cn("text-center py-12", className)}>
        <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500">Note not found</p>
        <Button
          variant="outline"
          onClick={onBack || (() => window.location.href = '/dashboard/notes')}
          className="mt-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Notes
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack || (() => window.location.href = '/dashboard/notes')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold">{note.title}</h1>
            <div className="flex items-center gap-3 mt-2">
              {note.course_subject && (
                <Badge variant="outline">{note.course_subject}</Badge>
              )}
              {note.study_node && (
                <Badge variant="outline" className="text-purple-600">
                  {note.study_node.name}
                </Badge>
              )}
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="h-3 w-3" />
                <span>{formatDate(note.created_at)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleShare}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
          
          <Button
            variant="default"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </>
            )}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <Separator />

      {/* Note Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Section */}
          {note.summary_section && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{note.summary_section}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes Section */}
          {note.notes_column && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{note.notes_column}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cue Column */}
          {note.cue_column && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Key Points & Questions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <p className="whitespace-pre-wrap">{note.cue_column}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar with Attachments */}
        <div className="space-y-6">
          {/* Note Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Note Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="text-sm font-medium">{formatDate(note.created_at)}</p>
              </div>
              {note.updated_at && note.updated_at !== note.created_at && (
                <div>
                  <p className="text-sm text-gray-500">Last Updated</p>
                  <p className="text-sm font-medium">{formatDate(note.updated_at)}</p>
                </div>
              )}
              {note.attachment_count !== undefined && (
                <div>
                  <p className="text-sm text-gray-500">Attachments</p>
                  <p className="text-sm font-medium">{note.attachment_count} file{note.attachment_count !== 1 ? 's' : ''}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Attachments Section */}
          <NoteAttachments 
            noteId={noteId}
            onAttachmentAdded={() => {
              // Refresh note details to update attachment count
              fetchNoteDetails();
            }}
          />
        </div>
      </div>
    </div>
  );
}