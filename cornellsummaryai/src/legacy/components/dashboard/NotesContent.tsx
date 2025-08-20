import React, { useState, useEffect, useCallback } from 'react';
import { FolderManager } from './FolderManager';
import { UploadModal } from './UploadModal';
import { TextUploadModal } from './TextUploadModal';
import { PdfViewer } from './PdfViewer';
import { MarkdownEditor } from './MarkdownEditor';
import { 
  CreateFolderModal, 
  RenameFolderModal, 
  MoveToFolderModal,
  DeleteConfirmation 
} from './FolderModals';
import { RenameNoteModal } from './RenameNoteModal';
import { Button } from '@/components/ui/button';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeJobs } from '@/hooks/useRealtimeJobs';
import { Upload, Plus } from 'lucide-react';
import type { NoteStatus } from './NoteCard';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  plan: 'free' | 'student';
  minutesUsed?: number;
  minutesLimit?: number;
}

interface Note {
  id: string;
  title: string;
  createdAt: Date | string;
  status: NoteStatus;
  folder?: {
    id: string;
    name: string;
    path?: string;
  };
  duration?: string;
  hasOriginalDocument?: boolean;
}

interface Folder {
  id: string;
  name: string;
  count: number;
  parentId?: string;
  subfolders?: Folder[];
}

interface NotesContentProps {
  user: User;
  initialNotes: Note[];
  initialFolders: Folder[];
  noteIdFromUrl?: string;
}

export function NotesContent({ user, initialNotes, initialFolders, noteIdFromUrl }: NotesContentProps) {
  const [notes, setNotes] = useState<Note[]>(initialNotes);
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTextModalOpen, setUploadTextModalOpen] = useState(false);
  
  // Modal states
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | undefined>();
  const [renameFolderModalOpen, setRenameFolderModalOpen] = useState(false);
  const [renameFolderId, setRenameFolderId] = useState<string>('');
  const [moveToFolderModalOpen, setMoveToFolderModalOpen] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);
  const [deleteConfirmationOpen, setDeleteConfirmationOpen] = useState(false);
  const [renameNoteModalOpen, setRenameNoteModalOpen] = useState(false);
  const [renameNoteId, setRenameNoteId] = useState<string>('');
  
  // Note Viewer state
  const [noteViewerOpen, setNoteViewerOpen] = useState(false);
  const [selectedNoteForViewing, setSelectedNoteForViewing] = useState<Note | null>(null);
  const [viewMode, setViewMode] = useState<'pdf' | 'edit' | 'original'>('pdf');

  const { toast } = useToast();

  // Get folder path for display
  const getFolderPathString = (folderId: string): string => {
    const path: string[] = [];
    let currentId = folderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift(folder.name);
        currentId = folder.parentId || '';
      } else {
        break;
      }
    }
    
    return path.join(' / ');
  };

  // Realtime subscription callbacks
  const handleRealtimeJobInsert = useCallback((job: any) => {
    const existingNote = notes.find(n => n.id === job.job_id);
    if (!existingNote) {
      const newNote: Note = {
        id: job.job_id,
        title: job.lecture_title || 'Untitled',
        createdAt: job.created_at,
        status: job.status as NoteStatus,
        folder: job.folder_id ? {
          id: job.folder_id,
          name: folders.find(f => f.id === job.folder_id)?.name || '',
          path: getFolderPathString(job.folder_id)
        } : undefined,
        duration: job.audio_duration ? `${Math.round(job.audio_duration / 60)}m` : undefined,
        hasOriginalDocument: job.txt_file_path && job.txt_file_path.includes('summaries/')
      };
      setNotes(prev => [newNote, ...prev]);
      
      if (job.folder_id) {
        setFolders(prev => prev.map(folder => 
          folder.id === job.folder_id 
            ? { ...folder, count: folder.count + 1 }
            : folder
        ));
      }
      
      toast({
        title: "New note added",
        description: `"${job.lecture_title}" is being processed`
      });
    }
  }, [folders, notes, toast]);

  const handleRealtimeJobUpdate = useCallback((job: any) => {
    setNotes(prev => prev.map(note => 
      note.id === job.job_id 
        ? {
            ...note,
            status: job.status as NoteStatus,
            folder: job.folder_id ? {
              id: job.folder_id,
              name: folders.find(f => f.id === job.folder_id)?.name || '',
              path: getFolderPathString(job.folder_id)
            } : undefined
          }
        : note
    ));
  }, [folders]);

  // Setup realtime subscription
  useRealtimeJobs({
    onJobInsert: handleRealtimeJobInsert,
    onJobUpdate: handleRealtimeJobUpdate,
    userId: user.id
  });

  // Auto-open note from URL parameter
  useEffect(() => {
    if (noteIdFromUrl && notes.length > 0) {
      const note = notes.find(n => n.id === noteIdFromUrl);
      if (note && note.status === 'completed') {
        setSelectedNoteForViewing(note);
        setViewMode('pdf');
        setNoteViewerOpen(true);
        
        // Remove the note parameter from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('note');
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [noteIdFromUrl, notes]);

  // Handle folder operations
  const handleCreateFolder = (parentId?: string) => {
    setCreateFolderParentId(parentId);
    setCreateFolderModalOpen(true);
  };

  const handleRenameFolder = (folderId: string) => {
    setRenameFolderId(folderId);
    setRenameFolderModalOpen(true);
  };

  const handleDeleteFolder = (folderId: string) => {
    // Implementation for folder deletion
    setFolders(prev => prev.filter(f => f.id !== folderId));
  };

  const handleMoveNotesToFolder = (noteIds: string[]) => {
    setSelectedNoteIds(noteIds);
    setMoveToFolderModalOpen(true);
  };

  const handleRenameNote = (noteId: string) => {
    setRenameNoteId(noteId);
    setRenameNoteModalOpen(true);
  };

  // Handle audio upload from drawer
  const handleAudioUpload = (file: File, folderId?: string) => {
    // Use existing upload modal logic or implement direct upload here
    setUploadModalOpen(true);
    // You can pass the file and folderId to the upload modal
  };

  // Handle text upload from drawer
  const handleTextUpload = (text: string, options: any, folderId?: string) => {
    // Implement text enhancement and upload logic
    console.log('Text upload:', { text, options, folderId });
    
    toast({
      title: "Text uploaded successfully",
      description: "Your text content has been processed and saved"
    });
  };

  return (
    <div className="flex-1 overflow-hidden">
      {noteViewerOpen && selectedNoteForViewing ? (
        // Note Viewer - Switch between PDF, Edit, and Original modes
        <div className="h-full">
          {viewMode === 'pdf' ? (
            <PdfViewer
              jobId={selectedNoteForViewing.id}
              title={selectedNoteForViewing.title}
              onClose={() => {
                setNoteViewerOpen(false);
                setSelectedNoteForViewing(null);
                setViewMode('pdf');
              }}
              onViewModeChange={() => {
                setViewMode('edit'); // Switch to edit mode
              }}
            />
          ) : viewMode === 'edit' ? (
            <MarkdownEditor
              jobId={selectedNoteForViewing.id}
              title={selectedNoteForViewing.title}
              onClose={() => {
                setNoteViewerOpen(false);
                setSelectedNoteForViewing(null);
                setViewMode('pdf');
              }}
              onViewModeChange={() => {
                setViewMode('pdf'); // Switch back to PDF view
              }}
            />
          ) : (
            // Original PDF view
            <PdfViewer
              jobId={selectedNoteForViewing.id}
              title={`${selectedNoteForViewing.title} (Original)`}
              format="original"
              onClose={() => {
                setNoteViewerOpen(false);
                setSelectedNoteForViewing(null);
                setViewMode('pdf');
              }}
              onViewModeChange={() => {
                setViewMode('pdf'); // Switch back to processed PDF view
              }}
            />
          )}
        </div>
      ) : (
        // Normal Notes View - Show folder manager when not viewing a PDF
        <FolderManager
          notes={notes}
          folders={folders}
          currentFolder={selectedFolder}
          onFolderNavigate={setSelectedFolder}
          onNoteDownload={(id, format = 'pdf') => {
            // Trigger download via the download API
            window.open(`/api/download/${id}?format=${format}`, '_blank');
          }}
          onNoteDelete={(id) => {
            console.log('Delete note:', id);
          }}
          onNoteRename={handleRenameNote}
          onNoteMove={(id) => {
            handleMoveNotesToFolder([id]);
          }}
          onNoteSelect={(id) => {
            console.log('Select note:', id);
          }}
          onNoteView={(id) => {
            const note = notes.find(n => n.id === id);
            if (note && note.status === 'completed') {
              setSelectedNoteForViewing(note);
              setViewMode('pdf'); // Start with PDF view
              setNoteViewerOpen(true);
            }
          }}
          onViewOriginal={(id) => {
            const note = notes.find(n => n.id === id);
            if (note && note.status === 'completed' && note.hasOriginalDocument) {
              setSelectedNoteForViewing(note);
              setViewMode('original'); // View original PDF
              setNoteViewerOpen(true);
            }
          }}
        />
      )}

      {/* Modals */}
      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        folders={folders}
        onUpload={async (file: File, title?: string, duration?: number, studyNodeId?: string) => {
          try {
            // Create temp note for immediate feedback
            const tempId = `temp-${Date.now()}`;
            const tempNote = {
              id: tempId,
              title: title || file.name.replace(/\.[^/.]+$/, ""),
              createdAt: new Date().toISOString(),
              status: 'uploading' as NoteStatus,
              folder: studyNodeId ? folders.find(f => f.id === studyNodeId) : undefined
            };
            
            setNotes(prev => [tempNote, ...prev]);
            
            // Upload file to storage
            const formData = new FormData();
            formData.append('audio', file);
            
            const uploadResponse = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            
            if (!uploadResponse.ok) {
              throw new Error('Upload failed');
            }
            
            const uploadData = await uploadResponse.json();
            
            // Start processing with study node ID
            const generatePayload = {
              audioFilePath: uploadData.audioPath,
              lectureTitle: title || file.name.replace(/\.[^/.]+$/, ""),
              courseSubject: '',
              fileSizeMB: file.size / (1024 * 1024),
              clientDurationMinutes: duration,
              studyNodeId: studyNodeId || undefined
            };
            
            const generateResponse = await fetch('/api/generate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(generatePayload)
            });
            
            if (!generateResponse.ok) {
              const error = await generateResponse.json();
              setNotes(prev => prev.map(note => 
                note.id === tempId 
                  ? { ...note, status: 'failed' as NoteStatus }
                  : note
              ));
              throw new Error(error.error || 'Processing failed');
            }
            
            const generateData = await generateResponse.json();
            
            // Update temp note with real job ID
            setNotes(prev => prev.map(note => 
              note.id === tempId 
                ? { ...note, id: generateData.jobId, status: 'processing' as NoteStatus }
                : note
            ));
            
            toast({
              title: "Upload successful",
              description: "Your audio is being processed into Mindsy Notes.",
            });
            
          } catch (error) {
            console.error('Upload failed:', error);
            toast({
              title: "Upload failed",
              description: error instanceof Error ? error.message : 'An error occurred during upload.',
              variant: "destructive"
            });
          }
        }}
      />

      <TextUploadModal
        open={uploadTextModalOpen}
        onOpenChange={setUploadTextModalOpen}
        folders={folders}
      />

      <CreateFolderModal
        open={createFolderModalOpen}
        onOpenChange={setCreateFolderModalOpen}
        parentId={createFolderParentId}
        folders={folders}
        onFolderCreated={(newFolder) => {
          setFolders(prev => [...prev, newFolder]);
        }}
      />

      <RenameFolderModal
        open={renameFolderModalOpen}
        onOpenChange={setRenameFolderModalOpen}
        folderId={renameFolderId}
        folders={folders}
        onFolderRenamed={(folderId, newName) => {
          setFolders(prev => prev.map(f => 
            f.id === folderId ? { ...f, name: newName } : f
          ));
        }}
      />

      <MoveToFolderModal
        open={moveToFolderModalOpen}
        onOpenChange={setMoveToFolderModalOpen}
        noteIds={selectedNoteIds}
        folders={folders}
        onMoveComplete={() => {
          // Refresh notes after move
          window.location.reload();
        }}
      />

      <RenameNoteModal
        open={renameNoteModalOpen}
        onOpenChange={setRenameNoteModalOpen}
        noteId={renameNoteId}
        currentTitle={notes.find(n => n.id === renameNoteId)?.title || ''}
        onRename={(noteId, newTitle) => {
          setNotes(prev => prev.map(n => 
            n.id === noteId ? { ...n, title: newTitle } : n
          ));
        }}
      />

      <Toaster />
    </div>
  );
}