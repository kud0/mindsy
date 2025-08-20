"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { 
  FolderPlus, 
  ChevronRight, 
  ChevronDown, 
  MoreVertical,
  Edit,
  Trash,
  BookOpen,
  Calendar,
  GraduationCap,
  FolderOpen,
  Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Note, StudyNode as DatabaseStudyNode } from '@/types/database';

type HierarchyType = 'course' | 'year' | 'subject' | 'semester' | 'custom';

interface StudyNode {
  id: string;
  user_id: string;
  parent_id: string | null;
  name: string;
  type: HierarchyType;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  children?: StudyNode[];
  note_count?: number;
}

const typeIcons: Record<HierarchyType, React.ComponentType<{ className?: string }>> = {
  course: GraduationCap,
  year: Calendar,
  subject: BookOpen,
  semester: FolderOpen,
  custom: FolderPlus,
};

const typeColors: Record<HierarchyType, string> = {
  course: 'text-blue-600',
  year: 'text-green-600',
  subject: 'text-purple-600',
  semester: 'text-orange-600',
  custom: 'text-gray-600',
};

// Pastel color palette for folders
const folderColorOptions = [
  { name: 'Rose', value: 'rose', class: 'bg-rose-300', border: 'border-l-rose-300' },
  { name: 'Blue', value: 'blue', class: 'bg-blue-300', border: 'border-l-blue-300' },
  { name: 'Green', value: 'green', class: 'bg-green-300', border: 'border-l-green-300' },
  { name: 'Yellow', value: 'yellow', class: 'bg-yellow-300', border: 'border-l-yellow-300' },
  { name: 'Purple', value: 'purple', class: 'bg-purple-300', border: 'border-l-purple-300' },
  { name: 'Indigo', value: 'indigo', class: 'bg-indigo-300', border: 'border-l-indigo-300' },
];

interface StudiesManagerProps {
  onNodeSelect?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  draggedLecture?: Note | null;
  draggedSelectedLectures?: string[];
  onLectureDrop?: (lectureId: string, targetNodeId: string) => void;
  onBulkLectureDrop?: (lectureIds: string[], targetNodeId: string) => void;
  onDragEnd?: () => void;
  onNodesLoaded?: (nodes: DatabaseStudyNode[]) => void;
}

export default function StudiesManager({
  onNodeSelect,
  selectedNodeId,
  draggedLecture,
  draggedSelectedLectures,
  onLectureDrop,
  onBulkLectureDrop,
  onDragEnd,
  onNodesLoaded
}: StudiesManagerProps) {
  const router = useRouter();
  const [nodes, setNodes] = useState<StudyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<StudyNode | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'course' as HierarchyType,
    description: '',
    parent_id: null as string | null,
    color: 'blue',
  });

  useEffect(() => {
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data: studyNodes, error } = await supabase
        .from('study_nodes')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      const hierarchicalNodes = buildHierarchy(studyNodes || []);
      setNodes(hierarchicalNodes);
      
      if (onNodesLoaded) {
        onNodesLoaded((studyNodes || []).map(node => ({
          id: node.id,
          name: node.name,
          type: node.type,
          parent_id: node.parent_id,
          color: node.color || undefined,
          children: []
        })));
      }
    } catch (error) {
      console.error('Error fetching study nodes:', error);
      toast.error('Failed to load study folders');
    } finally {
      setLoading(false);
    }
  };

  const buildHierarchy = (flatNodes: StudyNode[]): StudyNode[] => {
    const nodeMap = new Map<string, StudyNode>();
    const rootNodes: StudyNode[] = [];

    // Create a map of all nodes
    flatNodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Build the hierarchy
    flatNodes.forEach(node => {
      const nodeWithChildren = nodeMap.get(node.id)!;
      if (node.parent_id) {
        const parent = nodeMap.get(node.parent_id);
        if (parent) {
          parent.children!.push(nodeWithChildren);
        }
      } else {
        rootNodes.push(nodeWithChildren);
      }
    });

    return rootNodes;
  };

  const handleNodeClick = (nodeId: string) => {
    if (onNodeSelect) {
      onNodeSelect(nodeId === selectedNodeId ? null : nodeId);
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

  const handleCreateNode = () => {
    setIsCreateDialogOpen(true);
    setFormData({
      name: '',
      type: 'course',
      description: '',
      parent_id: selectedNodeId || null,
      color: 'blue',
    });
  };

  const handleCreate = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase.from('study_nodes').insert({
        user_id: user.id,
        name: formData.name,
        type: formData.type,
        description: formData.description || null,
        parent_id: formData.parent_id,
        color: formData.color,
        sort_order: 0,
      });

      if (error) throw error;

      toast.success('Study folder created successfully');
      setIsCreateDialogOpen(false);
      setFormData({
        name: '',
        type: 'course',
        description: '',
        parent_id: null,
        color: 'blue',
      });
      fetchNodes();
    } catch (error) {
      console.error('Error creating node:', error);
      toast.error('Failed to create study folder');
    }
  };

  const renderNode = (node: StudyNode, depth: number = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);
    const isSelected = selectedNodeId === node.id;
    const Icon = typeIcons[node.type] || FolderOpen;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
            isSelected && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
            `ml-${depth * 4}`
          )}
          style={{ marginLeft: `${depth * 16}px` }}
          onClick={() => handleNodeClick(node.id)}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = 'move';
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            
            if (draggedSelectedLectures && draggedSelectedLectures.length > 0) {
              onBulkLectureDrop?.(draggedSelectedLectures, node.id);
            } else if (draggedLecture) {
              onLectureDrop?.(draggedLecture.job_id, node.id);
            }
            onDragEnd?.();
          }}
        >
          {hasChildren && (
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-4 w-4 hover:bg-transparent"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </Button>
          )}
          
          {!hasChildren && <div className="w-4" />}
          
          <Icon className={cn("h-4 w-4 flex-shrink-0", typeColors[node.type])} />
          
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">
              {node.name}
            </span>
            {node.description && (
              <span className="text-xs text-gray-500 dark:text-gray-400 truncate block">
                {node.description}
              </span>
            )}
          </div>
          
          {node.note_count !== undefined && (
            <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {node.note_count}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSelectedNode(node)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="text-red-600">
                <Trash className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Study Folders
          </h2>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCreateNode}
            className="h-8 w-8 p-0"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* All Lectures Option */}
        <div
          className={cn(
            "flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors",
            !selectedNodeId && "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
          )}
          onClick={() => onNodeSelect?.(null)}
        >
          <FolderOpen className="h-4 w-4 text-gray-600" />
          <span className="text-sm font-medium">All Lectures</span>
        </div>
      </div>

      {/* Node Tree */}
      <div className="flex-1 overflow-y-auto p-2">
        {nodes.length === 0 ? (
          <div className="text-center py-8">
            <FolderPlus className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm mb-3">No study folders yet</p>
            <Button size="sm" onClick={handleCreateNode}>
              Create Your First Folder
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {nodes.map(node => renderNode(node, 0))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Study Folder</DialogTitle>
            <DialogDescription>
              Organize your lectures by creating folders for courses, years, or subjects.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Input
                placeholder="Folder name (e.g., Computer Science, Year 3)"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div>
              <Select value={formData.type} onValueChange={(value: HierarchyType) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="course">Course</SelectItem>
                  <SelectItem value="year">Year</SelectItem>
                  <SelectItem value="subject">Subject</SelectItem>
                  <SelectItem value="semester">Semester</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Input
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
            
            <div>
              <Select value={formData.color} onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {folderColorOptions.map(color => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-4 h-4 rounded", color.class)}></div>
                        {color.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}