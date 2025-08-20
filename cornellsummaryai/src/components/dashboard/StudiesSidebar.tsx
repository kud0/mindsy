import React, { useState, useEffect } from 'react';
import { 
  Home, 
  FileText, 
  Plus, 
  Upload, 
  ChevronDown,
  ChevronRight,
  User,
  GraduationCap,
  BookOpen,
  Calendar,
  FolderOpen,
  FolderPlus,
  Book,
  Settings
} from 'lucide-react';
import { PomodoroTimer } from './PomodoroTimer';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type HierarchyType = 'course' | 'year' | 'subject' | 'semester' | 'custom';

interface StudyNode {
  id: string;
  parent_id: string | null;
  name: string;
  type: HierarchyType;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  depth: number;
  has_children: boolean;
  note_count: number;
}

interface StudiesSidebarProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    plan: 'free' | 'student';
    minutesUsed?: number;
    minutesLimit?: number;
  };
  selectedNodeId?: string;
  currentView?: 'notes' | 'studies' | 'exams' | 'account';
  onNodeSelect: (nodeId: string) => void;
  onUpload: () => void;
  onUploadText: () => void;
  onNavigate: (path: string) => void;
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

export function StudiesSidebar({
  user,
  selectedNodeId,
  currentView = 'notes',
  onNodeSelect,
  onUpload,
  onUploadText,
  onNavigate
}: StudiesSidebarProps) {
  const [pinnedNodes, setPinnedNodes] = useState<StudyNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [supabase, setSupabase] = useState<any>(null);

  useEffect(() => {
    // Initialize supabase on client side
    if (typeof window !== 'undefined' && window.supabase) {
      setSupabase(window.supabase);
    }
  }, []);

  useEffect(() => {
    if (supabase) {
      fetchPinnedNodes();
    }
  }, [supabase]);

  const fetchPinnedNodes = async () => {
    if (!supabase) return;
    
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Call the stored procedure to get pinned nodes with hierarchy
      const { data, error } = await supabase.rpc('get_pinned_nodes', {
        p_user_id: user.id
      });

      if (error) throw error;

      setPinnedNodes(data || []);
      
      // Auto-expand all pinned root nodes
      const rootPinned = (data || []).filter((n: StudyNode) => n.depth === 0);
      setExpandedNodes(new Set(rootPinned.map((n: StudyNode) => n.id)));
    } catch (error) {
      console.error('Error fetching pinned nodes:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (nodeId: string) => {
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

  const buildTree = (nodes: StudyNode[]): StudyNode[] => {
    const nodeMap = new Map<string, StudyNode & { children?: StudyNode[] }>();
    const rootNodes: (StudyNode & { children?: StudyNode[] })[] = [];

    // Create all nodes
    nodes.forEach(node => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    // Build tree structure
    nodes.forEach(node => {
      const currentNode = nodeMap.get(node.id)!;
      if (node.parent_id && nodeMap.has(node.parent_id)) {
        const parent = nodeMap.get(node.parent_id)!;
        if (!parent.children) parent.children = [];
        parent.children.push(currentNode);
      } else if (node.depth === 0) {
        rootNodes.push(currentNode);
      }
    });

    return rootNodes;
  };

  const renderNode = (node: StudyNode & { children?: StudyNode[] }, level: number = 0) => {
    const Icon = typeIcons[node.type];
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.has_children || (node.children && node.children.length > 0);
    const isSelected = selectedNodeId === node.id;

    return (
      <div key={node.id}>
        <div
          className={cn(
            "group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer",
            isSelected && "bg-accent"
          )}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
          onClick={() => onNodeSelect(node.id)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.id);
              }}
              className="p-0.5 hover:bg-background rounded"
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
            </button>
          ) : (
            <div className="w-4" />
          )}
          
          <Icon className={cn("h-4 w-4", typeColors[node.type])} />
          
          <span className="flex-1 text-sm truncate">
            {node.name}
          </span>
          
          {node.note_count > 0 && (
            <Badge variant="secondary" className="ml-auto text-xs">
              {node.note_count}
            </Badge>
          )}
        </div>
        
        {isExpanded && node.children && node.children.length > 0 && (
          <div>
            {node.children.map(child => renderNode(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  const getPlanColor = (plan: string) => {
    return plan === 'student' 
      ? 'bg-gradient-to-r from-green-500 to-teal-500'
      : 'bg-gray-500';
  };

  const treeNodes = buildTree(pinnedNodes);

  return (
    <TooltipProvider>
      <div className="flex h-full w-full flex-col border-r bg-background">
        {/* User Section */}
        <div className="p-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="w-full justify-start gap-2 px-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-1">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <ChevronDown className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                </div>
                <Badge className={cn("text-white flex-shrink-0", getPlanColor(user.plan))}>
                  {user.plan.toUpperCase()}
                </Badge>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuItem onClick={() => onNavigate('/dashboard/account')}>
                <User className="mr-2 h-4 w-4" />
                Account Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNavigate('/dashboard/billing')}>
                <Settings className="mr-2 h-4 w-4" />
                Billing & Plans
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onNavigate('/logout')}>
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Separator />

        {/* Section Title */}
        <div className="p-4 pb-2">
          <h3 className="font-semibold text-lg text-center">My Summaries</h3>
        </div>

        {/* Pomodoro Timer */}
        <PomodoroTimer 
          onExpand={() => onNavigate('/dashboard/pomodoro')}
        />

        <Separator />

        {/* Main Navigation */}
        <div className="p-4 space-y-1">
          <Button
            variant={currentView === 'studies' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onNavigate('/dashboard/studies')}
          >
            <Book className="mr-2 h-4 w-4" />
            Studies Organization
          </Button>
          
          <Button
            variant={currentView === 'exams' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => onNavigate('/dashboard/exams')}
          >
            <GraduationCap className="mr-2 h-4 w-4" />
            Exam Center
          </Button>
          
          <Button
            variant={currentView === 'notes' && selectedNodeId === '' ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => {
              onNavigate('/dashboard');
              onNodeSelect('');
            }}
          >
            <Home className="mr-2 h-4 w-4" />
            All Notes
          </Button>
        </div>

        <Separator />

        {/* Upload Actions */}
        <div className="p-4 space-y-2">
          <Button onClick={onUpload} className="w-full">
            <Upload className="mr-2 h-4 w-4" />
            Upload Audio
          </Button>
          <Button onClick={onUploadText} variant="outline" className="w-full">
            <FileText className="mr-2 h-4 w-4" />
            Upload Notes
          </Button>
        </div>

        <Separator />

        {/* Pinned Study Nodes */}
        {treeNodes.length > 0 && (
          <>
            <div className="flex-1 overflow-hidden">
              <div className="px-4 py-2">
                <h3 className="text-xs font-semibold uppercase text-muted-foreground">
                  Pinned Studies
                </h3>
              </div>
              <ScrollArea className="h-full px-2">
                <div className="space-y-1 pb-4">
                  {loading ? (
                    <div className="flex justify-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 dark:border-white"></div>
                    </div>
                  ) : (
                    treeNodes.map(node => renderNode(node))
                  )}
                </div>
              </ScrollArea>
            </div>
            <Separator />
          </>
        )}

        {/* Studies Link at Bottom */}
        <div className="p-4">
          <Button 
            onClick={() => onNavigate('/dashboard/studies')} 
            variant="outline" 
            className="w-full"
          >
            <Plus className="mr-2 h-4 w-4" />
            Manage Studies
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}