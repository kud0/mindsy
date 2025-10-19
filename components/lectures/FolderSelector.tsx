'use client';

import React, { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Folder, FolderOpen, X } from 'lucide-react';
import { toast } from 'sonner';

interface UserFolder {
  id: string;
  folder_name: string;
  course_id: string;
  parent_folder_id: string | null;
  folder_order: number;
}

interface Course {
  id: string;
  course_code: string;
  course_name?: string;
}

interface FolderSelectorProps {
  lectureId: string;
  currentFolderId?: string | null;
  onFolderChange?: (folderId: string | null) => void;
}

export default function FolderSelector({
  lectureId,
  currentFolderId,
  onFolderChange
}: FolderSelectorProps) {
  const [folders, setFolders] = useState<UserFolder[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(currentFolderId || null);

  useEffect(() => {
    loadCoursesAndFolders();
  }, []);

  useEffect(() => {
    setSelectedFolder(currentFolderId || null);
  }, [currentFolderId]);

  const loadCoursesAndFolders = async () => {
    try {
      setIsLoading(true);

      // Load enrolled courses using the correct endpoint
      const coursesResponse = await fetch('/api/enrollments/my-courses');

      // Check if response is OK
      if (!coursesResponse.ok) {
        console.error('Failed to fetch courses:', coursesResponse.status, coursesResponse.statusText);
        toast.error('Failed to load courses');
        return;
      }

      // Check if response has content
      const text = await coursesResponse.text();
      if (!text) {
        console.error('Empty response from /api/enrollments/my-courses');
        toast.error('Failed to load courses');
        return;
      }

      // Parse JSON safely
      let coursesData;
      try {
        coursesData = JSON.parse(text);
      } catch (parseError) {
        console.error('Failed to parse courses JSON:', parseError);
        console.error('Response text:', text);
        toast.error('Failed to load courses');
        return;
      }

      if (coursesData.success) {
        setCourses(coursesData.courses || []);

        // Load folders for each course
        const allFolders: UserFolder[] = [];
        for (const course of coursesData.courses || []) {
          const foldersResponse = await fetch(`/api/courses/${course.id}/folders`);

          if (!foldersResponse.ok) {
            console.error(`Failed to fetch folders for course ${course.id}:`, foldersResponse.status);
            continue;
          }

          const foldersText = await foldersResponse.text();
          if (!foldersText) {
            console.error(`Empty response from /api/courses/${course.id}/folders`);
            continue;
          }

          try {
            const foldersData = JSON.parse(foldersText);
            if (foldersData.success) {
              allFolders.push(...(foldersData.folders || []));
            }
          } catch (parseError) {
            console.error(`Failed to parse folders JSON for course ${course.id}:`, parseError);
          }
        }
        setFolders(allFolders);
      } else {
        toast.error(coursesData.error || 'Failed to load courses');
      }
    } catch (error) {
      console.error('Error loading folders:', error);
      toast.error('Failed to load folders');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFolderSelect = async (folderId: string | null) => {
    try {
      const response = await fetch(`/api/lectures/${lectureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_folder_id: folderId })
      });

      const data = await response.json();

      if (data.success) {
        setSelectedFolder(folderId);
        onFolderChange?.(folderId);

        if (folderId) {
          const folder = folders.find(f => f.id === folderId);
          toast.success(`Assigned to "${folder?.folder_name}"`);
        } else {
          toast.success('Removed from folder');
        }

        // Dispatch custom event to notify folder detail pages
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('folderLecturesChanged', {
            detail: { folderId, lectureId }
          }));
        }
      } else {
        toast.error(data.error || 'Failed to update folder assignment');
      }
    } catch (error) {
      console.error('Error updating folder:', error);
      toast.error('Failed to update folder assignment');
    }
  };

  // Build hierarchical folder structure grouped by course
  const foldersByCourse = courses.map(course => {
    const courseFolders = folders.filter(f => f.course_id === course.id);
    const rootFolders = courseFolders.filter(f => !f.parent_folder_id);

    // Sort by folder_order
    rootFolders.sort((a, b) => a.folder_order - b.folder_order);

    // Build hierarchy with children
    const buildHierarchy = (parentId: string | null, level: number = 0): any[] => {
      const children = courseFolders
        .filter(f => f.parent_folder_id === parentId)
        .sort((a, b) => a.folder_order - b.folder_order);

      return children.flatMap(child => [
        { ...child, level },
        ...buildHierarchy(child.id, level + 1)
      ]);
    };

    const hierarchicalFolders = rootFolders.flatMap(root => [
      { ...root, level: 0 },
      ...buildHierarchy(root.id, 1)
    ]);

    return {
      course,
      folders: hierarchicalFolders
    };
  }).filter(item => item.folders.length > 0);

  const currentFolderName = selectedFolder
    ? folders.find(f => f.id === selectedFolder)?.folder_name
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-xs gap-1"
        >
          {currentFolderName ? (
            <>
              <FolderOpen className="w-3 h-3" />
              <span className="max-w-[100px] truncate">{currentFolderName}</span>
            </>
          ) : (
            <>
              <Folder className="w-3 h-3" />
              <span>Add to folder</span>
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-56 max-h-[400px] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {selectedFolder && (
          <>
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                handleFolderSelect(null);
              }}
              className="text-red-600 dark:text-red-400"
            >
              <X className="w-4 h-4 mr-2" />
              Remove from folder
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}

        {isLoading ? (
          <DropdownMenuItem disabled>Loading folders...</DropdownMenuItem>
        ) : foldersByCourse.length === 0 ? (
          <DropdownMenuItem disabled>No folders available</DropdownMenuItem>
        ) : (
          foldersByCourse.map(({ course, folders: courseFolders }) => (
            <div key={course.id}>
              <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">
                {course.course_code}
              </DropdownMenuLabel>
              {courseFolders.map((folder: any) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFolderSelect(folder.id);
                  }}
                  className={selectedFolder === folder.id ? 'bg-accent' : ''}
                  style={{ paddingLeft: `${0.75 + folder.level * 1}rem` }}
                >
                  <Folder className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span className="truncate">{folder.folder_name}</span>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
            </div>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
