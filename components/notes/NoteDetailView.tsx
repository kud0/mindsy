"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Download,
  Edit,
  Save,
  X,
  Trash2,
  FileText,
  BookOpen,
  BrainCircuit,
  Calendar,
  Clock,
  Folder,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  XCircle,
  Loader2,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Note {
  job_id: string;
  lecture_title: string;
  course_subject: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  study_node_id: string | null;
  // Old database fields
  audio_file_path?: string | null;
  pdf_file_path?: string | null;
  output_pdf_path?: string | null;
  txt_file_path?: string | null;
  md_file_path?: string | null;
  processing_metadata?: {
    upload_type?: string;
    processing_mode?: string;
    original_filenames?: {
      audio?: string;
      pdf?: string;
      documents?: string[];
    };
  };
  notes: {
    id: string;
    content: string;
    summary: string;
    key_points: string[];
    created_at: string;
    updated_at: string;
  }[];
  study_nodes?: {
    id: string;
    name: string;
    type: string;
  };
}

interface NoteDetailViewProps {
  jobId: string;
}

export default function NoteDetailView({ jobId }: NoteDetailViewProps) {
  const router = useRouter();
  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    lecture_title: '',
    course_subject: '',
    study_node_id: ''
  });
  const [downloading, setDownloading] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [activeTab, setActiveTab] = useState('cornell');
  const [selectedDocumentIndex, setSelectedDocumentIndex] = useState(0);
  // const [studyDeskTab, setStudyDeskTab] = useState<'notes' | 'cornell-pdf' | 'original-pdf' | 'attachments'>('notes');

  // Fetch note data
  const fetchNote = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching note for jobId:', jobId);
      const response = await fetch(`/api/notes/${jobId}`);
      console.log('📡 Response status:', response.status, response.statusText);
      
      let result;
      try {
        result = await response.json();
        console.log('📄 Response data:', result);
      } catch (parseError) {
        console.error('❌ Failed to parse JSON response:', parseError);
        throw new Error(`Invalid response format (${response.status})`);
      }

      if (response.ok) {
        // Handle both old and new response formats
        const noteData = result.data || result;
        console.log('✅ Note fetched successfully:', noteData);
        
        if (!noteData || !noteData.lecture_title) {
          console.error('❌ Invalid note data structure:', result);
          throw new Error('Invalid response format - missing note data');
        }
        
        setNote(noteData);
        setEditData({
          lecture_title: noteData.lecture_title,
          course_subject: noteData.course_subject || '',
          study_node_id: noteData.study_node_id || ''
        });
      } else {
        const errorInfo = {
          status: response.status,
          statusText: response.statusText,
          error: result?.error || 'Unknown error',
          jobId,
          fullResponse: result
        };
        console.error('❌ API Error Response:', errorInfo);
        throw new Error(result?.error || `Failed to fetch note (${response.status}: ${response.statusText})`);
      }
    } catch (error) {
      console.error('❌ Error fetching note:', {
        error,
        jobId,
        message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Show more specific error messages
      if (error instanceof Error && error.message.includes('404')) {
        toast.error('Lecture not found or you don\'t have permission to view it');
      } else if (error instanceof Error && error.message.includes('401')) {
        toast.error('Please log in to view this lecture');
        router.push('/auth/login');
        return;
      } else {
        toast.error('Failed to load lecture');
      }
      
      // Don't redirect on 404 - let the UI show the not found message
      // Only redirect on other errors like auth issues
    } finally {
      setLoading(false);
    }
  }, [jobId, router]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  // Handle note update
  const handleSave = async () => {
    try {
      const response = await fetch(`/api/notes/${jobId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          lecture_title: editData.lecture_title.trim(),
          course_subject: editData.course_subject.trim() || null,
          study_node_id: editData.study_node_id || null
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setNote(prev => prev ? {
          ...prev,
          lecture_title: editData.lecture_title.trim(),
          course_subject: editData.course_subject.trim() || null,
          study_node_id: editData.study_node_id || null,
          updated_at: new Date().toISOString()
        } : null);
        setIsEditing(false);
        toast.success('Note updated successfully');
      } else {
        throw new Error(result.error || 'Failed to update note');
      }
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Failed to update note');
    }
  };

  // Handle note deletion
  const handleDelete = async () => {
    try {
      setDeleting(true);
      const response = await fetch(`/api/notes/${jobId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        toast.success('Note deleted successfully');
        router.push('/dashboard/lectures');
      } else {
        throw new Error(result.error || 'Failed to delete note');
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
      setDeleting(false);
    }
  };

  // Handle download
  const handleDownload = async (format: 'pdf' | 'markdown' | 'txt' | 'json') => {
    try {
      setDownloading(format);
      const response = await fetch(`/api/download/${jobId}?format=${format}`);

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        
        const contentDisposition = response.headers.get('content-disposition');
        const filename = contentDisposition 
          ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
          : `note_${jobId}.${format}`;
        
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success(`Downloaded as ${format.toUpperCase()}`);
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Error downloading note:', error);
      toast.error('Failed to download note');
    } finally {
      setDownloading(null);
    }
  };

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <AlertCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  // Note: Removed formatCornellNotes function - using direct data display now

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Lecture Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            This lecture doesn&apos;t exist or you don&apos;t have permission to view it.
          </p>
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4 text-sm text-left max-w-md mx-auto">
            <p className="font-mono text-gray-600 dark:text-gray-400">
              <strong>Lecture ID:</strong> {jobId}
            </p>
            <p className="text-gray-500 dark:text-gray-500 mt-2">
              If you just uploaded this content, it may still be processing. 
              Check the lectures page to see the current status.
            </p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/dashboard/lectures')}>
              Back to Lectures
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handle multiple documents within a lecture
  const noteDocuments = note?.notes || [];
  const selectedDocument = noteDocuments[selectedDocumentIndex];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/dashboard/lectures')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Lectures
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={downloading !== null}>
                  {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  Download
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleDownload('pdf')}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF Document
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('markdown')}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Markdown File
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('txt')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Text File
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleDownload('json')}>
                  <BrainCircuit className="w-4 h-4 mr-2" />
                  JSON Data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Actions Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setIsEditing(!isEditing)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Details
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      className="text-red-600 focus:text-red-600"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Note
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Note</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this note? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700"
                        disabled={deleting}
                      >
                        {deleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          'Delete'
                        )}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Note Details Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="title">Lecture Title</Label>
                      <Input
                        id="title"
                        value={editData.lecture_title}
                        onChange={(e) => setEditData(prev => ({ ...prev, lecture_title: e.target.value }))}
                        className="text-lg font-semibold"
                      />
                    </div>
                    <div>
                      <Label htmlFor="subject">Course/Subject</Label>
                      <Input
                        id="subject"
                        value={editData.course_subject}
                        onChange={(e) => setEditData(prev => ({ ...prev, course_subject: e.target.value }))}
                        placeholder="Optional"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSave} size="sm">
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </Button>
                      <Button variant="outline" onClick={() => setIsEditing(false)} size="sm">
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-2xl mb-2">{note.lecture_title}</CardTitle>
                    {note.course_subject && (
                      <p className="text-lg text-gray-600 dark:text-gray-400">{note.course_subject}</p>
                    )}
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {getStatusIcon(note.status)}
                <Badge variant={note.status === 'completed' ? 'default' : 'secondary'}>
                  {note.status}
                </Badge>
              </div>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {format(new Date(note.created_at), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Updated {format(new Date(note.updated_at), 'MMM d, yyyy')}
              </div>
              {note.study_nodes && (
                <div className="flex items-center gap-1">
                  <Folder className="w-4 h-4" />
                  {note.study_nodes.name}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Document Selector */}
        {noteDocuments.length > 1 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5" />
                Documents in this Lecture ({noteDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {noteDocuments.map((doc, index) => (
                  <Button
                    key={doc.id}
                    variant={selectedDocumentIndex === index ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDocumentIndex(index)}
                    className="gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    Document {index + 1}
                    {selectedDocumentIndex === index && (
                      <Badge variant="secondary" className="ml-1 px-1 text-xs">
                        Active
                      </Badge>
                    )}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Note Content */}
        {selectedDocument && note.status === 'completed' ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Generated Notes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="questions">Questions & Cues</TabsTrigger>
                  <TabsTrigger value="notes">Detailed Notes</TabsTrigger>
                  <TabsTrigger value="summary">Summary</TabsTrigger>
                  <TabsTrigger value="materials">Study Materials</TabsTrigger>
                </TabsList>

                {/* Questions & Cues Tab */}
                <TabsContent value="questions" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <BrainCircuit className="w-5 h-5 text-blue-500" />
                      <h3 className="font-semibold text-lg">Study Questions & Key Concepts</h3>
                    </div>
                    
                    {selectedDocument?.key_points && selectedDocument.key_points.length > 0 ? (
                      <div className="grid gap-3">
                        {selectedDocument.key_points.map((point, index) => (
                          <div key={index} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:shadow-sm transition-shadow">
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-300">
                                {index + 1}
                              </div>
                              <p className="text-blue-800 dark:text-blue-200 leading-relaxed">{point}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No study questions available</p>
                        <p className="text-sm mt-1">Questions and key concepts will appear here</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Detailed Notes Tab */}
                <TabsContent value="notes" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <FileText className="w-5 h-5 text-green-500" />
                      <h3 className="font-semibold text-lg">Detailed Notes & Content</h3>
                    </div>
                    
                    {selectedDocument?.content ? (
                      <div className="prose prose-lg max-w-none dark:prose-invert">
                        <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                          <div className="whitespace-pre-wrap leading-relaxed">
                            {selectedDocument.content}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No detailed notes available</p>
                        <p className="text-sm mt-1">Detailed lecture content will appear here</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Summary Tab */}
                <TabsContent value="summary" className="mt-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-5 h-5 text-purple-500" />
                      <h3 className="font-semibold text-lg">Lecture Summary & Overview</h3>
                    </div>
                    
                    {selectedDocument?.summary ? (
                      <div className="space-y-6">
                        {/* Main Summary */}
                        <div className="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                          <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            Main Summary
                          </h4>
                          <div className="prose dark:prose-invert max-w-none">
                            <p className="text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-wrap">
                              {selectedDocument.summary}
                            </p>
                          </div>
                        </div>

                        {/* Key Takeaways */}
                        {selectedDocument.key_points && selectedDocument.key_points.length > 0 && (
                          <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                            <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
                              <BrainCircuit className="w-4 h-4" />
                              Key Takeaways ({selectedDocument.key_points.length})
                            </h4>
                            <div className="grid gap-3">
                              {selectedDocument.key_points.map((point, index) => (
                                <div key={index} className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-5 h-5 bg-amber-200 dark:bg-amber-800 rounded text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center justify-center">
                                    ✓
                                  </div>
                                  <p className="text-amber-800 dark:text-amber-200">{point}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>No summary available</p>
                        <p className="text-sm mt-1">Lecture summary will appear here</p>
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* Raw Content Tab */}
                <TabsContent value="raw" className="mt-6">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <pre className="whitespace-pre-wrap p-4 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm overflow-x-auto">
                      {selectedDocument.content}
                    </pre>
                  </div>
                </TabsContent>

                {/* Study Materials Tab - Complete Study Desk */}
                <TabsContent value="materials" className="mt-6">
                  <div className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      {/* Generated Cornell PDF */}
                      {note.output_pdf_path && (
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-blue-500" />
                            <h3 className="font-semibold">Cornell Notes PDF</h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Generated Cornell-style notes from your lecture
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => window.open(`/api/files/view?path=${encodeURIComponent(note.output_pdf_path || '')}`, '_blank')}
                              size="sm" 
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View PDF
                            </Button>
                            <Button 
                              onClick={() => handleDownload('pdf')}
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Original PDF */}
                      {note.pdf_file_path && (
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-green-500" />
                            <h3 className="font-semibold">Original PDF</h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            The original document you uploaded
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => window.open(`/api/files/view?path=${encodeURIComponent(note.pdf_file_path || '')}`, '_blank')}
                              size="sm" 
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View PDF
                            </Button>
                            <Button 
                              onClick={() => window.open(`/api/files/download?path=${encodeURIComponent(note.pdf_file_path || '')}`, '_blank')}
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Markdown File */}
                      {note.md_file_path && (
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <BookOpen className="w-5 h-5 text-purple-500" />
                            <h3 className="font-semibold">Markdown Notes</h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Text-based notes in Markdown format
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => window.open(`/api/files/view?path=${encodeURIComponent(note.md_file_path || '')}`, '_blank')}
                              size="sm" 
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                            <Button 
                              onClick={() => handleDownload('markdown')}
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Text File */}
                      {note.txt_file_path && (
                        <div className="border rounded-lg p-4">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-5 h-5 text-gray-500" />
                            <h3 className="font-semibold">Plain Text</h3>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                            Raw text transcript of your lecture
                          </p>
                          <div className="flex gap-2">
                            <Button 
                              onClick={() => window.open(`/api/files/view?path=${encodeURIComponent(note.txt_file_path || '')}`, '_blank')}
                              size="sm" 
                              className="gap-2"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </Button>
                            <Button 
                              onClick={() => handleDownload('txt')}
                              variant="outline" 
                              size="sm" 
                              className="gap-2"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Future: Additional attachments section */}
                    <div className="border-t pt-6">
                      <div className="flex items-center gap-2 mb-4">
                        <Folder className="w-5 h-5" />
                        <h3 className="font-semibold">Additional Materials</h3>
                      </div>
                      <div className="text-center py-8 text-gray-500">
                        <p>No additional files attached</p>
                        <p className="text-sm mt-1">Future: Upload slides, images, or other study materials</p>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : note.status === 'processing' ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Processing Your Content</h3>
              <p className="text-gray-600 dark:text-gray-400">
                Your lecture is being processed and notes are being generated. This usually takes a few minutes.
              </p>
            </CardContent>
          </Card>
        ) : note.status === 'failed' ? (
          <Card>
            <CardContent className="p-12 text-center">
              <XCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Processing Failed</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                There was an error processing your content. Please try uploading again.
              </p>
              <Button onClick={() => router.push('/dashboard/lectures')}>
                Back to Lectures
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Content Not Ready</h3>
              <p className="text-gray-600 dark:text-gray-400">
                The notes for this lecture are not yet available.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}