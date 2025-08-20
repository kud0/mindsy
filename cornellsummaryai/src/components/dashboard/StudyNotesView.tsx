import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ChevronRight, 
  ChevronDown, 
  FileText, 
  Download, 
  Eye, 
  Edit,
  Trash,
  FolderOpen,
  Search,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StudyNode {
  id: string;
  name: string;
  type: 'course' | 'year' | 'subject' | 'semester' | 'custom';
  parent_id: string | null;
  note_count: number;
  total_note_count: number;
  children?: StudyNode[];
}

interface Note {
  job_id: string;
  lecture_title: string;
  course_subject: string | null;
  created_at: string;
  status: string;
  study_node_id: string | null;
  study_node_name: string | null;
  study_path_string: string | null;
}

interface StudyNotesViewProps {
  userId: string;
  onNoteView: (noteId: string) => void;
  onNoteDownload: (noteId: string, format: 'pdf' | 'md' | 'txt') => void;
  onNoteEdit: (noteId: string) => void;
  onNoteDelete: (noteId: string) => void;
  onNoteMove: (noteIds: string[], targetNodeId: string) => void;
}

export default function StudyNotesView({
  userId,
  onNoteView,
  onNoteDownload,
  onNoteEdit,
  onNoteDelete,
  onNoteMove
}: StudyNotesViewProps) {
  const [studyNodes, setStudyNodes] = useState<StudyNode[]>([]);
  const [selectedNode, setSelectedNode] = useState<StudyNode | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [notesLoading, setNotesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchStudyNodesWithCounts();
  }, [userId]);

  useEffect(() => {
    if (selectedNode) {
      fetchNotesForNode(selectedNode.id);
    } else {
      setNotes([]);
    }
  }, [selectedNode]);

  const fetchStudyNodesWithCounts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/study-nodes/with-counts');
      const data = await response.json();
      
      if (response.ok) {
        setStudyNodes(data.nodes || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching study nodes:', error);
      toast.error('Failed to load study organization');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotesForNode = async (nodeId: string, includeDescendants = true) => {
    try {
      setNotesLoading(true);
      const response = await fetch(
        `/api/notes/by-study-node?nodeId=${nodeId}&includeDescendants=${includeDescendants}`
      );
      const data = await response.json();
      
      if (response.ok) {
        setNotes(data.notes || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to load notes');
    } finally {
      setNotesLoading(false);
    }
  };

  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(nodeId)) {
        newSet.delete(nodeId);
      } else {
        newSet.add(nodeId);
      }
      return newSet;
    });
  };

  const handleMoveSelectedNotes = async (targetNodeId: string) => {
    if (selectedNotes.size === 0) {
      toast.error('No notes selected');
      return;
    }

    try {
      const noteIds = Array.from(selectedNotes);
      await onNoteMove(noteIds, targetNodeId);
      
      // Clear selection and refresh
      setSelectedNotes(new Set());
      if (selectedNode) {
        await fetchNotesForNode(selectedNode.id);
      }
      await fetchStudyNodesWithCounts();
      
      toast.success(`Moved ${noteIds.length} notes successfully`);
    } catch (error) {
      console.error('Error moving notes:', error);
      toast.error('Failed to move notes');
    }
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const renderStudyNode = (node: StudyNode, depth = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedNode?.id === node.id;
    
    const typeColors = {
      course: 'text-blue-600',
      year: 'text-green-600',
      subject: 'text-purple-600',
      semester: 'text-orange-600',
      custom: 'text-gray-600',
    };

    return (
      <div key={node.id} className="w-full">
        <div
          className={cn(
            "flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded cursor-pointer transition-colors",
            isSelected && "bg-blue-50 dark:bg-blue-900/20"
          )}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
          onClick={() => setSelectedNode(node)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(node.id);
            }}
            className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            disabled={!hasChildren}
          >
            {hasChildren ? (
              isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )
            ) : (
              <div className="w-4 h-4" />
            )}
          </button>
          
          <FolderOpen className={cn("w-4 h-4", typeColors[node.type])} />
          
          <span className="flex-1 font-medium text-sm">{node.name}</span>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">
              {node.note_count > 0 && (
                <span>{node.note_count}</span>
              )}
              {node.total_note_count > node.note_count && (
                <span className="ml-1">({node.total_note_count})</span>
              )}
            </span>
          </div>
        </div>
        
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderStudyNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const renderNote = (note: Note) => {
    const isSelected = selectedNotes.has(note.job_id);
    
    return (
      <Card
        key={note.job_id}
        className={cn(
          "p-4 hover:shadow-md transition-shadow cursor-pointer",
          isSelected && "ring-2 ring-blue-500"
        )}
        onClick={() => toggleNoteSelection(note.job_id)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium">{note.lecture_title}</h3>
            </div>
            
            {note.course_subject && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                {note.course_subject}
              </p>
            )}
            
            {note.study_path_string && (
              <p className="text-xs text-gray-500 mb-2">
                📁 {note.study_path_string}
              </p>
            )}
            
            <p className="text-xs text-gray-500">
              {format(new Date(note.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNoteView(note.job_id);
              }}
            >
              <Eye className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNoteDownload(note.job_id, 'pdf');
              }}
            >
              <Download className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNoteEdit(note.job_id);
              }}
            >
              <Edit className="w-4 h-4" />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onNoteDelete(note.job_id);
              }}
              className="text-red-600 hover:text-red-700"
            >
              <Trash className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.lecture_title?.toLowerCase().includes(query) ||
      note.course_subject?.toLowerCase().includes(query) ||
      note.study_path_string?.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full">
      {/* Left Sidebar - Study Organization Tree */}
      <div className="w-80 min-w-[320px] flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-y-auto">
        <div className="p-4 h-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Study Organization</h2>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => window.location.href = '/dashboard/studies'}
              className="text-xs"
            >
              <Plus className="w-3 h-3 mr-1" />
              Add
            </Button>
          </div>
          
          {studyNodes.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-gray-400">
                No study organization created yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Organize your notes by courses, years, and subjects
              </p>
              <Button
                className="mt-2"
                size="sm"
                onClick={() => window.location.href = '/dashboard/studies'}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First Course
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              {studyNodes.map(node => renderStudyNode(node))}
            </div>
          )}
        </div>
      </div>

      {/* Right Content - Notes List */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-white dark:bg-gray-950">
        <div className="p-6 h-full">
          {selectedNode ? (
            <>
              <div className="mb-6">
                <h1 className="text-2xl font-bold mb-2">
                  {selectedNode.name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedNode.total_note_count} notes
                  {selectedNode.total_note_count > selectedNode.note_count && 
                    ` (${selectedNode.note_count} direct)`
                  }
                </p>
              </div>

              {/* Search Bar */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notes..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800"
                  />
                </div>
              </div>

              {/* Selected Notes Actions */}
              {selectedNotes.size > 0 && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    {selectedNotes.size} notes selected
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedNotes(new Set())}
                    >
                      Clear Selection
                    </Button>
                  </div>
                </div>
              )}

              {/* Notes Grid */}
              {notesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
                </div>
              ) : filteredNotes.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    {searchQuery ? 'No notes match your search' : 'No notes in this folder yet'}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {filteredNotes.map(note => renderNote(note))}
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-center max-w-md mx-auto">
                <FolderOpen className="w-20 h-20 mx-auto text-gray-200 dark:text-gray-700 mb-6" />
                <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">
                  Select a Study Item
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Choose a course, year, subject, or semester from the sidebar to view and manage your notes within that organizational structure.
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    onClick={() => window.location.href = '/dashboard/studies'}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Manage Organization
                  </Button>
                  <Button
                    onClick={() => window.location.href = '/dashboard/notes'}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View All Notes
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}