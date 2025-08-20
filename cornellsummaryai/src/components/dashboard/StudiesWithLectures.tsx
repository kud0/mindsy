import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth-sync';
import StudiesManager from './StudiesManager';
import { PdfViewer } from './PdfViewer';
import { EnhancedUploadButton } from './EnhancedUploadButton';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
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
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuTrigger, ContextMenuSeparator } from '@/components/ui/context-menu';
import { 
  FileText, 
  Download, 
  Eye, 
  Search,
  Calendar,
  Clock,
  BookOpen,
  GraduationCap,
  FolderOpen,
  ChevronRight,
  CheckCircle,
  AlertCircle,
  XCircle,
  Edit3,
  Paperclip,
  Archive,
  FileText as OriginalDoc,
  Trash2,
  ArrowUpDown,
  CheckSquare,
  Square,
  X,
  Grid3X3,
  List
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Note {
  job_id: string;
  lecture_title: string;
  course_subject: string | null;
  created_at: string;
  status: string;
  study_node_id: string | null;
}

interface StudyNode {
  id: string;
  name: string;
  type: 'course' | 'year' | 'subject' | 'semester' | 'custom';
  parent_id: string | null;
}

export default function StudiesWithLectures() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<StudyNode | null>(null);
  const [allLectures, setAllLectures] = useState<Note[]>([]);
  const [deletingLectureIds, setDeletingLectureIds] = useState<Set<string>>(new Set());
  const [pendingDeletions, setPendingDeletions] = useState<Map<string, NodeJS.Timeout>>(new Map());
  const [lecturesLoading, setLecturesLoading] = useState(false);
  
  // Selection mode state
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedLectureIds, setSelectedLectureIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'status'>('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');
  const [draggedLecture, setDraggedLecture] = useState<Note | null>(null);
  const [draggedSelectedLectures, setDraggedSelectedLectures] = useState<string[]>([]);
  const [nodePath, setNodePath] = useState<StudyNode[]>([]);
  const [allStudyNodes, setAllStudyNodes] = useState<StudyNode[]>([]);
  
  // PDF Viewer state
  const [selectedLecture, setSelectedLecture] = useState<Note | null>(null);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfFormat, setPdfFormat] = useState<'pdf' | 'original'>('pdf');
  
  // Context menu and dialog states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [lectureToRename, setLectureToRename] = useState<Note | null>(null);
  const [newLectureName, setNewLectureName] = useState('');
  
  // Resizable panel states
  const [sidebarWidth, setSidebarWidth] = useState(600); // Start at max width
  const [isResizing, setIsResizing] = useState(false);

  // Fetch ALL lectures on component mount
  useEffect(() => {
    fetchAllLectures();
  }, []);

  // Cleanup pending deletions on unmount
  useEffect(() => {
    return () => {
      // Clear all pending deletion timeouts
      pendingDeletions.forEach(timeout => clearTimeout(timeout));
    };
  }, [pendingDeletions]);

  // Fetch node details when selected node changes
  useEffect(() => {
    if (selectedNodeId) {
      fetchNodeDetails(selectedNodeId);
    } else {
      setSelectedNode(null);
      setNodePath([]);
    }
  }, [selectedNodeId]);

  // Handle mouse resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      // Calculate new width based on mouse position
      const newWidth = Math.min(Math.max(e.clientX, 280), 600); // Min 280px, Max 600px
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

  const fetchNodeDetails = async (nodeId: string) => {
    try {
      const { data: node, error } = await supabase
        .from('study_nodes')
        .select('*')
        .eq('id', nodeId)
        .single();

      if (error) throw error;
      setSelectedNode(node);

      // Fetch path
      const path: StudyNode[] = [node];
      let currentNode = node;
      
      while (currentNode.parent_id) {
        const { data: parent } = await supabase
          .from('study_nodes')
          .select('*')
          .eq('id', currentNode.parent_id)
          .single();
        
        if (parent) {
          path.unshift(parent);
          currentNode = parent;
        } else {
          break;
        }
      }
      
      setNodePath(path);
    } catch (error) {
      console.error('Error fetching node details:', error);
    }
  };

  const fetchAllLectures = async () => {
    try {
      setLecturesLoading(true);
      
      const user = await getAuthenticatedUser();
      if (!user) return;

      // Fetch ALL lectures for the user (including processing, completed, failed)
      const { data: lectures, error } = await supabase
        .from('jobs')
        .select('job_id, lecture_title, course_subject, created_at, status, study_node_id')
        .eq('user_id', user.id)
        .in('status', ['processing', 'completed', 'failed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAllLectures(lectures || []);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      toast.error('Failed to load lectures');
    } finally {
      setLecturesLoading(false);
    }
  };

  // Handle moving lectures to folders via drag & drop
  const handleLectureDrop = async (lectureId: string, targetNodeId: string) => {
    console.log('handleLectureDrop called with:', { lectureId, targetNodeId });
    try {
      // Convert empty string to null for database
      const nodeId = targetNodeId === "" ? null : targetNodeId;
      console.log('Using nodeId:', nodeId);
      
      const { error } = await supabase
        .from('jobs')
        .update({ study_node_id: nodeId })
        .eq('job_id', lectureId);

      if (error) throw error;

      // Update local state
      setAllLectures(prev => prev.map(lecture => 
        lecture.job_id === lectureId 
          ? { ...lecture, study_node_id: targetNodeId }
          : lecture
      ));

      toast.success('Lecture moved successfully');
      
    } catch (error) {
      console.error('Error moving lecture (single):', error);
      toast.error('Failed to move lecture');
    }
  };

  // Handle bulk move of selected lectures to folder
  const handleBulkLectureDrop = async (lectureIds: string[], targetNodeId: string) => {
    console.log('handleBulkLectureDrop called with:', { lectureIds, targetNodeId });
    try {
      // Convert empty string to null for database
      const nodeId = targetNodeId === "" ? null : targetNodeId;
      console.log('Using nodeId:', nodeId);
      
      const { error } = await supabase
        .from('jobs')
        .update({ study_node_id: nodeId })
        .in('job_id', lectureIds);

      if (error) throw error;

      // Update local state
      setAllLectures(prev => prev.map(lecture => 
        lectureIds.includes(lecture.job_id)
          ? { ...lecture, study_node_id: nodeId }
          : lecture
      ));

      // Clear selection after successful move
      setSelectedLectureIds(new Set());
      setIsSelectionMode(false);

      const message = lectureIds.length === 1 
        ? 'Lecture moved successfully' 
        : `${lectureIds.length} lectures moved successfully`;
      toast.success(message);
      
    } catch (error) {
      console.error('Error moving lectures (bulk):', error);
      toast.error('Failed to move lectures');
    }
  };

  // Old function - keeping for reference but not using
  const fetchNotesForNode = async (nodeId: string, includeDescendants = true) => {
    try {
      setLecturesLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let noteIds = [nodeId];

      if (includeDescendants) {
        // Get all descendant nodes
        const { data: descendants } = await supabase
          .from('study_nodes')
          .select('id')
          .eq('user_id', user.id);
        
        // Build tree to find all descendants
        const findDescendants = (parentId: string, nodes: any[]): string[] => {
          const children = nodes.filter(n => n.parent_id === parentId);
          let ids = children.map(c => c.id);
          children.forEach(child => {
            ids = [...ids, ...findDescendants(child.id, nodes)];
          });
          return ids;
        };

        if (descendants) {
          const descendantIds = findDescendants(nodeId, descendants);
          noteIds = [...noteIds, ...descendantIds];
        }
      }

      // Get notes for this study node and descendants
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .in('study_node_id', noteIds)
        .in('status', ['processing', 'completed', 'failed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setNotesLoading(false);
    }
  };

  const handleNoteView = (noteId: string) => {
    window.location.href = `/dashboard/notes?note=${noteId}`;
  };

  const handleNoteDownload = (noteId: string) => {
    window.open(`/api/download/${noteId}?format=pdf`, '_blank');
  };

  const handleLectureView = (lecture: Note) => {
    setSelectedLecture(lecture);
    // Set initial format based on lecture status
    const initialFormat = lecture.status === 'completed' ? 'pdf' : 'original';
    setPdfFormat(initialFormat);
    setShowPdfViewer(true);
  };

  const handleClosePdfViewer = () => {
    setShowPdfViewer(false);
    setSelectedLecture(null);
    setPdfFormat('pdf'); // Reset to default
  };

  const handleTogglePdfFormat = () => {
    setPdfFormat(current => current === 'pdf' ? 'original' : 'pdf');
  };

  // Context menu handlers
  const handleRenameClick = (lecture: Note) => {
    setLectureToRename(lecture);
    setNewLectureName(lecture.lecture_title);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = async () => {
    if (!lectureToRename || !newLectureName.trim()) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ lecture_title: newLectureName.trim() })
        .eq('job_id', lectureToRename.job_id);

      if (error) throw error;

      // Update local state
      setAllLectures(prev => prev.map(lecture => 
        lecture.job_id === lectureToRename.job_id 
          ? { ...lecture, lecture_title: newLectureName.trim() }
          : lecture
      ));

      toast.success('Lecture renamed successfully');
      setRenameDialogOpen(false);
      setLectureToRename(null);
      setNewLectureName('');
    } catch (error) {
      console.error('Error renaming lecture:', error);
      toast.error('Failed to rename lecture');
    }
  };

  const handleAttachFiles = (lecture: Note) => {
    // Navigate to attachment management - could be enhanced with a modal
    window.location.href = `/dashboard/notes?note=${lecture.job_id}`;
  };

  const handleDownloadZip = async (lecture: Note) => {
    try {
      const response = await fetch(`/api/download/${lecture.job_id}?format=zip`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lecture.lecture_title}_complete.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Download started');
    } catch (error) {
      console.error('Error downloading zip:', error);
      toast.error('Download failed - ZIP format may not be available');
    }
  };

  const handleViewOriginal = (lecture: Note) => {
    setSelectedLecture(lecture);
    setPdfFormat('original');
    setShowPdfViewer(true);
  };

  const handleDeleteClick = (lecture: Note) => {
    console.log('🗑️ Delete clicked for:', lecture.lecture_title);
    
    // Start the deletion animation immediately
    setDeletingLectureIds(prev => new Set(prev).add(lecture.job_id));
    
    // Create timeout for actual deletion
    const deletionTimeout = setTimeout(() => {
      performActualDeletion(lecture);
    }, 5000); // 5 seconds to undo
    
    // Store the timeout so we can cancel it
    setPendingDeletions(prev => new Map(prev).set(lecture.job_id, deletionTimeout));
    
    // Show toast with undo option
    toast.error(`Deleting "${lecture.lecture_title}"`, {
      description: 'This action will be completed in 5 seconds.',
      action: {
        label: 'Undo',
        onClick: () => {
          console.log('🔄 Undo deletion for:', lecture.lecture_title);
          cancelDeletion(lecture.job_id);
        },
      },
      duration: 5000,
    });
  };

  const cancelDeletion = (jobId: string) => {
    console.log('🔄 Cancelling deletion for job:', jobId);
    
    // Clear the deletion timeout
    const timeout = pendingDeletions.get(jobId);
    if (timeout) {
      clearTimeout(timeout);
      setPendingDeletions(prev => {
        const newMap = new Map(prev);
        newMap.delete(jobId);
        return newMap;
      });
    }
    
    // Remove from deleting state (stop animation)
    setDeletingLectureIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(jobId);
      return newSet;
    });
    
    toast.success('Deletion cancelled');
  };

  // Selection mode handlers
  const toggleSelectionMode = () => {
    setIsSelectionMode(!isSelectionMode);
    setSelectedLectureIds(new Set()); // Clear selections when toggling
  };

  const toggleLectureSelection = (lectureId: string) => {
    setSelectedLectureIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(lectureId)) {
        newSet.delete(lectureId);
      } else {
        newSet.add(lectureId);
      }
      return newSet;
    });
  };

  const selectAllLectures = () => {
    const allCurrentLectureIds = new Set(filteredLectures.map(lecture => lecture.job_id));
    setSelectedLectureIds(allCurrentLectureIds);
  };

  const clearAllSelections = () => {
    setSelectedLectureIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedLectureIds.size === 0) return;
    
    const selectedLectures = filteredLectures.filter(lecture => 
      selectedLectureIds.has(lecture.job_id)
    );
    
    // Start deletion animation for all selected lectures
    setDeletingLectureIds(prev => {
      const newSet = new Set(prev);
      selectedLectures.forEach(lecture => newSet.add(lecture.job_id));
      return newSet;
    });

    // Create timeout for bulk deletion
    const bulkTimeout = setTimeout(() => {
      selectedLectures.forEach(lecture => performActualDeletion(lecture));
    }, 5000);

    // Store timeout for each lecture
    setPendingDeletions(prev => {
      const newMap = new Map(prev);
      selectedLectures.forEach(lecture => {
        newMap.set(lecture.job_id, bulkTimeout);
      });
      return newMap;
    });

    // Show bulk toast
    toast.error(`Deleting ${selectedLectures.length} lectures`, {
      description: 'This action will be completed in 5 seconds.',
      action: {
        label: 'Undo',
        onClick: () => {
          console.log('🔄 Undo bulk deletion');
          cancelBulkDeletion(selectedLectures.map(l => l.job_id));
        },
      },
      duration: 5000,
    });

    // Exit selection mode
    setIsSelectionMode(false);
    setSelectedLectureIds(new Set());
  };

  const cancelBulkDeletion = (jobIds: string[]) => {
    console.log('🔄 Cancelling bulk deletion for jobs:', jobIds);
    
    // Clear timeouts and pending deletions
    jobIds.forEach(jobId => {
      const timeout = pendingDeletions.get(jobId);
      if (timeout) {
        clearTimeout(timeout);
      }
    });

    setPendingDeletions(prev => {
      const newMap = new Map(prev);
      jobIds.forEach(jobId => newMap.delete(jobId));
      return newMap;
    });
    
    // Remove from deleting state
    setDeletingLectureIds(prev => {
      const newSet = new Set(prev);
      jobIds.forEach(jobId => newSet.delete(jobId));
      return newSet;
    });
    
    toast.success('Bulk deletion cancelled');
  };

  const performActualDeletion = async (lecture: Note) => {
    console.log('✅ Performing actual deletion for:', lecture.lecture_title);
    console.log('🎯 Job ID to delete:', lecture.job_id);
    
    try {
      // Use the existing DELETE API endpoint
      const response = await fetch(`/api/delete-note/${lecture.job_id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        // Remove from deleting state on error
        setDeletingLectureIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(lecture.job_id);
          return newSet;
        });
        // Clear pending deletion
        setPendingDeletions(prev => {
          const newMap = new Map(prev);
          newMap.delete(lecture.job_id);
          return newMap;
        });
        throw new Error(errorData.error || 'Failed to delete lecture');
      }

      const result = await response.json();
      console.log('✅ API Success:', result);

      // Wait for animation to complete before removing from state
      setTimeout(() => {
        setAllLectures(prev => {
          console.log('🔍 Before deletion - lecture count:', prev.length);
          console.log('🎯 Looking for lecture ID to remove:', lecture.job_id);
          const filtered = prev.filter(l => l.job_id !== lecture.job_id);
          console.log('📝 After deletion - lecture count:', filtered.length);
          return filtered;
        });
        
        // Remove from deleting state
        setDeletingLectureIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(lecture.job_id);
          return newSet;
        });
        
        // Clear pending deletion
        setPendingDeletions(prev => {
          const newMap = new Map(prev);
          newMap.delete(lecture.job_id);
          return newMap;
        });
      }, 300); // Match animation duration
      
      console.log('📝 Deletion animation started');
      
      toast.success('Lecture deleted successfully');
    } catch (error) {
      console.error('❌ Error deleting lecture:', error);
      toast.error(`Failed to delete lecture: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };



  const handleUploadSuccess = async (jobId: string, fileName: string) => {
    console.log('🔄 handleUploadSuccess called with:', { jobId, fileName, selectedNodeId });
    
    // Add the new job optimistically to the UI immediately
    const optimisticJob = {
      job_id: jobId,
      lecture_title: fileName.replace(/\.[^/.]+$/, ''), // Remove file extension
      course_subject: null,
      created_at: new Date().toISOString(),
      status: 'processing' as const,
      study_node_id: selectedNodeId
    };
    
    console.log('✨ Adding optimistic job to UI:', optimisticJob);
    
    // Add to the beginning of the list, but first remove any existing job with same ID to prevent duplicates
    setAllLectures(prev => {
      console.log('📋 Current lectures count:', prev.length);
      
      // Remove any existing job with the same ID (in case of duplicate calls)
      const filteredPrev = prev.filter(lecture => lecture.job_id !== jobId);
      const newList = [optimisticJob, ...filteredPrev];
      
      console.log('📋 New lectures count:', newList.length);
      return newList;
    });
    
    console.log('✅ Optimistic job added, scheduling refresh...');
    
    // Small delay to ensure database transaction is committed, then refresh with real data
    setTimeout(async () => {
      console.log('🔄 Running delayed fetchAllLectures...');
      await fetchAllLectures();
    }, 2000); // Increased delay to ensure database write is complete
    
    toast.success('Upload successful! Your lecture has been added.');
  };

  // Get all descendant node IDs for a given parent node
  const getAllDescendantIds = (parentId: string, allNodes: StudyNode[]): string[] => {
    const descendants = [parentId]; // Include the parent itself
    
    const findChildren = (nodeId: string) => {
      const children = allNodes.filter(node => node.parent_id === nodeId);
      children.forEach(child => {
        descendants.push(child.id);
        findChildren(child.id); // Recursively find grandchildren
      });
    };
    
    findChildren(parentId);
    return descendants;
  };

  const filteredLectures = allLectures.filter(lecture => {
    // First filter by selected folder (including all descendant folders)
    if (selectedNodeId) {
      if (!lecture.study_node_id) {
        return false; // No folder assigned
      }
      
      // Get all descendant folder IDs for the selected folder
      const allowedFolderIds = getAllDescendantIds(selectedNodeId, allStudyNodes);
      
      if (!allowedFolderIds.includes(lecture.study_node_id)) {
        return false;
      }
    }
    
    // Then filter by search query
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      lecture.lecture_title?.toLowerCase().includes(query) ||
      lecture.course_subject?.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    // Apply sorting
    switch (sortBy) {
      case 'date-desc':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'date-asc':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'name-asc':
        return a.lecture_title.localeCompare(b.lecture_title);
      case 'name-desc':
        return b.lecture_title.localeCompare(a.lecture_title);
      case 'status':
        // Sort by status: completed first, then processing, then failed
        const statusOrder = { completed: 0, processing: 1, failed: 2 };
        const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 3;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        // If same status, sort by date (newest first)
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  // Pastel color palette for folders
  const folderColors = [
    'border-l-rose-300',      // Soft pink
    'border-l-blue-300',      // Soft blue  
    'border-l-green-300',     // Soft green
    'border-l-yellow-300',    // Soft yellow
    'border-l-purple-300',    // Soft purple
    'border-l-indigo-300',    // Soft indigo
    'border-l-pink-300',      // Soft pink
    'border-l-cyan-300',      // Soft cyan
    'border-l-emerald-300',   // Soft emerald
    'border-l-orange-300',    // Soft orange
    'border-l-violet-300',    // Soft violet
    'border-l-teal-300',      // Soft teal
  ];

  // Map color values to border classes
  const colorToBorderClass: Record<string, string> = {
    rose: 'border-l-rose-300',
    blue: 'border-l-blue-300',
    green: 'border-l-green-300',
    yellow: 'border-l-yellow-300',
    purple: 'border-l-purple-300',
    indigo: 'border-l-indigo-300',
    pink: 'border-l-pink-300',
    cyan: 'border-l-cyan-300',
    emerald: 'border-l-emerald-300',
    orange: 'border-l-orange-300',
    violet: 'border-l-violet-300',
    teal: 'border-l-teal-300',
  };

  // Get the border color for a lecture based on its folder
  const getLectureBorderColor = (lecture: Note): string => {
    if (!lecture.study_node_id) {
      return 'border-l-gray-300'; // Default for lectures without folder
    }
    
    // Find the folder from allStudyNodes
    const folder = allStudyNodes.find(node => node.id === lecture.study_node_id);
    if (folder && folder.color && colorToBorderClass[folder.color]) {
      return colorToBorderClass[folder.color];
    }
    
    // Fallback to blue if no color set
    return 'border-l-blue-300';
  };

  const typeIcons = {
    course: GraduationCap,
    year: Calendar,
    subject: BookOpen,
    semester: FolderOpen,
    custom: FolderOpen
  };

  const typeColors = {
    course: 'text-blue-600',
    year: 'text-green-600',
    subject: 'text-purple-600',
    semester: 'text-orange-600',
    custom: 'text-gray-600'
  };

  return (
    <div className="relative flex h-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Panel - Study Folders */}
      <div 
        className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-y-auto"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div 
          className="px-2 py-1"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            
            // Handle bulk drop on unfiled area first
            if (draggedSelectedLectures && draggedSelectedLectures.length > 0) {
              handleBulkLectureDrop(draggedSelectedLectures, '');
              setDraggedSelectedLectures([]);
              return;
            }
            
            // Handle single lecture drop on unfiled area
            if (draggedLecture) {
              handleLectureDrop(draggedLecture.job_id, '');
              setDraggedLecture(null);
            }
          }}
        >
          <StudiesManager 
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
            draggedLecture={draggedLecture}
            draggedSelectedLectures={draggedSelectedLectures}
            onLectureDrop={handleLectureDrop}
            onBulkLectureDrop={handleBulkLectureDrop}
            onDragEnd={() => {
              console.log('Drag end - clearing states');
              setDraggedLecture(null);
              setDraggedSelectedLectures([]);
            }}
            onNodesLoaded={setAllStudyNodes}
          />
        </div>
      </div>

      {/* Resizer Handle */}
      <div
        className={cn(
          "w-1 bg-gray-200 dark:bg-gray-700 cursor-col-resize hover:bg-blue-500 dark:hover:bg-blue-400 transition-colors relative group",
          isResizing && "bg-blue-500 dark:bg-blue-400"
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Visual indicator */}
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-1 h-8 bg-white dark:bg-gray-800 rounded-full shadow-sm"></div>
        </div>
      </div>

      {/* Right Panel - All Lectures */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-6">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 font-excalifont">
                🎓 {selectedNode ? selectedNode.name : 'All Lectures'}
              </h1>
              
              {/* Action Buttons / Selection Controls */}
              <div className="flex items-center gap-3">
                {!isSelectionMode ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={toggleSelectionMode}
                      className="h-10 w-10 p-0"
                      title="Select lectures"
                    >
                      <CheckSquare className="w-4 h-4" />
                    </Button>
                    <EnhancedUploadButton 
                      onUploadSuccess={handleUploadSuccess}
                      selectedFolderId={selectedNodeId}
                    />
                  </>
                ) : (
                  <>
                    {/* Selection Controls */}
                    <div className="flex items-center gap-3 text-sm text-blue-700 dark:text-blue-300">
                      <span className="font-medium">
                        {selectedLectureIds.size} of {filteredLectures.length} selected
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={selectAllLectures}
                        className="h-8 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        Select All
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={clearAllSelections}
                        className="h-8 text-blue-700 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-200"
                      >
                        Clear All
                      </Button>
                      {selectedLectureIds.size > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDelete}
                          className="h-8"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete {selectedLectureIds.size}
                        </Button>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      onClick={toggleSelectionMode}
                      className="h-10 w-10 p-0"
                      title="Cancel selection"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {filteredLectures.length} {filteredLectures.length === 1 ? 'lecture' : 'lectures'} 
              {selectedNode ? ' in this folder' : ' total'}
            </p>
            {selectedNode && (
              <div className="mt-2">
                <div className="flex items-center gap-1 text-xs text-gray-500 mb-1">
                  {nodePath.map((pathNode, index) => (
                    <div key={pathNode.id} className="flex items-center gap-1">
                      {index > 0 && <ChevronRight className="w-3 h-3" />}
                      <span>{pathNode.name}</span>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => {
                    setSelectedNodeId(null);
                    setSelectedNode(null);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800"
                >
                  ← Back to all lectures
                </button>
              </div>
            )}
          </div>

          {/* Search Bar and Sort */}
          <div className="flex gap-4 items-center justify-between mb-6">
              <div className="relative flex-1 max-w-2xl">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search lectures..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 bg-white"
                />
              </div>
              
              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                  <SelectTrigger className="w-48">
                    <div className="flex items-center gap-2">
                      <ArrowUpDown className="w-4 h-4 text-gray-500" />
                      <SelectValue placeholder="Sort by..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date-desc">Date (newest first)</SelectItem>
                    <SelectItem value="date-asc">Date (oldest first)</SelectItem>
                    <SelectItem value="name-asc">Name (A to Z)</SelectItem>
                    <SelectItem value="name-desc">Name (Z to A)</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* View Toggle */}
                <div className="flex items-center border rounded-lg overflow-hidden bg-white dark:bg-gray-800">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="rounded-none border-0 h-9 w-9 p-0"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'row' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('row')}
                    className="rounded-none border-0 h-9 w-9 p-0"
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

          {/* Lectures Grid */}
          {lecturesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredLectures.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  {searchQuery ? 'No lectures found' : 'No lectures yet'}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {searchQuery ? 'Try adjusting your search terms' : 'Upload your first lecture to get started'}
                </p>
              </div>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLectures.map((lecture) => (
                <LectureCard
                  key={lecture.job_id}
                  lecture={lecture}
                  isDeleting={deletingLectureIds.has(lecture.job_id)}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedLectureIds.has(lecture.job_id)}
                  selectedLectureIds={selectedLectureIds}
                  setDraggedSelectedLectures={setDraggedSelectedLectures}
                  onDragStart={setDraggedLecture}
                  onDownload={() => handleNoteDownload(lecture.job_id)}
                  onView={() => handleLectureView(lecture)}
                  onRename={() => handleRenameClick(lecture)}
                  onAttachFiles={() => handleAttachFiles(lecture)}
                  onDownloadZip={() => handleDownloadZip(lecture)}
                  onViewOriginal={() => handleViewOriginal(lecture)}
                  onDelete={() => handleDeleteClick(lecture)}
                  onToggleSelection={() => toggleLectureSelection(lecture.job_id)}
                  getBorderColor={getLectureBorderColor}
                  allNodes={allStudyNodes}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLectures.map((lecture) => (
                <LectureRowCard
                  key={lecture.job_id}
                  lecture={lecture}
                  isDeleting={deletingLectureIds.has(lecture.job_id)}
                  isSelectionMode={isSelectionMode}
                  isSelected={selectedLectureIds.has(lecture.job_id)}
                  selectedLectureIds={selectedLectureIds}
                  setDraggedSelectedLectures={setDraggedSelectedLectures}
                  onDragStart={setDraggedLecture}
                  onDownload={() => handleNoteDownload(lecture.job_id)}
                  onView={() => handleLectureView(lecture)}
                  onRename={() => handleRenameClick(lecture)}
                  onAttachFiles={() => handleAttachFiles(lecture)}
                  onDownloadZip={() => handleDownloadZip(lecture)}
                  onViewOriginal={() => handleViewOriginal(lecture)}
                  onDelete={() => handleDeleteClick(lecture)}
                  onToggleSelection={() => toggleLectureSelection(lecture.job_id)}
                  getBorderColor={getLectureBorderColor}
                  allNodes={allStudyNodes}
                />
              ))}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* PDF Viewer - Inline within dashboard */}
      {showPdfViewer && selectedLecture && (
        <div className="absolute inset-0 z-40 bg-background">
          <PdfViewer
            jobId={selectedLecture.job_id}
            title={selectedLecture.lecture_title}
            onClose={handleClosePdfViewer}
            format={pdfFormat}
            onViewModeChange={handleTogglePdfFormat}
          />
        </div>
      )}

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Lecture</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newLectureName}
              onChange={(e) => setNewLectureName(e.target.value)}
              placeholder="Enter new lecture name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameSubmit();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameSubmit} disabled={!newLectureName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


    </div>
  );
}

// Lecture Card Component
interface LectureCardProps {
  lecture: Note;
  isDeleting?: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  selectedLectureIds?: Set<string>;
  setDraggedSelectedLectures?: (ids: string[]) => void;
  onDragStart: (lecture: Note) => void;
  onDownload: () => void;
  onView: () => void;
  onRename: () => void;
  onAttachFiles: () => void;
  onDownloadZip: () => void;
  onViewOriginal: () => void;
  onDelete: () => void;
  onToggleSelection?: () => void;
  getBorderColor: (lecture: Note) => string;
  allNodes?: StudyNode[];
}

function LectureCard({ 
  lecture, 
  isDeleting = false, 
  isSelectionMode = false,
  isSelected = false,
  onDragStart, 
  onDownload, 
  onView, 
  onRename, 
  onAttachFiles, 
  onDownloadZip, 
  onViewOriginal, 
  onDelete, 
  onToggleSelection,
  getBorderColor,
  allNodes = [],
  selectedLectureIds,
  setDraggedSelectedLectures
}: LectureCardProps) {
  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
      case 'uploading':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Find the folder this lecture belongs to
  const findNodeById = (nodeId: string, nodes: StudyNode[]): StudyNode | null => {
    for (const node of nodes) {
      if (node.id === nodeId) return node;
      if (node.children) {
        const found = findNodeById(nodeId, node.children);
        if (found) return found;
      }
    }
    return null;
  };

  const belongsToFolder = lecture.study_node_id ? findNodeById(lecture.study_node_id, allNodes) : null;

  // Check if original document exists by attempting to access it
  const [hasOriginalDocument, setHasOriginalDocument] = React.useState(false);
  
  React.useEffect(() => {
    let isMounted = true;
    
    const checkOriginalDocument = async () => {
      // Only check for completed lectures
      if (lecture.status !== 'completed') {
        if (isMounted) setHasOriginalDocument(false);
        return;
      }
      
      try {
        // TEMPORARILY DISABLED - causing error flood
        // const response = await fetch(`/api/download/${lecture.job_id}?format=original`, {
        //   method: 'HEAD',
        //   credentials: 'include'
        // });
        if (isMounted) {
          setHasOriginalDocument(false); // Temporarily always false
        }
      } catch (error) {
        if (isMounted) {
          setHasOriginalDocument(false);
        }
      }
    };
    
    checkOriginalDocument();
    
    return () => {
      isMounted = false;
    };
  }, [lecture.job_id, lecture.status]);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild disabled={isSelectionMode}>
        <Card 
          className={cn(
            "cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 h-full group relative",
            isDeleting && "opacity-0 scale-95 transform",
            isSelectionMode ? "border-l-gray-300" : getBorderColor(lecture),
            isSelected && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20"
          )}
          onClick={isSelectionMode ? onToggleSelection : onView}
          draggable={!isDeleting}
          onDragStart={(e) => {
            if (!isDeleting) {
              if (isSelectionMode && isSelected && selectedLectureIds && setDraggedSelectedLectures) {
                // When dragging a selected card in selection mode, always use bulk drag logic
                const selectedIds = Array.from(selectedLectureIds);
                console.log('Setting draggedSelectedLectures:', selectedIds);
                setDraggedSelectedLectures(selectedIds);
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', `bulk:${selectedIds.join(',')}`);
                // Don't call onDragStart to avoid setting draggedLecture
                return; // Exit early to prevent single lecture handler
              } else if (!isSelectionMode) {
                // Normal single lecture drag
                console.log('Setting draggedLecture:', lecture.job_id);
                onDragStart(lecture);
                e.dataTransfer.effectAllowed = 'move';
              }
            }
          }}
          onDragEnd={(e) => {
            if (isSelectionMode && isSelected && setDraggedSelectedLectures) {
              setDraggedSelectedLectures([]);
            }
          }}
        >
      <div className="p-4 h-full flex flex-col">
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="absolute top-3 right-3 z-10">
            {isSelected ? (
              <CheckSquare className="w-5 h-5 text-blue-600" />
            ) : (
              <Square className="w-5 h-5 text-gray-400" />
            )}
          </div>
        )}
        
        {/* Header - Fixed height area */}
        <div className="mb-3 min-h-[48px]">
          <div className={cn(
            "flex items-start gap-2 mb-2",
            isSelectionMode && "pr-8" // Add padding-right in selection mode to avoid checkbox overlap
          )}>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight break-words group-hover:text-blue-600 transition-colors">
                {lecture.lecture_title}
              </h3>
            </div>
            {!isSelectionMode && (
              <div className="flex-shrink-0 mt-0.5">
                {getStatusIcon(lecture.status)}
              </div>
            )}
          </div>
          {lecture.course_subject && (
            <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
              {lecture.course_subject}
            </p>
          )}
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-3">
          <Clock className="w-3 h-3" />
          <span>{format(new Date(lecture.created_at), 'MMM d, yyyy')}</span>
        </div>

        {/* Folder info - Pushed to bottom */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 truncate">
              {belongsToFolder ? belongsToFolder.name : 'No folder'}
            </span>
          </div>
        </div>
      </div>
    </Card>
      </ContextMenuTrigger>
      
      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
          <Edit3 className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onAttachFiles(); }}>
          <Paperclip className="w-4 h-4 mr-2" />
          Attach Files
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </ContextMenuItem>
        
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDownloadZip(); }}>
          <Archive className="w-4 h-4 mr-2" />
          Download ZIP
        </ContextMenuItem>
        
        {hasOriginalDocument && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={(e) => { e.stopPropagation(); onViewOriginal(); }}>
              <OriginalDoc className="w-4 h-4 mr-2" />
              View Original Document
            </ContextMenuItem>
          </>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Compact Row Card Component for List View
function LectureRowCard({ 
  lecture, 
  isDeleting = false, 
  isSelectionMode = false,
  isSelected = false,
  onDragStart, 
  onDownload, 
  onView, 
  onRename, 
  onAttachFiles, 
  onDownloadZip, 
  onViewOriginal, 
  onDelete, 
  onToggleSelection,
  getBorderColor,
  allNodes = [],
  selectedLectureIds,
  setDraggedSelectedLectures
}: LectureCardProps) {
  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
      case 'uploading':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'failed':
      case 'error':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Get node path for display
  const getNodePath = (nodeId: string | null) => {
    if (!nodeId || !allNodes?.length) return '';
    
    const findNodePath = (nodes: StudyNode[], targetId: string, path: string[] = []): string[] => {
      for (const node of nodes) {
        const currentPath = [...path, node.name];
        if (node.id === targetId) {
          return currentPath;
        }
        if (node.children?.length) {
          const childPath = findNodePath(node.children, targetId, currentPath);
          if (childPath.length > 0) return childPath;
        }
      }
      return [];
    };

    const pathArray = findNodePath(allNodes, nodeId);
    return pathArray.join(' › ');
  };

  const borderColor = getBorderColor(lecture);
  const nodePath = getNodePath(lecture.study_node_id);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable={!isDeleting && !isSelectionMode}
          onDragStart={() => {
            if (!isSelectionMode && onDragStart) {
              if (selectedLectureIds && selectedLectureIds.has(lecture.job_id)) {
                setDraggedSelectedLectures?.(Array.from(selectedLectureIds));
              } else {
                onDragStart(lecture);
              }
            }
          }}
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2 h-12 rounded-lg border transition-all duration-200 cursor-pointer bg-white dark:bg-gray-800",
            "hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600",
            isSelected && "ring-2 ring-blue-500 border-blue-300 bg-blue-50 dark:bg-blue-950/20",
            isDeleting && "opacity-50 pointer-events-none",
            borderColor
          )}
          onClick={() => {
            if (isSelectionMode) {
              onToggleSelection?.();
            } else {
              onView();
            }
          }}
        >
          {/* Selection Checkbox */}
          {isSelectionMode && (
            <div onClick={(e) => e.stopPropagation()} className="flex-shrink-0">
              <button
                onClick={onToggleSelection}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
              >
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          )}

          {/* Status Icon */}
          <div className="flex-shrink-0">
            {getStatusIcon(lecture.status)}
          </div>

          {/* Lecture Info - Main Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
                  {lecture.lecture_title}
                </h3>
                {nodePath && (
                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                    <FolderOpen className="w-3 h-3" />
                    <span className="truncate max-w-[120px]">{nodePath}</span>
                  </span>
                )}
              </div>
              <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                <Calendar className="w-3 h-3" />
                {format(new Date(lecture.created_at), 'MMM d, yyyy')}
              </span>
            </div>
          </div>

          {/* Loading indicator for deleting */}
          {isDeleting && (
            <div className="absolute inset-0 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 rounded-lg">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
            </div>
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onRename(); }}>
          <Edit3 className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onAttachFiles(); }}>
          <Paperclip className="w-4 h-4 mr-2" />
          Attach Files
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDownload(); }}>
          <Download className="w-4 h-4 mr-2" />
          Download PDF
        </ContextMenuItem>
        
        <ContextMenuItem onClick={(e) => { e.stopPropagation(); onDownloadZip(); }}>
          <Archive className="w-4 h-4 mr-2" />
          Download ZIP
        </ContextMenuItem>
        
        {lecture.original_file_path && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={(e) => { e.stopPropagation(); onViewOriginal(); }}>
              <OriginalDoc className="w-4 h-4 mr-2" />
              View Original Document
            </ContextMenuItem>
          </>
        )}
        
        <ContextMenuSeparator />
        
        <ContextMenuItem 
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}