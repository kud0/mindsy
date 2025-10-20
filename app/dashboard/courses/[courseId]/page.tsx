'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users, FolderOpen, Plus, Trash2, ChevronDown, ChevronRight, MoreVertical, Edit, FolderPlus, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  course_code: string;
  course_name?: string;
  institution: string;
  semester?: string;
  type_of_study?: string;
  year?: string;
  enrollment_count: number;
  is_creator: boolean;
}

interface Folder {
  id: string;
  folder_name: string;
  folder_order: number;
  parent_folder_id: string | null;
  created_at: string;
  lecture_count?: number; // Count of lectures in this folder
  children?: Folder[]; // For building tree structure
}

export default function CoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'students'>('templates');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Folder management state
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [deletingFolder, setDeletingFolder] = useState<Folder | null>(null);
  const [creatingFolderParent, setCreatingFolderParent] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadCourseData();
  }, [courseId]);

  const buildFolderTree = (folders: Folder[]): Folder[] => {
    const folderMap = new Map<string, Folder>();
    const rootFolders: Folder[] = [];

    // First pass: create map of all folders
    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    // Second pass: build tree structure
    folders.forEach(folder => {
      const currentFolder = folderMap.get(folder.id)!;
      if (folder.parent_folder_id === null) {
        // Root folder
        rootFolders.push(currentFolder);
      } else {
        // Child folder - add to parent
        const parent = folderMap.get(folder.parent_folder_id);
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(currentFolder);
        }
      }
    });

    return rootFolders;
  };

  const loadCourseData = async () => {
    try {
      // Load course details
      const courseResponse = await fetch(`/api/courses/${courseId}`);
      const courseData = await courseResponse.json();

      if (courseData.success) {
        setCourse(courseData.course);
      }

      // Load user's folders for this course
      const foldersResponse = await fetch(`/api/courses/${courseId}/folders`);
      const foldersData = await foldersResponse.json();

      if (foldersData.success) {
        const flatFolders = foldersData.folders || [];
        // Build tree structure from flat list
        const treeFolders = buildFolderTree(flatFolders);
        setFolders(treeFolders);
        // Expand all folders by default
        const allFolderIds = new Set(treeFolders.map(f => f.id));
        setExpandedFolders(allFolderIds);
      }
    } catch (error) {
      console.error('Error loading course data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        // Redirect to dashboard after successful deletion
        router.push('/dashboard');
      } else {
        alert(data.error || 'Failed to delete course');
        setIsDeleting(false);
        setShowDeleteConfirm(false);
      }
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  // Folder management handlers
  const handleEditFolder = async () => {
    if (!editingFolder || !editFolderName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/folders/${editingFolder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_name: editFolderName.trim() })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Folder renamed successfully');
        setEditingFolder(null);
        setEditFolderName('');
        await loadCourseData();
      } else {
        toast.error(data.error || 'Failed to rename folder');
      }
    } catch (error) {
      console.error('Error renaming folder:', error);
      toast.error('Failed to rename folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!deletingFolder) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/folders/${deletingFolder.id}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (data.success) {
        toast.success(`Deleted ${data.deleted_count} folder(s)`);
        setDeletingFolder(null);
        await loadCourseData();
      } else {
        toast.error(data.error || 'Failed to delete folder');
      }
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_name: newFolderName.trim(),
          parent_folder_id: creatingFolderParent
        })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Folder created successfully');
        setCreatingFolderParent(null);
        setNewFolderName('');
        await loadCourseData();

        // Expand parent if creating subfolder
        if (creatingFolderParent) {
          setExpandedFolders(prev => new Set([...prev, creatingFolderParent]));
        }
      } else {
        toast.error(data.error || 'Failed to create folder');
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      toast.error('Failed to create folder');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReorderFolder = async (folder: Folder, direction: 'up' | 'down') => {
    // Get siblings (same parent)
    const allFolders = await fetch(`/api/courses/${courseId}/folders`).then(r => r.json());
    if (!allFolders.success) return;

    const siblings = allFolders.folders
      .filter((f: Folder) => f.parent_folder_id === folder.parent_folder_id)
      .sort((a: Folder, b: Folder) => a.folder_order - b.folder_order);

    const currentIndex = siblings.findIndex((f: Folder) => f.id === folder.id);
    if (currentIndex === -1) return;

    const swapIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (swapIndex < 0 || swapIndex >= siblings.length) {
      toast.error('Cannot move folder further in that direction');
      return;
    }

    const swapFolder = siblings[swapIndex];

    try {
      // Swap orders
      await fetch(`/api/folders/${folder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_order: swapFolder.folder_order })
      });

      await fetch(`/api/folders/${swapFolder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_order: folder.folder_order })
      });

      toast.success('Folder reordered');
      await loadCourseData();
    } catch (error) {
      console.error('Error reordering folder:', error);
      toast.error('Failed to reorder folder');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading course...</p>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Course not found
          </h2>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {course.course_code}
                {course.course_name && ` - ${course.course_name}`}
              </h1>
              <p className="text-muted-foreground mt-1">
                {course.institution}
                {course.semester && ` • ${course.semester}`}
                {course.year && ` • ${course.year}`}
              </p>
              <div className="flex items-center gap-2 mt-3">
                <span className="flex items-center gap-1 text-sm text-foreground">
                  <Users className="w-4 h-4" />
                  {course.enrollment_count} {course.enrollment_count === 1 ? 'student' : 'students'}
                </span>
                <span className="px-2 py-1 bg-green-500/10 text-green-700 dark:text-green-400 text-xs rounded font-medium">
                  ✓ Enrolled
                </span>
              </div>
            </div>

            {/* Delete button - only shown to course creator */}
            {course.is_creator && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Course
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'templates'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <FolderOpen className="w-4 h-4 inline mr-2" />
              My Folders
            </button>
            <button
              onClick={() => setActiveTab('students')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'students'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Students
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'templates' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Your Course Folders
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Organize your lectures and materials into these folders
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCreatingFolderParent(null)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Folder
              </Button>
            </div>

            {folders.length > 0 ? (
              <div className="space-y-6">
                {folders.map((folder) => {
                  const isExpanded = expandedFolders.has(folder.id);
                  return (
                    <div key={folder.id} className="space-y-3">
                      {/* Section Header (collapsible separator) */}
                      <div className="flex items-center gap-3 px-1 w-full group">
                        <button
                          onClick={() => toggleFolder(folder.id)}
                          className="flex items-center gap-3 flex-1 hover:opacity-70 transition-opacity"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <FolderOpen className="w-5 h-5 text-primary flex-shrink-0" />
                          <h3 className="text-lg font-semibold text-foreground">
                            {folder.folder_name}
                          </h3>
                          {folder.children && folder.children.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                              ({folder.children.length} {folder.children.length === 1 ? 'subject' : 'subjects'})
                            </span>
                          )}
                        </button>

                        {/* Context Menu for Section Header */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => {
                              setEditingFolder(folder);
                              setEditFolderName(folder.folder_name);
                            }}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Name
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setCreatingFolderParent(folder.id)}>
                              <FolderPlus className="w-4 h-4 mr-2" />
                              Create Subfolder
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeletingFolder(folder)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Child Folders (actual clickable folders) */}
                      {isExpanded && folder.children && folder.children.length > 0 && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 animate-in fade-in duration-200">
                          {folder.children.map((childFolder, index) => (
                            <div key={childFolder.id} className="relative group">
                              <button
                                onClick={() => router.push(`/dashboard/courses/${courseId}/folders/${childFolder.id}`)}
                                className="w-full bg-card border border-border rounded-lg p-4 hover:shadow-md hover:border-primary transition-all cursor-pointer text-left"
                              >
                                <div className="flex items-start gap-3">
                                  <FolderOpen className="w-5 h-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                                  <div className="flex-1 min-w-0">
                                    <h4 className="font-medium text-foreground truncate text-sm">
                                      {childFolder.folder_name}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {childFolder.lecture_count || 0} {childFolder.lecture_count === 1 ? 'lecture' : 'lectures'}
                                    </p>
                                  </div>
                                </div>
                              </button>

                              {/* Context Menu for Child Folder */}
                              <div className="absolute top-2 right-2">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7 p-0"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingFolder(childFolder);
                                      setEditFolderName(childFolder.folder_name);
                                    }}>
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit Name
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    {index > 0 && (
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleReorderFolder(childFolder, 'up');
                                      }}>
                                        <ArrowUp className="w-4 h-4 mr-2" />
                                        Move Up
                                      </DropdownMenuItem>
                                    )}
                                    {index < folder.children!.length - 1 && (
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        handleReorderFolder(childFolder, 'down');
                                      }}>
                                        <ArrowDown className="w-4 h-4 mr-2" />
                                        Move Down
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setDeletingFolder(childFolder);
                                      }}
                                      className="text-red-600 focus:text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-card border border-border rounded-lg p-12 text-center">
                <FolderOpen className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  No folders yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Folders help you organize your lectures by topic, week, or however you prefer
                </p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Folder
                </Button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'students' && (
          <div className="bg-card border border-border rounded-lg p-12 text-center">
            <Users className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Students List
            </h3>
            <p className="text-muted-foreground">
              Coming soon - see who else is in your course
            </p>
          </div>
        )}
      </div>

      {/* Edit Folder Name Dialog */}
      <Dialog open={!!editingFolder} onOpenChange={(open) => !open && setEditingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Folder Name</DialogTitle>
            <DialogDescription>
              Rename "{editingFolder?.folder_name}" to something else
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="folder-name">Folder Name</Label>
            <Input
              id="folder-name"
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) {
                  handleEditFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditingFolder(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditFolder}
              disabled={isSubmitting || !editFolderName.trim()}
            >
              {isSubmitting ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Confirmation Dialog */}
      <Dialog open={!!deletingFolder} onOpenChange={(open) => !open && setDeletingFolder(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Folder</DialogTitle>
            <DialogDescription>
              This action cannot be undone
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-muted-foreground mb-4">
              Are you sure you want to delete <strong>{deletingFolder?.folder_name}</strong>?
            </p>
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
              <p className="text-sm text-destructive font-medium mb-2">
                ⚠️ Warning: Cascade Delete
              </p>
              <p className="text-sm text-destructive/90">
                This will permanently delete this folder and <strong>ALL its subfolders and lectures</strong>.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeletingFolder(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDeleteFolder}
              disabled={isSubmitting}
              variant="destructive"
            >
              {isSubmitting ? 'Deleting...' : 'Delete Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Folder Dialog */}
      <Dialog open={creatingFolderParent !== null} onOpenChange={(open) => !open && setCreatingFolderParent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {creatingFolderParent ? 'Create Subfolder' : 'Create Folder'}
            </DialogTitle>
            <DialogDescription>
              {creatingFolderParent
                ? 'Add a new subfolder inside the selected folder'
                : 'Add a new top-level folder to organize your course'}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="new-folder-name">Folder Name</Label>
            <Input
              id="new-folder-name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Enter folder name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isSubmitting) {
                  handleCreateFolder();
                }
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setCreatingFolderParent(null);
                setNewFolderName('');
              }}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={isSubmitting || !newFolderName.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Folder'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => !isDeleting && setShowDeleteConfirm(false)}>
          <div className="bg-card rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Delete Course
                </h3>
                <p className="text-sm text-muted-foreground">
                  This action cannot be undone
                </p>
              </div>
            </div>

            <p className="text-muted-foreground mb-6">
              Are you sure you want to delete <strong>{course.course_code}</strong>? This will remove:
            </p>

            <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-destructive rounded-full" />
                All course folders ({folders.length})
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-destructive rounded-full" />
                All enrollments ({course.enrollment_count} {course.enrollment_count === 1 ? 'student' : 'students'})
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-destructive rounded-full" />
                All templates and course data
              </li>
            </ul>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleDeleteCourse}
                disabled={isDeleting}
                variant="destructive"
                className="flex-1"
              >
                {isDeleting ? 'Deleting...' : 'Delete Course'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
