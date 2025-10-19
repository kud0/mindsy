'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  FolderOpen,
  FileText,
  Plus,
  CheckCircle,
  Clock,
  XCircle,
  AlertCircle,
  Eye,
  X,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Folder {
  id: string;
  folder_name: string;
  course_id: string;
}

interface Lecture {
  job_id: string;
  lecture_title: string;
  course_subject: string | null;
  created_at: string;
  status: string;
  user_folder_id: string | null;
}

export default function FolderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params.courseId as string;
  const folderId = params.folderId as string;

  const [folder, setFolder] = useState<Folder | null>(null);
  const [assignedLectures, setAssignedLectures] = useState<Lecture[]>([]);
  const [unassignedLectures, setUnassignedLectures] = useState<Lecture[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);

  useEffect(() => {
    loadFolderData();
  }, [folderId]);

  // Listen for folder lecture changes
  useEffect(() => {
    const handleFolderLecturesChanged = (event: CustomEvent) => {
      console.log('Folder lectures changed event:', event.detail);
      // Reload data if this event affects our folder
      if (event.detail.folderId === folderId || event.detail.folderId === null) {
        loadFolderData();
      }
    };

    window.addEventListener('folderLecturesChanged', handleFolderLecturesChanged as EventListener);

    return () => {
      window.removeEventListener('folderLecturesChanged', handleFolderLecturesChanged as EventListener);
    };
  }, [folderId]);

  const loadFolderData = async () => {
    try {
      setIsLoading(true);

      const folderResponse = await fetch(`/api/folders/${folderId}/lectures`);
      const folderData = await folderResponse.json();

      if (folderData.success) {
        setFolder(folderData.folder);
        setAssignedLectures(folderData.lectures || []);
      } else {
        toast.error(folderData.error || 'Failed to load folder');
      }

      const unassignedResponse = await fetch('/api/lectures/unassigned');
      const unassignedData = await unassignedResponse.json();

      if (unassignedData.success) {
        setUnassignedLectures(unassignedData.lectures || []);
      }
    } catch (error) {
      console.error('Error loading folder data:', error);
      toast.error('Failed to load folder data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLecture = async (lectureId: string) => {
    try {
      const response = await fetch(`/api/lectures/${lectureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_folder_id: folderId })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Lecture added to folder');
        await loadFolderData();
      } else {
        toast.error(data.error || 'Failed to add lecture');
      }
    } catch (error) {
      console.error('Error adding lecture:', error);
      toast.error('Failed to add lecture');
    }
  };

  const handleRemoveLecture = async (lectureId: string) => {
    try {
      const response = await fetch(`/api/lectures/${lectureId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_folder_id: null })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Lecture removed from folder');
        await loadFolderData();
      } else {
        toast.error(data.error || 'Failed to remove lecture');
      }
    } catch (error) {
      console.error('Error removing lecture:', error);
      toast.error('Failed to remove lecture');
    }
  };

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
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">Ready</Badge>;
      case 'processing':
        return <Badge variant="default" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Processing</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading folder...</p>
        </div>
      </div>
    );
  }

  if (!folder) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Folder not found
          </h2>
          <Button onClick={() => router.push(`/dashboard/courses/${courseId}`)} variant="outline">
            Back to Course
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => router.push(`/dashboard/courses/${courseId}`)}
            className="flex items-center text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Course
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {folder.folder_name}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-1">
                  {assignedLectures.length} {assignedLectures.length === 1 ? 'lecture' : 'lectures'}
                </p>
              </div>
            </div>

            <Button
              onClick={() => setShowAddDialog(true)}
              disabled={unassignedLectures.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Lectures
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Lectures in this folder
          </h2>

          {assignedLectures.length === 0 ? (
            <Card className="p-12">
              <div className="text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No lectures yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Add lectures to this folder to organize your study materials
                </p>
                <Button onClick={() => setShowAddDialog(true)} disabled={unassignedLectures.length === 0}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Lectures
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {assignedLectures.map((lecture) => (
                <Card key={lecture.job_id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        {getStatusIcon(lecture.status)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">
                            {lecture.lecture_title}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <Calendar className="w-3 h-3" />
                            <span>{format(new Date(lecture.created_at), 'MMM d, yyyy')}</span>
                            {lecture.course_subject && (
                              <>
                                <span>•</span>
                                <span>{lecture.course_subject}</span>
                              </>
                            )}
                          </div>
                        </div>
                        {getStatusBadge(lecture.status)}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {lecture.status === 'completed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push(`/dashboard/lectures/${lecture.job_id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveLecture(lecture.job_id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[600px] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Add Lectures to {folder.folder_name}</DialogTitle>
            <DialogDescription>
              Select lectures to add to this folder. Only unassigned lectures are shown.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2">
            {unassignedLectures.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No unassigned lectures available
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedLectures.map((lecture) => (
                  <Card key={lecture.job_id} className="hover:bg-accent/50 transition-colors">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {getStatusIcon(lecture.status)}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-sm text-gray-900 dark:text-white truncate">
                              {lecture.lecture_title}
                            </h4>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {format(new Date(lecture.created_at), 'MMM d, yyyy')}
                              {lecture.course_subject && ` • ${lecture.course_subject}`}
                            </p>
                          </div>
                          {getStatusBadge(lecture.status)}
                        </div>

                        <Button
                          size="sm"
                          onClick={() => {
                            handleAddLecture(lecture.job_id);
                            setShowAddDialog(false);
                          }}
                          className="ml-4"
                        >
                          <Plus className="w-4 h-4 mr-1" />
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
