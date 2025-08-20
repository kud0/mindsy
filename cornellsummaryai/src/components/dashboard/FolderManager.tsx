import React, { useState, useRef } from 'react';
import { NoteCard } from './NoteCard';
import { UploadDrawer } from './UploadDrawer';
import type { NoteStatus } from './NoteCard';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { 
  Search, 
  Grid3x3, 
  List, 
  SortAsc, 
  Filter,
  FolderOpen,
  ChevronRight,
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
  PanelLeftOpen,
  PanelLeftClose,
  GraduationCap
} from 'lucide-react';
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

interface Note {
  id: string;
  title: string;
  createdAt: Date | string;
  status: NoteStatus;
  folder?: {
    id: string;
    name: string;
  };
  duration?: string;
  attachmentCount?: number;
  hasOriginalDocument?: boolean; // Flag to indicate if original document is available
}

interface Folder {
  id: string;
  name: string;
  parentId?: string;
}

interface FolderManagerProps {
  notes: Note[];
  folders: Folder[];
  currentFolder?: string;
  folderPath?: { id: string; name: string }[];
  loading?: boolean;
  viewMode?: 'grid' | 'list';
  onViewModeChange?: (mode: 'grid' | 'list') => void;
  onFolderNavigate: (folderId: string) => void;
  onNoteDownload: (id: string, format?: 'pdf' | 'txt' | 'markdown' | 'original') => void;
  onNoteDelete: (id: string) => void;
  onNoteRename: (id: string) => void;
  onNoteMove: (id: string) => void;
  onNoteSelect?: (id: string) => void;
  onNoteView?: (id: string) => void;
  onViewOriginal?: (id: string) => void;
  selectedNotes?: string[];
  onNoteMindMap?: (id: string, title: string) => void;
  onFolderMindMap?: (id: string, name: string) => void;
  // Desktop sidebar toggle
  desktopSidebarOpen?: boolean;
  onDesktopSidebarToggle?: () => void;
}

export function FolderManager({
  notes,
  folders,
  currentFolder,
  folderPath = [],
  loading = false,
  viewMode = 'grid',
  onViewModeChange,
  onFolderNavigate,
  onNoteDownload,
  onNoteDelete,
  onNoteRename,
  onNoteMove,
  onNoteSelect,
  onNoteView,
  onViewOriginal,
  selectedNotes = [],
  onNoteMindMap,
  onFolderMindMap,
  desktopSidebarOpen,
  onDesktopSidebarToggle
}: FolderManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'status'>('date');
  const [filterStatus, setFilterStatus] = useState<'all' | NoteStatus>('all');
  const [draggedNote, setDraggedNote] = useState<string | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);

  // Filter and sort notes
  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || note.status === filterStatus;
    
    // Handle folder filtering
    let matchesFolder = true;
    if (currentFolder === '') {
      // Show all notes
      matchesFolder = true;
    } else if (currentFolder === 'unfiled') {
      // Show only notes without a folder
      matchesFolder = !note.folder;
    } else {
      // Show only notes in the selected folder
      matchesFolder = note.folder?.id === currentFolder;
    }
    
    return matchesSearch && matchesStatus && matchesFolder;
  });

  const sortedNotes = [...filteredNotes].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.title.localeCompare(b.title);
      case 'status':
        return a.status.localeCompare(b.status);
      case 'date':
      default:
        const aDate = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
        const bDate = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
        return bDate.getTime() - aDate.getTime();
    }
  });

  // Don't show any folder cards - only show notes
  const subfolders: Folder[] = [];

  // Drag and drop handlers
  const handleNoteDragStart = (noteId: string) => {
    setDraggedNote(noteId);
  };

  const handleNoteDragEnd = () => {
    setDraggedNote(null);
    setDragOverFolder(null);
  };

  const handleFolderDragOver = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    setDragOverFolder(folderId);
  };

  const handleFolderDragLeave = () => {
    setDragOverFolder(null);
  };

  const handleFolderDrop = (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    if (draggedNote) {
      onNoteMove(draggedNote);
      // In real implementation, you'd pass the target folder ID
    }
    setDraggedNote(null);
    setDragOverFolder(null);
  };

  const renderBreadcrumb = () => {
    if (!folderPath.length) return null;

    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              className="cursor-pointer"
              onClick={() => onFolderNavigate('')}
            >
              All Notes
            </BreadcrumbLink>
          </BreadcrumbItem>
          {folderPath.map((folder, index) => (
            <React.Fragment key={folder.id}>
              <BreadcrumbSeparator>
                <ChevronRight className="h-4 w-4" />
              </BreadcrumbSeparator>
              <BreadcrumbItem>
                {index === folderPath.length - 1 ? (
                  <BreadcrumbPage>{folder.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    className="cursor-pointer"
                    onClick={() => onFolderNavigate(folder.id)}
                  >
                    {folder.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  const renderFolderCard = (folder: Folder) => (
    <div
      key={folder.id}
      className={cn(
        "p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors",
        dragOverFolder === folder.id && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => onFolderNavigate(folder.id)}
      onDragOver={(e) => handleFolderDragOver(e, folder.id)}
      onDragLeave={handleFolderDragLeave}
      onDrop={(e) => handleFolderDrop(e, folder.id)}
    >
      <div className="flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-blue-500" />
        <span className="font-medium">{folder.name}</span>
      </div>
    </div>
  );

  const getStatusIcon = (status: NoteStatus) => {
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

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };

  const renderNoteRow = (note: Note) => (
    <div
      key={note.id}
      className={cn(
        "flex items-center gap-2 sm:gap-4 p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer w-full max-w-full min-w-0 overflow-hidden",
        selectedNotes.includes(note.id) && "ring-2 ring-primary bg-primary/5"
      )}
      onClick={() => {
        // If the note is completed, open PDF viewer, otherwise just select
        if (note.status === 'completed' && onNoteView) {
          onNoteView(note.id);
        } else {
          onNoteSelect?.(note.id);
        }
      }}
      draggable
      onDragStart={() => handleNoteDragStart(note.id)}
      onDragEnd={handleNoteDragEnd}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon(note.status)}
      </div>
      
      {/* Title and Date - Mobile optimized */}
      <div className="flex-1 min-w-0 pr-2 max-w-[calc(100vw-120px)] sm:max-w-none">
        <div className="font-medium text-sm" title={note.title}>
          {/* Truncate long titles on mobile, show full on desktop */}
          <span className="sm:hidden block truncate max-w-[200px]">
            {note.title.length > 30 ? `${note.title.slice(0, 30)}...` : note.title}
          </span>
          <span className="hidden sm:inline truncate">
            {note.title}
          </span>
        </div>
        <div className="flex items-center gap-1 sm:gap-2 text-xs text-muted-foreground mt-0.5 overflow-hidden">
          <span className="flex-shrink-0">{formatDate(note.createdAt)}</span>
          {/* Show folder and duration inline on mobile */}
          {note.folder && (
            <>
              <span className="flex-shrink-0 sm:hidden">•</span>
              <div className="sm:hidden flex items-center gap-1 min-w-0">
                <Folder className="h-3 w-3 text-blue-500 flex-shrink-0" />
                <span className="truncate max-w-12">{note.folder.name}</span>
              </div>
            </>
          )}
          {note.duration && (
            <>
              <span className="flex-shrink-0 sm:hidden">•</span>
              <span className="flex-shrink-0 sm:hidden font-mono text-amber-600 dark:text-amber-400">{note.duration}</span>
            </>
          )}
        </div>
      </div>
      
      {/* Folder - Desktop only */}
      {note.folder && (
        <div className="flex-shrink-0 hidden sm:flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-xs">
          <Folder className="h-3 w-3 text-blue-500" />
          <span className="text-slate-700 dark:text-slate-300 max-w-20 truncate" title={note.folder.path || note.folder.name}>
            {note.folder.path || note.folder.name}
          </span>
        </div>
      )}
      
      {/* Duration - Desktop only */}
      {note.duration && (
        <div className="flex-shrink-0 hidden sm:block text-xs font-mono bg-amber-50 dark:bg-amber-900/20 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800">
          {note.duration}
        </div>
      )}
      
      {/* Actions */}
      <div className="flex-shrink-0 ml-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 opacity-70 hover:opacity-100"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuSub>
              <DropdownMenuSubTrigger disabled={note.status !== 'completed'}>
                <Download className="mr-2 h-4 w-4" />
                <span>Download</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onNoteDownload(note.id, 'pdf');
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>PDF Format</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onNoteDownload(note.id, 'txt');
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Text Format</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onNoteDownload(note.id, 'markdown');
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  <span>Markdown Format</span>
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                if (onNoteMindMap) {
                  onNoteMindMap(note.id, note.title);
                }
              }}
              disabled={note.status !== 'completed'}
            >
              <Map className="mr-2 h-4 w-4" />
              View Mind Map
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                if (onViewOriginal) {
                  onViewOriginal(note.id);
                }
              }}
              disabled={note.status !== 'completed' || !note.hasOriginalDocument}
            >
              <FileText className="mr-2 h-4 w-4" />
              View Original PDF
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onNoteRename(note.id);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Rename
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onNoteMove(note.id);
              }}
            >
              <Move className="mr-2 h-4 w-4" />
              Move to Folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={(e) => {
                e.stopPropagation();
                onNoteDelete(note.id);
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
  );

  const renderContent = () => {
    if (loading) {
      return (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-2"
        )}>
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      );
    }

    if (!sortedNotes.length && !subfolders.length) {
      return (
        <div className="text-center py-12">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-2 text-sm font-medium">No notes or folders</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload an audio file to get started
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Subfolders */}
        {subfolders.length > 0 && (
          <div>
            <h3 className="text-sm font-medium mb-2 text-muted-foreground">Folders</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {subfolders.map(renderFolderCard)}
            </div>
          </div>
        )}

        {/* Notes */}
        {sortedNotes.length > 0 && (
          <div>
            {subfolders.length > 0 && (
              <h3 className="text-sm font-medium mb-2 text-muted-foreground">Notes</h3>
            )}
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                {sortedNotes.map(note => (
                  <div
                    key={note.id}
                    draggable
                    onDragStart={() => handleNoteDragStart(note.id)}
                    onDragEnd={handleNoteDragEnd}
                    className={cn(
                      "cursor-move",
                      draggedNote === note.id && "opacity-50"
                    )}
                  >
                    <NoteCard
                      key={note.id}
                      {...note}
                      onDownload={onNoteDownload}
                      onDelete={onNoteDelete}
                      onRename={onNoteRename}
                      onMove={onNoteMove}
                      onSelect={onNoteSelect}
                      onView={onNoteView}
                      onViewOriginal={onViewOriginal}
                      onMindMap={onNoteMindMap}
                      isSelected={selectedNotes.includes(note.id)}
                      isDocumentNote={note.hasOriginalDocument} // Use explicit flag
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2 w-full overflow-hidden">
                {sortedNotes.map(note => (
                  <div
                    key={note.id}
                    className={cn(
                      "w-full max-w-full",
                      draggedNote === note.id && "opacity-50"
                    )}
                  >
                    {renderNoteRow(note)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content - Scrollable */}
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="p-6">
          {/* Top Controls */}
          <div className="flex items-center justify-between mb-6">
            {/* Breadcrumb */}
            <div className="flex-1">
              {renderBreadcrumb()}
            </div>
            
            {/* Controls */}
            <div className="flex items-center gap-2 ml-4">
              {/* Filters */}
              <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                <SelectTrigger className="w-[140px]">
                  <SortAsc className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="status">Status</SelectItem>
                </SelectContent>
              </Select>

              {/* View Mode Toggle */}
              <div className="flex gap-1 border rounded-md p-1">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange?.('grid')}
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => onViewModeChange?.('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              
              {/* Exam Button - Show when folder is selected */}
              {currentFolder && currentFolder !== '' && currentFolder !== 'unfiled' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const folderName = folders.find(f => f.id === currentFolder)?.name || 'Folder';
                    window.location.href = `/dashboard/exams?folder=${currentFolder}&name=${encodeURIComponent(folderName)}`;
                  }}
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Create Exam
                </Button>
              )}
            </div>
          </div>
          
          {renderContent()}
        </div>
      </div>
    </div>
  );
}