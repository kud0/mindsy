import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { getAuthenticatedUser } from '@/lib/auth-sync';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Plus,
  GripVertical
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
  metadata: any;
  created_at: string;
  updated_at: string;
  children?: StudyNode[];
  note_count?: number;
}

const typeIcons: Record<HierarchyType, any> = {
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
  { name: 'Pink', value: 'pink', class: 'bg-pink-300', border: 'border-l-pink-300' },
  { name: 'Cyan', value: 'cyan', class: 'bg-cyan-300', border: 'border-l-cyan-300' },
  { name: 'Emerald', value: 'emerald', class: 'bg-emerald-300', border: 'border-l-emerald-300' },
  { name: 'Orange', value: 'orange', class: 'bg-orange-300', border: 'border-l-orange-300' },
  { name: 'Violet', value: 'violet', class: 'bg-violet-300', border: 'border-l-violet-300' },
  { name: 'Teal', value: 'teal', class: 'bg-teal-300', border: 'border-l-teal-300' },
];

interface StudiesManagerProps {
  onNodeSelect?: (nodeId: string | null) => void;
  selectedNodeId?: string | null;
  draggedLecture?: any; // Single lecture being dragged
  draggedSelectedLectures?: string[]; // Multiple selected lectures being dragged
  onLectureDrop?: (lectureId: string, nodeId: string) => void;
  onBulkLectureDrop?: (lectureIds: string[], nodeId: string) => void;
  onDragEnd?: () => void;
  onNodesLoaded?: (nodes: StudyNode[]) => void;
}

export default function StudiesManager({ 
  onNodeSelect, 
  selectedNodeId, 
  draggedLecture,
  draggedSelectedLectures = [],
  onLectureDrop, 
  onBulkLectureDrop,
  onDragEnd,
  onNodesLoaded
}: StudiesManagerProps = {}) {
  const [nodes, setNodes] = useState<StudyNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<StudyNode | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Drag and drop states
  const [draggedNode, setDraggedNode] = useState<StudyNode | null>(null);
  const [dragOverNode, setDragOverNode] = useState<string | null>(null);
  const [dropPosition, setDropPosition] = useState<'before' | 'inside' | 'after' | null>(null);
  const dragCounter = useRef(0);
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    type: 'course' as HierarchyType,
    description: '',
    parent_id: null as string | null,
    color: 'blue' as string,
  });

  useEffect(() => {
    // Initialize and fetch nodes on mount
    fetchNodes();
  }, []);

  const fetchNodes = async () => {
    
    try {
      setLoading(true);
      const user = await getAuthenticatedUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('study_nodes')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order')
        .order('name');

      if (error) throw error;

      // Build tree structure
      const tree = buildTree(data || []);
      setNodes(tree);
      
      // Pass flat array of all nodes to parent component
      if (onNodesLoaded) {
        onNodesLoaded(data || []);
      }
    } catch (error) {
      console.error('Error fetching nodes:', error);
      toast.error('Failed to load studies');
    } finally {
      setLoading(false);
    }
  };

  const buildTree = (flatNodes: StudyNode[]): StudyNode[] => {
    const nodeMap = new Map<string, StudyNode>();
    const rootNodes: StudyNode[] = [];

    // First pass: create all nodes
    flatNodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Second pass: build tree
    flatNodes.forEach(node => {
      const currentNode = nodeMap.get(node.id)!;
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(currentNode);
      } else {
        rootNodes.push(currentNode);
      }
    });

    return rootNodes;
  };

  const handleCreate = async () => {
    
    try {
      const user = await getAuthenticatedUser();
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

      toast.success('Study node created successfully');
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
      toast.error('Failed to create study node');
    }
  };

  const handleEdit = async () => {
    if (!selectedNode) return;

    try {
      const { error } = await supabase
        .from('study_nodes')
        .update({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
        })
        .eq('id', selectedNode.id);

      if (error) throw error;

      toast.success('Study node updated successfully');
      setIsEditDialogOpen(false);
      fetchNodes();
    } catch (error) {
      console.error('Error updating node:', error);
      toast.error('Failed to update study node');
    }
  };


  const handleDelete = async (node: StudyNode) => {
    
    if (!confirm(`Are you sure you want to delete "${node.name}"? This will also delete all child nodes.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('study_nodes')
        .delete()
        .eq('id', node.id);

      if (error) throw error;

      toast.success('Study node deleted successfully');
      fetchNodes();
    } catch (error) {
      console.error('Error deleting node:', error);
      toast.error('Failed to delete study node');
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

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, node: StudyNode) => {
    e.stopPropagation();
    setDraggedNode(node);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', node.id);
  };

  const handleDragOver = (e: React.DragEvent, node: StudyNode, position: 'before' | 'inside' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!draggedNode || draggedNode.id === node.id) return;
    
    // Prevent dropping a parent into its own child
    if (isDescendant(draggedNode, node)) return;
    
    setDragOverNode(node.id);
    setDropPosition(position);
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounter.current++;
  };

  const handleDragLeave = (e: React.DragEvent) => {
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setDragOverNode(null);
      setDropPosition(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetNode: StudyNode, position: 'before' | 'inside' | 'after') => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    
    if (!draggedNode || draggedNode.id === targetNode.id) {
      setDraggedNode(null);
      setDragOverNode(null);
      setDropPosition(null);
      return;
    }
    
    // Prevent dropping a parent into its own child
    if (isDescendant(draggedNode, targetNode)) {
      toast.error('Cannot move a folder into its own subfolder');
      setDraggedNode(null);
      setDragOverNode(null);
      setDropPosition(null);
      return;
    }
    
    try {
      const user = await getAuthenticatedUser();
      if (!user) return;
      
      // Get all nodes for reordering
      const { data: allNodes, error: fetchError } = await supabase
        .from('study_nodes')
        .select('*')
        .eq('user_id', user.id)
        .order('sort_order');
      
      if (fetchError) throw fetchError;
      
      let newParentId: string | null = null;
      let newSortOrder = 0;
      
      if (position === 'inside') {
        // Drop inside the target node
        newParentId = targetNode.id;
        const siblings = allNodes?.filter(n => n.parent_id === targetNode.id) || [];
        newSortOrder = siblings.length;
      } else {
        // Drop before or after the target node
        newParentId = targetNode.parent_id;
        const siblings = allNodes?.filter(n => n.parent_id === targetNode.parent_id) || [];
        const targetIndex = siblings.findIndex(n => n.id === targetNode.id);
        
        if (position === 'before') {
          newSortOrder = targetIndex;
        } else {
          newSortOrder = targetIndex + 1;
        }
        
        // Update sort_order for siblings
        const updates = siblings
          .filter(n => n.id !== draggedNode.id)
          .map((node, index) => {
            let order = index;
            if (index >= newSortOrder) order++;
            return supabase
              .from('study_nodes')
              .update({ sort_order: order })
              .eq('id', node.id);
          });
        
        await Promise.all(updates);
      }
      
      // Update the dragged node
      const { error: updateError } = await supabase
        .from('study_nodes')
        .update({
          parent_id: newParentId,
          sort_order: newSortOrder
        })
        .eq('id', draggedNode.id);
      
      if (updateError) throw updateError;
      
      toast.success('Folder moved successfully');
      fetchNodes();
    } catch (error) {
      console.error('Error moving node:', error);
      toast.error('Failed to move folder');
    } finally {
      setDraggedNode(null);
      setDragOverNode(null);
      setDropPosition(null);
    }
  };

  const handleDragEnd = () => {
    dragCounter.current = 0;
    setDraggedNode(null);
    setDragOverNode(null);
    setDropPosition(null);
  };

  // Helper function to check if a node is a descendant of another
  const isDescendant = (parent: StudyNode, potentialChild: StudyNode): boolean => {
    if (!parent.children || parent.children.length === 0) return false;
    
    for (const child of parent.children) {
      if (child.id === potentialChild.id) return true;
      if (isDescendant(child, potentialChild)) return true;
    }
    
    return false;
  };

  const getNextType = (parentType: HierarchyType | undefined): HierarchyType => {
    if (!parentType) return 'course';
    const typeOrder: Record<HierarchyType, HierarchyType> = {
      course: 'year',
      year: 'subject',
      subject: 'semester',
      semester: 'custom',
      custom: 'custom',
    };
    return typeOrder[parentType];
  };

  const renderNode = (node: StudyNode, depth: number = 0) => {
    const Icon = typeIcons[node.type];
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children && node.children.length > 0;
    const isDragOver = dragOverNode === node.id;
    
    // Get the color border class for this folder
    const getColorBorderClass = (color: string | null) => {
      if (!color) return 'border-l-gray-300 dark:border-l-gray-600';
      const colorOption = folderColorOptions.find(option => option.value === color);
      return colorOption ? colorOption.border : 'border-l-gray-300 dark:border-l-gray-600';
    };

    return (
      <div key={node.id} className="w-full">
        {/* Drop zone before */}
        <div
          className={cn(
            "h-1 transition-all",
            isDragOver && dropPosition === 'before' && "bg-blue-500"
          )}
          onDragOver={(e) => handleDragOver(e, node, 'before')}
          onDrop={(e) => handleDrop(e, node, 'before')}
        />
        
        <div
          className={cn(
            "flex items-center justify-between px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors cursor-pointer border-l-4",
            getColorBorderClass(node.color),
            isDragOver && dropPosition === 'inside' && "ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/30",
            draggedNode?.id === node.id && "opacity-50",
            selectedNodeId === node.id && "bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-500",
            draggedLecture && isDragOver && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/30",
            draggedSelectedLectures.length > 0 && isDragOver && "ring-2 ring-green-500 bg-green-50 dark:bg-green-900/30"
          )}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            setSelectedNode(node);
            onNodeSelect?.(node.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            if (draggedLecture || draggedSelectedLectures.length > 0) {
              // Handle lecture(s) being dragged over folder
              e.dataTransfer.dropEffect = 'move';
              setDragOverNode(node.id);
            } else {
              // Handle folder being dragged over folder  
              handleDragOver(e, node, 'inside');
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            
            // Prioritize bulk operations over single operations
            if (draggedSelectedLectures.length > 0 && onBulkLectureDrop) {
              // Drop selected lectures into folder (bulk operation)
              onBulkLectureDrop(draggedSelectedLectures, node.id);
              onDragEnd?.();
              setDragOverNode(null);
              return; // Exit early to prevent other handlers
            } 
            
            if (draggedLecture && onLectureDrop) {
              // Drop single lecture into folder
              onLectureDrop(draggedLecture.job_id, node.id);
              onDragEnd?.();
              setDragOverNode(null);
              return; // Exit early to prevent other handlers
            }
            
            // Drop folder into folder
            handleDrop(e, node, 'inside');
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* Drag handle */}
            <div
              draggable
              onDragStart={(e) => handleDragStart(e, node)}
              onDragEnd={handleDragEnd}
              className="cursor-move p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
            >
              <GripVertical className="w-3 h-3 text-gray-400" />
            </div>
            
            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent folder selection
                toggleExpanded(node.id);
              }}
              className="p-0.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded flex-shrink-0"
              disabled={!hasChildren}
            >
              {hasChildren ? (
                isExpanded ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronRight className="w-3 h-3" />
                )
              ) : (
                <div className="w-3 h-3" />
              )}
            </button>
            
            {!node.parent_id ? (
              <GraduationCap className="w-4 h-4 flex-shrink-0 text-blue-600" />
            ) : (
              <Icon className={cn("w-4 h-4 flex-shrink-0", typeColors[node.type])} />
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-sm truncate">{node.name}</span>
              </div>
              {node.description && (
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {node.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setFormData({
                  name: '',
                  type: getNextType(node.type),
                  description: '',
                  parent_id: node.id,
                  color: 'blue',
                });
                setIsCreateDialogOpen(true);
              }}
              className="h-6 w-6 p-0"
            >
              <Plus className="w-3 h-3" />
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <MoreVertical className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={() => {
                    setSelectedNode(node);
                    setFormData({
                      name: node.name,
                      type: node.type,
                      description: node.description || '',
                      parent_id: node.parent_id,
                      color: node.color || 'blue',
                    });
                    setIsEditDialogOpen(true);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => handleDelete(node)}
                  className="text-red-600"
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Drop zone after */}
        <div
          className={cn(
            "h-1 transition-all",
            isDragOver && dropPosition === 'after' && "bg-blue-500"
          )}
          onDragOver={(e) => handleDragOver(e, node, 'after')}
          onDrop={(e) => handleDrop(e, node, 'after')}
        />
        
        {isExpanded && hasChildren && (
          <div>
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold font-excalifont">My Studies</h1>
          <Button
            onClick={() => {
              setFormData({
                name: '',
                type: 'custom',
                description: '',
                parent_id: null,
                color: 'blue',
              });
              setIsCreateDialogOpen(true);
            }}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Study
          </Button>
        </div>
        <p className="text-gray-500 dark:text-gray-400 font-light mt-4 mb-4 max-w-2xl">
          Organize your courses, years, subjects, and semesters. Drag lectures to organize them.
        </p>
      </div>

      <Card className="p-6">

        {nodes.length === 0 ? (
          <div className="text-center py-12">
            <FolderPlus className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No folders yet. Start by creating your first folder.
            </p>
            <Button
              onClick={() => {
                setFormData({
                  name: '',
                  type: 'custom',
                  description: '',
                  parent_id: null,
                  color: 'blue',
                });
                setIsCreateDialogOpen(true);
              }}
            >
              Create Your First Folder
            </Button>
          </div>
        ) : (
          <div className="space-y-0.5">
            {nodes.map(node => renderNode(node))}
          </div>
        )}
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create {formData.parent_id ? 'Subfolder' : 'Folder'}
            </DialogTitle>
            <DialogDescription>
              Add a new folder to organize your lectures.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter folder name"
              />
            </div>

            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a description"
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {folderColorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      color.class,
                      formData.color === color.value 
                        ? "border-gray-900 dark:border-gray-100 scale-110" 
                        : "border-gray-300 dark:border-gray-600 hover:scale-105"
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!formData.name}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {selectedNode?.type}</DialogTitle>
            <DialogDescription>
              Update the details of this {selectedNode?.type}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder={`Enter ${formData.type} name`}
              />
            </div>

            <div>
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Input
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a description"
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {folderColorOptions.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      color.class,
                      formData.color === color.value 
                        ? "border-gray-900 dark:border-gray-100 scale-110" 
                        : "border-gray-300 dark:border-gray-600 hover:scale-105"
                    )}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEdit} disabled={!formData.name}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}