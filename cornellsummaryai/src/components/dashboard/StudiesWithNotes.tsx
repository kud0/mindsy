import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import StudiesManager from './StudiesManager';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  ChevronRight
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

export default function StudiesWithNotes() {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<StudyNode | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nodePath, setNodePath] = useState<StudyNode[]>([]);

  useEffect(() => {
    if (selectedNodeId) {
      fetchNotesForNode(selectedNodeId);
      fetchNodeDetails(selectedNodeId);
    } else {
      setNotes([]);
      setSelectedNode(null);
      setNodePath([]);
    }
  }, [selectedNodeId]);

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

  const fetchNotesForNode = async (nodeId: string, includeDescendants = true) => {
    try {
      setNotesLoading(true);
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
        .eq('status', 'completed')
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

  const filteredNotes = notes.filter(note => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      note.lecture_title?.toLowerCase().includes(query) ||
      note.course_subject?.toLowerCase().includes(query)
    );
  });

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
    <div className="flex h-full min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Left Panel - Studies Manager */}
      <div className="w-96 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 overflow-y-auto">
        <div className="sticky top-0 bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-700 p-4 z-10">
          <h2 className="text-lg font-semibold">Study Organization</h2>
        </div>
        <div className="p-4">
          <StudiesManager 
            onNodeSelect={setSelectedNodeId}
            selectedNodeId={selectedNodeId}
          />
        </div>
      </div>

      {/* Right Panel - Notes */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto p-6">
          {selectedNode ? (
            <>
              {/* Breadcrumb and Header */}
              <div className="mb-6">
                {/* Breadcrumb */}
                {nodePath.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {nodePath.map((node, index) => {
                      const Icon = typeIcons[node.type];
                      return (
                        <div key={node.id} className="flex items-center gap-2">
                          {index > 0 && <ChevronRight className="w-3 h-3" />}
                          <Icon className={cn("w-4 h-4", typeColors[node.type])} />
                          <span>{node.name}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {/* Title and Stats */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {selectedNode.name}
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {notes.length} {notes.length === 1 ? 'note' : 'notes'}
                    </p>
                  </div>
                  <Badge variant="outline" className={typeColors[selectedNode.type]}>
                    {selectedNode.type}
                  </Badge>
                </div>
                
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search notes in this section..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 bg-white"
                  />
                </div>
              </div>

              {/* Notes List */}
              {notesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : filteredNotes.length === 0 ? (
                <Card className="p-12">
                  <div className="text-center">
                    <FileText className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      {searchQuery ? 'No matching notes' : 'No notes yet'}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      {searchQuery 
                        ? 'Try adjusting your search terms' 
                        : `Start by uploading audio or text to create notes in ${selectedNode.name}`}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => window.location.href = '/dashboard'}>
                        <FileText className="w-4 h-4 mr-2" />
                        Create Your First Note
                      </Button>
                    )}
                  </div>
                </Card>
              ) : (
                <div className="grid gap-3">
                  {filteredNotes.map(note => (
                    <Card key={note.job_id} className="p-4 hover:shadow-lg transition-all hover:-translate-y-0.5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate mb-1">
                            {note.lecture_title}
                          </h3>
                          {note.course_subject && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                              {note.course_subject}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(note.created_at), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(note.created_at), 'h:mm a')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNoteView(note.job_id)}
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/20"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleNoteDownload(note.job_id)}
                            className="hover:bg-green-50 dark:hover:bg-green-900/20"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-full min-h-[600px]">
              <div className="text-center max-w-md">
                <div className="mb-6">
                  <div className="w-24 h-24 mx-auto bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <GraduationCap className="w-12 h-12 text-gray-400 dark:text-gray-500" />
                  </div>
                </div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  Select a Study Item
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Choose a course, year, subject, or semester from the left sidebar to view and manage your notes
                </p>
                <div className="flex gap-3 justify-center">
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/dashboard/studies'}
                  >
                    Manage Organization
                  </Button>
                  <Button onClick={() => window.location.href = '/dashboard/notes'}>
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