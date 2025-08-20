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
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Note, StudyNode } from '@/types/database';
import UploadWidget from '@/components/upload/UploadWidget';
import CreateSampleButton from '@/components/debug/CreateSampleButton';

export default function StudiesWithLectures() {
  const router = useRouter();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<StudyNode | null>(null);
  const [allLectures, setAllLectures] = useState<Note[]>([]);
  const [lecturesLoading, setLecturesLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'name-asc' | 'name-desc' | 'status'>('date-desc');
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');
  const [draggedLecture, setDraggedLecture] = useState<Note | null>(null);
  const [draggedSelectedLectures, setDraggedSelectedLectures] = useState<string[]>([]);
  const [nodePath, setNodePath] = useState<StudyNode[]>([]);
  const [allStudyNodes, setAllStudyNodes] = useState<StudyNode[]>([]);
  
  // Resizable panel states
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);

  // Fetch all lectures on component mount
  useEffect(() => {
    fetchAllLectures();
  }, []);

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

      // Fetch all lectures for the user
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

  const handleLectureView = (lecture: Note) => {
    // Navigate to lecture detail view
    router.push(`/dashboard/lectures/${lecture.job_id}`);
  };

  const handleLectureDownload = (noteId: string) => {
    window.open(`/api/download/${noteId}?format=pdf`, '_blank');
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
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
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
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
            draggedLecture={draggedLecture}
            draggedSelectedLectures={draggedSelectedLectures}
            onLectureDrop={handleLectureDrop}
            onBulkLectureDrop={handleBulkLectureDrop}
            onDragEnd={() => {
              setDraggedLecture(null);
              setDraggedSelectedLectures([]);
            }}
            onNodesLoaded={(nodes) => setAllStudyNodes(nodes)}
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
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                  🎓 {selectedNode ? selectedNode.name : 'All Lectures'}
                </h1>
                
                <div className="flex gap-2">
                  <UploadWidget variant="button" />
                  <CreateSampleButton />
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
              <Input
                type="text"
                placeholder="Search lectures..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
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
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {searchQuery ? 'Try adjusting your search terms' : 'Upload your first lecture to get started'}
                </p>
                {!searchQuery && (
                  <div className="flex gap-2 justify-center">
                    <UploadWidget variant="button" />
                    <CreateSampleButton />
                  </div>
                )}
              </div>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLectures.map((lecture) => (
                <LectureCard
                  key={lecture.job_id}
                  lecture={lecture}
                  onView={() => handleLectureView(lecture)}
                  onDownload={() => handleLectureDownload(lecture.job_id)}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredLectures.map((lecture) => (
                <LectureRowCard
                  key={lecture.job_id}
                  lecture={lecture}
                  onView={() => handleLectureView(lecture)}
                  onDownload={() => handleLectureDownload(lecture.job_id)}
                  getStatusIcon={getStatusIcon}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}

// Lecture Card Component for Grid View
interface LectureCardProps {
  lecture: Note;
  onView: () => void;
  onDownload: () => void;
  getStatusIcon: (status: string) => React.ReactNode;
}

function LectureCard({ lecture, onView, onDownload, getStatusIcon }: LectureCardProps) {
  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-all duration-300 border-l-4 border-l-blue-300 h-full group relative"
      onClick={onView}
    >
      <CardContent className="p-4 h-full flex flex-col">
        {/* Header */}
        <div className="mb-3 min-h-[48px]">
          <div className="flex items-start gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 leading-tight break-words group-hover:text-blue-600 transition-colors">
                {lecture.lecture_title}
              </h3>
            </div>
            <div className="flex-shrink-0 mt-0.5">
              {getStatusIcon(lecture.status)}
            </div>
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

        {/* Actions - Pushed to bottom */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-auto">
          <div className="flex items-center justify-between">
            <Badge variant={lecture.status === 'completed' ? 'default' : 'secondary'}>
              {lecture.status}
            </Badge>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                className="h-8 w-8 p-0"
              >
                <Eye className="w-4 h-4" />
              </Button>
              {lecture.status === 'completed' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                  }}
                  className="h-8 w-8 p-0"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Lecture Row Card Component for List View
function LectureRowCard({ lecture, onView, onDownload, getStatusIcon }: LectureCardProps) {
  return (
    <div
      className="group relative flex items-center gap-3 px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer bg-white dark:bg-gray-800 hover:shadow-sm hover:border-gray-300 dark:hover:border-gray-600 border-l-4 border-l-blue-300"
      onClick={onView}
    >
      {/* Status Icon */}
      <div className="flex-shrink-0">
        {getStatusIcon(lecture.status)}
      </div>

      {/* Lecture Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate text-sm">
              {lecture.lecture_title}
            </h3>
            <Badge variant={lecture.status === 'completed' ? 'default' : 'secondary'} className="flex-shrink-0">
              {lecture.status}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              <Calendar className="w-3 h-3" />
              {format(new Date(lecture.created_at), 'MMM d, yyyy')}
            </span>
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onView();
                }}
                className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Eye className="w-4 h-4" />
              </Button>
              {lecture.status === 'completed' && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                  }}
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}