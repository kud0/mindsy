'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TemplateCard } from './TemplateCard';
import { TemplateBuilder } from './TemplateBuilder';
import { Users, BookTemplate, Plus, Check, X } from 'lucide-react';

interface Template {
  id: string;
  template_name: string;
  description?: string;
  vote_count: number;
  is_recommended: boolean;
  has_voted: boolean;
  creator_name: string;
  folder_structure: {
    folders: Array<{ name: string }>;
  };
}

interface Course {
  id: string;
  course_code: string;
  course_name?: string;
  institution: string;
  semester?: string;
  enrollment_count: number;
  is_enrolled: boolean;
  syllabus_url?: string;  // Added syllabus URL field
}

interface CourseDetailsModalProps {
  course: Course | null;
  isOpen: boolean;
  onClose: () => void;
  onEnroll: (courseId: string, templateId?: string) => Promise<void>;
  onRefresh: () => void;
}

export function CourseDetailsModal({
  course,
  isOpen,
  onClose,
  onEnroll,
  onRefresh
}: CourseDetailsModalProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);

  useEffect(() => {
    if (course && isOpen) {
      loadCourseDetails();
    }
  }, [course, isOpen]);

  const loadCourseDetails = async () => {
    if (!course) return;

    setIsLoading(true);
    try {
      const response = await fetch(`/api/courses/${course.id}`);
      const data = await response.json();

      if (data.success) {
        setTemplates(data.templates || []);
      }
    } catch (error) {
      console.error('Error loading course details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (templateId: string) => {
    try {
      const response = await fetch(`/api/templates/${templateId}/vote`, {
        method: 'POST'
      });

      if (response.ok) {
        // Refresh templates to get updated vote counts
        await loadCourseDetails();
      }
    } catch (error) {
      console.error('Vote error:', error);
    }
  };

  const handleCreateTemplate = async (templateData: any) => {
    if (!course) return;

    try {
      const response = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...templateData,
          course_id: course.id
        })
      });

      if (response.ok) {
        setShowTemplateBuilder(false);
        await loadCourseDetails();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Template creation error:', error);
      alert('Failed to create template');
    }
  };

  const handleEnrollWithTemplate = async () => {
    if (!course) return;

    setIsEnrolling(true);
    try {
      // Enroll in course (with optional template)
      await onEnroll(course.id, selectedTemplate || undefined);
      onRefresh();

      // If no template selected and no templates available, auto-generate folders
      if (!selectedTemplate && templates.length === 0) {
        console.log('📁 No templates available, generating folders...');
        try {
          const foldersResponse = await fetch(`/api/courses/${course.id}/generate-folders`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              syllabus_url: course.syllabus_url || undefined
            })
          });

          const foldersData = await foldersResponse.json();

          if (foldersData.success) {
            console.log(`✅ Generated ${foldersData.folders_created} folders`);
          } else {
            console.warn('⚠️ Folder generation failed:', foldersData.error);
          }
        } catch (folderError) {
          console.error('Folder generation error:', folderError);
          // Non-blocking error - user is still enrolled
        }
      }

      onClose();
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleGenerateNewFolders = async () => {
    if (!course) return;

    setIsEnrolling(true);
    try {
      // Enroll without template
      await onEnroll(course.id, undefined);
      onRefresh();

      // Generate folders with AI
      console.log('📁 Generating new folders with AI...');
      try {
        const foldersResponse = await fetch(`/api/courses/${course.id}/generate-folders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            syllabus_url: course.syllabus_url || undefined
          })
        });

        const foldersData = await foldersResponse.json();

        if (foldersData.success) {
          console.log(`✅ Generated ${foldersData.folders_created} folders`);
        } else {
          console.warn('⚠️ Folder generation failed:', foldersData.error);
        }
      } catch (folderError) {
        console.error('Folder generation error:', folderError);
      }

      onClose();
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleUseTemplate = async (template: Template) => {
    if (course?.is_enrolled) {
      // Already enrolled, just apply template
      try {
        const response = await fetch(`/api/templates/${template.id}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merge: true })
        });

        if (response.ok) {
          const data = await response.json();
          alert(`Created ${data.folders_created} folders from template!`);
          onClose();
        }
      } catch (error) {
        console.error('Apply template error:', error);
      }
    } else {
      // Not enrolled, select template for enrollment
      setSelectedTemplate(template.id);
    }
  };

  if (!course) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto dark:bg-background/90 dark:backdrop-blur-2xl border-gray-200/50 dark:border-white/10 shadow-xl dark:shadow-2xl dark:shadow-black/50">
        <DialogHeader>
          <DialogTitle>
            <div>
              <h2 className="text-2xl font-bold">
                {course.course_code}
                {course.course_name && ` - ${course.course_name}`}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-normal mt-1">
                {course.institution}
                {course.semester && ` • ${course.semester}`}
              </p>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <span className="flex items-center gap-1 text-gray-600 dark:text-gray-300">
                  <Users className="w-4 h-4" />
                  {course.enrollment_count} {course.enrollment_count === 1 ? 'student' : 'students'}
                  {course.is_enrolled && course.enrollment_count === 1 && ' (you)'}
                </span>
                {course.is_enrolled && (
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 text-xs rounded font-medium">
                    ✓ Enrolled
                  </span>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="templates" className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="templates">
              <BookTemplate className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="students" disabled={!course.is_enrolled}>
              <Users className="w-4 h-4 mr-2" />
              Students
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="space-y-4">
            {/* Enrollment Required Message */}
            {!course.is_enrolled && (
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 text-center">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Join this course to create templates and vote
                </p>
              </div>
            )}

            {/* Create First Template CTA - Shown when enrolled with no templates */}
            {course.is_enrolled && templates.length === 0 && !showTemplateBuilder && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6 text-center">
                <BookTemplate className="w-12 h-12 mx-auto mb-3 text-blue-600 dark:text-blue-400" />
                <h3 className="font-semibold text-lg mb-2">Organize Your Course</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Create a folder template to help you and your classmates organize lectures and materials
                </p>
                <Button onClick={() => setShowTemplateBuilder(true)} size="lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Template
                </Button>
              </div>
            )}

            {/* Create Template Button - Shown when templates already exist */}
            {course.is_enrolled && templates.length > 0 && !showTemplateBuilder && (
              <Button
                variant="outline"
                onClick={() => setShowTemplateBuilder(true)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Propose New Template
              </Button>
            )}

            {/* Template Builder */}
            {showTemplateBuilder && (
              <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <h3 className="font-semibold mb-3">Create New Template</h3>
                <TemplateBuilder
                  onSubmit={handleCreateTemplate}
                  onCancel={() => setShowTemplateBuilder(false)}
                />
              </div>
            )}

            {/* Templates List */}
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading templates...</div>
            ) : templates.length > 0 ? (
              <div className="grid gap-3">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onVote={handleVote}
                    onPreview={setPreviewTemplate}
                    onUse={handleUseTemplate}
                    isEnrolled={course.is_enrolled}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookTemplate className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No templates yet. Be the first to create one!</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="students">
            <div className="text-center py-8 text-gray-500">
              Students list coming soon...
            </div>
          </TabsContent>
        </Tabs>

        {/* Template Preview Dialog */}
        {previewTemplate && (
          <div className="fixed inset-0 bg-black/50 dark:backdrop-blur-2xl flex items-center justify-center z-50" onClick={() => setPreviewTemplate(null)}>
            <div className="bg-white dark:bg-background/90 rounded-lg p-6 max-w-md w-full mx-4 border border-gray-200/50 dark:border-white/10 shadow-2xl dark:shadow-black/50" onClick={(e) => e.stopPropagation()}>
              <h3 className="font-semibold mb-3">{previewTemplate.template_name}</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {previewTemplate.folder_structure.folders.map((folder, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <span className="text-sm text-gray-500">{index + 1}.</span>
                    <span className="text-sm">{folder.name}</span>
                  </div>
                ))}
              </div>
              <Button variant="outline" onClick={() => setPreviewTemplate(null)} className="w-full mt-4">
                Close
              </Button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="flex-1">
            {selectedTemplate && !course.is_enrolled && (
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Template selected: {templates.find(t => t.id === selectedTemplate)?.template_name}
              </p>
            )}
            {course.is_enrolled && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                💡 Tip: Create or vote on templates to organize your course
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {course.is_enrolled ? 'Done' : 'Close'}
            </Button>
            {!course.is_enrolled && (
              <>
                {/* If templates available and none selected, show both options */}
                {templates.length > 0 && !selectedTemplate && (
                  <Button
                    onClick={handleGenerateNewFolders}
                    disabled={isEnrolling}
                    variant="outline"
                  >
                    {isEnrolling ? 'Enrolling...' : 'Generate New Folders'}
                  </Button>
                )}
                <Button
                  onClick={handleEnrollWithTemplate}
                  disabled={isEnrolling}
                >
                  {isEnrolling
                    ? 'Enrolling...'
                    : selectedTemplate
                      ? 'Join & Use Template'
                      : templates.length > 0
                        ? 'Join Course'
                        : 'Join & Generate Folders'}
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
