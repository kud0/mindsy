"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Download,
  Eye,
  FileText,
  BookOpen,
  BrainCircuit,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Navigation
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface StructuredStudyDeskProps {
  jobId: string;
}

export default function StructuredStudyDesk({ jobId }: StructuredStudyDeskProps) {
  const router = useRouter();
  const [data, setData] = useState<{
    lecture: any;
    studyMaterial: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationData, setNavigationData] = useState<{
    current: { jobId: string; title: string; index: number; total: number };
    previous: { jobId: string; title: string; status: string; createdAt: string } | null;
    next: { jobId: string; title: string; status: string; createdAt: string } | null;
  } | null>(null);
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    fetchStructuredData();
    fetchNavigationData();
  }, [jobId]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'ArrowLeft' && navigationData?.previous && !navigating) {
          event.preventDefault();
          handleNavigateToLecture(navigationData.previous.jobId);
        } else if (event.key === 'ArrowRight' && navigationData?.next && !navigating) {
          event.preventDefault();
          handleNavigateToLecture(navigationData.next.jobId);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [navigationData, navigating]);

  const fetchStructuredData = async () => {
    try {
      setLoading(true);
      console.log('🎯 Fetching structured data for:', jobId);
      
      const response = await fetch(`/api/lectures/${jobId}/structured`);
      const result = await response.json();

      if (response.ok) {
        console.log('✅ Structured data received:', result.data);
        setData(result.data);
      } else {
        throw new Error(result.error || 'Failed to fetch lecture');
      }
    } catch (error) {
      console.error('❌ Error fetching structured data:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      toast.error('Failed to load lecture');
    } finally {
      setLoading(false);
    }
  };

  const fetchNavigationData = async () => {
    try {
      console.log('🧭 Fetching navigation data for:', jobId);
      
      const response = await fetch(`/api/lectures/${jobId}/navigation`);
      const result = await response.json();

      if (response.ok) {
        console.log('✅ Navigation data received:', result.data);
        setNavigationData(result.data);
      } else {
        console.error('❌ Navigation data fetch failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Navigation data fetch error:', error);
    }
  };

  const handleNavigateToLecture = async (targetJobId: string) => {
    try {
      setNavigating(true);
      console.log('🚀 Navigating to lecture:', targetJobId);
      
      // Update the URL without page refresh
      window.history.pushState(null, '', `/dashboard/lectures/${targetJobId}`);
      
      // Reset states
      setData(null);
      setError(null);
      setNavigationData(null);
      setLoading(true);
      
      // Fetch new data
      const response = await fetch(`/api/lectures/${targetJobId}/structured`);
      const result = await response.json();

      if (response.ok) {
        setData(result.data);
        
        // Fetch navigation data for new lecture
        const navResponse = await fetch(`/api/lectures/${targetJobId}/navigation`);
        const navResult = await navResponse.json();
        if (navResponse.ok) {
          setNavigationData(navResult.data);
        }
        
        console.log('✅ Successfully navigated to:', result.data.lecture.title);
        toast.success(`Navigated to: ${result.data.lecture.title}`);
      } else {
        setError(result.error || 'Failed to load lecture');
        toast.error('Failed to load lecture');
      }
    } catch (error) {
      console.error('❌ Navigation error:', error);
      setError('Navigation failed');
      toast.error('Navigation failed');
    } finally {
      setLoading(false);
      setNavigating(false);
    }
  };

  const handleFileView = (filePath: string) => {
    window.open(`/api/files/view?path=${encodeURIComponent(filePath)}`, '_blank');
  };

  const handleFileDownload = (filePath: string, filename: string) => {
    const link = document.createElement('a');
    link.href = `/api/files/download?path=${encodeURIComponent(filePath)}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-4xl mx-auto text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Error Loading Lecture</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/dashboard/lectures')}>
              Back to Lectures
            </Button>
            <Button variant="outline" onClick={fetchStructuredData}>
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { lecture, studyMaterial } = data;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto p-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-6">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => router.push('/dashboard/lectures')}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lectures
          </Button>

          {/* Lecture Navigation */}
          {navigationData && (
            <div className="flex items-center gap-4">
              {/* Previous Lecture */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigationData.previous && handleNavigateToLecture(navigationData.previous.jobId)}
                disabled={!navigationData.previous || navigating}
              >
                <ChevronLeft className="w-4 h-4" />
                {navigationData.previous ? (
                  <span className="max-w-32 truncate">{navigationData.previous.title}</span>
                ) : 'No Previous'}
              </Button>

              {/* Current Position */}
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400" title="Use Ctrl+← and Ctrl+→ to navigate">
                <Navigation className="w-4 h-4" />
                <span>{navigationData.current.index} of {navigationData.current.total}</span>
              </div>

              {/* Next Lecture */}
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => navigationData.next && handleNavigateToLecture(navigationData.next.jobId)}
                disabled={!navigationData.next || navigating}
              >
                {navigationData.next ? (
                  <span className="max-w-32 truncate">{navigationData.next.title}</span>
                ) : 'No Next'}
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Lecture Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-2xl mb-2">{lecture.title}</CardTitle>
                {lecture.subject && (
                  <p className="text-lg text-gray-600 dark:text-gray-400">{lecture.subject}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                {getStatusIcon(lecture.status)}
                <Badge variant={lecture.status === 'completed' ? 'default' : 'secondary'}>
                  {lecture.status}
                </Badge>
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                Created {format(new Date(lecture.createdAt), 'MMM d, yyyy')}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                Updated {format(new Date(lecture.updatedAt), 'MMM d, yyyy')}
              </div>
              {lecture.processingTime && (
                <div className="flex items-center gap-1">
                  <BrainCircuit className="w-4 h-4" />
                  Processed in {lecture.processingTime}
                </div>
              )}
            </div>
          </CardHeader>
        </Card>

        {/* Study Desk Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Study Desk
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="questions" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="questions">Questions ({studyMaterial.questions.length})</TabsTrigger>
                <TabsTrigger value="content">Detailed Notes</TabsTrigger>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="files">Study Materials</TabsTrigger>
              </TabsList>

              {/* Questions Tab */}
              <TabsContent value="questions" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <BrainCircuit className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-lg">Study Questions & Key Concepts</h3>
                  </div>
                  
                  {studyMaterial.questions.length > 0 ? (
                    <div className="grid gap-4">
                      {studyMaterial.questions.map((item: any, index: number) => (
                        <div key={item.id} className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-sm font-medium text-blue-600 dark:text-blue-300">
                                {index + 1}
                              </div>
                              <p className="text-blue-800 dark:text-blue-200 leading-relaxed">{item.question}</p>
                            </div>
                            <div className="flex gap-2">
                              <Badge variant="outline" className={getDifficultyColor(item.difficulty)}>
                                {item.difficulty}
                              </Badge>
                              <Badge variant="secondary" className="text-xs">
                                {item.type}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <BrainCircuit className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No study questions available</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-green-500" />
                    <h3 className="font-semibold text-lg">Detailed Notes & Content</h3>
                  </div>
                  
                  {studyMaterial.content.sections.map((section: any, index: number) => (
                    <div key={index} className="prose prose-lg max-w-none dark:prose-invert">
                      <div className="p-6 bg-white dark:bg-gray-800 rounded-lg border shadow-sm">
                        {section.title !== studyMaterial.content.sections[0].title && (
                          <h3 className="font-semibold mb-4">{section.title}</h3>
                        )}
                        <div className="whitespace-pre-wrap leading-relaxed">
                          {section.content}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <BookOpen className="w-5 h-5 text-purple-500" />
                    <h3 className="font-semibold text-lg">Lecture Summary & Overview</h3>
                  </div>
                  
                  {/* Main Summary */}
                  <div className="p-6 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                    <h4 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Overview
                    </h4>
                    <p className="text-purple-800 dark:text-purple-200 leading-relaxed whitespace-pre-wrap">
                      {studyMaterial.summary.overview}
                    </p>
                  </div>

                  {/* Key Takeaways */}
                  {studyMaterial.summary.keyTakeaways.length > 0 && (
                    <div className="p-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
                      <h4 className="font-semibold text-amber-900 dark:text-amber-100 mb-4 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4" />
                        Key Takeaways ({studyMaterial.summary.keyTakeaways.length})
                      </h4>
                      <div className="grid gap-3">
                        {studyMaterial.summary.keyTakeaways.map((takeaway: string, index: number) => (
                          <div key={index} className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-5 h-5 bg-amber-200 dark:bg-amber-800 rounded text-xs font-medium text-amber-800 dark:text-amber-200 flex items-center justify-center">
                              ✓
                            </div>
                            <p className="text-amber-800 dark:text-amber-200">{takeaway}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-500" />
                    <h3 className="font-semibold text-lg">Study Materials & Resources</h3>
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    {/* Cornell PDF */}
                    {studyMaterial.files.cornellPdf && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-blue-500" />
                          <h4 className="font-semibold">{studyMaterial.files.cornellPdf.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {studyMaterial.files.cornellPdf.description}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileView(studyMaterial.files.cornellPdf.path)}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileDownload(studyMaterial.files.cornellPdf.path, studyMaterial.files.cornellPdf.name)}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Original PDF */}
                    {studyMaterial.files.originalPdf && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-green-500" />
                          <h4 className="font-semibold">{studyMaterial.files.originalPdf.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {studyMaterial.files.originalPdf.description}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileView(studyMaterial.files.originalPdf.path)}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileDownload(studyMaterial.files.originalPdf.path, studyMaterial.files.originalPdf.name)}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Transcript */}
                    {studyMaterial.files.transcript && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <h4 className="font-semibold">{studyMaterial.files.transcript.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {studyMaterial.files.transcript.description}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileView(studyMaterial.files.transcript.path)}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileDownload(studyMaterial.files.transcript.path, studyMaterial.files.transcript.name)}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Markdown */}
                    {studyMaterial.files.markdown && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <BookOpen className="w-5 h-5 text-purple-500" />
                          <h4 className="font-semibold">{studyMaterial.files.markdown.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {studyMaterial.files.markdown.description}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileView(studyMaterial.files.markdown.path)}
                          >
                            <Eye className="w-4 h-4" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileDownload(studyMaterial.files.markdown.path, studyMaterial.files.markdown.name)}
                          >
                            <Download className="w-4 h-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}