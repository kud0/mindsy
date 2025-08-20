import React, { useState } from 'react';
import { 
  Home, 
  FileText, 
  Folder, 
  Plus, 
  Upload, 
  Settings,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  Edit,
  Trash,
  FolderPlus,
  User,
  Timer,
  GraduationCap,
  BookOpen
} from 'lucide-react';
import { PomodoroTimer } from './PomodoroTimer';
import { PomodoroProvider } from '@/stores/pomodoro';
import { UploadDrawer } from './UploadDrawer';
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Folder {
  id: string;
  name: string;
  count: number;
  parentId?: string;
  subfolders?: Folder[];
}

interface DashboardSidebarProps {
  user: {
    name: string;
    email: string;
    avatar?: string;
    plan: 'free' | 'student';
    minutesUsed?: number;
    minutesLimit?: number;
  };
  folders: Folder[];
  selectedFolder?: string;
  currentView?: 'notes' | 'account'; // Add currentView prop
  onFolderSelect: (folderId: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onRenameFolder: (folderId: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onUpload: () => void;
  onUploadText: () => void;
  onNavigate: (path: string) => void;
}

export function DashboardSidebar({
  user,
  folders,
  selectedFolder,
  currentView = 'notes',
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onUpload,
  onUploadText,
  onNavigate
}: DashboardSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const renderFolder = (folder: Folder, level = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const hasSubfolders = folder.subfolders && folder.subfolders.length > 0;
    const isSelected = selectedFolder === folder.id;

    if (hasSubfolders) {
      return (
        <Collapsible key={folder.id} open={isExpanded}>
          <div
            className={cn(
              "group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer",
              isSelected && "bg-accent",
              level > 0 && "ml-4"
            )}
          >
            <CollapsibleTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleFolder(folder.id);
                }}
                className="p-0.5 hover:bg-background rounded"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </button>
            </CollapsibleTrigger>
            
            <Folder className="h-4 w-4 text-muted-foreground" />
            
            <span
              onClick={() => onFolderSelect(folder.id)}
              className="flex-1 text-sm truncate"
            >
              {folder.name}
            </span>
            
            <Badge variant="secondary" className="ml-auto text-xs">
              {folder.count}
            </Badge>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
                >
                  <MoreVertical className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
                  <FolderPlus className="mr-2 h-3 w-3" />
                  New Subfolder
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onRenameFolder(folder.id)}>
                  <Edit className="mr-2 h-3 w-3" />
                  Rename
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDeleteFolder(folder.id)}
                  className="text-destructive"
                >
                  <Trash className="mr-2 h-3 w-3" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <CollapsibleContent>
            <div className="ml-2">
              {folder.subfolders!.map(subfolder => renderFolder(subfolder, level + 1))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      );
    }

    // Folder without subfolders
    return (
      <div key={folder.id}>
        <div
          className={cn(
            "group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer",
            isSelected && "bg-accent",
            level > 0 && "ml-4"
          )}
        >
          <div className="w-4" />
          
          <Folder className="h-4 w-4 text-muted-foreground" />
          
          <span
            onClick={() => onFolderSelect(folder.id)}
            className="flex-1 text-sm truncate"
          >
            {folder.name}
          </span>
          
          <Badge variant="secondary" className="ml-auto text-xs">
            {folder.count}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100"
              >
                <MoreVertical className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onCreateFolder(folder.id)}>
                <FolderPlus className="mr-2 h-3 w-3" />
                New Subfolder
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRenameFolder(folder.id)}>
                <Edit className="mr-2 h-3 w-3" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDeleteFolder(folder.id)}
                className="text-destructive"
              >
                <Trash className="mr-2 h-3 w-3" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  };

  const handleNavigate = (path: string) => {
    onNavigate(path);
  };

  const menuItems = [
    {
      icon: Home,
      label: 'Dashboard',
      path: '/dashboard'
    },
    {
      icon: FileText,
      label: 'All Notes',
      path: '/dashboard/notes',
      action: () => {
        onNavigate('notes');
        onFolderSelect('');
      }
    },
    {
      icon: BookOpen,
      label: 'Studies Organization',
      path: '/dashboard/studies'
    },
    {
      icon: GraduationCap,
      label: 'Exam Center',
      path: '/dashboard/exams'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/dashboard/notes') {
      return currentView === 'notes' && selectedFolder === '';
    }
    return false; // For other paths, we'll handle this based on current view
  };

  return (
    <TooltipProvider>
      <div className="flex h-full w-full flex-col bg-white dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800">
        {/* Branding Section */}
        <div className="h-16 px-6 flex items-center border-b border-gray-200 dark:border-gray-800">
          <a href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <span className="text-white dark:text-black font-bold text-lg">K</span>
            </div>
            <span className="font-semibold text-lg">Mindsy</span>
          </a>
        </div>

        {/* Pomodoro Timer */}
        <div className="border-b border-gray-200 dark:border-gray-800">
          <PomodoroProvider>
            <div className="px-4 py-3">
              <PomodoroTimer 
                onExpand={() => onNavigate('/dashboard/pomodoro')}
              />
            </div>
          </PomodoroProvider>
        </div>

        {/* Main Navigation */}
        <div className="px-4 py-4">
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-10 px-3",
                    active && "bg-gray-100 dark:bg-gray-800"
                  )}
                  onClick={() => item.action ? item.action() : handleNavigate(item.path)}
                >
                  <Icon className={cn(
                    "h-4 w-4 mr-3",
                    active ? "text-gray-900 dark:text-gray-100" : "text-gray-500"
                  )} />
                  <span className={cn(
                    "text-sm",
                    active ? "text-gray-900 dark:text-gray-100 font-medium" : "text-gray-600 dark:text-gray-400"
                  )}>
                    {item.label}
                  </span>
                </Button>
              );
            })}
          </nav>
        </div>

        <Separator className="bg-gray-200 dark:bg-gray-800" />

        {/* Notes-specific Navigation */}
        <div className="px-4 py-2">
          <Button
            variant={currentView === 'notes' && selectedFolder === 'unfiled' ? "secondary" : "ghost"}
            className="w-full justify-start h-10 px-3"
            onClick={() => {
              onNavigate('notes');
              onFolderSelect('unfiled');
            }}
          >
            <FileText className="h-4 w-4 mr-3 text-gray-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Unfiled Notes
            </span>
          </Button>
        </div>

        <Separator className="bg-gray-200 dark:bg-gray-800" />

        {/* Upload Actions */}
        <div className="px-4 py-4">
          <UploadDrawer
            trigger={
              <Button className="w-full bg-black hover:bg-gray-800 text-white">
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            }
            folders={folders}
            onAudioUpload={(file, folderId) => {
              console.log('Audio upload:', { file, folderId });
            }}
            onTextUpload={(text, options, folderId) => {
              console.log('Text upload:', { text, options, folderId });
            }}
          />
        </div>

        <Separator />

        {/* Folders */}
        <div className="flex-1 overflow-hidden">
          <div className="px-4 py-2">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">
              Folders
            </h3>
          </div>
          <ScrollArea className="h-full px-2">
            <div className="space-y-1 pb-4">
              {folders
                .filter(folder => !folder.parentId) // Only show root folders
                .map(folder => renderFolder(folder))}
            </div>
          </ScrollArea>
        </div>

        <Separator />

        {/* New Folder Action */}
        <div className="p-4">
          <Button onClick={onCreateFolder} variant="outline" className="w-full">
            <FolderPlus className="mr-2 h-4 w-4" />
            New Folder
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
}