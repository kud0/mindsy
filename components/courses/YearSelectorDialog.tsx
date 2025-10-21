'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { FolderOpen } from 'lucide-react';

interface YearFolder {
  folder_id: string;
  folder_name: string;
  folder_order: number;
  child_count: number;
}

interface YearSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseCode: string;
  courseName: string;
  courseId: string;
  enrollmentId: string;
  currentActiveFolderId?: string | null;
  onYearSelected?: () => void;
}

export function YearSelectorDialog({
  open,
  onOpenChange,
  courseCode,
  courseName,
  courseId,
  enrollmentId,
  currentActiveFolderId,
  onYearSelected
}: YearSelectorDialogProps) {
  const [yearFolders, setYearFolders] = useState<YearFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentActiveFolderId || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (open) {
      loadYearFolders();
    }
  }, [open, courseId]);

  const loadYearFolders = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/courses/${courseId}/year-folders`);
      const data = await response.json();

      if (data.success && data.folders) {
        setYearFolders(data.folders);
        // Set initial selection to current or first folder
        if (!selectedFolderId && data.folders.length > 0) {
          setSelectedFolderId(currentActiveFolderId || data.folders[0].folder_id);
        }
      }
    } catch (error) {
      console.error('Error loading year folders:', error);
      toast.error('Failed to load year folders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveFolder = async () => {
    if (!selectedFolderId || selectedFolderId === currentActiveFolderId) {
      onOpenChange(false);
      return;
    }

    setIsUpdating(true);

    try {
      const response = await fetch(`/api/enrollments/${enrollmentId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_active_course: true,
          active_folder_id: selectedFolderId
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update active folder');
      }

      const selectedFolder = yearFolders.find(f => f.folder_id === selectedFolderId);
      toast.success(`Active: ${selectedFolder?.folder_name || 'Folder'}`);
      onOpenChange(false);
      onYearSelected?.();

    } catch (error) {
      console.error('Error updating active folder:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to update'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-white/95 dark:bg-background/90 backdrop-blur-xl dark:backdrop-blur-2xl shadow-xl dark:shadow-2xl dark:shadow-black/50 border border-gray-200/50 dark:border-white/10">
        <DialogHeader className="border-b border-gray-200/50 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 -mt-6 -mx-6 mb-4">
          <DialogTitle className="font-[var(--font-space-grotesk)]">
            Set Active Year for {courseCode}
          </DialogTitle>
          <DialogDescription>
            {courseName}
          </DialogDescription>
        </DialogHeader>

        {/* Folder Selection */}
        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-4">
            Select which year/semester folder to set as active:
          </p>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
            </div>
          ) : yearFolders.length > 0 ? (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {yearFolders.map((folder) => (
                <button
                  key={folder.folder_id}
                  onClick={() => setSelectedFolderId(folder.folder_id)}
                  className={cn(
                    "relative w-full rounded-xl p-4 border-2 transition-all duration-200",
                    "hover:scale-[1.02] active:scale-95",
                    "flex items-center gap-3 text-left",
                    selectedFolderId === folder.folder_id
                      ? "border-purple-500 bg-purple-50 dark:bg-purple-950/30 shadow-md"
                      : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-700"
                  )}
                >
                  {selectedFolderId === folder.folder_id && (
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}

                  <div className={cn(
                    "p-2 rounded-lg shrink-0",
                    selectedFolderId === folder.folder_id
                      ? "bg-purple-500 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                  )}>
                    <FolderOpen className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className={cn(
                      "font-semibold truncate",
                      selectedFolderId === folder.folder_id
                        ? "text-purple-600 dark:text-purple-400"
                        : "text-foreground"
                    )}>
                      {folder.folder_name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {folder.child_count} {folder.child_count === 1 ? 'subject' : 'subjects'}
                    </div>
                  </div>

                  {folder.folder_id === currentActiveFolderId && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 font-medium shrink-0">
                      (current)
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No year folders found</p>
              <p className="text-xs">Create folders in this course first</p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-gray-200/50 dark:border-gray-700/50 bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm p-6 -mb-6 -mx-6 mt-4">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isUpdating || isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveFolder}
            disabled={isUpdating || isLoading || !selectedFolderId || selectedFolderId === currentActiveFolderId}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isUpdating ? 'Saving...' : 'Set Active'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
