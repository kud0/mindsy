"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePomodoro } from '@/lib/contexts/PomodoroContext';
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
  Navigation,
  RotateCcw,
  RotateCw
} from 'lucide-react';
import { toast } from 'sonner';
import { format, isValid } from 'date-fns';

interface StructuredStudyDeskProps {
  jobId: string;
}

export default function StructuredStudyDesk({ jobId }: StructuredStudyDeskProps) {
  // Helper function for safe date formatting
  const formatSafeDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Date unknown';
    
    try {
      const date = new Date(dateString);
      if (!isValid(date)) return 'Invalid date';
      return format(date, 'MMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const router = useRouter();
  const searchParams = useSearchParams();
  const { setCurrentLecture } = usePomodoro();
  const [data, setData] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [navigationData, setNavigationData] = useState<{
    current: { jobId: string; title: string; index: number; total: number };
    previous: { jobId: string; title: string; status: string; createdAt: string } | null;
    next: { jobId: string; title: string; status: string; createdAt: string } | null;
  } | null>(null);
  const [navigating, setNavigating] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<{
    markedForReview: boolean;
    reviewReason: string | null;
    loading: boolean;
  }>({
    markedForReview: false,
    reviewReason: null,
    loading: true
  });
  const [lectureStudyHistory, setLectureStudyHistory] = useState<{
    totalMinutes: number;
    sessionCount: number;
    lastStudied: string | null;
    firstStudied: string | null;
    recentSessions: Array<{
      started_at: string;
      duration: number;
      note?: string;
    }>;
  } | null>(null);
  
  // Tab and question navigation state
  const [targetQuestionIndex, setTargetQuestionIndex] = useState<number | null>(null);

  // Handle URL parameters for tab and question navigation
  useEffect(() => {
    const tab = searchParams.get('tab');
    const questionIndex = searchParams.get('question');
    
    if (tab && ['overview', 'questions', 'explanations', 'summary', 'history', 'files'].includes(tab)) {
      setActiveTab(tab);
    }
    
    if (questionIndex && !isNaN(parseInt(questionIndex))) {
      setTargetQuestionIndex(parseInt(questionIndex));
    }
  }, [searchParams]);

  // Scroll to specific question when data loads and target is set
  useEffect(() => {
    if (data && targetQuestionIndex !== null && activeTab === 'questions') {
      const questionElement = document.getElementById(`question-${targetQuestionIndex}`);
      if (questionElement) {
        setTimeout(() => {
          questionElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          // Highlight the question briefly
          questionElement.classList.add('bg-accent/40');
          setTimeout(() => {
            questionElement.classList.remove('bg-accent/40');
          }, 2000);
        }, 100);
        
        // Clear the target after scrolling
        setTargetQuestionIndex(null);
      }
    }
  }, [data, targetQuestionIndex, activeTab]);

  useEffect(() => {
    console.log('🎯 StructuredStudyDesk: Component mounted/updated with jobId:', jobId);
    fetchStructuredData();
    fetchLectureStudyHistory();
    fetchReviewStatus();
    
    // Handle hash navigation from search results
    const hash = window.location.hash;
    if (hash) {
      console.log('🔗 Found hash for deep linking:', hash);
      handleHashNavigation(hash);
    }
  }, [jobId]);

  // Hash navigation handler
  const handleHashNavigation = (hash: string) => {
    // Remove the # symbol
    const target = hash.slice(1);
    
    if (target.startsWith('question-')) {
      setActiveTab('questions');
      const questionId = target.replace('question-', '');
      setTimeout(() => scrollToElement(target), 500);
    } else if (target.startsWith('explanation-')) {
      setActiveTab('explanations');
      const explanationId = target.replace('explanation-', '');
      setTimeout(() => scrollToElement(target), 500);
    } else if (target === 'summary') {
      setActiveTab('summary');
      setTimeout(() => scrollToElement(target), 500);
    }
  };

  // Scroll to specific element and highlight it
  const scrollToElement = (elementId: string) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-yellow-100', 'border-yellow-300', 'border-2');
      setTimeout(() => {
        element.classList.remove('bg-yellow-100', 'border-yellow-300', 'border-2');
      }, 3000);
    }
  };

  // Set current lecture for Pomodoro tracking when component mounts
  useEffect(() => {
    setCurrentLecture(jobId);
    
    // Clear current lecture when component unmounts
    return () => {
      setCurrentLecture(null);
    };
  }, [jobId, setCurrentLecture]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === 'ArrowLeft' && navigationData?.previous?.jobId && !navigating) {
          event.preventDefault();
          handleNavigateToLecture(navigationData.previous.jobId);
        } else if (event.key === 'ArrowRight' && navigationData?.next?.jobId && !navigating) {
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
      console.log('📡 API Response status:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('📋 API Response body:', result);

      if (response.ok) {
        console.log('✅ Structured data received:', result.data);
        // Handle original API response format
        if (result.data) {
          setData(result.data);
        } else if (result.success && result.data) {
          setData(result.data);
        } else {
          setData(result);
        }
      } else {
        console.log('❌ API Error Response:', result);
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
      console.log('🧭 Navigation API Response status:', response.status, response.statusText);
      
      const result = await response.json();
      console.log('🧭 Navigation API Response body:', result);

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
      
      // Update current lecture for Pomodoro tracking
      setCurrentLecture(targetJobId);
      
      // Update the URL without page refresh
      window.history.pushState(null, '', `/dashboard/lectures/${targetJobId}`);
      
      // Reset states
      setData(null);
      setError(null);
      setNavigationData(null);
      setLoading(true);
      
      // Fetch new data
      const response = await fetch(`/api/study-guides/${targetJobId}`);
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

  const fetchLectureStudyHistory = async () => {
    try {
      console.log('📚 Fetching study history for lecture:', jobId);
      const response = await fetch(`/api/lectures/study-history?lectureIds=${jobId}`);
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data[jobId]) {
          console.log('📚 Study history found:', result.data[jobId]);
          setLectureStudyHistory(result.data[jobId]);
        } else {
          console.log('📚 No study history found for this lecture');
          setLectureStudyHistory(null);
        }
      }
    } catch (error) {
      console.error('📚 Error fetching study history:', error);
      setLectureStudyHistory(null);
    }
  };

  const fetchReviewStatus = async () => {
    try {
      console.log('🔍 Fetching review status for lecture:', jobId);
      const response = await fetch(`/api/lectures/${jobId}/review`);
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔍 Review status found:', result.data);
        
        setReviewStatus({
          markedForReview: result.data.markedForReview,
          reviewReason: result.data.reviewReason,
          loading: false
        });
      } else {
        console.error('🔍 Failed to fetch review status');
        setReviewStatus(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('🔍 Error fetching review status:', error);
      setReviewStatus(prev => ({ ...prev, loading: false }));
    }
  };

  const toggleReviewStatus = async (reason?: string) => {
    try {
      const newStatus = !reviewStatus.markedForReview;
      console.log(`🔄 ${newStatus ? 'Marking' : 'Unmarking'} lecture for review:`, jobId);
      
      const response = await fetch(`/api/lectures/${jobId}/review`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          markedForReview: newStatus,
          reviewReason: reason || null
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Review status updated:', result.data);
        
        setReviewStatus({
          markedForReview: result.data.markedForReview,
          reviewReason: result.data.reviewReason,
          loading: false
        });
        
        // Store review change in localStorage to trigger refresh when user returns to lectures page
        const reviewChange = {
          jobId,
          markedForReview: result.data.markedForReview,
          reviewReason: result.data.reviewReason,
          timestamp: Date.now()
        };
        localStorage.setItem('lectureReviewChanged', JSON.stringify(reviewChange));
        
        // Also emit custom event for components that are currently mounted
        console.log('📡 Dispatching lectureReviewStatusChanged event...', { jobId, status: result.data.markedForReview });
        window.dispatchEvent(new CustomEvent('lectureReviewStatusChanged', {
          detail: reviewChange
        }));
        console.log('✅ Event dispatched and stored in localStorage');
        
        toast.success(newStatus ? 'Marked for review!' : 'Review mark removed');
      } else {
        console.error('❌ Failed to update review status');
        toast.error('Failed to update review status');
      }
    } catch (error) {
      console.error('❌ Error updating review status:', error);
      toast.error('Failed to update review status');
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
        return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'processing':
        return <Clock className="w-4 h-4 text-primary animate-pulse" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      default:
        return <AlertCircle className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'basic': return 'bg-secondary text-secondary-foreground';
      case 'intermediate': return 'bg-primary/90 text-primary';
      case 'advanced': return 'bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-muted rounded w-1/4"></div>
            <div className="h-64 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto text-center">
          <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Lecture Not Found</h2>
          <p className="text-muted-foreground mb-4">
            {error === 'Study guide not found' || error === 'Current lecture not found' 
              ? `The lecture with ID "${jobId}" could not be found. It may have been deleted or you may not have access to it.`
              : error
            }
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push('/dashboard/lectures')}>
              Back to Lectures
            </Button>
            <Button variant="outline" onClick={() => {
              setError(null);
              fetchStructuredData();
              fetchNavigationData();
            }}>
              Try Again
            </Button>
          </div>
          
          {/* Debug info for development */}
          <div className="mt-8 p-4 bg-muted rounded-lg text-left text-sm">
            <h3 className="font-semibold mb-2">Debug Info:</h3>
            <p><strong>Job ID:</strong> {jobId}</p>
            <p><strong>Error:</strong> {error}</p>
            <p><strong>Suggestion:</strong> Check if this lecture exists in the database or if you have the correct permissions.</p>
          </div>
        </div>
      </div>
    );
  }

  // Handle both old format (data.lecture) and new format (data directly)
  const lecture = data?.lecture || {
    title: data?.title || data?.job?.title,
    subject: data?.subject,
    status: data?.job?.status || 'completed',
    id: data?.id || data?.job?.id,
    createdAt: data?.createdAt || data?.job?.createdAt,
    updatedAt: data?.updatedAt
  };
  const studyMaterial = data?.studyMaterial || {
    questions: data?.questions || [],
    explanations: data?.explanations || [],
    summary: data?.summary || {},
    tableOfContents: data?.tableOfContents,
    files: { 
      generatedPdf: data?.job?.pdfPath ? { 
        path: data.job.pdfPath,
        name: 'Study Guide PDF',
        description: 'Complete study guide with questions, explanations, and summary'
      } : null,
      rawTranscript: data?.job?.txt_file_path || data?.job?.id ? {
        path: data.job.txt_file_path || `${data.job.id}.txt`, // Fallback to old naming pattern
        name: 'Raw Transcript',
        description: 'Original audio transcription text file'
      } : null,
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Navigation Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:justify-between mb-4 md:mb-6">
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
            <div className="flex items-center gap-2 md:gap-4 w-full sm:w-auto overflow-x-auto">
              {/* Previous Lecture */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0"
                onClick={() => navigationData?.previous?.jobId && handleNavigateToLecture(navigationData.previous.jobId)}
                disabled={!navigationData?.previous?.jobId || navigating}
              >
                <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
                {navigationData.previous ? (
                  <span className="max-w-20 md:max-w-32 truncate">{navigationData.previous.title || 'Previous'}</span>
                ) : 'No Prev'}
              </Button>

              {/* Current Position */}
              <div className="flex items-center gap-1 md:gap-2 text-xs md:text-sm text-muted-foreground flex-shrink-0" title="Use Ctrl+← and Ctrl+→ to navigate">
                <Navigation className="w-3 h-3 md:w-4 md:h-4" />
                <span>{navigationData.current.index}/{navigationData.current.total}</span>
              </div>

              {/* Next Lecture */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1 md:gap-2 text-xs md:text-sm flex-shrink-0"
                onClick={() => navigationData?.next?.jobId && handleNavigateToLecture(navigationData.next.jobId)}
                disabled={!navigationData?.next?.jobId || navigating}
              >
                {navigationData.next ? (
                  <span className="max-w-20 md:max-w-32 truncate">{navigationData.next.title || 'Next'}</span>
                ) : 'No Next'}
                <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Lecture Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg md:text-2xl mb-2 leading-tight">{lecture.title}</CardTitle>
                {lecture.subject && (
                  <p className="text-base md:text-lg text-muted-foreground">{lecture.subject}</p>
                )}
              </div>
              
              <div className="flex items-center gap-2 ml-2 md:ml-4 flex-shrink-0">
                {getStatusIcon(lecture.status)}
                
                {/* Review Toggle Button */}
                <Button
                  variant={reviewStatus.markedForReview ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleReviewStatus()}
                  disabled={reviewStatus.loading}
                  className={`gap-1 md:gap-2 text-xs md:text-sm ${reviewStatus.markedForReview 
                    ? 'bg-accent hover:bg-accent/80 text-accent-foreground' 
                    : 'hover:bg-accent hover:text-accent-foreground hover:border-accent'
                  }`}
                >
                  {reviewStatus.markedForReview ? (
                    <>
                      <RotateCcw className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Review Later</span>
                      <span className="sm:hidden">Review</span>
                    </>
                  ) : (
                    <>
                      <RotateCw className="w-3 h-3 md:w-4 md:h-4" />
                      <span className="hidden sm:inline">Mark for Review</span>
                      <span className="sm:hidden">Mark</span>
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs md:text-sm text-gray-500 pt-3 md:pt-4 border-t">
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Created </span>
                {formatSafeDate(lecture.createdAt)}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Updated </span>
                {formatSafeDate(lecture.updatedAt)}
              </div>
              {lecture.processingTime && (
                <div className="flex items-center gap-1">
                  <BrainCircuit className="w-3 h-3 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">Processed in </span>
                  {lecture.processingTime}
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
              Study Guide
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1 h-auto">
                <TabsTrigger value="overview" className="text-xs md:text-sm p-2 md:p-3">Overview</TabsTrigger>
                <TabsTrigger value="questions" className="text-xs md:text-sm p-2 md:p-3">
                  <span className="hidden sm:inline">Questions </span>
                  <span className="sm:hidden">Q </span>
                  ({studyMaterial.questions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="explanations" className="text-xs md:text-sm p-2 md:p-3">
                  <span className="hidden sm:inline">Explanations</span>
                  <span className="sm:hidden">Notes</span>
                </TabsTrigger>
                <TabsTrigger value="summary" className="text-xs md:text-sm p-2 md:p-3">Summary</TabsTrigger>
                <TabsTrigger value="history" className="text-xs md:text-sm p-2 md:p-3">
                  <span className="hidden lg:inline">Study Time </span>
                  <span className="lg:hidden">Time </span>
                  {lectureStudyHistory?.totalMinutes ? `(${Math.round(lectureStudyHistory.totalMinutes)}m)` : ''}
                </TabsTrigger>
                <TabsTrigger value="files" className="text-xs md:text-sm p-2 md:p-3">
                  <span className="hidden sm:inline">Materials</span>
                  <span className="sm:hidden">Files</span>
                </TabsTrigger>
              </TabsList>

              {/* Overview Tab - Table of Contents */}
              <TabsContent value="overview" className="mt-4 md:mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Navigation className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <h3 className="font-semibold text-base md:text-lg">Table of Contents</h3>
                  </div>
                  
                  {studyMaterial.tableOfContents ? (
                    <div className="bg-card border border-border rounded-xl p-4 md:p-6">
                      <div className="space-y-3">
                        {studyMaterial.tableOfContents.split('\n').filter(line => line.trim()).map((item, index) => {
                          const [title, ...descriptionParts] = item.split(':');
                          const description = descriptionParts.join(':').trim();
                          
                          return (
                            <div key={index} className="flex gap-2 md:gap-3 group hover:bg-muted/50 rounded-lg p-2 md:p-3 transition-colors">
                              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs md:text-sm font-semibold text-primary">
                                {index + 1}
                              </div>
                              <div className="flex-1 space-y-1">
                                <h4 className="font-medium text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
                                  {title}
                                </h4>
                                {description && (
                                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                                    {description}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-500">
                      <Navigation className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No table of contents available</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Questions Tab */}
              <TabsContent value="questions" className="mt-4 md:mt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4 md:mb-6">
                    <BrainCircuit className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <h3 className="font-semibold text-base md:text-lg">Study Questions</h3>
                    <Badge variant="outline" className="ml-2">
                      {studyMaterial.questions?.length || 0} Questions
                    </Badge>
                  </div>
                  
                  {studyMaterial.questions && studyMaterial.questions.length > 0 ? (
                    <div className="grid gap-4 md:gap-6">
                      {studyMaterial.questions.map((item: any, index: number) => (
                        <div key={item.id || index} id={`question-${item.id || `q${index + 1}`}`} className="bg-card border border-border rounded-xl p-4 md:p-6 hover:shadow-md transition-all">
                          <div className="space-y-3">
                            {/* Question number at the top */}
                            <div className="flex items-center gap-2">
                              <div className="flex-shrink-0 w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-xs md:text-sm font-bold">
                                {index + 1}
                              </div>
                              <div className="text-xs md:text-sm text-muted-foreground">
                                Question {index + 1}
                              </div>
                            </div>
                            
                            {/* Question content - full width */}
                            <div className="w-full">
                              <p 
                                className="text-foreground leading-relaxed font-medium text-base md:text-lg mb-3"
                                dangerouslySetInnerHTML={{
                                  __html: (item.question || item).replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>')
                                }}
                              />
                              {item.answer && (
                                <div className="mt-3 md:mt-4 pl-3 md:pl-4 border-l-2 border-primary/30">
                                  <div className="text-muted-foreground leading-relaxed">
                                    {item.answer.split(/[•\n]/).filter((point: string) => point.trim()).map((point: string, idx: number) => (
                                      <div key={idx} className="flex items-start mb-2">
                                        <span className="text-primary mr-2 text-sm">•</span>
                                        <span 
                                          className="text-foreground text-sm md:text-base"
                                          dangerouslySetInnerHTML={{
                                            __html: point.trim().replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>')
                                          }}
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <BrainCircuit className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h4 className="font-medium mb-2">No Study Questions Available</h4>
                      <p className="text-sm">Questions will appear here once the content is processed</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Explanations Tab - Detailed Explanations */}
              <TabsContent value="explanations" className="mt-4 md:mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4 md:mb-6">
                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                    <h3 className="font-semibold text-base md:text-lg">Detailed Explanations</h3>
                  </div>
                  
                  {studyMaterial.explanations || studyMaterial.content ? (
                    <div className="space-y-6">
                      {/* If we have structured explanations */}
                      {studyMaterial.explanations ? (
                        studyMaterial.explanations.map((explanation: any, index: number) => (
                          <div key={index} id={`explanation-${explanation.id || `exp${index + 1}`}`} className="bg-card border border-border rounded-xl overflow-hidden hover:shadow-md transition-all">
                            <div className="p-4 md:p-6">
                              <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-4">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                  💡
                                </div>
                                <h4 
                                  className="font-semibold text-base md:text-lg text-foreground"
                                  dangerouslySetInnerHTML={{
                                    __html: (explanation.title || `Explanation ${index + 1}`).replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>')
                                  }}
                                />
                              </div>
                              <div className="prose prose-green max-w-none dark:prose-invert pl-8 md:pl-11">
                                <div 
                                  className="whitespace-pre-wrap leading-relaxed text-foreground text-sm md:text-base"
                                  dangerouslySetInnerHTML={{
                                    __html: (explanation.content || explanation).replace(/\*\*(.*?)\*\*/g, '<strong class="text-primary">$1</strong>')
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        /* Fallback to content sections */
                        studyMaterial.content?.sections?.map((section: any, index: number) => (
                          <div key={index} className="bg-card border border-border rounded-xl overflow-hidden">
                            <div className="p-6">
                              {section.title && (
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                                    💡
                                  </div>
                                  <h4 className="font-semibold text-lg text-foreground">
                                    {section.title}
                                  </h4>
                                </div>
                              )}
                              <div className="prose prose-green max-w-none dark:prose-invert">
                                <div className="whitespace-pre-wrap leading-relaxed text-foreground">
                                  {section.content}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h4 className="font-medium mb-2">No Detailed Explanations Available</h4>
                      <p className="text-sm">Detailed explanations will appear here once the content is processed</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Summary Tab */}
              <TabsContent value="summary" className="mt-4 md:mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4 md:mb-6">
                    <BookOpen className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
                    <h3 className="font-semibold text-base md:text-lg">Comprehensive Summary</h3>
                  </div>
                  
                  {studyMaterial.summary ? (
                    <div className="bg-secondary/10 dark:bg-secondary/20 rounded-xl border-2 border-secondary/20 dark:border-secondary/30 overflow-hidden">
                      <div className="p-4 md:p-8">
                        <div className="flex items-center gap-2 md:gap-3 mb-4 md:mb-6">
                          <div className="w-8 h-8 md:w-10 md:h-10 bg-secondary text-secondary-foreground rounded-full flex items-center justify-center text-base md:text-lg font-bold">
                            📚
                          </div>
                          <h4 className="font-bold text-lg md:text-xl text-secondary-foreground dark:text-secondary-foreground">
                            Key Takeaways & Connections
                          </h4>
                        </div>
                        
                        <div className="prose prose-purple max-w-none dark:prose-invert">
                          <div 
                            className="whitespace-pre-wrap leading-relaxed text-secondary-foreground/80 dark:text-secondary-foreground/90 text-sm md:text-base"
                            dangerouslySetInnerHTML={{
                              __html: (typeof studyMaterial.summary === 'string' 
                                ? studyMaterial.summary 
                                : studyMaterial.summary.overview || studyMaterial.summary.content || ''
                              ).replace(/\*\*(.*?)\*\*/g, '<strong class="text-secondary dark:text-secondary">$1</strong>')
                            }}
                          />
                        </div>
                        
                        {/* Key Takeaways if structured */}
                        {studyMaterial.summary.keyTakeaways && studyMaterial.summary.keyTakeaways.length > 0 && (
                          <div className="mt-8 p-6 bg-secondary/20 dark:bg-secondary/30 rounded-lg">
                            <h5 className="font-semibold text-secondary-foreground dark:text-secondary-foreground mb-4 flex items-center gap-2">
                              <BrainCircuit className="w-4 h-4" />
                              Key Takeaways ({studyMaterial.summary.keyTakeaways.length})
                            </h5>
                            <div className="grid gap-3">
                              {studyMaterial.summary.keyTakeaways.map((takeaway: string, index: number) => (
                                <div key={index} className="flex items-start gap-3">
                                  <div className="flex-shrink-0 w-6 h-6 bg-secondary text-secondary-foreground rounded-full text-xs font-bold flex items-center justify-center">
                                    ✓
                                  </div>
                                  <p 
                                    className="text-secondary-foreground/80 dark:text-secondary-foreground/90 leading-relaxed"
                                    dangerouslySetInnerHTML={{
                                      __html: takeaway.replace(/\*\*(.*?)\*\*/g, '<strong class="text-secondary dark:text-secondary">$1</strong>')
                                    }}
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h4 className="font-medium mb-2">No Summary Available</h4>
                      <p className="text-sm">A comprehensive summary will appear here once the content is processed</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Study History Tab */}
              <TabsContent value="history" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-6">
                    <Clock className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Study Time for This Lecture</h3>
                  </div>
                  
                  {lectureStudyHistory ? (
                    <div className="space-y-6">
                      {/* Study Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-primary/90 dark:bg-accent/50 rounded-lg p-4 border border-primary/60 dark:border-primary/70">
                          <div className="text-2xl font-bold text-foreground">
                            {Math.round(lectureStudyHistory.totalMinutes)}m
                          </div>
                          <div className="text-sm text-primary/80 dark:text-primary/90">Total Study Time</div>
                        </div>
                        
                        <div className="bg-secondary/10 dark:bg-secondary/20 rounded-lg p-4 border border-secondary/20 dark:border-secondary/30">
                          <div className="text-2xl font-bold text-primary">
                            {lectureStudyHistory.sessionCount}
                          </div>
                          <div className="text-sm text-primary">Study Sessions</div>
                        </div>
                        
                        <div className="bg-accent/10 dark:bg-accent/20 rounded-lg p-4 border border-accent/20 dark:border-accent/30">
                          <div className="text-2xl font-bold text-accent dark:text-accent">
                            {Math.round(lectureStudyHistory.totalMinutes / lectureStudyHistory.sessionCount)}m
                          </div>
                          <div className="text-sm text-accent/80 dark:text-accent/90">Avg per Session</div>
                        </div>
                        
                        <div className="bg-secondary/50 rounded-lg p-4 border border-secondary">
                          <div className="text-2xl font-bold text-secondary-foreground">
                            {lectureStudyHistory.lastStudied ? format(new Date(lectureStudyHistory.lastStudied), 'MMM d') : 'Never'}
                          </div>
                          <div className="text-sm text-secondary-foreground">Last Studied</div>
                        </div>
                      </div>
                      
                      {/* Study Timeline */}
                      <div className="bg-background/50 rounded-lg p-6">
                        <h4 className="font-semibold mb-4 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Study Timeline
                        </h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">First studied:</span>
                            <span className="font-medium">
                              {lectureStudyHistory.firstStudied ? format(new Date(lectureStudyHistory.firstStudied), 'MMM d, yyyy') : 'Never'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Most recent:</span>
                            <span className="font-medium">
                              {lectureStudyHistory.lastStudied ? format(new Date(lectureStudyHistory.lastStudied), 'MMM d, yyyy') : 'Never'}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Study consistency:</span>
                            <span className="font-medium text-secondary">
                              {lectureStudyHistory.sessionCount > 1 ? 'Regular' : 'Getting started'}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Study Tips */}
                      <div className="bg-accent/40 rounded-lg p-4 border border-primary/30">
                        <h4 className="font-semibold text-primary mb-2">💡 Study Tips</h4>
                        <ul className="text-sm text-primary/80 space-y-1">
                          {lectureStudyHistory.totalMinutes < 30 && (
                            <li>• Try studying this lecture for at least 25-30 minutes to build deeper understanding</li>
                          )}
                          {lectureStudyHistory.sessionCount < 3 && (
                            <li>• Review this material multiple times to improve retention</li>
                          )}
                          <li>• Use the Pomodoro timer in the sidebar while studying to track your focus time</li>
                          <li>• Take notes during your study sessions to reinforce learning</li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-16 text-gray-500">
                      <Clock className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <h4 className="font-medium mb-2">No Study Time Recorded</h4>
                      <p className="text-sm mb-4">You haven't studied this lecture with the Pomodoro timer yet.</p>
                      <div className="bg-primary/90 dark:bg-accent/50 rounded-lg p-4 text-left max-w-md mx-auto">
                        <h5 className="font-semibold text-foreground mb-2">How to track study time:</h5>
                        <ol className="text-sm text-primary/80 dark:text-primary/90 space-y-1">
                          <li>1. Start the Pomodoro timer in the sidebar</li>
                          <li>2. Study this lecture while the timer runs</li>
                          <li>3. Complete focus sessions to build your study history</li>
                        </ol>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="mt-6">
                <div className="space-y-6">
                  <div className="flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold text-lg">Study Materials & Resources</h3>
                  </div>
                  
                  <div className="grid gap-4">
                    {/* Generated PDF */}
                    {studyMaterial.files.generatedPdf && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <h4 className="font-semibold">{studyMaterial.files.generatedPdf.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {studyMaterial.files.generatedPdf.description}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileView(studyMaterial.files.generatedPdf.path)}
                          >
                            <Eye className="w-4 h-4" />
                            View PDF
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileDownload(studyMaterial.files.generatedPdf.path, studyMaterial.files.generatedPdf.name)}
                          >
                            <Download className="w-4 h-4" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Raw Transcript */}
                    {studyMaterial.files.rawTranscript && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-secondary-foreground" />
                          <h4 className="font-semibold">{studyMaterial.files.rawTranscript.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {studyMaterial.files.rawTranscript.description}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileDownload(studyMaterial.files.rawTranscript.path, studyMaterial.files.rawTranscript.name + '.txt')}
                          >
                            <Download className="w-4 h-4" />
                            Download TXT
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Original PDF */}
                    {studyMaterial.files.originalPdf && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-primary" />
                          <h4 className="font-semibold">{studyMaterial.files.originalPdf.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
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

                    {/* JSON Data Export */}
                    {studyMaterial.questions && studyMaterial.questions.length > 0 && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-secondary" />
                          <h4 className="font-semibold">Study Guide Data (JSON)</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Raw study guide data in JSON format for export/import
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => {
                              const jsonData = JSON.stringify({
                                title: lecture.title,
                                subject: lecture.subject,
                                questions: studyMaterial.questions,
                                explanations: studyMaterial.explanations,
                                summary: studyMaterial.summary,
                                tableOfContents: studyMaterial.tableOfContents
                              }, null, 2);
                              const blob = new Blob([jsonData], { type: 'application/json' });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = `${lecture.title.replace(/[^a-zA-Z0-9]/g, '_')}_study_guide.json`;
                              a.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            <Download className="w-4 h-4" />
                            Download JSON
                          </Button>
                        </div>
                      </div>
                    )}

                    {/* Transcript TXT */}
                    {studyMaterial.files.transcript && (
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <FileText className="w-5 h-5 text-gray-500" />
                          <h4 className="font-semibold">{studyMaterial.files.transcript.name}</h4>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {studyMaterial.files.transcript.description}
                        </p>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="gap-2"
                            onClick={() => handleFileDownload(studyMaterial.files.transcript.path, studyMaterial.files.transcript.name)}
                          >
                            <Download className="w-4 h-4" />
                            Download TXT
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