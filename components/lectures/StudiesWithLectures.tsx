"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import StudiesManager from './StudiesManager';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  FileText, 
  Download, 
  Eye, 
  Search,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  ArrowUpDown,
  Grid3X3,
  List,
  ChevronRight,
  Edit,
  Trash2,
  RotateCw,
  Menu,
  X,
  Folder,
  Paperclip,
  BookOpen,
  Star,
  Timer
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Note, StudyNode } from '@/types/database';
import UploadWidget from '@/components/upload/UploadWidget';
import { useRealtimeJobs } from '@/hooks/useRealtimeJobs';

export default function StudiesWithLectures() {
  const router = useRouter();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<StudyNode | null>(null);
  const [allLectures, setAllLectures] = useState<Note[]>([]);
  const [lecturesLoading, setLecturesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'status'>('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('row'); // Default to list view
  const [draggedLecture, setDraggedLecture] = useState<Note | null>(null);
  const [draggedSelectedLectures, setDraggedSelectedLectures] = useState<string[]>([]);
  const [draggedFolder, setDraggedFolder] = useState<StudyNode | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);
  const [nodePath, setNodePath] = useState<StudyNode[]>([]);
  const [allStudyNodes, setAllStudyNodes] = useState<StudyNode[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [studyHistory, setStudyHistory] = useState<Record<string, {
    totalMinutes: number;
    sessionCount: number;
    lastStudied: string | null;
    firstStudied: string | null;
  }>>({});
  
  // Context menu states
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState<Note | null>(null);
  const [newLectureTitle, setNewLectureTitle] = useState('');
  
  // Resizable panel states
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  
  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Hydration-safe sidebar width
  const [isClient, setIsClient] = useState(false);

  // Set client flag after hydration and handle mobile view mode
  useEffect(() => {
    setIsClient(true);
    
    // Force list view on mobile
    const checkMobile = () => {
      if (window.innerWidth < 768) { // md breakpoint
        setViewMode('row');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Fetch all lectures on component mount
  useEffect(() => {
    fetchAllLectures();
    
    // Check for pending review changes when component mounts
    const pendingChange = localStorage.getItem('lectureReviewChanged');
    if (pendingChange) {
      try {
        const change = JSON.parse(pendingChange);
        console.log('🔄 Found pending review change, refreshing lectures...', change);
        localStorage.removeItem('lectureReviewChanged'); // Clear the flag
        // fetchAllLectures will be called anyway, so no need to call again
      } catch (e) {
        console.error('Failed to parse pending review change:', e);
        localStorage.removeItem('lectureReviewChanged');
      }
    }
    
    // Simple polling as fallback - refresh every 30 seconds to catch new jobs and study history
    const interval = setInterval(() => {
      fetchAllLectures();
      fetchStudyHistory();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Listen for review status changes from lecture detail page
  useEffect(() => {
    const handleReviewStatusChange = (event: CustomEvent) => {
      console.log('🔄 Review status changed, refreshing lectures list...', event.detail);
      fetchAllLectures();
    };

    const handleWindowFocus = () => {
      // Check for pending review changes when window regains focus
      const pendingChange = localStorage.getItem('lectureReviewChanged');
      if (pendingChange) {
        console.log('🔄 Window focused with pending review change, refreshing...');
        localStorage.removeItem('lectureReviewChanged');
        fetchAllLectures();
      }
    };

    window.addEventListener('lectureReviewStatusChanged', handleReviewStatusChange as EventListener);
    window.addEventListener('focus', handleWindowFocus);
    
    return () => {
      window.removeEventListener('lectureReviewStatusChanged', handleReviewStatusChange as EventListener);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, []);

  // Fetch study history when we have user ID
  useEffect(() => {
    if (currentUserId) {
      fetchStudyHistory();
    }
  }, [currentUserId]);

  // Set up real-time subscriptions (only when we have a stable userId)
  useRealtimeJobs({
    userId: currentUserId && currentUserId.trim() !== '' ? currentUserId : undefined,
    onJobInsert: (job) => {
      console.log('🆕 New job received:', job);
      const newLecture: Note = {
        id: '', // Will be filled by database
        job_id: job.job_id,
        lecture_title: job.lecture_title,
        course_subject: job.course_subject,
        created_at: job.created_at,
        status: job.status,
        study_node_id: job.study_node_id,
        user_id: job.user_id
      };
      setAllLectures(prev => [newLecture, ...prev]);
      toast.success(`New lecture "${job.lecture_title}" is being processed`);
    },
    onJobUpdate: (job) => {
      console.log('📝 Job updated:', job);
      setAllLectures(prev => prev.map(lecture => 
        lecture.job_id === job.job_id 
          ? { 
              ...lecture, 
              status: job.status,
              lecture_title: job.lecture_title,
              course_subject: job.course_subject,
              study_node_id: job.study_node_id
            }
          : lecture
      ));
      
      // Show completion notification
      if (job.status === 'completed') {
        toast.success(`"${job.lecture_title}" processing completed!`, {
          description: 'Your study guide is ready to view',
          action: {
            label: 'View',
            onClick: () => router.push(`/dashboard/lectures/${job.job_id}`)
          }
        });
      } else if (job.status === 'failed') {
        toast.error(`"${job.lecture_title}" processing failed`, {
          description: 'Please try uploading again'
        });
      }
    },
    onJobDelete: (jobId) => {
      console.log('🗑️ Job deleted:', jobId);
      setAllLectures(prev => prev.filter(lecture => lecture.job_id !== jobId));
      toast.success('Lecture deleted');
    },
    onStudyNodeInsert: (node) => {
      setAllStudyNodes(prev => [...prev, node]);
    },
    onStudyNodeUpdate: (node) => {
      setAllStudyNodes(prev => prev.map(n => n.id === node.id ? node : n));
    },
    onStudyNodeDelete: (nodeId) => {
      setAllStudyNodes(prev => prev.filter(n => n.id !== nodeId));
    }
  });

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
      const newWidth = Math.min(Math.max(e.clientX, 280), 500); // Min 280px, Max 500px
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
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      // Set user ID for real-time subscriptions
      setCurrentUserId(user.id);

      // Fetch all lectures for the user
      // Fetch lectures with folder information
      const { data: lectures, error: lecturesError } = await supabase
        .from('jobs')
        .select(`
          job_id, 
          lecture_title, 
          course_subject, 
          created_at, 
          status, 
          study_node_id,
          study_nodes (
            name
          )
        `)
        .eq('user_id', user.id)
        .in('status', ['processing', 'completed', 'failed'])
        .order('created_at', { ascending: false });
        
      if (lecturesError) {
        console.log('❌ Lectures query error:', lecturesError.message);
        throw lecturesError;
      }
      
      console.log('✅ Lectures query succeeded, fetching review data...');
      
      // Fetch review data separately
      const { data: reviewData, error: reviewError } = await supabase
        .from('lecture_reviews')
        .select('job_id, marked_for_review, review_reason')
        .eq('user_id', user.id)
        .eq('marked_for_review', true); // Only get marked reviews for efficiency
        
      if (reviewError) {
        console.log('⚠️ Review data query failed, continuing without review status:', reviewError.message);
      } else {
        console.log('✅ Review data query succeeded, found', reviewData?.length || 0, 'marked lectures');
      }
      
      // Create a map of review data for quick lookup
      const reviewMap = new Map();
      reviewData?.forEach(review => {
        reviewMap.set(review.job_id, {
          marked_for_review: review.marked_for_review,
          review_reason: review.review_reason
        });
      });
      
      // Merge lectures with review data
      const processedLectures = lectures?.map(lecture => ({
        ...lecture,
        marked_for_review: reviewMap.get(lecture.job_id)?.marked_for_review || false,
        review_reason: reviewMap.get(lecture.job_id)?.review_reason || null
      }));
      
      console.log('📚 Sample lectures with review data:', processedLectures?.slice(0, 3).map(l => ({
        title: l.lecture_title,
        jobId: l.job_id,
        marked_for_review: l.marked_for_review,
        review_reason: l.review_reason
      })));
      
      if (processedLectures?.some(l => l.marked_for_review)) {
        console.log('📚 Found lectures marked for review:', processedLectures.filter(l => l.marked_for_review).map(l => l.lecture_title));
      } else {
        console.log('📚 No lectures marked for review found');
      }
      
      setAllLectures(processedLectures || []);
    } catch (error) {
      console.error('Error fetching lectures:', error);
      toast.error('Failed to load lectures');
    } finally {
      setLecturesLoading(false);
    }
  };

  // Fetch study history for all lectures
  const fetchStudyHistory = async () => {
    try {
      // Only fetch if we have a user ID (authenticated)
      if (!currentUserId) {
        console.log('📊 Study history: No user ID, skipping fetch');
        return;
      }

      console.log('📊 Study history: Fetching for user:', currentUserId);
      const response = await fetch('/api/lectures/study-history');
      console.log('📊 Study history: Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('📊 Study history: Error response:', errorText);
        
        // If 401, user is not authenticated - silently ignore
        if (response.status === 401) {
          console.log('📊 Study history: Authentication required, ignoring');
          return;
        }
        throw new Error(`Failed to fetch study history: ${response.status} ${errorText}`);
      }
      
      const result = await response.json();
      console.log('📊 Study history: Success response:', result);
      
      if (result.success) {
        setStudyHistory(result.data);
        console.log('📊 Study history: Set history data for', Object.keys(result.data).length, 'lectures');
      }
    } catch (error) {
      console.error('📊 Study history: Error:', error);
      // Don't show error toast - study history is optional functionality
    }
  };

  // Handle moving lectures to folders via drag & drop
  const handleLectureDrop = async (lectureId: string, targetNodeId: string) => {
    try {
      const nodeId = targetNodeId === "" ? null : targetNodeId;
      
      const { error } = await supabase
        .from('jobs')
        .update({ study_node_id: nodeId })
        .eq('job_id', lectureId);

      if (error) throw error;

      setAllLectures(prev => prev.map(lecture => 
        lecture.job_id === lectureId 
          ? { ...lecture, study_node_id: nodeId }
          : lecture
      ));

      toast.success('Lecture moved successfully');
    } catch (error) {
      console.error('Error moving lecture:', error);
      toast.error('Failed to move lecture');
    }
  };

  // Handle bulk move of selected lectures to folder
  const handleBulkLectureDrop = async (lectureIds: string[], targetNodeId: string) => {
    try {
      const nodeId = targetNodeId === "" ? null : targetNodeId;
      
      const { error } = await supabase
        .from('jobs')
        .update({ study_node_id: nodeId })
        .in('job_id', lectureIds);

      if (error) throw error;

      setAllLectures(prev => prev.map(lecture => 
        lectureIds.includes(lecture.job_id)
          ? { ...lecture, study_node_id: nodeId }
          : lecture
      ));

      setDraggedSelectedLectures([]);

      const message = lectureIds.length === 1 
        ? 'Lecture moved successfully' 
        : `${lectureIds.length} lectures moved successfully`;
      toast.success(message);
    } catch (error) {
      console.error('Error moving lectures:', error);
      toast.error('Failed to move lectures');
    }
  };

  // Handle moving folders to different parents via drag & drop
  const handleFolderDrop = async (folderId: string, targetParentId: string | null, position?: number) => {
    try {
      if (position !== undefined) {
        // Handle reordering within same parent - update sort_order
        // First, get all sibling nodes to reorder them
        const { data: siblings, error: fetchError } = await supabase
          .from('study_nodes')
          .select('id, sort_order')
          .eq('parent_id', targetParentId)
          .order('sort_order');

        if (fetchError) throw fetchError;

        // Remove the dragged folder from siblings list
        const otherSiblings = siblings?.filter(s => s.id !== folderId) || [];

        // Insert the dragged folder at the new position
        const updates = [];
        otherSiblings.splice(position, 0, { id: folderId, sort_order: 0 }); // Temporary sort_order

        // Update all sort_orders
        for (let i = 0; i < otherSiblings.length; i++) {
          updates.push({
            id: otherSiblings[i].id,
            parent_id: targetParentId,
            sort_order: i
          });
        }

        // Execute all updates
        for (const update of updates) {
          const { error } = await supabase
            .from('study_nodes')
            .update({ parent_id: update.parent_id, sort_order: update.sort_order })
            .eq('id', update.id);
          
          if (error) throw error;
        }
        
        toast.success('Folder position updated successfully');
      } else {
        // Handle parent change only
        const { error } = await supabase
          .from('study_nodes')
          .update({ parent_id: targetParentId })
          .eq('id', folderId);
          
        if (error) throw error;
        toast.success('Folder moved successfully');
      }

      // Trigger a refresh of the StudiesManager component
      setRefreshTrigger(prev => prev + 1);
      
    } catch (error) {
      console.error('Error moving folder:', error);
      toast.error('Failed to move folder');
    }
  };

  const handleLectureView = (lecture: Note) => {
    // Navigate to lecture detail view
    router.push(`/dashboard/lectures/${lecture.job_id}`);
  };

  const handleLectureDownload = (noteId: string) => {
    window.open(`/api/download/${noteId}?format=pdf`, '_blank');
  };

  // Handle context menu actions
  const handleRenameClick = (lecture: Note) => {
    setSelectedLecture(lecture);
    setNewLectureTitle(lecture.lecture_title);
    setRenameDialogOpen(true);
  };

  const handleDeleteClick = (lecture: Note) => {
    setSelectedLecture(lecture);
    setDeleteDialogOpen(true);
  };

  const handleRenameConfirm = async () => {
    if (!selectedLecture || !newLectureTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('jobs')
        .update({ lecture_title: newLectureTitle.trim() })
        .eq('job_id', selectedLecture.job_id);

      if (error) throw error;

      // Update local state
      setAllLectures(prev => prev.map(lecture =>
        lecture.job_id === selectedLecture.job_id
          ? { ...lecture, lecture_title: newLectureTitle.trim() }
          : lecture
      ));

      toast.success('Lecture renamed successfully');
      setRenameDialogOpen(false);
      setSelectedLecture(null);
      setNewLectureTitle('');
    } catch (error) {
      console.error('Error renaming lecture:', error);
      toast.error('Failed to rename lecture');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!selectedLecture) return;

    try {
      // Delete from jobs table
      const { error: jobError } = await supabase
        .from('jobs')
        .delete()
        .eq('job_id', selectedLecture.job_id);

      if (jobError) throw jobError;

      // Delete from notes table if exists
      await supabase
        .from('notes')
        .delete()
        .eq('job_id', selectedLecture.job_id);

      // Delete from study_guides table if exists
      await supabase
        .from('study_guides')
        .delete()
        .eq('job_id', selectedLecture.job_id);

      // Update local state
      setAllLectures(prev => prev.filter(lecture => lecture.job_id !== selectedLecture.job_id));

      toast.success('Lecture deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedLecture(null);
    } catch (error) {
      console.error('Error deleting lecture:', error);
      toast.error('Failed to delete lecture');
    }
  };

  // Handle drag start for lectures
  const handleLectureDragStart = (lecture: Note) => {
    setDraggedLecture(lecture);
  };

  // Get all descendant node IDs for a given parent node
  const getAllDescendantIds = (parentId: string, allNodes: StudyNode[]): string[] => {
    const descendants = [parentId];
    
    const findChildren = (nodeId: string) => {
      const children = allNodes.filter(node => node.parent_id === nodeId);
      children.forEach(child => {
        descendants.push(child.id);
        findChildren(child.id);
      });
    };
    
    findChildren(parentId);
    return descendants;
  };

  // Filter and sort lectures
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
        const statusOrder = { completed: 0, processing: 1, failed: 2 };
        const aOrder = statusOrder[a.status as keyof typeof statusOrder] ?? 3;
        const bOrder = statusOrder[b.status as keyof typeof statusOrder] ?? 3;
        if (aOrder !== bOrder) {
          return aOrder - bOrder;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

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
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // Group lectures by date sections like iCloud
  const groupLecturesByDate = (lectures: Note[]) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const groups: { [key: string]: Note[] } = {
      'Today': [],
      'Yesterday': [],
      'Previous 7 Days': [],
      'Previous 30 Days': [],
      'Older': []
    };

    lectures.forEach(lecture => {
      const lectureDate = new Date(lecture.created_at);
      const lectureDateOnly = new Date(lectureDate.getFullYear(), lectureDate.getMonth(), lectureDate.getDate());

      if (lectureDateOnly.getTime() === today.getTime()) {
        groups['Today'].push(lecture);
      } else if (lectureDateOnly.getTime() === yesterday.getTime()) {
        groups['Yesterday'].push(lecture);
      } else if (lectureDate >= sevenDaysAgo) {
        groups['Previous 7 Days'].push(lecture);
      } else if (lectureDate >= thirtyDaysAgo) {
        groups['Previous 30 Days'].push(lecture);
      } else {
        groups['Older'].push(lecture);
      }
    });

    // Remove empty groups and return with counts
    return Object.entries(groups)
      .filter(([_, lectures]) => lectures.length > 0)
      .map(([section, lectures]) => ({ section, lectures, count: lectures.length }));
  };

  return (
    <div className="relative flex h-full min-h-screen bg-background">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Left Panel - Study Folders */}
      <div 
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50 w-80 lg:w-auto flex-shrink-0 border-r border-border bg-card overflow-y-auto transform transition-transform duration-300 ease-in-out lg:transform-none",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={isClient ? { 
          width: typeof window !== 'undefined' && window.innerWidth >= 1024 ? `${sidebarWidth}px` : '320px'
        } : undefined}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-4 border-b lg:hidden">
          <h2 className="font-semibold">Study Folders</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        <div 
          className="px-2 py-1"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            
            if (draggedSelectedLectures && draggedSelectedLectures.length > 0) {
              handleBulkLectureDrop(draggedSelectedLectures, '');
              setDraggedSelectedLectures([]);
              return;
            }
            
            if (draggedLecture) {
              handleLectureDrop(draggedLecture.job_id, '');
              setDraggedLecture(null);
            }
          }}
        >
          <StudiesManager 
            onNodeSelect={(nodeId) => {
              setSelectedNodeId(nodeId);
              // Close mobile menu when a folder is selected
              if (window.innerWidth < 1024) {
                setIsMobileMenuOpen(false);
              }
            }}
            selectedNodeId={selectedNodeId}
            draggedLecture={draggedLecture}
            draggedSelectedLectures={draggedSelectedLectures}
            draggedFolder={draggedFolder}
            onLectureDrop={handleLectureDrop}
            onBulkLectureDrop={handleBulkLectureDrop}
            onFolderDrop={handleFolderDrop}
            onDragEnd={() => {
              setDraggedLecture(null);
              setDraggedSelectedLectures([]);
            }}
            onFolderDragEnd={() => {
              setDraggedFolder(null);
            }}
            onNodesLoaded={(nodes) => setAllStudyNodes(nodes)}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>

      {/* Resizer Handle - Hidden on mobile */}
      <div
        className={cn(
          "hidden lg:block w-1 bg-border cursor-col-resize hover:bg-primary transition-colors relative group",
          isResizing && "bg-primary"
        )}
        onMouseDown={handleMouseDown}
      >
        <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          <div className="w-1 h-8 bg-card rounded-full shadow-sm"></div>
        </div>
      </div>

      {/* Right Panel - All Lectures */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto p-4 lg:p-6">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  {/* Mobile Menu Toggle */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden flex-shrink-0"
                    onClick={() => setIsMobileMenuOpen(true)}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                  <h1 className="text-xl lg:text-3xl font-bold truncate">
                    <span className="text-foreground">Mindsy</span>
                    <span className="text-blue-500 ml-1">Lectures</span>
                    {selectedNode && (
                      <span className="text-muted-foreground ml-2 font-medium text-lg lg:text-xl">
                        • {selectedNode.name}
                      </span>
                    )}
                  </h1>
                </div>
                
                <div className="flex gap-2 flex-shrink-0">
                  <UploadWidget variant="button" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {filteredLectures.length} {filteredLectures.length === 1 ? 'lecture' : 'lectures'}
                {selectedNode ? ' in this folder' : ' total'}
              </p>
              {selectedNode && (
                <div className="mt-2">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
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
          <div className="flex gap-2 md:gap-4 items-center mb-6">
            {/* Search Bar - takes most space */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search lectures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
            </div>
            
            {/* Compact Sort Control */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <Select value={sortBy} onValueChange={(value: typeof sortBy) => setSortBy(value)}>
                <SelectTrigger className="w-20 md:w-48">
                  <div className="flex items-center gap-1 md:gap-2">
                    <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                    {/* Show icon only on mobile, full text on desktop */}
                    <span className="hidden md:inline">
                      <SelectValue placeholder="Sort by..." />
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">
                    <span className="md:hidden">↓ New</span>
                    <span className="hidden md:inline">Date (newest)</span>
                  </SelectItem>
                  <SelectItem value="date-asc">
                    <span className="md:hidden">↑ Old</span>
                    <span className="hidden md:inline">Date (oldest)</span>
                  </SelectItem>
                  <SelectItem value="name-asc">
                    <span className="md:hidden">A-Z</span>
                    <span className="hidden md:inline">Name (A-Z)</span>
                  </SelectItem>
                  <SelectItem value="name-desc">
                    <span className="md:hidden">Z-A</span>
                    <span className="hidden md:inline">Name (Z-A)</span>
                  </SelectItem>
                  <SelectItem value="status">
                    <span className="md:hidden">Status</span>
                    <span className="hidden md:inline">Status</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* View Toggle - Hidden on mobile */}
              <div className="hidden md:flex items-center border border-border rounded-lg overflow-hidden bg-card">
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
                <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {searchQuery ? 'No lectures found' : 'No lectures yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Upload your first lecture to get started'}
                </p>
                {!searchQuery && (
                  <div className="flex justify-center">
                    <UploadWidget variant="button" />
                  </div>
                )}
              </div>
            </Card>
          ) : (isClient && window.innerWidth >= 768 && viewMode === 'grid') ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {filteredLectures.map((lecture) => (
                <LectureCard
                  key={lecture.job_id}
                  lecture={lecture}
                  onView={() => handleLectureView(lecture)}
                  onDownload={() => handleLectureDownload(lecture.job_id)}
                  onRename={handleRenameClick}
                  onDelete={handleDeleteClick}
                  onDragStart={handleLectureDragStart}
                  getStatusIcon={getStatusIcon}
                  studyStats={studyHistory[lecture.job_id]}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Desktop Column Headers - Only visible on desktop */}
              <div className="hidden md:block">
                <div className="grid grid-cols-[40px_1fr_100px_120px_60px_100px_60px] gap-4 items-center px-4 py-2 bg-muted/30 rounded-lg text-sm font-medium text-muted-foreground border-b">
                  <div className="text-center">Status</div>
                  <div>Lecture</div>
                  <div className="text-center">Date</div>
                  <div className="text-center">Folder</div>
                  <div className="text-center">Files</div>
                  <div className="text-center">Study Time</div>
                  <div className="text-center">Review</div>
                </div>
              </div>
              
              {groupLecturesByDate(filteredLectures).map(({ section, lectures, count }) => (
                <div key={section}>
                  {/* Section Header */}
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {section}
                    </h3>
                    <span className="text-sm text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                      {count} {count === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                  
                  {/* Section Items */}
                  <div>
                    {lectures.map((lecture, index) => (
                      <LectureRowCard
                        key={lecture.job_id}
                        lecture={lecture}
                        onView={() => handleLectureView(lecture)}
                        onDownload={() => handleLectureDownload(lecture.job_id)}
                        onRename={handleRenameClick}
                        onDelete={handleDeleteClick}
                        onDragStart={handleLectureDragStart}
                        getStatusIcon={getStatusIcon}
                        studyStats={studyHistory[lecture.job_id]}
                        isLast={index === lectures.length - 1}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    
    {/* Rename Dialog */}
    <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename Lecture</DialogTitle>
          <DialogDescription>
            Enter a new title for this lecture
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="lectureTitle">Lecture Title</Label>
            <Input
              id="lectureTitle"
              value={newLectureTitle}
              onChange={(e) => setNewLectureTitle(e.target.value)}
              placeholder="Enter lecture title"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameConfirm();
                }
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setRenameDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleRenameConfirm}
            disabled={!newLectureTitle.trim()}
          >
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation Dialog */}
    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Lecture</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete &quot;{selectedLecture?.lecture_title}&quot;? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleDeleteConfirm}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </div>
  );
}

// Lecture Card Component for Grid View
interface LectureCardProps {
  lecture: Note;
  onView: () => void;
  onDownload: () => void;
  onRename: (lecture: Note) => void;
  onDelete: (lecture: Note) => void;
  onDragStart: (lecture: Note) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  studyStats?: {
    totalMinutes: number;
    sessionCount: number;
    lastStudied: string | null;
    firstStudied: string | null;
  };
  isLast?: boolean;
}

function LectureCard({ lecture, onView, onDownload, onRename, onDelete, onDragStart, getStatusIcon, studyStats }: LectureCardProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div 
          draggable
          className="cursor-pointer hover:shadow-lg transition-all duration-300 h-full group relative bg-card text-card-foreground shadow rounded-xl border border-border border-l-4 border-l-blue-300"
          onClick={onView}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', lecture.job_id);
            onDragStart(lecture);
          }}
        >
          <div className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="mb-3 min-h-[48px]">
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground line-clamp-2 leading-tight break-words group-hover:text-primary transition-colors">
                {lecture.lecture_title}
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
              {lecture.marked_for_review && (
                <RotateCw className="w-4 h-4 text-orange-500" title={`Marked for review${lecture.review_reason ? `: ${lecture.review_reason}` : ''}`} />
              )}
              {getStatusIcon(lecture.status)}
            </div>
          </div>
          {/* Course Subject and Folder Info */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              {format(new Date(lecture.created_at), 'MMM d')}
            </span>
            {lecture.study_nodes?.name && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1 truncate">
                  <Folder className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {lecture.study_nodes.name}
                  </span>
                </div>
              </>
            )}
            {lecture.course_subject && (
              <>
                <span>•</span>
                <span className="truncate">
                  {lecture.course_subject}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Student Study Stats */}
        <div className="space-y-2 mb-3">
          {studyStats ? (
            <>
              {/* Study Progress - Real Data */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    studyStats.totalMinutes > 0 ? 'bg-green-400' : 'bg-gray-300'
                  }`}></div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {studyStats.totalMinutes > 0 
                      ? `${Math.round(studyStats.totalMinutes)} min studied` 
                      : 'Not studied yet'
                    }
                  </span>
                </div>
              </div>
              
            </>
          ) : (
            // Default state - no study data available yet
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Ready to study
              </span>
            </div>
          )}
        </div>

      </div>
    </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Study Guide
        </ContextMenuItem>
        {lecture.status === 'completed' && (
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onRename(lecture);
          }}
        >
          <Edit className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(lecture);
          }}
          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Lecture Row Card Component for List View
function LectureRowCard({ lecture, onView, onDownload, onRename, onDelete, onDragStart, getStatusIcon, studyStats, isLast }: LectureCardProps) {
  // Check if lecture has downloadable files
  const hasFiles = lecture.status === 'completed';
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          draggable
          className={cn(
            "group relative px-4 py-3 transition-all duration-200 cursor-pointer hover:bg-accent/20",
            !isLast && "border-b border-border/30"
          )}
          onClick={onView}
          onDragStart={(e) => {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', lecture.job_id);
            onDragStart(lecture);
          }}
        >
          {/* Mobile: Two-line layout */}
          <div className="flex flex-col gap-1 md:hidden">
            {/* Top line: Status icon + title */}
            <div className="flex items-center gap-3">
              {getStatusIcon(lecture.status)}
              <h3 className="font-medium text-foreground truncate">
                {lecture.lecture_title}
              </h3>
            </div>
            
            {/* Bottom line: Date + folder */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground ml-7">
              <span>
                {format(new Date(lecture.created_at), 'MMM d, yyyy')}
              </span>
              {lecture.study_nodes?.name && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-1">
                    <Folder className="w-3 h-3 flex-shrink-0" />
                    <span className="text-muted-foreground">
                      {lecture.study_nodes.name}
                    </span>
                  </div>
                </>
              )}
              {lecture.course_subject && (
                <>
                  <span>•</span>
                  <span className="text-muted-foreground">
                    {lecture.course_subject}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Desktop: Single-line column layout */}
          <div className="hidden md:grid md:grid-cols-[40px_1fr_100px_120px_60px_100px_60px] md:gap-4 md:items-center">
            {/* Column 1: Status Icon (40px) */}
            <div className="flex items-center justify-center">
              {getStatusIcon(lecture.status)}
            </div>

            {/* Column 2: Title (flexible) */}
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate pr-2">
                {lecture.lecture_title}
              </h3>
              {lecture.course_subject && (
                <p className="text-xs text-muted-foreground truncate">
                  {lecture.course_subject}
                </p>
              )}
            </div>

            {/* Column 3: Date (100px) */}
            <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
              <Calendar className="w-3 h-3" />
              <span className="whitespace-nowrap">{format(new Date(lecture.created_at), 'MMM d')}</span>
            </div>

            {/* Column 4: Folder (120px) */}
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              {lecture.study_nodes?.name ? (
                <div className="flex items-center gap-1 min-w-0">
                  <Folder className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {lecture.study_nodes.name}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground/50">No folder</span>
              )}
            </div>

            {/* Column 5: Files (60px) */}
            <div className="flex items-center justify-center">
              {hasFiles ? (
                <Paperclip className="w-4 h-4 text-primary" title="Files available" />
              ) : (
                <div className="w-4 h-4 opacity-0"></div>
              )}
            </div>

            {/* Column 6: Study Time (100px) */}
            <div className="flex items-center justify-center text-sm text-muted-foreground">
              {studyStats && studyStats.totalMinutes > 0 ? (
                <div className="flex items-center gap-1">
                  <Timer className="w-3 h-3" />
                  <span className="whitespace-nowrap">{Math.round(studyStats.totalMinutes)}m</span>
                </div>
              ) : (
                <span className="text-muted-foreground/50 text-xs whitespace-nowrap">Not studied</span>
              )}
            </div>

            {/* Column 7: Review Status (60px) */}
            <div className="flex items-center justify-center">
              {lecture.marked_for_review ? (
                <RotateCw className="w-4 h-4 text-orange-500" title="Marked for review" />
              ) : (
                <div className="w-4 h-4 opacity-0"></div>
              )}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-48">
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onView();
          }}
        >
          <Eye className="w-4 h-4 mr-2" />
          View Study Guide
        </ContextMenuItem>
        {lecture.status === 'completed' && (
          <ContextMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            <Download className="w-4 h-4 mr-2" />
            Download PDF
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onRename(lecture);
          }}
        >
          <Edit className="w-4 h-4 mr-2" />
          Rename
        </ContextMenuItem>
        <ContextMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onDelete(lecture);
          }}
          className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}