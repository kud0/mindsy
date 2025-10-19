"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, addMinutes } from 'date-fns';
import { Clock, Save, X, Folder, BookOpen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

export interface SessionDialogData {
  id?: string;
  title: string;
  start: Date;
  end: Date;
  type: 'lecture' | 'study' | 'review' | 'exam-prep' | 'break';
  subject?: string;
  description?: string;
  lectureId?: string;
  userFolderId?: string;
}

interface CourseFolder {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
}

interface Lecture {
  job_id: string;
  lecture_title: string;
  course_subject?: string;
  user_folder_id?: string;
}

interface SessionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: SessionDialogData) => Promise<void>;
  initialData?: Partial<SessionDialogData>;
  selectedTime?: Date;
}

const sessionTypes = [
  { value: 'study', label: 'Study Session', color: 'bg-green-500' },
  { value: 'review', label: 'Review', color: 'bg-orange-500' },
  { value: 'exam-prep', label: 'Exam Prep', color: 'bg-purple-500' },
  { value: 'lecture', label: 'Lecture', color: 'bg-blue-500' },
  { value: 'break', label: 'Break', color: 'bg-gray-400' },
];

export function SessionDialog({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  selectedTime 
}: SessionDialogProps) {
  const [formData, setFormData] = useState<SessionDialogData>({
    title: '',
    start: new Date(),
    end: addMinutes(new Date(), 60),
    type: 'study',
    subject: '',
    description: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [courseFolders, setCourseFolders] = useState<CourseFolder[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const supabase = createClient();

  // Load course folders and lectures when dialog opens
  const loadStudyData = async () => {
    if (!isOpen) return;

    setLoadingData(true);
    try {
      // Load course folders (user_folders)
      const { data: folders, error: foldersError } = await supabase
        .from('user_folders')
        .select('id, name, description, parent_id')
        .order('name');

      if (!foldersError && folders) {
        setCourseFolders(folders);
      }

      // Load lectures
      const { data: lecturesData, error: lecturesError } = await supabase
        .from('jobs')
        .select('job_id, lecture_title, course_subject, user_folder_id')
        .in('status', ['completed', 'processing'])
        .order('lecture_title');

      if (!lecturesError && lecturesData) {
        setLectures(lecturesData);
      }
    } catch (error) {
      console.error('Error loading study data:', error);
    } finally {
      setLoadingData(false);
    }
  };

  // Initialize form data when dialog opens
  useEffect(() => {
    if (isOpen) {
      loadStudyData();
      
      if (initialData) {
        console.log('📋 SessionDialog initializing with data:', { id: initialData.id, title: initialData.title });
        setFormData({
          title: initialData.title || '',
          start: initialData.start || new Date(),
          end: initialData.end || addMinutes(new Date(), 60),
          type: initialData.type || 'study',
          subject: initialData.subject || '',
          description: initialData.description || '',
          id: initialData.id, // Make sure ID is preserved
          lectureId: initialData.lectureId,
          userFolderId: initialData.userFolderId
        });
      } else if (selectedTime) {
        // Create new session starting at selected time
        setFormData({
          title: '',
          start: selectedTime,
          end: addMinutes(selectedTime, 60), // Default 1 hour duration
          type: 'study', // Default to study session
          subject: '',
          description: '',
        });
      }
    }
  }, [isOpen, initialData, selectedTime]);

  const handleSave = async () => {
    // Auto-generate title if none provided and folder is selected
    let finalTitle = formData.title;
    if (!finalTitle.trim() && formData.userFolderId) {
      const folder = courseFolders.find(f => f.id === formData.userFolderId);
      finalTitle = folder ? `Study ${folder.name}` : 'Study Session';
    }
    
    if (!finalTitle.trim()) {
      finalTitle = 'Study Session'; // Default fallback
    }

    const sessionToSave = { ...formData, title: finalTitle };
    console.log('📝 SessionDialog saving:', { id: sessionToSave.id, title: sessionToSave.title, hasId: !!sessionToSave.id });

    setIsLoading(true);
    try {
      await onSave(sessionToSave);
      onClose();
    } catch (error) {
      console.error('Error saving session:', error);
      // TODO: Add error feedback
    } finally {
      setIsLoading(false);
    }
  };

  const updateTime = (field: 'start' | 'end', timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(formData[field]);
    date.setHours(hours, minutes, 0, 0);
    
    setFormData(prev => ({
      ...prev,
      [field]: date,
      // Auto-adjust end time if start time changes
      ...(field === 'start' && {
        end: date.getTime() >= prev.end.getTime() 
          ? addMinutes(date, 60) 
          : prev.end
      })
    }));
  };

  const formatTimeForInput = (date: Date) => {
    return format(date, 'HH:mm');
  };

  const duration = Math.round((formData.end.getTime() - formData.start.getTime()) / (1000 * 60));
  const selectedTypeInfo = sessionTypes.find(t => t.value === formData.type);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            {initialData?.id ? 'Edit Study Session' : 'Create Study Session'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* What to Study - Primary Selection */}
          <div>
            <Label htmlFor="folder">What do you want to study?</Label>
            <Select
              value={formData.userFolderId || 'custom'}
              onValueChange={(value) => {
                if (value === 'custom') {
                  // Custom study session
                  setFormData(prev => ({
                    ...prev,
                    userFolderId: undefined,
                    title: '',
                    subject: ''
                  }));
                } else {
                  // Folder-based study session
                  const folder = courseFolders.find(f => f.id === value);
                  setFormData(prev => ({
                    ...prev,
                    userFolderId: value,
                    title: folder ? `Study ${folder.name}` : '',
                    subject: folder?.name || ''
                  }));
                }
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a subject or folder..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="custom">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>Custom Study Session</span>
                  </div>
                </SelectItem>
                {courseFolders.map(folder => (
                  <SelectItem key={folder.id} value={folder.id}>
                    <div className="flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      <span>{folder.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadingData && (
              <p className="text-xs text-gray-500 mt-1">Loading your subjects...</p>
            )}
          </div>

          {/* Custom Title (only if custom selected or auto-filled title needs editing) */}
          {(formData.userFolderId === undefined || formData.title) && (
            <div>
              <Label htmlFor="title">Session Name</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="What are you studying?"
                className="mt-1"
              />
            </div>
          )}

          {/* Time Selection - Simplified */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start-time">From</Label>
              <Input
                id="start-time"
                type="time"
                value={formatTimeForInput(formData.start)}
                onChange={(e) => updateTime('start', e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="end-time">To</Label>
              <Input
                id="end-time"
                type="time"
                value={formatTimeForInput(formData.end)}
                onChange={(e) => updateTime('end', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Duration Display */}
          <div className="text-sm text-muted-foreground text-center">
            {Math.floor(duration / 60)}h {duration % 60}m session
          </div>

          {/* Optional Description */}
          <div>
            <Label htmlFor="description">Notes (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Any specific topics or notes..."
              className="mt-1 resize-none"
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="flex-1"
            >
              <Save className="w-4 h-4 mr-2" />
              {isLoading ? 'Adding...' : 'Add to Schedule'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}