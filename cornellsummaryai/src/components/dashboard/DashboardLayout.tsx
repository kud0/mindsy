import React, { useState, useEffect, useCallback } from 'react';
import { StudiesSidebar } from './StudiesSidebar';
import { MainSidebar } from './MainSidebar';
import { AccountSidebar } from './AccountSidebar';
import { ExamSidebar } from './ExamSidebar';
import { FolderManager } from './FolderManager';
import { MarkdownEditor } from './MarkdownEditor';
import { PdfViewer } from './PdfViewer';
import { MindMapViewer } from './MindMapViewer';
import { UploadModal } from './UploadModal';
import { TextUploadModal } from './TextUploadModal';
import { AccountSettingsIntegrated } from './AccountSettingsIntegrated';
import { PomodoroDashboard } from './PomodoroDashboard';
import ExamDashboard from './ExamDashboard';
import { Performance } from './Performance';
import { PomodoroProvider } from '@/stores/pomodoro';
import { 
  CreateFolderModal, 
  RenameFolderModal, 
  MoveToFolderModal,
  DeleteConfirmation 
} from './FolderModals';
import { RenameNoteModal } from './RenameNoteModal';
import { Toaster } from '@/components/ui/toaster';
import { useToast } from '@/components/ui/use-toast';
import { useRealtimeJobs } from '@/hooks/useRealtimeJobs';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Sidebar, SidebarContent, SidebarProvider } from '@/components/ui/sidebar';
import { Menu } from 'lucide-react';
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
    path?: string; // Full path for display
  };
  duration?: string;
  hasOriginalDocument?: boolean; // Flag to indicate if original document is available
}

interface Folder {
  id: string;
  name: string;
  count: number;
  parentId?: string;
  subfolders?: Folder[];
}

interface DashboardLayoutProps {
  user: User;
  initialNotes?: Note[];
  initialFolders?: Folder[];
  currentPage?: 'notes' | 'account' | 'pomodoro' | 'exams' | 'performance';
}

export function DashboardLayout({ 
  user, 
  initialNotes = [], 
  initialFolders = [],
  currentPage = 'notes'
}: DashboardLayoutProps) {
  const { toast } = useToast();
  // Convert date strings to Date objects
  const [notes, setNotes] = useState<Note[]>(
    initialNotes.map(note => ({
      ...note,
      createdAt: typeof note.createdAt === 'string' ? new Date(note.createdAt) : note.createdAt
    }))
  );
  const [folders, setFolders] = useState<Folder[]>(initialFolders);
  const [selectedFolder, setSelectedFolder] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [loading, setLoading] = useState(false);
  const [userState, setUserState] = useState<User>(user);
  const [currentView, setCurrentView] = useState<'notes' | 'account' | 'pomodoro' | 'exams' | 'performance' | 'studies'>(currentPage); // Track current view
  const [activeAccountSection, setActiveAccountSection] = useState('profile'); // Track active account section

  // Modal states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true); // Desktop sidebar toggle
  const [uploadTextModalOpen, setUploadTextModalOpen] = useState(false);
  const [createFolderModalOpen, setCreateFolderModalOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string>('');
  const [renameFolderModalOpen, setRenameFolderModalOpen] = useState(false);
  const [renameNoteModalOpen, setRenameNoteModalOpen] = useState(false);
  const [moveFolderModalOpen, setMoveFolderModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  
  // PDF/Markdown viewer state
  const [pdfViewerOpen, setPdfViewerOpen] = useState(false);
  const [selectedPdf, setSelectedPdf] = useState<{
    jobId: string;
    title: string;
    format?: 'pdf' | 'original';
  } | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [viewerMode, setViewerMode] = useState<'pdf' | 'markdown' | 'mindmap'>('markdown'); // Toggle between viewers
  const [pdfVersion, setPdfVersion] = useState(0); // Force PDF refresh
  const [mindMapData, setMindMapData] = useState<{ type: 'folder' | 'note'; id: string; title: string } | null>(null);
  
  // Modal data
  const [folderToRename, setFolderToRename] = useState<{ id: string; name: string } | null>(null);
  const [noteToRename, setNoteToRename] = useState<{ id: string; title: string } | null>(null);
  const [itemToMove, setItemToMove] = useState<{ id: string; name: string; type: 'note' | 'folder' } | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string; type: 'note' | 'folder' } | null>(null);

  // Refresh user tier and usage data
  const refreshUserData = async () => {
    try {
      const response = await fetch('/api/user/tier');
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserState(prev => ({
            ...prev,
            plan: (data.tier === 'student' ? 'student' : 'free') as 'free' | 'student',
            minutesUsed: data.minutesUsed,
            minutesLimit: data.minutesLimit
          }));
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  // Refresh user data on mount and when tab gains focus
  useEffect(() => {
    refreshUserData();
    
    // Refresh when tab gains focus (backup for realtime)
    const handleFocus = () => {
      // Only refresh if tab has been hidden for more than 30 seconds
      const now = Date.now();
      const lastRefresh = window.localStorage.getItem('lastDashboardRefresh');
      if (!lastRefresh || now - parseInt(lastRefresh) > 30000) {
        console.log('Tab refocused, refreshing data...');
        refreshUserData();
        // Could also refresh notes here if needed
        window.localStorage.setItem('lastDashboardRefresh', now.toString());
      }
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  // Realtime subscription callbacks
  const handleRealtimeJobInsert = useCallback((job: any) => {
    // Check if we already have this job (from our temp card)
    const existingNote = notes.find(n => n.id === job.job_id);
    if (!existingNote) {
      // New job from another session/device
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
      
      // Update folder counts when a new job is added
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
  }, [folders, notes]);

  const handleRealtimeJobUpdate = useCallback((job: any) => {
    // Check if folder changed to update counts
    const oldNote = notes.find(n => n.id === job.job_id);
    const oldFolderId = oldNote?.folder?.id;
    const newFolderId = job.folder_id;
    
    // Log when a job's folder changes to null (indicating folder was deleted)
    if (oldFolderId && !newFolderId) {
      console.log(`🗑️ Job ${job.job_id} folder cleared (folder was likely deleted):`, oldFolderId);
    }
    
    setNotes(prev => prev.map(note => 
      note.id === job.job_id 
        ? { 
            ...note, 
            status: job.status as NoteStatus,
            title: job.lecture_title || note.title,
            folder: job.folder_id ? {
              id: job.folder_id,
              name: folders.find(f => f.id === job.folder_id)?.name || '',
              path: getFolderPathString(job.folder_id)
            } : undefined,
            hasOriginalDocument: job.txt_file_path && job.txt_file_path.includes('summaries/')
          }
        : note
    ));
    
    // Update folder counts when a job's folder changes
    if (oldFolderId !== newFolderId) {
      setFolders(prev => prev.map(folder => {
        if (folder.id === oldFolderId) {
          // Decrease count for old folder
          return { ...folder, count: Math.max(0, folder.count - 1) };
        } else if (folder.id === newFolderId) {
          // Increase count for new folder
          return { ...folder, count: folder.count + 1 };
        }
        return folder;
      }));
    }
  }, [folders, notes]);

  const handleRealtimeJobDelete = useCallback((jobId: string) => {
    // Find the note being deleted to update folder counts
    const noteToDelete = notes.find(n => n.id === jobId);
    if (noteToDelete?.folder?.id) {
      setFolders(prev => prev.map(folder => 
        folder.id === noteToDelete.folder!.id 
          ? { ...folder, count: Math.max(0, folder.count - 1) }
          : folder
      ));
    }
    
    setNotes(prev => prev.filter(note => note.id !== jobId));
  }, [notes]);

  // Folder realtime handlers
  const handleRealtimeFolderInsert = useCallback((folder: any) => {
    console.log('➕ Folder INSERT real-time event:', folder);
    const newFolder: Folder = {
      id: String(folder.id),
      name: folder.name,
      count: 0,
      parentId: folder.parent_id ? String(folder.parent_id) : undefined,
      subfolders: []
    };
    
    console.log('➕ Creating new folder:', newFolder.name, 'Parent:', newFolder.parentId);
    
    setFolders(prev => {
      // Clone the array to avoid mutations
      const updated = [...prev];
      
      // Always add the new folder to the main array
      updated.push(newFolder);
      
      // If it has a parent, also add it to the parent's subfolders array
      if (newFolder.parentId) {
        const parentIndex = updated.findIndex(f => f.id === newFolder.parentId);
        if (parentIndex !== -1) {
          const parentFolder = updated[parentIndex];
          console.log(`➕ Adding to parent folder: ${parentFolder.name}`);
          
          // Create a new parent object with updated subfolders
          updated[parentIndex] = {
            ...parentFolder,
            subfolders: [...(parentFolder.subfolders || []), newFolder]
          };
        } else {
          console.warn(`➕ Parent folder ${newFolder.parentId} not found`);
        }
      }
      
      console.log('➕ Total folders after insert:', updated.length);
      return updated;
    });
  }, []);

  const handleRealtimeFolderUpdate = useCallback((folder: any) => {
    setFolders(prev => prev.map(f => 
      f.id === String(folder.id)
        ? { ...f, name: folder.name }
        : f
    ));
    
    // Update folder paths in notes when a folder is renamed
    setNotes(prev => prev.map(note => {
      if (note.folder?.id) {
        // Check if this note's folder or any parent folder was renamed
        const path = getFolderPath(note.folder.id);
        if (path.some(p => p.id === String(folder.id))) {
          // Rebuild the path
          return {
            ...note,
            folder: {
              ...note.folder,
              path: getFolderPathString(note.folder.id)
            }
          };
        }
      }
      return note;
    }));
  }, []);

  const handleRealtimeFolderDelete = useCallback((folderId: string) => {
    console.log('🗑️ Folder DELETE real-time event - folderId:', folderId);
    
    // Update folders state
    setFolders(prev => {
      // Find the folder to delete
      const folderToDelete = prev.find(f => f.id === folderId);
      
      if (!folderToDelete) {
        console.warn('🗑️ Folder not found in state, might already be deleted');
        return prev;
      }
      
      console.log('🗑️ Deleting folder:', folderToDelete.name);
      
      // Find all folders that should be deleted (folder + all its descendants)
      const findDescendantIds = (parentId: string, folderList: Folder[]): string[] => {
        const directChildren = folderList.filter(f => f.parentId === parentId);
        const allDescendants = [parentId];
        
        for (const child of directChildren) {
          allDescendants.push(...findDescendantIds(child.id, folderList));
        }
        
        return allDescendants;
      };
      
      const idsToDelete = findDescendantIds(folderId, prev);
      console.log('🗑️ Will delete folder and descendants:', idsToDelete);
      
      // Create a new array with updates
      const newFolders = prev
        // First, remove deleted folders from ALL parent's subfolders arrays
        .map(folder => {
          // Skip if this folder is being deleted
          if (idsToDelete.includes(folder.id)) {
            return folder;
          }
          
          // Check if this folder has subfolders that need to be filtered
          if (folder.subfolders && folder.subfolders.length > 0) {
            const filteredSubfolders = folder.subfolders.filter(sf => !idsToDelete.includes(sf.id));
            
            // Only create a new object if subfolders actually changed
            if (filteredSubfolders.length !== folder.subfolders.length) {
              console.log(`🗑️ Updating ${folder.name}: removing ${folder.subfolders.length - filteredSubfolders.length} subfolder(s)`);
              return {
                ...folder,
                subfolders: filteredSubfolders
              };
            }
          }
          
          return folder;
        })
        // Then remove the deleted folders from the main array
        .filter(f => !idsToDelete.includes(f.id));
      
      console.log(`🗑️ Removed ${prev.length - newFolders.length} folder(s) from main list`);
      console.log('🗑️ Folders remaining:', newFolders.map(f => f.name));
      
      return newFolders;
    });
    
    // Remove folder association from any notes that had it
    setNotes(prev => {
      console.log('🗑️ Updating notes for deleted folder');
      return prev.map(note => {
        if (note.folder?.id === folderId) {
          console.log(`🗑️ Removing folder from note ${note.id}`);
          return { ...note, folder: undefined };
        }
        // Also check if note's folder is a descendant of the deleted folder
        if (note.folder?.id) {
          // We can't use getFolderPath here as folders state might be stale
          // Just check if the folder matches the deleted one
          return note;
        }
        return note;
      });
    });
  }, []);

  // Helper to update folder counts
  const updateFolderCounts = useCallback(() => {
    setFolders(prev => {
      const updated = [...prev];
      // Reset all counts
      updated.forEach(folder => {
        folder.count = 0;
      });
      // Count notes in each folder
      notes.forEach(note => {
        if (note.folder?.id) {
          const folder = updated.find(f => f.id === note.folder!.id);
          if (folder) {
            folder.count++;
          }
        }
      });
      return updated;
    });
  }, [notes]);

  // Setup realtime subscription
  useRealtimeJobs({
    userId: userState.id,
    onJobInsert: handleRealtimeJobInsert,
    onJobUpdate: handleRealtimeJobUpdate,
    onJobDelete: handleRealtimeJobDelete,
    onFolderInsert: handleRealtimeFolderInsert,
    onFolderUpdate: handleRealtimeFolderUpdate,
    onFolderDelete: handleRealtimeFolderDelete
  });

  // Build folder path for breadcrumb
  const getFolderPath = (folderId?: string) => {
    if (!folderId) return [];
    
    const path: { id: string; name: string }[] = [];
    let currentId = folderId;
    
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) {
        path.unshift({ id: folder.id, name: folder.name });
        currentId = folder.parentId || '';
      } else {
        break;
      }
    }
    
    return path;
  };
  
  // Get folder path as string for display
  const getFolderPathString = (folderId: string): string => {
    const path = getFolderPath(folderId);
    return path.map(p => p.name).join(' / ');
  };

  // Handlers
  const handleUpload = async (audioFile: File, title?: string, duration?: number) => {
    // Step 1: Upload files to storage ONLY
    const formData = new FormData();
    formData.append('audioFile', audioFile);
    formData.append('lectureTitle', title || audioFile.name);
    
    // Add file size info for better server-side handling
    const audioSizeMB = Math.round((audioFile.size / (1024 * 1024)) * 100) / 100;
    formData.append('audioSizeMB', audioSizeMB.toString());

    console.log('Uploading files...');
    const uploadResponse = await fetch('/api/upload-files', {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error || 'Upload failed');
    }

    const uploadData = await uploadResponse.json();
    console.log('Upload successful:', uploadData);
    
    // Generate a temporary ID for the card (will be replaced with real jobId)
    const tempId = `temp-${Date.now()}`;
    
    // Add new note to state IMMEDIATELY so user sees the card
    const newNote: Note = {
      id: tempId,
      title: title || audioFile.name,
      createdAt: new Date(),
      status: 'processing',
      folder: selectedFolder ? { 
        id: selectedFolder, 
        name: folders.find(f => f.id === selectedFolder)?.name || '',
        path: getFolderPathString(selectedFolder)
      } : undefined,
      duration: duration ? `${duration}m` : undefined,
      hasOriginalDocument: false // Audio notes don't have original documents
    };

    setNotes(prev => [newNote, ...prev]);
    
    // Update minutes used if duration is provided
    if (duration) {
      setUserState(prev => ({
        ...prev,
        minutesUsed: (prev.minutesUsed || 0) + duration
      }));
    }
    
    // Close modal and show toast
    toast({
      title: "Upload successful",
      description: "Processing your audio in the background..."
    });

    // Start processing in background (don't await)
    startProcessing(uploadData, title || audioFile.name, audioSizeMB, duration, tempId);
  };

  // Handle text document upload (PDF, DOC, etc.)
  const handleTextUpload = async (documentFile: File, title?: string, processingMode: 'enhance' | 'store' = 'enhance') => {
    // Validate file before processing
    if (!documentFile || !documentFile.name || typeof documentFile.size !== 'number') {
      throw new Error('Invalid document file provided');
    }
    
    // Step 1: Upload document to storage ONLY
    const formData = new FormData();
    formData.append('pdfFile', documentFile); // Use pdfFile key for compatibility with existing API
    formData.append('lectureTitle', title || documentFile.name);
    formData.append('processingMode', processingMode); // Add processing mode
    
    // Add file size info for better server-side handling (with null safety)
    const documentSizeMB = Math.round((documentFile.size / (1024 * 1024)) * 100) / 100;
    formData.append('pdfSizeMB', documentSizeMB.toString());

    console.log('Uploading document...');
    const uploadResponse = await fetch('/api/upload-files', {
      method: 'POST',
      body: formData
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.json();
      throw new Error(error.error || 'Upload failed');
    }

    const uploadData = await uploadResponse.json();
    console.log('Document upload successful:', uploadData);
    
    // Generate a temporary ID for the card (will be replaced with real jobId)
    const tempId = `temp-${Date.now()}`;
    
    // Add new note to state IMMEDIATELY so user sees the card
    const newNote: Note = {
      id: tempId,
      title: title || documentFile.name.replace(/\.[^/.]+$/, ''),
      createdAt: new Date(),
      status: 'processing',
      folder: selectedFolder ? { 
        id: selectedFolder, 
        name: folders.find(f => f.id === selectedFolder)?.name || '',
        path: getFolderPathString(selectedFolder)
      } : undefined,
      duration: undefined, // No duration for text documents
      hasOriginalDocument: processingMode === 'store' // Only store mode has original document
    };

    setNotes(prev => [newNote, ...prev]);
    
    // Close modal and show toast
    toast({
      title: "Upload successful",
      description: `Processing your document in ${processingMode} mode...`
    });

    // Start processing in background (don't await)
    startDocumentProcessing(uploadData, title || documentFile.name.replace(/\.[^/.]+$/, ''), processingMode, tempId);
  };

  // Separate function to handle processing in background
  const startProcessing = async (
    uploadData: any, 
    title: string, 
    audioSizeMB: number, 
    duration?: number,
    tempId?: string
  ) => {
    try {
      // Trigger processing
      const generatePayload: any = {
        audioFilePath: uploadData.audioPath,
        lectureTitle: title,
        courseSubject: '',
        fileSizeMB: audioSizeMB,
        clientDurationMinutes: duration
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
        // Update the temp card to show failed status
        if (tempId) {
          setNotes(prev => prev.map(note => 
            note.id === tempId 
              ? { ...note, status: 'failed' as NoteStatus }
              : note
          ));
        }
        throw new Error(error.error || 'Processing failed');
      }

      const generateData = await generateResponse.json();
      console.log('Processing started:', generateData);

      // Replace the temporary ID with the real job ID
      if (tempId && generateData.jobId) {
        setNotes(prev => prev.map(note => 
          note.id === tempId 
            ? { ...note, id: generateData.jobId }
            : note
        ));
      }

      // If folder is selected, move the job to the folder
      if (selectedFolder && generateData.jobId) {
        await handleNoteMove(generateData.jobId, selectedFolder);
      }

      // Start polling for status
      pollJobStatus(generateData.jobId, duration);
      
    } catch (error) {
      console.error('Processing error:', error);
      // Update the temp card to show failed status if it exists
      if (tempId) {
        setNotes(prev => prev.map(note => 
          note.id === tempId 
            ? { ...note, status: 'failed' as NoteStatus }
            : note
        ));
      }
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred during processing",
        variant: "destructive"
      });
    }
  };

  // Separate function to handle text document processing in background
  const startTextProcessing = async (
    uploadData: any, 
    title: string, 
    documentSizeMB: number, 
    tempId?: string
  ) => {
    try {
      // Trigger processing with only PDF (no audio)
      const generatePayload: any = {
        pdfFilePath: uploadData.pdfPath,
        lectureTitle: title,
        courseSubject: '',
        fileSizeMB: documentSizeMB
        // Note: No audioFilePath - this will trigger PDF-only processing
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
        // Update the temp card to show failed status
        if (tempId) {
          setNotes(prev => prev.map(note => 
            note.id === tempId 
              ? { ...note, status: 'failed' as NoteStatus }
              : note
          ));
        }
        throw new Error(error.error || 'Processing failed');
      }

      const generateData = await generateResponse.json();
      console.log('Text processing started:', generateData);

      // Replace the temporary ID with the real job ID
      if (tempId && generateData.jobId) {
        setNotes(prev => prev.map(note => 
          note.id === tempId 
            ? { ...note, id: generateData.jobId }
            : note
        ));
      }

      // If folder is selected, move the job to the folder
      if (selectedFolder && generateData.jobId) {
        await handleNoteMove(generateData.jobId, selectedFolder);
      }

      // Start polling for status (no duration for text documents)
      pollJobStatus(generateData.jobId);
      
    } catch (error) {
      console.error('Text processing error:', error);
      // Update the temp card to show failed status if it exists
      if (tempId) {
        setNotes(prev => prev.map(note => 
          note.id === tempId 
            ? { ...note, status: 'failed' as NoteStatus }
            : note
        ));
      }
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred during processing",
        variant: "destructive"
      });
    }
  };

  const pollJobStatus = async (jobId: string, duration?: number) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/jobs?jobId=${jobId}`);
        const data = await response.json();
        
        if (data.status !== 'processing') {
          clearInterval(interval);
          
          setNotes(prev => prev.map(note => 
            note.id === jobId 
              ? { ...note, status: data.status as NoteStatus }
              : note
          ));

          if (data.status === 'completed') {
            toast({
              title: "Processing complete",
              description: "Your notes are ready to download"
            });
            // Refresh usage data after successful processing
            refreshUserData();
          } else if (data.status === 'failed') {
            toast({
              title: "Processing failed",
              description: data.error || "An error occurred during processing",
              variant: "destructive"
            });
          }
        }
      } catch (error) {
        clearInterval(interval);
      }
    }, 5000);
  };

  // Separate function to handle document processing in background
  const startDocumentProcessing = async (
    uploadData: any, 
    title: string, 
    processingMode: 'enhance' | 'store',
    tempId?: string
  ) => {
    try {
      console.log(`📄 Starting ${processingMode} processing for: ${title}`);
      
      // Call the document processing API instead of generate
      const processResponse = await fetch('/api/process-document', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          documentFilePath: uploadData.pdfPath, // Use the uploaded file path
          documentTitle: title,
          processingMode: processingMode,
          courseSubject: undefined // Add this if you want course support
        })
      });

      if (!processResponse.ok) {
        const error = await processResponse.json();
        // Update the temp card to show failed status
        if (tempId) {
          setNotes(prev => prev.map(note => 
            note.id === tempId 
              ? { ...note, status: 'failed' as NoteStatus }
              : note
          ));
        }
        throw new Error(error.error || 'Document processing failed');
      }

      const processResult = await processResponse.json();
      console.log('✅ Document processing successful:', processResult);

      // Replace the temporary ID with the real job ID and mark as completed
      if (tempId && processResult.jobId) {
        setNotes(prev => prev.map(note => 
          note.id === tempId 
            ? { 
                ...note, 
                id: processResult.jobId,
                status: 'completed' as NoteStatus,
                downloadUrl: processResult.downloadUrl
              }
            : note
        ));
      }

      // If folder is selected, move the job to the folder
      if (selectedFolder && processResult.jobId) {
        await handleNoteMove(processResult.jobId, selectedFolder);
      }
      
      toast({
        title: `${processingMode === 'store' ? 'Document stored' : 'Mindsy Notes generated'}`,
        description: `Document processed successfully in ${processingMode} mode`
      });
      
    } catch (error) {
      console.error('Document processing error:', error);
      // Update the temp card to show failed status if it exists
      if (tempId) {
        setNotes(prev => prev.map(note => 
          note.id === tempId 
            ? { ...note, status: 'failed' as NoteStatus }
            : note
        ));
      }
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred during processing",
        variant: "destructive"
      });
    }
  };

  const handleCreateFolder = async (name: string, description?: string, parentId?: string) => {
    try {
      console.log('Creating folder with params:', { name, description, parentId, parentIdType: typeof parentId });
      
      // Ensure we have clean string values only
      if (typeof name !== 'string') {
        throw new Error('Name must be a string');
      }
      
      if (parentId !== undefined && typeof parentId !== 'string') {
        console.error('parentId is not a string:', parentId);
        throw new Error('parentId must be a string or undefined');
      }
      
      // Create folder in database - only send the data the API expects
      const requestData = {
        name: name.trim(),
        parentId: (typeof parentId === 'string' && parentId.trim()) ? parentId.trim() : null
      };
      
      console.log('Sending request data:', requestData);
      
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create folder');
      }

      const { folder } = await response.json();

      // Add to local state with the returned ID from database
      const newFolder: Folder = {
        id: String(folder.id),
        name: folder.name,
        count: 0,
        parentId: folder.parent_id ? String(folder.parent_id) : undefined,
        subfolders: []
      };

      // If it has a parent, we need to update the parent's subfolders
      if (newFolder.parentId) {
        setFolders(prev => {
          const updated = [...prev];
          const parentFolder = updated.find(f => f.id === newFolder.parentId);
          if (parentFolder) {
            if (!parentFolder.subfolders) {
              parentFolder.subfolders = [];
            }
            parentFolder.subfolders.push(newFolder);
          }
          // Still add to the flat list for easy access
          updated.push(newFolder);
          return updated;
        });
      } else {
        // It's a root folder, just add it
        setFolders(prev => [...prev, newFolder]);
      }
      
      toast({
        title: "Folder created",
        description: `"${name}" has been created successfully`
      });
    } catch (error) {
      console.error('Error creating folder:', error);
      toast({
        title: "Failed to create folder",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const handleRenameFolder = async (id: string, newName: string) => {
    try {
      // Update folder in database
      const response = await fetch(`/api/folders`, {
        method: 'PUT',  // API uses PUT, not PATCH
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id,
          name: newName
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to rename folder');
      }

      // Update local state
      setFolders(prev => prev.map(folder => 
        folder.id === id ? { ...folder, name: newName } : folder
      ));
      
      toast({
        title: "Folder renamed",
        description: `Folder has been renamed to "${newName}"`
      });
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast({
        title: "Failed to rename folder",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const handleDeleteFolder = async (id: string) => {
    try {
      console.log('🗑️ Deleting folder via API:', id);
      
      // Delete folder from database
      const response = await fetch(`/api/folders?id=${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete folder');
      }

      console.log('🗑️ Folder deleted from database, waiting for real-time event...');
      
      // DON'T update local state here - let the real-time event handle it
      // The real-time subscription will trigger handleRealtimeFolderDelete
      // which will properly update both the main folders array and parent's subfolders
      
      // Note: If real-time fails, we might need a fallback, but for now
      // we rely on the real-time event to maintain consistency
      
      toast({
        title: "Folder deleted",
        description: "The folder has been deleted successfully"
      });
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast({
        title: "Failed to delete folder",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive"
      });
    }
  };

  const handleNoteDownload = async (id: string, format: 'pdf' | 'txt' | 'markdown' | 'original' = 'pdf') => {
    try {
      // Find the note to get its title
      const note = notes.find(n => n.id === id);
      const noteTitle = note?.title || 'mindsy-notes';
      
      console.log('Downloading note:', id, 'title:', noteTitle, 'format:', format);
      
      // Map 'markdown' to 'md' for the API, keep 'original' as is
      const apiFormat = format === 'markdown' ? 'md' : format;
      const response = await fetch(`/api/download/${id}?format=${apiFormat}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Download failed:', response.status, errorText);
        throw new Error(`Download failed: ${response.status}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Set appropriate file extension based on format
      const extensions = {
        pdf: 'pdf',
        txt: 'txt',
        markdown: 'md',
        original: 'pdf' // Most originals will be PDFs, let the API handle actual extension
      };
      
      // Create a safe filename by removing special characters and replacing spaces
      const safeTitle = noteTitle
        .replace(/[^a-z0-9\s-]/gi, '') // Remove special characters
        .replace(/\s+/g, '-')           // Replace spaces with hyphens
        .toLowerCase()                  // Convert to lowercase
        .slice(0, 100);                 // Limit length
      
      a.download = `${safeTitle}.${extensions[format]}`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Download started",
        description: `Downloading "${noteTitle}" in ${format.toUpperCase()} format`
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unable to download the notes",
        variant: "destructive"
      });
    }
  };

  const handleNoteRename = async (id: string, newTitle: string) => {
    try {
      // Update the job's title in the database
      const response = await fetch('/api/jobs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobId: id,
          title: newTitle
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Rename failed');
      }
      
      // Update local state
      setNotes(prev => prev.map(note => 
        note.id === id 
          ? { ...note, title: newTitle }
          : note
      ));
      
      toast({
        title: "Note renamed",
        description: `Note renamed to "${newTitle}"`
      });
      
      // Close the modal
      setRenameNoteModalOpen(false);
      setNoteToRename(null);
    } catch (error) {
      console.error('Error renaming note:', error);
      toast({
        title: "Rename failed",
        description: error instanceof Error ? error.message : "Unable to rename the note",
        variant: "destructive"
      });
    }
  };

  const handleNoteDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/delete-note/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) throw new Error('Delete failed');
      
      setNotes(prev => prev.filter(note => note.id !== id));
      
      toast({
        title: "Note deleted",
        description: "The note has been deleted successfully"
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Unable to delete the note",
        variant: "destructive"
      });
    }
  };

  const handleNoteMove = async (noteId: string, targetFolderId: string) => {
    try {
      // Update the job's folder_id in the database
      const response = await fetch('/api/notes/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          jobIds: [noteId],  // API expects an array of job IDs
          folderId: targetFolderId || null  // null for root/unfiled
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Move failed');
      }
      
      const targetFolder = targetFolderId ? folders.find(f => f.id === targetFolderId) : null;
      
      // Update local state
      setNotes(prev => prev.map(note => 
        note.id === noteId 
          ? { 
              ...note, 
              folder: targetFolder ? {
                id: targetFolderId,
                name: targetFolder.name,
                path: getFolderPathString(targetFolderId)
              } : undefined
            }
          : note
      ));
      
      // Update folder counts
      setFolders(prev => prev.map(folder => {
        // Decrease count for old folder
        const oldNote = notes.find(n => n.id === noteId);
        if (oldNote?.folder?.id === folder.id) {
          return { ...folder, count: Math.max(0, folder.count - 1) };
        }
        // Increase count for new folder
        if (folder.id === targetFolderId) {
          return { ...folder, count: folder.count + 1 };
        }
        return folder;
      }));
      
      toast({
        title: "Note moved",
        description: targetFolder ? `Note moved to "${targetFolder.name}"` : "Note removed from folder"
      });
      
      // Close the modal after successful move
      setMoveFolderModalOpen(false);
      setItemToMove(null);
    } catch (error) {
      console.error('Error moving note:', error);
      toast({
        title: "Move failed",
        description: error instanceof Error ? error.message : "Unable to move the note",
        variant: "destructive"
      });
    }
  };

  const handleNavigate = (path: string) => {
    if (path === '/logout') {
      // Handle logout
      window.location.href = '/api/auth/signout';
    } else if (path === '/dashboard/account' || path === 'account') {
      // Show account settings in the main content area
      setCurrentView('account');
      setSelectedFolder(''); // Clear folder selection
    } else if (path === '/dashboard/pomodoro' || path === 'pomodoro') {
      // Show pomodoro timer
      setCurrentView('pomodoro');
      setSelectedFolder(''); // Clear folder selection
    } else if (path === '/dashboard/exams' || path === 'exams') {
      // Show exam center
      setCurrentView('exams');
      setSelectedFolder(''); // Clear folder selection
    } else if (path === '/dashboard/performance' || path === 'performance' || path === '/dashboard/exams/performance') {
      // Show performance analytics
      setCurrentView('performance');
      setSelectedFolder(''); // Clear folder selection
    } else if (path === '/dashboard/studies' || path === 'studies') {
      // Show studies organization
      setCurrentView('studies');
      setSelectedFolder(''); // Clear folder selection
      setSelectedNodeId(''); // Clear node selection
    } else if (path === 'notes') {
      // Show notes view
      setCurrentView('notes');
    } else if (path === '/dashboard') {
      // Navigate to main dashboard
      window.location.href = '/dashboard';
    } else {
      // Navigate to path
      window.location.href = path;
    }
  };

  const handleOpenPdfViewer = (jobId: string) => {
    const note = notes.find(n => n.id === jobId);
    if (note && note.status === 'completed') {
      setSelectedPdf({
        jobId,
        title: note.title,
        format: 'pdf' // Default to processed PDF
      });
      setIsTransitioning(true);
      // Small delay for transition effect
      setTimeout(() => {
        setPdfViewerOpen(true);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleViewOriginalDocument = (jobId: string) => {
    const note = notes.find(n => n.id === jobId);
    if (note && note.status === 'completed') {
      setSelectedPdf({
        jobId,
        title: note.title,
        format: 'original' // View original document
      });
      setViewerMode('pdf'); // Force PDF mode for original documents
      setIsTransitioning(true);
      // Small delay for transition effect
      setTimeout(() => {
        setPdfViewerOpen(true);
        setIsTransitioning(false);
      }, 300);
    }
  };

  const handleClosePdfViewer = () => {
    setIsTransitioning(true);
    setTimeout(() => {
      setPdfViewerOpen(false);
      setSelectedPdf(null);
      setMindMapData(null);
      setViewerMode('markdown');
      setIsTransitioning(false);
    }, 300);
  };

  // Handle mind map view for folders
  const handleViewFolderMindMap = (folderId: string, folderName: string) => {
    setMindMapData({ type: 'folder', id: folderId, title: folderName });
    setViewerMode('mindmap');
    setSelectedPdf(null);
    setIsTransitioning(true);
    
    setTimeout(() => {
      setPdfViewerOpen(true);
      setIsTransitioning(false);
    }, 300);
  };

  // Handle mind map view for notes
  const handleViewNoteMindMap = (noteId: string, noteTitle: string) => {
    setMindMapData({ type: 'note', id: noteId, title: noteTitle });
    setViewerMode('mindmap');
    setSelectedPdf(null);
    setIsTransitioning(true);
    
    setTimeout(() => {
      setPdfViewerOpen(true);
      setIsTransitioning(false);
    }, 300);
  };

  // Handle clicking a node in mind map to open that note
  const handleMindMapNodeClick = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (note && note.status === 'completed') {
      setSelectedPdf({
        jobId: noteId,
        title: note.title,
        format: 'pdf'
      });
      setViewerMode('markdown');
      setMindMapData(null);
    }
  };


  return (
    <PomodoroProvider>
      <SidebarProvider defaultOpen={desktopSidebarOpen} open={desktopSidebarOpen} onOpenChange={setDesktopSidebarOpen}>
        <div className="flex h-screen bg-background">
          {/* Desktop Sidebar */}
          <Sidebar className="hidden lg:flex" collapsible="icon">
            <SidebarContent>
              {currentView === 'exams' ? (
            <ExamSidebar
              user={userState}
              onNavigate={handleNavigate}
              activeSection="dashboard"
              userStats={{
                totalExams: 0,
                currentStreak: 0,
                level: 1,
                xpPoints: 0
              }}
            />
          ) : currentView === 'performance' ? (
            <ExamSidebar
              user={userState}
              onNavigate={handleNavigate}
              activeSection="performance"
              userStats={{
                totalExams: 0,
                currentStreak: 0,
                level: 1,
                xpPoints: 0
              }}
            />
          ) : currentView === 'notes' || currentView === 'pomodoro' || currentView === 'studies' ? (
            <StudiesSidebar
              user={userState}
              selectedNodeId={selectedNodeId}
              currentView={currentView}
              onNodeSelect={setSelectedNodeId}
              onUpload={() => setUploadModalOpen(true)}
              onUploadText={() => setUploadTextModalOpen(true)}
              onNavigate={handleNavigate}
            />
          ) : (
            <AccountSidebar
              user={userState}
              activeSection={activeAccountSection}
              onSectionChange={setActiveAccountSection}
              onNavigate={handleNavigate}
            />
          )}
            </SidebarContent>
          </Sidebar>

      {/* Mobile Sidebar - Sheet overlay */}
      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="default" 
            size="sm" 
            className="lg:hidden fixed bottom-6 left-6 z-50 bg-black hover:bg-gray-800 text-white border-0 shadow-lg rounded-full h-12 w-12 p-0"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0 w-[320px] sm:w-[360px] [&>button]:hidden">
          {currentView === 'exams' ? (
            <ExamSidebar
              user={userState}
              onNavigate={handleNavigate}
              activeSection="dashboard"
              userStats={{
                totalExams: 0,
                currentStreak: 0,
                level: 1,
                xpPoints: 0
              }}
            />
          ) : currentView === 'performance' ? (
            <ExamSidebar
              user={userState}
              onNavigate={handleNavigate}
              activeSection="performance"
              userStats={{
                totalExams: 0,
                currentStreak: 0,
                level: 1,
                xpPoints: 0
              }}
            />
          ) : currentView === 'notes' || currentView === 'pomodoro' || currentView === 'studies' ? (
            <StudiesSidebar
              user={userState}
              selectedNodeId={selectedNodeId}
              currentView={currentView}
              onNodeSelect={(nodeId) => {
                setSelectedNodeId(nodeId);
                setMobileSidebarOpen(false); // Close sidebar after selection
              }}
              onUpload={() => {
                setUploadModalOpen(true);
                setMobileSidebarOpen(false);
              }}
              onUploadText={() => {
                setUploadTextModalOpen(true);
                setMobileSidebarOpen(false);
              }}
              onNavigate={(path) => {
                handleNavigate(path);
                setMobileSidebarOpen(false);
              }}
            />
          ) : (
            <AccountSidebar
              user={userState}
              activeSection={activeAccountSection}
              onSectionChange={(section) => {
                setActiveAccountSection(section);
                setMobileSidebarOpen(false);
              }}
              onNavigate={(path) => {
                handleNavigate(path);
                setMobileSidebarOpen(false);
              }}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Main Content Area - Only content scrolls, not sidebar or header */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <div 
          className={`absolute inset-0 transition-all duration-300 ease-in-out ${
            pdfViewerOpen ? 'opacity-100 z-10 scale-100' : 'opacity-0 z-0 scale-95 pointer-events-none'
          }`}
        >
          {viewerMode === 'mindmap' && mindMapData ? (
            <MindMapViewer
              type={mindMapData.type}
              id={mindMapData.id}
              title={mindMapData.title}
              onClose={handleClosePdfViewer}
              onNodeClick={mindMapData.type === 'folder' ? handleMindMapNodeClick : undefined}
            />
          ) : selectedPdf && (
            viewerMode === 'markdown' ? (
              <MarkdownEditor
                jobId={selectedPdf.jobId}
                title={selectedPdf.title}
                onClose={handleClosePdfViewer}
                onViewModeChange={() => {
                  setPdfVersion(v => v + 1); // Force PDF reload when switching
                  setViewerMode('pdf');
                }}
              />
            ) : (
              <PdfViewer
                key={`pdf-${pdfVersion}`} // Force remount to reload PDF
                jobId={selectedPdf.jobId}
                title={selectedPdf.title}
                format={selectedPdf.format}
                onClose={handleClosePdfViewer}
                onViewModeChange={selectedPdf.format !== 'original' ? () => setViewerMode('markdown') : undefined}
              />
            )
          )}
        </div>
        
        <div 
          className={`h-full transition-all duration-300 ease-in-out ${
            pdfViewerOpen ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
          }`}
        >
          {currentView === 'notes' ? (
            <FolderManager
            notes={notes}
            folders={folders}
            currentFolder={selectedFolder}
            folderPath={getFolderPath(selectedFolder)}
            loading={loading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onFolderNavigate={setSelectedFolder}
            onNoteDownload={handleNoteDownload}
            onNoteDelete={(id) => {
            const note = notes.find(n => n.id === id);
            if (note) {
              setItemToDelete({ id: note.id, name: note.title, type: 'note' });
              setDeleteConfirmOpen(true);
            }
            }}
            onNoteRename={(id) => {
            const note = notes.find(n => n.id === id);
            if (note) {
              setNoteToRename({ id: note.id, title: note.title });
              setRenameNoteModalOpen(true);
            }
            }}
            onNoteMove={(id) => {
            const note = notes.find(n => n.id === id);
            if (note) {
              setItemToMove({ id: note.id, name: note.title, type: 'note' });
              setMoveFolderModalOpen(true);
            }
            }}
            onNoteSelect={(id) => {
              setSelectedNotes(prev => 
                prev.includes(id) 
                  ? prev.filter(n => n !== id)
                  : [...prev, id]
              );
            }}
            onNoteView={handleOpenPdfViewer}
            onViewOriginal={handleViewOriginalDocument}
            selectedNotes={selectedNotes}
            onNoteMindMap={handleViewNoteMindMap}
            onFolderMindMap={handleViewFolderMindMap}
            desktopSidebarOpen={desktopSidebarOpen}
            onDesktopSidebarToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
          />
          ) : currentView === 'account' ? (
            <div className="h-full overflow-auto">
              <AccountSettingsIntegrated 
                user={userState} 
                activeSection={activeAccountSection}
                onSectionChange={setActiveAccountSection}
                onNavigate={handleNavigate}
              />
            </div>
          ) : currentView === 'pomodoro' ? (
            <div className="h-full overflow-auto">
              <PomodoroDashboard 
                onNavigate={handleNavigate}
                desktopSidebarOpen={desktopSidebarOpen}
                onDesktopSidebarToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              />
            </div>
          ) : currentView === 'exams' ? (
            <div className="h-full overflow-auto">
              <ExamDashboard
                initialFolders={folders}
                onNavigate={handleNavigate}
                desktopSidebarOpen={desktopSidebarOpen}
                onDesktopSidebarToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              />
            </div>
          ) : currentView === 'performance' ? (
            <div className="h-full overflow-auto">
              <Performance
                onNavigate={handleNavigate}
                desktopSidebarOpen={desktopSidebarOpen}
                onDesktopSidebarToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
              />
            </div>
          ) : currentView === 'studies' ? (
            <div className="h-full overflow-auto">
              <iframe 
                src="/dashboard/studies" 
                className="w-full h-full border-0"
                title="Studies Organization"
              />
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      <UploadModal
        open={uploadModalOpen}
        onOpenChange={setUploadModalOpen}
        onUpload={handleUpload}
      />

      <TextUploadModal
        open={uploadTextModalOpen}
        onOpenChange={setUploadTextModalOpen}
        onUpload={handleTextUpload}
      />

      <CreateFolderModal
        open={createFolderModalOpen}
        onOpenChange={(open) => {
          setCreateFolderModalOpen(open);
          if (!open) setCreateFolderParentId(''); // Reset parent when closing
        }}
        onCreateFolder={handleCreateFolder}
        folders={folders}
        currentFolderId={createFolderParentId}
      />

      <RenameFolderModal
        open={renameFolderModalOpen}
        onOpenChange={setRenameFolderModalOpen}
        folder={folderToRename}
        onRenameFolder={handleRenameFolder}
      />

      <RenameNoteModal
        open={renameNoteModalOpen}
        onOpenChange={setRenameNoteModalOpen}
        note={noteToRename}
        onRenameNote={handleNoteRename}
      />

      <MoveToFolderModal
        open={moveFolderModalOpen}
        onOpenChange={setMoveFolderModalOpen}
        folders={folders}
        currentFolderId={itemToMove?.type === 'note' 
          ? notes.find(n => n.id === itemToMove.id)?.folder?.id
          : undefined
        }
        itemName={itemToMove?.name || ''}
        itemType={itemToMove?.type || 'note'}
        onMove={(targetFolderId) => {
          if (itemToMove?.type === 'note') {
            handleNoteMove(itemToMove.id, targetFolderId);
          }
        }}
      />

      <DeleteConfirmation
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        itemName={itemToDelete?.name || ''}
        itemType={itemToDelete?.type || 'note'}
        onConfirm={() => {
          if (itemToDelete) {
            if (itemToDelete.type === 'folder') {
              handleDeleteFolder(itemToDelete.id);
            } else {
              handleNoteDelete(itemToDelete.id);
            }
          }
          setDeleteConfirmOpen(false);
        }}
      />

      <Toaster />
        </div>
      </SidebarProvider>
    </PomodoroProvider>
  );
}